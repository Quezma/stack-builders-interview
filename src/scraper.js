// SPIKE: Node has no native HTML parser (DOMParser is a browser API).
// Regex parsing is good enough to prove the flow. Swap for linkedom/cheerio later.

const TARGET_URL = 'https://news.ycombinator.com/';

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decode(text) {
  return text.replace(/&(?:amp|lt|gt|quot|#x27|#39|nbsp);/g, (m) => ENTITIES[m]);
}

function stripTags(html) {
  return decode(html.replace(/<[^>]*>/g, '')).trim();
}

function countWords(title) {
  return title.split(/\s+/).filter(Boolean).length;
}

// Each entry spans two <tr>: the title row and the following subtext row.
// Splitting on the submission marker keeps both together in one chunk.
function splitRows(html) {
  return html.split('<tr class="athing submission"').slice(1);
}

function parseRow(chunk) {
  const id = chunk.match(/^ id="(\d+)"/)?.[1] ?? null;
  const rank = Number(chunk.match(/<span class="rank">(\d+)\./)?.[1] ?? 0);

  const titleLink = chunk.match(/<span class="titleline"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
  const title = titleLink ? stripTags(titleLink[2]) : null;
  const url = titleLink ? decode(titleLink[1]) : null;

  // Job posts have no score and no comment link — both default to 0.
  const points = Number(chunk.match(/<span class="score"[^>]*>(\d+)\s*points?<\/span>/)?.[1] ?? 0);
  const comments = Number(chunk.match(/>(\d+)(?:&nbsp;|\s)comments?<\/a>/)?.[1] ?? 0);

  return { id, rank, title, url, points, comments, wordCount: countWords(title ?? '') };
}

export async function scrape({ url = TARGET_URL, limit = 10 } = {}) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    headers: { 'user-agent': 'hn-crawler-spike/0.0.0' },
  });
  const html = await response.text();
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status} from ${url}`), {
      status: response.status,
      durationMs,
    });
  }

  const rows = splitRows(html);
  const entries = rows.map(parseRow).filter((entry) => entry.id && entry.title);

  return {
    url,
    status: response.status,
    durationMs,
    bytes: html.length,
    totalFound: entries.length,
    entries: entries.slice(0, limit),
  };
}

export { TARGET_URL, countWords };
