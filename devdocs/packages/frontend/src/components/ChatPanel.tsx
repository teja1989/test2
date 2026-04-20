import { useState, useRef, useEffect, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, Square, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from '../hooks/useChat';
import { cn } from '../lib/utils';

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sources, isStreaming, sendMessage, stopStreaming, clearChat } = useChat();

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    void sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all hover:bg-brand-700 hover:shadow-xl',
          open && 'hidden',
        )}
        aria-label="Open chat assistant"
      >
        <MessageCircle className="h-6 w-6" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
            {messages.filter((m) => m.role === 'assistant').length}
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            style={{ height: 'min(600px, calc(100vh - 6rem))' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-slate-200 bg-brand-600 px-4 py-3 dark:border-slate-700">
              <MessageCircle className="h-5 w-5 text-white" />
              <span className="flex-1 font-semibold text-white">Docs Assistant</span>
              <button
                onClick={clearChat}
                className="rounded p-1 text-white/70 hover:text-white transition-colors"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-white/70 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-10 text-center text-slate-400">
                  <MessageCircle className="h-10 w-10 opacity-30" />
                  <p className="text-sm">
                    Ask anything about your documentation — order states, API errors, runbooks…
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-1">
                    {[
                      'How do I cancel an order?',
                      'What does PAYMENT_FAILED mean?',
                      'Webhook payload format?',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => void sendMessage(q)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs hover:border-brand-400 hover:text-brand-600 dark:border-slate-700"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col',
                    msg.role === 'user' ? 'items-end' : 'items-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'rounded-br-sm bg-brand-600 text-white'
                        : 'rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || (isStreaming && i === messages.length - 1 ? '▋' : '')}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {/* Sources */}
              {sources.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Sources
                  </p>
                  <ul className="space-y-1">
                    {sources.map((s) => (
                      <li key={`${s.repo}/${s.path}`}>
                        <Link
                          to={`/docs/${s.repo}/${s.path}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline dark:text-brand-400"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          {s.title}
                          <span className="text-slate-400">({s.repo})</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 p-3 dark:border-slate-700">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600"
                    title="Stop"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white disabled:opacity-40 hover:bg-brand-700"
                    title="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
