import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentForm } from "./payment-form";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const fetchMock = vi.fn();

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

const ITEMS = [
  { sku: "lamp", name: "Maple lamp" },
  { sku: "stool", name: "Cedar stool" },
];

async function fill(values: { email?: string; item?: string; extra?: string; charge?: string }) {
  const user = userEvent.setup();
  if (values.email) await user.type(screen.getByLabelText("Email"), values.email);
  if (values.item) await user.selectOptions(screen.getByLabelText("Item"), values.item);
  if (values.extra) await user.selectOptions(screen.getByLabelText("Extra"), values.extra);
  if (values.charge) await user.type(screen.getByLabelText("Charge id"), values.charge);
  return user;
}

beforeEach(() => {
  fetchMock.mockReset();
  refresh.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  render(<PaymentForm items={ITEMS} />);
});

describe("PaymentForm", () => {
  it("offers only Maple lamp and Cedar stool", () => {
    const options = within(screen.getByLabelText("Item"))
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual(["Choose…", "Maple lamp", "Cedar stool"]);
  });

  it("clears a selected Cushion when Maple lamp is chosen", async () => {
    const user = await fill({ item: "Cedar stool", extra: "Cushion" });
    expect(screen.getByLabelText("Extra")).toHaveValue("cushion");

    await user.selectOptions(screen.getByLabelText("Item"), "Maple lamp");

    expect(screen.getByLabelText("Extra")).toHaveValue("");
  });

  it("shows validatePayment errors without calling the API", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByText("Choose an item")).toBeInTheDocument();
    expect(screen.getByText("Enter a charge id like ch_12345678")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects Cushion on Maple lamp in the form", async () => {
    const user = await fill({ email: "ada@example.com", charge: "ch_12345678" });
    // Pick the extra after the item, so the lamp does not clear it first.
    await user.selectOptions(screen.getByLabelText("Item"), "Maple lamp");
    await user.selectOptions(screen.getByLabelText("Extra"), "Cushion");
    await user.click(screen.getByRole("button", { name: "Record payment" }));

    expect(await screen.findByText("That extra is not sold with this item")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the payment preview from the API", async () => {
    respond(200, {
      ok: true,
      preview: {
        email: "ada@example.com",
        sku: "lamp",
        itemName: "Maple lamp",
        extraCode: null,
        extraName: null,
        totalCents: 8000,
        remainingAfter: 4,
      },
    });
    const user = await fill({ email: "Ada@Example.com", item: "Maple lamp", charge: "ch_12345678" });

    await user.click(screen.getByRole("button", { name: "Preview" }));

    const region = await screen.findByRole("region", { name: "Payment preview" });
    expect(region).toHaveTextContent("ada@example.com");
    expect(region).toHaveTextContent("Maple lamp");
    expect(region).toHaveTextContent("None");
    expect(region).toHaveTextContent("$80");
    expect(region).toHaveTextContent("4");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/preview",
      expect.objectContaining({
        body: JSON.stringify({
          email: "Ada@Example.com",
          sku: "lamp",
          externalChargeId: "ch_12345678",
          extraCode: null,
        }),
      }),
    );
  });

  it("records a payment and refreshes the queue", async () => {
    respond(201, {
      replayed: false,
      payment: {
        email: "ada@example.com",
        sku: "lamp",
        itemName: "Maple lamp",
        extraCode: null,
        externalChargeId: "ch_12345678",
        totalCents: 8000,
      },
    });
    const user = await fill({ email: "ada@example.com", item: "Maple lamp", charge: "ch_12345678" });

    await user.click(screen.getByRole("button", { name: "Record payment" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Payment recorded");
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });

  it("drops a preview that arrives after the form was edited", async () => {
    let finish!: (res: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (finish = resolve)));
    const user = await fill({ email: "ada@example.com", item: "Maple lamp", charge: "ch_12345678" });

    await user.click(screen.getByRole("button", { name: "Preview" }));
    await user.selectOptions(screen.getByLabelText("Item"), "Cedar stool");
    finish(
      new Response(
        JSON.stringify({
          ok: true,
          preview: { email: "ada@example.com", sku: "lamp", itemName: "Maple lamp", extraCode: null, extraName: null, totalCents: 8000, remainingAfter: 4 },
        }),
      ),
    );

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("region", { name: "Payment preview" })).not.toBeInTheDocument();
  });

  it("sends one request when Record payment is clicked twice", async () => {
    let finish!: (res: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (finish = resolve)));
    const user = await fill({ email: "ada@example.com", item: "Maple lamp", charge: "ch_12345678" });

    await user.dblClick(screen.getByRole("button", { name: "Record payment" }));
    finish(new Response(JSON.stringify({ ok: false, errors: { sku: "Sold out" } }), { status: 409 }));

    expect(await screen.findByText("Sold out")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a server error on its field, such as Sold out", async () => {
    respond(409, { ok: false, errors: { sku: "Sold out" } });
    const user = await fill({ email: "ada@example.com", item: "Cedar stool", charge: "ch_12345678" });

    await user.click(screen.getByRole("button", { name: "Record payment" }));

    expect(await screen.findByText("Sold out")).toBeInTheDocument();
    expect(screen.getByLabelText("Item")).toHaveAccessibleDescription("Sold out");
  });
});
