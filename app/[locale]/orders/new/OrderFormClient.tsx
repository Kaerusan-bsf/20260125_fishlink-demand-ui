'use client';

import {FormEvent, useMemo, useRef, useState} from 'react';
import OrderEstimate from './OrderEstimate';
import {formatMoneyKHR} from '../../../../lib/formatMoneyKHR';

type Props = {
  locale: string;
  listingId: string;

  // 表示・初期値
  todayDate: string | null;
  guttingAvailable: boolean;
  deliveryAvailable: boolean;
  priceType: 'FIXED' | 'TIERED';
  fixedPriceKhrPerKg: number;
  alphaRate: number;
  sizePriceTiers: Array<{
    sortOrder: number;
    minHeadPerKg: number;
    maxHeadPerKg: number;
    priceKhrPerKg: number;
  }>;

  defaultValues: {
    quantityKg: string;
    sizeRequestText: string;
    timeBand: string;
    timeDetail: string;
    memo: string;
    guttingRequested: boolean;
    deliveryRequested: boolean;
  };

  // Pricing / fee inputs
  guttingPricePerKg: number;
  betaRate: number;
  deliveryFeeKhr: number;
  distanceKm: number;

  // labels（t() 渡し）
  labels: {
    quantityKg: string;
    sizeRequestText: string;
    requestedDateLabel: string;
    today: string;
    tomorrow: string;
    dayAfterTomorrow: string;
    pickDate: string;
    orPickFromCalendar: string;
    timeBand: string;
    timeDetail: string;
    memo: string;
    guttingRequested: string;
    deliveryRequested: string;
    sizeTierLabel: string;
    submit: string;

    // estimate labels
    estimateTitle: string;
    estimateFish: string;
    estimateGutting: string;
    estimateSupport: string;
    estimateDelivery: string;
    estimateTotal: string;
    estimateNote: string;
    deliveryFeeNote: string;
  };

  // options labels
  timeBandOptions: {
    morning: string;
    afternoon: string;
    night: string;
  };

  // server action
  createOrderAction: (formData: FormData) => void;
};

export default function OrderFormClient(props: Props) {
  const {
    listingId,
    todayDate,
    guttingAvailable,
    deliveryAvailable,
    defaultValues,
    priceType,
    fixedPriceKhrPerKg,
    alphaRate,
    sizePriceTiers,
    guttingPricePerKg,
    betaRate,
    deliveryFeeKhr,
    distanceKm,
    labels,
    timeBandOptions,
    createOrderAction
  } = props;

  const [quantityKg, setQuantityKg] = useState<number>(Number(defaultValues.quantityKg || 0));
  const [guttingRequested, setGuttingRequested] = useState<boolean>(defaultValues.guttingRequested);
  const [deliveryRequested, setDeliveryRequested] = useState<boolean>(defaultValues.deliveryRequested);
  const [selectedTierSortOrder, setSelectedTierSortOrder] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const submitGuardRef = useRef<boolean>(false);
  const requestIdRef = useRef<HTMLInputElement>(null);

  // 数量が空になったときに NaN にならないように
  const quantitySafe = useMemo(() => (Number.isFinite(quantityKg) ? quantityKg : 0), [quantityKg]);
  const selectedTierPriceKhrPerKg = useMemo(() => {
    const selected = sizePriceTiers.find((tier) => String(tier.sortOrder) === selectedTierSortOrder);
    return selected?.priceKhrPerKg ?? fixedPriceKhrPerKg;
  }, [fixedPriceKhrPerKg, selectedTierSortOrder, sizePriceTiers]);
  const displayUnitPricePerKg = useMemo(() => {
    const basePrice = priceType === 'TIERED' ? selectedTierPriceKhrPerKg : fixedPriceKhrPerKg;
    return basePrice * (1 + alphaRate);
  }, [alphaRate, fixedPriceKhrPerKg, priceType, selectedTierPriceKhrPerKg]);

  function generateRequestId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (submitGuardRef.current) {
      event.preventDefault();
      return;
    }

    submitGuardRef.current = true;
    if (requestIdRef.current) {
      requestIdRef.current.value = generateRequestId();
    }
    setIsSubmitting(true);
  }

  return (
    <form action={createOrderAction} onSubmit={onSubmit}>
      <input type="hidden" name="listingId" value={listingId} />
      <input ref={requestIdRef} type="hidden" name="requestId" defaultValue="" />
      {priceType === 'TIERED' ? (
        <div className="card" style={{background: '#f8fafc'}}>
          <strong>{labels.sizeTierLabel}</strong>
          {sizePriceTiers.map((tier) => {
            const label = `${tier.minHeadPerKg}–${tier.maxHeadPerKg} head/kg — ${formatMoneyKHR(tier.priceKhrPerKg).replace(' KHR', '')} riel/kg`;
            return (
              <label key={tier.sortOrder} style={{display: 'block'}}>
                <input
                  type="radio"
                  name="selectedSizeTierSortOrder"
                  value={tier.sortOrder}
                  required
                  checked={selectedTierSortOrder === String(tier.sortOrder)}
                  onChange={(e) => setSelectedTierSortOrder(e.target.value)}
                />{' '}
                {label}
              </label>
            );
          })}
        </div>
      ) : null}

      <label>
        {labels.quantityKg}
        <input
          name="quantityKg"
          type="number"
          step="0.1"
          required
          defaultValue={defaultValues.quantityKg}
          onChange={(e) => setQuantityKg(Number(e.target.value))}
        />
      </label>

      {priceType === 'FIXED' ? (
        <label>
          {labels.sizeRequestText}
          <input name="sizeRequestText" required defaultValue={defaultValues.sizeRequestText} />
        </label>
      ) : (
        <input name="sizeRequestText" type="hidden" value="" />
      )}

      <label>
        {labels.requestedDateLabel}
        <select name="dayOffset" required defaultValue="0">
          <option value="0">{labels.today}</option>
          <option value="1">{labels.tomorrow}</option>
          <option value="2">{labels.dayAfterTomorrow}</option>
        </select>
      </label>

      <details>
        <summary>{labels.pickDate}</summary>
        <label>
          {labels.orPickFromCalendar}
          <input type="date" name="selectedDate" min={todayDate ?? ''} />
        </label>
      </details>

      <label>
        {labels.timeBand}
        <select name="timeBand" required defaultValue={defaultValues.timeBand}>
          <option value="" disabled>
            --
          </option>
          <option value="MORNING">{timeBandOptions.morning}</option>
          <option value="AFTERNOON">{timeBandOptions.afternoon}</option>
          <option value="NIGHT">{timeBandOptions.night}</option>
        </select>
      </label>

      <label>
        {labels.timeDetail}
        <input name="timeDetail" defaultValue={defaultValues.timeDetail} />
      </label>

      <label>
        {labels.memo}
        <textarea name="memo" defaultValue={defaultValues.memo} />
      </label>

      {guttingAvailable ? (
        <label>
          {labels.guttingRequested}
          <input
            name="guttingRequested"
            type="checkbox"
            defaultChecked={defaultValues.guttingRequested}
            onChange={(e) => setGuttingRequested(e.target.checked)}
          />
        </label>
      ) : null}

      {deliveryAvailable ? (
        <label>
          {labels.deliveryRequested}
          <input
            name="deliveryRequested"
            type="checkbox"
            defaultChecked={defaultValues.deliveryRequested}
            onChange={(e) => setDeliveryRequested(e.target.checked)}
          />
        </label>
      ) : null}

      <p className="muted" style={{marginTop: 8}}>
        {labels.deliveryFeeNote}
      </p>
      {/* ここがリアルタイム概算（内訳＋合計レンジ） */}
      <OrderEstimate
        quantityKg={quantitySafe}
        displayUnitPricePerKg={displayUnitPricePerKg}
        guttingRequested={guttingRequested && guttingAvailable}
        guttingPricePerKg={guttingPricePerKg}
        betaRate={betaRate}
        deliveryRequested={deliveryRequested && deliveryAvailable}
        deliveryFeeKhr={deliveryFeeKhr}
        distanceKm={distanceKm}
        labels={{
          title: labels.estimateTitle,
          fish: labels.estimateFish,
          gutting: labels.estimateGutting,
          support: labels.estimateSupport,
          delivery: labels.estimateDelivery,
          total: labels.estimateTotal,
          note: labels.estimateNote
        }}
      />

      <button type="submit" disabled={isSubmitting}>{labels.submit}</button>
    </form>
  );
}
