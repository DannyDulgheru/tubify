require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

app.use(express.static(path.join(__dirname, 'public')));

// Search endpoint – proxies YouTube Data API v3
app.get('/api/search', async (req, res) => {
  const { q, pageToken, maxResults = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
  if (!YT_API_KEY) return res.status(500).json({ error: 'YouTube API key not configured on server' });

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q,
      type: 'video',
      videoCategoryId: '10', // Music category
      maxResults: String(maxResults),
      key: YT_API_KEY,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const searchResp = await fetch(`${YT_API_BASE}/search?${params}`);
    if (!searchResp.ok) {
      const err = await searchResp.json();
      return res.status(searchResp.status).json({ error: err.error?.message || 'YouTube API error' });
    }
    const searchData = await searchResp.json();

    // Fetch video durations in one batch call
    const ids = searchData.items.map(i => i.id.videoId).filter(Boolean).join(',');
    const detailsParams = new URLSearchParams({ part: 'contentDetails,statistics', id: ids, key: YT_API_KEY });
    const detailsResp = await fetch(`${YT_API_BASE}/videos?${detailsParams}`);
    const detailsData = detailsResp.ok ? await detailsResp.json() : { items: [] };
    const detailsMap = {};
    (detailsData.items || []).forEach(v => { detailsMap[v.id] = v; });

    const tracks = searchData.items
      .filter(item => item.id?.videoId)
      .map(item => {
        const detail = detailsMap[item.id.videoId] || {};
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          duration: parseDuration(detail.contentDetails?.duration),
          durationRaw: detail.contentDetails?.duration || '',
          views: parseInt(detail.statistics?.viewCount || '0', 10),
        };
      });

    res.json({ tracks, nextPageToken: searchData.nextPageToken || null });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Video details (for track info when adding from URL)
app.get('/api/video/:id', async (req, res) => {
  const { id } = req.params;
  if (!YT_API_KEY) return res.status(500).json({ error: 'YouTube API key not configured on server' });
  try {
    const params = new URLSearchParams({ part: 'snippet,contentDetails', id, key: YT_API_KEY });
    const resp = await fetch(`${YT_API_BASE}/videos?${params}`);
    if (!resp.ok) return res.status(resp.status).json({ error: 'YouTube API error' });
    const data = await resp.json();
    const item = data.items?.[0];
    if (!item) return res.status(404).json({ error: 'Video not found' });
    res.json({
      id: item.id,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      duration: parseDuration(item.contentDetails?.duration),
      durationRaw: item.contentDetails?.duration || '',
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fallback: serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function parseDuration(iso) {
  if (!iso) return '0:00';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

app.listen(PORT, () => {
  console.log(`✅ Tubify running on http://localhost:${PORT}`);
  if (!YT_API_KEY) console.warn('⚠️  YOUTUBE_API_KEY not set – search will not work');
});
