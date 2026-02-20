import {getTranslations} from 'next-intl/server';
import {redirect} from 'next/navigation';
import ListingCreateForm from './ListingCreateForm';

export const dynamic = 'force-dynamic';


const defaultTiers = [
  {minKm: 0, maxKm: 5, fee: 1},
  {minKm: 5, maxKm: 10, fee: 2},
  {minKm: 10, maxKm: 20, fee: 4},
  {minKm: 20, maxKm: 30, fee: 6}
];

const defaultSizePriceTiers = [
  {minHeadPerKg: 4, maxHeadPerKg: 5, priceKhrPerKg: 4500},
  {minHeadPerKg: 6, maxHeadPerKg: 8, priceKhrPerKg: 5000},
  {minHeadPerKg: 8, maxHeadPerKg: 10, priceKhrPerKg: 5500},
  {minHeadPerKg: 10, maxHeadPerKg: 12, priceKhrPerKg: 6000}
];

export default async function ListingNewPage({params}: {params: {locale: string}}) {

  if (process.env.CI) {
    return null;
  }  

  const t = await getTranslations();
  
  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );

  async function createListing(formData: FormData) {
    'use server';

    const { requireUser } = await import('../../../../lib/auth');
    const { prisma } = await import('../../../../lib/prisma');
    const {Prisma} = await import('@prisma/client');

    const current = await requireUser(params.locale, 'FARMER');
    const requestIdRaw = String(formData.get('requestId') ?? '').trim();
    const requestId = requestIdRaw || crypto.randomUUID();
    const priceTypeRaw = String(formData.get('priceType') ?? 'FIXED').trim();
    const priceType = priceTypeRaw === 'TIERED' ? 'TIERED' : 'FIXED';
    const fishType = String(formData.get('fishType') ?? '').trim();
    const fixedPriceKhrPerKgRaw = Number(formData.get('fixedPriceKhrPerKg'));
    const guttingAvailable = formData.get('guttingAvailable') === 'on';
    const guttingPricePerKg = Number(formData.get('guttingPricePerKg'));
    const deliveryAvailable = formData.get('deliveryAvailable') === 'on';
    const photoUrl = String(formData.get('photoUrl') ?? '').trim();
    const freeDeliveryMinKg = formData.get('freeDeliveryMinKg')
      ? Number(formData.get('freeDeliveryMinKg'))
      : null;
    const minOrderKg = formData.get('minOrderKg') ? Number(formData.get('minOrderKg')) : null;

    const sizePriceTiers = defaultSizePriceTiers
      .map((_, index) => {
        const rangeRaw = String(formData.get(`sizeRange${index}`) ?? '').trim();
        const normalizedRange = rangeRaw.replaceAll('–', '-');
        const parts = normalizedRange.split('-');
        if (parts.length !== 2) {
          return null;
        }
        const minHeadPerKg = Number.parseInt(parts[0].trim(), 10);
        const maxHeadPerKg = Number.parseInt(parts[1].trim(), 10);
        const priceKhrPerKg = Number(formData.get(`sizePrice${index}`));
        const hasValidRangeNumbers =
          Number.isInteger(minHeadPerKg) &&
          Number.isInteger(maxHeadPerKg) &&
          minHeadPerKg > 0 &&
          maxHeadPerKg > 0 &&
          minHeadPerKg <= maxHeadPerKg;
        const hasValidPrice = Number.isInteger(priceKhrPerKg) && priceKhrPerKg > 0;
        if (!hasValidRangeNumbers || !hasValidPrice) {
          return null;
        }
        return {
          minHeadPerKg,
          maxHeadPerKg,
          priceKhrPerKg,
          sortOrder: index
        };
      })
      .filter((tier): tier is {minHeadPerKg: number; maxHeadPerKg: number; priceKhrPerKg: number; sortOrder: number} => tier != null);

    const tiers = defaultTiers.map((tier, index) => {
      const minKm = Number(formData.get(`tierMin${index}`));
      const maxKm = Number(formData.get(`tierMax${index}`));
      const fee = Number(formData.get(`tierFee${index}`));
      return {
        label: `${minKm}-${maxKm}km`,
        fee,
        sortOrder: index + 1
      };
    });

    if (!fishType) {
      redirect(`/${params.locale}/listings/new`);
    }

    const isPositiveInteger = (n: number) => Number.isInteger(n) && n > 0;
    const isNonNegativeInteger = (n: number) => Number.isInteger(n) && n >= 0;

    if (!isPositiveInteger(Math.round(guttingPricePerKg))) {
      redirect(`/${params.locale}/listings/new`);
    }
    if (freeDeliveryMinKg != null && !isNonNegativeInteger(Math.round(freeDeliveryMinKg))) {
      redirect(`/${params.locale}/listings/new`);
    }
    if (minOrderKg != null && !isNonNegativeInteger(Math.round(minOrderKg))) {
      redirect(`/${params.locale}/listings/new`);
    }
    for (const deliveryTier of tiers) {
      if (!isNonNegativeInteger(Math.round(deliveryTier.fee))) {
        redirect(`/${params.locale}/listings/new`);
      }
    }

    let fixedPriceKhrPerKg: number | null = null;
    let basePricePerKg: number;
    let normalizedSizeTiers: Array<{minHeadPerKg: number; maxHeadPerKg: number; priceKhrPerKg: number; sortOrder: number}> = [];

    if (priceType === 'FIXED') {
      if (!isPositiveInteger(Math.round(fixedPriceKhrPerKgRaw))) {
        redirect(`/${params.locale}/listings/new`);
      }
      fixedPriceKhrPerKg = Math.round(fixedPriceKhrPerKgRaw);
      basePricePerKg = fixedPriceKhrPerKg;
    } else {
      // v0.1 requires every tier row to be valid so listing pricing remains unambiguous.
      if (sizePriceTiers.length !== defaultSizePriceTiers.length) {
        redirect(`/${params.locale}/listings/new`);
      }

      normalizedSizeTiers = sizePriceTiers;

      if (normalizedSizeTiers.length < 1 || normalizedSizeTiers.length > 4) {
        redirect(`/${params.locale}/listings/new`);
      }
      // TODO(v0.2): 範囲重複チェックを追加する

      basePricePerKg = Math.min(...normalizedSizeTiers.map((tier) => tier.priceKhrPerKg));
    }

    let listing = null;
    try {
      listing = await prisma.listing.create({
        data: {
          requestId,
          priceType,
          fixedPriceKhrPerKg,
          farmerId: current.id,
          fishType,
          basePricePerKg,
          guttingAvailable,
          guttingPricePerKg: Math.round(guttingPricePerKg),
          deliveryAvailable,
          deliveryFeeTiers: {
            create: tiers
          },
          sizePriceTiers: {
            create: normalizedSizeTiers
          },
          freeDeliveryMinKg: freeDeliveryMinKg != null ? Math.round(freeDeliveryMinKg) : null,
          minOrderKg: minOrderKg != null ? Math.round(minOrderKg) : null,
          isActive: true,
          photoUrl: photoUrl || null
        }
      });
    } catch (error) {
      const isDuplicateRequestId =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(error.meta?.target) &&
        error.meta?.target.includes('requestId');

      if (isDuplicateRequestId) {
        listing = await prisma.listing.findUnique({
          where: {requestId}
        });
      } else {
        throw error;
      }
    }

    if (!listing) {
      throw new Error('Failed to create or fetch listing by requestId');
    }

    redirect(`/${params.locale}/listings`);
  }

  return (
    <main>
      <div className="section-title">
        <h2>{t('listings.new')}</h2>
      </div>
      <div className="card">
        <ListingCreateForm
          createListingAction={createListing}
          cloudinaryConfigured={cloudinaryConfigured}
          defaultTiers={defaultTiers}
          labels={{
            fishType: t('listings.fishType'),
            guttingAvailable: t('listings.guttingAvailable'),
            guttingPricePerKg: t('listings.guttingPricePerKg'),
            guttingPriceHint: t('listings.guttingPriceHint'),
            priceTypeLabel: t('listings.priceTypeLabel'),
            priceTypeFixed: t('listings.priceTypeFixed'),
            priceTypeTiered: t('listings.priceTypeTiered'),
            fixedPriceKhrPerKg: t('listings.fixedPriceKhrPerKg'),
            sizePriceTiers: t('listings.sizePriceTiers'),
            minHeadPerKg: t('listings.minHeadPerKg'),
            maxHeadPerKg: t('listings.maxHeadPerKg'),
            priceKhrPerKg: t('listings.priceKhrPerKg'),
            deliveryAvailable: t('listings.deliveryAvailable'),
            deliveryFeeTiers: t('listings.deliveryFeeTiers'),
            tierMinKm: t('listings.tierMinKm'),
            tierMaxKm: t('listings.tierMaxKm'),
            tierFee: t('listings.tierFee'),
            freeDeliveryMinKg: t('listings.freeDeliveryMinKg'),
            minOrderKg: t('listings.minOrderKg'),
            create: t('listings.create'),
            submitting: `${t('listings.create')}...`,
            photoOptional: t('listings.photoOptional'),
            uploadPhoto: t('listings.uploadPhoto'),
            uploading: t('listings.uploading'),
            removePhoto: t('listings.removePhoto'),
            photoNotConfigured: t('listings.photoNotConfigured')
          }}
          defaultSizePriceTiers={defaultSizePriceTiers}
        />
      </div>
    </main>
  );
}
