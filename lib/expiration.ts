import {DateTime} from 'luxon';
import {prisma} from './prisma';
import {createNotification} from './notifications';

export const PHNOM_PENH = 'Asia/Phnom_Penh';

// TimeBand enumは使わず string で扱う（"MORNING" | "AFTERNOON" | "NIGHT"）
export function computeExpiresAt(timeBand: string, dayOffset: number) {
  const now = DateTime.now().setZone(PHNOM_PENH);
  const targetBase = now.plus({days: dayOffset});
  let target;

  if (timeBand === 'MORNING') {
    target = targetBase.set({hour: 4, minute: 30, second: 0, millisecond: 0});
  } else if (timeBand === 'AFTERNOON') {
    target = targetBase.set({hour: 9, minute: 0, second: 0, millisecond: 0});
  } else {
    // NIGHT
    target = targetBase.set({hour: 14, minute: 0, second: 0, millisecond: 0});
  }

  return target.toJSDate();
}

export function computeRequestedDate(dayOffset: number) {
  const now = DateTime.now().setZone(PHNOM_PENH);
  return now.plus({days: dayOffset}).toISODate();
}

export function computeExpiresAtByDate(timeBand: string, dateStr: string) {
  const base = DateTime.fromISO(dateStr, {zone: PHNOM_PENH});
  let target;

  if (timeBand === 'MORNING') {
    target = base.set({hour: 4, minute: 30, second: 0, millisecond: 0});
  } else if (timeBand === 'AFTERNOON') {
    target = base.set({hour: 9, minute: 0, second: 0, millisecond: 0});
  } else {
    // NIGHT
    target = base.set({hour: 14, minute: 0, second: 0, millisecond: 0});
  }

  return target.toJSDate();
}

export async function refreshOrderExpiration(orderId: string) {
  const order = await prisma.order.findUnique({
    where: {id: orderId},
    include: {listing: true, restaurant: true, farmer: true}
  });
  if (!order) return null;

  // OrderStatus enumは使わず string で判定
  if (order.status !== 'REQUESTED') return order;

  const now = DateTime.now().setZone(PHNOM_PENH).toJSDate();
  if (order.expiresAt && order.expiresAt <= now) {
    const updated = await prisma.order.update({
      where: {id: order.id},
      data: {status: 'EXPIRED'}
    });

    await createNotification({
      userId: order.restaurantId,
      titleKey: 'notifications.orderExpired.title',
      bodyKey: 'notifications.orderExpired.body',
      params: {orderId: order.id}
    });

    await createNotification({
      userId: order.farmerId,
      titleKey: 'notifications.orderExpiredFarmer.title',
      bodyKey: 'notifications.orderExpiredFarmer.body',
      params: {orderId: order.id}
    });

    return {...order, status: updated.status};
  }

  return order;
}

export async function refreshOrdersExpiration(orderIds: string[]) {
  for (const id of orderIds) {
    await refreshOrderExpiration(id);
  }
}
