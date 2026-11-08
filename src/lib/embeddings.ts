import { InferenceClient, type InferenceProviderOrPolicy } from '@huggingface/inference';
import { Embeddings, type EmbeddingsParams } from '@langchain/core/embeddings';

import { env } from '../config/env.js';

export interface HuggingFaceEmbeddingsParams extends EmbeddingsParams {
  apiKey: string;
  model: string;
  provider?: InferenceProviderOrPolicy;
  dimension: number;
  batchSize?: number;
}

/**
 * LangChain Embeddings backed by HuggingFace Inference Providers.
 * Works anywhere LangChain expects embeddings (PineconeStore, retrievers, ...).
 */
export class HuggingFaceEmbeddings extends Embeddings {
  private readonly client: InferenceClient;
  private readonly model: string;
  private readonly provider: InferenceProviderOrPolicy | undefined;
  private readonly dimension: number;
  private readonly batchSize: number;

  constructor(params: HuggingFaceEmbeddingsParams) {
    super(params); // maxRetries / maxConcurrency handled by LangChain's AsyncCaller
    this.client = new InferenceClient(params.apiKey);
    this.model = params.model;
    this.provider = params.provider;
    this.dimension = params.dimension;
    this.batchSize = params.batchSize ?? 32;
  }

  /** e5 models expect "passage: " / "query: " prefixes; other models (bge-m3) do not. */
  private prefix(kind: 'passage' | 'query'): string {
    return this.model.toLowerCase().includes('e5') ? `${kind}: ` : '';
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize).map((t) => this.prefix('passage') + t);
      vectors.push(...(await this.embedBatch(batch)));
    }
    return vectors;
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([this.prefix('query') + text]);
    return vector!;
  }

  private async embedBatch(inputs: string[]): Promise<number[][]> {
    const output = await this.caller.call(() =>
      this.client.featureExtraction({
        model: this.model,
        inputs,
        ...(this.provider && { provider: this.provider }),
        normalize: true,
      }),
    );

    // Sentence-embedding models return one pooled vector per input: number[][]
    const vectors = output as unknown[];
    if (vectors.length !== inputs.length || !vectors.every(isVector)) {
      throw new Error(
        `Unexpected embedding shape from "${this.model}". Use a sentence-embedding model.`,
      );
    }
    for (const v of vectors) {
      if (v.length !== this.dimension) {
        throw new Error(
          `Model "${this.model}" returned ${v.length} dims, but EMBEDDING_DIM is ${this.dimension}.`,
        );
      }
    }
    return vectors;
  }
}

function isVector(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === 'number';
}

export const embeddings = new HuggingFaceEmbeddings({
  apiKey: env.HF_TOKEN,
  model: env.HF_EMBEDDING_MODEL,
  provider: env.HF_PROVIDER as InferenceProviderOrPolicy,
  dimension: env.EMBEDDING_DIM,
  maxRetries: 3,
  maxConcurrency: 4,
});