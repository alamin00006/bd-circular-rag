import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

/**
 * Splits document text into overlapping chunks for embedding.
 * Separators are tried in order, so text breaks at paragraphs first, then lines,
 * then Bangla sentence ends (। দাঁড়ি), then English sentence ends, then words.
 */
export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 150,
  separators: ['\n\n', '\n', '।', '?', '!', '. ', ' ', ''],
  keepSeparator: true,
});