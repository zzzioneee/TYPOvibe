---
inclusion: always
---

# TYPOvibe Back 버튼 색상 규칙

## App.tsx 헤더 — bgTheme 기반 색상

작업물의 `bgTheme`에 따라 헤더 배경색과 Back 버튼 색상이 자동으로 결정됨.

| bgTheme | 헤더 배경 | ← Back 버튼 색상 |
|---------|-----------|-----------------|
| `light` | `#111` (검정) | `#fff` (흰색) |
| `dark`  | `#fff` (흰색) | `#111` (검정) |

## 규칙

- 작업물 배경이 밝으면(light) → Back 버튼 흰색
- 작업물 배경이 어두우면(dark) → Back 버튼 검정
- `bgTheme`은 WORKS 배열에서 설정: `bgTheme: 'light' as const` 또는 `bgTheme: 'dark' as const`
- 새 day 작업 추가 시 배경색에 맞게 `bgTheme` 반드시 설정

## 현재 적용 코드 위치

`src/App.tsx` — Day 상세 뷰 헤더:
```tsx
const isLight = work?.bgTheme === 'light'
// 헤더 배경
background: isLight ? '#111' : '#fff'
// Back 버튼 색상
color: isLight ? '#fff' : '#111'
```
