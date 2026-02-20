import {getTranslations} from 'next-intl/server';
import {prisma} from '../../../lib/prisma';
import {requireUser} from '../../../lib/auth';
import {redirect} from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({
  params,
  searchParams
}: {
  params: {locale: string};
  searchParams: {saved?: string};
}) {
  const t = await getTranslations();
  const user = await requireUser(params.locale);

  // 表示用：ProfileをDBから取得（無ければnull）
  const profile = await prisma.profile.findUnique({
    where: {userId: user.id}
  });

  async function saveProfile(formData: FormData) {
    'use server';
    const current = await requireUser(params.locale);

    const name = String(formData.get('name') ?? '').trim();
    const entityName = String(formData.get('entityName') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const googleMapUrl = String(formData.get('googleMapUrl') ?? '').trim();

    const province = String(formData.get('province') ?? '').trim() || null;
    const district = String(formData.get('district') ?? '').trim() || null;
    const latRaw = String(formData.get('lat') ?? '').trim();
    const lngRaw = String(formData.get('lng') ?? '').trim();
    const lat = latRaw === '' ? null : Number(latRaw);
    const lng = lngRaw === '' ? null : Number(lngRaw);

    if (lat != null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      redirect(`/${params.locale}/profile`);
    }
    if (lng != null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      redirect(`/${params.locale}/profile`);
    }

    await prisma.profile.upsert({
      where: {userId: current.id},
      update: {name, entityName, phone, googleMapUrl, lat, lng, province, district},
      create: {userId: current.id, name, entityName, phone, googleMapUrl, lat, lng, province, district}
    });

    redirect(`/${params.locale}/profile?saved=1`);
  }

  return (
    <main>
      <div className="section-title">
        <h2>{t('profile.title')}</h2>
        {searchParams.saved ? <span className="badge">{t('profile.saved')}</span> : null}
      </div>

      <div className="card">
        <form action={saveProfile}>
          <label>
            {t('profile.name')}
            <input name="name" required defaultValue={profile?.name ?? ''} />
          </label>

          <label>
            {t('profile.entityName')}
            <input name="entityName" required defaultValue={profile?.entityName ?? ''} />
          </label>

          <label>
            {t('profile.phone')}
            <input name="phone" required defaultValue={profile?.phone ?? ''} />
          </label>

          <label>
            {t('profile.mapUrl')}
            <input name="googleMapUrl" required defaultValue={profile?.googleMapUrl ?? ''} />
          </label>

          <label>
            Latitude
            <input name="lat" type="number" step="any" min="-90" max="90" defaultValue={profile?.lat ?? ''} />
          </label>

          <label>
            Longitude
            <input name="lng" type="number" step="any" min="-180" max="180" defaultValue={profile?.lng ?? ''} />
          </label>

          <label>
            {t('profile.province')}
            <input
              name="province"
              placeholder={t('profile.provincePlaceholder')}
              defaultValue={profile?.province ?? ''}
            />
          </label>

          <label>
            {t('profile.district')}
            <input
              name="district"
              placeholder={t('profile.districtPlaceholder')}
              defaultValue={profile?.district ?? ''}
            />
          </label>

          <button type="submit">{t('profile.save')}</button>
        </form>
      </div>
    </main>
  );
}
