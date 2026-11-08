import { pool } from '../../db/pool.js';
import type {
  DocumentDto,
  DocumentPage,
  DocumentStatus,
  ListDocumentsQuery,
  SourceType,
} from './documents.schema.js';

interface DocumentRow {
  id: string;
  source_type: SourceType;
  source_url: string;
  title: string;
  circular_no: string | null;
  department: string | null;
  issued_on: string | null;
  language: string | null;
  status: DocumentStatus;
  superseded_by_id: string | null;
  created_at: Date;
}

const COLUMNS = `
  id, source_type, source_url, title, circular_no, department,
  issued_on, language, status, superseded_by_id, created_at
`;

function toDto(row: DocumentRow): DocumentDto {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    title: row.title,
    circularNo: row.circular_no,
    department: row.department,
    issuedOn: row.issued_on,
    language: row.language,
    status: row.status,
    supersededById: row.superseded_by_id,
    createdAt: row.created_at.toISOString(),
  };
}

export const documentsRepository = {
  async list(q: ListDocumentsQuery): Promise<DocumentPage> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (q.sourceType) {
      params.push(q.sourceType);
      where.push(`source_type = $${params.length}`);
    }
    if (q.status) {
      params.push(q.status);
      where.push(`status = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRes, rowsRes] = await Promise.all([
      pool.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM documents ${whereSql}`,
        params,
      ),
      pool.query<DocumentRow>(
        `SELECT ${COLUMNS} FROM documents ${whereSql}
         ORDER BY issued_on DESC NULLS LAST, created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, q.limit, q.offset],
      ),
    ]);

    return {
      items: rowsRes.rows.map(toDto),
      total: countRes.rows[0]?.total ?? 0,
      limit: q.limit,
      offset: q.offset,
    };
  },

  async findById(id: string): Promise<DocumentDto | null> {
    const { rows } = await pool.query<DocumentRow>(
      `SELECT ${COLUMNS} FROM documents WHERE id = $1`,
      [id],
    );
    return rows[0] ? toDto(rows[0]) : null;
  },
};