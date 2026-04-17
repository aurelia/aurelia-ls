import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import type { ProgramReuseOptions } from '../program-reuse-options.js';
import { collectSnapshotFrontierEvidence } from '../frontier-evidence.js';
import { RepoSession } from '../repo-session.js';
import { describeSnapshotProfile } from '../snapshots.js';
import {
  buildStructuralClaimGraph,
  type StructuralClaimGraphRuntime,
} from '../structural-claim-graph.js';
import type {
  TypeDecl,
  TypeRef,
  TypeRefsOutput,
} from './schema.js';
import type { ParsedTsconfigSourceFileScanResult } from '../tsconfig-source-files.js';

export interface TypeRefsAnalysisResult {
  output: TypeRefsOutput;
  reportLines: string[];
  warnings: string[];
}

function gitHead(cwd: string): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

function gitBlobHash(filePath: string): string {
  try {
    return execFileSync('git', ['hash-object', filePath], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

function materializeTypeDeclarations(
  runtime: StructuralClaimGraphRuntime,
): TypeDecl[] {
  return runtime.index.declarations
    .filter((declaration) =>
      declaration.attributes.declarationKind === 'interface'
      || declaration.attributes.declarationKind === 'type'
      || declaration.attributes.declarationKind === 'class'
      || declaration.attributes.declarationKind === 'enum',
    )
    .map((declaration) => {
    const refs: TypeRef[] = (runtime.index.typeReferencesByDeclarationId.get(declaration.id) ?? [])
      .map((reference) => ({
        target: reference.attributes.targetName,
        target_file: reference.attributes.targetFile,
        kind: reference.attributes.refKind,
        ...(reference.attributes.context ? { context: reference.attributes.context } : {}),
      }));
    const members = (runtime.index.membersByDeclarationId.get(declaration.id) ?? [])
      .map((member) => ({
        name: member.attributes.name,
        optional: member.attributes.optional,
        readonly: member.attributes.readonly,
        member_kind: member.attributes.memberKind,
        ...(member.attributes.value ? { value: member.attributes.value } : {}),
      }));

    return {
      name: declaration.attributes.name,
      file: declaration.attributes.filePath,
      kind: declaration.attributes.declarationKind as TypeDecl['kind'],
      line: declaration.attributes.line,
      exported: declaration.attributes.exported,
      ...(declaration.attributes.typeParams.length > 0
        ? { type_params: [...declaration.attributes.typeParams] }
        : {}),
      ...(members.length > 0 ? { members } : {}),
      ...(declaration.attributes.aliasBody
        ? { alias_body: declaration.attributes.aliasBody }
        : {}),
      ...(declaration.attributes.literalValues
        ? { literal_values: [...declaration.attributes.literalValues] }
        : {}),
      refs,
    };
    }).sort((left, right) =>
      left.file.localeCompare(right.file)
      || left.line - right.line,
    );
}

export function generateTypeRefsAnalysis(
  nextSession: RepoSession,
  options: ProgramReuseOptions = {},
  sourceFileScan?: ParsedTsconfigSourceFileScanResult,
): TypeRefsAnalysisResult {
  void options;

  const runtime = buildStructuralClaimGraph(nextSession, {
    ...(sourceFileScan ? { sourceFileScan } : {}),
  });
  return generateTypeRefsAnalysisFromRuntime(nextSession, runtime, sourceFileScan);
}

export function generateTypeRefsAnalysisFromRuntime(
  nextSession: RepoSession,
  runtime: StructuralClaimGraphRuntime,
  sourceFileScan?: ParsedTsconfigSourceFileScanResult,
): TypeRefsAnalysisResult {
  const allDeclarations = materializeTypeDeclarations(runtime);
  const totalRefs = allDeclarations.reduce((sum, declaration) => sum + declaration.refs.length, 0);
  const totalMembers = allDeclarations.reduce((sum, declaration) => sum + (declaration.members?.length ?? 0), 0);
  const totalAliasBodies = allDeclarations.filter((declaration) => declaration.alias_body).length;
  const totalLiteralUnions = allDeclarations.filter((declaration) => declaration.literal_values).length;

  const referencedNames = new Set<string>();
  for (const declaration of allDeclarations) {
    for (const ref of declaration.refs) {
      referencedNames.add(ref.target);
    }
  }

  const rootTypes = allDeclarations.filter((declaration) => !referencedNames.has(declaration.name));
  const leafTypes = allDeclarations.filter((declaration) => declaration.refs.length === 0);
  const frontiers = collectSnapshotFrontierEvidence(nextSession, sourceFileScan);

  const output: TypeRefsOutput = {
    root: nextSession.repoPath.replace(/\\/g, '/'),
    generated_at: new Date().toISOString(),
    source_commit: gitHead(nextSession.repoPath),
    analyzer_commit: gitBlobHash(resolve(import.meta.dirname!, 'analyze.js')),
    profile: describeSnapshotProfile(nextSession.profile),
    frontiers,
    summary: {
      files_analyzed: runtime.index.sourceFiles.length,
      type_declarations: allDeclarations.length,
      type_references: totalRefs,
      root_types: rootTypes.length,
      leaf_types: leafTypes.length,
    },
    declarations: allDeclarations,
  };

  const reportLines = [
    '',
    `Snapshot target:    ${output.profile.target}`,
    `Profile:            ${output.profile.profileId}${output.profile.profilePath ? ` (${output.profile.profilePath})` : ''}`,
    `Excluded prefixes:  ${output.profile.excludedRepoRelativePrefixes.length}`,
    `Named frontiers:    ${output.frontiers.excluded_frontiers.length}`,
    '',
    `Loaded ${runtime.index.sourceFiles.length} source files`,
    `Declarations:       ${allDeclarations.length}`,
    `Type members:       ${totalMembers}`,
    `Alias bodies:       ${totalAliasBodies}`,
    `Literal unions:     ${totalLiteralUnions}`,
    `Type references:    ${totalRefs}`,
    `Root types:         ${rootTypes.length}`,
    `Leaf types:         ${leafTypes.length}`,
    '',
    'Top 20 types by outbound reference count:',
    ...allDeclarations
      .slice()
      .sort((left, right) => right.refs.length - left.refs.length)
      .slice(0, 20)
      .map((declaration) =>
        `  ${declaration.refs.length.toString().padStart(4)} refs  ${declaration.name}  (${declaration.file}:${declaration.line})`,
      ),
    '',
    'Top 20 most-referenced types:',
  ];

  const inboundCount = new Map<string, number>();
  for (const declaration of allDeclarations) {
    for (const ref of declaration.refs) {
      inboundCount.set(ref.target, (inboundCount.get(ref.target) || 0) + 1);
    }
  }
  for (const [name, count] of [...inboundCount.entries()].sort((left, right) => right[1] - left[1]).slice(0, 20)) {
    const declaration = allDeclarations.find((candidate) => candidate.name === name);
    const fileNote = declaration ? ` (${declaration.file})` : '';
    reportLines.push(`  ${count.toString().padStart(4)} refs  ${name}${fileNote}`);
  }
  reportLines.push('');

  return {
    output,
    reportLines,
    warnings: [...runtime.graph.warnings],
  };
}
