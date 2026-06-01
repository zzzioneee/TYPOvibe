# Day 26 — Chiky&Cheky

**2026.06.01 (일)**

FROM · [Design Compass — Chiky&Cheky](https://designcompass.org/archive/chikycheky/)

## 출발
STUDIO OKGO가 프랑스 기반 브랜드 KOREAN STREET를 위해 디자인한 캐릭터 Chiky&Cheky. 둥글둥글한 비닐 토이 느낌의 캐릭터를 3D 인터랙티브로 웹에서 구현하고 싶었다.

## 컨셉
Three.js로 Chiky 캐릭터를 모델링하고, 마우스를 따라 시선이 움직이며 몸이 살짝 기울어지는 인터랙티브 3D 캐릭터. 하단에 브랜드 로고 텍스트가 키네틱 타이포그래피로 움직인다.

## 구조
- Three.js 씬: PerspectiveCamera + 균일 조명
- 캐릭터 파츠: 몸통(CapsuleGeometry), 벼슬(Capsule+Sphere), 눈(ExtrudeGeometry "6"자 형태), 부리(TorusGeometry), 발
- 3체 배치 (중앙 + 좌/우)
- CSS 로고: Fredoka 폰트, 개별 글자 scaleX 애니메이션

## 기술
### Three.js 캐릭터 모델링
- CapsuleGeometry로 몸통/벼슬의 둥근 원통 형태
- ExtrudeGeometry + Shape로 "6"자 눈 흰자 (bezierCurve로 곡선)
- TorusGeometry로 도넛형 부리
- MeshStandardMaterial로 비닐 토이 질감 (roughness 0.4)

### 마우스 인터랙션
- mousemove 이벤트로 normalized 좌표 추출
- lerp로 부드러운 회전 추적 (rotateX/Y)
- 눈동자(pupil)도 마우스 방향으로 미세 이동
- 5초 주기 눈 깜빡임 (scaleY 변화)

### 키네틱 타이포그래피
- "CHiKY&CHEKY" 각 글자를 span으로 분리
- H(0s) → E(1s) → C(2s) → K(3s) 순서로 scaleX 1.8 늘어남
- margin도 같이 애니메이션하여 양옆 글자 겹침 방지

## 삽질 기록
- 처음 순수 CSS 3D로 시도 → 마리오 레퍼런스 수준 달성 불가 → Three.js로 전환
- Vite public 폴더 정적 파일 서빙 이슈: 좀비 프로세스가 포트 점유하면 새 파일 인식 안 됨 → 서버 프로세스 kill 후 재시작으로 해결
- 눈 형태: 물방울 → 나뭇잎 → 쉼표 → "6"자로 여러 차례 수정. 결국 Shape + bezierCurveTo로 정확한 형태 구현
- perspective 카메라로 3체 배치 시 양쪽 왜곡 → FOV 낮추고 카메라 멀리 배치로 해결
- clone()한 캐릭터에 애니메이션 미적용 → forEach로 3체 모두 순회하도록 수정

## 핵심 교훈
- CSS 3D로 복잡한 캐릭터를 만드는 건 비현실적. Three.js가 맞는 도구.
- ExtrudeGeometry + Shape은 로고/캐릭터의 커스텀 형태를 만들 때 강력함.
- 캐릭터 디자인은 레퍼런스와 계속 비교하며 디테일을 맞춰야 — 한 번에 완성 불가.
- clone()은 geometry/material만 복사하고 JS 로직은 안 따라감 → 애니메이션은 별도 처리 필요.

## 파일 구조
```
public/works/day26/
  index.html    - Three.js 씬 + CSS 로고 (인라인)
  bg.png        - 배경 이미지 (미사용, 단색 배경으로 전환)
```

## 레퍼런스
- [Chiky&Cheky — Design Compass](https://designcompass.org/archive/chikycheky/)
- [STUDIO OKGO](https://www.studioOKGO.com)
- [Pure CSS Mario 64 — Ben Evans (CodePen)](https://codepen.io/ivorjetski/full/abEjKN)
- Three.js 공식 문서: ExtrudeGeometry, Shape

---

## 동료 공유용 요약

### 한 줄 요약
프랑스 × 한국 캐릭터 Chiky를 Three.js로 3D 인터랙티브 구현.

### 왜 이걸 만들었나
비닐 토이 느낌의 캐릭터를 웹에서 돌려보고 싶었다. 마우스 추적 + 키네틱 로고 조합.

### 작업 흐름
1. 캐릭터 레퍼런스 분석 (형태, 색상, 비율)
2. CSS 3D 시도 → 한계 인식 → Three.js 전환
3. 파츠별 geometry 조합으로 모델링
4. 마우스 추적 + 깜빡임 인터랙션 추가
5. 3체 배치 + 키네틱 로고 텍스트

### 핵심 인터랙션
- 마우스 움직임에 캐릭터 3체가 동시에 부드럽게 회전
- 눈동자가 마우스 방향을 따라감
- 5초 주기 깜빡임
- 로고 텍스트의 H→E→C→K 순차 scaleX 모션

### 삽질 포인트
- CSS 3D는 간단한 형태에만 유효 — 곡면 캐릭터엔 Three.js가 맞음
- 눈 "6"자 형태 구현이 가장 오래 걸림 (5회 이상 수정)
- Vite 좀비 프로세스 이슈로 30분 낭비
