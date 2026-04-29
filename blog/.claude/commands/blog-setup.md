---
description: 네이버 블로그 자동 발행 플러그인 1회성 셋업 (Chrome MCP 연결 확인 + 라벨 설정 + 블로그 ID)
---

# /blog-setup — 1회성 셋업

이 명령은 처음 한 번만 실행하면 됩니다. 세 단계:
1. **Chrome MCP 확장** 연결 확인
2. **Google Keep 라벨** 설정 (Chrome 세션 활용 — 별도 인증 불필요)
3. **네이버 블로그 ID** 설정

별도의 토큰 발급/OAuth는 필요 없습니다. Chrome 브라우저의 로그인 세션을 그대로 사용합니다.

---

## 사전 점검

```bash
python -c "import frontmatter" 2>&1 || echo "MISSING_DEPS"
```

`MISSING_DEPS` 출력되면:
> 의존성 미설치. `pip install -r requirements.txt` 실행 후 다시 시도하세요.

---

## Stage 1 — Chrome MCP 연결 확인

### 1.1 연결 상태 확인

`mcp__Claude_in_Chrome__list_connected_browsers` 호출.

### 1.2 연결 없으면 안내

> Chrome MCP 확장이 연결돼 있지 않습니다:
> 1. Chrome에 Anthropic MCP 확장 설치
> 2. 확장 활성화
> 3. `/blog-setup` 다시 실행

→ 종료

### 1.3 브라우저 선택

`mcp__Claude_in_Chrome__select_browser` (deviceId).

### 1.4 Google + Naver 로그인 확인

MCP 탭 그룹 확보 (`tabs_context_mcp` createIfEmpty: true), 그 다음:

```
mcp__Claude_in_Chrome__navigate (url: https://keep.google.com)
```

→ `read_page` (filter: interactive)로 `Google 계정: ...` 버튼이 보이는지 확인.

> Google Keep에 로그인된 계정: <확인된_계정명>

만약 로그인 안 됐으면 사용자에게:
> Chrome에서 keep.google.com에 로그인 후 다시 실행해주세요.
→ 종료

같은 방식으로 `https://blog.naver.com` 확인:
> 네이버 블로그 로그인 상태: 확인됨 / 안 됨

네이버 미로그인 시:
> Chrome에서 naver.com에 로그인 후 다시 실행해주세요.
(블로그 발행 시점에만 필요하니, 지금은 경고만)

---

## Stage 2 — Google Keep 라벨 설정

### 2.1 사용자에게 안내 + 라벨 목록 출력

`https://keep.google.com` 페이지에서 `read_page`로 라벨 탭들을 추출:

```
Keep에 있는 기존 라벨:
  - 0할일_메모
  - 1교육에관한내글
  - 개발
  - ...

블로그 발행용으로 어떤 라벨을 쓸까요?
  (A) 새 라벨 '블로그' 생성 (Keep 앱에서 직접 만들고 알려주세요)
  (B) 기존 라벨 중 하나 사용 — 알려주세요
```

사용자 응답에 따라 `label_filter` 결정.

### 2.2 `.state/keep.json` 생성

```json
{
  "version": 2,
  "label_filter": "<USER_DECIDED_LABEL>",
  "min_chars": 50,
  "processed": {}
}
```

### 2.3 라벨 검증

`https://keep.google.com/#label/<encoded_label>`로 navigate → `read_page`로 라벨 탭이 활성화됐는지 확인.

라벨 활성화 안 되면 사용자에게 새로 만들거나 다른 라벨 선택하라고 안내.

---

## Stage 3 — 네이버 블로그 ID

### 3.1 사용자에게 안내

> 네이버 블로그 ID를 알려주세요.
> (예: https://blog.naver.com/myblog123 → 'myblog123')

### 3.2 `.state/naver.json` 생성

```json
{
  "version": 2,
  "blog_id": "<USER_INPUT>",
  "default_category_no": null,
  "write_url": "https://blog.naver.com/<USER_INPUT>?Redirect=Write&"
}
```

### 3.3 글쓰기 페이지 접근 확인 (선택)

`navigate`로 write_url 열고 `read_page`로 SmartEditor 요소 확인.
- 정상 표시: ✓
- 로그인 필요로 리다이렉트: 사용자에게 네이버 로그인 후 발행 시 자동 인식됨을 안내

---

## Stage 4 — 최종 점검

```bash
bash .smoke-tests/validate-state.sh
```

```
✅ 셋업 완료

이제 다음과 같이 사용하세요:
  1. Google Keep에서 메모 작성 + '<label_filter>' 라벨 부착
  2. /blog-draft   ← 라벨 메모를 블로그 초안으로 변환
  3. drafts/<날짜>-<제목>.md 열어 검토/수정
  4. /blog-publish drafts/<해당파일>.md   ← Chrome으로 글쓰기 화면 자동 열기
```

---

## 실패 시 대처

| 증상 | 원인 | 해결 |
|---|---|---|
| Chrome MCP 미연결 | 확장 미설치/비활성 | Stage 1 안내 따라 설치 |
| Keep 페이지가 로그인 화면 | Chrome에서 미로그인 | keep.google.com에 로그인 |
| 라벨 활성화 안 됨 | 라벨 미생성 또는 오타 | Keep 앱에서 라벨 생성 후 정확한 라벨명 입력 |
| 네이버 페이지 로그인 화면 | Chrome에서 미로그인 | naver.com에 로그인 |
