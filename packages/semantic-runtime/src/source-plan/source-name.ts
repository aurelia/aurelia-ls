export function sourceNameWords(value: string): readonly string[] {
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_/-]+/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();
  if (normalized.length === 0) {
    return ['item'];
  }
  return normalized.split(/\s+/).map((word) => word.toLowerCase());
}

export function pluralizeLastSourceNameWord(words: readonly string[]): readonly string[] {
  if (words.length === 0) {
    return ['items'];
  }
  return [
    ...words.slice(0, -1),
    pluralizeSourceNameWord(words[words.length - 1]!),
  ];
}

export function singularizeSourceNameWord(word: string): string {
  if (word === 'status') {
    return word;
  }
  if (word.endsWith('ies') && word.length > 3) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) {
    return word.slice(0, -1);
  }
  return word;
}

export function pluralizeSourceNameWord(word: string): string {
  if (word.endsWith('y') && word.length > 1 && !/[aeiou]y$/u.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }
  if (/(s|x|z|ch|sh)$/u.test(word)) {
    return `${word}es`;
  }
  return `${word}s`;
}

export function pascalSourceName(words: readonly string[]): string {
  return words.map(capitalizeSourceNameWord).join('');
}

export function lowerCamelSourceName(words: readonly string[]): string {
  const [first, ...rest] = words;
  if (first == null) {
    return 'item';
  }
  return [
    first,
    ...rest.map(capitalizeSourceNameWord),
  ].join('');
}

export function titleSourceName(words: readonly string[]): string {
  return words.map(titleSourceNameWord).join(' ');
}

export function lowerTitleSourceName(words: readonly string[]): string {
  return words.join(' ');
}

export function upperSnakeSourceName(words: readonly string[]): string {
  return words.map((word) => word.toUpperCase()).join('_');
}

export function kebabSourceName(words: readonly string[]): string {
  return words.join('-');
}

function capitalizeSourceNameWord(word: string): string {
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
}

function titleSourceNameWord(word: string): string {
  switch (word) {
    case 'aot':
      return 'AOT';
    case 'api':
      return 'API';
    case 'css':
      return 'CSS';
    case 'di':
      return 'DI';
    case 'html':
      return 'HTML';
    case 'http':
      return 'HTTP';
    case 'id':
      return 'ID';
    case 'javascript':
      return 'JavaScript';
    case 'lsp':
      return 'LSP';
    case 'mcp':
      return 'MCP';
    case 'sla':
      return 'SLA';
    case 'ssg':
      return 'SSG';
    case 'ssr':
      return 'SSR';
    case 'typescript':
      return 'TypeScript';
    case 'ui':
      return 'UI';
    case 'url':
      return 'URL';
    default:
      return capitalizeSourceNameWord(word);
  }
}
