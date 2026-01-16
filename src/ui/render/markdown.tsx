import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

// Memoized markdown component to prevent re-renders
const MDContent = memo(function MDContent({ text, isStreaming = false }: { text: string; isStreaming?: boolean }) {
  // During streaming, skip expensive plugins for better performance
  const plugins = useMemo(() => {
    if (isStreaming) {
      // Lightweight plugins during streaming
      return { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeRaw] };
    }
    // Full plugins for completed messages
    return { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeRaw, rehypeHighlight] };
  }, [isStreaming]);

  return (
    <ReactMarkdown
      remarkPlugins={plugins.remarkPlugins}
      rehypePlugins={plugins.rehypePlugins}
      components={{
        h1: (props) => <h1 className="mt-4 text-xl font-semibold text-ink-900" {...props} />,
        h2: (props) => <h2 className="mt-4 text-lg font-semibold text-ink-900" {...props} />,
        h3: (props) => <h3 className="mt-3 text-base font-semibold text-ink-800" {...props} />,
        p: (props) => <p className="mt-2 text-base leading-relaxed text-ink-700" {...props} />,
        ul: (props) => <ul className="mt-2 ml-4 grid list-disc gap-1" {...props} />,
        ol: (props) => <ol className="mt-2 ml-4 grid list-decimal gap-1" {...props} />,
        li: (props) => <li className="min-w-0 text-ink-700" {...props} />,
        strong: (props) => <strong className="text-ink-900 font-semibold" {...props} />,
        em: (props) => <em className="text-ink-800" {...props} />,
        pre: (props) => (
          <pre
            className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface-tertiary p-3 text-sm text-ink-700"
            {...props}
          />
        ),
        code: (props) => {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match && !String(children).includes("\n");

          return isInline ? (
            <code className="rounded bg-surface-tertiary px-1.5 py-0.5 text-accent font-mono text-base" {...rest}>
              {children}
            </code>
          ) : (
            <code className={`${className} font-mono`} {...rest}>
              {children}
            </code>
          );
        }
      }}
    >
      {String(text ?? "")}
    </ReactMarkdown>
  );
});

export default MDContent;
