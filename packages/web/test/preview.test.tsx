import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Preview } from "../src/components/Preview";

describe("Preview", () => {
  it("renders markdown inside an editorial preview surface", () => {
    render(<Preview content={"# Heading\n\nParagraph text.\n\n- One\n- Two"} />);

    expect(screen.getByTestId("preview-surface")).toBeInTheDocument();
    expect(screen.getByTestId("preview-document")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(screen.getByText("Paragraph text.")).toBeInTheDocument();
    expect(screen.getByText("One")).toBeInTheDocument();
  });
});
