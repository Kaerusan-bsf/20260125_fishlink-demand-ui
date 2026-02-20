import {getTranslations} from 'next-intl/server';
import {requireUser} from '../../../lib/auth';
import {prisma} from '../../../lib/prisma';
import Link from 'next/link';
import {refreshOrdersExpiration} from '../../../lib/expiration';
import {formatMoneyKHR} from '../../../lib/formatMoneyKHR';

export const dynamic = 'force-dynamic';

function money(n: number | null | undefined) {
  const v = Number(n);
  return Number.isFinite(v) ? formatMoneyKHR(v) : '-';
}

function farmerPayout(order: any) {
  const fish = (order.quantityKg ?? 0) * (order.basePricePerKgSnap ?? 0);
  const gutting = order.guttingRequested
    ? (order.quantityKg ?? 0) * (order.guttingPricePerKgSnap ?? 0)
    : 0;
  const delivery = order.deliveryRequested ? (order.deliveryFeeFinal ?? 0) : 0;
  return fish + gutting + delivery;
}

export default async function OrdersPage({params}: {params: {locale: string}}) {
  const t = await getTranslations();
  const user = await requireUser(params.locale);

  const where = user.role === 'RESTAURANT' ? {restaurantId: user.id} : {farmerId: user.id};
  const orders = await prisma.order.findMany({
    where,
    include: {
      listing: true,
      restaurant: { include: { profile: true } },
      farmer: { include: { profile: true } }
    },
    orderBy: {createdAt: 'desc'}
  });

  await refreshOrdersExpiration(orders.map((order) => order.id));

  const refreshed = await prisma.order.findMany({
    where,
    include: {
      listing: true,
      restaurant: { include: { profile: true } },
      farmer: { include: { profile: true } }
    },
    orderBy: {createdAt: 'desc'}
  });

  return (
    <main>
      <div className="section-title">
        <h2>{t('orders.title')}</h2>
      </div>
      <div className="card">
        <table>
            <thead>
              <tr>
                <th>{t('orders.id')}</th>
                <th>{t('listings.fishType')}</th>
                <th>{t('orders.status')}</th>
                <th>{t('orders.requestedDateLabel')}</th>
                <th>{t('orders.partner')}</th>
                <th>{user.role === 'RESTAURANT' ? t('orders.finalTotal') : t('orders.farmerPayout')}</th>
                <th>{t('orders.paymentStatus')}</th>
                <th></th>
              </tr>
            </thead>
          <tbody>
            {refreshed.map((order) => {
              const statusLabel =
                order.status === 'REQUESTED'
                  ? t('orders.requested')
                  : order.status === 'EXPIRED'
                    ? t('orders.expired')
                    : order.status === 'ACCEPTED'
                      ? t('orders.accepted')
                      : order.status === 'REJECTED'
                        ? t('orders.rejected')
                        : order.status === 'PREPARING'
                          ? t('orders.statusPreparing')
                          : order.status === 'DELIVERING'
                            ? t('orders.statusDelivering')
                            : order.status === 'COMPLETED'
                              ? t('orders.statusCompleted')
                              : order.status;
              return (
                <tr key={order.id}>
                  <td>{order.id.slice(0, 8)}</td>
                  <td>{order.listing.fishType}</td>
                  <td>{statusLabel}</td>

                  <td>{order.requestedDate ?? '-'}</td>

                  <td>
                    <div>
                      {user.role === 'RESTAURANT'
                        ? (order.farmer?.profile?.entityName ?? order.farmer?.userId ?? '-')
                        : (order.restaurant?.profile?.entityName ?? order.restaurant?.userId ?? '-')}
                    </div>

                    {(() => {
                      const p =
                        user.role === 'RESTAURANT'
                          ? order.farmer?.profile?.province
                          : order.restaurant?.profile?.province;

                      const d =
                        user.role === 'RESTAURANT'
                          ? order.farmer?.profile?.district
                          : order.restaurant?.profile?.district;

                      if (!p) return null;
                      return (
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          📍 {p}{d ? ` / ${d}` : ''}
                        </div>
                      );
                    })()}
                  </td>

                  <td>
                    {order.status === 'ACCEPTED' ||
                    order.status === 'PREPARING' ||
                    order.status === 'DELIVERING' ||
                    order.status === 'COMPLETED'
                      ? user.role === 'RESTAURANT'
                        ? money(order.finalTotal)
                        : money(farmerPayout(order))
                      : '-'}
                  </td>

                  <td>{order.status === 'COMPLETED' ? (order.paymentStatus ?? 'UNPAID') : '-'}</td>

                  <td>
                    <Link href={`/${params.locale}/orders/${order.id}`}>
                      <button className="secondary">{t('orders.view')}</button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
