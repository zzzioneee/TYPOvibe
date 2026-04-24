# Day 8 — 소문의 낙원 (실리카겔)

**날짜**: 2026.04.27
**헤드라인**: 소문의 낙원
**출처**: [YouTube — 실리카겔 '소문의 낙원'](https://www.youtube.com/watch?v=D54StAZFUrc)

---

## 컨셉

실리카겔 '소문의 낙원' 뮤직비디오를 배경으로 깔고, 그 위에 덩굴이 뻗어나가듯 피어나는 한 붓 그리기 레터링을 얹었다. 뮤비는 과감한 displacement + blur로 쪼개져 몽환적 배경이 되고, "소문의 낙원"이 자소 순서대로 등장 → 유지 → 역순 소거 → 다시 등장 루프. 글자가 그려지는 중에는 찌글찌글 새싹 꿈틀거림이 강해지고, 완성된 상태에서는 은은한 떨림만 남는다.

---

## 구현 내용

### 1. 뮤비 배경 레이어 (z:1)
- YouTube IFrame API로 자동재생 + 루프 + 음소거 시작
- iframe 1.35x 확대 + translate(-50%, -58%)로 YouTube 상단 UI를 화면 밖으로 잘라냄
- 클릭 시 `player.unMute() + playVideo()` 호출 → src 재로드 없이 소리만 켜짐

### 2. 쪼갬 + 블러 이펙트 레이어 (z:2~3)
- SVG filter `#shatter`: `feTurbulence` + `feDisplacementMap scale=80` → 배경 쪼개짐
- iframe filter: `url(#shatter) blur(18px)`
- `.mv-dither` (필름 그레인), `.mv-scan` (스캔라인), `.mv-chroma` (RGB 시프트) 오버레이 적층

### 3. 레터링 (z:4): 한 붓 그리기 SVG
- 66개 path (stroke 본체 21개 + ext/flourish 장식 45개)
- 자소 순서 기반 greedy 배치: ㅅ → ㅗ → ㅁ → ㅜ → ㄴ → ㅇ → ㅡ → ㅣ → ㄴ → ㅏ → ㄱ → ㅇ → ㅜ → ㅓ → ㄴ
- 2-Phase 순서: Phase A (글자 본체) 먼저 → Phase B (장식)
- 장식 방향: 텍스트 중심점에 가까운 끝점을 뿌리로 → stroke-dashoffset 음수 보간으로 "텍스트에서 바깥으로" 뻗어나감
- SVG filter `#wobble`, `#wobble-soft` 로 손으로 그린 느낌

### 4. 찌글찌글 생장 모션
- wiggle 루프(200ms 주기)로 `feTurbulence seed` 순환 + `feDisplacementMap scale` 동적 변조
- `growthAmount()`가 사이클 단계 감지 → DRAW/ERASE 중엔 scale 증폭(GROW), HOLD/PAUSE 중엔 BASE 평상

### 5. 루프 애니메이션 (tick 상태머신)

| 단계 | 시간 | 동작 |
|------|------|------|
| DRAW | ~26.5s | Phase A(14s) → gap(0.5s) → Phase B(12s). 자소 순서로 순차 드로잉 |
| HOLD | 2s | 완성 유지 |
| ERASE | 15.9s | 역순 소거 — 나중에 그려진 path가 먼저 사라짐 |
| PAUSE | 1s | 빈 화면 |
| CYCLE | ~45s | 무한 반복 |

---

## 기술 스택

| 기술 | 용도 |
|------|------|
| YouTube IFrame API | 배경 뮤비 + 음소거 해제 |
| SVG filter (`feTurbulence`, `feDisplacementMap`) | 배경 쪼갬 + 레터링 wobble |
| SVG `stroke-dasharray` | 한 붓 그리기 자라남 |
| CSS `mix-blend-mode` | 그레인/스캔라인/크로마 오버레이 |

---

## Kiro 삽질 포인트

- 초기 "대구 달성 토성 등고선 레터링" 방향으로 시작 → 가독성 문제로 방향 전환. 기사도 뉴스 → 뮤비로 변경.
- 한글 자소 수작업 path가 글자로 안 읽히는 문제 → 클로드코드에서 만든 `lettering.jsx` 의 66개 path를 vanilla JS로 포팅.
- `index.html` 파일명이 fsWrite 시 빈 파일로 저장되는 이슈 → 다른 이름으로 쓴 뒤 `mv`로 rename 우회.
- YouTube iframe 상단 UI는 CSS로 못 가림 → iframe 확대 + translate로 화면 밖으로 밀어냄.
- 배경 displacement가 강하면 가장자리 stage 배경이 드러남 → `#000` + iframe 비율 조정으로 해결.
- Unmute 시 src 재설정이 iframe 전체 리로드 유발 → YT IFrame API의 `unMute()`로 전환.

---

## 파일 구조

```
public/works/day8/
  index.html         메인
  day8.js            레터링 + 루프 애니메이션 + 뮤비 API
  typo.svg           초기 레퍼런스 SVG
  lettering.jsx      원본 레퍼런스 (vanilla 포팅 소스)
src/works/day8.tsx    iframe 래퍼
```

---

## 동료 공유용 요약

**왜 만들었나**: 실리카겔 '소문의 낙원' 뮤비 위에 덩굴처럼 자라나는 한 붓 그리기 레터링. 노래 타이틀이 꽃 피듯 등장 → 역재생되듯 사라짐 → 다시 등장의 무한 루프.

**핵심 구성**: 쪼개진 블러 뮤비 배경 + 66개 path 한 붓 그리기 + 자소 순서 + 찌글찌글 wobble + DRAW → HOLD → ERASE(역순) → PAUSE 루프.

**기술**: YouTube IFrame API + SVG filter + stroke-dasharray 애니메이션 + vanilla JS 루프 상태머신.
