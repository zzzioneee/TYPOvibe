# Day 23 — 몸으로 돌아가는 사람들 (Knitting Typography)

**2026.05.27 (화요일)**

FROM · [AI윤리연구소 — 몸으로 돌아가는 사람들](https://ai-ethics.kr/return-luddites-human-body-2026-05-25/)

## 출발

AI윤리연구소 뉴스레터에서 "모든 것을 수치화하고 효율화하려는 디지털 압박에 지친 소비자들이 자발적 불편함을 선택하면서 감각적 저항으로서의 패러다임을 보이고 있다"는 내용을 읽음. 실뜨기 같은 아날로그 취미의 급증(136% 증가)이 클릭 대신 손을 쓰겠다는 '경험의 보존' 행위라는 관점이 인상적이었고, 타이핑(디지털)으로 뜨개질(아날로그)을 하는 역설적 인터랙션을 만들어보고 싶었음.

## 컨셉

**타이핑 = 뜨개질**: 키보드를 치면 화면에 뜨개바늘이 움직이며 실이 엮여 글자가 완성됨. 디지털 입력이 아날로그 직물로 변환되는 경험. 글자 하나하나가 스티치 패턴으로 직조되며, 물리 시뮬레이션으로 직물이 중력에 의해 자연스럽게 늘어짐.

## 구조

- 검정 배경 + 상단에 뜨개바늘 2개 (나무 질감, 교차 애니메이션)
- 타이핑할 때마다 바늘이 움직이며 직물이 한 땀씩 추가됨
- 직물은 Verlet 파티클 시스템으로 중력에 의해 자연스럽게 드레이핑
- 2가지 스티치 모드: KNIT(V자 니트) / WEAVE(바둑판 직조)
- 6가지 컬러 팔레트 순환 (베네통 스타일)
- 한글 IME 조합 실시간 지원
- FROM 링크 상단 중앙 고정

## 기술

### Verlet Particle System (직물 물리)

각 스티치 위치를 파티클로, 인접 스티치를 constraint로 연결. 매 프레임:
1. 중력 적용 + damping
2. 미세한 sway(흔들림) 추가
3. constraint 해결 (4회 반복)
4. 바닥 충돌

```
STITCH_W = 6, STITCH_H = 6
GRAVITY = 0.02, DAMPING = 0.985, CONSTRAINT_ITERS = 4
```

상단 1행은 pinned(고정) → 나머지가 아래로 늘어짐.

### 글자 래스터화

offscreen canvas에 글자를 렌더 → `getImageData`로 22×26 그리드의 "채움/비움" 배열 추출. 각 셀이 하나의 스티치.

### 스티치 드로잉

- **KNIT**: V자 곡선 2개 (quadraticCurveTo) — 실제 니트 스티치 형태 모방
- **WEAVE**: 가로/세로 교차 패턴 — `(row+col)%2`로 over/under 결정

각 스티치에 seededRandom으로 미세한 위치/두께 변화 → 손뜬 듯한 불규칙성.

### 뜨개바늘 애니메이션

타이핑할 때마다 바늘 교차 애니메이션 트리거. 나무 질감 그라디언트, 그림자, 하이라이트 디테일. easeInOutCubic으로 자연스러운 모션.

### 한글 IME 처리

`compositionstart/update/end` 이벤트로 조합 중인 글자를 실시간 미리보기. 확정되면 charQueue에 추가.

## 삽질 기록

### 클로드코드로 작업
이 작업은 Claude Code에서 직접 바이브코딩으로 진행. `nemutas/cloth-simulation` 깃허브를 참고해서 Verlet 물리를 구현하되, Three.js 대신 Canvas 2D로 간소화.

### 파티클 수 최적화
초기엔 전체 캔버스를 파티클로 채웠으나 성능 문제. 실제로 타이핑된 영역만 파티클 생성하도록 변경.

### 한글 조합 문제
IME compositionupdate에서 조합 중인 글자를 미리보기로 보여주되, 확정 시 중복 입력 방지가 까다로웠음.

## 핵심 교훈

### Verlet + Constraint가 직물 시뮬레이션의 핵심
복잡한 물리 엔진 없이 position-based dynamics만으로 자연스러운 직물 드레이핑이 가능. 핵심은 constraint 반복 횟수(4회).

### seededRandom으로 "손맛" 표현
매 프레임 동일한 seed를 쓰면 떨림 없이 불규칙성 유지. `Math.random()`은 매 프레임 바뀌어서 안 됨.

## 파일 구조

```
public/works/day23/
  index.html          ← 전체 코드 (단일 파일, script inline)
  day23.md            ← 이 문서
src/works/day23.tsx    ← React iframe 래퍼
```

## 레퍼런스

- [AI윤리연구소 — 몸으로 돌아가는 사람들](https://ai-ethics.kr/return-luddites-human-body-2026-05-25/)
- [nemutas/cloth-simulation](https://github.com/nemutas/cloth-simulation) — Verlet cloth 참고

---

## 동료 공유용 요약

### 한 줄 요약
키보드를 치면 뜨개바늘이 움직이며 실이 엮여 글자가 직조되는 인터랙티브 타이포그래피.

### 왜 이걸 만들었나
"디지털 압박에 지쳐 아날로그로 돌아가는 사람들" 기사에서 영감. 타이핑(디지털)으로 뜨개질(아날로그)을 하는 역설적 경험을 만들고 싶었음.

### 작업 흐름
1. cloth-simulation 깃허브 참고하여 Verlet 파티클 시스템 구현
2. 글자를 22×26 그리드로 래스터화 → 각 셀 = 스티치
3. KNIT/WEAVE 두 가지 드로잉 모드 구현
4. 뜨개바늘 교차 애니메이션 추가
5. 한글 IME 실시간 처리
6. 컬러 팔레트 순환 기능

### 핵심 인터랙션
- **타이핑 = 뜨개질**: 한 글자씩 스티치 패턴으로 직조됨
- **KNIT/WEAVE 전환**: V자 니트 vs 바둑판 직조
- **컬러 순환**: 6가지 대비 팔레트
- **물리 시뮬레이션**: 직물이 중력으로 자연스럽게 늘어짐

### 삽질 포인트
- 파티클 수 최적화 (타이핑 영역만 생성)
- 한글 IME compositionupdate 실시간 미리보기
- seededRandom으로 프레임 간 안정적인 불규칙성 유지
