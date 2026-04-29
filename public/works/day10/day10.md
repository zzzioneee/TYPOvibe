# Day 10 — 파편이 맥락이 될 때

**2026.04.29 (수요일)**

FROM · [비애티튜드 『파편이 맥락이 될 때』](https://magazine.beattitude.kr/visual-portfolio/younsikkim/)

## 출발

조각가 김윤식 작가의 전시 칼럼. "모든 것이 0g의 디지털로 가볍게 휘발되는 시대, 묵직한 물질의 무게는 어떻게 지켜지는가."

작가의 주장은 두 단계로 나뉨:
1. **디지털의 허상 폭로** — 스마트폰의 매끄러움과 0g의 데이터는 사실 서버·케이블·하드웨어라는 무거운 물질적 덩어리 위에 얹혀있다
2. **물질성의 수호** — 그러니 데이터로 치환될 수 없는 진짜 물질의 묵직한 부피감, 차가운 촉각, 공간을 차지하는 신체를 끝까지 붙잡아야 한다

이 2단계 논리를 웹에서 인터랙션으로 풀어내고 싶었음.

## 3막 구조

- **1막 — FEED**: SNS 피드처럼 세로 스크롤되는 조각 10점. 무한 루프. 작가·작품·재질·무게가 냉정한 미술관 도록 스타일로 표시됨. 디지털 태그 `0g · DIGITAL` 이 우상단에 박혀있어 "이 묵직한 청동/대리석이 화면 안에서는 0g으로 소비됨" 대비 환기
- **2막 — DIGITIZING → DISSOLVING**: 카드를 누르면 풀스크린으로 조각 확대. 1.2초 정적 → 2.5초간 CAD 스캔라인 + 하늘색 와이어프레임 격자가 덮임 → 핑크 네온 점멸 → 수백 개의 이미지 파편으로 분해, 중력 받아 화면 밖으로 떨어져 나감. 무게는 실시간으로 줄어듦
- **3막 — HOLDING**: DISSOLVING 중에 화면을 꾹 누르면 파편들이 중심으로 당겨져 원본 이미지 복원. 손을 떼면 다시 분해. 무게 카운터가 누르는 동안 회복 ↔ 떼는 순간 감소

## 10점 큐레이션

저작권으로 자유롭게 쓸 수 있는 public domain 조각만 모음. 현대 조각가(Serra, Giacometti, Noguchi, Whiteread, Salcedo, Kiefer, Fischer, Laib, McCall)는 전부 PD 불가라 초기 라인업에서 포기. 대신 **"묵직한 재질과 거대한 물성"** 을 보여주는 고전 조각으로 재구성. 디지털 대비감은 오히려 더 살아남.

| # | 작가 | 작품 | 재질 | 무게 |
|---|---|---|---|---|
| 01 | Rodin | Burghers of Calais (1889) | Bronze | 2,200kg |
| 02 | Rodin | The Thinker (c.1880) | Bronze | 700kg |
| 03 | Bernini | David (1623–24) | Carrara Marble | 800kg |
| 04 | Hellenistic | Venus de Milo (c.130 BC) | Parian Marble | 900kg |
| 05 | Hellenistic | Winged Victory of Samothrace (c.190 BC) | Parian Marble | 2,800kg |
| 06 | Michelangelo | Pietà (1498–99) | Carrara Marble | 2,000kg |
| 07 | Rapa Nui | Hoa Hakananai'a (c.1200) | Basalt | 4,200kg |
| 08 | Ancient Egypt | Colossi of Memnon (c.1350 BC) | Quartzite | 720 톤 |
| 09 | Ancient Egypt | Great Sphinx of Giza (c.2500 BC) | Limestone | 20,000 톤 |
| 10 | Hellenistic | Laocoön and His Sons | Marble | 800kg |

**수집 출처**: Wikimedia Commons (PD-old, PD-old-100, CC-BY-SA 3.0)

## 기술

- **Vanilla JS + Canvas 2D** — Three.js 없이 실제 이미지 픽셀을 격자로 자른 파편 운동
- **이미지 파편화**: `drawImage` 의 source crop(sx, sy, sw, sh) 으로 원본 이미지를 셀(28px × 28px)로 나눠 각각 개별 particle 운동. 원점(ox, oy) 기억해두고 HOLDING 때 lerp으로 당김
- **상태머신**: `ENTERED → DIGITIZING → DISSOLVING ⇄ HOLDING ⇄ GONE`
- **무한 스크롤 피드**: 10개 × 3번 반복 복제, `scroll` 이벤트로 상/하단 경계 오면 가운데로 점프. lockScroll 플래그로 재귀 방지
- **썸네일 차단**: `?thumb` 쿼리로 홈 iframe 프리뷰 감지 → 스테이지 진입 막고 피드만 정적 표시

## 삽질 / 교훈

### 이미지 수집: Wikimedia 저작권 벽이 생각보다 큼
초기 라인업으로 Serra, Giacometti, Noguchi, Kiefer 같은 현대 조각가를 골랐는데 **생존 또는 최근 사망 작가 전원이 저작권 살아있음**. 조사에 꽤 시간 썼는데 결국 확보 가능한 건 2점 정도. 그래서 방향 전환 → PD 확실한 고대/근대 조각으로 재큐레이션. 결과적으로 "지금 컨템포러리 조각이 0g으로 소비됨" 보다 "시간을 견뎌온 무거운 물질이 한 화면 스와이프로 휘발됨" 이 되어서 메시지 톤은 오히려 살아남. 현대 → 고대로 후퇴한 게 아니라, 대비 각도가 바뀐 것뿐.

### Wikimedia 이미지 URL: 파일명 MD5 해시 패턴
`https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[0..1]}/{filename}` 규칙. 파일명의 MD5 첫 두 자리가 디렉토리. 파이썬 한 줄로 계산:
```python
hashlib.md5(name.encode()).hexdigest()[:2]
```

### Rate limit 429
`curl` 연타로 10장 받으면 HTTP 429 걸림. `sleep 3` 간격 두고 순차 다운. User-Agent 도 브라우저 흉내.

### sips 로 일괄 리사이즈
macOS 내장 `sips --resampleHeightWidthMax 1600 -s formatOptions 85` 로 10장 합계 43MB → 5MB. 편함.

### 파편화 파티클 개수 vs 성능
이미지를 28px × 28px 셀로 나누면 대략 400~700개 파편. drawImage를 400번 호출해도 60fps 유지됨 (Canvas 2D 생각보다 잘 버팀). 단 파편마다 `save/rotate/restore` 넣으면 개수 많을 때 체감됨. 지금은 28px 사이즈로 적당한 타협.

### 무한 스크롤 경계 재귀 방지
`scroll` 이벤트에서 `scrollTop` 를 수정하면 또 `scroll` 이벤트가 발생. `lockScroll` 플래그로 한 프레임 막아서 재귀 차단. `requestAnimationFrame` 안에서 해제.

## 다음에 다시 한다면

- **2막 전환을 더 드라마틱하게**: 지금은 스캔라인 + 격자 + 점멸인데, 글리치/RGB split/ chromatic aberration 넣으면 "디지털화 당하는" 느낌 더 강해질 것
- **파편 모양**: 격자 셀이 아니라 Voronoi 셀로 자르면 깨진 유리/세라믹 느낌 더 살아남. 지금은 "픽셀 블록 파편" 이라 약간 게임 이펙트스러움
- **사운드**: 입체감 없음. Day 9 Web Audio 패턴 참고해서, 디지털화될 때 글리치 노이즈, 분해될 때 세라믹 깨지는 소리 (noise burst + downward sweep), 복원될 때 유리가 맞춰지는 벨 같은 소리 넣으면 인상 남을 듯
- **첫 진입 튜토리얼**: 처음 들어온 사용자는 "꾹 누르라는 게 뭐 어디를 누르라는 거지?" 할 수 있음. 첫 방문 때 카드 위에 짧은 툴팁 또는 스테이지 진입 직후 "여기를 누르세요" 안내 표시 필요
- **마우스 커서 무게 반영**: HOLDING 중에 커서 주변에 파편이 더 빨리 당겨지게 (현재는 중심 원점으로만 lerp). "손이 닿는 곳부터 복구됨" 느낌
