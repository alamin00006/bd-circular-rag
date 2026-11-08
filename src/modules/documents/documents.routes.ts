import { Router } from 'express';

import { HttpError } from '../../lib/http-error.js';
import { documentsRepository } from './documents.repository.js';
import { parseDocumentId, parseListQuery } from './documents.schema.js';

export const documentsRouter = Router();

// Express 5 forwards thrown errors / rejected promises to the error handler automatically.
documentsRouter.get('/', async (req, res) => {
  const query = parseListQuery(req.query);
  res.json(await documentsRepository.list(query));
});

documentsRouter.get('/:id', async (req, res) => {
  const id = parseDocumentId(req.params.id);
  const doc = await documentsRepository.findById(id);
  if (!doc) throw HttpError.notFound('Document not found');
  res.json(doc);
});