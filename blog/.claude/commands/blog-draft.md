---
description: Chrome MCP로 Google Keep의 라벨 메모를 가져와 블로그 글 초안(Markdown)으로 변환
---

# /blog-draft — Keep 메모 → 블로그 초안 (Chrome MCP)

이 명령은 **Chrome MCP를 통해 사용자의 로그인된 Google Keep 세션**에서 처리되지 않은 라벨 메모를 가져와, Claude가 블로그 글 형태로 다듬어 `drafts/` 폴더에 Markdown 파일로 저장합니다.

**원칙: 자동 발행 안 함.** 초안만 만들고, 사용자가 검토/수정 후 `/blog-publish`로 발행합니다.

---

## Stage 1 — Pre-check

1. `.state/keep.json`, `.state/naver.json` 존재 확인. 없으면:
   > 셋업이 안 됐습니다. `/blog-setup`을 먼저 실행하세요.
   → 종료
2. `.state/state.json` 로드 (없으면 `state.example.json` 복사 후 사용)
3. `bash .smoke-tests/validate-state.sh` 실행 → FAIL이면 사용자에게 알리고 종료
4. **Chrome MCP 연결 확인:** `mcp__Claude_in_Chrome__list_connected_browsers`. 미연결 시 안내 후 종료.
5. **MCP 탭 그룹 컨텍스트 확보:** `mcp__Claude_in_Chrome__tabs_context_mcp` (createIfEmpty: true)

---

## Stage 2 — Fetch Keep 메모 (Chrome MCP)

### 2.1 라벨 페이지 열기

`.state/keep.json`의 `label_filter`(예: `"블로그"`)를 URL 인코딩 후:

```
https://keep.google.com/#label/<encoded_label>
```

`mcp__Claude_in_Chrome__navigate`로 새 탭(또는 기존 MCP 탭)에 이동.

### 2.2 페이지 상태 검증

`mcp__Claude_in_Chrome__read_page` (filter: interactive, max_chars: 5000)로:
- 로그인 상태 확인 (`Google 계정: ...` 버튼이 보이는지)
- 라벨 탭이 활성화됐는지 (또는 라벨이 존재하는지)

로그인 안 됐으면:
> Chrome에서 Google에 로그인되어 있지 않습니다. keep.google.com에 로그인 후 다시 실행해주세요.
→ 종료

라벨이 존재하지 않으면:
> Keep에 '<label_filter>' 라벨이 없습니다. Keep 앱에서 라벨을 만들거나 .state/keep.json의 label_filter를 기존 라벨로 바꿔주세요.
→ 종료

### 2.3 메모 목록 수집

`read_page` (filter: all)로 전체 페이지 트리 가져옴 (max_chars: 30000).

각 메모는 보통 article/listitem 컨테이너로 표현됨. 각 컨테이너에서:
- 제목(있으면) — `h3` 또는 `[role="heading"]`
- 본문 — `[contenteditable]` 또는 텍스트 블록
- Keep note ID — DOM의 `data-id` 또는 URL fragment

**대안: JavaScript로 직접 추출** (`javascript_tool` 호출):

```javascript
(function extractKeepNotes() {
  const containers = document.querySelectorAll('[role="listitem"], [data-id]');
  const notes = [];
  for (const el of containers) {
    const id = el.getAttribute('data-id') || el.id;
    if (!id) continue;
    const titleEl = el.querySelector('[role="heading"], h3');
    const bodyEls = el.querySelectorAll('[contenteditable], div[role="textbox"]');
    let body = '';
    for (const b of bodyEls) {
      const t = b.innerText || b.textContent || '';
      if (t.length > body.length) body = t;
    }
    notes.push({
      id: id,
      title: titleEl ? (titleEl.innerText || '').trim() : '',
      text: body.trim()
    });
  }
  return notes;
})();
```

**셀렉터가 안 맞으면 fallback:** `read_page` 결과에서 텍스트 추출 후 사용자에게 검토 요청.

`.state/raw/draft-<YYYYMMDD-HHMMSS>.json`에 응답 백업.

---

## Stage 3 — Filter

수집된 메모 각각에 대해:

1. `min_chars` (기본 50자) 미만 → skip
2. `.state/keep.json`의 `processed[id]`에 있고 status가 `drafted` 또는 `published` → skip
3. `drafts/` 안에 동일 keep_note_id로 이미 파일이 있으면 → skip + 사용자 안내:
   > 메모 "{title}"의 초안이 이미 drafts/에 있습니다. 발행 후 다시 시도하세요.

남은 게 0개면:
> 처리할 신규 메모가 없습니다. Keep에 '{label}' 라벨이 붙은 새 메모를 작성해주세요.
→ 정상 종료

---

## Stage 4 — Transform (Claude in-context)

남은 메모 각각에 대해:

### 4.1 제목 생성
- 15~25자 (네이버 검색 노출에 유리)
- 메모 핵심 키워드 포함
- 어색한 클릭베이트 금지

### 4.2 본문 다듬기
- 메모 원문의 핵심 내용/팩트는 **반드시 보존**. 사실 추가/창작 금지
- 도입(1~2문장) → 본문(2~3단락) → 마무리(1문장) 구조
- 메모가 짧으면 무리하게 늘리지 말고 자연스러운 분량으로
- 사용자 톤(존댓말/반말, 격식)을 메모에서 추론해 유지
- 마크다운: `##` 소제목 (필요시), 단락 구분
- 코드/명령어/링크는 원문 보존

### 4.3 태그 생성
- 3~7개
- 한국어/영어 혼용 가능, 공백 없음
- 카테고리명 자체는 태그로 쓰지 않음

### 4.4 카테고리 추천
- `naver.json`의 `default_category_no`를 기본값으로
- 사용자가 카테고리를 명시 안 했으면 기본값 사용

---

## Stage 5 — 초안 저장

각 메모마다 `drafts/YYYY-MM-DD-{slug}.md`:

**slug 규칙:**
- 제목에서 한글/영문/숫자만 추출
- 공백 → `-`
- 최대 30자
- 같은 날짜에 중복이면 `-2`, `-3` 접미사

**파일 형식:**

```markdown
---
keep_note_id: "<chrome에서_가져온_id_또는_hash>"
keep_label: "블로그"
created_at: "<ISO8601>"
fetched_at: "<ISO8601>"
suggested_title: "..."
suggested_tags: ["태그1", "태그2"]
suggested_category_no: 1
status: draft
---

(여기부터 본문 — 사용자가 자유롭게 편집)
```

**id가 없는 경우:** 본문 내용의 SHA-1 해시 앞 12자를 id로 사용.

---

## Stage 6 — Mark in-progress

`.state/keep.json`의 `processed`에 항목 추가:

```json
"<keep_note_id>": {
  "status": "drafted",
  "drafted_at": "<ISO8601>",
  "draft_path": "drafts/2026-04-28-{slug}.md"
}
```

---

## Stage 7 — State 업데이트

`.state/state.json`:
- `total_drafts` += 새로 생성한 초안 수
- `last_run_at` = 현재 KST ISO8601
- 각 태그를 `tag_frequency`에 누적

`bash .smoke-tests/validate-state.sh`로 검증.

---

## Stage 8 — 사용자 안내

```
✅ 초안 N개 생성

  1. drafts/2026-04-28-react-basics.md
     "리액트 useState 정리" (#react #js #프론트엔드)
  2. drafts/2026-04-28-ssh-tip.md
     "SSH 키 등록 5분 메모" (#ssh #devops)

다음 단계:
  1. 각 파일을 열어 내용 검토/수정
  2. /blog-publish drafts/<파일경로>  ← 발행
```

스킵된 메모가 있으면 별도 섹션으로 안내.

---

## 실패 처리 원칙

- 어느 단계든 실패하면, 부분적 초안이 만들어졌어도 **keep.json의 `processed` 갱신 전에는 안전**
- 같은 명령 재실행 시 같은 메모가 다시 처리됨 (재시도 가능)
- 한 메모 처리 실패는 다른 메모를 막지 않음 (try/except로 격리)
- Chrome 세션 만료 시 → 사용자에게 재로그인 안내, 상태 변경 없음
