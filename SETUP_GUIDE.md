# Quick setup guide

## 1. Install and run

```bash
npm install
npm start
```

Open http://localhost:4200. The app is already connected to its **Neon** backend, so you can sign up with email or **Continue with Google** right away.

To work offline, with accounts and data kept only in your browser, run `npm run start:local` instead.

## 2. Try the main flows

1. **Browse**: open *Browse*, filter by genre or reading time, or press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> to search.
2. **Read**: open any book and press *Start reading*. In the reader, try:
   - <kbd>A</kbd> appearance: theme, typeface, size, spacing, scroll or page layout
   - <kbd>T</kbd> contents and bookmarks
   - <kbd>B</kbd> bookmark the current page
   - <kbd>←</kbd>/<kbd>→</kbd> turn pages (page layout) or change chapters (scroll layout)
   - <kbd>?</kbd> list all shortcuts
3. **Create an account** with *Get started*: use *Sign up with Google* or your email. Reading you did as a guest is kept.
   - Next comes a short **welcome questionnaire**: what you do, why you read, favourite genres and moods, and preferred length and difficulty. Your first personal picks appear at the end.
   - The home page then shows **"Picked for you"**, and each book says why it was chosen. Change your answers anytime under *Account → Reading interests*.
4. **Organise**: favourite books, add them to *Want to read*, and see everything under *My Library*.
5. **Track**: *Account & stats* shows your streak, daily goal and reading-time chart.

## 3. Google sign-in and going live

Google sign-in works out of the box through Neon's shared development credentials, so Google's consent screen shows Neon's name. Before launching publicly:

1. In Google Cloud Console, create an OAuth client (type **Web application**). Add this authorized redirect URI:
   `https://ep-lingering-fog-ar4uglrw.neonauth.c-4.us-west-2.aws.neon.tech/neondb/auth/callback/google`
2. In the Neon Console, open project **folio** → branch **main** → **Settings → Auth**. Add Google as an OAuth provider using your client ID and secret.
3. On the same page, add your site's domain to **Trusted domains** and turn off **Allow localhost**.

## 4. Use Supabase instead (optional)

1. In the Supabase SQL editor, run the files in `supabase/migrations/` in order.
2. Under Authentication → URL configuration, add your site URL and `<site>/reset-password` as a redirect URL.
3. In `src/environments/environment.ts`, set:
   ```ts
   backend: 'supabase',
   supabaseUrl: 'https://<project>.supabase.co',
   supabaseAnonKey: '<anon or publishable key>',
   supabaseGoogle: true, // only after enabling Google under Authentication → Providers
   ```
4. Restart `npm start`. Sign-up now sends a confirmation email, and your library syncs across devices.

To make a user an administrator (the `profiles.role` column is kept for future admin tooling):

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

## 5. Build for production

```bash
npm run build
```

Deploy `dist/folio/browser` to any static host, configured to rewrite unknown paths to `/index.html`.

## 6. Run the tests

```bash
npm test
```

## Troubleshooting

- **Google sign-in returns to the sign-in page with an error**: the site's domain probably isn't in Neon's trusted domains. Add it under Neon Console → Settings → Auth.
- **"Secure sign-in needs HTTPS"**: local mode uses the WebCrypto API, which browsers only allow on `https://` or `localhost`.
- **A book or chapter won't load**: make sure the host serves files under `/books/` directly rather than rewriting them to `index.html`.
- **Re-importing books**: `npm run import-books` needs ImageMagick (`convert`, `identify`) and internet access to standardebooks.org.
