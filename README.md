# FLOURA – Period & Cycle Tracker

A local-first menstrual cycle tracker built with React, TypeScript and Vite. User records are stored on the device in IndexedDB.

## Requirements
- Node.js 20.19+ or 22.12+ (Vite 8 requirement)
- npm

## Run locally
```bash
npm install
npm run dev
```

## Create a production PWA build
```bash
npm run build
npm run preview
```
Open the preview URL shown by Vite. The production build generates a web app manifest and service worker in `dist/`.

## Install
Deploy the contents of `dist/` to a static HTTPS host (for example Netlify, Vercel, or Cloudflare Pages), then open the deployed URL in Chrome or another supported browser and choose **Install app** / **Add to Home screen**. Service workers and PWA installation require HTTPS in production (localhost is allowed for development).

## Data and privacy
Cycle entries, daily logs, profile information, settings, and activity records are stored locally in the browser using IndexedDB. They are not automatically synced between devices. Clearing browser/site data can remove locally stored records, so use the app's backup/export feature regularly and keep backups private.

## Notes
- The service worker provides offline access to the built application shell and cached static assets. Features that require an internet connection will remain unavailable offline.
- Browser notification delivery and background reminders depend on browser and operating-system support; do not rely on this app as a medical or contraceptive tool.
