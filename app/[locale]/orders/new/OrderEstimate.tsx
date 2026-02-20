'use client';

import {useMemo} from 'react';
import {formatMoneyKHR} from '../../../../lib/formatMoneyKHR';

type Props = {
  quantityKg: number;
  displayUnitPricePerKg: number; // α込み単価
  guttingRequested: boolean;
  guttingPricePerKg: number;
  betaRate: number;
  deliveryRequested: boolean;
  deliveryFeeKhr: number;
  distanceKm: number;
  labels: {
    title: string;
    fish: string;
    gutting: string;
    support: string;
    delivery: string;
    total: string;
    note: string;
  };
};

function money(n: number) {
  return formatMoneyKHR(Number.isFinite(n) ? n : 0);
}

export default function OrderEstimate(props: Props) {
  const {
    quantityKg,
    displayUnitPricePerKg,
    guttingRequested,
    guttingPricePerKg,
    betaRate,
    deliveryRequested,
    deliveryFeeKhr,
    distanceKm,
    labels
  } = props;

  const calc = useMemo(() => {
    const qty = Number.isFinite(quantityKg) ? quantityKg : 0;

    const fishSubtotal = qty * displayUnitPricePerKg;
    const guttingFee = guttingRequested ? qty * guttingPricePerKg : 0;

    // βは魚代小計に対して
    const supportFee = fishSubtotal * betaRate;

    const deliveryFee = deliveryRequested ? deliveryFeeKhr : 0;
    const total = fishSubtotal + guttingFee + supportFee + deliveryFee;

    return {fishSubtotal, guttingFee, supportFee, deliveryFee, total};
  }, [
    quantityKg,
    displayUnitPricePerKg,
    guttingRequested,
    guttingPricePerKg,
    betaRate,
    deliveryRequested,
    deliveryFeeKhr
  ]);

  return (
    <div className="notice">
      <strong>{labels.title}</strong>
      <div className="muted">Distance: {distanceKm.toFixed(2)} km</div>

      <div className="muted">
        {labels.fish}: {money(calc.fishSubtotal)}
      </div>

      {guttingRequested ? (
        <div className="muted">
          {labels.gutting}: {money(calc.guttingFee)}
        </div>
      ) : null}

      <div className="muted">
        {labels.support}: {money(calc.supportFee)}
      </div>

      <div className="muted">
        {labels.delivery}: {deliveryRequested ? money(calc.deliveryFee) : money(0)}
      </div>

      <div style={{marginTop: 8}}>
        <strong>
          {labels.total}: {money(calc.total)}
        </strong>
      </div>

      <div className="muted" style={{marginTop: 6}}>
        {labels.note}
      </div>
    </div>
  );
}
