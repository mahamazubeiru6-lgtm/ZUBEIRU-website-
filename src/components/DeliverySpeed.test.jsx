import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import DeliverySpeed from "./DeliverySpeed";

const mockAuthFetch = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({ authFetch: mockAuthFetch }),
}));

const mtn = {
  network: "mtn",
  label: "MTN",
  speed: "fast",
  average_seconds: 270,
  recent_durations_seconds: [180, 360],
  latest_delivery: {
    placed_at: "2026-11-26T10:00:05Z",
    delivered_at: "2026-11-26T10:06:05Z",
  },
};
const telecel = {
  network: "telecel",
  label: "Telecel",
  speed: "slow",
  average_seconds: 4500,
  recent_durations_seconds: [4500],
  latest_delivery: {
    placed_at: "2026-11-26T08:30:00Z",
    delivered_at: "2026-11-26T09:45:00Z",
  },
};
const airtelTigo = {
  network: "airteltigo",
  label: "AirtelTigo",
  speed: null,
  average_seconds: null,
  recent_durations_seconds: [],
  latest_delivery: null,
};

const responseFor = (data) => ({
  ok: true,
  json: async () => ({ status: "success", as_of: "2026-11-26T10:07:00Z", data }),
});

beforeEach(() => mockAuthFetch.mockReset());

test("shows the average, trend, and both latest delivery timestamps per network", async () => {
  mockAuthFetch.mockResolvedValue(responseFor([mtn, telecel, airtelTigo]));
  render(<DeliverySpeed />);

  expect(await screen.findByText("Fast")).toBeInTheDocument();
  expect(screen.getByText("4m 30s")).toBeInTheDocument();
  const chart = screen.getByRole("list", { name: "Delivery times, oldest to newest" });
  expect(within(chart).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["3m", "6m"]);
  expect(screen.getByText("10:00:05").closest("time")).toHaveAttribute("datetime", mtn.latest_delivery.placed_at);
  expect(screen.getByText("10:06:05").closest("time")).toHaveAttribute("datetime", mtn.latest_delivery.delivered_at);

  fireEvent.click(screen.getByRole("button", { name: "Telecel" }));
  expect(screen.getByRole("button", { name: "Telecel" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("Slow")).toBeInTheDocument();
  expect(screen.getAllByText("1h 15m")).toHaveLength(2);
  expect(screen.getByText("Average for 1 recent delivery")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "AirtelTigo" }));
  expect(screen.getByText("No confirmed deliveries yet")).toBeInTheDocument();
  expect(screen.queryByText("Latest delivered order")).not.toBeInTheDocument();
  expect(mockAuthFetch).toHaveBeenCalledTimes(1);
});

test("checkout stays on the package network even if another network has delivery history", async () => {
  mockAuthFetch.mockResolvedValue(responseFor([mtn, telecel, airtelTigo]));
  const { rerender } = render(<DeliverySpeed network="Telecel" />);

  expect(await screen.findByText("Slow")).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Delivery network" })).not.toBeInTheDocument();
  expect(screen.queryByText("MTN")).not.toBeInTheDocument();

  rerender(<DeliverySpeed network="AirtelTigo" />);
  expect(screen.getByText("No confirmed deliveries yet")).toBeInTheDocument();
  expect(screen.queryByText("Slow")).not.toBeInTheDocument();
});

test("retains the last snapshot on refresh errors and recovers on retry", async () => {
  mockAuthFetch
    .mockResolvedValueOnce(responseFor([mtn]))
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce(responseFor([{ ...mtn, average_seconds: 600, speed: "moderate" }]));
  render(<DeliverySpeed />);

  expect(await screen.findByText("Fast")).toBeInTheDocument();
  const refresh = screen.getByRole("button", { name: "Refresh delivery speeds" });
  fireEvent.click(refresh);
  expect(await screen.findByText("Saved data")).toBeInTheDocument();
  expect(screen.getByText("4m 30s")).toBeInTheDocument();

  fireEvent.click(refresh);
  expect(await screen.findByText("Moderate")).toBeInTheDocument();
  expect(screen.getByText("Live")).toBeInTheDocument();
});

test("refreshes after one minute while the page is visible", async () => {
  jest.useFakeTimers();
  try {
    mockAuthFetch.mockResolvedValue(responseFor([mtn]));
    const { unmount } = render(<DeliverySpeed />);
    await act(async () => {});
    expect(mockAuthFetch).toHaveBeenCalledTimes(1);

    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(mockAuthFetch).toHaveBeenCalledTimes(2);
    unmount();
    jest.advanceTimersByTime(60_000);
    expect(mockAuthFetch).toHaveBeenCalledTimes(2);
  } finally {
    jest.useRealTimers();
  }
});
