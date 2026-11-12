// One export per class, not an object, so client chunks ship only what they use.

const box = "rounded-xl border bg-white";
const panel = `${box} border-slate-200`;
const buttonBase =
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium aria-disabled:cursor-not-allowed aria-disabled:opacity-60";
const alert = "rounded-lg px-3 py-2 text-sm";

export const pageTitle = "text-2xl font-semibold tracking-tight text-blue-950";
export const muted = "text-sm text-slate-600";
export const pageLead = `mt-1 ${muted}`;
export const caption = "text-xs text-slate-600";
export const link = "text-sm font-medium text-blue-700 hover:underline underline-offset-4";

export const card = `${panel} p-5`;
export const cardSuccess = `${box} border-green-200 p-5`;
export const cardTitle = "text-sm font-semibold text-blue-950";
export const list = `${panel} divide-y divide-slate-100`;
export const linkRow = "relative px-4 py-3 hover:bg-slate-50";
export const stretchedLink = "after:absolute after:inset-0";
export const detailList = "divide-y divide-slate-100 border-t border-slate-100 text-sm";
export const price = "font-semibold tabular-nums text-blue-950";

export const label = "text-sm font-medium";
export const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 aria-[invalid=true]:border-red-600";
export const fieldError = "text-xs text-red-700";
export const button = `${buttonBase} border border-slate-300 bg-white hover:bg-slate-50`;
export const buttonPrimary = `${buttonBase} bg-blue-600 text-white hover:bg-blue-700`;
export const buttonIcon =
  "inline-flex size-7 items-center justify-center rounded-md border border-slate-300 bg-white text-sm hover:bg-slate-50";

export const alertSuccess = `${alert} bg-green-50 text-green-800`;
export const alertInfo = `${alert} bg-blue-50 text-blue-800`;
export const alertWarning = `${alert} bg-amber-50 text-amber-900`;
export const alertError = `${alert} bg-red-50 text-red-800`;

export function stockBadge(remaining: number | null): string {
  const base = "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium";
  if (remaining === null) return `${base} bg-slate-100 text-slate-600`;
  if (remaining === 0) return `${base} bg-red-50 text-red-700`;
  return `${base} bg-green-50 text-green-700`;
}
