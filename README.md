# Ayah Recall Challenge

Build a polished, responsive web application called "Hifz Challenge" (Arabic subtitle: اختبار الحفظ), an AI-assisted Quran memorization self-examination app. This is a standalone app inspired by the user's requested workflow; do not claim it is an official Tarteel app or an extension/plugin of Tarteel.

PRODUCT GOAL
A learner selects a Quran memorization range, chooses how many rounds/tests to take and how many ayahs to recite per round. The app randomly selects a starting ayah inside that range, shows only a short opening prompt from that ayah (not the full continuation), and asks the learner to recite from memory for the configured number of ayahs. Repeat for the configured number of rounds. Show a clear results report at the end.

CORE USER FLOW
1. Dashboard / setup screen:
   - Select range by Juz start/end (e.g. Juz 1 through Juz 2), with an alternative Surah + ayah range selector.
   - Configure number of tests/rounds (default 5; sensible range 1–20).
   - Configure ayahs per test (default 5; sensible range 1–20).
   - Random start selection, with option to avoid repeating the same start ayah in one session when enough ayahs exist.
   - Optional recitation mode: continuous (recite the selected ayah and following ayahs) or prompt-only.
   - Clear summary of estimated total ayahs and selected range before starting.
2. Examination screen:
   - Show round number, progress, selected range, and target length.
   - Randomly choose a valid start ayah such that the requested number of consecutive ayahs fit within the selected range.
   - Reveal only the opening words of the starting ayah as the prompt; never show the full target passage before/during the test.
   - Include a large Arabic prompt with correct RTL layout, a microphone record/pause/stop control, elapsed timer, and clear recording state.
   - User can listen back to their recording.
   - Provide a "Finish this round" control and next-round flow.
   - During this MVP, implement browser microphone capture using MediaRecorder with permission/error handling and local in-memory recording playback. Do not upload recordings anywhere.
   - Build a clearly labeled assessment adapter/state: if no Quran-aware ASR provider is configured, mark the round as "Recording captured — AI assessment not connected" and provide a manual self-assessment option (correct / minor mistakes / needs revision). Do NOT fabricate transcription, mistake detection, tajweed scoring, or AI accuracy. Structure the code so a real Quran-aware speech-recognition provider can be integrated later.
3. Results screen:
   - Summary of completed rounds, total target ayahs, manual self-assessment outcomes, and session duration.
   - Per-round review with the hidden passage revealed only after that round is submitted, including surah and ayah references and full Arabic text for review.
   - Restart with same settings or return to setup.
4. Session history:
   - Save session settings and results locally (localStorage) so the learner can review past sessions. Do not persist raw audio recordings.
   - Provide a clear history screen and ability to delete an individual session / clear history.

QURAN DATA
- Use a reliable Quran text source/API and include a robust loading/error state. Prefer a public Quran API with Arabic Uthmani text and verse metadata. Do not hardcode fabricated Quran verses. Keep Quran data access isolated in a service module.
- Model ayahs with surah number/name, ayah number, juz number, Arabic text, and a stable key.
- Support Juz range selection accurately. If exact Juz metadata is unavailable from the chosen API, disclose the limitation and offer Surah/ayah range selection rather than pretending Juz boundaries are accurate.
- Ensure random starts and target passages never cross the selected range boundary.
- Respect Quran text integrity: display text exactly as returned by the source, avoid altering or truncating the review text; the prompt excerpt may show only the first few words with an ellipsis.
- Add source attribution for Quran text in an unobtrusive About/Data Sources section.

DESIGN
- Premium, calm Islamic learning aesthetic: deep emerald/forest green, warm ivory, subtle gold accents, elegant Arabic typography, generous spacing, restrained geometric motifs. Avoid clutter and avoid making it look like a generic admin dashboard.
- Mobile-first and fully responsive, accessible controls, high contrast, keyboard support.
- Use Arabic RTL for Quran text and support English UI initially; organize strings so Arabic/French UI can be added later.
- Main navigation: Practice, History, About.
- Add a demo/sample state only if clearly labeled; never present demo assessment as real AI.
- Include onboarding/help text explaining how the examination works and the current limitation that live Quran-aware AI correction requires a connected speech assessment provider.

TECHNICAL
- Use the default Lovable stack (React + TypeScript + Tailwind + shadcn/ui). Keep components modular and strongly typed.
- No paid API keys or external secrets should be assumed. Do not request credentials.
- Implement functional setup, range validation, random selection, recording capture/playback, manual self-assessment, results, and local history. Handle browser microphone denial and unsupported browsers gracefully.
- Add unit tests for range validation and random passage selection if the project supports tests.
- Do not deploy/publish automatically. Build the app and provide a preview.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/47d80bc1-c194-45c7-a007-86787d0e2efc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
