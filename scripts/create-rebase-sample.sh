#!/usr/bin/env bash
# ============================================================
# Kommit — Interactive Rebase Sample Repository
# Creates a repo with commits covering all 6 rebase actions:
#   pick, reword, edit, squash, fixup, drop
# ============================================================

set -e

REPO_DIR="${1:-$HOME/kommit-rebase-sample}"

if [ -d "$REPO_DIR" ]; then
  echo "Directory already exists: $REPO_DIR"
  echo "Remove it first or pass a different path as argument."
  echo "  rm -rf $REPO_DIR"
  exit 1
fi

mkdir -p "$REPO_DIR"
cd "$REPO_DIR"

git init -b main
git config user.name  "Demo User"
git config user.email "demo@kommit.app"

# ── Helper ───────────────────────────────────────────────────
commit() {
  local msg="$1"; shift
  # Each remaining arg is "filename:content"
  for pair in "$@"; do
    local file="${pair%%:*}"
    local content="${pair#*:}"
    mkdir -p "$(dirname "$file")"
    printf '%s\n' "$content" > "$file"
  done
  git add -A
  GIT_AUTHOR_DATE="2024-01-01T10:00:00" \
  GIT_COMMITTER_DATE="2024-01-01T10:00:00" \
  git commit -m "$msg" --quiet
}

# ── Base commit (rebase will start FROM here) ────────────────
commit "chore: initial project setup" \
  "README.md:# My App" \
  "src/index.js:console.log('hello')"

# ── Commits to rebase (above the base) ──────────────────────

# 1. PICK — clean commit, keep as-is
commit "feat: add user model" \
  "src/user.js:class User { constructor(name) { this.name = name } }"

# 2. REWORD — good change, bad message
commit "stuff" \
  "src/user.js:class User {
  constructor(name, email) {
    this.name = name
    this.email = email
  }
}"

# 3. EDIT — correct code but needs an extra change added before continuing
commit "feat: add auth module" \
  "src/auth.js:function login(user, pass) { return user === 'admin' }"

# 4. SQUASH — belongs with the commit above, keeps both messages
commit "fix: auth module returns token" \
  "src/auth.js:function login(user, pass) {
  if (user === 'admin' && pass === 'secret') return 'tok_abc123'
  return null
}"

# 5. FIXUP — tiny typo fix, silently folds into the commit above
commit "fix: typo in auth comment" \
  "src/auth.js:// Validates credentials and returns a session token
function login(user, pass) {
  if (user === 'admin' && pass === 'secret') return 'tok_abc123'
  return null
}"

# 6. DROP — WIP debug commit, should be deleted
commit "WIP: console.log everything for debugging" \
  "src/auth.js:// Validates credentials and returns a session token
function login(user, pass) {
  console.log('login called', user, pass)
  if (user === 'admin' && pass === 'secret') return 'tok_abc123'
  return null
}" \
  "src/user.js:class User {
  constructor(name, email) {
    console.log('creating user', name)
    this.name = name
    this.email = email
  }
}"

# ── Summary ──────────────────────────────────────────────────
echo ""
echo "✓ Sample repo created at: $REPO_DIR"
echo ""
echo "Commit history (newest first):"
git log --oneline
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "HOW TO TEST IN KOMMIT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Open Kommit and load this repo:"
echo "   $REPO_DIR"
echo ""
echo "2. In the History view, right-click the commit labelled:"
echo "   'chore: initial project setup'"
echo "   → Select 'Interactive Rebase from here'"
echo ""
echo "3. In the Rebase panel, set actions as follows:"
echo ""
echo "   pick   feat: add user model            ← keep as-is"
echo "   reword stuff                            ← fix the bad message"
echo "   edit   feat: add auth module            ← pause to add a file"
echo "   squash fix: auth module returns token   ← merge up with combined message"
echo "   fixup  fix: typo in auth comment        ← merge up, discard message"
echo "   drop   WIP: console.log everything...  ← delete entirely"
echo ""
echo "4. Click 'Start Rebase' and follow any pause/conflict prompts."
echo ""
echo "Expected result — 3 clean commits:"
echo "   feat: add auth module (+ fix token + typo fix folded in)"
echo "   feat: add user model with email (rewrded message)"
echo "   feat: add user model"
echo "   chore: initial project setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
