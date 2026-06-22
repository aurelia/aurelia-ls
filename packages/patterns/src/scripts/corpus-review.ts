import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDocsCorpusFromFileSystem } from '../corpus/file-system-corpus.js';
import {
  buildCorpusCandidateReview,
  formatCorpusCandidateReview
} from '../curation/corpus-candidate-review.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const defaultDocsRoot = path.resolve(packageRoot, '..', '..', 'aurelia', 'docs', 'user-docs');
const docsRoot = process.argv[2] !== undefined ? path.resolve(process.argv[2]) : defaultDocsRoot;
const corpus = readDocsCorpusFromFileSystem(docsRoot);
const review = buildCorpusCandidateReview(corpus);

process.stdout.write(formatCorpusCandidateReview(review));
