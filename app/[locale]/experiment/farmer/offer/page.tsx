'use client';

import Link from 'next/link';
import {FormEvent, useEffect, useState} from 'react';
import {useParams, useSearchParams} from 'next/navigation';

type RequestItem = {
  id: string;
  fishType: string;
  size?: string;
  quantityKg: number;
  requestedDate: string;
  requestedTime?: string;
  deliveryOption: string;
  gutting: string;
  location: string;
  createdAt: number;
};

type OfferItem = {
  id: string;
  requestId: string;
  farmerName: string;
  rating: number;
  distanceKm: number;
  pricePerKgKhr: number;
  deliveryFeeKhr?: number;
  note?: string;
  createdAt: number;
};

const REQUESTS_KEY = 'fishlink_exp_requests';
const OFFERS_KEY = 'fishlink_exp_offers';

function readRequests(): RequestItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readOffers(): OfferItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOffers(items: OfferItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OFFERS_KEY, JSON.stringify(items));
}

function formatKHR(amount: number) {
  return `${Math.round(amount).toLocaleString('en-US')} KHR`;
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function FarmerOfferPage() {
  const params = useParams<{locale: string}>();
  const locale = typeof params?.locale === 'string' ? params.locale : '';
  const searchParams = useSearchParams();
  const requestId = searchParams.get('requestId') ?? '';

  const [targetRequest, setTargetRequest] = useState<RequestItem | null>(null);
  const [sentOffer, setSentOffer] = useState<OfferItem | null>(null);

  useEffect(() => {
    if (!requestId) return;
    const found = readRequests().find((item) => item.id === requestId) ?? null;
    setTargetRequest(found);
  }, [requestId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targetRequest) return;

    const formData = new FormData(event.currentTarget);
    const pricePerKgKhr = Number(formData.get('pricePerKgKhr'));
    const deliveryFeeRaw = String(formData.get('deliveryFeeKhr') ?? '').trim();
    const deliveryFeeKhr = deliveryFeeRaw ? Number(deliveryFeeRaw) : undefined;

    const nextOffer: OfferItem = {
      id: makeId('offer'),
      requestId: targetRequest.id,
      farmerName: String(formData.get('farmerName') ?? 'Demo Farmer').trim() || 'Demo Farmer',
      rating: 4,
      distanceKm: 9.8,
      pricePerKgKhr: Number.isFinite(pricePerKgKhr) ? pricePerKgKhr : 0,
      deliveryFeeKhr: deliveryFeeKhr != null && Number.isFinite(deliveryFeeKhr) ? deliveryFeeKhr : undefined,
      note: String(formData.get('note') ?? '').trim() || undefined,
      createdAt: Date.now()
    };

    const current = readOffers();
    writeOffers([...current, nextOffer]);
    setSentOffer(nextOffer);
  }

  return (
    <main>
      <div className="section-title">
        <h2>Make offer (farmer demo)</h2>
        <span className="badge">Experiment / UI test only</span>
      </div>

      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12}}>
        <Link href={`/${locale}/experiment/farmer/inbox`}>
          <button type="button" className="secondary">Back to inbox</button>
        </Link>
        {requestId ? (
          <Link href={`/${locale}/experiment/demand?requestId=${requestId}`}>
            <button type="button" className="secondary">Go to demand request</button>
          </Link>
        ) : null}
      </div>

      {!targetRequest ? (
        <div className="card">
          <p className="muted">Request not found. Please choose from inbox.</p>
        </div>
      ) : (
        <div className="grid">
          <div className="card">
            <h3>Request summary</h3>
            <p className="muted">Fish: {targetRequest.fishType}</p>
            {targetRequest.size ? <p className="muted">Size: {targetRequest.size}</p> : null}
            <p className="muted">Quantity: {targetRequest.quantityKg} kg</p>
            <p className="muted">Date: {targetRequest.requestedDate}</p>
            {targetRequest.requestedTime ? <p className="muted">Time: {targetRequest.requestedTime}</p> : null}
            <p className="muted">Location: {targetRequest.location}</p>
            <p className="muted">Delivery: {targetRequest.deliveryOption}</p>
            <p className="muted">Gutting: {targetRequest.gutting}</p>
          </div>

          <div className="card">
            <h3>Offer form</h3>
            <form onSubmit={handleSubmit}>
              <label>
                Farmer name
                <input name="farmerName" type="text" defaultValue="Demo Farmer" required />
              </label>

              <label>
                Price per kg (KHR)
                <input name="pricePerKgKhr" type="number" min="1" step="1" required />
              </label>

              <label>
                Delivery fee (KHR, optional)
                <input name="deliveryFeeKhr" type="number" min="0" step="1" />
              </label>

              <label>
                Note (optional)
                <textarea name="note" placeholder="e.g. Can deliver before noon" />
              </label>

              <button type="submit">Send offer (demo)</button>
            </form>
          </div>

          {sentOffer ? (
            <div className="card">
              <p className="notice">Offer sent (demo)</p>
              <p className="muted">Price: {formatKHR(sentOffer.pricePerKgKhr)}/kg</p>
              {sentOffer.deliveryFeeKhr != null ? (
                <p className="muted">Delivery fee: {formatKHR(sentOffer.deliveryFeeKhr)}</p>
              ) : null}
              <Link href={`/${locale}/experiment/demand?requestId=${targetRequest.id}`}>
                <button type="button" className="secondary">Back to restaurant demand page</button>
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
