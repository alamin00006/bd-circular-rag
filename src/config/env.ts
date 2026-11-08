import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function number(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

export const env = {
  NODE_ENV: required('NODE_ENV', 'development'),
  APP_VERSION: required('APP_VERSION', '0.1.0'),
  PORT: number('PORT', 8000),
  API_PREFIX: required('API_PREFIX', '/api/v1'),
  CORS_ORIGINS: required('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  POSTGRES_HOST: required('POSTGRES_HOST', 'localhost'),
  POSTGRES_PORT: number('POSTGRES_PORT', 5432),
  POSTGRES_USER: required('POSTGRES_USER', 'rag'),
  POSTGRES_PASSWORD: required('POSTGRES_PASSWORD', 'rag'),
  POSTGRES_DB: required('POSTGRES_DB', 'rag'),
  POSTGRES_POOL_MAX: number('POSTGRES_POOL_MAX', 10),

  REDIS_URL: required('REDIS_URL', 'redis://localhost:6379/0'),

  // HuggingFace: embedding model (via Inference Providers)
  HF_TOKEN: required('HF_TOKEN'),
  HF_EMBEDDING_MODEL: required('HF_EMBEDDING_MODEL', 'BAAI/bge-m3'),
  HF_PROVIDER: required('HF_PROVIDER', 'hf-inference'),
  EMBEDDING_DIM: number('EMBEDDING_DIM', 1024),

  // Pinecone: vector database
  PINECONE_API_KEY: required('PINECONE_API_KEY'),
  PINECONE_INDEX: required('PINECONE_INDEX', 'bd-circulars'),
  PINECONE_NAMESPACE: required('PINECONE_NAMESPACE', 'circulars'),
  PINECONE_CLOUD: required('PINECONE_CLOUD', 'aws'),
  PINECONE_REGION: required('PINECONE_REGION', 'us-east-1'),

  // Groq: LLM for answer generation
  GROQ_API_KEY: required('GROQ_API_KEY'),
  GROQ_MODEL: required('GROQ_MODEL', 'openai/gpt-oss-120b'),

  DATA_DIR: required('DATA_DIR', './data'),
} as const;