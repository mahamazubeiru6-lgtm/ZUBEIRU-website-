import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TrackDataOrder from "./TrackDataOrder";

const mockAuthFetch = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("../../hooks/useTheme", () => ({
  useTheme: () => ({
    colors: {
      border: "#d7dce2",
      btnBg: "#331a5c",
      btnText: "#ffffff",
      error: "#dc2626",
      heading: "#111827",
      mainBg: "#f8fafc",
      raisedBg: "#ffffff",
      secondaryText: "#64748b",
      shadow: "rgba(0,0,0,.08)",
      subtleBg: "#f1f5f9",
      text: "#1f2937",
      warning: "#d97706",
    },
  }),
}));

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: () => ({ authFetch: mockAuthFetch }),
}));

const renderTracker = () => render(<TrackDataOrder />);

describe("TrackDataOrder", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockNavigate.mockReset();
  });

  test("tracks a recent order with the public recipient endpoint", async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        message: "The latest order status was retrieved.",
        data: {
          reference: "ABC12345",
          network: "MTN",
          package_size_gb: "2.00",
          recipient_phone: "024****456",
          payment_status: "COMPLETED",
          payment_status_display: "Completed",
          status: "DELIVERED",
          status_display: "Delivered",
          created_at: "2026-11-24T10:00:00Z",
          updated_at: "2026-11-24T10:02:00Z",
        },
        tracking: {
          source: "provider",
          provider_called: true,
          live_refresh_failed: false,
        },
      }),
    });

    renderTracker();
    fireEvent.change(screen.getByLabelText("Recipient phone number"), {
      target: { value: "+233244123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Track order" }));

    await screen.findByRole("heading", { name: "Delivered" });
    expect(screen.getByText("Live update")).toBeInTheDocument();
    expect(screen.getByText("#ABC12345")).toBeInTheDocument();
    expect(mockAuthFetch).toHaveBeenCalledWith("/data/orders/track-recent/", {
      method: "POST",
      auth: false,
      body: { recipient_phone: "0244123456" },
    });
  });

  test("shows a clear message when no recent order exists", async () => {
    mockAuthFetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        status: "error",
        message: "No order was found for this number in the last 5 hours.",
      }),
    });

    renderTracker();
    fireEvent.change(screen.getByLabelText("Recipient phone number"), {
      target: { value: "0244123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Track order" }));

    expect(
      await screen.findByText(
        "No order was found for this number in the last 5 hours."
      )
    ).toBeInTheDocument();
  });

  test("validates the phone number before making a request", async () => {
    renderTracker();
    fireEvent.change(screen.getByLabelText("Recipient phone number"), {
      target: { value: "1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Track order" }));

    expect(
      screen.getByText("Enter a valid 10-digit Ghana phone number.")
    ).toBeInTheDocument();
    await waitFor(() => expect(mockAuthFetch).not.toHaveBeenCalled());
  });
});
