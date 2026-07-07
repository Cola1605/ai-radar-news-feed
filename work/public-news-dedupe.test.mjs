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
