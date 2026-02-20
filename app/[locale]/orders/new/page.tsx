import {getTranslations} from 'next-intl/server';
import {requireUser} from '../../../../lib/auth';
import {prisma} from '../../../../lib/prisma';
import {redirect} from 'next/navigation';
import {
  computeExpiresAt,
  computeExpiresAtByDate,
  computeRequestedDate,
  PHNOM_PENH
} from '../../../../lib/expiration';
import {createNotification} from '../../../../lib/notifications';
import {DateTime} from 'luxon';
import OrderFormClient from './OrderFormClient';
import {formatMoneyKHR} from '../../../../lib/formatMoneyKHR';
import {Prisma} from '@prisma/client';
import {haversineDistanceKm} from '../../../../lib/distance';

export const dynamic = 'force-dynamic';

const freeRadiusKm = 5;
const feePerKmKhr = 600;
const mapLinkStyle = {
  display: 'inline-block',
  marginTop: 4,
  padding: '6px 10px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: '#f8fafc',
  textDecoration: 'none',
  fontWeight: 600
};

export default async function OrderNewPage({
  params,
  searchParams
}: {
  params: {locale: string};
  searchParams: {listingId?: string; reorderId?: string; error?: 'expired_time' | 'farmer_location_missing'};
}) {
  const t = await getTranslations();
  const error = searchParams.error;
  const todayDate = DateTime.now().setZone(PHNOM_PENH).toISODate();

  // Role enumは使わず string
  const currentUser = await requireUser(params.locale, 'RESTAURANT');

  const listingId = searchParams.listingId;
  if (!listingId) {
    redirect(`/${params.locale}/listings`);
  }

  const listing = await prisma.listing.findUnique({
    where: {id: listingId},
    include: {
      farmer: {include: {profile: true}},
      deliveryFeeTiers: true,
      sizePriceTiers: {orderBy: {sortOrder: 'asc'}}
    }
  });

  if (!listing) {
    redirect(`/${params.locale}/listings`);
  }

  const restaurant = await prisma.user.findUnique({
    where: {id: currentUser.id},
    include: {profile: true}
  });
  if (!restaurant?.profile) {
    redirect(`/${params.locale}/profile`);
  }

  if (restaurant.profile.lat == null || restaurant.profile.lng == null) {
    redirect(`/${params.locale}/profile`);
  }

  const reorder = searchParams.reorderId
    ? await prisma.order.findUnique({where: {id: searchParams.reorderId}})
    : null;

  const farmerLat = listing.farmer.profile?.lat;
  const farmerLng = listing.farmer.profile?.lng;
  const restaurantLat = restaurant.profile.lat;
  const restaurantLng = restaurant.profile.lng;
  const farmerLocationMissing = farmerLat == null || farmerLng == null;
  const distanceKm = farmerLocationMissing
    ? null
    : haversineDistanceKm({lat: restaurantLat, lng: restaurantLng}, {lat: farmerLat, lng: farmerLng});
  const deliveryFeeKhr = distanceKm == null || distanceKm <= freeRadiusKm ? 0 : Math.ceil(distanceKm) * feePerKmKhr;

  async function createOrder(formData: FormData) {
    'use server';
    const current = await requireUser(params.locale, 'RESTAURANT');
    const requestIdRaw = String(formData.get('requestId') ?? '').trim();
    const requestId = requestIdRaw || crypto.randomUUID();

    const listingIdInput = String(formData.get('listingId') ?? '');
    const quantityKg = Number(formData.get('quantityKg'));
    const sizeRequestTextInput = String(formData.get('sizeRequestText') ?? '').trim();
    const timeBand = String(formData.get('timeBand') ?? ''); // "MORNING" | "AFTERNOON" | "NIGHT"
    const dayOffset = Number(formData.get('dayOffset'));
    const selectedDate = String(formData.get('selectedDate') ?? '').trim();
    const timeDetail = String(formData.get('timeDetail') ?? '').trim();
    const memo = String(formData.get('memo') ?? '').trim();
    const guttingRequested = formData.get('guttingRequested') === 'on';
    const deliveryRequested = formData.get('deliveryRequested') === 'on';

    if (!listingIdInput || !quantityKg || !timeBand) {
      redirect(`/${params.locale}/orders`);
    }

    const listingForOrder = await prisma.listing.findUnique({
      where: {id: listingIdInput},
      include: {
        farmer: {include: {profile: true}},
        deliveryFeeTiers: true,
        sizePriceTiers: {orderBy: {sortOrder: 'asc'}}
      }
    });
    if (!listingForOrder) {
      redirect(`/${params.locale}/listings`);
    }

    // RestaurantはUser直下ではなく profile に電話/Mapが入っている
    const restaurant = await prisma.user.findUnique({
      where: {id: current.id},
      include: {profile: true}
    });
    if (!restaurant?.profile) {
      redirect(`/${params.locale}/profile`);
    }
    if (restaurant.profile.lat == null || restaurant.profile.lng == null) {
      redirect(`/${params.locale}/profile`);
    }
    if (listingForOrder.farmer.profile?.lat == null || listingForOrder.farmer.profile?.lng == null) {
      redirect(`/${params.locale}/orders/new?listingId=${listingForOrder.id}&error=farmer_location_missing`);
    }

    const pricing = await prisma.pricingConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });
    const pricingVersionSnap = pricing?.pricingVersion ?? null;
    const alphaRateSnap = pricing?.alphaRate ?? 0;
    const betaRateSnap = pricing?.betaRate ?? 0;
    const betaDiscountRateSnap = pricing?.betaDiscountRate ?? 0;

    let expiresAt: Date;
    let requestedDate: string;

    if (selectedDate) {
      requestedDate = selectedDate;
      expiresAt = computeExpiresAtByDate(timeBand, selectedDate);
    } else {
      if (!Number.isFinite(dayOffset)) {
        redirect(`/${params.locale}/orders`);
      }
      const maybeRequestedDate = computeRequestedDate(dayOffset);
      if (!maybeRequestedDate) {
        redirect(`/${params.locale}/orders`);
      }
      requestedDate = maybeRequestedDate;
      expiresAt = computeExpiresAt(timeBand, dayOffset);

    }
    const now = DateTime.now().setZone(PHNOM_PENH);
    if (DateTime.fromJSDate(expiresAt).setZone(PHNOM_PENH) <= now) {
      const query = new URLSearchParams({
        listingId: listingForOrder.id,
        error: 'expired_time'
      });
      if (searchParams.reorderId) {
        query.set('reorderId', searchParams.reorderId);
      }
      redirect(`/${params.locale}/orders/new?${query.toString()}`);
    }

    const finalGuttingRequested = listingForOrder.guttingAvailable ? guttingRequested : false;
    const finalDeliveryRequested = listingForOrder.deliveryAvailable ? deliveryRequested : false;
    let finalSizeRequestText = sizeRequestTextInput;
    let effectiveBasePricePerKg = listingForOrder.fixedPriceKhrPerKg ?? Math.round(listingForOrder.basePricePerKg);
    if (listingForOrder.priceType === 'TIERED') {
      const selectedSizeTierSortOrderRaw = String(formData.get('selectedSizeTierSortOrder') ?? '').trim();
      const selectedSizeTierSortOrder = Number(selectedSizeTierSortOrderRaw);
      if (!Number.isInteger(selectedSizeTierSortOrder)) {
        redirect(`/${params.locale}/orders/new?listingId=${listingForOrder.id}`);
      }
      const selectedTier = listingForOrder.sizePriceTiers.find((tier) => tier.sortOrder === selectedSizeTierSortOrder);
      if (!selectedTier) {
        redirect(`/${params.locale}/orders/new?listingId=${listingForOrder.id}`);
      }
      effectiveBasePricePerKg = selectedTier.priceKhrPerKg;
      finalSizeRequestText = `${selectedTier.minHeadPerKg}–${selectedTier.maxHeadPerKg} head/kg`;
    } else if (!finalSizeRequestText) {
      redirect(`/${params.locale}/orders`);
    }

    // 受け渡し地点（自動）
    const handoffMapSnap = finalDeliveryRequested
      ? restaurant.profile.googleMapUrl
      : (listingForOrder.farmer.profile?.googleMapUrl ?? '');

    let order;
    let created = false;
    try {
      order = await prisma.order.create({
        data: {
          requestId,
          listingId: listingForOrder.id,
          restaurantId: current.id,
          farmerId: listingForOrder.farmerId,

          quantityKg,
          sizeRequestText: finalSizeRequestText,
          timeBand,
          timeDetail: timeDetail || null,
          memo: memo || null,

          guttingRequested: finalGuttingRequested,
          deliveryRequested: finalDeliveryRequested,

          status: 'REQUESTED',
          expiresAt,
          requestedDate,

          // schema の Snap 名に合わせる
          restaurantPhoneSnap: restaurant.profile.phone,
          restaurantMapSnap: restaurant.profile.googleMapUrl,
          farmerPhoneSnap: listingForOrder.farmer.profile?.phone ?? '',
          farmerMapSnap: listingForOrder.farmer.profile?.googleMapUrl ?? '',
          handoffMapSnap,

          basePricePerKgSnap: effectiveBasePricePerKg,
          guttingPricePerKgSnap: listingForOrder.guttingPricePerKg,

          pricingVersionSnap,
          alphaRateSnap,
          betaRateSnap,
          betaDiscountRateSnap
        }
      });
      created = true;
    } catch (error) {
      const isDuplicateRequestId =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(error.meta?.target) &&
        error.meta?.target.includes('requestId');

      if (!isDuplicateRequestId) {
        throw error;
      }

      order = await prisma.order.findUnique({
        where: {requestId}
      });
    }

    if (!order) {
      throw new Error('Failed to create or fetch order by requestId');
    }

    if (created) {
      await createNotification({
        userId: listingForOrder.farmerId,
        titleKey: 'notifications.orderRequested.title',
        bodyKey: 'notifications.orderRequested.body',
        params: {orderId: order.id}
      });
    }

    redirect(`/${params.locale}/orders/${order.id}`);
  }

    // UI用（概算表示）：PricingConfigのα/βを取得
    const pricingForUi = await prisma.pricingConfig.findFirst({
      where: {isActive: true},
      orderBy: {updatedAt: 'desc'}
    });
  const alphaUi = pricingForUi?.alphaRate ?? 0;
  const betaUi = pricingForUi?.betaRate ?? 0;

  return (
    <main>
      <div className="section-title">
        <h2>{t('orders.createTitle')}</h2>
      </div>
      {error === 'expired_time' ? (
        <p className="notice" style={{background: '#fee2e2', color: '#991b1b'}}>
          {t('orders.expiredTimeError')}
        </p>
      ) : null}
      {error === 'farmer_location_missing' ? (
        <p className="notice" style={{background: '#fee2e2', color: '#991b1b'}}>
          Farmer location is not set yet. Ordering is temporarily unavailable for this listing.
        </p>
      ) : null}
      <div className="card">
        <p className="muted">
          {(listing.farmer.profile?.entityName ?? '-') } / {listing.fishType}
        </p>
        <div className="muted" style={{marginTop: 4}}>
          {t('listings.priceTypeLabel')}:{' '}
          {listing.priceType === 'TIERED' ? t('listings.priceTypeTiered') : t('listings.priceTypeFixed')}
        </div>
        {listing.priceType === 'TIERED' ? (
          <div style={{marginTop: 8}}>
            <strong>{t('listings.sizePriceTiers')}</strong>
            <table>
              <tbody>
                {(listing.sizePriceTiers.length ? listing.sizePriceTiers : []).map((tier) => (
                  <tr key={tier.id}>
                    <td>{tier.minHeadPerKg}-{tier.maxHeadPerKg} head/kg</td>
                    <td>{formatMoneyKHR(tier.priceKhrPerKg).replace(' KHR', '')} riel/kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted" style={{marginTop: 4}}>
            {t('listings.fixedPriceKhrPerKg')}: {formatMoneyKHR(listing.fixedPriceKhrPerKg ?? Math.round(listing.basePricePerKg)).replace(' KHR', '')} riel/kg
          </p>
        )}
        {listing.farmer.profile?.province ? (
          <p className="muted" style={{marginTop: 4}}>
            📍 {listing.farmer.profile.province}
            {listing.farmer.profile.district ? ` / ${listing.farmer.profile.district}` : ''}
          </p>
        ) : null}

{listing.farmer.profile?.googleMapUrl ? (
  <p style={{marginTop: 4}}>
    <a href={listing.farmer.profile.googleMapUrl} target="_blank" rel="noopener noreferrer" style={mapLinkStyle}>
      {t('orders.openGoogleMaps')}
    </a>
    <br />
    <small className="muted">{t('orders.openGoogleMapsHint')}</small>
  </p>
) : null}
        {distanceKm != null ? (
          <p className="muted" style={{marginTop: 4}}>
            Distance: {distanceKm.toFixed(2)} km / Auto delivery fee: {formatMoneyKHR(deliveryFeeKhr)}
          </p>
        ) : (
          <p className="notice" style={{marginTop: 8, background: '#fee2e2', color: '#991b1b'}}>
            Farmer location is not set yet. Ordering is temporarily unavailable for this listing.
          </p>
        )}

        {distanceKm != null ? (
          <OrderFormClient
            locale={params.locale}
            listingId={listing.id}
            todayDate={todayDate}
            guttingAvailable={listing.guttingAvailable}
            deliveryAvailable={listing.deliveryAvailable}
            priceType={listing.priceType === 'TIERED' ? 'TIERED' : 'FIXED'}
            fixedPriceKhrPerKg={listing.fixedPriceKhrPerKg ?? Math.round(listing.basePricePerKg)}
            alphaRate={alphaUi}
            sizePriceTiers={listing.sizePriceTiers.map((tier) => ({
              sortOrder: tier.sortOrder,
              minHeadPerKg: tier.minHeadPerKg,
              maxHeadPerKg: tier.maxHeadPerKg,
              priceKhrPerKg: tier.priceKhrPerKg
            }))}
            defaultValues={{
              quantityKg: reorder?.quantityKg != null ? String(reorder.quantityKg) : '',
              sizeRequestText: reorder?.sizeRequestText ?? '',
              timeBand: reorder?.timeBand ?? '',
              timeDetail: reorder?.timeDetail ?? '',
              memo: reorder?.memo ?? '',
              guttingRequested: Boolean(reorder?.guttingRequested ?? false),
              deliveryRequested: Boolean(reorder?.deliveryRequested ?? false)
            }}
            guttingPricePerKg={listing.guttingPricePerKg}
            betaRate={betaUi}
            deliveryFeeKhr={deliveryFeeKhr}
            distanceKm={distanceKm}
            labels={{
              quantityKg: t('orders.quantityKg'),
              sizeRequestText: t('orders.sizeRequestText'),
              requestedDateLabel: t('orders.requestedDateLabel'),
              today: t('orders.today'),
              tomorrow: t('orders.tomorrow'),
              dayAfterTomorrow: t('orders.dayAfterTomorrow'),
              pickDate: t('orders.pickDate'),
              orPickFromCalendar: t('orders.orPickFromCalendar'),
              timeBand: t('orders.timeBand'),
              timeDetail: t('orders.timeDetail'),
              memo: t('orders.memo'),
              guttingRequested: t('orders.guttingRequested'),
              deliveryRequested: t('orders.deliveryRequested'),
              sizeTierLabel: t('orders.sizeRequestText'),
              submit: t('orders.submit'),

              estimateTitle: t('orders.estimate'),
              estimateFish: t('orders.estimateFishLabel'),
              estimateGutting: t('orders.estimateGuttingLabel'),
              estimateSupport: t('orders.estimateSupportLabel'),
              estimateDelivery: t('orders.estimateDeliveryLabel'),
              estimateTotal: t('orders.estimateTotalLabel'),
              estimateNote: t('orders.estimateNote'),
              deliveryFeeNote: t('orders.deliveryFeeNote')
            }}
            timeBandOptions={{
              morning: t('timeBand.morning'),
              afternoon: t('timeBand.afternoon'),
              night: t('timeBand.night')
            }}
            createOrderAction={createOrder}
          />
        ) : null}
      </div>
    </main>
  );
}
