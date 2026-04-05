import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SettingsOrganization from "./SettingsOrganization";

const mockResetToDemoState = vi.fn();

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspaceActions: () => ({
    resetToDemoState: mockResetToDemoState,
  }),
}));

describe("SettingsOrganization", () => {
  it("renders Reset to Demo State control and calls action on click", () => {
    render(<SettingsOrganization />);

    const resetButton = screen.getByRole("button", { name: /reset to demo state/i });
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);

    expect(mockResetToDemoState).toHaveBeenCalledTimes(1);
  });
});
