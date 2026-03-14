#!/bin/bash
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# ── 1. Verify git identity ──────────────────────────────────────────
# Auto-set on remote; warn on local if different
GIT_NAME=$(git config user.name 2>/dev/null || true)
GIT_EMAIL=$(git config user.email 2>/dev/null || true)

if [ "$GIT_NAME" != "mathdadships" ] || [ "$GIT_EMAIL" != "mathdadships@users.noreply.github.com" ]; then
    if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
        git config user.name "mathdadships"
        git config user.email "mathdadships@users.noreply.github.com"
        echo "[session-start] Git identity set to mathdadships"
    else
        echo "[session-start] WARNING: Git identity is '$GIT_NAME <$GIT_EMAIL>', expected 'mathdadships <mathdadships@users.noreply.github.com>'"
    fi
fi

# ── 2. Auto-update git log section in CLAUDE.md ─────────────────────
# Only overwrites the auto-generated section between sentinel markers.
# The human-written "Recent Work" section above the markers is preserved.
CLAUDE_MD="$CLAUDE_PROJECT_DIR/CLAUDE.md"

if [ -f "$CLAUDE_MD" ]; then
    RECENT_WORK=$(git log --oneline -10 --format="- %s" 2>/dev/null || echo "- (no commits found)")

    if grep -q "<!-- RECENT_COMMITS_START -->" "$CLAUDE_MD" && grep -q "<!-- RECENT_COMMITS_END -->" "$CLAUDE_MD"; then
        awk -v work="$RECENT_WORK" '
            /<!-- RECENT_COMMITS_START -->/ {
                print
                print work
                skip = 1
                next
            }
            /<!-- RECENT_COMMITS_END -->/ {
                skip = 0
            }
            skip { next }
            { print }
        ' "$CLAUDE_MD" > "${CLAUDE_MD}.tmp"

        mv "${CLAUDE_MD}.tmp" "$CLAUDE_MD"

        echo "[session-start] Updated recent commits in CLAUDE.md"
    else
        echo "[session-start] WARNING: Missing RECENT_COMMITS sentinel markers in CLAUDE.md"
    fi
fi

# ── 3. Validate game count ──────────────────────────────────────────
INDEX="$CLAUDE_PROJECT_DIR/index.html"

if [ -f "$INDEX" ]; then
    SEQ_COUNT=$(grep -c "file:" "$INDEX" 2>/dev/null || echo "0")

    GAME_FILES=$(grep -oE "file:\s*'[^']+'" "$INDEX" 2>/dev/null | sed "s/file: '//;s/'//" | sort)
    MISSING=""
    for f in $GAME_FILES; do
        if [ ! -f "$CLAUDE_PROJECT_DIR/$f" ]; then
            MISSING="$MISSING $f"
        fi
    done

    if [ -n "$MISSING" ]; then
        echo "[session-start] WARNING: Missing game files referenced in GAME_SEQUENCE:$MISSING"
    else
        echo "[session-start] All $SEQ_COUNT games in GAME_SEQUENCE exist on disk"
    fi
fi

echo "[session-start] Session ready"
