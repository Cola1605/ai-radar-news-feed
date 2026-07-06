import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_FEEDS = [
  { sourceName: "Hacker News AI", url: "https://hnrss.org/newest?q=AI" },
  { sourceName: "Hacker News LLM", url: "https://hnrss.org/newest?q=LLM" },
  { sourceName: "Hacker News Agent", url: "https://hnrss.org/newest?q=agent" },
  { sourceName: "Simon Willison", url: "https://simonwillison.net/atom/everything/" },
];

const MAX_ITEMS = 12;
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

function formatVntDateKey(date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scoreText(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const weights = [
    [/agent|agentic|browser automation|workflow/, 1.8],
    [/\bai\b|artificial intelligence|generative/, 1.2],
    [/\bllm\b|language model|foundation model|small model/, 1.2],
    [/inference|routing|serving|worker|cloudflare|deployment/, 0.9],
    [/benchmark|eval|evaluation|research|paper/, 0.7],
    [/security|safety|guardrail|sandbox|policy/, 0.7],
    [/open source|github|release|framework|tool/, 0.5],
  ];
  const score = weights.reduce((total, [pattern, weight]) => {
    return pattern.test(text) ? total + weight : total;
  }, 5.4);
  return Number(clamp(score, 5, 9.5).toFixed(1));
}

function tagsFromText(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const tags = [];
  const add = (tag) => {
    if (!tags.includes(tag)) tags.push(tag);
  };

  if (/agent|agentic|browser automation|workflow/.test(text)) add("Agent AI");
  if (/\bllm\b|language model|foundation model|small model/.test(text)) add("LLM");
  if (/inference|routing|serving|worker|cloudflare|deployment/.test(text)) add("Infra");
  if (/benchmark|eval|evaluation|research|paper/.test(text)) add("Research");
  if (/security|safety|guardrail|sandbox|policy/.test(text)) add("Security");
  if (/open source|github|release|framework|tool/.test(text)) add("Tooling");
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
    return `Tin public từ ${sourceName} về "${title}". Mở nguồn chính để đọc chi tiết và đánh giá tác động với team.`;
  }

  return truncateSummary(withoutMetadata);
}

function parseBlocks(text, tagName) {
  return [...text.matchAll(new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, "gi"))].map(
    (match) => match[0]
  );
}

export function parseFeedItems({ sourceName, text, url }, now = new Date()) {
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
      sourceName: fallbackSource,
      summary: normalizeSummary(item.summary, item.title, fallbackSource),
    }));
}

export function buildSnapshotFromFeedTexts(feeds, { now = new Date() } = {}) {
  const seen = new Set();
  const allItems = feeds.flatMap((feed) => parseFeedItems(feed, now));
  const deduped = allItems.filter((item) => {
    const key = `${item.url} ${item.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (deduped.length === 0) {
    throw new Error("No usable public AI news items found.");
  }

  const scored = deduped
    .map((item, index) => {
      const score = scoreText(item.title, item.summary);
      return {
        id: slugify(`${item.sourceName}-${item.title}`) || `public-news-${index + 1}`,
        title: item.title,
        summary: item.summary,
        url: item.url,
        sourceName: item.sourceName,
        score,
        tags: tagsFromText(item.title, item.summary),
        publishedAt: item.publishedAt,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  const selected = scored.slice(0, MAX_ITEMS);
  return {
    generatedAt: now.toISOString(),
    dateKey: formatVntDateKey(now),
    source: "AI Radar public GitHub feed",
    sourceUrl: DEFAULT_FEEDS.map((feed) => feed.url).join(", "),
    selectedCount: selected.length,
    totalCount: deduped.length,
    items: selected,
  };
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

export async function buildPublicSnapshot({ feeds = DEFAULT_FEEDS, now = new Date() } = {}) {
  const feedTexts = await Promise.all(feeds.map(fetchFeed));
  return buildSnapshotFromFeedTexts(feedTexts, { now });
}

async function writeAtomic(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, filePath);
}

async function main() {
  const snapshot = await buildPublicSnapshot();
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const jsonPath = path.join(root, "latest.json");
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
