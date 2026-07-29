# Requirements — Embed Multi-Product (Member → Products) Support in the Flow Editor Prototype

**Scope:** `flow-editor-ux-redux` UX prototype only. Mock data, no backend.
**Author:** Emil Tamas · **Date:** 29 Jul 2026 · **Status:** Draft
**Context docs:** "Supporting Multiple Products per Member — Problem Statement" (2026-07-29 review) · Automated Campaigns proposal · MVP2 milestone post

---

## 1. Purpose

The platform is being remodeled so a member can hold many products (savings, checking, several loans), each with its own attributes (balance, payment, due date). This prototype must demonstrate the **marketer-facing consequences** of that remodel inside the automated-campaign (flow) editor, so we can validate the UX before engineering designs the build:

1. Target on product facts in **one rule** — "anyone with any loan due in the next 3 days" — without listing fields by hand.
2. Carry the **specific matched product** into the message — "your Auto Loan payment of $342 is due Aug 6."
3. Make **per-product enrollment** semantics visible and understandable (a member with two qualifying loans is handled twice, safely).

The prototype demos the flagship use case: **loan payment reminder** (and by extension CD renewal).

## 2. Baseline (what exists today, keep working)

- `FlowCanvas.jsx` — vertical chain: Start/Entry-audience node → optional Message node → Add-step (+) with Message enabled, Delay/Branch stubbed "Soon".
- `Sidebar.jsx` — entry audience editor: **Segments** and **Geofences** tabs, search, Groups filter, reach hero, selected chips, `UserDrillIn` per segment.
- `MessageSidebar.jsx` — name, live preview per channel, ordered channel cascade (Push / In-app / Feed + feed-card companions), title/body/CTA, skip rules.
- `data.js` — mock segments/geofences/channels, `sampleUsers()` generator.

All existing flows (segment-only audiences, geofences, plain messages) must keep working unchanged — mirroring the platform's own backward-compatibility non-negotiable.

## 3. Requirements

### R1 — Mock product data model (`data.js`)

1. Add a product taxonomy with **common categories** (Deposit, Loan, Certificate, Card) and **FI-specific labels** per type (e.g. "Share Savings", "Auto Loanstan", "Visa Platinum") to demonstrate that the marketer sees their FI's own vocabulary while "any Loan" still works as a category.
2. Each product type declares its **own field set** (e.g. Loan: balance, monthly payment, due date, rate; Certificate: balance, maturity date, APY; Deposit: balance). Fields carry a type (currency / date / number) that drives operator choices.
3. Extend the sample-member generator so each member holds **1–5 products**, including members with **two or more products of the same type** (two loans) — required to demo per-product enrollment and same-day collision.
4. Keep counts realistic to the problem statement (~3 products per member average).

### R2 — Product rule builder (`Sidebar.jsx`)

1. Add a third tab **Products** alongside Segments / Geofences.
2. A product rule consists of:
   - **Quantifier:** *has any* / *has none* / *has 2 or more* (default: has any).
   - **Product scope:** two-level picker — common category first (Any loan, Any certificate…), optionally narrowed to specific FI product labels. This is the replacement pattern for the flat field list; no raw field names like `auto_loan_due_date` may appear anywhere.
   - **Conditions:** 0–n rows of field / operator / value, where the field list is **scoped to the selected product type** (a dozen fields, not thousands). Date fields must offer **relative operators**: "is in the next N days", "is tomorrow", "was more than N days ago".
3. **Same-item semantics, explicit in copy:** all conditions in one rule apply to the *same* product. Show helper text: *"All conditions must match the same product."* (This is the Braze pitfall we are deliberately designing out; do not implement independent-per-condition evaluation.)
4. v1: **one product rule per audience**, combinable with selected segments (AND). Multiple rules / OR groups are out of scope.
5. The rule must render as a **plain-language sentence** wherever summarized: *"Any loan where payment due date is in the next 3 days."*

### R3 — Dual reach counts

Wherever reach is shown (reach hero in `Sidebar.jsx`, Start node card in `FlowCanvas.jsx`), a product-rule audience shows **both numbers**: matched **members** and matched **products** (e.g. "~1,240 members · 1,610 matching loans"). Mock the math so products ≥ members. This is how the UI teaches per-product enrollment before the user reads any docs.

### R4 — Start node summary (`FlowCanvas.jsx`)

When a product rule exists, the Start card gains a third summary line (product icon) with the plain-language rule sentence, alongside the existing segments and geofences lines. Estimated reach uses the R3 dual count.

### R5 — Matched product in the user drill-in (`UserDrillIn.jsx`)

For a product-rule audience, each member row expands (or sub-lists) to show **which product(s) matched** — label, key field values, one line per matched product. A member with two qualifying loans appears with two matched-product lines and a "will be enrolled twice" hint.

### R6 — Product personalization (`MessageSidebar.jsx`)

1. When (and only when) the flow's audience includes a product rule, title/body/CTA gain an **Insert token** affordance with a product namespace: `{{product.label}}`, `{{product.balance}}`, `{{product.payment}}`, `{{product.due_date}}` — fields offered are those of the rule's product scope.
2. Any message using product tokens requires a **fallback text** per token (or one message-level fallback) before Save is enabled.
3. The **preview renders with a sample matched product** (e.g. "Your Auto Loan payment of $342 is due Aug 6") and offers a toggle to preview the fallback rendering.
4. The Message node card on the canvas shows a small "Personalized · product" badge when tokens are used.

### R7 — Enrollment & collision semantics made visible

1. An info panel (Start card footer or audience sidebar) states the model in one sentence: *"Each matching product enrolls separately — a member with two qualifying loans gets each reminder."*
2. A **frequency-cap control (mocked):** "Send at most [1] product message per member per [day]", with sub-copy explaining collision behavior (*"if two products qualify the same day, the closest due date sends first; others follow on the cap schedule"*). Non-functional; the control and copy are what we are testing.

### R8 — Branch on product attribute (stretch, behind the existing "Soon" stub)

If time allows, enable the Branch step only for product-rule flows: branch paths by product category/label (Auto loan / Credit card / **Everything else** required default). Otherwise leave stubbed — do not block R1–R7 on this.

## 4. Non-goals (prototype)

- No real data, ingestion, or file handling; no per-FI label-mapping admin UI (that's platform area 2).
- No nested condition groups, no OR between product rules, no aggregates ("total loan balance across products").
- No digest/combined messages ("2 payments due this week") — copy may allude to it as future.
- No changes to geofences, channel cascade mechanics, or skip rules.

## 5. Acceptance — the demo script must work end to end

1. Open the flow editor → Choose audience → **Products** tab.
2. Build: *has any* · *Any loan* · *payment due date is in the next 3 days*. Helper text about same-product matching is visible.
3. Reach hero shows members **and** matching-loans counts; Start card shows the rule sentence and dual reach.
4. Drill-in shows a member with **two** matched loans, flagged as two enrollments.
5. Create message; insert `{{product.label}}` and `{{product.due_date}}`; Save blocked until fallback provided; preview shows "Your Auto Loan… Aug 6" and the fallback variant.
6. Frequency-cap control visible with collision copy.
7. A pre-existing segment-only flow still behaves exactly as before.

## 6. Open questions

1. Should the Products tab be a peer of Segments, or should product rules live *inside* a segment definition (closer to how the platform will likely model it)? Prototype takes the peer-tab route for demo clarity — flag for design review.
2. Chip/summary treatment when segments AND a product rule are both set — is AND obvious enough?
3. Does "has none" (negation) earn its place in v1 of the real build, or is it prototype-only?
4. Token syntax (`{{product.*}}`) — align with whatever personalization syntax the platform message composer ships.
