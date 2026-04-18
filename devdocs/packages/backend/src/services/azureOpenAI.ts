import OpenAI from 'openai';
import { config } from '../lib/config.js';
import { searchDocuments, type SearchHit } from './elasticsearch.js';

function buildClient(): OpenAI | null {
  if (!config.AZURE_OPENAI_ENDPOINT || !config.AZURE_OPENAI_API_KEY) return null;
  return new OpenAI({
    apiKey: config.AZURE_OPENAI_API_KEY,
    // Azure OpenAI routes by deployment name in the URL
    baseURL: `${config.AZURE_OPENAI_ENDPOINT}/openai/deployments/${config.AZURE_OPENAI_DEPLOYMENT}`,
    defaultQuery: { 'api-version': config.AZURE_OPENAI_API_VERSION },
    defaultHeaders: { 'api-key': config.AZURE_OPENAI_API_KEY },
  });
}

const openai = buildClient();

function buildSystemPrompt(docs: SearchHit[]): string {
  if (docs.length === 0) {
    return `You are a helpful documentation assistant for an order management system.
No relevant documentation was found for this query. Let the user know clearly,
and suggest they refine their search or browse the docs portal.`;
  }

  const context = docs
    .map(
      (d, i) =>
        `[${i + 1}] **${d.title}** (${d.repo}/${d.path})\n${d.content.slice(0, 1500)}`,
    )
    .join('\n\n---\n\n');

  return `You are a helpful documentation assistant for an order management system.
Answer the user's question using ONLY the documentation context below.
Always cite sources by their reference number [1], [2], etc.
If the answer is not covered by the context, say so explicitly — do not speculate.

DOCUMENTATION CONTEXT:
${context}`;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  title: string;
  repo: string;
  path: string;
}

export type ChatChunk =
  | { delta: string; done?: false }
  | { done: true; sources: ChatSource[] };

export async function* streamChat(
  message: string,
  history: ChatMessage[],
): AsyncGenerator<ChatChunk> {
  if (!openai) {
    yield { delta: '⚠️ Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.' };
    yield { done: true, sources: [] };
    return;
  }

  const docs = await searchDocuments(message, undefined, config.CHAT_MAX_CONTEXT_DOCS);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(docs) },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  const stream = await openai.chat.completions.create({
    model: config.AZURE_OPENAI_DEPLOYMENT,
    messages,
    max_tokens: config.CHAT_MAX_TOKENS,
    temperature: 0.2,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) yield { delta };
  }

  const sources: ChatSource[] = docs.slice(0, 5).map((d) => ({
    title: d.title,
    repo: d.repo,
    path: d.path,
  }));

  yield { done: true, sources };
}
