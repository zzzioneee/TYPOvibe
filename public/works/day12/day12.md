# Day 12 — Met Gala 2026: Fashion Is Art

**날짜**: 2026.05.11  
**태그**: Canvas, Generative, Particle, Three.js

## 개요

Met Gala 2026 테마 "Fashion Is Art"에서 출발한 제너레이티브 아트.  
마네킹 실루엣 위에 5개의 고전 유화 팔레트로 꽃 드레스가 피어나고 지는 인터랙티브 작품.

## 작품 구성

| 순서 | 작가 | 작품 | 드레스 형태 | 색 특징 |
|------|------|------|------------|---------|
| 1 | Claude Monet | Water Lilies | 벨 스커트 | 라벤더+청보라 메인, Voronoi 녹색/보라 덩어리 |
| 2 | Vincent van Gogh | Starry Night | 긴 치마 | 코발트 소용돌이, 노랑 별 포인트 |
| 3 | Gustav Klimt | The Kiss | 일자 슬림 | 황금갈색 메인, 검정/빨강/파랑 포인트 |
| 4 | Sandro Botticelli | Birth of Venus | 볼륨 미니 | 상체 하늘색+아이보리, 하체 에메랄드 |
| 5 | Edvard Munch | The Scream | 짧은 미니 | 빨강+주황+노랑 물결, 중앙 검정 |

## 기술 스택

- **Three.js r128** — InstancedMesh로 꽃 파티클 렌더링
- **ShaderMaterial** — alphaMap + instanceColor 동시 지원
- **Canvas 2D** — 마네킹 픽셀 마스크 기반 꽃 배치
- **Voronoi 세그먼트** — Monet 전용 비정형 색 덩어리
- **Prebuild 시스템** — setTimeout으로 다음 옷 미리 계산, 전환 끊김 없음

## 구현 포인트

- 마네킹 PNG를 오프스크린 캔버스로 픽셀 마스크 생성 → 꽃 배치 좌표 필터링
- 각 작품별 드레스 타입(yStart/yEnd/xRatio) + 팔레트 분리 설계
- BLOOM → HOLD → WILT 페이즈 사이클, 다음 옷 prebuild로 맨 몸 노출 없는 전환
- 작품별 색 결정 로직: Voronoi(Monet), 소용돌이 노이즈(Van Gogh), y/x 기반 분기(Botticelli, Munch)
