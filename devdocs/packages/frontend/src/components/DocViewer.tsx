import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import MermaidDiagram from './MermaidDiagram';
import { cn } from '../lib/utils';

interface Props {
  content: string;
  className?: string;
}

export default function DocViewer({ content, className }: Props) {
  return (
    <article className={cn('prose prose-slate max-w-none dark:prose-invert', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Intercept fenced code blocks: render mermaid diagrams, pass rest through
          code({ className: cls, children }) {
            const lang = /language-(\w+)/.exec(cls ?? '')?.[1];
            if (lang === 'mermaid') {
              return <MermaidDiagram code={String(children).trim()} />;
            }
            return <code className={cls}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
