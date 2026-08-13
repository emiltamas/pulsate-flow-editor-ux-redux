# Symitar extract validation — does real data satisfy the prototype's model?

**Verdict: yes, strongly — with four ingestion realities the wizard must handle.**

Analyzed: `081126.VIP.LOAN` (218 loan records, 767 columns) and `081126.VIP.NAME`
(457 name records, 153 columns), produced by Pulsate's own **Standard Batch Extract v1.3**
(PowerOn specfiles for NAME / SHARE / LOAN / CARD / EXTLOAN / ACCT). Raw files are never
committed to this repo — run `node tools/analyze-extract.mjs <VIP.LOAN> [<VIP.NAME>]`
against files kept outside it. Header schemas (no data) live in `fixtures/`.

## What the files confirm

1. **The extract is already relational.** One row per loan, keyed by hashed Account
   Number + Loan ID — exactly the member → product-records model, with stable per-product
   identity built in. The "canonical PowerOn specfile" recommendation turns out to already
   exist in-house as v1.3; the flat-on-the-user problem is a platform-ingestion artifact,
   not a source-data problem.
2. **Registry coverage is 100%.** All loan registry fields (balance, payment, due date,
   rate) plus identity/lifecycle (Loan ID, Loan Type, Open/Close/Charge-off dates) are
   present. ~11 of 767 columns are activatable; the other ~756 are core accounting
   internals that belong in the extension bag or on the floor — "store only what you can
   activate," measured.
3. **Multi-product targeting is not an edge case.** 46% of accounts with loans hold 2+
   (max 6 on one account). Per-product enrollment and same-instance matching are the
   common case in this sample, not the corner.
4. **The catalog screen matches the real workload.** 19 distinct 4-digit numeric Loan
   Type codes (0010, 0040, 0030…) need label + category mapping — per-CU, exactly the
   Product catalog UX. (Prototype mock codes should become 4-digit numeric for
   authenticity.)
5. **Households are derivable.** 279 of 457 name records are joint/other (Name Type ≠ 00)
   across 178 accounts — the Digital-Onboarding-style household layer has a data source.

## The four ingestion realities

1. **Blank-ness arrives encoded, not blank.** Unset dates are the sentinel `--/--/----`
   (Maturity: 48% of loans; Close/Charge-off: 100%). The G-5 blank-check work is
   validated — but the mapping layer must *decode sentinels to null* or every blank check
   silently fails. (`decode()` in `tools/analyze-extract.mjs` is the reference.)
2. **Type coercion is real work**: `56,488.01` (comma thousands), `5.750%` (percent
   sign), `08/15/2023` (US dates). The wizard's coercion step is not cosmetic.
3. **Freshness is a product problem.** 206 of 218 due dates are in the past relative to
   the file's own date — on this file, "due in the next 3 days" reaches ~nothing. Whether
   this sample is stale or delinquent-heavy, the lesson holds: date-anchored triggers are
   only as good as the freshness contract, and sync recency must be visible in the UI
   (it is — Sources KPI).
4. **PII flows in the extract today.** SSN/TIN populated on 87% of name records, plus
   Birth Date, Mother's Maiden Name, License. The wizard's exclude-by-default stance is
   necessary — and **v1.4 of the extract spec should stop emitting SSN/Maiden Name
   entirely**; an engagement platform never needs them, and the identity join works on
   Account Number.

## Bonus finding

Contactability: e-mail 11%, mobile 13% populated in NAME. For an engagement platform
that's the first "ready-to-launch" data-quality audience any FI needs: *members we
cannot reach digitally*.
