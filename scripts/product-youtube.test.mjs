import { test } from 'node:test';
import assert from 'node:assert/strict';
import { youtubeVideoId, youtubeEmbedUrl, youtubeThumbnailUrl } from '../src/product/youtube.mjs';

test('YouTube URLs produce privacy-enhanced embeds and provider-hosted thumbnails', () => {
  const watch = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  assert.equal(youtubeVideoId(watch), 'dQw4w9WgXcQ');
  assert.equal(youtubeEmbedUrl(watch), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(youtubeThumbnailUrl(watch), 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  assert.equal(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeVideoId('https://m.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('YouTube preview rejects lookalikes, credentials, non-HTTPS and malformed ids', () => {
  for (const value of [
    'https://youtube.example/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'http://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=too-short',
  ])
    assert.equal(youtubeVideoId(value), null);
});
