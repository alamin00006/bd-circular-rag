-- Keeps updated_at in sync on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Documents: one row per circular / notification
CREATE TABLE documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type       VARCHAR(32)   NOT NULL
                    CHECK (source_type IN ('bb_circular', 'nbr_notification')),
  source_url        VARCHAR(2048) NOT NULL UNIQUE,
  title             TEXT          NOT NULL,
  circular_no       VARCHAR(255),
  department        VARCHAR(255),
  issued_on         DATE,
  language          VARCHAR(8)    CHECK (language IN ('bn', 'en', 'mixed')),
  file_path         VARCHAR(1024),
  content_hash      VARCHAR(64),
  raw_text          TEXT,
  status            VARCHAR(32)   NOT NULL DEFAULT 'discovered'
                    CHECK (status IN ('discovered', 'downloaded', 'parsed', 'indexed', 'failed')),
  error             TEXT,
  -- Supersession: a newer master circular can replace older ones
  superseded_by_id  UUID REFERENCES documents (id) ON DELETE SET NULL,
  meta              JSONB         NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_documents_source_type  ON documents (source_type);
CREATE INDEX ix_documents_status       ON documents (status);
CREATE INDEX ix_documents_issued_on    ON documents (issued_on DESC NULLS LAST);
CREATE INDEX ix_documents_circular_no  ON documents (circular_no);
CREATE INDEX ix_documents_content_hash ON documents (content_hash);

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Chunks: text pieces of a document.
-- The embedding lives in Pinecone under the same id (chunks.id = Pinecone record id).
CREATE TABLE chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID    NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  content       TEXT    NOT NULL,
  page_start    INTEGER,
  page_end      INTEGER,
  token_count   INTEGER,
  indexed_at    TIMESTAMPTZ,  -- set when the vector is upserted to Pinecone
  meta          JSONB   NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX ix_chunks_document_id ON chunks (document_id);

CREATE TRIGGER trg_chunks_updated_at
  BEFORE UPDATE ON chunks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();