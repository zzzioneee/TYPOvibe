# Day 15 — Metaball Typography

**날짜**: 2026.05.14
**헤드라인**: METABALL 텍스트가 메타볼처럼 합쳐지고 분리되는 인터랙티브 타이포그래피

---

## 컨셉

'METABALL'이라는 텍스트 자체가 메타볼 효과의 주인공이 되는 작업. 각 글자가 독립적으로 움직이다가 가까워지면 물방울처럼 합쳐지고, 멀어지면 다시 분리된다. SVG goo 필터를 활용해 CSS/DOM 기반으로 실시간 메타볼 합침 효과를 구현.

---

## 구현 내용

### 1. SVG Goo 필터 메타볼 효과
- `feGaussianBlur` + `feColorMatrix`(alpha threshold) 조합으로 메타볼 합침 구현
- blur로 글자 경계를 부드럽게 만들고, threshold로 다시 선명하게 잘라내면 가까운 글자끼리 자연스럽게 합쳐짐
- `feComposite` 제거하여 blur+threshold 결과만 출력 → 색이 자연스럽게 블렌딩됨

### 2. 글자 애니메이션
- 8개 글자(M-E-T-A-B-A-L-L)가 각각 독립적으로 움직임
- 삼각함수 기반 궤도 운동 (cos/sin 조합)
- 각 글자별 위상 차이로 자연스러운 군무 효과
- 회전 애니메이션 추가

### 3. 파라미터 컨트롤
- Font Size: 글자 크기 (vw 단위)
- Blur (Merge): goo 필터의 blur 강도 — 높을수록 더 쉽게 합쳐짐
- Threshold: alpha 임계값 — 낮을수록 부드러운 경계
- Speed: 애니메이션 속도
- Overlap: 글자 간격 — 낮을수록 가깝게 배치
- Movement: 움직임 진폭
- Background: 배경색 선택
- Color Random: 랜덤 색상 생성

### 4. 컬러 시스템
- 기본 8색 팔레트 (레인보우)
- Random 버튼으로 HSL 기반 랜덤 색상 생성
- 채도 60-100%, 명도 45-70% 범위로 선명한 색상 보장

---

## 기술 스택

| 기술 | 용도 |
|------|------|
| SVG Filter (feGaussianBlur, feColorMatrix) | 메타볼 합침 효과 |
| CSS absolute positioning | 글자 배치 및 애니메이션 |
| requestAnimationFrame | 60fps 애니메이션 루프 |
| DOM manipulation | 실시간 파라미터 조절 |

---

## 삽질 포인트

1. **투명 유리 효과 시도**: 레퍼런스처럼 투명한 유리/물방울 텍스트를 구현하려 WebGL 셰이더, backdrop-filter, SVG displacement 등 다양한 방식을 시도했으나, CSS/SVG 기술로는 3D 렌더링 수준의 굴절 효과를 재현하기 어려움. 최종적으로 SVG goo 필터 기반 메타볼 합침에 집중.

2. **SVG goo 필터와 CSS 호환성**: `backdrop-filter`는 SVG 필터와 충돌, `background-clip: text`도 SVG 필터 적용 시 무시됨. DOM 요소의 `color` 속성만 goo 필터에서 정상 작동.

3. **feComposite operator="atop" 역할**: 이 primitive가 있으면 원본 선명한 글자가 메타볼 형태 위에 합성되어 글자가 선명하게 보이지만 색 블렌딩이 안 됨. 제거하면 blur+threshold 결과만 보여서 색이 자연스럽게 섞임.

4. **글자 간격과 blur의 관계**: 메타볼 합침이 되려면 글자 간격이 blur 범위 안에 들어와야 함. overlap 값과 blur 값의 밸런스가 핵심.

---

## 동료 공유용 요약

**왜 만들었나**: 메타볼(Metaball) 효과를 타이포그래피에 적용. 글자가 물방울처럼 합쳐지고 분리되는 유기적인 움직임을 SVG 필터로 구현.

**핵심 인터랙션**:
- 8개 글자가 각각 독립적으로 움직이며 가까워지면 메타볼처럼 합쳐짐
- 슬라이더로 blur, threshold, speed, overlap 등 실시간 조절
- Random 버튼으로 색상 변경

**기술**: SVG goo filter (feGaussianBlur + feColorMatrix) + DOM animation + requestAnimationFrame

**삽질**: 투명 유리 효과를 WebGL/CSS/SVG로 10회 이상 시도했으나 기술적 한계로 포기. SVG goo 필터와 CSS background-clip/backdrop-filter 비호환 확인. 최종적으로 SVG goo 메타볼 합침에 집중.
