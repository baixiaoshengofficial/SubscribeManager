import fs from 'node:fs/promises';

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const dataPath = process.env.STAR_HISTORY_DATA_PATH;
const svgPath = process.env.STAR_HISTORY_SVG_PATH;

if (!repository || !dataPath || !svgPath) {
  throw new Error('GITHUB_REPOSITORY, STAR_HISTORY_DATA_PATH, and STAR_HISTORY_SVG_PATH are required.');
}

const headers = {
  Accept: 'application/vnd.github.star+json',
  'User-Agent': 'SubscribeManager-star-history'
};
if (token) headers.Authorization = `Bearer ${token}`;

function nextPage(link) {
  const match = link?.match(/<([^>]+)>;\s*rel="next"/);
  return match?.[1] || null;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}): ${url}`);
  }
  return { body: await response.json(), link: response.headers.get('link') };
}

async function fetchStarDates() {
  const dates = [];
  let url = `https://api.github.com/repos/${repository}/stargazers?per_page=100`;

  while (url) {
    const { body, link } = await fetchJson(url);
    if (!Array.isArray(body) || body.some((star) => !star.starred_at)) return null;
    dates.push(...body.map((star) => star.starred_at));
    url = nextPage(link);
  }

  return dates;
}

function toCumulativePoints(dates) {
  const dailyCounts = new Map();
  for (const date of dates) {
    const day = date.slice(0, 10);
    dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
  }

  let stars = 0;
  return [...dailyCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => {
      stars += count;
      return { date, stars };
    });
}

async function readData() {
  try {
    return JSON.parse(await fs.readFile(dataPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { snapshots: [] };
    throw error;
  }
}

function createSvg(points, currentStars, source) {
  const width = 760;
  const height = 260;
  const padding = { top: 36, right: 34, bottom: 48, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.stars);
  const minValue = Math.max(0, Math.min(...values) - Math.max(1, Math.ceil((Math.max(...values) - Math.min(...values)) * 0.12)));
  const maxValue = Math.max(minValue + 1, Math.max(...values) + Math.max(1, Math.ceil((Math.max(...values) - minValue) * 0.12)));
  const x = (index) => points.length === 1
    ? padding.left + chartWidth / 2
    : padding.left + (index / (points.length - 1)) * chartWidth;
  const y = (value) => padding.top + ((maxValue - value) / (maxValue - minValue)) * chartHeight;
  const line = points.map((point, index) => `${x(index).toFixed(1)},${y(point.stars).toFixed(1)}`).join(' ');
  const area = `${padding.left},${padding.top + chartHeight} ${line} ${padding.left + chartWidth},${padding.top + chartHeight}`;
  const grid = Array.from({ length: 4 }, (_, index) => {
    const gridY = padding.top + (index / 3) * chartHeight;
    const value = Math.round(maxValue - (index / 3) * (maxValue - minValue));
    return `<path d="M ${padding.left} ${gridY} H ${padding.left + chartWidth}" class="grid"/><text x="${padding.left - 10}" y="${gridY + 4}" class="axis" text-anchor="end">${value}</text>`;
  }).join('');
  const firstDate = points[0].date;
  const lastDate = points[points.length - 1].date;
  const lastX = x(points.length - 1).toFixed(1);
  const lastY = y(points[points.length - 1].stars).toFixed(1);
  const sourceLabel = source === 'stargazers' ? 'GitHub stargazer history' : 'Daily snapshots';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${repository} star history</title>
  <desc id="desc">${sourceLabel}. Current stars: ${currentStars}.</desc>
  <style>
    .surface { fill: #ffffff; } .grid { stroke: #d8e2de; stroke-width: 1; } .axis { fill: #73817b; font: 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .title { fill: #17201d; font: 600 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; } .meta { fill: #73817b; font: 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .area { fill: #0f766e; fill-opacity: .10; } .line { fill: none; stroke: #0f766e; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; } .point { fill: #ffffff; stroke: #0f766e; stroke-width: 3; }
    @media (prefers-color-scheme: dark) { .surface { fill: #171d1b; } .grid { stroke: #2c3833; } .axis, .meta { fill: #8b9992; } .title { fill: #edf5f1; } .area { fill: #2fb7a5; } .line, .point { stroke: #2fb7a5; } .point { fill: #171d1b; } }
  </style>
  <rect class="surface" width="${width}" height="${height}" rx="10"/>
  <text class="title" x="${padding.left}" y="22">Star history</text>
  <text class="meta" x="${width - padding.right}" y="22" text-anchor="end">${currentStars} stars</text>
  ${grid}
  <polygon class="area" points="${area}"/>
  <polyline class="line" points="${line}"/>
  <circle class="point" cx="${lastX}" cy="${lastY}" r="4.5"/>
  <text class="axis" x="${padding.left}" y="${height - 18}">${firstDate}</text>
  <text class="axis" x="${padding.left + chartWidth}" y="${height - 18}" text-anchor="end">${lastDate}</text>
</svg>`;
}

const repositoryInfo = await fetchJson(`https://api.github.com/repos/${repository}`);
const currentStars = repositoryInfo.body.stargazers_count;
const today = new Date().toISOString().slice(0, 10);
const existing = await readData();
let source = 'snapshots';
let points;

try {
  const starDates = await fetchStarDates();
  if (starDates?.length || currentStars === 0) {
    points = toCumulativePoints(starDates || []);
    source = 'stargazers';
  }
} catch (error) {
  console.warn(`Unable to read stargazer dates, using snapshots: ${error.message}`);
}

if (!points?.length) {
  const snapshots = Array.isArray(existing.snapshots) ? existing.snapshots : [];
  const lastSnapshot = snapshots.at(-1);
  if (lastSnapshot?.date === today) {
    lastSnapshot.stars = currentStars;
  } else {
    snapshots.push({ date: today, stars: currentStars });
  }
  existing.snapshots = snapshots;

  const existingPoints = Array.isArray(existing.points) ? existing.points : [];
  if (existing.source?.startsWith('stargazers') && existingPoints.length > 1) {
    const lastPoint = existingPoints.at(-1);
    if (lastPoint.date === today) {
      lastPoint.stars = currentStars;
    } else if (lastPoint.stars !== currentStars) {
      existingPoints.push({ date: today, stars: currentStars });
    }
    points = existingPoints;
    source = 'stargazers + snapshots';
  } else {
    points = snapshots;
    source = 'snapshots';
  }
}

const data = {
  repository,
  updatedAt: new Date().toISOString(),
  source,
  snapshots: existing.snapshots || [],
  points
};

await fs.writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
await fs.writeFile(svgPath, createSvg(points, currentStars, source));
