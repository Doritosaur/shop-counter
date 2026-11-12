import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { NavLinks } from "./nav-links";
import * as ui from "@/app/ui";
import "./globals.css";

const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: { template: "%s | Shop counter", default: "Shop counter" },
  description: "A small shop with a catalogue, a staff desk and a checkout.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-blue-700"
        >
          Skip to content
        </a>
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4">
          <nav aria-label="Main" className="flex flex-wrap items-center justify-between gap-3 py-5">
            <Link href="/" className="font-semibold text-blue-950">
              Shop counter
            </Link>
            <NavLinks />
          </nav>
          <main id="main" className="flex-1 pb-10 pt-2">
            {children}
          </main>
          <footer className={`py-5 ${ui.caption}`}>
            Data lives in server memory and resets when the server restarts.
          </footer>
        </div>
      </body>
    </html>
  );
}
