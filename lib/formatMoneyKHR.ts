export function formatMoneyKHR(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safe);
  return `${rounded.toLocaleString('en-US')} KHR`;
}
