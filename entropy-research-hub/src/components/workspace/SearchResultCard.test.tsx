import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SearchResultCard from "./SearchResultCard";

describe("SearchResultCard", () => {
  const mockResult = {
    id: "result_1",
    entityId: "ENSG00001",
    entityType: "protein" as const,
    label: "AMPK alpha-1",
    source: "STRING",
    metadata: {},
    helpfulness: {
      score: 85,
      explanation: "Fills gap: AMPK pathway not in graph",
      gapsFilled: ["pathway:AMPK signaling"],
    },
  };

  it("should render result label and score", () => {
    render(
      <SearchResultCard
        result={mockResult}
        selected={false}
        onToggle={vi.fn()}
        onViewDetails={vi.fn()}
      />,
    );

    expect(screen.getByText("AMPK alpha-1")).toBeInTheDocument();
    expect(screen.getByText(/85/)).toBeInTheDocument();
    expect(screen.getByText("STRING")).toBeInTheDocument();
  });

  it("should call onToggle when checkbox clicked", async () => {
    const onToggle = vi.fn();

    render(
      <SearchResultCard
        result={mockResult}
        selected={false}
        onToggle={onToggle}
        onViewDetails={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith("result_1");
  });

  it("should call onViewDetails when Details button clicked", async () => {
    const onViewDetails = vi.fn();

    render(
      <SearchResultCard
        result={mockResult}
        selected={false}
        onToggle={vi.fn()}
        onViewDetails={onViewDetails}
      />,
    );

    const detailsButton = screen.getByText("Details");
    fireEvent.click(detailsButton);

    expect(onViewDetails).toHaveBeenCalledWith(mockResult);
  });

  it("should apply selected styles when selected=true", () => {
    const { container } = render(
      <SearchResultCard
        result={mockResult}
        selected={true}
        onToggle={vi.fn()}
        onViewDetails={vi.fn()}
      />,
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-primary");
  });
});
