const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatINR(amount: number): string {
  return inr.format(Math.round(amount));
}

/** "₹2 lakh", "₹1.5 crore": how people in India say large amounts out loud. */
export function formatINRShort(amount: number): string {
  const abs = Math.abs(amount);
  const trim = (n: number) => String(Number(n.toFixed(2)));
  if (abs >= 1e7) return `₹${trim(amount / 1e7)} crore`;
  if (abs >= 1e5) return `₹${trim(amount / 1e5)} lakh`;
  return formatINR(amount);
}

export function plural(n: number, unit: string): string {
  return `${Number(n.toFixed(1))} ${unit}${n === 1 ? "" : "s"}`;
}
