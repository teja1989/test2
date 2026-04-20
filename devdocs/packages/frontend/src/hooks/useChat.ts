import { useState, useCallback, useRef } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  title: string;
  repo: string;
  path: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<ChatSource[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      // Snapshot history before adding new messages
      const history = [...messages];
      const nextMessages: ChatMessage[] = [
        ...history,
        { role: 'user', content },
        { role: 'assistant', content: '' },
      ];
      setMessages(nextMessages);
      setIsStreaming(true);
      setSources([]);

      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, history }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last) last.content = '⚠️ Request failed. Please try again.';
            return updated;
          });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const parts = buf.split('\n\n');
          buf = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.replace(/^data: /, '').trim();
            if (!line) continue;
            try {
              const chunk = JSON.parse(line) as {
                delta?: string;
                done?: boolean;
                sources?: ChatSource[];
              };

              if (chunk.delta) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last) last.content += chunk.delta;
                  return updated;
                });
              }
              if (chunk.done && chunk.sources) {
                setSources(chunk.sources);
              }
            } catch {
              // malformed SSE line — skip
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last) last.content = '⚠️ Connection error. Please try again.';
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSources([]);
  }, []);

  return { messages, sources, isStreaming, sendMessage, stopStreaming, clearChat };
}
