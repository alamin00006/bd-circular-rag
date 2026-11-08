import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';

import { env } from '../config/env.js';
import { embeddings } from './embeddings.js';

export const pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });

export const pineconeIndex = pinecone.Index(env.PINECONE_INDEX);

/** Metadata stored with every chunk (values must be string, number, boolean or string[]). */
export type ChunkMetadata = {
  documentId: string;
  chunkIndex: number;
  sourceType: string;
  title: string;
  issuedOn?: string;
};

/**
 * LangChain vector store over Pinecone.
 *  - vectorStore.addDocuments(docs, { ids })        → embed + upsert
 *  - vectorStore.similaritySearchWithScore(q, k)     → semantic search
 *  - vectorStore.asRetriever({ k })                  → retriever for RAG chains
 *  - vectorStore.delete({ ids })                     → remove vectors
 * Use chunks.id (Postgres) as the Pinecone id so both stay linked.
 */
export const vectorStore = new PineconeStore(embeddings, {
  pineconeIndex,
  namespace: env.PINECONE_NAMESPACE,
  maxConcurrency: 4,
});