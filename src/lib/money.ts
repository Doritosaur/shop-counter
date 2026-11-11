const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format an integer amount of cents as whole US dollars, e.g. 8000 -> "$80". */
export function formatUsd(cents: number): string {
  return usd.format(cents / 100);
}
