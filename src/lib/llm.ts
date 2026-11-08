import { ChatGroq } from '@langchain/groq';

import { env } from '../config/env.js';

/**
 * LangChain chat model on Groq.
 * Low temperature: answers about circulars must be factual, not creative.
 *   const res = await llm.invoke([['system', '...'], ['human', '...']]);
 *   console.log(res.content);
 */
export const llm = new ChatGroq({
  apiKey: env.GROQ_API_KEY,
  model: env.GROQ_MODEL,
  temperature: 0.2,
  maxTokens: 1024,
  maxRetries: 2,
});