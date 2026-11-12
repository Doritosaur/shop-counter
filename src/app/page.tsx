import Link from "next/link";
import { SECTIONS } from "@/app/sections";
import * as ui from "@/app/ui";

export default function Home() {
  return (
    <>
      <h1 className={ui.pageTitle}>Shop counter</h1>
      <p className={ui.pageLead}>A small shop with a catalogue, a staff desk and a checkout.</p>
      <ul className={`${ui.list} mt-6`}>
        {SECTIONS.map((section) => (
          <li key={section.href} className={ui.linkRow}>
            <Link href={section.href} className={`font-medium text-blue-700 ${ui.stretchedLink}`}>
              {section.label}
            </Link>
            <p className={ui.muted}>{section.text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
