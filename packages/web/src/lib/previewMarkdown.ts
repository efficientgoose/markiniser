import MarkdownIt from "markdown-it";
import markdownItMark from "markdown-it-mark";
import markdownItSub from "markdown-it-sub";
import markdownItSup from "markdown-it-sup";
import { parseMarkdownSections } from "./markdownSections";

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})
  .use(markdownItSub)
  .use(markdownItSup)
  .use(markdownItMark);

export function renderPreviewSections(content: string) {
  return parseMarkdownSections(content).map((section) => ({
    index: section.index,
    html: markdownRenderer.render(section.text)
  }));
}
