import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked, type Tokens } from 'marked';
import hljs from 'highlight.js';

const DOCS_DIR = path.join(process.cwd(), 'docs');

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface DocMeta {
  title: string;
  slug: string[];
  filePath: string;
  tags: string[];
  description?: string;
}

export interface DocContent extends DocMeta {
  html: string;
  rawContent: string;
  headings: { level: number; text: string; id: string }[];
}

// ─────────────────────────────────────────
// SLUG ↔ PATH CONVERSION
// ─────────────────────────────────────────

export function pathToSlug(filePath: string): string[] {
  const rel = path.relative(DOCS_DIR, filePath).replace(/\.md$/, '');
  return rel
    .split(path.sep)
    .map((part) =>
      part
        .toLowerCase()
        .replace(/^🏠\s*/, 'home')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-'),
    )
    .filter(Boolean);
}

export function slugToPath(slug: string[]): string | null {
  const allDocs = getAllDocFiles();
  const target = slug.join('/');
  for (const filePath of allDocs) {
    const s = pathToSlug(filePath).join('/');
    if (s === target) return filePath;
  }
  return null;
}

// ─────────────────────────────────────────
// FILE DISCOVERY
// ─────────────────────────────────────────

export function getAllDocFiles(dir: string = DOCS_DIR): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllDocFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

export function getAllSlugs(): string[][] {
  return getAllDocFiles().map(pathToSlug);
}

// ─────────────────────────────────────────
// CONTENT PRE-PROCESSING
// ─────────────────────────────────────────

function processWikiLinks(content: string, allFiles: string[]): string {
  const slugMap = new Map<string, string>();
  for (const fp of allFiles) {
    const slug = pathToSlug(fp);
    const filename = path.basename(fp, '.md');
    const display = filename.replace(/^🏠\s*/, 'Home');
    slugMap.set(display.toLowerCase(), '/docs/' + slug.join('/'));
    const rel = path.relative(DOCS_DIR, fp).replace(/\.md$/, '');
    slugMap.set(rel.toLowerCase(), '/docs/' + slug.join('/'));
  }
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const [linkPart, displayPart] = inner.split('|');
    const href = slugMap.get(linkPart.toLowerCase().trim()) ?? '#';
    const text = (displayPart ?? linkPart).trim();
    return `[${text}](${href})`;
  });
}

function processCallouts(content: string): string {
  return content.replace(
    /^> \[!(NOTE|TIP|WARNING|DANGER|INFO|IMPORTANT|CAUTION|SUCCESS)\]\s*\n((?:>.*\n?)*)/gim,
    (_, type, body) => {
      const innerText = body
        .split('\n')
        .map((line: string) => line.replace(/^>\s?/, ''))
        .join('\n');
      return `<div class="doc-callout doc-callout-${type.toLowerCase()}" data-type="${type}">\n<div class="doc-callout-title">${type}</div>\n\n${innerText}\n</div>\n\n`;
    },
  );
}

export function extractTitle(content: string, filename: string): string {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].replace(/^🏠\s*/, '');
  return filename
    .replace(/^🏠\s*/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function extractHeadings(html: string): { level: number; text: string; id: string }[] {
  const headings: { level: number; text: string; id: string }[] = [];
  const re = /<h([2-4])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[3].replace(/<[^>]+>/g, '');
    headings.push({ level: parseInt(m[1]), text: raw, id: m[2] });
  }
  return headings;
}

// ─────────────────────────────────────────
// MARKED V17 SETUP (extension API)
// ─────────────────────────────────────────

function slugId(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

marked.use({
  renderer: {
    heading(token: Tokens.Heading): string {
      const text = token.text;
      const depth = token.depth;
      const id = slugId(text);
      return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    },

    code(token: Tokens.Code): string {
      const lang = token.lang ?? '';
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted =
        language === 'plaintext'
          ? hljs.highlightAuto(token.text).value
          : hljs.highlight(token.text, { language }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    },

    table(token: Tokens.Table): string {
      // Build header row
      let headerCells = '';
      for (const cell of token.header) {
        const content = marked.parseInline(cell.tokens.map((t: any) => t.raw ?? t.text ?? '').join(''));
        headerCells += `<th>${content}</th>\n`;
      }
      const headerRow = `<tr>\n${headerCells}</tr>\n`;

      // Build body rows
      let bodyRows = '';
      for (const row of token.rows) {
        let cells = '';
        for (const cell of row) {
          const content = marked.parseInline(cell.tokens.map((t: any) => t.raw ?? t.text ?? '').join(''));
          cells += `<td>${content}</td>\n`;
        }
        bodyRows += `<tr>\n${cells}</tr>\n`;
      }

      return `<div class="doc-table-wrap"><table class="doc-table"><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table></div>\n`;
    },
  },
});

// ─────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────

export function getDocBySlug(slug: string[]): DocContent | null {
  const filePath = slugToPath(slug);
  if (!filePath || !fs.existsSync(filePath)) return null;
  return parseDocFile(filePath);
}

export function parseDocFile(filePath: string): DocContent {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { content, data } = matter(raw);
  const allFiles = getAllDocFiles();

  let processed = content;
  processed = processWikiLinks(processed, allFiles);
  processed = processCallouts(processed);

  const html = marked(processed) as string;
  const slug = pathToSlug(filePath);
  const filename = path.basename(filePath, '.md');

  return {
    title: extractTitle(content, filename),
    slug,
    filePath,
    tags: (data.tags as string[] | undefined) ?? [],
    description: data.description as string | undefined,
    html,
    rawContent: content,
    headings: extractHeadings(html),
  };
}

export function getAllDocMeta(): DocMeta[] {
  return getAllDocFiles().map((fp) => {
    const raw = fs.readFileSync(fp, 'utf-8');
    const { content, data } = matter(raw);
    const slug = pathToSlug(fp);
    const filename = path.basename(fp, '.md');
    return {
      title: extractTitle(content, filename),
      slug,
      filePath: fp,
      tags: (data.tags as string[] | undefined) ?? [],
      description: data.description as string | undefined,
    };
  });
}

// NavItem and NAV_STRUCTURE live in lib/docs-nav.ts (client-safe)
export type { NavItem } from './docs-nav';
export { NAV_STRUCTURE } from './docs-nav';
