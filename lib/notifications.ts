import {prisma} from './prisma';

export async function createNotification({
  userId,
  titleKey,
  bodyKey,
  params
}: {
  userId: string;
  titleKey: string;
  bodyKey: string;
  params?: Record<string, string | number>;
}) {
  await prisma.notification.create({
    data: {
      userId,
      titleKey,
      bodyKey,
      paramsJson: params ? JSON.stringify(params) : null
    }
  });
}
