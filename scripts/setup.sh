#!/usr/bin/env bash
# One-shot setup: Supabase migrations + GitHub Pages config + push.
# Run from the repo root:  bash scripts/setup.sh
# Safe to re-run.

REF="frzsmsufnnlqptvzhfqu"
REPO="Pavan-PM-Portfolio/bobba_zone"
SB_URL="https://${REF}.supabase.co"

say()  { printf '\n\033[1;35m==> %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$1"; }

say "Installing dependencies"
npm install --no-audit --no-fund || { warn "npm install failed"; exit 1; }

say "Running tests"
npm test || { warn "Tests failed - not deploying"; exit 1; }

say "Supabase: login + link (you may be asked for the database password)"
npx -y supabase projects list >/dev/null 2>&1 || npx -y supabase login
npx -y supabase link --project-ref "$REF" || { warn "supabase link failed"; exit 1; }

say "Supabase: applying migrations (schema, RLS, game functions, realtime auth, 60 questions)"
npx -y supabase db push --include-all || { warn "db push failed"; exit 1; }

say "Supabase: auth settings - email login on, public sign-up and anonymous off (review the diff, then confirm)"
npx -y supabase config push --project-ref "$REF" \
  || warn "config push skipped - set auth options manually (see README)"

say "Supabase: reading the publishable key (never the secret key)"
KEY=$(npx -y supabase projects api-keys --project-ref "$REF" -o json 2>/dev/null | node -e '
  let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
    try{const k=JSON.parse(s);
      const pub=k.find(x=>String(x.api_key||"").startsWith("sb_publishable_"))
             ||k.find(x=>x.name==="anon");
      process.stdout.write(pub?pub.api_key:"");
    }catch{}});')
if [ -z "$KEY" ]; then
  warn "Could not read the key automatically. Copy it from: https://supabase.com/dashboard/project/$REF/settings/api-keys"
  printf "Paste the publishable/anon key: "; read -r KEY
fi
case "$KEY" in sb_secret_*) warn "That is a SECRET key. Refusing."; exit 1;; esac

printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_PUBLISHABLE_KEY=%s\n' "$SB_URL" "$KEY" > .env.local
echo "Wrote .env.local (git-ignored) for local dev"

say "GitHub: repo variables + Pages (GitHub Actions)"
if command -v gh >/dev/null 2>&1; then
  gh auth status >/dev/null 2>&1 || gh auth login -w
  gh variable set VITE_SUPABASE_URL --repo "$REPO" --body "$SB_URL"
  gh variable set VITE_SUPABASE_PUBLISHABLE_KEY --repo "$REPO" --body "$KEY"
  gh api -X POST "repos/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
    || gh api -X PUT "repos/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
    || warn "Enable Pages manually: https://github.com/$REPO/settings/pages -> Source: GitHub Actions"
else
  warn "GitHub CLI (gh) not found. Do these two things in the browser, then continue:"
  echo "  1) https://github.com/$REPO/settings/variables/actions -> New variable:"
  echo "       VITE_SUPABASE_URL = $SB_URL"
  echo "       VITE_SUPABASE_PUBLISHABLE_KEY = (the key above)"
  echo "  2) https://github.com/$REPO/settings/pages -> Source: GitHub Actions"
  printf "Press Enter when done... "; read -r _
fi

say "Pushing to GitHub (this triggers the deploy)"
git push -u origin main || { warn "git push failed"; exit 1; }

say "Next: create player accounts"
echo "Supabase -> Authentication -> Users -> Add user -> Create new user (tick Auto Confirm User)"
open "https://supabase.com/dashboard/project/$REF/auth/users" 2>/dev/null || true

say "Done"
echo "Deploy progress: https://github.com/$REPO/actions"
echo "Live (in ~2 min): https://pavan-pm-portfolio.github.io/bobba_zone/"
