# Project Rules for Claude Code

## Privacy & Security
- Never commit any personal information, API keys, or credentials to git
- Always use .env files for secrets and ensure they are gitignored
- Git author should always be **mathdadships** with email **mathdadships@users.noreply.github.com**
- If no git identity is configured, ASK — never default to system username or hostname
- Never include real names, personal emails, or identifying info in commits or code
- The Supabase key in `tracker.js` is an intentionally public (anon/publishable) key — do NOT move it to .env. But never add private/service-role keys the same way

## Project Info
- This is a collection of 28 standalone educational math games for 3rd graders (ages 8-9)
- Games are organized by Unit 4 (multiplication/division) and Unit 5 (fractions)
- `index.html` is the hub page that links to all games
- Hosted via GitHub Pages at https://mathdadships.github.io/math-games/
- **This file is the single source of truth** — project rules, architecture, and current status all live here

## Current Status

### Games (28 total)
**Unit 4 — Multiplication & Division (10 games):**
- `number_family_407.html` — Fact Families
- `division_detective_ML407.html` — Division
- `fact_builder_408.html` — Multiplication
- `rectangle_builder_409.html` — Arrays
- `expression_match_410.html` — Expressions
- `tens_multiply_411.html` — Multiply by 10s
- `two_step_415.html` — Two-Step Word Problems
- `division_story_416.html` — Division Word Problems
- `division_buildup_417.html` — Division Build Up
- `multiplication_arcade_zombie.html` — Arcade (legacy name)

**Unit 5 — Fractions (18 games):**
- `partition_blast_502.html` — Partitioning
- `fraction_blast_503.html` — Fractions
- `fraction_strips_504.html` — Visual Fractions
- `shade_shifters_505.html` — Shading Fractions
- `fraction_finder_506.html` — Number Lines
- `fraction_finder_507.html` — Number Lines
- `space_defender_508.html` — Fractions = Wholes
- `fraction_arcade_509.html` — Locating Fractions
- `fraction_blaster_510.html` — Fractions
- `fraction_transformer_511.html` — Equivalent Fractions
- `fraction_finder_512.html` — Comparing Fractions
- `fraction_whole_number_513.html` — Whole Numbers
- `whole_numbers_514.html` — Fraction Match
- `face_off_515.html` — Comparing
- `fraction_faceoff_516.html` — Comparing
- `fractions_review.html` — Review (legacy name)
- `fraction_invaders.html` — Arcade (legacy name)

**Other files (not games):**
- `teacher.html` — Teacher dashboard
- `tracker.js` — Shared progress tracking module
- `dd.html`, `tens_multiply_hard.html`, `test_scoring.html` — Dev/test files

### Infrastructure
- **Tracker (`tracker.js`):** Supabase-backed student login, progress auto-save, question recording, adaptive replay (missed-problem re-queuing)
- **Hub (`index.html`):** Card grid with per-game score display (percentage + fraction), prev/next navigation via `GAME_SEQUENCE`
- **Teacher dashboard (`teacher.html`):** Session history, per-question drill-down, first-attempt scoring

### Recent Work
- Hub card scores showing percentage + fraction based on first-attempt scoring
- Question deduplication and session-scoped question loading in teacher dashboard
- Descriptive question text recording in Fraction Blast/Blaster
- Equivalent fraction display fixes

### Recent Commits (auto-updated)
<!-- RECENT_COMMITS_START -->
- Address PR review feedback
- Add QA, UI, and code review agents
- Add SessionStart hook for automated CLAUDE.md updates and validation
- Make CLAUDE.md the single source of truth for project status
- Expand CLAUDE.md with architecture rules, tracker contract, and conventions
- Fix equivalent fraction pairs to display horizontally on one line
- Show percentage + fraction on game card scores
- Use first-attempt scoring for hub card scores
- Show latest score on game cards in hub page
- Record descriptive question text in Fraction Blast and Blaster
<!-- RECENT_COMMITS_END -->

## Architecture — Non-Negotiable Rules

**No build system.** Every game is a single standalone HTML file with all CSS and JS inline. No npm, no webpack, no frameworks, no shared CSS files. The only shared file is `tracker.js`. Never introduce build tooling, package.json, or split a game into multiple files.

**GitHub Pages deployment.** Files are served as-is. No server-side processing. Any new file must work as a static asset.

**`tracker.js` is the only shared module.** It handles student login, progress tracking, question recording, and adaptive replay. All games include it via `<script src="tracker.js"></script>`.

## Hub Page (`index.html`) — Dual Sync Requirement

`index.html` contains the game list in TWO places that must stay in sync:

1. **HTML card grid** — the `<a href="game.html">` cards users click
2. **`GAME_SEQUENCE` JavaScript array** — used for prev/next navigation between games

When adding, removing, or renaming a game, you MUST update both. If they diverge, navigation breaks silently.

## File Naming

Games follow the pattern `{descriptive_name}_{lesson_number}.html`:
- `fraction_arcade_509.html`, `two_step_415.html`, `division_detective_ML407.html`

Some older games don't follow this pattern (`multiplication_arcade_zombie.html`, `fractions_review.html`). New games should use the standard pattern.

## Tracker Integration Contract

See `tracker.js` for the full API. Every game must call `requireLogin()`, `startAutoSave()`, and `recordQuestion()`. Copy the tracker IIFE from an existing game (e.g., `fraction_blast_503.html`) as a starting point.

**Critical rules:**
- The `gameFile` string in the tracker IIFE **must exactly match the HTML filename**. A mismatch silently breaks progress tracking — this is the #1 silent bug.
- Every answer (correct AND incorrect) must call `GameTracker.recordQuestion()`. Call `GameTracker.checkAutoSave()` after incrementing `questionsAnswered`.
- Integrate adaptive replay: `markMissed()` on wrong, `getMissedProblem()` when generating, `markCorrected()` when fixed.

## Required Global Variables

`tracker.js` reads these globals for auto-save. **Use these exact names** — anything else silently reports 0:

| Variable | Purpose |
|---|---|
| `questionsAnswered` | Progress count (primary). `questionNumber` accepted as fallback |
| `score` | Points earned |
| `bestStreak` | Longest correct streak. `streak` accepted as fallback |
| `streak` | Current streak |

## Game HTML Structure

New games should follow the structure of an existing game (e.g., `fraction_blast_503.html`). Copy one as a starting point.

Key conventions:
- `user-scalable=no` on game pages (prevents zoom during touch gameplay)
- CSS reset: `* { margin: 0; padding: 0; box-sizing: border-box; }`
- Screen toggling uses `.show` class on `#start-screen`, `#end-screen`, etc.
- Use a `canAnswer` flag to prevent double-click/double-tap on answer buttons

## Code Style

- Use `let`/`const`, not `var` (some older code in `index.html` uses `var` — don't propagate)
- 4-space indentation
- Use `textContent` over `innerHTML` when inserting user-facing text (safety)
- Inline test function `runMathTests()` triggered by Ctrl+T — add this to new games for math generation validation

## UX & Design Rules (Pedagogically Important)

**Audience:** 3rd graders (8-9 years old) on school Chromebooks and iPads.

**Wrong answer color:** Use amber/orange (`#E8A838`), NEVER red. This is a deliberate pedagogical choice — red feels punitive to young students.

**Growth mindset feedback:** Wrong answers show encouraging messages from a `growthMessages` array (e.g., "Almost! Let's try again!", "Great effort! Keep going!"). Never use discouraging language.

**Correct answer feedback:** Use age-appropriate celebratory slang (e.g., "NO CAP!", "GOATED!", "SLAY!", "W!"). Keep it fun and current.

**Touch targets:** Must be large enough for small fingers. Minimum ~44px tap targets. School Chromebook trackpads are imprecise too.

**Hub page brand:** Purple gradient (`#667eea` to `#764ba2`). Individual games have their own themes (arcade neon, space, etc.).

## Audio Pattern

Games use Web Audio API with lazy `AudioContext` initialization on first user interaction. See any existing game's `initAudio()` / `playSound()` for the pattern. No `<audio>` tags or external audio files.

## SessionStart Hook & Automation

A SessionStart hook (`.claude/hooks/session-start.sh`) runs on every new Claude Code session (local and remote). It is **required infrastructure** — do not remove or disable it.

**What it does:**
1. **Git identity** — auto-sets to `mathdadships` on remote; warns if different on local
2. **Auto-updates "Recent Commits"** — overwrites the `<!-- RECENT_COMMITS_START/END -->` section with `git log --oneline -10`. This is the auto-generated section only; the human-written "Recent Work" section above it is preserved
3. **Validates game inventory** — checks that all files in `GAME_SEQUENCE` exist on disk

**Session-end requirement — update "Recent Work":**
Before ending any session that makes meaningful changes, you MUST update the "### Recent Work" section with a **human-readable summary** of what was done and why. This section is never overwritten by the hook — it's the primary context for the next session. Commit this update as part of your final push.

**Rules:**
- Never edit the `<!-- RECENT_COMMITS_START/END -->` block manually — it's machine-managed
- The human "Recent Work" section is your responsibility — write meaningful summaries, not commit messages
- The hook is registered in `.claude/settings.json` — do not remove that config
- When adding new automated checks, add them to the hook script rather than creating separate scripts

## Review Agents (Required)

Three specialized review agents live in `.claude/agents/`. **Before finalizing any PR or push that changes game files, run all three agents against the changed files.** They enforce the project's rules from different angles:

| Agent | File | Focus |
|-------|------|-------|
| **QA Review** | `.claude/agents/qa-review.md` | Tracker integration, variable naming, hub sync, silent bugs |
| **UI Review** | `.claude/agents/ui-review.md` | Pedagogy (no red, growth mindset), touch targets, accessibility |
| **Code Review** | `.claude/agents/code-review.md` | Architecture, code style, security, common bugs |

Each agent outputs a structured checklist of PASS/FAIL items. Fix all FAILs before merging.

## What NOT to Do

- Never add npm/webpack/build tooling
- Never split a game into multiple files (separate .css or .js)
- Never use red for wrong answers
- Never name score variables something other than `score`, `questionsAnswered`, `streak`, `bestStreak`
- Never forget to update BOTH the HTML cards and `GAME_SEQUENCE` in `index.html`
- Never use `var` in new code
- Never add external dependencies beyond Google Fonts and `tracker.js`
