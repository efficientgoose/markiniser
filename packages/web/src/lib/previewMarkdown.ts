import MarkdownIt from "markdown-it";
import { parseMarkdownSections } from "./markdownSections";

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

export function renderPreviewSections(content: string) {
  return parseMarkdownSections(content).map((section) => ({
    index: section.index,
    html: markdownRenderer.render(section.text)
  }));
}
