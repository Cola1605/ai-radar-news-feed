# Horizon Bản tin hằng ngày - 2026-11-23

> Đã chọn 12 tin quan trọng từ 241 mục.

1. [AI is getting better faster than experts can reliably test whether new systems are safe, METR warns](#the-decoder-ai-is-getting-better-faster-than-experts-can-reliably-test-whether-new-systems-are-safe-metr-warns) ⭐️ 9.5/10
2. [Nvidia researchers argue huge AI context windows are a dead end](#the-decoder-nvidia-researchers-argue-huge-ai-context-windows-are-a-dead-end) ⭐️ 9.5/10
3. [OpenAI shares new prompting tips for GPT-6.2 Astra and Sol to fix brief answers and unnecessary questions](#the-decoder-openai-shares-new-prompting-tips-for-gpt-6-2-astra-and-sol-to-fix-brief-answers-and-unnecessary-questions) ⭐️ 9.5/10
4. [Hours after Anthropic claims a Claude proof of the Riemann hypothesis, Stanford releases an all-human competing draft](#the-decoder-hours-after-anthropic-claims-a-claude-proof-of-the-riemann-hypothesis-stanford-releases-an-all-human-competing-draft) ⭐️ 9.2/10
5. [Claude Code Has Been Leaking Secrets through its "Don't Ask Again" Feature](#infoq-ai-ml-data-engineering-claude-code-has-been-leaking-secrets-through-its-don-t-ask-again-feature) ⭐️ 8.4/10
6. [Perplexity and Intelligence](#openai-news-perplexity-and-intelligence) ⭐️ 8.3/10
7. [How Google Duplex evolved to also call businesses for you in Gemini](#google-research-how-google-duplex-evolved-to-also-call-businesses-for-you-in-gemini) ⭐️ 7.9/10
8. [Combatting adversarial distillation](#openai-news-combatting-adversarial-distillation) ⭐️ 7.9/10
9. [AWS Releases a Free Local Emulator of AWS Built Entirely by Agents](#infoq-ai-ml-data-engineering-aws-releases-a-free-local-emulator-of-aws-built-entirely-by-agents) ⭐️ 7.9/10
10. [OpenAI’s chief scientist has thoughts on how to limit AI development](#techcrunch-ai-openai-s-chief-scientist-has-thoughts-on-how-to-limit-ai-development) ⭐️ 7.8/10
11. [How Notable Capital, GIC, and Baillie Gifford bet big on Anthropic before its IPO](#techcrunch-ai-how-notable-capital-gic-and-baillie-gifford-bet-big-on-anthropic-before-its-ipo) ⭐️ 7.3/10
12. [Google Announces Agent Compute Engine for Secure AI Agent Execution](#infoq-ai-ml-data-engineering-google-announces-agent-compute-engine-for-secure-ai-agent-execution) ⭐️ 7.3/10

---

<a id="the-decoder-ai-is-getting-better-faster-than-experts-can-reliably-test-whether-new-systems-are-safe-metr-warns"></a>
## [AI is getting better faster than experts can reliably test whether new systems are safe, METR warns](https://the-decoder.com/ai-is-getting-better-faster-than-experts-can-reliably-test-whether-new-systems-are-safe-metr-warns/) ⭐️ 9.5/10

METR reports that leading AI models like Opus 5.5 and GPT-6 Astra are improving rapidly at research tasks but getting harder to measure. Current data can't rule out a dangerous acceleration in AI development, the organization warns, though it also says common tests may overestimate what the models can actually do....

The Decoder · 2026-11-22T13:00:43.000Z

**Thẻ**: `#Model`, `#Research`

---

<a id="the-decoder-nvidia-researchers-argue-huge-ai-context-windows-are-a-dead-end"></a>
## [Nvidia researchers argue huge AI context windows are a dead end](https://the-decoder.com/nvidia-researchers-argue-huge-ai-context-windows-are-a-dead-end/) ⭐️ 9.5/10

Nvidia researchers argue that language models often don't need their full context windows—which are slow, expensive, and prone to errors—and propose an alternative. In tests, periodic summaries and targeted keyword search usually matched full-context results at a fraction of the cost. The team even proposes a new class of models that works with short notes instead of long context....

The Decoder · 2026-11-21T16:23:45.000Z

**Thẻ**: `#Model`, `#Research`

---

<a id="the-decoder-openai-shares-new-prompting-tips-for-gpt-6-2-astra-and-sol-to-fix-brief-answers-and-unnecessary-questions"></a>
## [OpenAI shares new prompting tips for GPT-6.2 Astra and Sol to fix brief answers and unnecessary questions](https://the-decoder.com/openai-shares-new-prompting-tips-for-gpt-6-2-astra-and-sol-to-fix-brief-answers-and-unnecessary-questions/) ⭐️ 9.5/10

OpenAI has released new prompt templates for GPT-6.2 Astra and Sol meant to fix common model behaviors such as overly brief answers, unnecessary follow-up questions, and excessive testing when coding. The API is changing as well, since editing a conversation's history can discard reasoning content and lower response quality....

The Decoder · 2026-11-21T13:32:35.000Z

**Thẻ**: `#Hot News`, `#Model`

---

<a id="the-decoder-hours-after-anthropic-claims-a-claude-proof-of-the-riemann-hypothesis-stanford-releases-an-all-human-competing-draft"></a>
## [Hours after Anthropic claims a Claude proof of the Riemann hypothesis, Stanford releases an all-human competing draft](https://the-decoder.com/hours-after-anthropic-claims-a-claude-proof-of-the-riemann-hypothesis-stanford-releases-an-all-human-competing-draft/) ⭐️ 9.2/10

Anthropic mathematician Levent Alpöge says he used Claude to prove the Riemann hypothesis, math's most famous open problem for 167 years, with a proof formalized in Lean that spans over 250,000 pages. Just hours later, Stanford researchers published an independent, entirely human competing proof, and mathematicians are now checking whether either one holds up....

The Decoder · 2026-11-21T11:19:49.000Z

**Thẻ**: `#Hot News`, `#Model`, `#Research`

---

<a id="infoq-ai-ml-data-engineering-claude-code-has-been-leaking-secrets-through-its-don-t-ask-again-feature"></a>
## [Claude Code Has Been Leaking Secrets through its "Don't Ask Again" Feature](https://www.infoq.com/news/2026/11/claude-code-leaking-secrets/?utm_campaign=infoq_content&utm_source=infoq&utm_medium=feed&utm_term=AI%2C+ML+%26+Data+Engineering) ⭐️ 8.4/10

Agentic security firm Apiiro found that Claude Code has been exposing secrets in public repositories due to how it stores them in local file on developers' machines to implement "Don't Ask Again". The company identified 1,122 secrets in claude/settings.local.json files and another 1,160 in git history, in the shared settings.json, and in agent chat transcripts stored in repos. By Sergio De Simone

InfoQ AI/ML/Data Engineering · 2026-11-22T11:00:00.000Z

**Thẻ**: `#Model`, `#Agent AI`, `#Policy`

---

<a id="openai-news-perplexity-and-intelligence"></a>
## [Perplexity and Intelligence](https://openai.com/index/perplexity-and-intelligence) ⭐️ 8.3/10

How perplexity measures progress in AI models, and why it could help developers establish a shared approach to evaluating emerging capabilities.

OpenAI News · 2026-11-22T00:00:00.000Z

**Thẻ**: `#Model`, `#Research`

---

<a id="google-research-how-google-duplex-evolved-to-also-call-businesses-for-you-in-gemini"></a>
## [How Google Duplex evolved to also call businesses for you in Gemini](https://research.google/blog/how-google-duplex-evolved-to-also-call-businesses-for-you-in-gemini/) ⭐️ 7.9/10

Tin AI từ Google Research về "How Google Duplex evolved to also call businesses for you in Gemini". Mở bài gốc để đọc chi tiết và đánh giá tác động với team.

Google Research · 2026-11-20T23:30:30.000Z

**Thẻ**: `#Model`, `#Research`

---

<a id="openai-news-combatting-adversarial-distillation"></a>
## [Combatting adversarial distillation](https://openai.com/index/combatting-adversarial-distillation) ⭐️ 7.9/10

OpenAI’s layered approach to adversarial distillation combines model training, safeguards, detection, and enforcement to protect against capability extraction.

OpenAI News · 2026-11-20T10:00:00.000Z

**Thẻ**: `#Model`

---

<a id="infoq-ai-ml-data-engineering-aws-releases-a-free-local-emulator-of-aws-built-entirely-by-agents"></a>
## [AWS Releases a Free Local Emulator of AWS Built Entirely by Agents](https://www.infoq.com/news/2026/11/aws-emulator-local-testing/?utm_campaign=infoq_content&utm_source=infoq&utm_medium=feed&utm_term=AI%2C+ML+%26+Data+Engineering) ⭐️ 7.9/10

AWS has released AWS Emulator, a free, CC0-licensed local stand-in for more than 200 of its services, generated from its public API models and aimed at the test loops of coding agents. AWS says agents wrote and maintain all of the code and publishes per-release fidelity scores. The docs say it does not evaluate IAM, and practitioners are split on trusting an emulator nobody reviewed. By Steef-Jan Wiggers

InfoQ AI/ML/Data Engineering · 2026-11-20T06:53:00.000Z

**Thẻ**: `#Hot News`, `#Model`, `#Agent AI`, `#Research`

---

<a id="techcrunch-ai-openai-s-chief-scientist-has-thoughts-on-how-to-limit-ai-development"></a>
## [OpenAI’s chief scientist has thoughts on how to limit AI development](https://techcrunch.com/2026/11/22/openais-chief-scientist-has-thoughts-on-how-to-limit-ai-development/) ⭐️ 7.8/10

To establish a speed limit on AI development, you need to agree on how to measure speed.

TechCrunch AI · 2026-11-22T21:14:07.000Z

**Thẻ**: `#AI`

---

<a id="techcrunch-ai-how-notable-capital-gic-and-baillie-gifford-bet-big-on-anthropic-before-its-ipo"></a>
## [How Notable Capital, GIC, and Baillie Gifford bet big on Anthropic before its IPO](https://techcrunch.com/2026/11/22/how-notable-capital-gic-and-baillie-gifford-bet-big-on-anthropic-before-its-ipo/) ⭐️ 7.3/10

Three significant backers share what gave them conviction to bet billions on Anthropic.

TechCrunch AI · 2026-11-23T01:25:53.000Z

**Thẻ**: `#AI`

---

<a id="infoq-ai-ml-data-engineering-google-announces-agent-compute-engine-for-secure-ai-agent-execution"></a>
## [Google Announces Agent Compute Engine for Secure AI Agent Execution](https://www.infoq.com/news/2026/11/google-agent-compute-engine/?utm_campaign=infoq_content&utm_source=infoq&utm_medium=feed&utm_term=AI%2C+ML+%26+Data+Engineering) ⭐️ 7.3/10

Google recently announced Agent Compute Engine, a managed service that runs AI agents in isolated microVMs, with checkpointing capabilities to suspend and resume execution environments. The design keeps credentials, API keys, and OAuth refresh tokens outside the agent sandbox, using an external Agent Gateway to authenticate requests and inject the required secrets. By Renato Losio

InfoQ AI/ML/Data Engineering · 2026-11-22T06:30:00.000Z

**Thẻ**: `#Hot News`, `#Agent AI`

---
