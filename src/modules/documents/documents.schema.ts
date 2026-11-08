import { HttpError } from '../../lib/http-error.js';

export const SOURCE_TYPES = ['bb_circular', 'nbr_notification'] as const;
export const DOCUMENT_STATUSES = ['discovered', 'downloaded', 'parsed', 'indexed', 'failed'] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface ListDocumentsQuery {
  sourceType?: SourceType;
  status?: DocumentStatus;
  limit: number;
  offset: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
  throw HttpError.badRequest(`${field} must be one of: ${allowed.join(', ')}`);
}

function intInRange(value: unknown, field: string, min: number, max: number, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw HttpError.badRequest(`${field} must be an integer between ${min} and ${max}`);
  }
  return n;
}

/** Validate and normalise ?sourceType=&status=&limit=&offset= */
export function parseListQuery(query: Record<string, unknown>): ListDocumentsQuery {
  return {
    sourceType: oneOf(query.sourceType, SOURCE_TYPES, 'sourceType'),
    status: oneOf(query.status, DOCUMENT_STATUSES, 'status'),
    limit: intInRange(query.limit, 'limit', 1, 100, 20),
    offset: intInRange(query.offset, 'offset', 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

export function parseDocumentId(id: unknown): string {
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    throw HttpError.badRequest('id must be a valid UUID');
  }
  return id;
}

/** API response shape (raw_text deliberately excluded to keep lists light). */
export interface DocumentDto {
  id: string;
  sourceType: SourceType;
  sourceUrl: string;
  title: string;
  circularNo: string | null;
  department: string | null;
  issuedOn: string | null;
  language: string | null;
  status: DocumentStatus;
  supersededById: string | null;
  createdAt: string;
}

export interface DocumentPage {
  items: DocumentDto[];
  total: number;
  limit: number;
  offset: number;
}