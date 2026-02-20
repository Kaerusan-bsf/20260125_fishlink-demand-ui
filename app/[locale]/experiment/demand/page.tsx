'use client';

import Link from 'next/link';
import {FormEvent, useEffect, useMemo, useState} from 'react';
import {useParams, useRouter, useSearchParams} from 'next/navigation';

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

function writeRequests(items: RequestItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(items));
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

function formatKHR(amount: number) {
  return `${Math.round(amount).toLocaleString('en-US')} KHR`;
}

function renderStars(rating: number) {
  return '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function ExperimentDemandPage() {
  const params = useParams<{locale: string}>();
  const locale = typeof params?.locale === 'string' ? params.locale : '';
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);
  const [currentRequest, setCurrentRequest] = useState<RequestItem | null>(null);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [acceptedOfferId, setAcceptedOfferId] = useState<string | null>(null);
  const [rejectedByOfferId, setRejectedByOfferId] = useState<Record<string, string>>({});

  const requestIdFromQuery = searchParams.get('requestId') ?? '';

  function refreshOffers(targetRequestId: string) {
    if (!targetRequestId) {
      setOffers([]);
      return;
    }
    const filtered = readOffers()
      .filter((offer) => offer.requestId === targetRequestId)
      .sort((a, b) => b.createdAt - a.createdAt);
    setOffers(filtered);
  }

  useEffect(() => {
    if (!requestIdFromQuery) return;
    const request = readRequests().find((item) => item.id === requestIdFromQuery) ?? null;
    if (!request) return;
    setCurrentRequest(request);
    setStep(2);
    setAcceptedOfferId(null);
    setRejectedByOfferId({});
    refreshOffers(request.id);
  }, [requestIdFromQuery]);

  useEffect(() => {
    if (!currentRequest?.id) return;
    const onStorage = () => refreshOffers(currentRequest.id);
    const onFocus = () => refreshOffers(currentRequest.id);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentRequest?.id]);

  const newOffersCount = offers.length;

  const acceptedOffer = useMemo(
    () => offers.find((offer) => offer.id === acceptedOfferId) ?? null,
    [offers, acceptedOfferId]
  );

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const requestId = makeId('req');
    const quantityKg = Number(formData.get('quantity'));

    const nextRequest: RequestItem = {
      id: requestId,
      fishType: String(formData.get('fishType') ?? '').trim(),
      size: String(formData.get('size') ?? '').trim() || undefined,
      quantityKg: Number.isFinite(quantityKg) ? quantityKg : 0,
      requestedDate: String(formData.get('requestedDate') ?? '').trim(),
      requestedTime: String(formData.get('requestedTime') ?? '').trim() || undefined,
      deliveryOption: String(formData.get('deliveryOption') ?? '').trim(),
      gutting: String(formData.get('gutting') ?? '').trim(),
      location: String(formData.get('location') ?? '').trim(),
      createdAt: Date.now()
    };

    const currentRequests = readRequests();
    writeRequests([...currentRequests, nextRequest]);

    setCurrentRequest(nextRequest);
    setStep(2);
    setAcceptedOfferId(null);
    setRejectedByOfferId({});
    refreshOffers(nextRequest.id);
    router.replace(`/${locale}/experiment/demand?requestId=${nextRequest.id}`);
  }

  function handleAccept(offerId: string) {
    setAcceptedOfferId(offerId);
  }

  function handleReject(offerId: string) {
    setRejectedByOfferId((current) => ({...current, [offerId]: 'Rejected (demo only)'}));
    if (acceptedOfferId === offerId) {
      setAcceptedOfferId(null);
    }
  }

  return (
    <main>
      <div className="section-title">
        <h2>Demand model (レストラン投稿)</h2>
        <span className="badge">Experiment / UI test only</span>
      </div>

      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12}}>
        <Link href={`/${locale}/experiment/farmer/inbox`}>
          <button type="button" className="secondary">Farmer inbox (demo)</button>
        </Link>
        <Link href={`/${locale}/experiment`}>
          <button type="button" className="secondary">Back to experiment top</button>
        </Link>
      </div>

      {step === 1 ? (
        <div className="card">
          <h3>STEP 1: Restaurant request form</h3>
          <p className="muted">UI-only. This form stores data in localStorage only.</p>
          <form onSubmit={handleRequestSubmit}>
            <label>
              Fish type
              <input name="fishType" type="text" required placeholder="e.g. Tilapia" />
            </label>

            <label>
              Size
              <input name="size" type="text" required placeholder="8-10 head/kg" />
            </label>

            <label>
              Quantity (kg)
              <input name="quantity" type="number" min="1" step="1" required />
            </label>

            <label>
              Requested date
              <input name="requestedDate" type="date" required />
            </label>

            <label>
              Requested time (optional)
              <input name="requestedTime" type="text" placeholder="e.g. 8:00 AM or 17:30" />
            </label>

            <label>
              Delivery option
              <select name="deliveryOption" required defaultValue="Delivery">
                <option value="Delivery">Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>
            </label>

            <label>
              Gutting option
              <select name="gutting" required defaultValue="Yes">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>

            <label>
              Location
              <input name="location" type="text" required placeholder="e.g. Phnom Penh, Toul Kork" />
            </label>

            <button type="submit">Notify nearby farmers (demo)</button>
          </form>
        </div>
      ) : (
        <div className="grid">
          <div className="card">
            <h3>STEP 2: Offers for your request</h3>
            {currentRequest ? (
              <>
                <p className="notice">Notified nearby farmers within 30km (demo)</p>
                <p className="muted">Request ID: {currentRequest.id}</p>
              </>
            ) : (
              <p className="muted">No request selected.</p>
            )}
            <div style={{marginTop: 8}}>
              <span className="badge">New offers: {newOffersCount}</span>
            </div>
          </div>

          {currentRequest ? (
            <div className="card">
              <h3>Request summary</h3>
              <p className="muted">Fish: {currentRequest.fishType}</p>
              {currentRequest.size ? <p className="muted">Size: {currentRequest.size}</p> : null}
              <p className="muted">Quantity: {currentRequest.quantityKg} kg</p>
              <p className="muted">Date: {currentRequest.requestedDate}</p>
              {currentRequest.requestedTime ? <p className="muted">Time: {currentRequest.requestedTime}</p> : null}
              <p className="muted">Location: {currentRequest.location}</p>
              <p className="muted">Delivery: {currentRequest.deliveryOption}</p>
              <p className="muted">Gutting: {currentRequest.gutting}</p>
            </div>
          ) : null}

          {offers.length === 0 ? (
            <div className="card">
              <p className="muted">No offers yet. Ask a farmer to create one from Farmer inbox.</p>
            </div>
          ) : null}

          {offers.map((offer) => {
            const totalKhr = currentRequest
              ? currentRequest.quantityKg * offer.pricePerKgKhr + (offer.deliveryFeeKhr ?? 0)
              : 0;
            return (
              <div key={offer.id} className="card">
                <h3>{offer.farmerName}</h3>
                <p className="muted">Rating: {renderStars(offer.rating)}</p>
                <p className="muted">Distance: {offer.distanceKm.toFixed(1)} km</p>
                <p className="muted">Price: {formatKHR(offer.pricePerKgKhr)}/kg</p>
                {offer.deliveryFeeKhr != null ? (
                  <p className="muted">Delivery fee: {formatKHR(offer.deliveryFeeKhr)}</p>
                ) : (
                  <p className="muted">Delivery fee: -</p>
                )}
                <p className="muted">Total estimate: {formatKHR(totalKhr)}</p>
                {offer.note ? <p className="muted">Note: {offer.note}</p> : null}

                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                  <button type="button" onClick={() => handleAccept(offer.id)}>
                    Accept
                  </button>
                  <button type="button" className="secondary" onClick={() => handleReject(offer.id)}>
                    Reject
                  </button>
                </div>

                {rejectedByOfferId[offer.id] ? <p className="notice">{rejectedByOfferId[offer.id]}</p> : null}
                {acceptedOfferId === offer.id ? <p className="notice">✅ Confirmed (demo)</p> : null}
              </div>
            );
          })}

          {acceptedOffer ? (
            <div className="card">
              <h3>注文確定しました（デモ）</h3>
              <p className="muted">Farmer: {acceptedOffer.farmerName}</p>
              <p className="muted">Price: {formatKHR(acceptedOffer.pricePerKgKhr)}/kg</p>
            </div>
          ) : null}

          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <button type="button" className="secondary" onClick={() => setStep(1)}>
              Back to edit request
            </button>
            {currentRequest ? (
              <Link href={`/${locale}/experiment/demand?requestId=${currentRequest.id}`}>
                <button type="button" className="secondary">Reload current request</button>
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
