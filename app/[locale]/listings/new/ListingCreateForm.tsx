'use client';

import {FormEvent, useRef, useState} from 'react';
import PhotoUploadField from '../PhotoUploadField';

type DeliveryTierInput = {
  minKm: number;
  maxKm: number;
  fee: number;
};

type SizePriceTierInput = {
  minHeadPerKg: number;
  maxHeadPerKg: number;
  priceKhrPerKg: number;
};

type Props = {
  createListingAction: (formData: FormData) => void;
  cloudinaryConfigured: boolean;
  defaultTiers: DeliveryTierInput[];
  defaultSizePriceTiers: SizePriceTierInput[];
  labels: {
    fishType: string;
    guttingAvailable: string;
    guttingPricePerKg: string;
    guttingPriceHint: string;
    priceTypeLabel: string;
    priceTypeFixed: string;
    priceTypeTiered: string;
    fixedPriceKhrPerKg: string;
    sizePriceTiers: string;
    minHeadPerKg: string;
    maxHeadPerKg: string;
    priceKhrPerKg: string;
    deliveryAvailable: string;
    deliveryFeeTiers: string;
    tierMinKm: string;
    tierMaxKm: string;
    tierFee: string;
    freeDeliveryMinKg: string;
    minOrderKg: string;
    create: string;
    submitting: string;
    photoOptional: string;
    uploadPhoto: string;
    uploading: string;
    removePhoto: string;
    photoNotConfigured: string;
  };
};

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ListingCreateForm({
  createListingAction,
  cloudinaryConfigured,
  defaultTiers,
  defaultSizePriceTiers,
  labels
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceType, setPriceType] = useState<'FIXED' | 'TIERED'>('FIXED');
  const submitGuardRef = useRef(false);
  const requestIdInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (submitGuardRef.current) {
      event.preventDefault();
      return;
    }

    submitGuardRef.current = true;
    if (requestIdInputRef.current) {
      requestIdInputRef.current.value = generateRequestId();
    }
    setIsSubmitting(true);
  }

  return (
    <form action={createListingAction} onSubmit={handleSubmit}>
      <input ref={requestIdInputRef} type="hidden" name="requestId" defaultValue="" />

      <label>
        {labels.fishType}
        <input name="fishType" required />
      </label>
      <label>
        {labels.priceTypeLabel}
        <select name="priceType" value={priceType} onChange={(e) => setPriceType(e.target.value as 'FIXED' | 'TIERED')}>
          <option value="FIXED">{labels.priceTypeFixed}</option>
          <option value="TIERED">{labels.priceTypeTiered}</option>
        </select>
      </label>
      {priceType === 'FIXED' ? (
        <label>
          {labels.fixedPriceKhrPerKg}
          <input name="fixedPriceKhrPerKg" type="number" step="1" min="1" required />
        </label>
      ) : (
        <div className="card" style={{background: '#f8fafc'}}>
          <strong>{labels.sizePriceTiers}</strong>
          {defaultSizePriceTiers.map((tier, index) => (
            <div className="grid grid-2" key={index}>
              <label>
                {`${labels.minHeadPerKg}-${labels.maxHeadPerKg}`}
                <input
                  name={`sizeRange${index}`}
                  type="text"
                  placeholder="4-5"
                  defaultValue={`${tier.minHeadPerKg}-${tier.maxHeadPerKg}`}
                />
              </label>
              <label>
                {labels.priceKhrPerKg}
                <input name={`sizePrice${index}`} type="number" min="1" step="1" defaultValue={tier.priceKhrPerKg} />
              </label>
            </div>
          ))}
        </div>
      )}
      <label>
        {labels.guttingAvailable}
        <input name="guttingAvailable" type="checkbox" defaultChecked />
      </label>
      <label>
        {labels.guttingPricePerKg}
        <input name="guttingPricePerKg" type="number" step="1" min="0" defaultValue={500} required />
        <small>{labels.guttingPriceHint}</small>
      </label>
      <label>
        {labels.deliveryAvailable}
        <input name="deliveryAvailable" type="checkbox" defaultChecked />
      </label>
      <PhotoUploadField
        configured={cloudinaryConfigured}
        labels={{
          photoOptional: labels.photoOptional,
          uploadPhoto: labels.uploadPhoto,
          uploading: labels.uploading,
          removePhoto: labels.removePhoto,
          photoNotConfigured: labels.photoNotConfigured
        }}
      />
      <div className="card" style={{background: '#f8fafc'}}>
        <strong>{labels.deliveryFeeTiers}</strong>
        {defaultTiers.map((tier, index) => (
          <div className="grid grid-2" key={index}>
            <label>
              {labels.tierMinKm}
              <input name={`tierMin${index}`} type="number" defaultValue={tier.minKm} />
            </label>
            <label>
              {labels.tierMaxKm}
              <input name={`tierMax${index}`} type="number" defaultValue={tier.maxKm} />
            </label>
            <label>
              {labels.tierFee}
              <input name={`tierFee${index}`} type="number" step="1" min="0" defaultValue={tier.fee} />
            </label>
          </div>
        ))}
      </div>
      <label>
        {labels.freeDeliveryMinKg}
        <input name="freeDeliveryMinKg" type="number" step="1" min="0" />
      </label>
      <label>
        {labels.minOrderKg}
        <input name="minOrderKg" type="number" step="1" min="0" />
      </label>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? labels.submitting : labels.create}
      </button>
    </form>
  );
}
