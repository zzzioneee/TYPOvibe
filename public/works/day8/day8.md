# Day 8 — 소문의 낙원 (악동뮤지션)

**날짜**: 2026.04.27
**헤드라인**: 소문의 낙원
**출처**: [YouTube — 악동뮤지션(AKMU) '소문의 낙원'](https://www.youtube.com/watch?v=D54StAZFUrc)

---

## 컨셉

악동뮤지션의 '소문의 낙원' 뮤직비디오를 배경으로 깔고, 그 위에 덩굴이 뻗어나가듯 피어나는 한 붓 그리기 레터링을 얹었다. 뮤비는 과감한 displacement + blur로 쪼개져 몽환적 배경이 되고, "소문의 낙원"이 자소 순서대로 등장 → 유지 → 역순 소거 → 다시 등장 루프. 글자가 그려지는 중에는 찌글찌글 새싹 꿈틀거림이 강해지고, 완성된 상태에서는 은은한 떨림만 남는다.

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

## 레터링 디자인: Claude가 설계

타이포 레터링 path는 **전부 Claude(클로드)가 설계**했다. 나는 NEXT PHASE 폰트, Erik Marinovich의 INCORPORE SANO 같은 **참고 이미지 몇 장과 "한 붓 그리기 + 장식 덩굴이 자소에서 뻗어나가는 형태"라는 컨셉**만 전달했고, 그걸 바탕으로 Claude가:

- 한글 "소문의 낙원" 6글자를 자소 단위로 쪼갠 뒤, 각 자소를 Cubic Bezier path로 재해석 (ㅅ의 양 발이 꼬이고, ㅁ의 네 꼭지가 curl로 말리는 식)
- 글자 본체를 그대로 이은 extension (ㅅ 끝점 → 왼쪽 여백, ㅝ 끝점 → 오른쪽 하단으로 크게 flourish)
- 자소 간 연결 덩굴까지 포함해 **총 66개 path**를 직접 좌표로 찍어냄
- 자소 순서(ㅅ→ㅗ→ㅁ...)에 따라 한 붓처럼 그려지는 순서까지 greedy 알고리즘으로 배치

손으로 레터링 타입디자인을 직접 해본 적 있는 사람 입장에서 보면, AI가 **"이 정도 밀도의 손글씨 장식 레터링"을 한글에 대해 좌표 단위로 설계해줄 수 있다는 게 신기**했다. 내 역할은 참고 이미지 공급 + 방향성 코칭 + 최종 인터랙션(애니메이션 사이클, wobble 강도, 크기 튜닝)에 집중할 수 있었음.

참고로 Claude가 준 JSX 버전(`lettering.jsx`)은 React 기반이었고, 내 프로젝트는 vanilla iframe 구조라 **로직을 vanilla JS로 포팅**하면서 path 데이터는 그대로 가져왔다.

---

## 삽질 포인트

- 한글 자소 path를 내가 직접 찍어본 시도 → 글자로 안 읽혀서 포기. Claude가 설계한 `lettering.jsx`의 66개 path를 vanilla JS로 포팅하여 해결.
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
  lettering.jsx      Claude가 설계한 레터링 원본 (vanilla 포팅 소스)
src/works/day8.tsx    iframe 래퍼
```

---

## 다음에 다시 한다면

### 처음부터 이렇게 요청하면 좋을 것 같다

> "[가수/곡명] 뮤직비디오를 몽환적으로 쪼개서 배경으로 깔고, 그 위에 [곡명]을 한 붓 그리기 손글씨체 레터링으로 얹어줘. 덩굴이 뻗어나가듯 피어나는 느낌, 글자 본체 먼저 자소 순서로 그려진 다음 장식이 글자에서 바깥으로 뻗어나가는 순서. 완성되면 역순으로 사라졌다가 다시 등장하는 무한 루프. 핸드드로잉 느낌으로 찌글거리는 wobble도 들어갔으면."

- **레퍼런스 이미지를 최소 3장 먼저 제공**: 
  - 전체 레이아웃 (예: INCORPORE SANO 포스터)
  - 획 스타일 (예: NEXT PHASE 폰트, Erik Marinovich 스왓쉬)
  - 이미 다른 AI가 짠 비슷한 결과물 (있다면)
- **한글 레터링은 직접 path 찍으려 하지 말고 처음부터 Claude에게 맡기기**. 내가 자소를 좌표로 쪼개려다 2시간 날렸음.
- **뮤비 배경은 처음부터 "iframe을 확대해서 상단 UI 잘라내기"를 명시**. 처음엔 iframe 기본 크기로 시작했다가 YouTube 제목바/재생 버튼 가리느라 여러 번 왕복했다.

### 보완하면 좋을 것들

- **뮤비 0:01 타이밍 동기화 정밀화**: 지금은 setTimeout 1.5초 고정인데, YT IFrame API의 `onStateChange` + `getCurrentTime()` 폴링으로 실제 재생 위치 기준으로 레터링 시작하면 더 정확하다. 네트워크 느린 환경에선 재생 시작 전에 레터링이 먼저 나올 수 있음.
- **반응형 대응 부실**: viewBox `-20 20 1240 1220`이 고정이라 세로 화면/매우 좁은 창에서 레터링이 잘림. `preserveAspectRatio="xMidYMid meet"`에 의지하고 있는데 극단적인 비율에선 한계.
- **wobble 성능 최적화**: `feDisplacementMap scale`을 매 프레임 변경할 때 Safari에서 살짝 끊기는 경우가 있다. `requestAnimationFrame` throttle 외에 GPU 가속 힌트(`will-change: filter`) 실험 필요.
- **장식 path의 "뿌리" 판단 알고리즘**: 지금은 텍스트 중심점 기준 단일 거리 비교라 일부 중간 거리 장식이 어색하게 그려짐. 각 장식 path에 대해 "가장 가까운 Phase A path의 한 점"으로 판단하면 더 자연스러워질 듯.
- **unmute 전 fallback UX**: YT IFrame API 로드가 네트워크 문제로 늦으면 사용자가 클릭했을 때 src 재설정 fallback이 작동해서 검정 화면이 한 번 뜬다. API 로드 실패 시 버튼을 잠시 비활성화하는 처리가 있으면 좋겠다.
- **lettering.jsx를 더 잘 활용**: Claude가 준 원본엔 wobble 강도(wobbleAmount), 글자 가중치(weight), 속도(speed) 등 **런타임 조정 가능한 파라미터 slider**가 있었는데 포팅하면서 상수로 박아버렸다. 디버그용 GUI로 남겨두면 튜닝 이터레이션이 훨씬 빨랐을 것.

### 시간 절약 팁

- **배경 이펙트와 레터링을 완전히 분리해서** 각각 먼저 독립적으로 완성한 뒤 합치기. 이번엔 둘을 왔다갔다 조정하다가 한쪽 바꾸면 다른 쪽이 이상해지는 상황이 여러 번 있었다.
- **애니메이션 루프는 상태머신부터 먼저 그리고 시작**. 등장/유지/소거/쉼 4단계를 다이어그램으로 그려놓으면 delay/duration 계산이 훨씬 명확했을 것.
- **파라미터 이름 명확히**: `SPEED_A`, `SPEED_B`, `HOLD_DUR` 같은 이름은 좋지만, 초기에 `wobble`, `scale`, `freq`가 뭘 제어하는지 코드를 파고들어야 알 수 있어서 튜닝 속도가 느렸음. 주석에 "이 값을 올리면 X가 커짐" 한 줄씩만 있으면 훨씬 빠르다.

---

## 동료 공유용 요약

**왜 만들었나**: 악동뮤지션(AKMU) '소문의 낙원' 뮤비 위에 덩굴처럼 자라나는 한 붓 그리기 레터링. 노래 타이틀이 꽃 피듯 등장 → 역재생되듯 사라짐 → 다시 등장의 무한 루프.

**특이점**: **레터링 타입 디자인을 Claude가 직접 설계**. 참고 이미지만 주고 한글 6글자를 66개 Bezier path로 짜줬는데, 손글씨 장식체의 밀도와 자소 간 연결이 꽤 그럴듯했음. AI가 이런 영역까지 커버할 수 있다는 게 이번 작업에서 가장 인상 깊었던 포인트.

**핵심 구성**: 쪼개진 블러 뮤비 배경 + 66개 path 한 붓 그리기 + 자소 순서 + 찌글찌글 wobble + DRAW → HOLD → ERASE(역순) → PAUSE 루프.

**기술**: YouTube IFrame API + SVG filter + stroke-dasharray 애니메이션 + vanilla JS 루프 상태머신.
