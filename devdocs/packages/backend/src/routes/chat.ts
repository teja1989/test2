import { Router } from 'express';
import { z } from 'zod';
import { streamChat } from '../services/azureOpenAI.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const chatRouter = Router();

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .max(30)
    .default([]),
});

chatRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { message, history } = parsed.data;

    // Server-Sent Events — disable nginx/proxy buffering for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    for await (const chunk of streamChat(message, history)) {
      send(chunk);
    }

    res.end();
  } catch (err) {
    next(err);
  }
});
