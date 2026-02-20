'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {formatMoneyKHR} from '../../../lib/formatMoneyKHR';

const STORAGE_KEY = 'fl_listings_view';

type ListingViewItem = {
  id: string;
  farmerName: string;
  province: string | null;
  district: string | null;
  fishType: string;
  priceType: 'FIXED' | 'TIERED';
  fixedPriceKhrPerKg: number;
  tierMinPriceKhrPerKg: number;
  tierMaxPriceKhrPerKg: number;
  basePricePerKg: number;
  displayPricePerKg: number;
  deliveryAvailable: boolean;
  deliveryFeeTiersLabel: string;
  freeDeliveryMinKg: number | null;
  minOrderKg: number | null;
  updatedAtLabel: string;
  photoUrl: string | null;
};

type Labels = {
  list: string;
  grid: string;
  farmerName: string;
  fishType: string;
  basePricePerKg: string;
  deliveryAvailable: string;
  deliveryFeeTiers: string;
  freeDeliveryMinKg: string;
  minOrderKg: string;
  updatedAt: string;
  order: string;
  priceTypeFixed: string;
  priceTypeTiered: string;
  yes: string;
  no: string;
};

export default function RestaurantListingsView({
  locale,
  listings,
  labels
}: {
  locale: string;
  listings: ListingViewItem[];
  labels: Labels;
}) {
  const toRielPerKg = (price: number) => `${formatMoneyKHR(price).replace(' KHR', '')} riel/kg`;
  const restaurantPriceLabel = (listing: ListingViewItem) => {
    if (listing.priceType === 'TIERED') {
      return `${formatMoneyKHR(listing.tierMinPriceKhrPerKg).replace(' KHR', '')}〜${formatMoneyKHR(listing.tierMaxPriceKhrPerKg).replace(' KHR', '')} riel/kg`;
    }
    return toRielPerKg(listing.fixedPriceKhrPerKg);
  };
  const priceTypeBadge = (listing: ListingViewItem) => (listing.priceType === 'TIERED' ? labels.priceTypeTiered : labels.priceTypeFixed);

  const [view, setView] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'list' || stored === 'grid') {
      setView(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, view);
    }
  }, [view]);

  const toggle = useMemo(() => {
    return (
      <div className="nav-links">
        <button
          type="button"
          className={view === 'list' ? '' : 'secondary'}
          onClick={() => setView('list')}
        >
          {labels.list}
        </button>
        <button
          type="button"
          className={view === 'grid' ? '' : 'secondary'}
          onClick={() => setView('grid')}
        >
          {labels.grid}
        </button>
      </div>
    );
  }, [labels.grid, labels.list, view]);

  if (view === 'list') {
    return (
      <div className="card">
        <div className="section-title">
          <div />
          {toggle}
        </div>
        <table>
          <thead>
            <tr>
              <th>{labels.farmerName}</th>
              <th>{labels.fishType}</th>
              <th>{labels.basePricePerKg}</th>
              <th>{labels.deliveryAvailable}</th>
              <th>{labels.deliveryFeeTiers}</th>
              <th>{labels.freeDeliveryMinKg}</th>
              <th>{labels.minOrderKg}</th>
              <th>{labels.updatedAt}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td>
                  <div>{listing.farmerName}</div>
                  {listing.province ? (
                    <div className="muted" style={{ fontSize: 12 }}>
                      📍 {listing.province}{listing.district ? ` / ${listing.district}` : ''}
                    </div>
                  ) : null}
                </td>
                <td>{listing.fishType}</td>
                <td>
                  <div>{restaurantPriceLabel(listing)}</div>
                  <span className="badge">{priceTypeBadge(listing)}</span>
                </td>
                <td>{listing.deliveryAvailable ? labels.yes : labels.no}</td>
                <td>{listing.deliveryFeeTiersLabel}</td>
                <td>{listing.freeDeliveryMinKg ?? '-'}</td>
                <td>{listing.minOrderKg ?? '-'}</td>
                <td>{listing.updatedAtLabel}</td>
                <td>
                  <Link href={`/${locale}/orders/new?listingId=${listing.id}`}>
                    <button className="secondary">{labels.order}</button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title">
        <div />
        {toggle}
      </div>
      <div className="grid grid-2">
        {listings.map((listing) => (
          <div
            className="card"
            key={listing.id}
            style={{display: 'flex', flexDirection: 'column', gap: 8, minHeight: 320}}
          >
            <div
              style={{
                height: 120,
                borderRadius: 12,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {listing.photoUrl ? (
                <img
                  src={listing.photoUrl}
                  alt={listing.fishType}
                  style={{width: '100%', height: '100%', objectFit: 'cover'}}
                />
              ) : (
                <span style={{fontSize: 36, fontWeight: 700}}>
                  {listing.fishType?.[0]?.toUpperCase() ?? 'F'}
                </span>
              )}
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
                <span style={{fontSize: 20, fontWeight: 700}}>{listing.fishType}</span>
                <span style={{fontSize: 16, fontWeight: 700}}>
                  {restaurantPriceLabel(listing)}
                </span>
                <span className="badge">{priceTypeBadge(listing)}</span>
              </div>
            </div>

            <div className="muted">{listing.farmerName}</div>
            {listing.province ? (
              <div className="muted" style={{ fontSize: 12 }}>
                📍 {listing.province}{listing.district ? ` / ${listing.district}` : ''}
              </div>
            ) : null}
            <div className="muted">
              {labels.deliveryAvailable}: {listing.deliveryAvailable ? labels.yes : labels.no} ｜ {labels.deliveryFeeTiers}:{' '}
              {listing.deliveryFeeTiersLabel}
            </div>

            <div className="muted">
              {labels.minOrderKg}: {listing.minOrderKg ?? '-'}
            </div>

            <div className="muted">
              {labels.updatedAt}: {listing.updatedAtLabel}
            </div>

            <div style={{marginTop: 'auto', display: 'flex', justifyContent: 'flex-end'}}>
              <Link href={`/${locale}/orders/new?listingId=${listing.id}`}>
                <button className="secondary">{labels.order}</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
