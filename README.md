# Game Music Player

A static HTML5 game-music player designed to run on GitHub Pages.

## Features

- Playlist loaded from `tracks.json`
- Play/pause/next/previous
- Shuffle and repeat
- Seeking and volume
- Search by title, game, or composer
- Chosen and blocked tracks
- Local persistence with `localStorage`
- Import/export player settings
- Keyboard controls
- Responsive layout
- No backend required

## Setup

1. Put this repository on GitHub.
2. Replace the example URLs in `tracks.json` with URLs to audio files you are allowed to distribute.
3. Enable GitHub Pages for the repository.
4. Open the published Pages URL.

For local testing, use a local HTTP server rather than opening `index.html` directly:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Audio hosting

For a substantial music library, keep the audio outside GitHub Pages.

Recommended architecture:

GitHub Pages
  -> HTML/CSS/JS + tracks.json

Cloudflare R2 / Backblaze B2
  -> MP3/OGG files

The browser streams the audio directly from object storage.

If the audio host is on another domain and you use Web Audio API features later, configure CORS on the audio bucket.
