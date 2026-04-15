# Killing Time Mini-Games Collection — Design Spec

## Overview

초등학교 교실에서 수업 자투리 시간에 사용하는 웹 기반 미니게임 컬렉션. 교사가 크롬북/태블릿에서 열어 학생들이 플레이. 게임은 지속적으로 추가되며, 첫 번째 게임은 두더지 잡기.

## Constraints

- **사용자**: 초등학생 (저~고학년 혼합, 5~12세)
- **환경**: 학교 크롬북/태블릿 웹브라우저
- **오프라인**: 인터넷 없이도 동작해야 함 (`file://` 또는 로컬 서버)
- **조작**: 마우스 클릭 또는 터치만 (키보드 의존 X)
- **게임 시간**: 1라운드 1~3분, 룰 30초 안에 이해 가능
- **기술 스택**: Vanilla HTML/CSS/JavaScript — 프레임워크/빌드툴 없음
- **배포**: GitHub Pages 또는 로컬 파일로 바로 실행
- **외부 의존**: CDN/폰트 없음 (시스템 폰트 사용)

## Decisions

- **점수 저장**: 세션만 (브라우저 닫으면 소멸, 저장 로직 없음)
- **사운드**: 효과음 있음, 기본 음소거 상태. 토글 버튼으로 켜기/끄기. Web Audio API로 코드 내 생성 (외부 파일 불필요)
- **언어**: 한국어만
- **다크모드**: 없음 (라이트 모드만)

## Project Structure

```
killing-time-games/
├── index.html                  ← 런처 (게임 선택 화면)
├── shared/
│   ├── style.css               ← 공통 CSS (디자인 토큰, 레이아웃)
│   └── engine.js               ← 유틸리티 라이브러리 (타이머, 사운드, 점수)
├── games/
│   ├── registry.json           ← 게임 폴더명 배열 (런처가 참조)
│   └── whack-a-mole/
│       ├── index.html          ← 게임 페이지
│       ├── style.css           ← 게임 전용 스타일
│       ├── game.js             ← 게임 로직
│       └── game.json           ← 메타데이터 (런처가 읽음)
└── assets/
    └── icons/                  ← 런처용 아이콘
```

### Game Registration

새 게임 추가 절차:
1. `games/<게임명>/` 폴더 생성
2. `game.json` 메타데이터 작성
3. `games/registry.json`에 폴더명 추가

**game.json 형식:**
```json
{
  "name": "두더지 잡기",
  "description": "나타나는 두더지를 빠르게 터치하세요!",
  "icon": "🔨",
  "grades": [1, 2, 3, 4, 5, 6],
  "playTime": "1~2분"
}
```

**registry.json 형식:**
```json
["whack-a-mole"]
```

### Offline Fallback

`file://` 프로토콜에서는 fetch가 차단될 수 있으므로, `registry.json` 로딩 실패 시 `index.html`에 하드코딩된 게임 목록을 fallback으로 사용.

## Architecture: Utility Library (shared/engine.js)

게임이 필요한 것만 골라 쓰는 독립 함수 모음. 프레임워크가 아님 — 게임 구조를 강제하지 않음.

### createTimer(seconds, onTick, onEnd)

카운트다운 타이머.
- `onTick(remaining)`: 매초 호출, 남은 초 전달
- `onEnd()`: 타이머 종료 시 호출
- 반환: `{ start(), pause(), stop() }`

### createScoreboard(element)

점수 표시 관리.
- `element`: 점수를 표시할 DOM 요소
- 반환: `{ add(n), get(), reset() }`
- DOM 자동 업데이트

### createSoundManager(soundMap)

Web Audio API 기반 효과음.
- `soundMap`: `{ hit: () => { /* oscillator config */ }, miss: () => { ... } }` 형태
- 반환: `{ play(name), mute(), unmute(), isMuted() }`
- 기본 상태: 음소거
- 뮤트 상태는 `sessionStorage`에 저장 (게임 간 유지)

### goHome()

런처로 이동: `window.location.href = '../../index.html'`

### onTap(element, callback)

클릭 + 터치 통합 핸들러.
- 더블탭 줌 방지
- 300ms 딜레이 제거
- `callback(event)` 호출

## Launcher UX

### Layout

- **상단**: 제목 "킬링타임 미니게임" + 사운드 뮤트 토글 버튼
- **필터**: "전체 / 저학년(1~3) / 고학년(4~6)" 토글 버튼 3개
- **중앙**: 게임 카드 그리드 (반응형 2~3열)
- **카드**: 상단 70% 컬러 썸네일(게임별 배경색 + 이모지 아이콘) + 하단 게임명
- 카드 터치 시 해당 게임의 `index.html`로 이동

### Card Design

참고 앱 스타일 반영:
- 각 카드 상단에 게임 고유 배경색 + 큰 이모지 아이콘
- 하단에 게임 이름 (bold)
- 둥근 모서리 (16px)
- 터치 시 살짝 확대 + 그림자 강화

### Grade Filter

- `game.json`의 `grades` 배열로 필터링
- "전체": 모든 게임 표시
- "저학년": grades에 1, 2, 3 중 하나라도 포함된 게임
- "고학년": grades에 4, 5, 6 중 하나라도 포함된 게임
- 기본값: 전체

## Design Tokens

참고 앱 스타일: 밝고 채도 높은 색상, 둥글고 큰 버튼, 볼드한 산세리프, 깔끔한 흰 배경.

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#FFFFFF` | 페이지 배경 |
| `--card-bg` | `#FFFFFF` | 카드 배경 |
| `--primary` | `#29B6F6` | 주 강조 (밝은 하늘색) |
| `--secondary` | `#66BB6A` | 보조 강조 (초록) |
| `--danger` | `#EF5350` | 실패/경고 (빨강) |
| `--accent-orange` | `#FFA726` | 포인트 (주황) |
| `--accent-yellow` | `#FFEE58` | 포인트 (노랑) |
| `--text` | `#333333` | 기본 텍스트 |
| `--text-sub` | `#888888` | 보조 텍스트 |

게임별 배경색 (게임 내 전체 배경으로 사용):
- 파랑: `#64B5F6`
- 초록: `#81C784`
- 보라: `#7E77A8`
- (게임 추가 시 확장)

### Typography

- 폰트 스택: `'Pretendard Variable', -apple-system, 'Noto Sans KR', sans-serif`
- 외부 CDN 없음 — 시스템에 없으면 자연스럽게 fallback
- 제목: 1.5rem bold
- 본문: 1rem
- 카드 제목: 0.9rem bold
- 보조: 0.875rem

### Spacing & Sizing

- 기본 간격 단위: 8px (8, 16, 24, 32...)
- 카드 최소 크기: 140x140px (2열 그리드)
- 버튼 최소 터치 영역: 48x48px
- 카드 border-radius: 16px
- 버튼 border-radius: 24px (알약 모양)

### Shadows

- 카드: `0 2px 8px rgba(0,0,0,0.12)`
- 카드 터치: `0 4px 12px rgba(0,0,0,0.2)` + `scale(1.03)`

## Game 1: Whack-a-Mole (두더지 잡기)

### Game Flow

1. **진입** → 룰 설명 화면: "나타나는 두더지를 터치하세요!" + PLAY 버튼
2. **카운트다운** → 3-2-1 표시
3. **게임 플레이** → 제한시간 30초
4. **종료** → 결과 화면: 점수 + "다시하기" / "홈으로" 버튼

### Layout

- **배경**: 초록 잔디 색상 (`#81C784`)
- **그리드**: 3x3 (9개 구멍)
- **상단**: 남은 시간 프로그레스 바 + 점수 표시 + 사운드 토글
- **하단**: 닫기(홈) 버튼 (흰 원형 ✕)

### Mole Behavior

- 랜덤 구멍에서 등장
- 노출 시간: 0.8~1.5초 후 숨음
- 동시 최대: 2마리
- 시간 경과에 따라 노출 시간 감소 (자동 난이도 상승)

### Scoring

- 터치 성공: +10점, 성공 이펙트
- 빈 구멍 터치: 감점 없음 (초등학생 좌절감 방지)

### Visuals

- **두더지**: CSS로 구현한 심플 캐릭터 (원형 머리 + 눈 + 코)
- **구멍**: 어두운 타원 (`#5D4037`)
- **등장/퇴장**: CSS transition (아래에서 위로 슬라이드)
- **터치 성공**: 별 이펙트 또는 스케일 애니메이션

### Sound Effects (Web Audio API)

외부 파일 없이 코드 내 생성 — 오프라인 동작 보장:
- 두더지 등장: 짧은 팝 사운드
- 터치 성공: 통통한 히트음
- 게임 종료: 짧은 팡파레

### Game Detail Screen

참고 앱 스타일 반영 — 게임 진입 전 설명 화면:
- 상단: 뒤로가기 `←` + 게임 이름 "두더지 잡기"
- 중앙: 게임 설명 텍스트 + 두더지 일러스트
- 하단: 큰 초록색 PLAY 버튼
