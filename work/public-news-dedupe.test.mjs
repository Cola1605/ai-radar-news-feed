import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSnapshotFromFeedTexts } from "../scripts/build-public-ai-news.mjs";

function rss(items) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>HN AI</title>
    ${items
      .map(
        (item) => `<item>
      <title>${item.title}</title>
      <link>${item.url}</link>
      <pubDate>${item.publishedAt}</pubDate>
      <description>${item.summary}</description>
    </item>`
      )
      .join("\n")}
  </channel>
</rss>`;
}

describe("public AI news dedupe", () => {
  it("excludes GitHub repository and release URLs from the hot news snapshot", () => {
    const snapshot = buildSnapshotFromFeedTexts(
      [
        {
          sourceName: "OpenAI News",
          url: "https://openai.com/news/rss.xml",
          text: rss([
            {
              title: "OpenAI launches a new multimodal model for enterprise teams",
              url: "https://openai.com/news/new-multimodal-model",
              publishedAt: "Tue, 07 Jul 2026 00:30:00 GMT",
              summary:
                "OpenAI announced a new multimodal AI model release with stronger reasoning and enterprise deployment controls.",
            },
            {
              title: "Show HN: Tiny AI agent repo",
              url: "https://github.com/example/tiny-ai-agent",
              publishedAt: "Tue, 07 Jul 2026 00:25:00 GMT",
              summary:
                "A small GitHub repository for an AI agent workflow tool with almost no public adoption signal.",
            },
            {
              title: "AI agent framework v0.1 release",
              url: "https://github.com/example/tiny-ai-agent/releases/tag/v0.1.0",
              publishedAt: "Tue, 07 Jul 2026 00:20:00 GMT",
              summary:
                "GitHub release notes for a small open-source AI agent framework.",
            },
          ]),
        },
      ],
      { now: new Date("2026-07-07T01:00:00.000Z") }
    );

    assert.equal(snapshot.totalCount, 1);
    assert.equal(snapshot.selectedCount, 1);
    assert.equal(snapshot.items[0].sourceName, "OpenAI News");
    assert.ok(snapshot.items.every((item) => !new URL(item.url).hostname.includes("github.com")));
  });

  it("prioritizes model and product news over small repo-like tool items", () => {
    const snapshot = buildSnapshotFromFeedTexts(
      [
        {
          sourceName: "TechCrunch AI",
          url: "https://techcrunch.com/category/artificial-intelligence/feed/",
          text: rss([
            {
              title: "OpenAI releases GPT model update for developers",
              url: "https://techcrunch.com/2026/07/07/openai-gpt-model-update/",
              publishedAt: "Tue, 07 Jul 2026 00:35:00 GMT",
              summary:
                "The new model release affects AI product teams, developer workflows, benchmarks, and enterprise rollout plans.",
            },
            {
              title: "Show HN: agentic workflow benchmark on GitHub",
              url: "https://github.com/example/agentic-workflow-benchmark",
              publishedAt: "Tue, 07 Jul 2026 00:40:00 GMT",
              summary:
                "Open-source GitHub tool for agentic workflow benchmarking, framework experiments, and AI deployments.",
            },
          ]),
        },
      ],
      { now: new Date("2026-07-07T01:00:00.000Z") }
    );

    assert.equal(snapshot.items[0].url, "https://techcrunch.com/2026/07/07/openai-gpt-model-update/");
    assert.match(snapshot.items[0].title, /OpenAI releases GPT model update/i);
    assert.ok(snapshot.items.every((item) => !item.url.includes("github.com")));
  });

  it("parses official and analysis RSS sources as news publishers", () => {
    const snapshot = buildSnapshotFromFeedTexts(
      [
        {
          sourceName: "Google DeepMind",
          url: "https://deepmind.google/blog/rss.xml",
          text: rss([
            {
              title: "Google DeepMind announces a new AI safety benchmark",
              url: "https://deepmind.google/discover/blog/new-ai-safety-benchmark/",
              publishedAt: "Tue, 07 Jul 2026 00:30:00 GMT",
              summary:
                "The benchmark gives model builders a new way to evaluate safety, reasoning, and frontier model behavior.",
            },
          ]),
        },
        {
          sourceName: "VentureBeat AI",
          url: "https://venturebeat.com/category/ai/feed/",
          text: rss([
            {
              title: "Enterprise AI funding round targets model deployment",
              url: "https://venturebeat.com/ai/enterprise-ai-funding-model-deployment/",
              publishedAt: "Tue, 07 Jul 2026 00:20:00 GMT",
              summary:
                "A new funding round highlights enterprise demand for generative AI deployment and model operations.",
            },
          ]),
        },
      ],
      { now: new Date("2026-07-07T01:00:00.000Z") }
    );

    assert.deepEqual(
      new Set(snapshot.items.map((item) => item.sourceName)),
      new Set(["Google DeepMind", "VentureBeat AI"])
    );
    assert.ok(snapshot.items.some((item) => item.tags.includes("Model") || item.tags.includes("Research")));
  });

  it("filters old evergreen posts even when they have strong AI keywords", () => {
    const snapshot = buildSnapshotFromFeedTexts(
      [
        {
          sourceName: "OpenAI News",
          url: "https://openai.com/news/rss.xml",
          text: rss([
            {
              title: "OpenAI launches frontier model benchmark and safety research partnership",
              url: "https://openai.com/news/old-frontier-model-benchmark",
              publishedAt: "Wed, 10 Jul 2024 06:30:00 GMT",
              summary:
                "OpenAI announced a frontier model benchmark, safety research, enterprise partnership, and deployment release.",
            },
            {
              title: "The Decoder reports a new AI product launch",
              url: "https://the-decoder.com/new-ai-product-launch/",
              publishedAt: "Mon, 06 Jul 2026 18:30:00 GMT",
              summary:
                "A fresh AI product launch affects developer teams and near-term model workflow decisions.",
            },
          ]),
        },
      ],
      { now: new Date("2026-07-07T01:00:00.000Z") }
    );

    assert.equal(snapshot.totalCount, 1);
    assert.equal(snapshot.items[0].url, "https://the-decoder.com/new-ai-product-launch/");
  });

  it("deduplicates canonical URLs before selecting top news", () => {
    const snapshot = buildSnapshotFromFeedTexts(
      [
        {
          sourceName: "HN AI",
          url: "https://hnrss.org/newest?q=AI",
          text: rss([
            {
              title: "Show HN: Agent workflow monitor",
              url: "https://example.com/agent-workflow?utm_source=hn",
              publishedAt: "Tue, 07 Jul 2026 00:20:00 GMT",
              summary:
                "Open-source AI agent workflow monitor for team deployments and approvals.",
            },
            {
              title: "Agent workflow monitor",
              url: "https://example.com/agent-workflow",
              publishedAt: "Tue, 07 Jul 2026 00:10:00 GMT",
              summary:
                "Open source AI agent workflow monitor for team deployments and approvals.",
            },
            {
              title: "Groundtruth checks AI coding agent claims against Git diff",
              url: "https://example.com/groundtruth",
              publishedAt: "Tue, 07 Jul 2026 00:05:00 GMT",
              summary:
                "A different tool checks coding agent claims against Git diffs before review.",
            },
          ]),
        },
      ],
      { now: new Date("2026-07-07T01:00:00.000Z") }
    );

    assert.equal(snapshot.totalCount, 2);
    assert.equal(snapshot.selectedCount, 2);
    assert.equal(
      snapshot.items.filter((item) => /agent workflow monitor/i.test(item.title)).length,
      1
    );
  });

  it("does not collapse different items that only share a broad Agent AI topic", () => {
    const snapshot = buildSnapshotFromFeedTexts(
      [
        {
          sourceName: "HN Agent",
          url: "https://hnrss.org/newest?q=agent",
          text: rss([
            {
              title: "Molty - Your own personal AI assistant",
              url: "https://example.com/molty",
              publishedAt: "Tue, 07 Jul 2026 00:20:00 GMT",
              summary: "",
            },
            {
              title: "NocoBase AI no-code platform for business systems",
              url: "https://example.com/nocobase",
              publishedAt: "Tue, 07 Jul 2026 00:10:00 GMT",
              summary: "",
            },
          ]),
        },
      ],
      { now: new Date("2026-07-07T01:00:00.000Z") }
    );

    assert.equal(snapshot.totalCount, 2);
    assert.equal(new Set(snapshot.items.map((item) => item.summary)).size, 2);
  });
});
