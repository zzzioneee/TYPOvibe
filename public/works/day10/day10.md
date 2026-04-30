# Day 10 — 파편이 맥락이 될 때

**2026.04.29 (수요일)**

FROM · [비애티튜드 『파편이 맥락이 될 때』](https://magazine.beattitude.kr/visual-portfolio/younsikkim/)

## 출발

조각가 김윤식 작가의 전시 칼럼. "모든 것이 0g의 디지털로 가볍게 휘발되는 시대, 묵직한 물질의 무게는 어떻게 지켜지는가."

작가의 주장은 두 단계로 나뉨:
1. **디지털의 허상 폭로** — 스마트폰의 매끄러움과 0g의 데이터는 사실 서버·케이블·하드웨어라는 무거운 물질적 덩어리 위에 얹혀있다
2. **물질성의 수호** — 그러니 데이터로 치환될 수 없는 진짜 물질의 묵직한 부피감, 차가운 촉각, 공간을 차지하는 신체를 끝까지 붙잡아야 한다

이 2단계 논리를 웹에서 인터랙션으로 풀어내고 싶었음.

## 3막 구조

- **1막 — FEED**: SNS 피드처럼 세로 스크롤되는 조각 10점. 무한 루프. 작가·작품·재질·무게가 냉정한 미술관 도록 스타일로 표시됨. 디지털 태그 `0g · DIGITAL` 이 우상단에 박혀있어 "이 묵직한 청동/대리석이 화면 안에서는 0g으로 소비됨" 대비 환기
- **2막 — ENTERED → DIGITIZING**: 카드를 누르면 풀스크린으로 조각 등장. voxel displacement 로 3D 부조 생성 → 2초 정적 → 2.8초간 warm 듀오톤 → cool CAD LED 면으로 전환. 동시에 CAD 뷰포트 UI (트러스 격자, LED 패널, 치수선, 좌표축, 오브젝트 트리, 속성 패널) 전부 페이드인
- **3막 — DISSOLVING ↔ HOLDING**: 디지털화 완료 후 조각의 각 edge 가 두꺼운 컬러 라인 파편으로 해체되어 천천히 흩어짐. 약 15초 동안 무게 3.2kg → 0g. 꾹 누르면 근처 파편부터 원위치로 수렴 (HOLDING), 손을 떼면 다시 분해

## 10점 큐레이션

저작권으로 자유롭게 쓸 수 있는 public domain 조각만 모음. 현대 조각가(Serra, Giacometti, Noguchi, Whiteread, Salcedo, Kiefer, Fischer, Laib, McCall)는 전부 PD 불가라 초기 라인업에서 포기. 대신 **"묵직한 재질과 거대한 물성"** 을 보여주는 고전 조각으로 재구성. 디지털 대비감은 오히려 더 살아남.

| # | 작가 | 작품 | 재질 | 무게 |
|---|---|---|---|---|
| 01 | Rodin | Burghers of Calais (1889) | Bronze | 2,200kg |
| 02 | Rodin | The Thinker (c.1880) | Bronze | 700kg |
| 03 | Bernini | David (1623–24) | Carrara Marble | 800kg |
| 04 | Hellenistic | Venus de Milo (c.130 BC) | Parian Marble | 900kg |
| 05 | Hellenistic | Winged Victory of Samothrace (c.190 BC) | Parian Marble | 2,800kg |
| 06 | Michelangelo | Pietà (1498–99) | Carrara Marble | 2,000kg |
| 07 | Rapa Nui | Hoa Hakananai'a (c.1200) | Basalt | 4,200kg |
| 08 | Ancient Egypt | Colossi of Memnon (c.1350 BC) | Quartzite | 720 톤 |
| 09 | Ancient Egypt | Great Sphinx of Giza (c.2500 BC) | Limestone | 20,000 톤 |
| 10 | Hellenistic | Laocoön and His Sons | Marble | 800kg |

**수집 출처**: Wikimedia Commons (PD-old, PD-old-100, CC-BY-SA 3.0)

## 기술

### 렌더링
- **Three.js (0.160.0, esm.sh CDN)** — WebGL 3D 뷰포트
- **Voxel displacement** — 이미지 밝기를 5단계 step 으로 양자화해 PlaneGeometry(80×80) 각 vertex 를 z축으로 밀어 3D 부조 생성
- **Duotone 텍스처 2종** (`applyDuotone` + `buildCADTexture`) — warm (짙은 갈색 → 크림 오렌지) / cool CAD (4색 양자화 + LED dot grid + 격자 라인)
- **Shader crossfade** — `MeshStandardMaterial.onBeforeCompile` 로 fragment shader 후킹, `uMix` uniform 으로 두 텍스처 blend

### CAD 뷰포트 구성
- **주변 오브제**: 조각 뒤 트러스 격자 (3등분 × 4등분 + X bracing), 좌우 LED 패널 격자 3개 (비비드 시안)
- **바운딩 박스** (`Box3Helper`) + **치수선** (가로/세로 extent 에 비비드 마젠타 tick)
- **뷰포트 바닥/뒷벽 원근 격자** (`GridHelper` 두 개, 12 사이즈 × 24 분할)
- **오버레이 UI**: 좌측 `SCENE HIERARCHY` 트리 (Scene > Sculpture > Environment), 우측 `PROPERTIES` 패널 (Vertices/Faces/Material/Bound 실시간 값), 좌하단 좌표축 gnomon (X/Y/Z), 화면 중앙 크로스헤어

### 분해 (DISSOLVING)
- **Line2 모듈** (`three/examples/jsm/lines`) — 픽셀 단위 굵기 지원 와이어프레임 (2.8px). 기본 `LineBasicMaterial` 의 linewidth 는 대부분 브라우저에서 1px 로 고정되어 Line2 로 교체
- **EdgesGeometry(25°)** 로 edge 만 추출 → 중요한 edge 만 남아 파편이 또렷이 보임
- **Edge 파편 운동**: 각 edge 의 두 vertex 가 같은 velocity 로 이동 (선 형태 유지), 중심에서 바깥 방향으로 0.22~0.67 속도 + 중력 0.3 (부양감)
- **livePositions Float32Array** 직접 조작 후 매 프레임 `geometry.setPositions()` 호출

### 컬러 코딩
- **CAD_PALETTE** — 비비드 RGB:
  - 네이비 (shadow) `#111111` — 구조 (트러스)
  - 그린 `#00D65E` — 케이블 액센트
  - 오렌지 `#FF6B00` — LED 모듈
  - 시안 `#3DAEDD` — LED 패널
- wireframe edge 는 각 edge 의 z 값(displacement 높이)에 따라 4색 중 하나 배정 (vertex color)

### 배경 색온도
- ENTERED → DIGITIZING 구간 `rgb(249,240,226)` (크림) → `rgb(228,234,242)` (차가운 회색) 로 실시간 보간

## 삽질 기록 (v1 → v8)

### v1: 3D relief mesh + wireframe overlay
첫 시도. Three.js Relief mesh 생성, 크기/resize 이슈 해결, CAD UI 기반 잡음.

### v2: warm→cool 듀오톤 색온도 shift
"사진이 CAD 로 전환되는 매끄러움" 원한다 해서 스캔라인/wireframe 빼고 색온도만 이동. 너무 심심해졌음.

### v3: Voxel displacement + CAD UI
부조감 강화 + 바운딩 박스/gnomon/속성 패널 추가. 하지만 파편이 점(Points)으로 흩어지는 게 "CAD 느낌" 과 안 맞음.

### v4: Points → LineSegments edge 파편
점 폐기. EdgesGeometry 기반 선 파편으로 교체. 하지만 "그냥 라인으로만 전환" 이라는 피드백.

### v5: LED dot pattern + 4색 컬러 코딩
CAD 텍스처에 LED dot grid 추가, edge 에 vertex color 부여.

### v6: 분해 속도 완화
"분해가 금변한다" 피드백. velocity/중력/무게감소율 모두 2~3배 완만하게 조정.

### v7: Line2 두꺼운 edge + 팔레트 비비드화
`LineBasicMaterial.linewidth` 가 브라우저에서 1px 고정이라 Line2 로 교체, 4.5px 굵기.

### v8: CAD 주변 오브제 + 오브젝트 트리
트러스/LED 패널/원근 격자/Scene Hierarchy 트리 추가. 케이블 튜브는 과하다 해서 제거, edge 두께 4.5 → 2.8 로 낮춤.

## 핵심 교훈

### "CAD 느낌" 은 단일 변환이 아닌 다층 합성
- Voxel + Duotone + Wireframe + 주변 오브제 + UI 오버레이. 하나만 넣으면 부족하고, 넷 이상 겹쳐야 "디지털 렌더 프로그램 안" 체감 완성됨

### Wikimedia 이미지 URL: 파일명 MD5 해시 패턴
`https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[0..1]}/{filename}` 규칙. 파일명의 MD5 첫 두 자리가 디렉토리. `curl` 연타 시 HTTP 429 걸리므로 `sleep 3` 필수.

### Three.js Line2 모듈은 esm.sh 로 로드
`unpkg.com` 직접 로드 시 내부 `import 'three'` bare specifier 를 못 찾아 에러. esm.sh 는 자동 resolve 해서 jsm 모듈도 문제없이 동작.

### LineBasicMaterial.linewidth 는 1px 고정
모든 WebGL 구현에서 지원 안 됨. 두꺼운 선 필요하면 무조건 `Line2` (`LineSegmentsGeometry` + `LineMaterial` + `computeLineDistances`). `resolution` uniform 도 resize 마다 업데이트 필수.

### 컬러는 밝기 기반이 아니라 역할 기반
초기에 "원본 밝기에 해당하는 단일 듀오톤 팔레트" 로 양자화했으나, CAD 렌더의 본질은 "원본 색과 무관하게 기능별 색 재분류". 팔레트 교체하면서 디지털화 체감 확 살아남.

## 다음에 다시 한다면

- **조각 이미지 region segmentation** — 하나의 plane 이 아니라 얼굴/몸통/팔 등 독립 mesh 로 분리해서 exploded view 구현. 지금은 "2D 사진의 depth map" 수준이라 3D 구조감 제한적
- **사운드** — Day 9 Web Audio 패턴 재사용. DIGITIZING 시 전자 beep, DISSOLVING 시 가벼운 glass tinkle, HOLDING 시 안정 low hum
- **첫 진입 튜토리얼** — press & hold 를 어디에 해야 하는지 불명확. DISSOLVING 진입 직후 3초간 "HOLD HERE" 안내 필요
- **뷰포트 원근감 강화** — 지금 GridHelper 두 개로 바닥/뒷벽만 있어서 "공간감" 약함. 좌우 벽 + 천장 격자까지 넣으면 진짜 CAD 소프트웨어 3D 뷰포트
