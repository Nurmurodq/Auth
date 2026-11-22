#!/usr/bin/env node
/**
 * Builds the reading library from Standard Ebooks EPUBs.
 *
 *   node scripts/import-books.mjs            # import every title in books.config.mjs
 *   node scripts/import-books.mjs --only=emma,dracula
 *
 * Output (all committed, so the app needs no build-time network access):
 *   public/books/<id>/toc.json        chapter list with word counts
 *   public/books/<id>/<n>.html        sanitized chapter fragments
 *   public/books/<id>/img/*           in-text illustrations (webp/svg)
 *   public/covers/<id>-{240,480}.webp cover artwork (square crop)
 *   src/app/data/catalog.data.ts      typed catalog metadata
 *
 * Requires ImageMagick (`convert`) for image processing. EPUBs are cached in .cache/epub.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';
import { BOOKS, GENRES } from './books.config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.cache/epub');
const OUT_BOOKS = path.join(ROOT, 'public/books');
const OUT_COVERS = path.join(ROOT, 'public/covers');
const OUT_CATALOG = path.join(ROOT, 'src/app/data/catalog.data.ts');

const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);

/* ------------------------------------------------------------------ */
/* Minimal XML parser (EPUB XHTML is well-formed XML)                 */
/* ------------------------------------------------------------------ */

const TOKEN = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE[^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+/g;
const ATTR = /([^\s=/]+)\s*=\s*"([^"]*)"/g;

function parseXml(src) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  for (const [tok] of src.matchAll(TOKEN)) {
    const top = stack[stack.length - 1];
    if (tok.startsWith('<!--') || tok.startsWith('<?') || tok.startsWith('<!')) continue;
    if (tok.startsWith('</')) {
      const name = tok.slice(2, -1).trim();
      while (stack.length > 1 && stack.pop().tag !== name) { /* tolerate mismatches */ }
      continue;
    }
    if (tok.startsWith('<')) {
      const selfClosing = tok.endsWith('/>');
      const inner = tok.slice(1, selfClosing ? -2 : -1);
      const name = inner.match(/^[^\s/]+/)[0];
      const attrs = {};
      for (const [, k, v] of inner.slice(name.length).matchAll(ATTR)) attrs[k] = v;
      const node = { tag: name, attrs, children: [], parent: top };
      top.children.push(node);
      if (!selfClosing) stack.push(node);
      continue;
    }
    top.children.push({ tag: '#text', text: tok, parent: top });
  }
  return root;
}

const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k === 'amp') return '&';
    if (k === 'lt') return '<';
    if (k === 'gt') return '>';
    if (k === 'quot') return '"';
    if (k === 'apos') return "'";
    return String.fromCodePoint(k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  });

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textOf = (n) => (n.tag === '#text' ? decode(n.text) : n.children.map(textOf).join(''));
const clean = (s) => s.replace(/[\s ﻿]+/g, ' ').replace(/⁠/g, '').trim();
const types = (n) => (n.attrs?.['epub:type'] ?? '').split(/\s+/).filter(Boolean);
const hasType = (n, re) => types(n).some((t) => re.test(t));
const elements = (n) => n.children.filter((c) => c.tag !== '#text');

function* walk(n) {
  yield n;
  for (const c of n.children ?? []) yield* walk(c);
}
const find = (n, pred) => {
  for (const x of walk(n)) if (pred(x)) return x;
  return null;
};
const findAll = (n, pred) => [...walk(n)].filter(pred);

/* ------------------------------------------------------------------ */
/* XHTML → reader HTML                                                */
/* ------------------------------------------------------------------ */

const CONTAINERS = new Set(['section', 'article', 'div', 'header', 'footer', 'main', 'aside', 'body', 'hgroup-skip']);
const KEEP = new Set([
  'p', 'em', 'i', 'strong', 'b', 'sup', 'sub', 'small', 'blockquote', 'ol', 'ul', 'li', 'dl', 'dt', 'dd',
  'figure', 'figcaption', 'cite', 'code', 'pre', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 's', 'u',
]);
const VOID = new Set(['br', 'hr']);
const DROP = new Set(['script', 'style', 'nav', 'head', 'title', 'link', 'meta']);
const HEADING = /^h[1-6]$/;
const VERSE = /^z3998:(poem|verse|song|hymn|lyrics)$/;

class Renderer {
  constructor(book, filePath, zip, images) {
    this.book = book;
    this.filePath = filePath;
    this.zip = zip;
    this.images = images;
  }

  attrs(n, extraClass) {
    const out = [];
    const cls = [];
    if (extraClass) cls.push(extraClass);
    const raw = n.attrs?.class ?? '';
    for (const c of raw.split(/\s+/)) if (/^i\d$/.test(c)) cls.push(c);
    if (cls.length) out.push(`class="${cls.join(' ')}"`);
    const lang = n.attrs?.['xml:lang'] ?? n.attrs?.lang;
    if (lang && n.tag !== 'html') out.push(`lang="${lang}"`);
    return out.length ? ' ' + out.join(' ') : '';
  }

  image(n) {
    const src = n.attrs.src;
    if (!src) return '';
    const abs = path.posix.normalize(path.posix.join(path.posix.dirname(this.filePath), src));
    const hi = abs.replace(/(\.\w+)$/, '-2x$1');
    const source = this.zip[hi] ? hi : abs;
    if (!this.zip[source]) return '';
    const base = path.posix.basename(abs).replace(/\.\w+$/, '');
    const isSvg = abs.endsWith('.svg');
    const isLineArt = hasType(n, /color-depth\.black-on-transparent/);
    const outName = `${base}.${isSvg ? 'svg' : isLineArt ? 'png' : 'webp'}`;
    this.images.set(outName, source);
    const lineArt = isLineArt ? ' class="line-art"' : '';
    const alt = escapeHtml(decode(n.attrs.alt ?? ''));
    // Width/height are filled in after the image is processed (see processImages) to avoid layout shift.
    return `<img src="books/${this.book.id}/img/${outName}" alt="${alt}"${lineArt} data-size="${outName}">`;
  }

  dramaTable(n) {
    const rows = findAll(n, (x) => x.tag === 'tr');
    return rows
      .map((tr) => {
        const cells = elements(tr).filter((c) => c.tag === 'td' || c.tag === 'th');
        if (!cells.length) return '';
        const content = cells[cells.length - 1];
        const persona = cells.length > 1 ? clean(textOf(cells[0])) : '';
        const body = this.children(content);
        if (!persona) return `<div class="speech direction">${body}</div>`;
        return `<div class="speech"><b class="persona">${escapeHtml(persona)}</b><div class="lines">${body}</div></div>`;
      })
      .join('');
  }

  children(n) {
    return n.children.map((c) => this.node(c)).join('');
  }

  node(n) {
    // Collapse source indentation only; typographic spaces (hair, no-break) are meaningful.
    if (n.tag === '#text') return n.text.replace(/[ \t\r\n]+/g, ' ');
    const tag = n.tag;
    if (DROP.has(tag)) return '';
    if (tag === 'a') return hasType(n, /noteref/) ? '' : this.children(n);
    if (tag === 'img') return this.image(n);
    if (VOID.has(tag)) return `<${tag}>`;
    if (HEADING.test(tag)) {
      const level = Number(tag[1]) <= 3 ? 3 : 4;
      return `<h${level}>${escapeHtml(clean(textOf(n)))}</h${level}>`;
    }
    if (tag === 'hgroup') {
      const parts = elements(n).map((c) => escapeHtml(clean(textOf(c)))).filter(Boolean);
      return `<h3>${parts[0] ?? ''}${parts.slice(1).map((p) => `<span class="sub">${p}</span>`).join('')}</h3>`;
    }
    if (tag === 'table' && find(n, (x) => hasType(x, /z3998:persona/) || hasType(x, /z3998:stage-direction/))) {
      return this.dramaTable(n);
    }
    if (tag === 'span') {
      const a = this.attrs(n);
      return a.includes('class=') ? `<span${a}>${this.children(n)}</span>` : this.children(n);
    }
    if (tag === 'p') {
      const cls = hasType(n, /^bridgehead$/) ? 'bridgehead' : hasType(n, /z3998:signature/) ? 'signature' : '';
      return `<p${this.attrs(n, cls)}>${this.children(n)}</p>`;
    }
    if (tag === 'b' && hasType(n, /z3998:persona/)) return `<b class="persona">${this.children(n)}</b>`;
    if (tag === 'i' && hasType(n, /z3998:stage-direction/)) return `<i class="stage">${this.children(n)}</i>`;
    if (CONTAINERS.has(tag) || tag === 'blockquote') {
      const special = this.specialClass(n);
      if (special) return `<${special.tag} class="${special.cls}">${this.children(n)}</${special.tag}>`;
      if (tag === 'blockquote') return `<blockquote${this.attrs(n)}>${this.children(n)}</blockquote>`;
      return this.children(n);
    }
    if (KEEP.has(tag)) return `<${tag}${this.attrs(n)}>${this.children(n)}</${tag}>`;
    return this.children(n); // abbr, time, q, dfn, … → keep text only
  }

  specialClass(n) {
    if (types(n).some((t) => VERSE.test(t))) return { tag: n.tag === 'blockquote' ? 'blockquote' : 'div', cls: 'verse' };
    if (hasType(n, /^epigraph$/)) return { tag: 'blockquote', cls: 'epigraph' };
    if (hasType(n, /z3998:letter/)) return { tag: 'div', cls: 'letter' };
    if (hasType(n, /^dedication$/)) return { tag: 'div', cls: 'dedication' };
    return null;
  }

  /**
   * Flattens a document into top-level blocks, emitting split markers for the given ids.
   * Containers are unwrapped so that chapters can be split at any section boundary.
   */
  flatten(n, splitIds, out) {
    const id = n.attrs?.id;
    if (id && splitIds.has(id)) out.push({ marker: id, type: types(n) });
    if (n.tag === '#text') {
      if (clean(decode(n.text))) out.push({ html: `<p>${n.text.trim()}</p>`, heading: false });
      return;
    }
    if (DROP.has(n.tag)) return;
    const special = this.specialClass(n);
    if ((CONTAINERS.has(n.tag) || n.tag === '#root') && !special) {
      if (!out.sectionType && n.tag === 'section') out.sectionType = types(n);
      for (const c of n.children) this.flatten(c, splitIds, out);
      return;
    }
    if (special) {
      // Hoist leading headings (e.g. a poem's title) so they can serve as chapter titles.
      const kids = [...n.children];
      while (kids.length) {
        const k = kids[0];
        if (k.tag === '#text' && !clean(k.text)) { kids.shift(); continue; }
        if (HEADING.test(k.tag) || k.tag === 'hgroup' || k.tag === 'header') {
          out.push({ html: this.node(k), heading: true, text: clean(textOf(k)) });
          kids.shift();
          continue;
        }
        break;
      }
      const inner = kids.map((c) => this.node(c)).join('');
      for (const x of walk({ children: kids })) {
        // Deeper TOC anchors (e.g. stanzas of a long poem) stay inside their parent chapter.
        if (x !== n && x.attrs?.id && splitIds.has(x.attrs.id)) splitIds.delete(x.attrs.id);
      }
      out.push({ html: `<${special.tag} class="${special.cls}">${inner}</${special.tag}>`, heading: false });
      return;
    }
    const isHeading = HEADING.test(n.tag) || n.tag === 'hgroup';
    out.push({ html: this.node(n), heading: isHeading, text: isHeading ? clean(textOf(n)) : undefined });
  }
}

/* ------------------------------------------------------------------ */
/* EPUB reading                                                       */
/* ------------------------------------------------------------------ */

function readOpf(xml) {
  const doc = parseXml(xml);
  const metadata = find(doc, (n) => n.tag === 'metadata');
  const metas = elements(metadata);
  const refines = (id, prop) =>
    metas.filter((m) => m.tag === 'meta' && m.attrs.refines === `#${id}` && m.attrs.property === prop).map((m) => clean(textOf(m)));
  const prop = (p) => metas.filter((m) => m.tag === 'meta' && m.attrs.property === p).map((m) => clean(textOf(m)));
  const dc = (t) => metas.filter((m) => m.tag === `dc:${t}`);

  const titles = dc('title');
  const main = titles.find((t) => refines(t.attrs.id, 'title-type')[0] === 'main') ?? titles[0];
  const sub = titles.find((t) => refines(t.attrs.id, 'title-type')[0] === 'subtitle');
  const creators = dc('creator').map((c) => ({ name: clean(textOf(c)), sort: refines(c.attrs.id, 'file-as')[0] ?? clean(textOf(c)) }));
  const contributors = dc('contributor').map((c) => ({ name: clean(textOf(c)), roles: refines(c.attrs.id, 'role') }));

  const manifest = new Map();
  for (const item of findAll(doc, (n) => n.tag === 'item')) manifest.set(item.attrs.id, item.attrs.href);
  const spine = findAll(doc, (n) => n.tag === 'itemref').map((r) => manifest.get(r.attrs.idref));

  return {
    title: clean(textOf(main)),
    subtitle: sub ? clean(textOf(sub)) : undefined,
    creators,
    translators: contributors.filter((c) => c.roles.includes('trl')).map((c) => c.name),
    illustrators: contributors.filter((c) => c.roles.includes('ill')).map((c) => c.name),
    description: dc('description')[0] ? decode(textOf(dc('description')[0])) : '',
    abstract: prop('schema:abstract')[0] ?? '',
    words: Number(prop('schema:wordCount')[0] ?? 0),
    readingEase: Number(prop('schema:educationalLevel')[0] ?? 0),
    subjects: dc('subject').map((s) => clean(textOf(s))),
    collections: prop('belongs-to-collection'),
    language: clean(textOf(dc('language')[0] ?? { tag: '#text', text: 'en' })),
    spine,
  };
}

function readToc(xml) {
  const doc = parseXml(xml);
  const nav = find(doc, (n) => n.tag === 'nav' && hasType(n, /^toc$/));
  const entries = [];
  const visit = (ol, parent, depth) => {
    for (const li of elements(ol).filter((c) => c.tag === 'li')) {
      const a = elements(li).find((c) => c.tag === 'a');
      if (!a) continue;
      const [file, frag] = a.attrs.href.split('#');
      const entry = {
        file: path.posix.basename(file),
        frag,
        label: clean(textOf(a)),
        parent,
        depth,
        hasChildren: false,
        numeral: hasType(a, /z3998:(roman|ordinal)/),
      };
      entries.push(entry);
      const sub = elements(li).find((c) => c.tag === 'ol');
      if (sub) {
        entry.hasChildren = true;
        visit(sub, entry, depth + 1);
      }
    }
  };
  visit(elements(nav).find((c) => c.tag === 'ol'), null, 0);
  return entries;
}

const SKIP_FILE = /^(titlepage|imprint|halftitlepage|half-title-page|colophon|uncopyright|endnotes|loi|toc|copyright)/;
const MERGE_FORWARD_FILE = /^(dedication|epigraph)/;
const BARE_NUMERAL = /^([IVXLCDM]+|\d+)\.?$/;

function buildChapters(book, zip, opf, toc, images) {
  const chunks = [];
  for (const href of opf.spine) {
    const file = path.posix.basename(href);
    const stem = file.replace(/\.xhtml$/, '');
    if (SKIP_FILE.test(stem)) continue;
    const filePath = `epub/${href}`;
    const doc = parseXml(strFromU8(zip[filePath]));
    const body = find(doc, (n) => n.tag === 'body');
    const fileEntries = toc.filter((e) => e.file === file);
    const fileEntry = fileEntries.find((e) => !e.frag);
    const fragEntries = new Map(fileEntries.filter((e) => e.frag).map((e) => [e.frag, e]));

    const renderer = new Renderer(book, filePath, zip, images);
    const blocks = [];
    renderer.flatten(body, new Set(fragEntries.keys()), blocks);

    const headTitle = clean(textOf(find(doc, (n) => n.tag === 'title') ?? { tag: '#text', text: '' }));
    let current = { entry: fileEntry, blocks: [], type: blocks.sectionType ?? types(body), fallback: headTitle, stem };
    chunks.push(current);
    for (const b of blocks) {
      if (b.marker) {
        current = { entry: fragEntries.get(b.marker), blocks: [], type: b.type, fallback: '', stem };
        chunks.push(current);
      } else {
        current.blocks.push(b);
      }
    }
  }

  // Strip leading headings (rendered by the reader itself) and measure.
  for (const c of chunks) {
    const stripped = [];
    while (c.blocks.length && c.blocks[0].heading) stripped.push(c.blocks.shift().text);
    if (!c.fallback && stripped.length) c.fallback = stripped.join(': ');
    c.html = tidy(c.blocks.map((b) => b.html).join('\n'));
    c.words = countWords(c.html);
  }

  // Merge structural/front-matter stubs forward, drop empties.
  const out = [];
  let carry = '';
  for (const c of chunks) {
    if (c.words === 0) continue;
    const isContainer = c.entry?.hasChildren && c.words < 120;
    const isStub = MERGE_FORWARD_FILE.test(c.stem) && c.words < 80;
    if (isContainer || isStub) {
      carry += c.html + '\n';
      continue;
    }
    let title = c.entry?.label || c.fallback || `Section ${out.length + 1}`;
    if (BARE_NUMERAL.test(title) && c.type.includes('chapter')) title = `Chapter ${title.replace(/\.$/, '')}`;
    const parentLabel = c.entry?.parent?.label;
    const part = parentLabel && parentLabel.toLowerCase() !== opf.title.toLowerCase() ? parentLabel : undefined;
    const html = carry + c.html;
    carry = '';
    out.push({ title, part: part && part !== title ? part : undefined, html, words: countWords(html) });
  }
  if (carry && out.length) {
    out[out.length - 1].html += '\n' + carry;
    out[out.length - 1].words = countWords(out[out.length - 1].html);
  }
  return out.flatMap((c) => splitLongChapter(c, opf.title));
}

/** Splits very long chapters (e.g. a novel without chapters) at scene breaks into ~6k-word sections. */
function splitLongChapter(chapter, bookTitle) {
  if (chapter.words < 14000 || !chapter.html.includes('<hr>')) return [chapter];
  const scenes = chapter.html.split(/\n?<hr>\n?/);
  const groups = [];
  let current = [];
  let words = 0;
  for (const scene of scenes) {
    current.push(scene);
    words += countWords(scene);
    if (words >= 6000) {
      groups.push(current.join('\n<hr>\n'));
      current = [];
      words = 0;
    }
  }
  if (current.length) {
    const rest = current.join('\n<hr>\n');
    if (groups.length && countWords(rest) < 2000) groups[groups.length - 1] += '\n<hr>\n' + rest;
    else groups.push(rest);
  }
  const part = chapter.title.toLowerCase() === bookTitle.toLowerCase() ? chapter.part : chapter.title;
  return groups.map((html, i) => ({ title: `Section ${i + 1}`, part, html, words: countWords(html) }));
}

const BLOCK_TAGS = 'p|div|blockquote|h3|h4|br|hr|li|ul|ol|dl|dt|dd|figure|figcaption|table|thead|tbody|tr|td|th|caption|img';
const AROUND_BLOCK = new RegExp(`[ \\t\\r\\n]*(</?(?:${BLOCK_TAGS})\\b[^>]*>)[ \\t\\r\\n]*`, 'g');
const tidy = (html) => html.replace(AROUND_BLOCK, '$1').replace(/(<\/(?:p|div|blockquote|h3|h4|figure|ul|ol|table)>)(?=<)/g, '$1\n').trim();

function countWords(html) {
  const text = decode(html.replace(/<[^>]+>/g, ' '));
  const m = text.match(/[\p{L}\p{N}’']+/gu);
  return m ? m.length : 0;
}

/* ------------------------------------------------------------------ */
/* Images & colour                                                    */
/* ------------------------------------------------------------------ */

function magick(args, input) {
  return execFileSync('convert', args, { input, maxBuffer: 64 * 1024 * 1024 });
}

function processCover(id, coverBytes) {
  fs.mkdirSync(OUT_COVERS, { recursive: true });
  // Standard Ebooks covers are 1400×2100 with a title band in the lower third;
  // the upper square is pure artwork, which we frame with our own typography.
  for (const size of [240, 480]) {
    magick(['jpg:-', '-gravity', 'North', '-crop', '1400x1400+0+0', '+repage', '-resize', `${size}x${size}`, '-strip', '-quality', '74', `webp:${path.join(OUT_COVERS, `${id}-${size}.webp`)}`], coverBytes);
  }
  const hist = magick(['jpg:-', '-gravity', 'North', '-crop', '1400x1400+0+0', '+repage', '-resize', '64x64!', '-colors', '8', '-depth', '8', '-format', '%c', 'histogram:info:-'], coverBytes).toString();
  const colors = [...hist.matchAll(/(\d+):\s*\(\s*(\d+),\s*(\d+),\s*(\d+)/g)].map((m) => ({ count: +m[1], rgb: [+m[2], +m[3], +m[4]] }));
  let best = colors[0];
  let bestScore = -1;
  for (const c of colors) {
    const [h, s, l] = rgbToHsl(...c.rgb);
    const score = c.count * (0.35 + s) * (l > 0.08 && l < 0.85 ? 1 : 0.4);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  const [h, s] = rgbToHsl(...best.rgb);
  return {
    color: hslToHex(h, Math.min(s, 0.42) * 0.9, 0.2),
    accent: hslToHex(h, Math.min(s * 0.8, 0.5), 0.78),
  };
}

function processImages(id, zip, images) {
  const sizes = new Map();
  if (!images.size) return sizes;
  const dir = path.join(OUT_BOOKS, id, 'img');
  fs.mkdirSync(dir, { recursive: true });
  for (const [outName, source] of images) {
    const dest = path.join(dir, outName);
    if (outName.endsWith('.svg')) {
      fs.writeFileSync(dest, zip[source]);
    } else if (outName.endsWith('.png')) {
      // Black-on-transparent line art compresses far better as a small-palette PNG.
      magick(['png:-', '-resize', '760x1200>', '-strip', '-colors', '16', `png8:${dest}`], zip[source]);
    } else {
      const ext = path.extname(source).slice(1);
      magick([`${ext}:-`, '-resize', '900x1400>', '-strip', '-quality', '78', `webp:${dest}`], zip[source]);
    }
    if (!outName.endsWith('.svg')) {
      const [w, h] = execFileSync('identify', ['-format', '%w %h', dest]).toString().trim().split(' ').map(Number);
      sizes.set(outName, { w, h });
    }
  }
  return sizes;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/* ------------------------------------------------------------------ */
/* Description cleanup                                                */
/* ------------------------------------------------------------------ */

function cleanDescription(html) {
  return html
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/g, '$1')
    .replace(/<(\/?)(?!p\b|i\b|em\b|\/p\b|\/i\b|\/em\b)[a-z][^>]*>/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/<p>\s*/g, '<p>')
    .replace(/\s*<\/p>\s*/g, '</p>')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

async function fetchEpub(book) {
  const file = book.path.replaceAll('/', '_');
  const cached = path.join(CACHE, `${file}.epub`);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);
  const url = `https://standardebooks.org/ebooks/${book.path}/downloads/${file}.epub?source=download`;
  process.stdout.write(`  downloading ${url}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cached, buf);
  return buf;
}

/** "Frankenstein's monster (Fictitious character)--Fiction" → "Frankenstein's monster" */
function cleanSubject(subject) {
  return subject
    .replace(/--.*$/, '')
    .replace(/\s*\((Fictitious character|Legendary character|Literary genre|Imaginary place|Imaginary organization|Fictitious place)\)/gi, '')
    .replace(/,\s*\d{3,4}-\d{0,4}$/, '')
    .trim();
}

function bookId(p) {
  const [author, title] = p.split('/');
  return ['short-fiction', 'poetry', 'essays', 'plays', 'dialogues'].includes(title) ? `${author}-${title}` : title;
}

async function main() {
  const genreIds = new Set(GENRES.map((g) => g.id));
  const existing = fs.existsSync(OUT_CATALOG) ? loadExistingCatalog() : new Map();
  const records = [];
  const seen = new Set();

  for (const entry of BOOKS) {
    const id = bookId(entry.path);
    if (seen.has(id)) throw new Error(`Duplicate id ${id}`);
    seen.add(id);
    for (const g of entry.genres) if (!genreIds.has(g)) throw new Error(`Unknown genre ${g} in ${id}`);

    if (only.length && !only.includes(id)) {
      if (existing.has(id)) records.push(existing.get(id));
      continue;
    }

    console.log(`• ${id}`);
    const zip = unzipSync(new Uint8Array(await fetchEpub(entry)));
    const opf = readOpf(strFromU8(zip['epub/content.opf']));
    const toc = readToc(strFromU8(zip['epub/toc.xhtml']));
    const book = { id };
    const images = new Map();
    const chapters = buildChapters(book, zip, opf, toc, images);

    const dir = path.join(OUT_BOOKS, id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const sizes = processImages(id, zip, images);
    const withSizes = (html) =>
      html.replace(/ data-size="([^"]+)"/g, (_, name) => (sizes.has(name) ? ` width="${sizes.get(name).w}" height="${sizes.get(name).h}"` : ''));
    chapters.forEach((c, i) => fs.writeFileSync(path.join(dir, `${i}.html`), withSizes(c.html)));
    fs.writeFileSync(
      path.join(dir, 'toc.json'),
      JSON.stringify({ chapters: chapters.map((c) => ({ title: c.title, ...(c.part ? { part: c.part } : {}), words: c.words })) }),
    );
    const cover = processCover(id, Buffer.from(zip['epub/images/cover.jpg']));

    const words = chapters.reduce((s, c) => s + c.words, 0);
    const author = opf.creators.map((c) => c.name).join(' & ');
    records.push({
      id,
      title: opf.title,
      ...(opf.subtitle ? { subtitle: opf.subtitle } : {}),
      author,
      authorId: entry.path.split('/')[0],
      authorSort: opf.creators[0]?.sort ?? author,
      ...(opf.translators.length ? { translator: opf.translators.join(' & ') } : {}),
      ...(opf.illustrators.length ? { illustrator: opf.illustrators.join(' & ') } : {}),
      year: entry.year,
      genres: entry.genres,
      tagline: opf.abstract,
      description: cleanDescription(opf.description),
      subjects: [...new Set(opf.subjects.map(cleanSubject).filter(Boolean))],
      collections: opf.collections,
      words,
      chapters: chapters.length,
      readingEase: Math.round(opf.readingEase * 10) / 10,
      language: opf.language,
      cover,
      source: `https://standardebooks.org/ebooks/${entry.path}`,
    });
    console.log(`  ${chapters.length} chapters, ${words.toLocaleString()} words, ${images.size} images`);
  }

  writeCatalog(records);
  console.log(`\nWrote ${records.length} books to ${path.relative(ROOT, OUT_CATALOG)}`);
}

function loadExistingCatalog() {
  const src = fs.readFileSync(OUT_CATALOG, 'utf8');
  const marker = 'BOOKS: BookRecord[] = ';
  const json = src.slice(src.indexOf(marker) + marker.length, src.lastIndexOf(']') + 1);
  return new Map(JSON.parse(json).map((b) => [b.id, b]));
}

function writeCatalog(records) {
  fs.mkdirSync(path.dirname(OUT_CATALOG), { recursive: true });
  const genres = GENRES.map((g) => ({ ...g, count: records.filter((r) => r.genres.includes(g.id)).length }));
  const body = `/* eslint-disable */
// AUTO-GENERATED by scripts/import-books.mjs — do not edit by hand.
// Texts and cover art: Standard Ebooks (https://standardebooks.org), CC0 1.0 public domain dedication.
import type { BookRecord, GenreRecord } from '../models/book.model';

export const GENRES: GenreRecord[] = ${JSON.stringify(genres, null, 2)};

export const BOOKS: BookRecord[] = ${JSON.stringify(records, null, 2)};
`;
  fs.writeFileSync(OUT_CATALOG, body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
