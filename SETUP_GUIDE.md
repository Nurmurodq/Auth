# Quick setup guide

## 1. Install and run

```bash
npm install
npm start
```

Open http://localhost:4200. No database is needed: in the default **local** mode, accounts and reading data are stored securely in your browser.

## 2. Try the main flows

1. **Browse**: open *Browse*, filter by genre or reading time, or press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> to search.
2. **Read**: open any book and press *Start reading*. In the reader, try:
   - <kbd>A</kbd> appearance: theme, typeface, size, spacing, scroll or page layout
   - <kbd>T</kbd> contents and bookmarks
   - <kbd>B</kbd> bookmark the current page
   - <kbd>←</kbd>/<kbd>→</kbd> turn pages (page layout) or change chapters (scroll layout)
   - <kbd>?</kbd> list all shortcuts
3. **Create an account** with *Get started*. Reading you did as a guest is kept.
4. **Organise**: favourite books, add them to *Want to read*, and see everything under *My Library*.
5. **Track**: *Account & stats* shows your streak, daily goal and reading-time chart.

## 3. Use Supabase (optional, for multi-device sync)

1. In the Supabase SQL editor, run the files in `supabase/migrations/` in order.
2. Under Authentication → URL configuration, add your site URL and `<site>/reset-password` as a redirect URL.
3. In `src/environments/environment.ts`, set:
   ```ts
   backend: 'supabase',
   supabaseUrl: 'https://<project>.supabase.co',
   supabaseAnonKey: '<anon or publishable key>',
   ```
4. Restart `npm start`. Sign-up now sends a confirmation email, and your library syncs across devices.

To make a user an administrator (the `profiles.role` column is kept for future admin tooling):

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

## 4. Build for production

```bash
npm run build
```

Deploy `dist/folio/browser` to any static host, configured to rewrite unknown paths to `/index.html`.

## 5. Run the tests

```bash
npm test
```

## Troubleshooting

- **"Secure sign-in needs HTTPS"**: local mode uses the WebCrypto API, which browsers only allow on `https://` or `localhost`.
- **A book or chapter won't load**: make sure the host serves files under `/books/` directly rather than rewriting them to `index.html`.
- **Re-importing books**: `npm run import-books` needs ImageMagick (`convert`, `identify`) and internet access to standardebooks.org.
