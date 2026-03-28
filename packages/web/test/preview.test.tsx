import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Preview } from "../src/components/Preview";
import { renderPreviewSections } from "../src/lib/previewMarkdown";

describe("Preview", () => {
  it("renders markdown inside an editorial preview surface", () => {
    render(<Preview content={"# Heading\n\nParagraph text.\n\n- One\n- Two"} />);

    expect(screen.getByTestId("preview-surface")).toBeInTheDocument();
    expect(screen.getByTestId("preview-document")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(screen.getByText("Paragraph text.")).toBeInTheDocument();
    expect(screen.getByText("One")).toBeInTheDocument();
  });

  it("renders preview as measurable markdown sections", () => {
    const sections = renderPreviewSections("# Heading\n\nParagraph text.\n\n```ts\nconst x = 1;\n```");

    expect(sections).toHaveLength(3);
    expect(sections[0]?.html).toContain("<h1>Heading</h1>");
    expect(sections[1]?.html).toContain("<p>Paragraph text.</p>");
    expect(sections[2]?.html).toContain("<pre><code");
  });
});
