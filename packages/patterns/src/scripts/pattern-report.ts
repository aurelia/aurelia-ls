import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDocsCorpusFromFileSystem } from '../corpus/file-system-corpus.js';
import { getAureliaPatternExample } from '../pattern-catalog.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport
} from '../curation/evidence-review.js';
import {
  getPatternEvidenceProfile,
  listPatternEvidenceProfiles
} from '../curation/pattern-evidence-profiles.js';

const patternId = process.argv[2];

if (patternId === undefined) {
  const supported = listPatternEvidenceProfiles().map((profile) => profile.admission.patternId).join(', ');
  process.stderr.write(`Usage: node out/scripts/pattern-report.js <patternId> [docsRoot]\n`);
  process.stderr.write(`Supported pattern ids: ${supported}\n`);
  process.exitCode = 1;
} else {
  const profile = getPatternEvidenceProfile(patternId);

  if (profile === undefined) {
    const supported = listPatternEvidenceProfiles().map((candidate) => candidate.admission.patternId).join(', ');
    process.stderr.write(`Unknown pattern id: ${patternId}\n`);
    process.stderr.write(`Supported pattern ids: ${supported}\n`);
    process.exitCode = 1;
  } else {
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
    const defaultDocsRoot = path.resolve(packageRoot, '..', '..', 'aurelia', 'docs', 'user-docs');
    const docsRoot = process.argv[3] !== undefined ? path.resolve(process.argv[3]) : defaultDocsRoot;
    const corpus = readDocsCorpusFromFileSystem(docsRoot);
    const pattern = getAureliaPatternExample(patternId);
    const report = analyzePatternEvidence(corpus, profile, pattern);

    process.stdout.write(formatPatternEvidenceReport(report));
  }
}
