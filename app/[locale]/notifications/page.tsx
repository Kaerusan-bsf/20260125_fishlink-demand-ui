import {getTranslations} from 'next-intl/server';
import {requireUser} from '../../../lib/auth';
import {prisma} from '../../../lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage({params}: {params: {locale: string}}) {
  const t = await getTranslations();
  const user = await requireUser(params.locale);

  const notifications = await prisma.notification.findMany({
    where: {userId: user.id},
    orderBy: {createdAt: 'desc'}
  });

  return (
    <main>
      <h2>{t('notifications.title')}</h2>
      <div className="grid">
        {notifications.length === 0 ? <p>{t('notifications.empty')}</p> : null}

        {notifications.map((note) => {
          const parsedParams = note.paramsJson
            ? (JSON.parse(note.paramsJson) as Record<string, string | number>)
            : {};
          const orderId = parsedParams.orderId as string | undefined;

          const content = (
            <div className="card">
              <strong>{t(note.titleKey)}</strong>
              <p>{t(note.bodyKey, parsedParams)}</p>
              <span className="muted">{note.createdAt.toLocaleString()}</span>
            </div>
          );

          // orderId があれば「通知 → 注文詳細」へ
          return orderId ? (
            <Link
              key={note.id}
              href={`/${params.locale}/orders/${orderId}`}
              style={{textDecoration: 'none', color: 'inherit'}}
            >
              {content}
            </Link>
          ) : (
            <div key={note.id}>{content}</div>
          );
        })}
      </div>
    </main>
  );
}
