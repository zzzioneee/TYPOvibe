---
inclusion: always
---

# TYPOvibe FROM 링크 규칙

## 모든 day 작업물 index.html에 반드시 포함

새 day 작업을 만들 때 `index.html`에 **항상** 아래 구조로 FROM 링크를 넣는다.

```html
<style>
  .from-wrap { position:fixed; top:24px; left:50%; transform:translateX(-50%); z-index:200; }
  .from-link { font-family:'Pretendard', sans-serif; font-size:20px; font-weight:500;
    color:rgba(255,255,255,0.5); text-decoration:none; letter-spacing:0.15em; }
  .from-link:hover { color:rgba(255,255,255,0.9); }
</style>

<div class="from-wrap">
  <a href="{실제 기사/링크 URL}" target="_blank" rel="noopener" class="from-link">FROM</a>
</div>
```

## 규칙

- 위치: 화면 상단 중앙 고정 (`top:24px`, `left:50%`, `transform:translateX(-50%)`)
- 텍스트: `FROM` (대문자 고정)
- 색상: `rgba(255,255,255,0.5)` — hover 시 `rgba(255,255,255,0.9)`
- 폰트: Pretendard, 20px, weight 500
- z-index: 200 (항상 최상단)
- `target="_blank" rel="noopener"` 필수

## 배경이 밝은 작업물 (bgTheme: light)

밝은 배경일 경우 색상만 조정:
```css
color: rgba(0,0,0,0.4);
```
hover: `color: rgba(0,0,0,0.8);`

## 절대 하면 안 되는 것

- `#from`, `#title-label` 같은 커스텀 ID로 따로 만들지 말 것
- 하단(bottom)에 배치하지 말 것
- 날짜를 FROM 자리에 넣지 말 것
- FROM 링크를 빠뜨리지 말 것
