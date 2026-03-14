#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
    exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# ── 1. Verify git identity ──────────────────────────────────────────
GIT_NAME=$(git config user.name 2>/dev/null || true)
GIT_EMAIL=$(git config user.email 2>/dev/null || true)

if [ "$GIT_NAME" != "mathdadships" ] || [ "$GIT_EMAIL" != "mathdadships@users.noreply.github.com" ]; then
    git config user.name "mathdadships"
    git config user.email "mathdadships@users.noreply.github.com"
    echo "[session-start] Git identity set to mathdadships"
fi

# ── 2. Auto-update "Recent Work" in CLAUDE.md from git log ──────────
CLAUDE_MD="$CLAUDE_PROJECT_DIR/CLAUDE.md"

if [ -f "$CLAUDE_MD" ]; then
    # Get last 10 commits on main (or current branch) as recent work summary
    RECENT_WORK=$(git log --oneline -10 --format="- %s" 2>/dev/null || echo "- (no commits found)")

    # Build the replacement block
    NEW_BLOCK="### Recent Work
${RECENT_WORK}"

    # Check if "### Recent Work" section exists
    if grep -q "^### Recent Work" "$CLAUDE_MD"; then
        # Replace everything from "### Recent Work" line to the next "##" heading
        # Single-pass awk: print the header + new content, skip old content
        awk -v work="$RECENT_WORK" '
            /^### Recent Work/ {
                print "### Recent Work (auto-updated)"
                print work
                print ""
                skip = 1
                next
            }
            skip && /^##/ {
                skip = 0
            }
            skip { next }
            { print }
        ' "$CLAUDE_MD" > "${CLAUDE_MD}.tmp"

        mv "${CLAUDE_MD}.tmp" "$CLAUDE_MD"

        echo "[session-start] Updated 'Recent Work' in CLAUDE.md from git log"
    else
        echo "[session-start] WARNING: No '### Recent Work' section found in CLAUDE.md"
    fi
fi

# ── 3. Validate game count ──────────────────────────────────────────
INDEX="$CLAUDE_PROJECT_DIR/index.html"

if [ -f "$INDEX" ]; then
    # Count entries in GAME_SEQUENCE array (lines with "file:" in them)
    SEQ_COUNT=$(grep -c "file:" "$INDEX" 2>/dev/null || echo "0")

    # Count actual game HTML files referenced in GAME_SEQUENCE
    GAME_FILES=$(grep -oP "file:\s*'[^']+'" "$INDEX" 2>/dev/null | sed "s/file: '//;s/'//" | sort)
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
