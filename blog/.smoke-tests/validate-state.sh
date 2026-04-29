#!/usr/bin/env bash
# state/keep/naver json 파일 스키마 검증 (v2: Chrome MCP 방식)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ok() { echo "OK: $1"; }

# state.json
STATE="${1:-$ROOT/.state/state.json}"
if [ -f "$STATE" ]; then
  node - "$STATE" <<'EOF'
const fs = require('fs');
const path = process.argv[2];
let data;
try { data = JSON.parse(fs.readFileSync(path, 'utf-8')); }
catch (e) { console.log('FAIL: invalid JSON: ' + path); process.exit(1); }
const required = ['version','total_drafts','total_published','total_failed','last_run_at','last_published_at','recent_published','tag_frequency'];
const missing = required.filter(k => !(k in data));
if (missing.length) { console.log('FAIL: state.json missing fields: ' + missing.join(',')); process.exit(1); }
console.log('OK: state.json schema valid');
EOF
else
  ok "state.json 없음 (최초 실행 전 — 정상)"
fi

# keep.json (v2: master_token 불필요)
KEEP="$ROOT/.state/keep.json"
if [ -f "$KEEP" ]; then
  node - "$KEEP" <<'EOF'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
const required = ['label_filter','processed'];
const missing = required.filter(k => !(k in data));
if (missing.length) { console.log('FAIL: keep.json missing fields: ' + missing.join(',')); process.exit(1); }
if (typeof data.processed !== 'object') { console.log('FAIL: keep.json processed is not object'); process.exit(1); }
console.log('OK: keep.json schema valid');
EOF
fi

# naver.json (v2)
NAVER="$ROOT/.state/naver.json"
if [ -f "$NAVER" ]; then
  node - "$NAVER" <<'EOF'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
if (!data.blog_id || data.blog_id === 'REPLACE_WITH_NAVER_BLOG_ID') {
  console.log('FAIL: naver.json blog_id 미설정'); process.exit(1);
}
console.log('OK: naver.json schema valid');
EOF
fi

echo "All checks passed."
