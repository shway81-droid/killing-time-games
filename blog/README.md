# 짬짬이 블로그 — Google Keep → 네이버 블로그 반자동 발행

Google Keep에 적은 메모 중 `#블로그` 라벨이 붙은 것을, Claude가 블로그 글로 다듬어 Chrome 브라우저로 네이버 블로그 글쓰기 화면에 자동으로 채워넣습니다. 발행 버튼은 사용자가 최종 검토 후 누릅니다.

자매 프로젝트: [`../kakao/`](../kakao/) (텔레그램 메모 자동 분류)

---

## 핵심 아이디어

```
Keep 메모 (#블로그 라벨)
   │
   │  /blog-draft
   ▼
drafts/2026-04-28-react-basics.md   ← Claude가 다듬은 초안
   │
   │  사용자가 검토/수정
   │
   │  /blog-publish drafts/...md
   ▼
[Chrome MCP가 글쓰기 페이지 열고 본문 클립보드에 복사]
   │
   │  사용자가 본문 붙여넣기 + 카테고리/태그 선택 + 발행
   │
   ▼
네이버 블로그 글 게시 + published/로 아카이브
```

**왜 반자동?** 네이버는 일반 개발자에게 블로그 글쓰기 API를 바로 열어주지 않고 별도 심사를 요구합니다. 그래서 브라우저 자동화 + 사용자 최종 승인 방식으로 구성했습니다. 어차피 사적 메모가 섞일 수 있어 마지막 검토 단계는 안전장치로도 작동합니다.

---

## 빠른 시작

### 1. 의존성 설치

```bash
pip install -r requirements.txt
```

필요 라이브러리:
- `python-frontmatter` — Markdown frontmatter 파싱

(Keep과 Naver는 모두 Chrome MCP를 통해 접근하므로, 별도 인증 라이브러리가 필요 없습니다.)

### 2. Chrome MCP 확장 설치 + 로그인 상태 유지 (한 번만)

Chrome 브라우저에 Anthropic의 MCP 확장을 설치/활성화하고, **Chrome에서 Google Keep과 네이버 모두에 로그인된 상태**를 유지하세요.

### 3. 1회성 셋업

```
/blog-setup
```

Claude가 세 단계로 안내합니다:
1. **Chrome MCP 연결 확인** — 미연결이면 설치 안내
2. **Google Keep 라벨 설정** — 어떤 라벨의 메모를 블로그로 발행할지 결정
3. **네이버 블로그 ID 입력** → `.state/naver.json` 저장

### 4. 일상 사용

**A. Keep에 메모 작성**
- Google Keep에서 새 메모 작성
- `#블로그` 라벨 부착 (앱에서 라벨 메뉴로 추가)

**B. 초안 생성**
```
/blog-draft
```
→ `drafts/YYYY-MM-DD-제목.md` 파일들이 만들어짐

**C. 검토/수정**

`drafts/` 폴더의 파일을 텍스트 에디터로 열어 자유롭게 편집:
- 제목 다듬기 (frontmatter `suggested_title`)
- 태그 조정 (`suggested_tags`)
- 본문 수정/추가

**D. 발행**
```
/blog-publish drafts/2026-04-28-react-basics.md
```
→ Chrome 새 탭에서 네이버 글쓰기 페이지가 열리고 본문이 클립보드에 복사됨
→ 본문 영역 클릭 후 Ctrl+V로 붙여넣기, 카테고리/태그 확인, 발행 버튼 클릭
→ 발행된 글 URL을 Claude에게 알려주면 자동으로 아카이브

---

## 디렉터리 구조

```
blog/
├── .claude/
│   ├── commands/
│   │   ├── blog-setup.md       # /blog-setup 워크플로우
│   │   ├── blog-draft.md       # /blog-draft 워크플로우
│   │   └── blog-publish.md     # /blog-publish 워크플로우 (Chrome MCP)
│   └── settings.json           # 권한 allowlist
├── .state/
│   ├── state.json              # 누적 통계 (gitignored)
│   ├── keep.json               # Google 인증 + 처리 이력 (gitignored)
│   ├── naver.json              # 블로그 ID + 카테고리 (gitignored)
│   ├── *.example.json          # 스키마 참고용
│   └── raw/                    # API 응답 백업 (gitignored)
├── drafts/                     # 검토 대기 초안 (gitignored)
├── published/                  # 발행 완료 아카이브 (gitignored)
├── failed/                     # 발행 실패 (gitignored)
├── .smoke-tests/
│   └── validate-state.sh
├── requirements.txt
└── README.md
```

발행은 Python 스크립트가 아니라 슬래시 커맨드 자체에서 Chrome MCP 도구를 직접 호출합니다 (Claude가 `.claude/commands/blog-publish.md`의 워크플로우를 따라 실행).

---

## 슬래시 커맨드 요약

| 명령 | 빈도 | 설명 |
|---|---|---|
| `/blog-setup` | 1회 | Keep 토큰 + Chrome MCP 확인 + 블로그 ID |
| `/blog-draft` | 자주 | Keep 라벨 메모 → Markdown 초안 다수 생성 |
| `/blog-publish <file>` | 초안 1개당 1회 | Chrome으로 글쓰기 화면 자동 열기 + 클립보드 복사 |

---

## 자동화 (선택)

매일 아침 자동으로 초안만 생성하고 싶다면:

```
/schedule "0 9 * * *" /blog-draft
```

→ 매일 오전 9시에 `/blog-draft` 자동 실행. 발행은 여전히 수동 (의도된 안전장치).

---

## 자주 묻는 질문

### Q. 왜 네이버 블로그 글쓰기 API를 안 쓰나요?
- Naver Developers에서 일반 가입자에게는 글쓰기 API를 바로 열어주지 않고 별도 심사(약 3일)를 요구합니다.
- 심사 통과해서 API를 쓰고 싶다면 Naver Developers 1:1 문의로 신청 후, 통과 시 본 플러그인을 API 기반으로 재구성할 수 있습니다 (현재 코드는 브라우저 자동화 기반).

### Q. Google Keep는 어떻게 인증하나요?
- 별도 인증 안 합니다. Chrome 브라우저의 로그인 세션을 그대로 사용합니다.
- 즉, Chrome에서 Google에 로그인된 상태이기만 하면 동작합니다.
- 비밀번호/토큰은 어디에도 저장되지 않습니다.

### Q. Chrome 세션이 만료되면 어떻게 되나요?
- `/blog-draft` 실행 중 로그인 화면으로 리다이렉트되면 Claude가 감지하고 재로그인 안내합니다.
- Chrome에서 다시 로그인 후 `/blog-draft`를 재실행하시면 됩니다.

### Q. Chrome MCP 확장은 어디서 설치하나요?
- Anthropic 공식 안내를 따르세요. 설치 후 Chrome에서 권한을 부여하면 `mcp__Claude_in_Chrome__*` 도구들이 동작합니다.

### Q. 네이버 글쓰기 화면에서 자동으로 발행까지 되면 안 되나요?
- 네이버 SmartEditor는 iframe + React 기반이라 자동 발행은 깨지기 쉽습니다.
- "본문 붙여넣고 발행 버튼은 사용자가 직접" 방식이 안정적이고, 카테고리/태그/공개범위를 마지막에 사용자가 확인할 수 있어서 권장됩니다.

### Q. 같은 메모가 두 번 발행되지 않을까요?
- `.state/keep.json`의 `processed` 맵으로 ID 단위로 추적. 한 번 `drafted`/`published` 마킹된 메모는 다음 `/blog-draft`에서 skip됩니다.

### Q. 이미지가 있는 메모는 어떻게 되나요?
- 현재 버전은 텍스트만 발행합니다. 이미지가 있는 메모를 처리할 때는 사용자가 글쓰기 화면에서 직접 이미지를 붙여넣어야 합니다.

---

## 보안 체크리스트

커밋 전 항상 확인:
- [ ] `.gitignore`에 `.state/`, `settings.local.json` 들어있나?
- [ ] `git status`에 `keep.json`, `naver.json`이 안 보이나?
- [ ] `published/` 안에 사적인 내용이 들어있다면 `.gitignore` 유지

---

## 라이선스

상위 프로젝트의 라이선스를 따름.
