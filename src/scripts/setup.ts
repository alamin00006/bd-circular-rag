/**
 * One-time setup + connection check for external services.
 * - Creates the Pinecone index if it doesn't exist (serverless, cosine).
 * - Verifies the index dimension matches EMBEDDING_DIM.
 * - Sends a tiny test request to the HuggingFace embedding model and to Groq.
 *
 * Usage: npm run setup
 */
import { env } from '../config/env.js';
import { embeddings } from '../lib/embeddings.js';
import { llm } from '../lib/llm.js';
import { pinecone } from '../lib/vector-store.js';

async function main(): Promise<void> {
  console.log(`Pinecone: ensuring index "${env.PINECONE_INDEX}"...`);
  await pinecone.createIndex({
    name: env.PINECONE_INDEX,
    dimension: env.EMBEDDING_DIM,
    metric: 'cosine',
    spec: { serverless: { cloud: env.PINECONE_CLOUD as 'aws', region: env.PINECONE_REGION } },
    waitUntilReady: true,
    suppressConflicts: true, // no error if it already exists
  });

  const index = await pinecone.describeIndex(env.PINECONE_INDEX);
  if (index.dimension !== env.EMBEDDING_DIM) {
    throw new Error(
      `Index "${env.PINECONE_INDEX}" has dimension ${index.dimension}, but EMBEDDING_DIM is ${env.EMBEDDING_DIM}.`,
    );
  }
  console.log(`✔ Pinecone index ready (host: ${index.host})`);

  const vector = await embeddings.embedQuery('বাংলাদেশ ব্যাংকের সার্কুলার');
  console.log(`✔ HuggingFace "${env.HF_EMBEDDING_MODEL}" works (dimension ${vector.length})`);

  const reply = await llm.invoke([['human', 'Reply with just: ok']]);
  console.log(`✔ Groq "${env.GROQ_MODEL}" works (reply: ${String(reply.content).trim()})`);
}

main().catch((err: unknown) => {
  console.error('✖ Setup failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});