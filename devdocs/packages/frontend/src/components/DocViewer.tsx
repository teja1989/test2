import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '../lib/utils';

interface DocViewerProps {
  content: string;
  className?: string;
}

export default function DocViewer({ content, className }: DocViewerProps) {
  return (
    <article className={cn('prose prose-slate max-w-none dark:prose-invert', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
