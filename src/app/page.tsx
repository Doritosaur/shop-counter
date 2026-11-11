import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Shop counter</h1>
      <ul className="mt-6 list-disc space-y-2 pl-6">
        <li>
          <Link href="/shop" className="underline">
            Shop
          </Link>: browse the catalogue
        </li>
        <li>
          <Link href="/desk" className="underline">
            Desk
          </Link>: record a payment
        </li>
        <li>
          <Link href="/checkout" className="underline">
            Checkout
          </Link>: buy notebooks, pens and cases
        </li>
      </ul>
    </>
  );
}
