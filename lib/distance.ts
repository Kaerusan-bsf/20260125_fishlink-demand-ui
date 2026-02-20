const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(
  from: {lat: number; lng: number},
  to: {lat: number; lng: number}
): number {
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const fromLatRad = toRadians(from.lat);
  const toLatRad = toRadians(to.lat);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLatRad) * Math.cos(toLatRad) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}
