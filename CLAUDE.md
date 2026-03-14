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
- **Read status.md first** — it contains full project history, architecture, and current state
- `status.md` is gitignored and local-only

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

Every game MUST include this boilerplate at the bottom of its `<script>`:

```js
(function() {
    const gameFile = 'your_game_filename.html';  // MUST match actual filename
    GameTracker.requireLogin().then(student => {
        GameTracker.startAutoSave({ gameFile: gameFile, interval: 3 });
    });
})();
```

The `gameFile` string **must exactly match the HTML filename**. A mismatch silently breaks progress tracking.

## Required Global Variables

`tracker.js` reads these globals from the game's scope for auto-save (`checkAutoSave()` and `saveOnExit()`):

| Variable | Purpose | Required? |
|---|---|---|
| `questionsAnswered` | Progress count (primary) | Yes — use this name |
| `questionNumber` | Fallback if `questionsAnswered` undefined | Acceptable fallback |
| `score` | Points earned | Yes |
| `bestStreak` | Longest correct streak | Yes (or `streak` as fallback) |
| `streak` | Current streak, fallback for `bestStreak` | Yes |

If you name these differently (e.g., `points` instead of `score`), auto-save will silently report 0. This is the most common silent bug.

## Question Recording

Every answer — correct AND incorrect — must call:

```js
GameTracker.recordQuestion({
    questionText: '6 × 7',           // human-readable problem
    studentAnswer: '48',              // what the student chose
    correctAnswer: '42',              // the right answer
    isCorrect: false,                 // boolean
    attemptNumber: 1                  // which attempt (1-based)
});
```

Also call `GameTracker.checkAutoSave()` after incrementing `questionsAnswered`.

## Adaptive Replay

Games should integrate the missed-problem replay system:

- `GameTracker.markMissed(params)` — call when student gets a problem wrong
- `GameTracker.getMissedProblem()` — call when generating the next problem (returns `null` or a missed problem to retry)
- `GameTracker.markCorrected(params)` — call when a previously-missed problem is answered correctly

The `params` object is game-specific (whatever you need to reconstruct the problem).

## Game HTML Structure

Every game follows this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Game Title</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        /* all CSS inline */
    </style>
</head>
<body>
    <div id="start-screen">...</div>
    <div id="game-container">...</div>
    <div id="end-screen">...</div>
    <script src="tracker.js"></script>
    <script>
        // all JS inline
        // global state: score, streak, bestStreak, questionsAnswered, canAnswer
        // tracker IIFE at the bottom
    </script>
</body>
</html>
```

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

Games use Web Audio API with lazy initialization:

```js
let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
```

Call `initAudio()` on first user interaction. Sound definitions are per-game in a `playSound(type)` function.

## What NOT to Do

- Never add npm/webpack/build tooling
- Never split a game into multiple files (separate .css or .js)
- Never use red for wrong answers
- Never name score variables something other than `score`, `questionsAnswered`, `streak`, `bestStreak`
- Never forget to update BOTH the HTML cards and `GAME_SEQUENCE` in `index.html`
- Never use `var` in new code
- Never add external dependencies beyond Google Fonts and `tracker.js`
