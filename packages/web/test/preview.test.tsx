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

  it("renders fenced code blocks intact within instructional markdown", () => {
    const sections = renderPreviewSections(`Run: \`npm install -D vite vitest jsdom @testing-library/dom @testing-library/user-event\`

Expected: packages install successfully and \`package.json\` gains the new dev dependencies.

Step 2: Write the failing shell test

\`\`\`ts
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("createApp", () => {
  it("renders the top-level portfolio shell", () => {
    const app = createApp();

    expect(app.tagName).toBe("MAIN");
    expect(app.getAttribute("data-page")).toBe("portfolio-clone");
    expect(app.querySelector('[data-section="hero"]')).not.toBeNull();
  });
});
\`\`\`
`);

    const combinedHtml = sections.map((section) => section.html).join("");

    expect(combinedHtml).toContain("<pre><code");
    expect(combinedHtml).toContain('import { describe, expect, it } from &quot;vitest&quot;;');
    expect(combinedHtml).toContain('describe(&quot;createApp&quot;');
    expect(combinedHtml).not.toContain("<p>describe(");
    expect(combinedHtml).not.toContain("<p>expect(");
  });
});
