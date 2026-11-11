import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as begin } from "@/app/api/checkout/begin/route";
import { POST as complete } from "@/app/api/checkout/complete/route";
import { getStore, resetStore } from "@/lib/store";
import { CART_CHANGED, CheckoutCart, EMPTY_CART } from "./checkout-cart";

const ITEMS = [
  { sku: "notebook", name: "Field notebook", priceCents: 1500 },
  { sku: "pen", name: "Gel pen", priceCents: 400 },
  { sku: "case", name: "Slip case", priceCents: 2200 },
];

const ROUTES: Record<string, (request: Request) => Promise<Response>> = {
  "/api/checkout/begin": begin,
  "/api/checkout/complete": complete,
};

// fetch goes to the real route handlers, so the snapshot is the server's.
const fetchMock = vi.fn((url: string, init?: RequestInit) =>
  ROUTES[url](new Request(`http://localhost${url}`, init)),
);

function row(name: string) {
  return within(screen.getByText(name).closest("li")!);
}

function amount(label: string) {
  return screen.getByRole("status", { name: label });
}

beforeEach(() => {
  resetStore();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  render(<CheckoutCart items={ITEMS} />);
});

describe("CheckoutCart", () => {
  // Required test 1 (divergence).
  it("charges the snapshot when the cart changes after Pay", async () => {
    const user = userEvent.setup();
    await user.click(row("Field notebook").getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Pay" }));

    const progress = await screen.findByRole("region", { name: "Payment in progress" });
    await user.click(row("Gel pen").getByRole("button", { name: "Add" }));

    expect(within(progress).getByRole("status", { name: "Amount due" })).toHaveTextContent("$15");
    expect(screen.getByText(CART_CHANGED)).toBeInTheDocument();
    expect(amount("Cart total")).toHaveTextContent("$19");

    await user.click(screen.getByRole("button", { name: "Complete payment" }));

    const placed = await screen.findByRole("region", { name: "Order placed" });
    expect(placed).toHaveTextContent("Field notebook × 1");
    expect(placed).not.toHaveTextContent("Gel pen");
    expect(within(placed).getByRole("status", { name: "Amount charged" })).toHaveTextContent("$15");
    const [order] = [...getStore().orders.values()];
    expect(order.amountCents).toBe(1500);
    expect(order.lines.map((line) => line.sku)).toEqual(["notebook"]);
  });

  it("updates Cart total as quantities change", async () => {
    const user = userEvent.setup();
    expect(amount("Cart total")).toHaveTextContent("$0");

    await user.click(row("Slip case").getByRole("button", { name: "Add" }));
    await user.click(row("Slip case").getByRole("button", { name: "Increase" }));
    expect(row("Slip case").getByText("Quantity 2")).toBeInTheDocument();
    expect(amount("Cart total")).toHaveTextContent("$44");

    await user.click(row("Slip case").getByRole("button", { name: "Decrease" }));
    expect(amount("Cart total")).toHaveTextContent("$22");
  });

  it("removes a line with Remove, or with Decrease at quantity 1", async () => {
    const user = userEvent.setup();
    await user.click(row("Gel pen").getByRole("button", { name: "Add" }));
    await user.click(row("Gel pen").getByRole("button", { name: "Remove" }));
    expect(row("Gel pen").getByRole("button", { name: "Add" })).toHaveFocus();

    await user.click(row("Gel pen").getByRole("button", { name: "Add" }));
    await user.click(row("Gel pen").getByRole("button", { name: "Decrease" }));
    expect(row("Gel pen").getByRole("button", { name: "Add" })).toHaveFocus();
    expect(amount("Cart total")).toHaveTextContent("$0");
  });

  it("asks for an item when Pay is pressed with an empty cart", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Pay" }));

    expect(screen.getByText(EMPTY_CART)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getStore().attempts.size).toBe(0);
  });

  it("shows no change message while the cart matches the snapshot", async () => {
    const user = userEvent.setup();
    await user.click(row("Field notebook").getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Pay" }));
    await screen.findByRole("region", { name: "Payment in progress" });

    await user.click(row("Field notebook").getByRole("button", { name: "Increase" }));
    expect(screen.getByText(CART_CHANGED)).toBeInTheDocument();

    await user.click(row("Field notebook").getByRole("button", { name: "Decrease" }));
    expect(screen.queryByText(CART_CHANGED)).not.toBeInTheDocument();
  });

  it("starts a new attempt when Pay is pressed again", async () => {
    const user = userEvent.setup();
    await user.click(row("Field notebook").getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Pay" }));
    await screen.findByRole("region", { name: "Payment in progress" });

    await user.click(row("Gel pen").getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Pay" }));

    await vi.waitFor(() => expect(amount("Amount due")).toHaveTextContent("$19"));
    expect(screen.queryByText(CART_CHANGED)).not.toBeInTheDocument();
    expect(getStore().attempts.size).toBe(2);
  });

  it("sends one request when Complete payment is clicked twice", async () => {
    const user = userEvent.setup();
    await user.click(row("Field notebook").getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Pay" }));
    await screen.findByRole("region", { name: "Payment in progress" });

    await user.dblClick(screen.getByRole("button", { name: "Complete payment" }));

    await screen.findByRole("region", { name: "Order placed" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears the cart and moves focus to the order once it is placed", async () => {
    const user = userEvent.setup();
    await user.click(row("Field notebook").getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Pay" }));
    await user.click(await screen.findByRole("button", { name: "Complete payment" }));

    expect(await screen.findByRole("heading", { name: "Order placed" })).toHaveFocus();
    expect(screen.queryByRole("region", { name: "Payment in progress" })).not.toBeInTheDocument();
    expect(amount("Cart total")).toHaveTextContent("$0");
  });
});
