# Day 13 — Nugget Dino Walker

## 개요
Three.js로 만든 너겟 공룡 인터랙티브 씬.
슬라이더 3개(Speed / Dance / Roar)로 공룡의 움직임을 실시간 조절.
마우스 드래그로 카메라 회전(OrbitControls).

## 기술 스택
- Three.js (CDN, importmap)
- RoundedBoxGeometry, ExtrudeGeometry
- OrbitControls

## 파일 구조
```
day13/
├── index.html   # 슬라이더 UI + importmap
└── main.js      # 씬, 공룡 클래스, 애니메이션 루프
```

## 공룡 구조 (NuggetDino)
- **몸통**: RoundedBoxGeometry 너겟 2개 (앞/뒤) + 저주파 노이즈로 울퉁불퉁한 튀김옷 표현
- **머리**: quadraticCurveTo로 둥글린 오각형 (ExtrudeGeometry) — 주둥이가 앞으로 튀어나온 너겟
- **목**: BoxGeometry 감자튀김
- **등 뿔**: 8개 감자튀김, 아치형 배치
- **꼬리**: 감자튀김 2개, `<` 모양
- **다리**: 4개, RoundedBoxGeometry, 대각선 교대 보행

## 슬라이더
| 슬라이더 | 기본값 | 동작 |
|---------|--------|------|
| Speed | 25 | 걷기 애니메이션 속도 |
| Dance | 0 | 몸통 바운스 + 엉덩이 흔들기 + 다리 무릎 들기 |
| Roar | 0 | 뒷발 피벗으로 몸통 세우기 + 앞발 위로 뻗기 + 머리 들기 |

## 주요 구현 포인트
- **Dance**: `danceT` 별도 타이머, 슬라이더 값에 비례해 주파수/진폭 증가
- **Roar**: `bodyGrp.rotation.z`로 몸통 세우기, `backFootMarker.getWorldPosition()`으로 뒷발 지면 보정
- **너겟 질감**: 저주파(1.6~2.1) 큰 진폭 노이즈 + 중간/고주파 레이어, `roughness 0.55 / metalness 0.08`로 기름기 광택
- **OrbitControls**: 마우스 드래그 회전, 스크롤 줌, `enableDamping`으로 관성

## 삽질 기록
- `ExtrudeGeometry` bevel은 앞뒤 면만 둥글림 → 옆면 모서리는 `quadraticCurveTo`로 Shape 자체를 둥글려야 함
- `tailGrp.rotation.z` 주면 꼬리가 분리됨 → `tailGrp`이 `(0,0,0)` 기준 회전이라 위치가 틀어짐
- Roar 뒷발 지면 보정: 수식보다 `getWorldPosition()` 직접 읽기가 신뢰성 높음
