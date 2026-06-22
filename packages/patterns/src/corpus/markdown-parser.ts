import path from 'node:path';
import type {
  CodeFence,
  GitBookDirective,
  MarkdownDocument,
  MarkdownSection,
  NavigationNode
} from './corpus-types.js';

interface MutableSection {
  sectionId: string;
  heading?: string;
  headingDepth: number;
  headingPath: string[];
  startLine: number;
  endLine: number;
  codeFenceIds: string[];
  proseLines: string[];
}

interface HeadingStackEntry {
  depth: number;
  title: string;
}

export function parseMarkdownDocument(
  relativePath: string,
  text: string,
  navigationNodes: readonly NavigationNode[] = []
): MarkdownDocument {
  const normalizedText = text.replace(/^\uFEFF/, '');
  const allLines = normalizedText.split(/\r?\n/);
  const { frontmatterRaw, bodyStartIndex } = readFrontmatter(allLines);
  const sections: MutableSection[] = [];
  const codeFences: CodeFence[] = [];
  const directives: GitBookDirective[] = [];
  const headingStack: HeadingStackEntry[] = [];
  let currentSection: MutableSection | undefined;

  const ensureSection = (lineNumber: number): MutableSection => {
    if (currentSection !== undefined) {
      return currentSection;
    }

    const section = createSection(relativePath, sections.length, undefined, 0, [], lineNumber);
    sections.push(section);
    currentSection = section;
    return section;
  };

  const openHeadingSection = (lineNumber: number, depth: number, title: string): void => {
    if (currentSection !== undefined) {
      currentSection.endLine = lineNumber - 1;
    }

    while (headingStack.length > 0 && headingStack[headingStack.length - 1]!.depth >= depth) {
      headingStack.pop();
    }
    headingStack.push({ depth, title });

    const headingPath = headingStack.map((entry) => entry.title);
    const section = createSection(relativePath, sections.length, title, depth, headingPath, lineNumber);
    sections.push(section);
    currentSection = section;
  };

  for (let index = bodyStartIndex; index < allLines.length; index += 1) {
    const line = allLines[index] ?? '';
    const lineNumber = index + 1;
    const fenceMatch = line.match(/^\s*```([^`]*)\s*$/);

    if (fenceMatch !== null) {
      const section = ensureSection(lineNumber);
      const languageRaw = (fenceMatch[1] ?? '').trim();
      const codeLines: string[] = [];
      let endIndex = index;

      for (let codeIndex = index + 1; codeIndex < allLines.length; codeIndex += 1) {
        const codeLine = allLines[codeIndex] ?? '';
        if (/^\s*```\s*$/.test(codeLine)) {
          endIndex = codeIndex;
          break;
        }
        codeLines.push(codeLine);
        endIndex = codeIndex;
      }

      const fenceId = `${relativePath}#fence-${codeFences.length + 1}`;
      const title = findNearbyDirectiveTitle(directives, lineNumber);
      const codeFence: CodeFence = {
        fenceId,
        sectionId: section.sectionId,
        languageRaw,
        language: normalizeCodeLanguage(languageRaw),
        startLine: lineNumber,
        endLine: endIndex + 1,
        code: codeLines.join('\n'),
        ...(title !== undefined ? { title } : {})
      };
      codeFences.push(codeFence);
      section.codeFenceIds.push(fenceId);
      index = endIndex;
      continue;
    }

    const directiveMatch = line.match(/^\s*\{%\s*([A-Za-z0-9_-]+)(.*?)%\}\s*$/);
    if (directiveMatch !== null) {
      directives.push({
        directiveId: `${relativePath}#directive-${directives.length + 1}`,
        name: directiveMatch[1] ?? '',
        attrs: (directiveMatch[2] ?? '').trim(),
        line: lineNumber
      });
      ensureSection(lineNumber).proseLines.push(line);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (headingMatch !== null) {
      const depth = headingMatch[1]!.length;
      const title = stripMarkdownInline(headingMatch[2] ?? '');
      openHeadingSection(lineNumber, depth, title);
      continue;
    }

    if (line.trim().length > 0) {
      ensureSection(lineNumber).proseLines.push(line);
    } else if (currentSection !== undefined) {
      currentSection.proseLines.push(line);
    }
  }

  if (currentSection !== undefined) {
    currentSection.endLine = allLines.length;
  }

  const documentTitle =
    sections.find((section) => section.headingDepth === 1)?.heading ??
    navigationNodes[0]?.title;

  return {
    documentId: relativePath,
    relativePath,
    ...(documentTitle !== undefined ? { title: documentTitle } : {}),
    ...(frontmatterRaw !== undefined ? { frontmatterRaw } : {}),
    navigationNodes,
    sections: sections.map(freezeSection),
    codeFences,
    directives
  };
}

export function normalizeMarkdownPath(input: string): string {
  return input.split(path.sep).join('/');
}

export function normalizeCodeLanguage(languageRaw: string): string {
  const language = languageRaw.trim().toLowerCase();
  if (language === 'ts') {
    return 'typescript';
  }
  if (language === 'js') {
    return 'javascript';
  }
  if (language === 'shell' || language === 'sh' || language === 'bash') {
    return 'bash';
  }
  return language;
}

function readFrontmatter(lines: readonly string[]): { frontmatterRaw?: string; bodyStartIndex: number } {
  if ((lines[0] ?? '').trim() !== '---') {
    return { bodyStartIndex: 0 };
  }

  for (let index = 1; index < lines.length; index += 1) {
    if ((lines[index] ?? '').trim() === '---') {
      return {
        frontmatterRaw: lines.slice(0, index + 1).join('\n'),
        bodyStartIndex: index + 1
      };
    }
  }

  return { bodyStartIndex: 0 };
}

function createSection(
  relativePath: string,
  index: number,
  heading: string | undefined,
  headingDepth: number,
  headingPath: string[],
  startLine: number
): MutableSection {
  return {
    sectionId: `${relativePath}#section-${index + 1}`,
    ...(heading !== undefined ? { heading } : {}),
    headingDepth,
    headingPath,
    startLine,
    endLine: startLine,
    codeFenceIds: [],
    proseLines: []
  };
}

function freezeSection(section: MutableSection): MarkdownSection {
  return {
    sectionId: section.sectionId,
    ...(section.heading !== undefined ? { heading: section.heading } : {}),
    headingDepth: section.headingDepth,
    headingPath: section.headingPath,
    startLine: section.startLine,
    endLine: section.endLine,
    codeFenceIds: section.codeFenceIds,
    prose: section.proseLines.join('\n').trim()
  };
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function findNearbyDirectiveTitle(
  directives: readonly GitBookDirective[],
  codeStartLine: number
): string | undefined {
  for (let index = directives.length - 1; index >= 0; index -= 1) {
    const directive = directives[index]!;
    if (codeStartLine - directive.line > 3) {
      return undefined;
    }
    if (directive.name === 'code' || directive.name === 'tab') {
      const titleMatch = directive.attrs.match(/title=(?:"([^"]+)"|'([^']+)')/);
      return titleMatch?.[1] ?? titleMatch?.[2];
    }
  }
  return undefined;
}

