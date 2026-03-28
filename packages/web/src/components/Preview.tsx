import MarkdownIt from "markdown-it";

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

export function Preview({ content }: { content: string }) {
  return (
    <div
      data-testid="preview-surface"
      className="preview-pane hide-scrollbar h-full overflow-auto bg-[color:var(--ctp-base)] p-2"
    >
      <article
        data-testid="preview-document"
        className="preview-document h-full rounded-[14px] bg-[color:var(--ctp-base)]"
      >
        <div
          className="markdown-preview px-3 py-3"
          dangerouslySetInnerHTML={{
            __html: markdownRenderer.render(content)
          }}
        />
      </article>
    </div>
  );
}
