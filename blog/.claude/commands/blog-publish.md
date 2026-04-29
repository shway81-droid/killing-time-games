---
description: 검토한 Markdown 초안을 Chrome 브라우저로 네이버 블로그 글쓰기 화면에 자동 채워넣음. 사용법 /blog-publish drafts/2026-04-28-foo.md
---

# /blog-publish — 초안 → Chrome MCP로 네이버 블로그에 발행

이 명령은 사용자가 검토한 `drafts/*.md` 초안 1개의 내용을 **Chrome MCP로 네이버 블로그 글쓰기 화면에 자동 채워넣고**, 사용자가 최종 발행 버튼을 누르도록 돕습니다.

**중요한 설계 결정:** 네이버 SmartEditor는 자동화하기 까다로워서 (iframe + React 컨트롤 입력) 100% 자동 발행은 깨지기 쉽습니다. 그래서 다음 세 단계로 나눕니다:
1. **자동 (확실히 됨):** 클립보드에 본문 복사 + 글쓰기 페이지 자동 열기 + 제목 자동 입력 시도
2. **반자동 (사용자):** 본문 영역에 클릭 + Ctrl+V로 붙여넣기, 카테고리/태그 확인
3. **자동 (마무리):** 사용자가 발행한 URL 받아서 아카이브 + 상태 갱신

**인자:** 초안 파일 경로 (필수)
예: `/blog-publish drafts/2026-04-28-react-basics.md`

---

## Stage 1 — Pre-check

1. 인자 없으면 후보 출력:
   ```bash
   ls drafts/*.md 2>&1
   ```
   > 발행할 초안을 지정해주세요. 예: `/blog-publish drafts/2026-04-28-foo.md`
   → 종료
2. 파일 존재 확인. 없으면 친절한 에러 + 후보 안내.
3. `.state/naver.json` 존재 + `blog_id` 채워졌는지 확인. 없으면 `/blog-setup` 안내 후 종료.
4. **Chrome MCP 연결 확인:** `mcp__Claude_in_Chrome__list_connected_browsers` 호출.
   - 연결 없으면:
     > Chrome MCP 확장이 설치/연결되지 않았습니다. README의 "Chrome MCP 설치" 섹션을 참고해 설치 후 다시 시도해주세요.
     → 종료

---

## Stage 2 — Read & validate frontmatter

```bash
python -c "
import frontmatter, sys, json
p = frontmatter.load(sys.argv[1])
print(json.dumps({'meta': p.metadata, 'content': p.content}, ensure_ascii=False))
" "<draft-path>"
```

검증:
- `suggested_title` 또는 `title` 존재
- `status`가 `draft` (이미 `published`면 거부)
- 본문 길이 ≥ 100자
- `suggested_tags`는 리스트

문제 있으면 어느 필드가 잘못됐는지 구체적으로 안내.

---

## Stage 3 — 클립보드 + 글쓰기 페이지 열기

### 3.1 본문을 클립보드에 복사

네이버 SmartEditor는 일반 텍스트 붙여넣기 시 자동으로 단락을 구분합니다. 마크다운 → 일반 텍스트 변환:

```bash
python - "<draft-path>" <<'PYEOF'
import frontmatter, sys, re, subprocess
p = frontmatter.load(sys.argv[1])
text = p.content.strip()
# 헤딩(#) 제거, 단락 구분 보존
text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
# Windows clipboard
proc = subprocess.run(['clip'], input=text, text=True, encoding='utf-8')
print('OK: clipboard set,', len(text), '자')
PYEOF
```

(또는 Chrome MCP의 `mcp__computer-use__write_clipboard`을 사용해도 됨)

### 3.2 글쓰기 페이지 열기

`naver.json`의 `blog_id`로 URL 구성:
```
https://blog.naver.com/{blog_id}?Redirect=Write&
```

Chrome MCP로 새 탭에서 열기:
- `mcp__Claude_in_Chrome__tabs_create_mcp` (URL 인자) 또는 `navigate`
- 페이지 로드 대기 (3초 정도, 또는 `read_page`로 에디터 확인)

**로그인 안 됐을 경우:** 네이버 로그인 페이지로 리다이렉트됨. `read_page`로 감지되면:
> 네이버에 로그인되어 있지 않습니다. Chrome에서 네이버에 로그인 후 다시 `/blog-publish ...`를 실행해주세요.
→ 종료 (상태 변경 없음)

### 3.3 제목 자동 입력 시도 (best-effort)

SmartEditor는 제목 input을 React로 관리합니다. JS로 직접 값 설정 + input 이벤트 발생 시도:

```javascript
// mcp__Claude_in_Chrome__javascript_tool로 실행
(function setTitle(title) {
  // SmartEditor ONE 제목 영역 셀렉터 (변경 가능성 있음)
  const candidates = [
    'span.se-placeholder.__se_placeholder',
    '[contenteditable="true"][data-a11y-title="제목"]',
    '.se-title-text',
    'textarea[placeholder*="제목"]',
    'input[placeholder*="제목"]'
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (!el) continue;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const setter = Object.getOwnPropertyDescriptor(el.__proto__, 'value').set;
      setter.call(el, title);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return { ok: true, selector: sel };
    } else {
      el.focus();
      document.execCommand('insertText', false, title);
      return { ok: true, selector: sel, mode: 'execCommand' };
    }
  }
  return { ok: false, error: '제목 필드를 못 찾음' };
})("<TITLE_HERE>");
```

성공/실패 결과를 사용자에게 그대로 알려줌. 실패해도 워크플로우는 계속.

---

## Stage 4 — 사용자 안내 + 대기

다음 메시지 출력:

```
✅ 글쓰기 화면 열림 + 본문 클립보드에 복사됨

📝 다음 단계 (사용자가 직접):
  1. (자동 입력 실패 시) 제목: "<title>"
  2. 본문 영역 클릭 → Ctrl+V로 붙여넣기
  3. 우측 상단 [발행] 버튼 클릭
  4. 발행 옵션 (카테고리/태그/공개범위) 확인 후 [발행]
  5. 발행 완료되면 글 URL을 복사해서 알려주세요.

추천 태그: #<tag1> #<tag2> #<tag3>
추천 카테고리: <category_no_or_default>

발행한 글 URL을 알려주세요 (예: https://blog.naver.com/...).
```

사용자가 URL을 보내올 때까지 대기. URL 형식 확인:
- `https://blog.naver.com/<blog_id>/<post_id>` 패턴 매칭
- 패턴 안 맞으면 사용자에게 정확한 URL 재요청

---

## Stage 5 — Archive

URL을 받으면:

1. 초안 파일의 frontmatter 업데이트:
   ```yaml
   status: published
   published_at: "<현재_KST_ISO8601>"
   post_url: "<사용자가_보낸_URL>"
   ```
2. 파일을 `drafts/` → `published/`로 이동 (`mv` 또는 Python rename)

---

## Stage 6 — Update Keep state

`.state/keep.json`의 `processed[<keep_note_id>]` 업데이트:

```json
"<keep_note_id>": {
  "status": "published",
  "drafted_at": "...",         // 기존 유지
  "published_at": "<ISO8601>",
  "post_url": "<naver_url>"
}
```

---

## Stage 7 — Update state.json

`.state/state.json`:
- `total_published` += 1
- `last_published_at` = ISO8601
- `recent_published` 큐에 `{post_url, title, published_at}` 추가 (최대 10개)
- 발행 글 태그를 `tag_frequency`에 누적 (draft 시 누적했으면 중복 방지)

`bash .smoke-tests/validate-state.sh`로 검증.

---

## Stage 8 — 사용자 안내

```
✨ 발행 + 아카이브 완료

  제목: <title>
  URL:  <post_url>
  태그: #<tag1> #<tag2>
  보관: published/<filename>.md
```

---

## 실패 처리 원칙

| 실패 단계 | 처리 |
|---|---|
| Stage 3.2 (페이지 열기 실패) | 상태 변경 없음. 에러 출력 + 재시도 안내 |
| Stage 3.3 (제목 자동 입력 실패) | 워크플로우 계속. 사용자에게 수동 입력 안내 |
| Stage 4 (사용자가 발행 안 함/취소) | 사용자가 "취소" 알리면 → 초안 그대로 유지, 상태 변경 없음 |
| Stage 5 (파일 이동 실패) | 사용자에게 수동 이동 안내. keep.json은 published로 마킹 안 함 (재시도 가능 상태 유지) |

**멱등성:** 같은 초안에 두 번 `/blog-publish` 실행 → frontmatter `status: published` 검사로 재발행 거부.
