---
inclusion: always
---

# TYPOvibe FROM 링크 규칙

## FROM 추가 원칙

- FROM은 내가 **링크와 함께 명시적으로 요청할 때만** 추가한다
- 링크가 없거나 요청하지 않은 작업물에는 절대 FROM을 추가하지 말 것
- FROM이 이미 있는 작업물만 디자인 통일 대상

## 구조 (day17 기준)

```html
<style>
  .from-wrap { position:fixed; top:24px; left:50%; transform:translateX(-50%); z-index:100; }
  .from-link { font-family:'Pretendard',sans-serif; font-size:20px; font-weight:500;
    color:#fff; text-decoration:none; letter-spacing:0.15em; }
  .from-link:hover { color:rgba(255,255,255,0.75); }
</style>

<div class="from-wrap">
  <a href="{링크 URL}" target="_blank" rel="noopener" class="from-link">FROM</a>
</div>
```

## 규칙

- 위치: 화면 상단 중앙 고정
- 텍스트: `FROM` (대문자 고정)
- `target="_blank" rel="noopener"` 필수

## 밝은 배경 작업물

```css
color: rgba(0,0,0,0.4);  /* hover: rgba(0,0,0,0.8) */
```

## 절대 하면 안 되는 것

- `#from` 같은 커스텀 ID 사용 금지
- 하단(bottom)에 배치 금지
- 날짜를 FROM 자리에 넣지 말 것
- 링크 없이 FROM 추가 금지
- 요청 없이 FROM 임의 추가 금지
