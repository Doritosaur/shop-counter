import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s | Shop counter", default: "Shop counter" },
  description: "A small shop with a catalogue, a staff desk and a checkout.",
};

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/desk", label: "Desk" },
  { href: "/checkout", label: "Checkout" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black focus:ring-2"
        >
          Skip to content
        </a>
        <header className="border-b border-zinc-300 dark:border-zinc-700">
          <nav aria-label="Main" className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold">
              Shop counter
            </Link>
            <ul className="flex gap-4">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="underline-offset-4 hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-3xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
