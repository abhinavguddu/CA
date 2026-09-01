import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { Copy, Check, BookOpen, Lightbulb, ChevronRight } from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 px-2 py-1 text-[10px] font-medium text-white/70 hover:text-white transition-all"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

const components = {
  h1: ({ children, ...props }: any) => (
    <h1
      className="text-xl font-bold mt-6 mb-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent font-display"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2
      className="text-lg font-bold mt-5 mb-2.5 flex items-center gap-2 font-display"
      {...props}
    >
      <span className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-gold flex-shrink-0" />
      <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
        {children}
      </span>
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3
      className="text-base font-semibold mt-4 mb-2 text-primary/90 uppercase tracking-wide flex items-center gap-1.5"
      {...props}
    >
      <ChevronRight className="size-3.5 text-primary/60" />
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: any) => (
    <h4
      className="text-sm font-semibold mt-3 mb-1.5 text-foreground/80"
      {...props}
    >
      {children}
    </h4>
  ),
  p: ({ children, ...props }: any) => (
    <p
      className="text-sm leading-relaxed text-foreground/85 my-1.5"
      {...props}
    >
      {children}
    </p>
  ),
  strong: ({ children, ...props }: any) => (
    <strong
      className="font-bold text-foreground bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-1 py-0.5 rounded"
      {...props}
    >
      {children}
    </strong>
  ),
  em: ({ children, ...props }: any) => (
    <em className="italic text-primary/80 font-medium" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote
      className="my-3 rounded-xl border-l-4 border-amber-400 bg-gradient-to-r from-amber-500/8 via-orange-500/5 to-transparent p-4 pl-4"
      {...props}
    >
      <div className="flex items-start gap-2.5">
        <Lightbulb className="size-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-foreground/80 leading-relaxed [&>p]:my-0.5">
          {children}
        </div>
      </div>
    </blockquote>
  ),
  ul: ({ children, ...props }: any) => (
    <ul
      className="my-2 space-y-1.5 pl-1"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol
      className="my-2 space-y-1.5 pl-1 list-none counter-reset-[item]"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ordered, index, ...props }: any) => {
    if (ordered) {
      return (
        <li
          className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed"
          {...props}
        >
          <span className="flex-shrink-0 size-5 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/15 flex items-center justify-center text-[10px] font-bold text-primary mt-0.5">
            {index != null ? index + 1 : "•"}
          </span>
          <span className="pt-0.5">{children}</span>
        </li>
      );
    }
    return (
      <li
        className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed"
        {...props}
      >
        <span className="flex-shrink-0 size-1.5 rounded-full bg-gradient-to-br from-primary to-gold mt-2" />
        <span className="pt-0.5">{children}</span>
      </li>
    );
  },
  table: ({ children, ...props }: any) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead
      className="bg-gradient-to-r from-primary/10 via-primary/5 to-gold/5 border-b border-border/40"
      {...props}
    >
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: any) => (
    <tbody className="divide-y divide-border/20" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, isHeader, ...props }: any) => (
    <tr
      className={`transition-colors ${
        isHeader ? "" : "hover:bg-primary/3 even:bg-muted/20"
      }`}
      {...props}
    >
      {children}
    </tr>
  ),
  th: ({ children, ...props }: any) => (
    <th
      className="px-4 py-2.5 text-left font-semibold text-primary text-xs uppercase tracking-wide border-b border-border/30"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td
      className="px-4 py-2.5 border-b border-border/15 text-foreground/80"
      {...props}
    >
      {children}
    </td>
  ),
  code: ({ inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const codeString = String(children).replace(/\n$/, "");

    if (inline) {
      return (
        <code
          className="relative rounded-md bg-gradient-to-r from-primary/10 to-gold/10 border border-primary/15 px-1.5 py-0.5 text-[13px] font-mono font-semibold text-primary/90"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <div className="my-3 group relative">
        <div className="flex items-center justify-between rounded-t-xl bg-[#1e1e2e] border border-b-0 border-white/5 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-[#ff5f57]" />
              <div className="size-2.5 rounded-full bg-[#febc2e]" />
              <div className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            {match && (
              <span className="ml-2 text-[10px] font-medium text-white/30 uppercase tracking-wider">
                {match[1]}
              </span>
            )}
          </div>
          <CopyButton text={codeString} />
        </div>
        <pre className="overflow-x-auto rounded-b-xl bg-[#1e1e2e] border border-white/5 p-4 text-[13px] leading-relaxed">
          <code className="text-[#cdd6f4] font-mono">{children}</code>
        </pre>
      </div>
    );
  },
  hr: ({ ...props }: any) => (
    <hr
      className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent"
      {...props}
    />
  ),
  a: ({ href, children, ...props }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary/80 hover:text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60 transition-colors font-medium"
      {...props}
    >
      {children}
    </a>
  ),
  del: ({ children, ...props }: any) => (
    <del className="line-through text-muted-foreground/50" {...props}>
      {children}
    </del>
  ),
};

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
