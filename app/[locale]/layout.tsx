import {ReactNode} from 'react';
import {NextIntlClientProvider} from 'next-intl';
import {notFound} from 'next/navigation';
import {locales} from '../../i18n';
import {getMessages, getTranslations} from 'next-intl/server';
import Link from 'next/link';
import {getCurrentUser, logoutAction} from '../../lib/auth';
import LocaleSwitcher from './LocaleSwitcher';


export const dynamic = 'force-dynamic';

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: {locale: string};
}) {
  const {locale} = params;
  if (!locales.includes(locale as any)) {
    notFound();
  }
  const messages = await getMessages({locale});
  const t = await getTranslations({locale});
  const user = await getCurrentUser();

  return (
    <NextIntlClientProvider messages={messages}>
      <header>
        <div className="navbar">
          <div>
            <Link href={`/${locale}/listings`}>
              <strong>{t('app.title')}</strong>
            </Link>
            <span className="badge">{t('app.version')}</span>
          </div>
          <nav className="nav-links">
            {user ? (
              <>
                <Link href={`/${locale}/listings`}>{t('nav.listings')}</Link>
                <Link href={`/${locale}/orders`}>{t('nav.orders')}</Link>
                <Link href={`/${locale}/notifications`}>{t('nav.notifications')}</Link>
                <Link href={`/${locale}/profile`}>{t('nav.profile')}</Link>
                <form action={logoutAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <button type="submit" className="secondary">{t('nav.logout')}</button>
                </form>
              </>
            ) : (
              <Link href={`/${locale}/login`}>{t('nav.login')}</Link>
            )}
            <LocaleSwitcher />
          </nav>
        </div>
      </header>
      {children}
    </NextIntlClientProvider>
  );
}
