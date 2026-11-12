"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@/app/sections";

export function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="flex gap-1 rounded-lg bg-slate-200/60 p-1">
      {SECTIONS.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className="block rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:text-blue-700 aria-[current=page]:bg-white aria-[current=page]:text-blue-700 aria-[current=page]:shadow-xs"
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
