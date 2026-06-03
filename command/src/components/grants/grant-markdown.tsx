"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/*
  Markdown renderer for grant body sections. Keeps every link external
  by default (target=_blank) since they are funder URLs.
*/

export function GrantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children, ...rest }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            {...rest}
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
