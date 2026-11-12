// Not "use client": server components need the array, not a client reference.
export const SECTIONS = [
  { href: "/shop", label: "Shop", text: "Browse the catalogue, with prices and stock." },
  { href: "/desk", label: "Desk", text: "Preview and record a payment taken at the counter." },
  { href: "/checkout", label: "Checkout", text: "Buy notebooks, pens and cases." },
] as const;
