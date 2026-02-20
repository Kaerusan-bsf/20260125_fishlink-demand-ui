import {getTranslations} from 'next-intl/server';
import {requireUser} from '../../../lib/auth';
import {prisma} from '../../../lib/prisma';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import RestaurantListingsView from './RestaurantListingsView';
import {formatMoneyKHR} from '../../../lib/formatMoneyKHR';

export const dynamic = 'force-dynamic';

// SQLite版では deliveryFeeTiers は別テーブル（label/fee/sortOrder）
function formatTiers(t: (key: string, params?: any) => string, tiers: any) {
  if (!Array.isArray(tiers) || tiers.length === 0) return '-';
  return tiers
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((tier) => {
      // 表示： "0-5km: 1,000 KHR" のように出す（翻訳キーがあればそれを使う）
      // 既存の tierFormat が min/max 前提なら、いったん label/fee で組み立てる
      try {
        return t('listings.tierLabelFee', {label: tier.label, fee: formatMoneyKHR(Number(tier.fee))});
      } catch {
        return `${tier.label}: ${formatMoneyKHR(Number(tier.fee))}`;
      }
    })
    .join(', ');
}

export default async function ListingsPage({params}: {params: {locale: string}}) {
  const t = await getTranslations();
  const user = await requireUser(params.locale);
  const defaultSizePriceTiers = [
    {minHeadPerKg: 4, maxHeadPerKg: 5, priceKhrPerKg: 4500, sortOrder: 0},
    {minHeadPerKg: 6, maxHeadPerKg: 8, priceKhrPerKg: 5000, sortOrder: 1},
    {minHeadPerKg: 8, maxHeadPerKg: 10, priceKhrPerKg: 5500, sortOrder: 2},
    {minHeadPerKg: 10, maxHeadPerKg: 12, priceKhrPerKg: 6000, sortOrder: 3}
  ];

  async function updateListing(formData: FormData) {
    'use server';
    // Role enum は使わない（stringで統一）
    const current = await requireUser(params.locale, 'FARMER');
    const {prisma} = await import('../../../lib/prisma');
    const listingId = String(formData.get('listingId'));
    const isActive = formData.get('isActive') === 'on';
    const priceType = String(formData.get('priceType') ?? 'FIXED') === 'TIERED' ? 'TIERED' : 'FIXED';
    const fixedPriceKhrPerKgRaw = Number(formData.get('fixedPriceKhrPerKg'));

    const sizePriceTiers = defaultSizePriceTiers
      .map((tier, index) => {
        const minHeadPerKg = Number(formData.get(`sizeMin${index}`));
        const maxHeadPerKg = Number(formData.get(`sizeMax${index}`));
        const priceKhrPerKg = Number(formData.get(`sizePrice${index}`));
        if (!Number.isFinite(minHeadPerKg) || !Number.isFinite(maxHeadPerKg) || !Number.isFinite(priceKhrPerKg)) {
          return null;
        }
        return {
          minHeadPerKg: Math.round(minHeadPerKg),
          maxHeadPerKg: Math.round(maxHeadPerKg),
          priceKhrPerKg: Math.round(priceKhrPerKg),
          sortOrder: tier.sortOrder
        };
      })
      .filter((tier): tier is {minHeadPerKg: number; maxHeadPerKg: number; priceKhrPerKg: number; sortOrder: number} => tier != null)
      .filter((tier) => tier.minHeadPerKg > 0 && tier.maxHeadPerKg > 0 && tier.priceKhrPerKg > 0 && tier.minHeadPerKg <= tier.maxHeadPerKg);

    let fixedPriceKhrPerKg: number | null = null;
    let basePricePerKg: number | null = null;
    if (priceType === 'FIXED') {
      if (!Number.isInteger(Math.round(fixedPriceKhrPerKgRaw)) || Math.round(fixedPriceKhrPerKgRaw) <= 0) {
        redirect(`/${params.locale}/listings`);
      }
      fixedPriceKhrPerKg = Math.round(fixedPriceKhrPerKgRaw);
      basePricePerKg = fixedPriceKhrPerKg;
    } else {
      if (sizePriceTiers.length < 1 || sizePriceTiers.length > 4) {
        redirect(`/${params.locale}/listings`);
      }
      // TODO(v0.2): 範囲重複チェックを追加する
      basePricePerKg = Math.min(...sizePriceTiers.map((tier) => tier.priceKhrPerKg));
    }

    await prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: {id: listingId, farmerId: current.id},
        data: {
          isActive,
          priceType,
          fixedPriceKhrPerKg,
          basePricePerKg: basePricePerKg ?? undefined
        }
      });
      if (priceType === 'FIXED') {
        await tx.listingSizePriceTier.deleteMany({where: {listingId}});
      } else {
        await tx.listingSizePriceTier.deleteMany({
          where: {
            listingId,
            sortOrder: {notIn: sizePriceTiers.map((tier) => tier.sortOrder)}
          }
        });
        for (const tier of sizePriceTiers) {
          await tx.listingSizePriceTier.upsert({
            where: {
              listingId_sortOrder: {
                listingId,
                sortOrder: tier.sortOrder
              }
            },
            create: {
              listingId,
              minHeadPerKg: tier.minHeadPerKg,
              maxHeadPerKg: tier.maxHeadPerKg,
              priceKhrPerKg: tier.priceKhrPerKg,
              sortOrder: tier.sortOrder
            },
            update: {
              minHeadPerKg: tier.minHeadPerKg,
              maxHeadPerKg: tier.maxHeadPerKg,
              priceKhrPerKg: tier.priceKhrPerKg
            }
          });
        }
      }
    });
    redirect(`/${params.locale}/listings`);
  }

  // FARMER view
  if (user.role === 'FARMER') {
    const listings = await prisma.listing.findMany({
      where: {farmerId: user.id},
      include: {deliveryFeeTiers: true, sizePriceTiers: {orderBy: {sortOrder: 'asc'}}},
      orderBy: {updatedAt: 'desc'}
    });

    return (
      <main>
        <div className="section-title">
          <h2>{t('listings.myListings')}</h2>
          <Link href={`/${params.locale}/listings/new`}>
            <button>{t('listings.new')}</button>
          </Link>
        </div>

        <div className="grid">
          {listings.map((listing) => (
            <div className="card" key={listing.id}>
              <h3>{listing.fishType}</h3>
              <p className="muted">{t('listings.priceTypeLabel')}: {listing.priceType === 'TIERED' ? t('listings.priceTypeTiered') : t('listings.priceTypeFixed')}</p>
              {listing.priceType === 'TIERED' ? (
                <div className="muted" style={{display: 'grid', gap: 2}}>
                  {(listing.sizePriceTiers.length ? listing.sizePriceTiers : defaultSizePriceTiers).map((tier) => (
                    <div key={`${listing.id}-${tier.sortOrder}`}>
                      {tier.minHeadPerKg}-{tier.maxHeadPerKg} head/kg : {formatMoneyKHR(tier.priceKhrPerKg).replace(' KHR', '')} riel/kg
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  {t('listings.fixedPriceKhrPerKg')}: {formatMoneyKHR(listing.fixedPriceKhrPerKg ?? Math.round(listing.basePricePerKg)).replace(' KHR', '')} riel/kg
                </p>
              )}
              <p className="muted">
                {t('listings.deliveryFeeTiers')}: {formatTiers(t, listing.deliveryFeeTiers)}
              </p>

              <form action={updateListing}>
                <input type="hidden" name="listingId" value={listing.id} />
                <label>
                  {t('listings.priceTypeLabel')}
                  <select name="priceType" defaultValue={listing.priceType}>
                    <option value="FIXED">{t('listings.priceTypeFixed')}</option>
                    <option value="TIERED">{t('listings.priceTypeTiered')}</option>
                  </select>
                </label>
                <label>
                  {t('listings.fixedPriceKhrPerKg')}
                  <input
                    name="fixedPriceKhrPerKg"
                    type="number"
                    step="1"
                    min="1"
                    defaultValue={listing.fixedPriceKhrPerKg ?? Math.round(listing.basePricePerKg)}
                  />
                </label>
                {(listing.sizePriceTiers.length ? listing.sizePriceTiers : defaultSizePriceTiers).map((tier, index) => (
                  <div className="grid grid-2" key={`${listing.id}-size-${index}`}>
                    <label>
                      {t('listings.minHeadPerKg')}
                      <input name={`sizeMin${index}`} type="number" min="1" step="1" defaultValue={tier.minHeadPerKg} />
                    </label>
                    <label>
                      {t('listings.maxHeadPerKg')}
                      <input name={`sizeMax${index}`} type="number" min="1" step="1" defaultValue={tier.maxHeadPerKg} />
                    </label>
                    <label>
                      {t('listings.priceKhrPerKg')}
                      <input name={`sizePrice${index}`} type="number" min="1" step="1" defaultValue={tier.priceKhrPerKg} />
                    </label>
                  </div>
                ))}
                <label>
                  {t('listings.isActive')}
                  <input name="isActive" type="checkbox" defaultChecked={listing.isActive} />
                </label>
                <button type="submit" className="secondary">
                  {t('listings.save')}
                </button>
              </form>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // RESTAURANT view
  const listings = await prisma.listing.findMany({
    where: {isActive: true},
    include: {farmer: {include: {profile: true}}, deliveryFeeTiers: true, sizePriceTiers: {orderBy: {sortOrder: 'asc'}}},
    orderBy: {updatedAt: 'desc'}
  });

  const pricing = await prisma.pricingConfig.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' }
  });
  const alpha = pricing?.alphaRate ?? 0;

  const listingsView = listings.map((listing) => ({
    priceType: (listing.priceType === 'TIERED' ? 'TIERED' : 'FIXED') as 'FIXED' | 'TIERED',
    id: listing.id,
    farmerName: listing.farmer.profile?.entityName ?? '-',
    province: listing.farmer.profile?.province ?? null,
    district: listing.farmer.profile?.district ?? null,
    fishType: listing.fishType,
    fixedPriceKhrPerKg: listing.fixedPriceKhrPerKg ?? Math.round(listing.basePricePerKg),
    tierMinPriceKhrPerKg: listing.sizePriceTiers.length
      ? Math.min(...listing.sizePriceTiers.map((tier) => tier.priceKhrPerKg))
      : Math.round(listing.basePricePerKg),
    tierMaxPriceKhrPerKg: listing.sizePriceTiers.length
      ? Math.max(...listing.sizePriceTiers.map((tier) => tier.priceKhrPerKg))
      : Math.round(listing.basePricePerKg),
    basePricePerKg: listing.basePricePerKg,
    displayPricePerKg: listing.basePricePerKg * (1 + alpha), 
    deliveryAvailable: listing.deliveryAvailable,
    deliveryFeeTiersLabel: formatTiers(t, listing.deliveryFeeTiers),
    freeDeliveryMinKg: listing.freeDeliveryMinKg ?? null,
    minOrderKg: listing.minOrderKg ?? null,
    updatedAtLabel: listing.updatedAt.toLocaleDateString(),
    photoUrl: listing.photoUrl ?? null
  }));

  const labels = {
    list: t('listings.view.list'),
    grid: t('listings.view.grid'),
    farmerName: t('profile.entityName'),
    fishType: t('listings.fishType'),
    basePricePerKg: t('listings.basePricePerKg'),
    deliveryAvailable: t('listings.deliveryAvailable'),
    deliveryFeeTiers: t('listings.deliveryFeeTiers'),
    freeDeliveryMinKg: t('listings.freeDeliveryMinKg'),
    minOrderKg: t('listings.minOrderKg'),
    updatedAt: t('listings.updatedAt'),
    order: t('listings.order'),
    priceTypeFixed: t('listings.priceTypeFixed'),
    priceTypeTiered: t('listings.priceTypeTiered'),
    yes: t('common.yes'),
    no: t('common.no')
  };

  return (
    <main>
      <h2>{t('listings.title')}</h2>
      <RestaurantListingsView locale={params.locale} listings={listingsView} labels={labels} />
    </main>
  );
}
