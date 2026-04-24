# Day 7 — 설교·상담까지 대신해주는 AI

**날짜**: 2026.04.24
**헤드라인**: 설교·상담까지 대신 해준다? 종교계가 'AI 활용' 고민에 빠진 이유
**출처**: [뉴닉 — 피자스테이션](https://newneek.co/@pizzastation/article/40070)

---

## 컨셉

교회와 사찰이 설교문 작성, 상담, 불경 요약 등에 AI를 활발히 활용하기 시작했다는 뉴스. 경전을 직접 읽고 수양하는 종교적 행위를 AI가 대체하는 현상에 대한 종교계의 고민이 핵심. 1,500년간 인간이 지켜온 신앙적 의례가 기계에 위임되는 디지털 시대의 아이러니를 **네온 글리치로 왜곡된 부처/예수 3D 조각상**으로 시각화. 조각상을 클릭하면 macOS 시스템 TTS로 녹음한 경전 낭독이 재생 — 진짜 사람(스님/목사)이 아닌 기계 음성으로 성스러운 텍스트를 읊는다는 장치.

---

## 구현 내용

### 1. 3D 조각상 (Three.js + GLB)
- 사용자 제공 STL 파일(부처 145MB / 예수 125MB) → 랜덤 샘플링으로 12만 triangles로 감축 → GLB(각 8MB)로 변환
- 변환 스크립트: `scripts/convert-stl.mjs` — Node.js에서 Three.js STLLoader로 로드, 직접 GLB 바이너리 작성 (GLTFExporter는 Node 환경 FileReader 없어서 불가)
- 부처 STL은 원본 x축이 세로로 되어있어 런타임에서 z축 -90도 회전 + 상/하 반구 단면 너비 비교로 방향 자동 보정 (연화대가 넓은 쪽이 아래)
- 각 조각상은 inner/outer 2단 그룹 구조로 중심 정렬 → Y축 회전 시 제자리 회전

### 2. 네온 글리치 셰이더 (GLSL)
- **vertex**: local position, normal, view direction 전달
- **fragment**: 높이별 cyan→magenta→lime 그라디언트 + rim light
- 시간에 따른 색상 웨이브
- 네온 팔레트는 5단계: black → cyan → magenta → yellow → lime → white

### 3. 글리치 포스트 프로세싱 (EffectComposer)
- **RenderPass**: 씬 → 텍스처
- **UnrealBloomPass**: 네온 글로우 (strength 0.5, radius 0.6)
- **ShaderPass (custom)**:
  - 3.5px 픽셀 모자이크 (low-res downsample)
  - Bayer 8x8 ordered dithering
  - 밝기 5단계 양자화 + 네온 팔레트 매핑
  - 수직 스미어(위쪽 22px 누적): 조각상 색이 아래로 흘러내리는 잔상
  - 가로 tear: 랜덤 행에 좌우 shift
  - 스파클 픽셀: 밝은 영역에 마젠타/시안 튐
- 배경(fgMask < 0.01) 영역은 `gl_FragColor.a = 0`으로 투명 → 뒤의 HTML 텍스트가 비침

### 4. 레이어 구조
- z-index 1: **중앙 헤드라인** (HTML `<a>`, Pretendard SemiBold)
- z-index 2: **Canvas** (alpha:true) — 조각상이 회전하면서 텍스트 위로 지나감
- Body 배경 `#000` + Canvas 투명이라 텍스트는 조각상 뒤에서 보임

### 5. 클릭 토글 오디오 (Three.js Raycaster)
- macOS `say` 커맨드로 미리 녹음한 m4a 파일 재생
  - `buddha.m4a` (Eddy 한국어 voice, 반야심경)
  - `jesus.m4a` (Yuna voice, 주기도문)
- 클릭 이벤트 시 Raycaster로 실제 메시 히트테스트 + fallback 박스 히트
- 같은 쪽 재클릭 = 정지 / 다른 쪽 클릭 = 전환 / 밖 클릭 = 무시
- 루프 재생 (끝나면 처음부터)

### 6. 회전 모션
- 두 조각상 모두 Y축 기준 같은 방향, 같은 속도(0.006 rad/frame) 회전
- 부처 x 위치: -1.85 / 예수 x 위치: +1.85 / 둘 다 y=0.15

---

## 기술 스택

| 기술 | 용도 |
|------|------|
| Three.js (CDN) | 3D 씬, GLTFLoader, EffectComposer |
| GLSL (custom shader) | 네온 팔레트, Bayer dither, 스미어, 글리치 |
| STLLoader (Node) | STL → GLB 변환 스크립트 |
| macOS `say` + `afconvert` | 한국어 TTS 음성 파일 생성 (m4a) |
| HTML5 Audio | 음성 재생 |

---

## Kiro 삽질 포인트

1. **STL 파일이 너무 큼** (각 125/145MB): GitHub 100MB 푸시 제한 걸림 + 웹 로딩 수분. 랜덤 샘플링 방식으로 12만 triangles까지 감축 + 직접 GLB 바이너리 작성으로 해결.

2. **부처 조각상 축 꼬임**: 원본 STL의 x축이 세로축이라 변환 결과에서 조각상이 누워있었음. 런타임에 geometry에 z축 -90도 회전 적용 + 상/하 반구 단면 너비 비교로 뒤집힘 여부 자동 판별 (연화대가 아래로 가도록).

3. **글리치 효과 반복 실패**: 가로 블록 찢김 → 너무 어색, 세로 줄무늬 → 레퍼런스와 다름, 최종적으로 픽셀 모자이크 + Bayer dither + 네온 팔레트 + 수직 스미어 방식으로 수렴. 레퍼런스(tumanavenue GIF) 해석에 시간 소모.

4. **Web Speech API 재생 실패**: Chrome macOS에서 시스템 voice(유나, Eddy)는 선택은 되지만 실제 재생 안 됨. Google 한국어는 remote voice라 첫 재생 지연 2~3초. speak 호출이 조용히 실패하는 Chrome 버그도 발견. 결국 `say` 커맨드로 미리 m4a 생성하는 정적 파일 방식으로 전환.

5. **호버 영역 오탐**: mousemove 기반 호버로 소리 재생 시도했는데 빈 공간에서도 소리 남 + 연속 mousemove로 cancel/speak 사이클 꼬여서 무음. 클릭 토글 + Raycaster 메시 히트로 전환해서 해결.

6. **`activeSide` 중복 선언 SyntaxError**: AUDIO 블록과 CLICK 블록에 동시에 선언해서 JS 전체가 실행 중단되고 조각상 로드 불가 → LOADING 영원히 표시. 중복 제거로 해결.

---

## 시도했지만 빠진 것들

- **2D SVG 조각상 라인 아트**: 처음엔 SVG 경로로 부처/예수 실루엣을 직접 그려서 flat 회전시켰으나, "3D 회전" 요구 충족 못해 STL 3D 모델 방식으로 전환.
- **Web Speech API TTS**: Chrome macOS 재생 실패/지연 문제로 정적 m4a 파일로 전환.
- **Sketchfab 3D 모델 자동 다운로드**: Sketchfab, MyMiniFactory 모두 로그인 필수라 자동 다운로드 불가 → 사용자가 직접 STL 업로드.

---

## 동료 공유용 요약

**왜 만들었나**: 종교계 AI 활용 트렌드 기사. AI가 설교문/상담을 대신하는 아이러니를 조각상 + 기계 음성으로 시각화.

**핵심 인터랙션**:
- 부처(왼쪽)/예수(오른쪽) 3D 조각상이 Y축으로 천천히 회전
- 네온 글리치 효과 (픽셀 모자이크 + Bayer dither + 수직 스미어)
- 중앙 헤드라인이 조각상 뒤에 고정 위치
- 조각상 클릭 시 AI 음성으로 반야심경 / 주기도문 낭독 (토글)

**기술**: Three.js + custom GLSL shader + macOS say 기반 m4a 오디오

**Kiro 삽질**: STL 파일 크기, 부처 축 꼬임, Web Speech API Chrome 버그로 TTS → m4a 정적 파일 전환.
