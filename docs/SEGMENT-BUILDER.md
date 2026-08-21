# Segment builder: what the new data model unlocks

**The builder didn't get better by redesign — it got better because the substrate changed.**
Today's segment builder queries campaign-shaped attribute bags: one flat table per file drop,
untyped values, raw column names, one record per member. The new builder queries the
[entity kernel](https://claude.ai/code/artifact/da4dfc78-e393-43cf-842e-858f28ff3e73) —
relational entities, typed fields, a labeling catalog, multi-instance records per member.
Every improvement below is a *consequence* of that model, not a UI feature bolted on.
(How we get from one to the other: the [migration brief](https://claude.ai/code/artifact/7dc6f19e-90c9-4cfd-847e-00cae9c6a272).)

## The substrate, in one paragraph

Any relational feed an FI sends — products, offers, eligibility, demographics — ingests as
**rows, never schema**: `ENTITY_DEF → FIELD_DEF → RECORD → VALUE`, plus a `CODE_MAP` label
dictionary, curated categories, and optional semantic roles (balance, recurring_date, code).
A member can hold many records of an entity; each record keeps its own typed values; codes
get FI-chosen labels in the catalog. The prototype runs this end-to-end against a real
Symitar VIP extract (178 members, 218 loans) — every number below is a live evaluation, not
a mock.

## Old builder → new builder, and what makes each possible

| | Today (production) | New builder | Enabled by |
|---|---|---|---|
| **Condition sources** | Flat menu that grows with every campaign file drop ("Dormant Account Win Back", "Loan Payment Reminder" as permanent entries) | Searchable picker grouped by curated categories; one search across entities, type labels, raw codes and field names — typing "visa" lands on Cards, "maturity" on Loans | Entities instead of file drops; `pulsate_category` grouping; catalog as search index |
| **Vocabulary** | Raw `Entity->Attribute_Name` arrows; mangled names ("C D Offer CD Renewal") | The FI's own field names everywhere; codes shown with catalog labels, and **unlabeled codes stay targetable by raw value** — labeling makes them readable, never eligible | `FIELD_DEF.user_label` + `CODE_MAP` — a naming layer between source columns and marketers |
| **Operators** | Untyped: "Member_Age is less than __ *minutes ago*"; relative time only — no calendar dates, no between, no is-set | Operators keyed to field type: calendar dates, between, is-in-the-past, and **is-set / not-set** (false ≠ never-recorded); string fields get "is" with a dropdown of *observed* values | `FIELD_DEF.type` + sentinel decoding at ingest (`--/--/----` → not set). Closes the customer gap analysis (G-1…G-8) |
| **Records** | One attribute bag per member — "the same loan is past due AND above $500" is inexpressible | Multi-instance records with **same-record semantics**: all conditions in a block must match the same loan; reach shows members *and* matching records (68 members · 90 records past due) | `RECORD` as a first-class row; per-record evaluation |
| **Quantifiers** | None — presence is implicit | "Have **any / no / 2 or more**" as a sentence, plus **count aggregates** for at-least-N (3+ loans → 13 members) | Records are countable per member |
| **Aggregates** | Impossible on flat bags | Per-member totals across matching records: *total Loan Balance more than $50,000* → 45 members | Typed values summable across a member's records |
| **Demographics** | Personal → Age, compared with time units | **Member Profile** entity: Age (derived at ingest — DOB never stored), State, contact flags; over-60 → 74 members, no-age-on-file → 55 (honest not-set) | Member-level data is just an entity with one record per member; PII discipline lives in the ingest |
| **Composition** | Flat rows with And/Or connectors | AND of OR-groups with visible grouping, **plus segment references**: "Are in / not in *〈saved segment〉*" — suppression lists, and `(A AND B) OR (C AND D)` by saving the halves and OR-ing the references. *In cross-sell AND not in past-due* → 35 members | Segments as first-class objects; recursive evaluation with cycle guard |
| **Reach** | "Estimate segment" button; count on demand | **Live exact reach** on every keystroke, with sample members showing exactly which records qualified — and honest annotations: unlabeled-code counts, unfilled date conditions flagged instead of silently zeroing, zero-data entities saying so | Typed projections make counting cheap; evaluation against real records makes samples explainable |
| **Events** | A separate "Events" source with its own operators | **App Events as a reserved entity** — the same block grammar covers it: *have any* = event recorded, *have no* = never, *2+* = occurrences, Occurred At = recency. Zero events ingested → the builder says so, honestly | Events are records of a platform-declared entity; one mental model for products, offers, eligibility *and* behavior |
| **Growth path** | Every campaign mints a new menu item forever | Every new feed becomes rows in existing (or new) entities; the catalog organizes instead of accumulating; mapped **semantic roles generate playbooks** ("Due Date reminders" exists because a recurring_date role exists) | Rows-never-schema ingestion; role-driven templates |
| **Enrollment** | Member-level only | Per-record: a member with two qualifying loans enters a flow once per loan, and tokens resolve from *that* record ("your Emag installment is due Aug 20") — stated in the flow's entry step, where it belongs | `RECORD` identity + primary-block semantics |

## Proof points (real extract, live evaluation)

All numbers evaluate against the ingested 081126 VIP extract — none are illustrative:

- **Cross-sell in two blocks**: *have any Loans AND have no Cards* → **103 members · 163 records**
- **Loans past due (loan-category, balance > 0)** → **68 members · 90 records**
- **Members over 60** → **74** · no age on file → **55** (shown as not-set, never guessed)
- **Total loan balance > $50k** → **45** · **3+ loans** → **13**
- **Composed**: in *Borrowers without a card* AND not in *Loans past due* → **35**
- **5 unlabeled codes** (6 records) — still targetable by raw code, flagged in the catalog's attention queue
- The State field's observed values include **"ZARAGOZA"** — a city typed into a state column at the source, displayed exactly as ingested: the builder doubles as a data-quality mirror

## Deliberately not there yet

Honesty about the edges: windowed event counts ("3 clicks in the last 30 days" — events have
no data yet), role-aware targeting (joint holders / primary-only sends — the model stores
`RECORD_MEMBER` roles; the UI doesn't use them yet), natively nested boolean groups
(composition via saved segments covers the shapes), and list export. Each is scoped in the
migration brief's phase plan.

## Where to look

- **Data model + working pipeline**: [DATA-MODEL](https://claude.ai/code/artifact/da4dfc78-e393-43cf-842e-858f28ff3e73) — the kernel ERD, scopes-and-segments-as-views, SQLite ingestion of the real extract
- **Getting production there**: [MIGRATION-BRIEF](https://claude.ai/code/artifact/7dc6f19e-90c9-4cfd-847e-00cae9c6a272) — the 20-source mapping, zero-breakage segment translation, phased rollout
- **The prototype**: branch `relational_entities_support` — everything above is clickable, and the Data section's *Migration preview* tab shows production's own condition sources mapped into the kernel
