import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_FEEDS = [
  { sourceName: "OpenAI News", url: "https://openai.com/news/rss.xml", sourceWeight: 1.25 },
  { sourceName: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", sourceWeight: 1.2 },
  { sourceName: "Google Research", url: "https://research.google/blog/rss/", sourceWeight: 1.1 },
  {
    sourceName: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    sourceWeight: 1.05,
  },
  { sourceName: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", sourceWeight: 1 },
  { sourceName: "The Decoder", url: "https://the-decoder.com/feed/", sourceWeight: 1 },
  { sourceName: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", sourceWeight: 0.95 },
  {
    sourceName: "InfoQ AI/ML/Data Engineering",
    url: "https://feed.infoq.com/ai-ml-data-eng/",
    sourceWeight: 0.9,
  },
  {
    sourceName: "Hacker News AI",
    url: "https://hnrss.org/newest?q=AI",
    sourceWeight: 0.75,
    secondary: true,
  },
];

const MAX_ITEMS = 12;
const MAX_NEWS_AGE_DAYS = 45;
const FRESH_NEWS_HOURS = 72;
const FALLBACK_NEWS_HOURS = 7 * 24;
const MAX_OLDER_ITEMS = 2;
const MAX_ITEMS_PER_SOURCE = 4;
const XML_ENTITIES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["#39", "'"],
]);

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-zA-Z0-9#]+);/g, (match, entity) => XML_ENTITIES.get(entity) ?? match)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function firstAttribute(block, tagName, attributeName) {
  const tagMatch = block.match(new RegExp(`<${tagName}\\b[^>]*>`, "i"));
  if (!tagMatch) return "";
  const attributeMatch = tagMatch[0].match(
    new RegExp(`${attributeName}=["']([^"']+)["']`, "i")
  );
  return attributeMatch ? decodeXml(attributeMatch[1]) : "";
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeComparableText(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(show hn|gioi thieu)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeUrl(value = "") {
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || /^(fbclid|gclid|igshid|ref|ref_src)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    const search = url.searchParams.toString();
    const pathname =
      url.pathname.length > 1 ? url.pathname.replace(/\/+$/g, "") : url.pathname;
    return `${url.protocol}//${url.hostname}${pathname}${search ? `?${search}` : ""}`;
  } catch {
    return normalizeComparableText(value);
  }
}

function hostnameForUrl(value = "") {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function publisherNameForUrl(value = "", fallback = "AI news") {
  return hostnameForUrl(value).replace(/^www\./, "") || fallback;
}

function isGitHubUrl(value = "") {
  const hostname = hostnameForUrl(value);
  return hostname === "github.com" || hostname.endsWith(".github.com");
}

function isHotNewsCandidate(item) {
  if (isGitHubUrl(item.url)) return false;
  if (/^show hn:/i.test(item.title) && /github/i.test(`${item.url} ${item.summary}`)) {
    return false;
  }
  return true;
}

function isWithinNewsWindow(item, now = new Date()) {
  const publishedTime = Date.parse(item.publishedAt);
  if (!Number.isFinite(publishedTime)) return true;
  const ageDays = (now.getTime() - publishedTime) / (24 * 60 * 60 * 1000);
  return ageDays >= -1 && ageDays <= MAX_NEWS_AGE_DAYS;
}

function tokensForSimilarity(value = "") {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "ai",
    "agent",
    "agents",
    "for",
    "from",
    "in",
    "of",
    "on",
    "source",
    "the",
    "this",
    "tin",
    "to",
    "ve",
    "voi",
    "with",
  ]);
  return new Set(
    normalizeComparableText(value)
      .split(" ")
      .filter((token) => token.length > 2 && !stopWords.has(token))
  );
}

function jaccardSimilarity(left, right) {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}

function formatVntDateKey(date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function recencyModifier(publishedAt, now = new Date()) {
  const publishedTime = Date.parse(publishedAt);
  if (!Number.isFinite(publishedTime)) return 0;
  const ageHours = (now.getTime() - publishedTime) / (60 * 60 * 1000);
  if (ageHours < 0) return 0;
  if (ageHours <= 48) return 1;
  if (ageHours <= 168) return 0.3;
  if (ageHours <= 336) return -0.4;
  return -1;
}

function ageHoursFor(publishedAt, now = new Date()) {
  const publishedTime = Date.parse(publishedAt);
  if (!Number.isFinite(publishedTime)) return 0;
  return Math.max(0, (now.getTime() - publishedTime) / (60 * 60 * 1000));
}

function scoreText(title, summary, item = {}, now = new Date()) {
  const text = `${title} ${summary}`.toLowerCase();
  const weights = [
    [
      /openai|chatgpt|gpt-|gpt\b|sora|google deepmind|deepmind|gemini|anthropic|claude|meta ai|llama|microsoft|copilot|nvidia/,
      1.5,
    ],
    [/launch|launched|release|released|announce|announced|introduc|unveil|rollout|available/, 1.15],
    [/model|frontier|foundation model|reasoning|multimodal|video model|image model|llm/, 1.05],
    [/benchmark|eval|evaluation|leaderboard|research|paper/, 0.75],
    [/regulation|policy|copyright|lawsuit|safety|security|alignment|risk/, 0.7],
    [/funding|acquisition|revenue|partnership|enterprise/, 0.55],
    [/\bai\b|artificial intelligence|generative|agentic|agent\b/, 0.45],
  ];
  const keywordScore = weights.reduce((total, [pattern, weight]) => {
    return pattern.test(text) ? total + weight : total;
  }, 4.8);
  const sourceWeight = Number.isFinite(Number(item.sourceWeight)) ? Number(item.sourceWeight) : 1;
  const sourceModifier = sourceWeight - 1;
  const secondaryModifier = item.secondary ? -0.35 : 0;
  const score =
    keywordScore + sourceModifier + secondaryModifier + recencyModifier(item.publishedAt, now);
  return Number(clamp(score, 5, 9.7).toFixed(1));
}

function tagsFromText(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const tags = [];
  const add = (tag) => {
    if (!tags.includes(tag)) tags.push(tag);
  };

  if (/launch|release|announce|unveil|rollout|available/.test(text)) add("Hot News");
  if (/model|frontier|foundation model|small model|llm|gpt|gemini|claude|llama/.test(text)) add("Model");
  if (/agent|agentic|browser automation|workflow/.test(text)) add("Agent AI");
  if (/benchmark|eval|evaluation|research|paper/.test(text)) add("Research");
  if (/regulation|policy|copyright|lawsuit|safety|security|alignment|risk/.test(text)) {
    add("Policy");
  }
  if (/funding|acquisition|revenue|partnership|enterprise/.test(text)) add("Business");
  if (/inference|routing|serving|worker|cloudflare|deployment/.test(text)) add("Infra");
  if (tags.length === 0 && /\bai\b|artificial intelligence|generative/.test(text)) {
    add("AI");
  }
  return tags.length > 0 ? tags : ["AI"];
}

function parseDate(value, now) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : now.toISOString();
}

function truncateSummary(value, maxLength = 420) {
  if (value.length <= maxLength) return value;
  const clipped = value.slice(0, maxLength - 1);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf(". "),
    clipped.lastIndexOf("? "),
    clipped.lastIndexOf("! ")
  );
  const boundary = sentenceEnd > 160 ? sentenceEnd + 1 : clipped.lastIndexOf(" ");
  return `${clipped.slice(0, boundary > 160 ? boundary : maxLength - 1).trim()}...`;
}

function normalizeSummary(summary, title, sourceName) {
  const withoutMetadata = summary
    .replace(/Article URL:\s*\S+/gi, "")
    .replace(/Comments URL:\s*\S+/gi, "")
    .replace(/Points:\s*\d+/gi, "")
    .replace(/#\s*Comments:\s*\d+/gi, "")
    .replace(/\bTags:\s*[\s\S]*$/i, "")
    .replace(new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();

  if (!withoutMetadata || withoutMetadata.length < 40) {
    return `Tin AI từ ${sourceName} về "${title}". Mở bài gốc để đọc chi tiết và đánh giá tác động với team.`;
  }

  return truncateSummary(withoutMetadata);
}

function parseBlocks(text, tagName) {
  return [...text.matchAll(new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, "gi"))].map(
    (match) => match[0]
  );
}

export function parseFeedItems(
  { sourceName, text, url, sourceWeight = 1, secondary = false },
  now = new Date()
) {
  const fallbackSource =
    sourceName || firstTag(text, "title") || new URL(url).hostname.replace(/^www\./, "");
  const rssItems = parseBlocks(text, "item").map((block) => {
    const title = firstTag(block, "title");
    const link = firstTag(block, "link") || firstAttribute(block, "link", "href");
    const summary =
      firstTag(block, "description") || firstTag(block, "summary") || firstTag(block, "content");
    const publishedAt = parseDate(firstTag(block, "pubDate") || firstTag(block, "updated"), now);
    return { title, url: link, summary, publishedAt };
  });
  const atomItems = parseBlocks(text, "entry").map((block) => {
    const title = firstTag(block, "title");
    const link = firstAttribute(block, "link", "href") || firstTag(block, "link");
    const summary =
      firstTag(block, "summary") || firstTag(block, "content") || firstTag(block, "description");
    const publishedAt = parseDate(
      firstTag(block, "updated") || firstTag(block, "published"),
      now
    );
    return { title, url: link, summary, publishedAt };
  });

  return [...rssItems, ...atomItems]
    .filter((item) => item.title && item.url)
    .map((item) => ({
      ...item,
      sourceName: secondary ? publisherNameForUrl(item.url, fallbackSource) : fallbackSource,
      sourceWeight,
      secondary,
      summary: normalizeSummary(item.summary, item.title, fallbackSource),
    }));
}

function isDuplicateFeedItem(current, existing) {
  const currentUrl = canonicalizeUrl(current.url);
  const existingUrl = canonicalizeUrl(existing.url);
  if (currentUrl && existingUrl && currentUrl === existingUrl) return true;

  const currentTitle = normalizeComparableText(current.title);
  const existingTitle = normalizeComparableText(existing.title);
  if (currentTitle && existingTitle && currentTitle === existingTitle) return true;

  const titleSimilarity = jaccardSimilarity(
    tokensForSimilarity(current.title),
    tokensForSimilarity(existing.title)
  );
  const summarySimilarity = jaccardSimilarity(
    tokensForSimilarity(current.summary),
    tokensForSimilarity(existing.summary)
  );
  return titleSimilarity >= 0.86 && summarySimilarity >= 0.74;
}

function preferredFeedItem(current, existing) {
  const currentScore = scoreText(current.title, current.summary, current);
  const existingScore = scoreText(existing.title, existing.summary, existing);
  if (currentScore !== existingScore) {
    return currentScore > existingScore ? current : existing;
  }
  const currentTime = Date.parse(current.publishedAt);
  const existingTime = Date.parse(existing.publishedAt);
  if (Number.isFinite(currentTime) && Number.isFinite(existingTime)) {
    return currentTime > existingTime ? current : existing;
  }
  return existing;
}

function dedupeFeedItems(items) {
  const deduped = [];
  for (const item of items) {
    const duplicateIndex = deduped.findIndex((existing) =>
      isDuplicateFeedItem(item, existing)
    );
    if (duplicateIndex === -1) {
      deduped.push(item);
      continue;
    }
    deduped[duplicateIndex] = preferredFeedItem(item, deduped[duplicateIndex]);
  }
  return deduped;
}

function selectFreshDiverseItems(items) {
  const tiers = [
    items.filter((item) => item.ageHours <= FRESH_NEWS_HOURS),
    items.filter(
      (item) =>
        item.ageHours > FRESH_NEWS_HOURS &&
        item.ageHours <= FALLBACK_NEWS_HOURS
    ),
    items.filter((item) => item.ageHours > FALLBACK_NEWS_HOURS),
  ];
  const selected = [];
  const selectedIds = new Set();
  const sourceCounts = new Map();
  let olderCount = 0;

  const addFromTier = (tier, enforceSourceLimit) => {
    for (const item of tier) {
      if (selected.length >= MAX_ITEMS) return;
      if (selectedIds.has(item.id)) continue;
      const isOlder = item.ageHours > FALLBACK_NEWS_HOURS;
      if (isOlder && olderCount >= MAX_OLDER_ITEMS) continue;
      const sourceCount = sourceCounts.get(item.sourceName) ?? 0;
      if (enforceSourceLimit && sourceCount >= MAX_ITEMS_PER_SOURCE) continue;

      selected.push(item);
      selectedIds.add(item.id);
      sourceCounts.set(item.sourceName, sourceCount + 1);
      if (isOlder) olderCount += 1;
    }
  };

  for (const tier of tiers) {
    addFromTier(tier, true);
    addFromTier(tier, false);
  }
  return selected;
}

function countNewItems(items, previousSnapshot) {
  if (!previousSnapshot?.items?.length) return items.length;
  const previousUrls = new Set(
    previousSnapshot.items.map((item) => canonicalizeUrl(item.url)).filter(Boolean)
  );
  const previousTitles = new Set(
    previousSnapshot.items
      .map((item) => normalizeComparableText(item.title))
      .filter(Boolean)
  );
  return items.filter(
    (item) =>
      !previousUrls.has(canonicalizeUrl(item.url)) &&
      !previousTitles.has(normalizeComparableText(item.title))
  ).length;
}

function latestPublishedAtFor(items) {
  return items
    .map((item) => item.publishedAt)
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

export function buildSnapshotFromFeedTexts(
  feeds,
  { now = new Date(), previousSnapshot } = {}
) {
  const allItems = feeds.flatMap((feed) => parseFeedItems(feed, now));
  const hotNewsItems = allItems.filter(
    (item) => isHotNewsCandidate(item) && isWithinNewsWindow(item, now)
  );
  const deduped = dedupeFeedItems(hotNewsItems);

  if (deduped.length === 0) {
    throw new Error("No usable public AI news items found.");
  }

  const scored = deduped
    .map((item, index) => {
      const ageHours = ageHoursFor(item.publishedAt, now);
      const rawScore = scoreText(item.title, item.summary, item, now);
      const score = ageHours > FALLBACK_NEWS_HOURS ? Math.min(rawScore, 8.4) : rawScore;
      const tags = tagsFromText(item.title, item.summary).filter(
        (tag) => ageHours <= FALLBACK_NEWS_HOURS || tag !== "Hot News"
      );
      return {
        id: slugify(`${item.sourceName}-${item.title}`) || `public-news-${index + 1}`,
        title: item.title,
        summary: item.summary,
        url: item.url,
        sourceName: item.sourceName,
        score,
        tags: tags.length > 0 ? tags : ["AI"],
        publishedAt: item.publishedAt,
        ageHours,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  const selectedWithAge = selectFreshDiverseItems(scored);
  const selected = selectedWithAge.map(({ ageHours: _ageHours, ...item }) => item);
  return {
    generatedAt: now.toISOString(),
    latestPublishedAt: latestPublishedAtFor(selected),
    newItemCount: countNewItems(selected, previousSnapshot),
    dateKey: formatVntDateKey(now),
    source: "AI Radar hot AI news feed",
    sourceUrl: DEFAULT_FEEDS.map((feed) => feed.url).join(", "),
    selectedCount: selected.length,
    totalCount: deduped.length,
    items: selected,
  };
}

export function validateSnapshot(snapshot, { minItems = 1 } = {}) {
  if (!snapshot || !Array.isArray(snapshot.items)) {
    throw new Error("AI news snapshot is missing its items array.");
  }
  if (snapshot.items.length < minItems) {
    throw new Error(
      `AI news snapshot only has ${snapshot.items.length} items; expected at least ${minItems}.`
    );
  }
  if (snapshot.selectedCount !== snapshot.items.length) {
    throw new Error("AI news snapshot selectedCount does not match its items array.");
  }
  const canonicalUrls = new Set();
  for (const item of snapshot.items) {
    if (!item.title || !item.url || !item.publishedAt) {
      throw new Error("AI news snapshot contains an incomplete item.");
    }
    if (isGitHubUrl(item.url)) {
      throw new Error(`GitHub URL is not allowed in AI news: ${item.url}`);
    }
    const canonicalUrl = canonicalizeUrl(item.url);
    if (canonicalUrls.has(canonicalUrl)) {
      throw new Error(`Duplicate canonical URL in AI news: ${canonicalUrl}`);
    }
    canonicalUrls.add(canonicalUrl);
  }
  return snapshot;
}

function markdownForSnapshot(snapshot) {
  const rows = snapshot.items
    .map((item, index) => {
      const tags = item.tags.map((tag) => `\`#${tag}\``).join(", ");
      return [
        `<a id="${item.id}"></a>`,
        `## [${item.title}](${item.url}) ⭐️ ${item.score}/10`,
        "",
        item.summary,
        "",
        `${item.sourceName} · ${item.publishedAt}`,
        "",
        `**Thẻ**: ${tags}`,
        "",
        "---",
      ].join("\n");
    })
    .join("\n\n");

  const toc = snapshot.items
    .map((item, index) => `${index + 1}. [${item.title}](#${item.id}) ⭐️ ${item.score}/10`)
    .join("\n");

  return [
    `# Horizon Bản tin hằng ngày - ${snapshot.dateKey}`,
    "",
    `> Đã chọn ${snapshot.selectedCount} tin quan trọng từ ${snapshot.totalCount} mục.`,
    "",
    toc,
    "",
    "---",
    "",
    rows,
    "",
  ].join("\n");
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      "User-Agent": "ai-radar-public-news-feed",
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed for ${feed.url}: ${response.status}`);
  }
  return {
    ...feed,
    text: await response.text(),
  };
}

export async function buildPublicSnapshot({
  feeds = DEFAULT_FEEDS,
  now = new Date(),
  previousSnapshot,
} = {}) {
  const settledFeeds = await Promise.allSettled(feeds.map(fetchFeed));
  const feedTexts = settledFeeds
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  const failedFeeds = settledFeeds.filter((result) => result.status === "rejected");

  for (const failure of failedFeeds) {
    console.warn(failure.reason instanceof Error ? failure.reason.message : String(failure.reason));
  }

  if (feedTexts.length === 0) {
    throw new Error("No public AI news feeds were reachable.");
  }

  return buildSnapshotFromFeedTexts(feedTexts, { now, previousSnapshot });
}

async function writeAtomic(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, filePath);
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const jsonPath = path.join(root, "latest.json");
  let previousSnapshot;
  try {
    previousSnapshot = JSON.parse(await readFile(jsonPath, "utf8"));
  } catch {
    previousSnapshot = undefined;
  }
  const snapshot = validateSnapshot(
    await buildPublicSnapshot({ previousSnapshot }),
    { minItems: 6 }
  );
  const markdownPath = path.join(root, "docs/_posts", `${snapshot.dateKey}-summary-vi.md`);

  await writeAtomic(jsonPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await writeAtomic(markdownPath, markdownForSnapshot(snapshot));

  console.log(
    `Wrote ${snapshot.selectedCount}/${snapshot.totalCount} AI news items to latest.json and ${path.relative(root, markdownPath)}.`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
