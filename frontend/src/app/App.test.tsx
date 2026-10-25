import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const car = (over = {}) => ({ id: "1", make: "Toyota", model: "Corolla", category: "SEDAN", priceInPaise: 185000000, quantity: 4, ...over });
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const conflict = () => json({ error: { code: "INSUFFICIENT_STOCK", message: "Not enough stock available." } }, 409);

function mockApi(role: "STAFF" | "ADMIN", vehicles = [car()], purchase: () => Promise<Response> = () => json({ data: {} })) {
  const fetchMock = vi.fn((url: string) => {
    if (url.startsWith("/api/auth/login")) return json({ user: { id: "u", email: "a@b.co", role }, accessToken: "t" });
    if (url.includes("/purchase")) return purchase();
    return json({ data: vehicles, pagination: { page: 1, pageSize: 15, total: vehicles.length, totalPages: 1 } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const searchCalls = (m: ReturnType<typeof mockApi>) => m.mock.calls.map(([u]) => u).filter((u) => u.includes("/vehicles/search"));

async function signIn() {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText("Email"), "a@b.co");
  await user.type(screen.getByLabelText("Password"), "password123");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  return user;
}

beforeEach(() => { sessionStorage.clear(); location.hash = ""; });
afterEach(() => vi.unstubAllGlobals());

describe("authentication", () => {
  it("signs in and shows the vehicle list with price and stock", async () => {
    mockApi("STAFF");
    await signIn();
    expect(await screen.findByRole("rowheader", { name: /Toyota Corolla/ })).toBeInTheDocument();
    expect(screen.getByText(/18,50,000/)).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  it("shows a generic error for failed login", async () => {
    vi.stubGlobal("fetch", () => json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } }, 401));
    await signIn();
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
  });
});

describe("search and filter", () => {
  it("sends the price filter to the API in paise and keeps it in the URL", async () => {
    const fetchMock = mockApi("STAFF");
    const user = await signIn();
    await screen.findByRole("rowheader", { name: /Toyota/ });
    await user.type(screen.getByLabelText("Min price (₹)"), "100");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(searchCalls(fetchMock).at(-1)).toContain("minPriceInPaise=10000"));
    expect(location.hash).toContain("min=100");
  });
});

describe("purchase", () => {
  it("disables purchase when quantity is zero", async () => {
    mockApi("STAFF", [car({ quantity: 0 })]);
    await signIn();
    expect(await screen.findByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sold out/ })).toBeDisabled();
  });

  it("confirms a purchase and refreshes the list", async () => {
    const fetchMock = mockApi("STAFF");
    const user = await signIn();
    await user.click(await screen.findByRole("button", { name: /Purchase/ }));
    expect(await screen.findByText(/Purchased 1 × Toyota Corolla\./)).toBeInTheDocument();
    await waitFor(() => expect(searchCalls(fetchMock)).toHaveLength(2));
  });

  it("shows the conflict and no false success when stock is insufficient", async () => {
    mockApi("STAFF", [car()], conflict);
    const user = await signIn();
    await user.click(await screen.findByRole("button", { name: /Purchase/ }));
    expect(await screen.findByText(/Not enough stock available\./)).toBeInTheDocument();
    expect(screen.queryByText(/Purchased/)).not.toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument(); // optimistic change rolled back
  });
});

describe("admin controls", () => {
  it("hides admin pages from staff", async () => {
    mockApi("STAFF");
    await signIn();
    await screen.findByRole("rowheader", { name: /Toyota/ });
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual(["Inventory"]);
  });

  it("lets an admin edit, restock or delete a vehicle from its sheet", async () => {
    mockApi("ADMIN");
    const user = await signIn();
    await user.click(await screen.findByRole("link", { name: "Manage Vehicles" }));
    await user.click(await screen.findByRole("button", { name: /Manage Toyota Corolla/ }));
    const sheet = await screen.findByRole("dialog", { name: "Toyota Corolla" });
    await user.click(within(sheet).getByRole("tab", { name: "details" }));
    expect(within(sheet).getByRole("form", { name: "Edit vehicle" })).toBeInTheDocument();
    await user.click(within(sheet).getByRole("tab", { name: "restock" }));
    expect(within(sheet).getByRole("form", { name: "Restock vehicle" })).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: /Delete vehicle/ }));
    expect(screen.getByRole("alertdialog", { name: "Delete Toyota Corolla?" })).toBeInTheDocument();
  });
});

describe("navigation", () => {
  it("shows the lot map with each vehicle's stock and opens its sheet", async () => {
    mockApi("STAFF");
    const user = await signIn();
    await screen.findByRole("rowheader", { name: /Toyota/ });
    await user.click(screen.getByRole("button", { name: "Lot map" }));
    await user.click(await screen.findByRole("button", { name: "Toyota Corolla, 4 available, In stock" }));
    expect(await screen.findByRole("dialog", { name: "Toyota Corolla" })).toBeInTheDocument();
    expect(location.hash).toContain("v=1");
  });

  it("jumps to a vehicle from the command palette", async () => {
    mockApi("STAFF");
    const user = await signIn();
    await screen.findByRole("rowheader", { name: /Toyota/ });
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByRole("combobox", { name: /Search pages/ }), "corolla");
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Toyota Corolla" })).toBeInTheDocument();
  });
});
