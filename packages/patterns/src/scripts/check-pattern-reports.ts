import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDocsCorpusFromFileSystem } from '../corpus/file-system-corpus.js';
import { getAureliaPatternExample } from '../pattern-catalog.js';
import {
  analyzePatternEvidence,
  type PatternEvidenceReport
} from '../curation/evidence-review.js';
import { listPatternEvidenceProfiles } from '../curation/pattern-evidence-profiles.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const defaultDocsRoot = path.resolve(packageRoot, '..', '..', 'aurelia', 'docs', 'user-docs');
const docsRoot = process.argv[2] !== undefined ? path.resolve(process.argv[2]) : defaultDocsRoot;
const corpus = readDocsCorpusFromFileSystem(docsRoot);

const failures: string[] = [];
const rows: string[] = [];

for (const profile of listPatternEvidenceProfiles()) {
  const pattern = getAureliaPatternExample(profile.admission.patternId);

  if (pattern === undefined) {
    failures.push(`${profile.admission.patternId}: missing public catalog pattern`);
    continue;
  }

  const report = analyzePatternEvidence(corpus, profile, pattern);
  const reportFailures = failuresForReport(report);
  rows.push(`${report.patternId}: ${reportFailures.length === 0 ? 'pass' : 'fail'}`);
  failures.push(...reportFailures);
}

if (failures.length > 0) {
  process.stderr.write(`Pattern evidence guard failed for ${failures.length} issue(s).\n\n`);
  process.stderr.write(`${rows.join('\n')}\n\n`);
  for (const failure of failures) {
    process.stderr.write(`- ${failure}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(`Pattern evidence guard passed for ${rows.length} pattern(s).\n`);
}

function failuresForReport(report: PatternEvidenceReport): string[] {
  const failures: string[] = [];

  for (const document of report.sourceDocuments) {
    if (!document.present) {
      failures.push(`${report.patternId}: missing evidence document ${document.relativePath}`);
    }
  }

  for (const check of report.requiredEvidence) {
    if (!check.satisfied) {
      failures.push(`${report.patternId}: missing required evidence for ${check.key}`);
    }
  }

  if (report.catalogReview === undefined) {
    failures.push(`${report.patternId}: missing catalog review`);
  } else if (report.catalogReview.status !== 'pass') {
    failures.push(...report.catalogReview.messages.map((message) => `${report.patternId}: ${message}`));
  }

  return failures;
}
