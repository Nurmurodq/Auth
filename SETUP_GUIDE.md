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
   - With email, a **6-digit code** is sent to your inbox. Enter it on the *Check your email* screen. Check spam if it's slow to arrive, and you can request a new code after 60 seconds. Google accounts skip this step, because Google has already verified the address.
   - Next comes a short **welcome questionnaire**: what you do, why you read, favourite genres and moods, and preferred length and difficulty. Your first personal picks appear at the end.
   - The home page then shows **"Picked for you"**, and each book says why it was chosen. Change your answers anytime under *Account → Reading interests*.
4. **Switch language**: open the globe menu in the header and choose *Русский* or *Oʻzbekcha*. Everything switches instantly and stays that way next time. You can also open `http://localhost:4200/?lang=uz`.
5. **Organise**: favourite books, add them to *Want to read*, and see everything under *My Library*.
6. **Track**: *Account & stats* shows your streak, daily goal and reading-time chart.

## 3. Google sign-in and going live

Google sign-in works out of the box through Neon's shared development credentials, so Google's consent screen shows Neon's name. Before launching publicly:

1. In Google Cloud Console, create an OAuth client (type **Web application**). Add this authorized redirect URI:
   `https://ep-lingering-fog-ar4uglrw.neonauth.c-4.us-west-2.aws.neon.tech/neondb/auth/callback/google`
2. In the Neon Console, open project **folio** → branch **main** → **Settings → Auth**. Add Google as an OAuth provider using your client ID and secret.
3. On the same page, add your site's domain to **Trusted domains** and turn off **Allow localhost**.
4. Under **Email provider**, connect your own SMTP sender (Resend, Postmark, Amazon SES and so on). Verification codes come from Neon's shared `auth@mail.myneon.app` until you do, and that sender is rate-limited.

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
4. Keep **Confirm email** on, and edit Authentication → Emails → **Confirm signup** so the email includes the code `{{ .Token }}`.
5. Restart `npm start`. Sign-up now emails a 6-digit code, and your library syncs across devices.

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

The unit tests include a check that every English message has a Russian and an Uzbek translation with matching placeholders.

## Troubleshooting

- **The sign-in page says "your account is kept securely on this device"**, or a hosted copy can't use cloud accounts: Neon only accepts sign-ups and sign-ins from its trusted web addresses (`localhost` and `http://127.0.0.1:4200` are allowed). Add your site's exact address, such as `https://your-app.vercel.app`, under Neon Console → project **folio** → **Settings → Auth → Trusted domains**. Until then, Folio keeps accounts on the device for that address, so everything still works, just without syncing. It tries the cloud again after a day.
- **Opening the dev server from a phone on your Wi-Fi** (for example `http://192.168.1.20:4200`): run `npm start -- --host 0.0.0.0`. Plain-HTTP network addresses aren't trusted by Neon, so accounts there are kept on the phone, and Folio's built-in fallbacks handle the browser features that only exist on secure (HTTPS) pages.
- **Google sign-in returns to the sign-in page with an error**: the site's domain probably isn't in Neon's trusted domains. Add it under Neon Console → Settings → Auth.
- **The verification code never arrives**: check spam and promotions, then use *Send a new code*. Codes expire after 5 minutes, and only the newest one works. For reliable delivery in production, connect your own email provider (see section 3).
- **Animations don't play**: your system's *reduce motion* setting is on, so Folio deliberately shows everything without movement. Cover tilt and spotlights only respond to a mouse, not to touch.
- **Dates in Uzbek look unusual**: some browsers lack Uzbek locale data. Folio then formats Uzbek dates and numbers itself, so they read like "23-noyabr, 2026".
- **"Secure sign-in needs HTTPS"**: local mode uses the WebCrypto API, which browsers only allow on `https://` or `localhost`.
- **A book or chapter won't load**: make sure the host serves files under `/books/` directly rather than rewriting them to `index.html`.
- **Re-importing books**: `npm run import-books` needs ImageMagick (`convert`, `identify`) and internet access to standardebooks.org.
