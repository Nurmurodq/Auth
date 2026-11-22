import { Injectable } from '@angular/core';
import { BookToc } from '../models/book.model';

/** Loads tables of contents and chapter fragments, with in-memory caching and de-duplication. */
@Injectable({ providedIn: 'root' })
export class BookContentService {
  private readonly tocs = new Map<string, Promise<BookToc>>();
  private readonly chapters = new Map<string, Promise<string>>();
  private readonly maxCachedChapters = 24;

  toc(bookId: string): Promise<BookToc> {
    let p = this.tocs.get(bookId);
    if (!p) {
      p = this.fetchText(`books/${bookId}/toc.json`).then((t) => JSON.parse(t) as BookToc);
      p.catch(() => this.tocs.delete(bookId));
      this.tocs.set(bookId, p);
    }
    return p;
  }

  chapter(bookId: string, index: number): Promise<string> {
    const key = `${bookId}/${index}`;
    let p = this.chapters.get(key);
    if (!p) {
      p = this.fetchText(`books/${bookId}/${index}.html`);
      p.catch(() => this.chapters.delete(key));
      this.chapters.set(key, p);
      if (this.chapters.size > this.maxCachedChapters) {
        const oldest = this.chapters.keys().next().value;
        if (oldest) this.chapters.delete(oldest);
      }
    }
    return p;
  }

  prefetch(bookId: string, index: number): void {
    this.chapter(bookId, index).catch(() => undefined);
  }

  private async fetchText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const type = res.headers.get('content-type') ?? '';
    const text = await res.text();
    // SPA hosts may answer unknown paths with index.html; treat that as missing content.
    if (type.includes('text/html') && /<app-root/i.test(text)) throw new Error('Not found');
    return text;
  }
}
