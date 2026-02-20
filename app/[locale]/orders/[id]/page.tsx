import {getTranslations} from 'next-intl/server';
import {requireUser} from '../../../../lib/auth';
import {prisma} from '../../../../lib/prisma';
import Link from 'next/link';
import {refreshOrderExpiration} from '../../../../lib/expiration';
import {createNotification} from '../../../../lib/notifications';
import {redirect} from 'next/navigation';
import {formatMoneyKHR} from '../../../../lib/formatMoneyKHR';
import {haversineDistanceKm} from '../../../../lib/distance';

export const dynamic = 'force-dynamic';
const freeRadiusKm = 5;
const feePerKmKhr = 600;
const mapLinkStyle = {
  display: 'inline-block',
  padding: '6px 10px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: '#f8fafc',
  textDecoration: 'none',
  fontWeight: 600
};

function show(v?: string | null) {
  return v && v.trim() ? v : null;
}

function getStatusLabel(t: (key: string, params?: any) => string, status: string) {
  if (status === 'REQUESTED') return t('orders.requested');
  if (status === 'EXPIRED') return t('orders.expired');
  if (status === 'ACCEPTED') return t('orders.accepted');
  if (status === 'PREPARING') return t('orders.statusPreparing');
  if (status === 'DELIVERING') return t('orders.statusDelivering');
  if (status === 'COMPLETED') return t('orders.statusCompleted');
  if (status === 'REJECTED') return t('orders.rejected');
  return status;
}

function money(n: number) {
  return formatMoneyKHR(Number.isFinite(n) ? n : 0);
}

function minMaxFromTiers(tiers: any[]) {
  const fees = (tiers ?? []).map((x) => Number(x.fee)).filter((n) => Number.isFinite(n));
  const min = fees.length ? Math.min(...fees) : 0;
  const max = fees.length ? Math.max(...fees) : 0;
  return {min, max};
}

export default async function OrderDetailPage({
  params
}: {
  params: {locale: string; id: string};
}) {
  const t = await getTranslations();
  const user = await requireUser(params.locale);

  await refreshOrderExpiration(params.id);

  const order = await prisma.order.findUnique({
    where: {id: params.id},
    include: {
      listing: {include: {deliveryFeeTiers: true}},
      restaurant: true,
      farmer: true
    }
  });

  if (!order || (order.restaurantId !== user.id && order.farmerId !== user.id)) {
    return (
      <main>
        <p>{t('common.notFound')}</p>
      </main>
    );
  }

  async function acceptOrderAction(formData: FormData) {
    'use server';
    const current = await requireUser(params.locale, 'FARMER');
    const orderId = String(formData.get('orderId') ?? '').trim();
    if (!orderId) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }

    const target = await prisma.order.findUnique({
      where: {id: orderId},
      include: {
        listing: {include: {deliveryFeeTiers: true}},
        restaurant: {include: {profile: true}},
        farmer: {include: {profile: true}}
      }
    });
    if (!target || target.farmerId !== current.id) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }
    if (target.status !== 'REQUESTED') {
      redirect(`/${params.locale}/orders/${target.id}`);
    }

    let deliveryFeeFinal = 0;
    if (target.deliveryRequested) {
      const restaurantLat = target.restaurant.profile?.lat;
      const restaurantLng = target.restaurant.profile?.lng;
      const farmerLat = target.farmer.profile?.lat;
      const farmerLng = target.farmer.profile?.lng;
      if (restaurantLat == null || restaurantLng == null || farmerLat == null || farmerLng == null) {
        redirect(`/${params.locale}/orders/${target.id}`);
      }
      const distanceKm = haversineDistanceKm(
        {lat: restaurantLat, lng: restaurantLng},
        {lat: farmerLat, lng: farmerLng}
      );
      deliveryFeeFinal = distanceKm <= freeRadiusKm ? 0 : Math.ceil(distanceKm) * feePerKmKhr;
    }

    const alpha = target.alphaRateSnap ?? 0;
    const beta = target.betaRateSnap ?? 0;
    const betaDiscountRate = target.betaDiscountRateSnap ?? 0;

    const displayUnitPriceSnap = target.basePricePerKgSnap * (1 + alpha);
    const fishSubtotalSnap = target.quantityKg * displayUnitPriceSnap;
    const guttingFee = target.guttingRequested ? target.quantityKg * target.guttingPricePerKgSnap : 0;
    const betaFeeSnap = fishSubtotalSnap * beta;
    const betaDiscountSnap = betaFeeSnap * betaDiscountRate;
    const finalTotal = fishSubtotalSnap + guttingFee + deliveryFeeFinal + betaFeeSnap - betaDiscountSnap;

    await prisma.order.update({
      where: {id: target.id},
      data: {
        status: 'ACCEPTED',
        deliveryFeeFinal,
        finalTotal,
        displayUnitPriceSnap,
        fishSubtotalSnap,
        betaFeeSnap,
        betaDiscountSnap
      }
    });

    await createNotification({
      userId: target.restaurantId,
      titleKey: 'notifications.orderAccepted.title',
      bodyKey: 'notifications.orderAccepted.body',
      params: {orderId: target.id}
    });

    redirect(`/${params.locale}/orders/${target.id}`);
  }

  async function rejectOrderAction(formData: FormData) {
    'use server';
    const current = await requireUser(params.locale, 'FARMER');
    const orderId = String(formData.get('orderId') ?? '').trim();
    const rejectReason = String(formData.get('rejectReason') ?? '').trim();
    const rejectNote = String(formData.get('rejectNote') ?? '').trim();

    if (!orderId || !rejectReason) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }

    const target = await prisma.order.findUnique({
      where: {id: orderId}
    });
    if (!target || target.farmerId !== current.id) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }
    if (target.status !== 'REQUESTED') {
      redirect(`/${params.locale}/orders/${target.id}`);
    }

    await prisma.order.update({
      where: {id: target.id},
      data: {
        status: 'REJECTED',
        rejectReason,
        rejectNote: rejectNote || null
      }
    });

    await createNotification({
      userId: target.restaurantId,
      titleKey: 'notifications.orderRejected.title',
      bodyKey: 'notifications.orderRejected.body',
      params: {orderId: target.id, reason: rejectReason}
    });

    redirect(`/${params.locale}/orders/${target.id}`);
  }

  async function startPreparingAction(formData: FormData) {
    'use server';
    const current = await requireUser(params.locale, 'FARMER');
    const orderId = String(formData.get('orderId') ?? '').trim();
    if (!orderId) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }

    const target = await prisma.order.findUnique({where: {id: orderId}});
    if (!target || target.farmerId !== current.id) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }
    if (target.status !== 'ACCEPTED') {
      redirect(`/${params.locale}/orders/${target.id}`);
    }

    await prisma.order.update({
      where: {id: target.id},
      data: {status: 'PREPARING'}
    });

    await createNotification({
      userId: target.restaurantId,
      titleKey: 'notifications.orderPreparing.title',
      bodyKey: 'notifications.orderPreparing.body',
      params: {orderId: target.id}
    });

    redirect(`/${params.locale}/orders/${target.id}`);
  }

  async function startDeliveringAction(formData: FormData) {
    'use server';
    const current = await requireUser(params.locale, 'FARMER');
    const orderId = String(formData.get('orderId') ?? '').trim();
    if (!orderId) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }

    const target = await prisma.order.findUnique({where: {id: orderId}});
    if (!target || target.farmerId !== current.id) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }
    if (target.status !== 'PREPARING') {
      redirect(`/${params.locale}/orders/${target.id}`);
    }

    await prisma.order.update({
      where: {id: target.id},
      data: {status: 'DELIVERING'}
    });

    await createNotification({
      userId: target.restaurantId,
      titleKey: 'notifications.orderDelivering.title',
      bodyKey: 'notifications.orderDelivering.body',
      params: {orderId: target.id}
    });

    redirect(`/${params.locale}/orders/${target.id}`);
  }

  async function completeOrderAction(formData: FormData) {
    'use server';
    const current = await requireUser(params.locale, 'RESTAURANT');
    const orderId = String(formData.get('orderId') ?? '').trim();
    if (!orderId) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }

    const target = await prisma.order.findUnique({where: {id: orderId}});
    if (!target || target.restaurantId !== current.id) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }
    if (target.status !== 'DELIVERING') {
      redirect(`/${params.locale}/orders/${target.id}`);
    }

    await prisma.order.update({
      where: {id: target.id},
      data: {status: 'COMPLETED'}
    });

    await createNotification({
      userId: target.farmerId,
      titleKey: 'notifications.orderCompleted.title',
      bodyKey: 'notifications.orderCompleted.body',
      params: {orderId: target.id}
    });

    redirect(`/${params.locale}/orders/${target.id}`);
  }

  async function markPaidAction(formData: FormData) {
    'use server';
    const current = await requireUser(params.locale, 'RESTAURANT');
    const orderId = String(formData.get('orderId') ?? '').trim();
    if (!orderId) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }

    const target = await prisma.order.findUnique({where: {id: orderId}});
    if (!target || target.restaurantId !== current.id) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }
    if (target.status !== 'COMPLETED') {
      redirect(`/${params.locale}/orders/${target.id}`);
    }

    await prisma.order.update({
      where: {id: target.id},
      data: {paymentStatus: 'PAID', paidAt: new Date()}
    });

    redirect(`/${params.locale}/orders/${target.id}`);
  }

  async function createReviewAction(formData: FormData) {
    'use server';
    const current = await requireUser(params.locale);
    const orderId = String(formData.get('orderId') ?? '').trim();
    const ratingRaw = String(formData.get('rating') ?? '').trim();
    const commentRaw = String(formData.get('comment') ?? '').trim();

    if (!orderId) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }

    const target = await prisma.order.findUnique({where: {id: orderId}});
    if (!target || (target.restaurantId !== current.id && target.farmerId !== current.id)) {
      redirect(`/${params.locale}/orders/${params.id}`);
    }
    if (target.status !== 'COMPLETED') {
      redirect(`/${params.locale}/orders/${target.id}`);
    }

    const existing = await prisma.review.findUnique({
      where: {orderId_fromUserId: {orderId: target.id, fromUserId: current.id}}
    });
    if (existing) {
      redirect(`/${params.locale}/orders/${target.id}`);
    }

    const rating = ratingRaw ? Number(ratingRaw) : null;
    if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      redirect(`/${params.locale}/orders/${target.id}`);
    }

    const comment = commentRaw ? commentRaw.slice(0, 300) : null;
    const toUserId = current.id === target.restaurantId ? target.farmerId : target.restaurantId;

    await prisma.review.create({
      data: {
        orderId: target.id,
        fromUserId: current.id,
        toUserId,
        rating,
        comment
      }
    });

    redirect(`/${params.locale}/orders/${target.id}`);
  }

  // schema.prisma の Snap 名に合わせる
  const restaurantPhone = show(order.restaurantPhoneSnap);
  const restaurantMap = show(order.restaurantMapSnap);
  const farmerMap = show(order.farmerMapSnap);
  const handoffMap = show(order.handoffMapSnap);

  const statusLabel = getStatusLabel(t, order.status);
  const now = new Date();
  const isNotExpired = !order.expiresAt || order.expiresAt > now;
  const canAct = user.role === 'FARMER' && order.status === 'REQUESTED' && isNotExpired;
  const canStartPreparing = user.role === 'FARMER' && order.status === 'ACCEPTED';
  const canStartDelivering = user.role === 'FARMER' && order.status === 'PREPARING';
  const canComplete = user.role === 'RESTAURANT' && order.status === 'DELIVERING';
  const showPaymentReview = order.status === 'COMPLETED';

  // 農家の受取額（REQUESTED / ACCEPTED 共通で使う）
  const farmerFishSubtotal = order.quantityKg * order.basePricePerKgSnap;
  const farmerGuttingFee = order.guttingRequested
    ? order.quantityKg * order.guttingPricePerKgSnap
    : 0;

  const { min: farmerDeliveryMin, max: farmerDeliveryMax } =
    minMaxFromTiers(order.listing.deliveryFeeTiers);

  const farmerFreeEligible =
    order.deliveryRequested &&
    order.listing.freeDeliveryMinKg != null &&
    order.quantityKg >= order.listing.freeDeliveryMinKg;

  const farmerDeliveryMinEst = order.deliveryRequested
    ? (farmerFreeEligible ? 0 : farmerDeliveryMin)
    : 0;

  const farmerDeliveryMaxEst = order.deliveryRequested
    ? (farmerFreeEligible ? 0 : farmerDeliveryMax)
    : 0;

  const farmerTotalMinEst =
    farmerFishSubtotal + farmerGuttingFee + farmerDeliveryMinEst;

  const farmerTotalMaxEst =
    farmerFishSubtotal + farmerGuttingFee + farmerDeliveryMaxEst;

  const farmerShowRangeEst =
    order.deliveryRequested && farmerDeliveryMinEst !== farmerDeliveryMaxEst;

  // ACCEPTED 後（確定）
  const farmerDeliveryFinal = order.deliveryRequested
    ? order.deliveryFeeFinal ?? 0
    : 0;

  const farmerTotalFinal =
    farmerFishSubtotal + farmerGuttingFee + farmerDeliveryFinal;

    // REQUESTED時の概算（参考）
  const alpha = order.alphaRateSnap ?? 0;
  const beta = order.betaRateSnap ?? 0;

  const displayUnit = order.basePricePerKgSnap * (1 + alpha);
  const fishSubtotalEst = order.quantityKg * displayUnit;
  const guttingFeeEst = order.guttingRequested ? order.quantityKg * order.guttingPricePerKgSnap : 0;
  const supportFeeEst = fishSubtotalEst * beta;

  // 配送費レンジ（送料無料条件が成立するなら0固定）
  const {min: deliveryMin, max: deliveryMax} = minMaxFromTiers(order.listing.deliveryFeeTiers);
  const freeEligible = order.deliveryRequested
    && order.listing.freeDeliveryMinKg != null
    && order.quantityKg >= order.listing.freeDeliveryMinKg;

  const deliveryMinEst = order.deliveryRequested ? (freeEligible ? 0 : deliveryMin) : 0;
  const deliveryMaxEst = order.deliveryRequested ? (freeEligible ? 0 : deliveryMax) : 0;

  const totalMinEst = fishSubtotalEst + guttingFeeEst + supportFeeEst + deliveryMinEst;
  const totalMaxEst = fishSubtotalEst + guttingFeeEst + supportFeeEst + deliveryMaxEst;

  const showRangeEst = order.deliveryRequested && deliveryMinEst !== deliveryMaxEst;

  const rejectReasonLabel = order.rejectReason
    ? t(`orders.rejectReasons.${order.rejectReason}` as any)
    : '-';

  const reviews = showPaymentReview
    ? await prisma.review.findMany({where: {orderId: order.id}})
    : [];
  const myReview = reviews.find((review) => review.fromUserId === user.id) ?? null;
  const partnerReview = reviews.find((review) => review.fromUserId !== user.id) ?? null;

  return (
    <main>
      <div className="section-title">
        <h2>{t('orders.detailTitle', {id: order.id.slice(0, 8)})}</h2>
        <Link href={`/${params.locale}/orders/new?listingId=${order.listingId}&reorderId=${order.id}`}>
          <button className="secondary">{t('orders.reorder')}</button>
        </Link>
      </div>

      <div className="card">
        <p>
          {t('listings.fishType')}: {order.listing.fishType}
        </p>
        <p>
          {t('orders.quantityKg')}: {order.quantityKg}
        </p>
        <p>
          {t('orders.status')}: {statusLabel}
        </p>
        <p>
          {t('orders.requestedDateLabel')}: {order.requestedDate}
        </p>
        <p>
          {t('orders.expiresAt')}: {order.expiresAt ? order.expiresAt.toLocaleString() : '-'}
        </p>
        
        {user.role === 'FARMER' && order.status === 'REQUESTED' ? (
          <div className="notice" style={{marginTop: 12}}>
            <strong>{t('orders.farmerEstimateTitle')}</strong>

            <div className="muted">
              {t('orders.estimateFishLabel')}: {money(farmerFishSubtotal)}
            </div>

            {order.guttingRequested ? (
              <div className="muted">
                {t('orders.estimateGuttingLabel')}: {money(farmerGuttingFee)}
              </div>
            ) : null}

            <div className="muted">
              {t('orders.estimateDeliveryLabel')}:&nbsp;
              {order.deliveryRequested ? (
                farmerFreeEligible ? (
                  <>
                    {money(0)} <span className="muted">({t('orders.freeDeliveryHint', {minKg: order.listing.freeDeliveryMinKg})})</span>
                  </>
                ) : farmerShowRangeEst ? (
                  `${money(farmerDeliveryMinEst)} - ${money(farmerDeliveryMaxEst)}`
                ) : (
                  money(farmerDeliveryMinEst)
                )
              ) : (
                money(0)
              )}
            </div>

            <div style={{marginTop: 8}}>
              <strong>
                {t('orders.estimateTotalLabel')}:&nbsp;
                {farmerShowRangeEst
                  ? `${money(farmerTotalMinEst)} - ${money(farmerTotalMaxEst)}`
                  : money(farmerTotalMinEst)}
              </strong>
            </div>

            <div className="muted" style={{marginTop: 6}}>
              {t('orders.farmerEstimateNote')}
            </div>
          </div>
        ) : null}


        {user.role === 'RESTAURANT' && order.status === 'REQUESTED' ? (
          <div className="notice" style={{marginTop: 12}}>
            <strong>{t('orders.estimate')}</strong>

            <div className="muted">
              {t('orders.estimateFishLabel')}: {money(fishSubtotalEst)}
            </div>

            {order.guttingRequested ? (
              <div className="muted">
                {t('orders.estimateGuttingLabel')}: {money(guttingFeeEst)}
              </div>
            ) : null}

            <div className="muted">
              {t('orders.estimateSupportLabel')}: {money(supportFeeEst)}
            </div>

            <div className="muted">
              {t('orders.estimateDeliveryLabel')}:&nbsp;
              {order.deliveryRequested ? (
                freeEligible ? (
                  <>
                    {money(0)}{' '}
                    <span className="muted">
                      ({t('orders.freeDeliveryHint', {minKg: order.listing.freeDeliveryMinKg})})
                    </span>
                  </>
                ) : showRangeEst ? (
                  `${money(deliveryMinEst)} - ${money(deliveryMaxEst)}`
                ) : (
                  money(deliveryMinEst)
                )
              ) : (
                money(0)
              )}
            </div>

            <div style={{marginTop: 8}}>
              <strong>
                {t('orders.estimateTotalLabel')}:&nbsp;
                {showRangeEst ? `${money(totalMinEst)} - ${money(totalMaxEst)}` : money(totalMinEst)}
              </strong>
            </div>

            <div className="muted" style={{marginTop: 6}}>
              {t('orders.estimateNote')}
            </div>
          </div>
        ) : null}

          {user.role === 'FARMER' && order.status === 'COMPLETED' ? (
            <div className="notice" style={{marginTop: 12}}>
              <strong>{t('orders.farmerFinalTitle')}</strong>

              <div className="muted">
                {t('orders.fishPriceFinal')}: {money(farmerFishSubtotal)}
              </div>

              {order.guttingRequested ? (
                <div className="muted">
                  {t('orders.guttingFeeFinal')}: {money(farmerGuttingFee)}
                </div>
              ) : null}

              <div className="muted">
                {t('orders.deliveryFeeFinalLabel')}: {money(farmerDeliveryFinal)}
              </div>

              <div style={{marginTop: 8}}>
                <strong>
                  {t('orders.payoutTotal')}: {money(farmerTotalFinal)}
                </strong>
              </div>

              <div className="muted" style={{marginTop: 6}}>
                {t('orders.farmerFinalNote')}
              </div>
              <div className="muted" style={{marginTop: 6}}>
                {t('orders.farmerPaymentNote')}
              </div>
            </div>
          ) : null}

          {user.role === 'FARMER' && order.status === 'ACCEPTED' ? (
            <div className="notice" style={{marginTop: 12}}>
              <strong>{t('orders.farmerFinalTitle')}</strong>

              <div className="muted">
                {t('orders.fishPriceFinal')}: {money(farmerFishSubtotal)}
              </div>

              {order.guttingRequested ? (
                <div className="muted">
                  {t('orders.guttingFeeFinal')}: {money(farmerGuttingFee)}
                </div>
              ) : null}

              <div className="muted">
                {t('orders.deliveryFeeFinalLabel')}: {money(farmerDeliveryFinal)}
              </div>

              <div style={{marginTop: 8}}>
                <strong>
                  {t('orders.payoutTotal')}: {money(farmerTotalFinal)}
                </strong>
              </div>
            </div>
          ) : null}

        {order.status === 'REJECTED' ? (
          <div className="notice" style={{marginTop: 12, background: '#fee2e2', color: '#991b1b'}}>
            <div>
              {t('orders.rejectReason')}: {rejectReasonLabel}
            </div>
            <div>
              {t('orders.rejectNote')}: {order.rejectNote || '-'}
            </div>
          </div>
        ) : null}

        {order.status === 'DELIVERING' ? (
          <div className="notice" style={{marginTop: 12}}>
            {t('orders.deliveryCallNotice')}
          </div>
        ) : null}

        <hr style={{margin: '16px 0', opacity: 0.2}} />

        <h3 style={{marginTop: 0}}>{t('orders.contactSection')}</h3>

        <p>
          {t('profile.phone')}:&nbsp;
          {restaurantPhone ? (
            <>
              {restaurantPhone} (<a href={`tel:${restaurantPhone}`}>{t('orders.phoneCall')}</a>)
            </>
          ) : (
            t('orders.notSet')
          )}
        </p>

        <p>
          {t('orders.restaurantMap')}:&nbsp;
          {restaurantMap ? (
            <a href={restaurantMap} target="_blank" rel="noopener noreferrer" style={mapLinkStyle}>
              {t('orders.openGoogleMaps')}
            </a>
          ) : (
            t('orders.notSet')
          )}
        </p>

        <p>
          {t('orders.farmerMap')}:&nbsp;
          {farmerMap ? (
            <a href={farmerMap} target="_blank" rel="noopener noreferrer" style={mapLinkStyle}>
              {t('orders.openGoogleMaps')}
            </a>
          ) : (
            t('orders.notSet')
          )}
        </p>

        <p>
          {t('orders.handoffMap')}:&nbsp;
          {handoffMap ? (
            <a href={handoffMap} target="_blank" rel="noopener noreferrer" style={mapLinkStyle}>
              {t('orders.openGoogleMaps')}
            </a>
          ) : (
            t('orders.notSet')
          )}
        </p>

        <hr style={{margin: '16px 0', opacity: 0.2}} />

        <p>
          {t('orders.memo')}: {order.memo || '-'}
        </p>
      </div>

      {canAct ? (
        <div className="grid" style={{marginTop: 16}}>
          <div className="card">
            <h3 style={{marginTop: 0}}>{t('orders.accept')}</h3>
            <form action={acceptOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              {order.deliveryRequested ? (
                <p className="muted">
                  {t('orders.deliveryFeeFinalLabel')}: auto-calculated by distance at acceptance.
                </p>
              ) : (
                <p className="muted">{t('orders.deliveryFeeFixedZero')}</p>
              )}
              <button type="submit">{t('orders.accept')}</button>
            </form>
          </div>

          <div className="card">
            <h3 style={{marginTop: 0}}>{t('orders.reject')}</h3>
            <form action={rejectOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <label>
                {t('orders.rejectReason')}
                <select name="rejectReason" required defaultValue="">
                  <option value="" disabled>
                    --
                  </option>
                  <option value="QUANTITY">{t('orders.rejectReasons.QUANTITY')}</option>
                  <option value="SIZE">{t('orders.rejectReasons.SIZE')}</option>
                  <option value="TIME">{t('orders.rejectReasons.TIME')}</option>
                  <option value="MIN_ORDER">{t('orders.rejectReasons.MIN_ORDER')}</option>
                  <option value="OTHER">{t('orders.rejectReasons.OTHER')}</option>
                </select>
              </label>
              <label>
                {t('orders.rejectNote')}
                <textarea name="rejectNote" />
              </label>
              <button type="submit" className="danger">
                {t('orders.reject')}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {(canStartPreparing || canStartDelivering || canComplete) ? (
        <div className="card" style={{marginTop: 16}}>
          {canStartPreparing ? (
            <form action={startPreparingAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button type="submit">{t('orders.actionStartPreparing')}</button>
            </form>
          ) : null}

          {canStartDelivering ? (
            <form action={startDeliveringAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button type="submit">{t('orders.actionStartDelivering')}</button>
            </form>
          ) : null}

          {canComplete ? (
            <form action={completeOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button type="submit">{t('orders.actionComplete')}</button>
            </form>
          ) : null}
        </div>
      ) : null}

      {showPaymentReview ? (
        <div className="grid" style={{marginTop: 16}}>
          {/* 決済カード：Restaurantのみ */}
          {user.role === 'RESTAURANT' ? (
            <div className="card">
              <h3 style={{marginTop: 0}}>{t('orders.paymentStatus')}</h3>
              <p>
                {t('orders.paymentStatus')}: {order.paymentStatus === 'PAID' ? t('orders.paid') : t('orders.unpaid')}
              </p>

              <p style={{marginTop: 8}}>
                <strong>{t('orders.paymentAmountFinal')}: {money(order.finalTotal ?? 0)}</strong>
              </p>

              <details style={{marginTop: 8}}>
                <summary style={{cursor: 'pointer'}}>{t('orders.viewBreakdown')}</summary>

                <div className="muted" style={{marginTop: 8, display: 'grid', gap: 4}}>
                  <div>{t('orders.fishSubtotalFinal')}: {money(order.fishSubtotalSnap ?? 0)}</div>

                  {order.guttingRequested ? (
                    <div>{t('orders.guttingFinal')}: {money(order.quantityKg * order.guttingPricePerKgSnap)}</div>
                  ) : null}

                  <div>
                    {t('orders.supportFeeFinal')}: {money((order.betaFeeSnap ?? 0) - (order.betaDiscountSnap ?? 0))}
                  </div>

                  {order.betaDiscountSnap && order.betaDiscountSnap > 0 ? (
                    <div>{t('orders.supportFeeDiscount')}: -{money(order.betaDiscountSnap)}</div>
                  ) : null}

                  <div>{t('orders.deliveryFeeFinalLabel')}: {money(order.deliveryFeeFinal ?? 0)}</div>

                  <div style={{marginTop: 4}}>
                    <strong>{t('orders.totalFinalLabel')}: {money(order.finalTotal ?? 0)}</strong>
                  </div>
                </div>
              </details>

              {process.env.NEXT_PUBLIC_FISHLINK_PAYMENT_QR_URL ? (
                <img
                  src={process.env.NEXT_PUBLIC_FISHLINK_PAYMENT_QR_URL}
                  alt="FishLink QR"
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    height: 'auto',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    margin: '8px 0'
                  }}
                />
              ) : null}

              <p className="muted">{t('orders.paymentNote1')}</p>
              <p className="muted">{t('orders.paymentNote2')}</p>

              {order.paymentStatus !== 'PAID' ? (
                <form action={markPaidAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button type="submit">{t('orders.markPaid')}</button>
                </form>
              ) : null}
            </div>
          ) : null}

          {/* レビューカード：両者 */}
          <div className="card">
            <h3 style={{marginTop: 0}}>{t('orders.reviewTitle')}</h3>
            <p className="muted">{t('orders.reviewNote')}</p>

            <div className="notice" style={{marginTop: 12}}>
              <strong>{t('orders.reviewFromYou')}</strong>
              {myReview ? (
                <div className="muted">
                  {myReview.rating ? `★${myReview.rating}` : '-'} {myReview.comment || ''}
                </div>
              ) : (
                <form action={createReviewAction} style={{marginTop: 8}}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <label>
                    {t('orders.reviewRating')}
                    <select name="rating" defaultValue="">
                      <option value="">--</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </label>
                  <label>
                    {t('orders.reviewComment')}
                    <textarea name="comment" maxLength={300} />
                  </label>
                  <button type="submit">{t('orders.submitReview')}</button>
                </form>
              )}
            </div>

            <div className="notice" style={{marginTop: 12}}>
              <strong>{t('orders.reviewFromPartner')}</strong>

              {myReview ? (
                partnerReview ? (
                  <div className="muted">
                    {partnerReview.rating ? `★${partnerReview.rating}` : '-'} {partnerReview.comment || ''}
                  </div>
                ) : (
                  <div className="muted">{t('orders.partnerReviewWaiting')}</div>
                )
              ) : (
                <div className="muted">{t('orders.reviewWaiting')}</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

    </main>
  );
}
