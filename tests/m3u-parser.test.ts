import { parseM3u } from '../src/utils/m3u-parser.js';

const playlist = `#EXTM3U
#EXTINF:-1 tvg-id="news.ar" tvg-logo="https://example.com/news.png" group-title="News;General",News Argentina
#EXTVLCOPT:http-user-agent=Example Browser
https://example.com/news/playlist.m3u8
#EXTINF:-1 tvg-logo="https://example.com/blocked.png" group-title="Movies",Movie [Geo-blocked]
http://example.com/movie/playlist.m3u8
#EXTINF:-1 tvg-logo="https://example.com/missing-url.png" group-title="Music",Missing URL`;

test('parses channels and ignores M3U option lines between metadata and URL', () => {
  const channels = parseM3u(playlist, 'Argentina');

  expect(channels).toHaveLength(2);
  expect(channels[0]).toEqual(expect.objectContaining({
    name: 'News Argentina',
    logoUrl: 'https://example.com/news.png',
    streamUrl: 'https://example.com/news/playlist.m3u8',
    country: 'Argentina',
    categories: ['News', 'General'],
    isActive: true,
    tvgId: 'news.ar',
    streamType: 'hls',
    httpUserAgent: 'Example Browser'
  }));
  expect(channels[1]).toEqual(expect.objectContaining({ isActive: false }));
});

test('requires a country for imported channels', () => {
  expect(() => parseM3u(playlist, '   ')).toThrow('Country is required');
});
