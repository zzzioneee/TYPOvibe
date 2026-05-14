# Day 16 — Wait, is it summer already?

**날짜**: 2026.05.14  
**태그**: Canvas, Particle, Simplex Noise, Pixel Art, Interactive

## 개요

"Wait, is it summer already?" — 여름이 왔나 싶은 그 순간의 감각을 픽셀 파티클로 표현.  
마우스 커서가 지나가면 텍스트가 Simplex Noise 기반으로 흩어지고, 손을 떼면 Lerp로 조용히 복귀하는 인터랙티브 작품.

## 작품 구성

- **배경**: 픽셀 디더링 구름이 천천히 흘러가는 여름 하늘 (스크롤 루프)
- **텍스트**: Playfair Display 이탤릭체, 4줄 우측 정렬 레이아웃
- **파티클**: 텍스트 픽셀을 7×7 블록으로 샘플링, 마우스 궤적에 반응

## 기술 스택

- **Canvas 2D** — 파티클 렌더링 + 오프스크린 캔버스 텍스트 마스킹
- **Simplex Noise 2D** — 파티클 분해 방향 + 구름 질감 생성
- **Pixel Dithering** — 3px 블록 단위 구름 렌더링 (SKY_PIXEL = 3)
- **Mouse Trail** — 최근 20프레임 궤적 히스토리로 Falloff 계산
- **Lerp 복귀** — 스프링 없이 마찰력(FRICTION=0.88) + Lerp(0.10)로 부드러운 복귀

## 구현 포인트

- 마우스 꼬리(Trail) 전체에서 가장 강한 Falloff를 찾아 파티클에 적용 → 빠르게 움직여도 끊김 없이 반응
- Simplex Noise를 파티클 원래 좌표 기준으로 샘플링 → 복귀 후에도 동일한 방향으로 분해
- 구름은 W×3 크기 오프스크린 캔버스에 미리 렌더링 후 매 프레임 X 오프셋만 이동 → 성능 최적화
- 구름 생성 시 seeded RNG 사용 → 리사이즈해도 동일한 구름 배치 유지
- `colorT` 값으로 흰색↔빨강 전환 설계 (현재는 단색 빨강으로 고정, 추후 확장 가능)

## 파라미터

| 상수 | 값 | 설명 |
|------|-----|------|
| PIXEL | 7 | 파티클 블록 크기 (px) |
| RADIUS | 45 | 마우스 Falloff 반경 |
| TRAIL_LEN | 20 | 마우스 궤적 히스토리 길이 |
| NOISE_FORCE | 14 | 노이즈 가속도 강도 |
| FRICTION | 0.88 | 속도 감쇠 계수 |
| LERP_RATE | 0.10 | 복귀 Lerp 비율 |
