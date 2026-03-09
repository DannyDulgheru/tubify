# 🎵 Tubify

A Spotify-inspired music player that streams audio from YouTube — no video, just music.

Built with **Node.js + Express** (backend) and **Vanilla JS** (frontend). No framework required. Deployable on **cPanel with Node.js support**.

---

## Features

- 🔍 **Search** YouTube for music (via YouTube Data API v3)
- 🎵 **Audio-only playback** — YouTube video is hidden, only audio plays
- ⏭️ **Full player controls** — play/pause, next/prev, shuffle, repeat
- 📋 **Playlists** — create, rename, delete, play (stored in localStorage)
- 🕘 **History** — last 50 tracks you listened to
- 📑 **Queue** — add tracks, reorder, clear
- 🎨 **Themes** — dark/light + 5 accent colors (green, purple, blue, red, orange)
- ⌨️ **Keyboard shortcuts** — Space (play/pause), ←/→ (prev/next)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 16+, Express 4 |
| Frontend | Vanilla JS (ES Modules), HTML5, CSS3 |
| YouTube | IFrame API (playback) + Data API v3 (search) |
| Storage | localStorage (playlists, history, theme prefs) |

---

## Getting Started (Local Dev)

### 1. Get a YouTube Data API v3 Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **YouTube Data API v3**
3. Go to **Credentials** → **Create API Key**
4. Copy the key

### 2. Install & Run

```bash
cd tubify
npm install

# Copy the env template and add your API key
copy .env.example .env
# Edit .env and set YOUTUBE_API_KEY=your_key_here

npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploying to cPanel (Node.js App)

### Step 1 – Upload files

Upload the `tubify` folder to your cPanel server (e.g., via File Manager or FTP).  
Make sure to upload **all files** except `node_modules/`.

```
tubify/
├── server.js
├── package.json
├── .env          ← create this on the server (see Step 3)
└── public/
    ├── index.html
    ├── css/
    └── js/
```

### Step 2 – Create a Node.js App in cPanel

1. Log into **cPanel** → find **Setup Node.js App**
2. Click **Create Application**
3. Set:
   - **Node.js version**: 16 or higher
   - **Application mode**: Production
   - **Application root**: `tubify` (the folder you uploaded)
   - **Application URL**: your domain or subdomain (e.g., `music.yourdomain.com`)
   - **Application startup file**: `server.js`
4. Click **Create**

### Step 3 – Set environment variables

In the Node.js App panel, find **Environment Variables** and add:

| Name | Value |
|---|---|
| `YOUTUBE_API_KEY` | your YouTube API key |

Or create a `.env` file in the `tubify` folder on the server:

```
YOUTUBE_API_KEY=your_youtube_api_key_here
PORT=3000
```

> ⚠️ **Never commit `.env` to git!** It's already in `.gitignore`.

### Step 4 – Install dependencies

In the cPanel Node.js App panel, click **Run NPM Install** (or SSH into the server and run `npm install`).

### Step 5 – Start the app

Click **Run** / **Restart** in the Node.js App panel.

Your app is now live at the URL you configured! 🎉

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `YOUTUBE_API_KEY` | ✅ Yes | — | YouTube Data API v3 key |
| `PORT` | No | `3000` | HTTP port (cPanel sets this automatically) |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/search?q=query` | Search YouTube for tracks |
| `GET` | `/api/video/:id` | Get details for a specific video |
| `GET` | `*` | Serves the SPA (index.html) |

The API key is **never exposed to the browser** — all YouTube API calls go through the Express server.

---

## Project Structure

```
tubify/
├── server.js             # Express server + YouTube API proxy
├── package.json
├── .env.example          # Template for environment variables
└── public/
    ├── index.html        # SPA shell
    ├── css/
    │   └── style.css     # All styles + theme variables
    └── js/
        ├── app.js        # Main app bootstrap + integration
        ├── player.js     # YouTube IFrame API wrapper
        ├── search.js     # Search + render results
        ├── queue.js      # Play queue management
        ├── playlist.js   # Playlist CRUD (localStorage)
        ├── history.js    # Listening history (localStorage)
        └── theme.js      # Theme switching
```

---

## Notes

- **YouTube IFrame API** is used for playback. The video is hidden with CSS — only audio plays.
- Playlists and history are stored in **localStorage** (browser). Clearing browser data will reset them.
- The YouTube API has a daily quota of 10,000 units. Each search uses ~100 units.
- If you hit API quota limits, you'll see an error message in the search area.

---

## License

MIT
