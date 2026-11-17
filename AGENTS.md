<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All Quran text/metadata network access lives in `src/lib/quran/service.ts`; UI never calls the Quran API directly — keeps the text source swappable.
- Range math, validation and random passage selection are pure functions in `src/lib/exam/` with tests in `exam-logic.test.ts` — run them after changing selection rules.
- Recitation scoring goes only through `src/lib/assessment/adapter.ts`; never fabricate transcripts, mistakes or scores in the UI — a real provider must implement `RecitationAssessmentProvider` (call it via a server function if it needs keys).
- UI copy lives in `src/lib/i18n/en.ts` (typed `UiStrings`); add locales with the same shape instead of hardcoding strings.
- Active session state is in-memory React context (`src/lib/session/session-context.tsx`); history persists to localStorage without audio — recordings must never be persisted or uploaded.
- Review text is rendered exactly as returned by the source; only the prompt excerpt may trim (first words, Basmalah prefix skipped).
- Correction mapping lives in `src/lib/assessment/corrections.ts`: accept only provider-aligned evidence for the locked ayah keys and exact source text, revalidate spans before rendering, and fail ambiguous/invalid evidence to Needs review rather than invent judgments.
- TajweedFormer remains a setup-only assessment adapter until the official licensed SDK and reliable phoneme-to-word alignment are verified; the source-span mapper is not a phoneme aligner and performs no inference.
