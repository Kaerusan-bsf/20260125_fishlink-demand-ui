'use client';

import {FormEvent, useState} from 'react';

type Offer = {
  id: string;
  farmerName: string;
  distanceKm: number;
  rating: number;
  pricePerKgUsd: number;
};

const mockOffers: Offer[] = [
  {id: 'offer-1', farmerName: 'Sokha Farm', distanceKm: 4.2, rating: 5, pricePerKgUsd: 5.8},
  {id: 'offer-2', farmerName: 'Mekong Fresh Pond', distanceKm: 8.6, rating: 4, pricePerKgUsd: 5.2},
  {id: 'offer-3', farmerName: 'Tonle Sap Growers', distanceKm: 12.1, rating: 4, pricePerKgUsd: 4.9}
];

function renderStars(rating: number) {
  return '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
}

export default function ExperimentDemandPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [feedbackByOfferId, setFeedbackByOfferId] = useState<Record<string, string>>({});

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep(2);
  }

  function handleAction(offerId: string, action: 'accepted' | 'rejected') {
    const message = action === 'accepted' ? 'Accepted (demo only)' : 'Rejected (demo only)';
    setFeedbackByOfferId((current) => ({...current, [offerId]: message}));
  }

  return (
    <main>
      <div className="section-title">
        <h2>Demand model (レストラン投稿)</h2>
        <span className="badge">Experiment / UI test only</span>
      </div>

      {step === 1 ? (
        <div className="card">
          <h3>STEP 1: Restaurant request form</h3>
          <p className="muted">UI-only. This form does not save any data.</p>
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
              <input
                name="requestedTime"
                type="text"
                placeholder="e.g. 8:00 AM or 17:30"
              />
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

            <button type="submit">Preview mock offers</button>
          </form>
        </div>
      ) : (
        <div className="grid">
          <div className="card">
            <h3>STEP 2: Mock offers</h3>
            <p className="muted">3 dummy offers generated on the client side.</p>
          </div>

          {mockOffers.map((offer) => (
            <div key={offer.id} className="card">
              <h3>{offer.farmerName}</h3>
              <p className="muted">Distance: {offer.distanceKm.toFixed(1)} km</p>
              <p className="muted">Rating: {renderStars(offer.rating)}</p>
              <p className="muted">Price: ${offer.pricePerKgUsd.toFixed(2)}/kg</p>
              <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                <button type="button" onClick={() => handleAction(offer.id, 'accepted')}>
                  Accept
                </button>
                <button type="button" className="secondary" onClick={() => handleAction(offer.id, 'rejected')}>
                  Reject
                </button>
              </div>
              {feedbackByOfferId[offer.id] ? <p className="notice">{feedbackByOfferId[offer.id]}</p> : null}
            </div>
          ))}

          <div>
            <button type="button" className="secondary" onClick={() => setStep(1)}>
              Back to edit request
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
