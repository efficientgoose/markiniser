import MarkdownIt from "markdown-it";

export interface MarkdownSection {
  index: number;
  startLine: number;
  endLine: number;
  text: string;
}

const sectionParser = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

const startSectionBlockTypeMap = new Set([
  "paragraph_open",
  "blockquote_open",
  "heading_open",
  "code",
  "fence",
  "table_open",
  "html_block",
  "bullet_list_open",
  "ordered_list_open",
  "list_item_open",
  "hr",
  "dl_open"
]);

export function parseMarkdownSections(text: string): MarkdownSection[] {
  const tokens = sectionParser.parse(text, {});
  const lines = text.split("\n");

  if (lines.length > 0 && lines.at(-1) === "") {
    lines.pop();
  }

  const boundaries: number[] = [0];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      token.level === 0 &&
      token.map &&
      startSectionBlockTypeMap.has(token.type) &&
      index > 0
    ) {
      const nextBoundary = token.map[0];
      if (boundaries.at(-1) !== nextBoundary) {
        boundaries.push(nextBoundary);
      }
    }

    if (
      token.type === "list_item_open" &&
      token.map &&
      index > 0
    ) {
      const nextBoundary = token.map[0];
      if (boundaries.at(-1) !== nextBoundary) {
        boundaries.push(nextBoundary);
      }
    }
  }

  if (boundaries.at(-1) !== lines.length) {
    boundaries.push(lines.length);
  }

  const sections: MarkdownSection[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startLine = boundaries[index];
    const endLine = boundaries[index + 1];
    const textContent = lines.slice(startLine, endLine).join("\n");
    sections.push({
      index,
      startLine: startLine + 1,
      endLine: Math.max(startLine + 1, endLine),
      text: `${textContent}\n`
    });
  }

  if (sections.length === 0) {
    return [
      {
        index: 0,
        startLine: 1,
        endLine: 1,
        text
      }
    ];
  }

  return sections;
}
