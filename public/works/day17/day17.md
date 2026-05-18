# Day 17 — COLONY

**날짜**: 2026.05.18  
**태그**: Canvas, Interactive, Branch, Typography

## 개요

연상호 감독의 영화 [군체](COLONY) 개봉을 기대하며 만든 타이포그래피 인터랙션.  
COLONY 텍스트 각 글자의 아웃라인을 실시간으로 추출하고, 클릭하면 글자 사이에서 거미줄처럼 branch가 뻗어나가는 인터랙티브 작품.

## 기술 스택

- **Canvas 2D** (2개 — bg: 텍스트+배경, fg: branch)
- **Bebas Neue** 폰트 + `letterSpacing`
- **픽셀 마스크 기반 엣지 추출** — 오프스크린 캔버스에 텍스트를 그려 각 글자의 좌/우 외곽선 픽셀 좌표 추출
- **Branch 시스템** — 원본 코드 기반의 재귀적 파티클 분기 시스템
- **Fade 클리핑** — x/y 경계에서 alpha fade로 부드러운 소멸

## 구현 포인트

- 글자 그룹 감지: x열 픽셀 유무로 글자 덩어리 파악, O 내부 구멍(≤8px) 자동 채움
- 우측/좌측 외곽선 픽셀 추출: `isC(px,py) && !isC(px+1,py)` 조건
- 클릭 위치에 가장 가까운 엣지 픽셀 → `Math.hypot` 거리 계산으로 정확한 pair 선택
- 폰트 로드 후 DOM span `getBoundingClientRect()`로 실제 렌더 너비 측정 → 중앙 정렬

## FROM

[중앙일보 — 군체 개봉](https://www.koreadaily.com/article/20260517013149944)
