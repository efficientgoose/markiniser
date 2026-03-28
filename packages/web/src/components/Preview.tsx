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
      className="preview-pane hide-scrollbar h-full overflow-auto rounded-[20px] bg-[color:rgba(17,17,27,0.72)] p-3"
    >
      <article
        data-testid="preview-document"
        className="preview-document mx-auto max-w-[720px] rounded-[18px] border border-dashed border-[color:rgba(88,91,112,0.3)] bg-[color:rgba(30,30,46,0.92)]"
      >
        <div className="border-b border-[color:rgba(88,91,112,0.12)] px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-[color:var(--ctp-overlay2)]">
          Live Preview
        </div>
        <div
          className="markdown-preview px-6 py-6"
          dangerouslySetInnerHTML={{
            __html: markdownRenderer.render(content)
          }}
        />
      </article>
    </div>
  );
}
