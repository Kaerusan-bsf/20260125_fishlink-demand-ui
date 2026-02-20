import {getTranslations} from 'next-intl/server';
import {loginAction} from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  params,
  searchParams
}: {
  params: {locale: string};
  searchParams: {error?: string};
}) {
  const t = await getTranslations();
  const error = searchParams.error;

  return (
    <main>
      <div className="card" style={{maxWidth: 420, margin: '40px auto'}}>
        <h2>{t('login.title')}</h2>
        {error ? (
          <p className="notice" style={{background: '#fee2e2', color: '#991b1b'}}>
            {t(`login.error.${error}` as any)}
          </p>
        ) : null}
        <form action={loginAction}>
          <input type="hidden" name="locale" value={params.locale} />
          <label>
            {t('login.role')}
            <select name="role" required defaultValue="">
              <option value="" disabled>
                --
              </option>
              <option value="RESTAURANT">{t('roles.restaurant')}</option>
              <option value="FARMER">{t('roles.farmer')}</option>
            </select>
          </label>
          <label>
            {t('login.userId')}
            <input name="userId" required />
          </label>
          <label>
            {t('login.password')}
            <input name="password" type="password" required />
          </label>
          <button type="submit">{t('login.submit')}</button>
        </form>
      </div>
    </main>
  );
}
