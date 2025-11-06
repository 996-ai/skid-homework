import React from "react";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

type MemoizedMarkdownProps = {
  source: string;
  wrapText?: boolean;
};

const MarkdownRenderer = ({
  source,
  wrapText = true,
}: MemoizedMarkdownProps) => {
  return (
    <div
      className={wrapText ? "whitespace-pre-wrap overflow-x-auto" : undefined}
    >
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { output: "html" }]]}
      >
        {source}
      </Markdown>
    </div>
  );
};

export const MemoizedMarkdown = React.memo(MarkdownRenderer);
