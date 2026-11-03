# Day 28 — 환승

**2026.11.04 (수)**

## 출발
그림자가 나를 따라오지 않고, 스쳐 지나가는 다른 존재의 그림자로 갈아타는 장면.

## 구현
다른 작업본(`transfer-handoff`)을 갤러리 경로로 들였다. 실행 원본은 `index.html` 단일 파일(CSS·SVG·텍스처·Web Audio).

- 컷아웃 그림자극. 흑백 기본, S로 색채.
- 사람·강아지·고양이·사슴이 시차·속도로 등장. 동시 최대 5, 유사 외형 중복 없음.
- 마주침·추월 접점에서 그림자 소유권이 바뀌고, 새 상대의 방향으로 따라간다.
- 초당 12 자세. 지면 하단 약 1/4이 그림자 영역.
- 상단 Sound Off. 기본 음소거, M 토글. BGM 없음.

## 파일
```
public/works/day28/index.html
public/works/day28/verify.cjs
public/works/day28/REQUIREMENTS.md
public/works/day28/HANDOFF.md
src/works/day28.tsx
```
