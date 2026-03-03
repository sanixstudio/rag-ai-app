# Internal Knowledge Base — Product Feature Roadmap

This document summarizes research on what makes internal RAG/knowledge bases valuable and proposes a prioritized feature set. Think of it as a product manager’s backlog with rationale.

---

## Research Summary

### What users and enterprises need

1. **Trust and transparency** — Users need to verify answers. “Where did this come from?” is the first question. Inline or paragraph-level citations, visible source documents, and “show me the chunk” reduce doubt and support compliance.
2. **Content organization** — Flat “all documents in one pile” doesn’t scale. Metadata, tags, categories, and filters let users scope questions (e.g. “only from HR docs”) and improve retrieval relevance (metadata as pre-filter before vector search).
3. **Search and discovery** — Beyond one chat box: filters/facets, optional keyword + semantic (hybrid) search, and clear empty states (“no results” + “add docs” or “try different keywords”) improve daily use.
4. **Quality over time** — RAG that never learns from use stays static. Thumbs up/down (and optional comments) on answers or sources feed re-ranking, eval sets, and tuning (e.g. similarity thresholds, chunk size).
5. **Document lifecycle** — Knowledge changes. Re-ingest/refresh, simple versioning or “last indexed” dates, and visibility into which docs are in the index support governance and freshness.
6. **UX polish** — Empty states, onboarding, keyboard shortcuts, and consistent “no context” handling make the product feel built for internal use, not a demo.

### Pitfalls to avoid

- Treating RAG as a feature bolt-on instead of a product (retrieval and UX matter as much as the model).
- No citations or source visibility → low trust and poor adoption.
- No way to organize or filter content → noisy answers at scale.
- No feedback loop → no path to improve retrieval or prompts.

---

## Proposed Features (prioritized)

### Tier 1 — Trust and core value

| Feature | Description | Why it matters |
|--------|--------------|-----------------|
| **Source citations in answers** | Show which documents (and optionally which chunks) were used for each answer. Display doc title + link/snippet under the reply or as expandable “Sources”. | Users can verify and click through to the source. Essential for internal and compliance use. |
| **“No relevant context” clarity** | When retrieval finds nothing useful, show a clear message (“No matching docs for this question”) and suggest adding documents or rephrasing. | Reduces “the AI said something but it’s wrong” when the model has no context. |
| **Rename / edit chat title** | Let users rename a conversation from the default (e.g. first message). | Makes history scannable and more useful. |

### Tier 2 — Organization and scale

| Feature | Description | Why it matters |
|--------|--------------|-----------------|
| **Document metadata / tags** | Allow optional tags or categories (e.g. “HR”, “Engineering”) on upload or in a doc list. Store in DB and in chunk metadata. | Enables “answer only from HR docs” and better pre-filtering before vector search. |
| **Filter by source in chat** | In the chat UI, optional filter: “Use only documents from: [dropdown of tags/sources]”. Pass as filter to retrieval. | Gives users control over scope and improves relevance. |
| **Search/filter in document list** | In Knowledge base: search by title, filter by tag/category, sort by date. | Makes large document sets manageable. |

### Tier 3 — Quality and learning

| Feature | Description | Why it matters |
|--------|--------------|-----------------|
| **Thumbs up/down on answers** | Per-message 👍/👎. Store in DB (e.g. MessageFeedback). | Enables future re-ranking, prompt tuning, and eval datasets from real usage. |
| **Optional: “Why this answer?”** | Expandable section showing the top N chunks (snippet + doc name) used for the reply. | Doubles down on trust and helps power users debug retrieval. |

### Tier 4 — Lifecycle and polish

| Feature | Description | Why it matters |
|--------|--------------|-----------------|
| **Re-ingest / refresh document** | Button “Re-index” per document: re-chunk, re-embed, replace existing embeddings for that doc. | Keeps answers fresh when source content changes. |
| **Last indexed / updated at** | Show “Last indexed: …” (or “Updated: …”) per document in the list. | Sets expectations and supports governance. |
| **Keyboard shortcuts** | e.g. Cmd+Enter to send, Esc to clear focus. | Power users work faster. |
| **Simple analytics (optional)** | Count: questions asked, documents used, feedback distribution. Dashboard or export. | Informs content gaps and model/retrieval tuning. |

---

## Suggested implementation order

1. **Source citations** — Highest impact on trust; fits current pipeline (you already have chunks and doc ids in retrieval).
2. **“No relevant context” message** — Quick win; improve system prompt and UI when context is empty or below threshold.
3. **Rename chat** — Small, high-perceived-value UX improvement.
4. **Document tags/metadata** — Schema + upload UI + retrieval filter; unlocks “filter by source” and better organization.
5. **Thumbs up/down** — Schema + UI; sets up a feedback loop for future improvements.

After that: filter-by-source in chat, re-ingest, then analytics/shortcuts as needed.

---

## References (summary)

- Enterprise RAG: hybrid search, metadata filtering, retrieval as first-class, security and governance (sources: Keerok, Jishu Labs, TechTarget, Redwerk, AWS Bedrock).
- Citations: inline or paragraph-level citations, references with snippets (Chatoptic, LlamaIndex, Anthropic, Mistral, Cohere).
- KB search UX: filters, facets, autocomplete, semantic search (Context Clue, Knowledge Base Software).
- Metadata: key-value metadata, pre-filtering before vector search (Ragie, AWS Bedrock, deepset).
- Feedback: thumbs up/down, re-ranking and tuning from feedback (Medium, Milvus, RAG Workbench, Machine Learning Plus).
