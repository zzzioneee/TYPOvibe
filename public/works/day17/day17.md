# Day 17 — REDRED / GREENGREEN

**날짜**: 2026.05.18  
**태그**: Canvas, Typography, Motion, Stagger

## 개요

코르티즈 - redred에서 출발한 타이포 모션그래피.  
REDRED / GREENGREEN 두 줄이 서로 반대 방향으로 무한 슬라이드하고, 등장·퇴장 시 글자별 stagger + motion blur로 리듬감을 만드는 루프 애니메이션.

## 기술 스택

- **Canvas 2D** — 글자 렌더링 + 무한 스크롤 (3벌 복사 wrap)
- **Barlow Condensed 900** — Helvetica Neue 97 Black Condensed 대체 (레퍼런스 폰트)
- **Stagger 등장/퇴장** — 글자별 딜레이 × easeOutCubic / easeInCubic
- **CSS filter blur** — motion blur 효과 (등장 시 blur 걷힘, 퇴장 시 blur 증가)
- **무한 슬라이드** — 3벌 복사 + wrap으로 끊김 없는 루프

## 씬 구성

| 구간 | 시간 | 내용 |
|------|------|------|
| IN   | 900ms | 글자 stagger 등장 (위→아래, blur 걷힘) |
| HOLD | 2000ms | REDRED 우→, GREENGREEN ←로 무한 슬라이드 |
| OUT  | 700ms | 글자 stagger 퇴장 (아래로, blur 증가) |
| LOOP | 3600ms | 전체 반복 |

## 레퍼런스

- shoobAKA - node01 (Cavalry): Helvetica Neue 97 Black Condensed + stagger + motion blur + stripe duplicator
- yonsankim - good game (Cavalry): ABC Favorit Black + 대형 2줄 텍스트 구성
