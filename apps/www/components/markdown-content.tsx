"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "absolute top-3 right-3 z-20 p-2 rounded-md cursor-pointer",
        "transition-all duration-200 pointer-events-auto",
        "bg-zinc-700/80 hover:bg-zinc-600",
        copied
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100"
      )}
      aria-label={copied ? "Copied!" : "Copy code"}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-400" />
      ) : (
        <Copy className="h-4 w-4 text-zinc-300" />
      )}
    </button>
  );
}

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-semibold tracking-tight mt-10 mb-4 text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold tracking-tight mt-10 mb-4 text-foreground border-b border-border pb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold tracking-tight mt-8 mb-3 text-foreground">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold tracking-tight mt-6 mb-2 text-foreground">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-[15px] text-muted-foreground leading-7 mb-4">
              {children}
            </p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-500 hover:text-blue-600 underline underline-offset-2 decoration-blue-500/30 hover:decoration-blue-500/50 transition-colors"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          code: ({ className, children, node }) => {
            const match = /language-(\w+)/.exec(className || "");
            const content = String(children);
            // Inline code: no language class and single line
            const isInline = !match && !content.includes("\n");

            if (isInline) {
              return (
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground inline">
                  {children}
                </code>
              );
            }

            // If there's no language specified, render as plain code block
            if (!match) {
              return (
                <code className="block text-sm font-mono text-foreground whitespace-pre">
                  {children}
                </code>
              );
            }

            const language = match[1];
            const code = String(children).replace(/\n$/, "");

            return (
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  padding: "1rem",
                }}
              >
                {code}
              </SyntaxHighlighter>
            );
          },
          pre: ({ children, node }) => {
            // Extract code content for copy button
            const codeChild = node?.children?.find(
              (child: any) =>
                child.type === "element" && child.tagName === "code"
            ) as any;
            const codeContent =
              codeChild?.children?.[0]?.value?.replace(/\n$/, "") || "";

            // Check if this is a code block with a language (has syntax highlighting)
            const hasLanguage = node?.children?.some(
              (child: any) =>
                child.type === "element" &&
                child.tagName === "code" &&
                child.properties?.className?.some((c: string) =>
                  c.startsWith("language-")
                )
            );

            if (hasLanguage) {
              return (
                <div className="my-5 rounded-lg overflow-hidden relative group">
                  {children}
                  <CopyButton code={codeContent} />
                </div>
              );
            }

            // Plain code block without language
            return (
              <div className="my-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden relative group">
                <pre className="p-4 overflow-x-auto">{children}</pre>
                <CopyButton code={codeContent} />
              </div>
            );
          },
          ul: ({ children }) => (
            <ul className="my-4 ml-6 space-y-2 text-[15px] text-muted-foreground [&>li]:relative [&>li]:pl-4 [&>li]:before:content-['–'] [&>li]:before:absolute [&>li]:before:left-[-0.5rem] [&>li]:before:text-muted-foreground/60">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-6 space-y-2 text-[15px] text-muted-foreground list-decimal [&>li]:pl-1">
              {children}
            </ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-4 text-muted-foreground my-5 text-[15px]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-border" />,
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-medium text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-muted-foreground border-b border-border/50">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
