'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {useParams} from 'next/navigation';

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

const REQUESTS_KEY = 'fishlink_exp_requests';

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

export default function FarmerInboxPage() {
  const params = useParams<{locale: string}>();
  const locale = typeof params?.locale === 'string' ? params.locale : '';
  const [requests, setRequests] = useState<RequestItem[]>([]);

  useEffect(() => {
    const refresh = () => {
      const list = readRequests().sort((a, b) => b.createdAt - a.createdAt);
      setRequests(list);
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return (
    <main>
      <div className="section-title">
        <h2>Farmer inbox (demo)</h2>
        <span className="badge">Experiment / UI test only</span>
      </div>

      <div className="card" style={{marginBottom: 12}}>
        <p className="notice">This request was sent to nearby farmers (within 30km) (demo)</p>
      </div>

      <div style={{marginBottom: 12}}>
        <Link href={`/${locale}/experiment/demand`}>
          <button type="button" className="secondary">Go to demand page</button>
        </Link>
      </div>

      <div className="grid">
        {requests.length === 0 ? (
          <div className="card">
            <p className="muted">No requests yet.</p>
          </div>
        ) : null}

        {requests.map((request) => (
          <div key={request.id} className="card">
            <h3>{request.fishType}</h3>
            {request.size ? <p className="muted">Size: {request.size}</p> : null}
            <p className="muted">Quantity: {request.quantityKg} kg</p>
            <p className="muted">Requested date: {request.requestedDate}</p>
            {request.requestedTime ? <p className="muted">Requested time: {request.requestedTime}</p> : null}
            <p className="muted">Location: {request.location}</p>
            <p className="muted">Delivery: {request.deliveryOption}</p>
            <p className="muted">Gutting: {request.gutting}</p>
            <p className="muted">Request ID: {request.id}</p>

            <Link href={`/${locale}/experiment/farmer/offer?requestId=${request.id}`}>
              <button type="button">Make offer</button>
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
