import { useState } from 'react'
import Day001 from './works/day1'
import Day002 from './works/day2'
import Day003 from './works/day3'
import Day004 from './works/day4'
import Day005 from './works/day5'
import Day006 from './works/day6'
import Day007 from './works/day7'
import Day008 from './works/day8'

type View = 'home' | string

const WORKS = [
  {
    id: 'day1',
    day: '1',
    date: '2026.04.16',
    title: '내가 바흐라니',
    desc: '오르골이 레버를 돌려 핀 접촉 소리를 내는 것처럼, 타이핑이 오르골 연주가 되는 인터랙티브 타이포그래피.',
    tags: ['Interactive', 'typing', 'GSAP'],
    ratio: '4 / 3',
    bgTheme: 'light' as const,
  },
  {
    id: 'day2',
    day: '2',
    date: '2026.04.17',
    title: '로봇개가 개를 산책시켜..',
    desc: 'Quick Draw 데이터셋의 핸드드로잉 개와 삐그덕거리는 로봇 텍스트가 목줄로 연결된 모션 타이포그래피.',
    tags: ['GSAP', 'Quick Draw', 'Canvas'],
    ratio: '8 / 3',
    bgTheme: 'dark' as const,
  },
  {
    id: 'day3',
    day: '3',
    date: '2026.04.20',
    title: '연애 상대를 찾으러 왜 대형 서점에 갔을까?',
    desc: '3D 회전 책장에서 책을 고르면 플러팅 문구가 뜨는 인터랙티브 타이포그래피.',
    tags: ['CSS 3D', 'Interactive', 'Typography'],
    ratio: '4 / 3',
    bgTheme: 'light' as const,
  },
  {
    id: 'day4',
    day: '4',
    date: '2026.04.21',
    title: '불황 속의 웨이팅?',
    desc: '텍스트로 만든 인간 조형물이 줄 서서 웨이팅하다 입장하는 모션 타이포그래피.',
    tags: ['Canvas', 'Motion', 'Typography'],
    ratio: '4 / 3',
    bgTheme: 'dark' as const,
  },
  {
    id: 'day5',
    day: '5',
    date: '2026.04.22',
    title: "'No pain'",
    desc: '실리카겔의 사운드 파형을 레터링 획으로 변환한 타이포그래피.',
    tags: ['Web Audio', 'Canvas', 'Waveform'],
    ratio: '4 / 3',
    bgTheme: 'light' as const,
  },
  {
    id: 'day6',
    day: '6',
    date: '2026.04.23',
    title: '절약도 공감도 함께',
    desc: '타이틀이 분해되어 동전으로 변하고, 어울리는 모습으로 "함께"를 시각화한 타이포그래피.',
    tags: ['Canvas', 'Pixel', 'Morphing'],
    ratio: '4 / 3',
    bgTheme: 'dark' as const,
  },
  {
    id: 'day7',
    day: '7',
    date: '2026.04.24',
    title: '종교에서의 AI',
    desc: 'AI 부처와 예수를 클릭하면 경전을 낭독하는 인터랙티브 타이포그래피.',
    tags: ['Three.js', 'Glitch', 'Audio'],
    ratio: '4 / 3',
    bgTheme: 'dark' as const,
  },
  {
    id: 'day8',
    day: '8',
    date: '2026.04.27',
    title: '소문의 낙원',
    desc: '악동뮤지션 뮤비 위로 덩굴처럼 피어나는 한 붓 그리기 레터링.',
    tags: ['SVG', 'Lettering'],
    ratio: '4 / 3',
    bgTheme: 'dark' as const,
  },
]

export default function App() {
  // URL hash로 현재 뷰 유지 (새로고침해도 유지)
  const getViewFromHash = (): View => {
    const hash = window.location.hash.replace('#', '')
    return hash || 'home'
  }
  const [view, setView] = useState<View>(getViewFromHash)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // view 바뀌면 URL hash 업데이트
  const changeView = (v: View) => {
    setView(v)
    window.location.hash = v === 'home' ? '' : v
    if (v === 'home') history.replaceState(null, '', window.location.pathname)
  }

  // 브라우저 뒤로가기 지원
  useState(() => {
    const onHashChange = () => setView(getViewFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  })

  // ─── Day 상세 뷰 ───
  if (view !== 'home') {
    const work = WORKS.find(w => w.id === view)
    const isLight = work?.bgTheme === 'light'

    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* 블랙/화이트 헤더 — bgTheme에 따라 전환 */}
        <header style={{
          display: 'flex', alignItems: 'center',
          padding: '14px 28px',
          background: isLight ? '#111' : '#fff',
          flexShrink: 0,
        }}>
          <button onClick={() => changeView('home')} style={{
            color: isLight ? '#fff' : '#111',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: 0,
          }}>
            <span style={{ fontFamily: '"Pretendard", sans-serif', fontWeight: 400, fontSize: 28, lineHeight: 1 }}>←</span>
            <span style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 400, fontSize: 28, lineHeight: 1 }}>Back</span>
          </button>
        </header>
        <main style={{ flex: 1, overflow: 'hidden' }}>
          {view === 'day1' && <Day001 />}
          {view === 'day2' && <Day002 />}
          {view === 'day3' && <Day003 />}
          {view === 'day4' && <Day004 />}
          {view === 'day5' && <Day005 />}
          {view === 'day6' && <Day006 />}
          {view === 'day7' && <Day007 />}
          {view === 'day8' && <Day008 />}
        </main>
      </div>
    )
  }

  // ─── 홈 — 헤더 + 네비 + 메이슨리 그리드 ───
  const GRID_GAP = '16px'

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: '"Pretendard", sans-serif',
      color: '#111',
      boxSizing: 'border-box',
    }}>
      {/* ─── 최상단 헤더: TYPO vibe ─── */}
      <header style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '40px 80px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: '1440px' }}>
          <h1
            onClick={() => changeView('home')}
            style={{
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              fontSize: '84px',
              fontWeight: 800,
              margin: 0,
              letterSpacing: '0em',
              lineHeight: 0.85,
              whiteSpace: 'nowrap',
              color: '#111',
              WebkitTextStroke: '1.5px #111',
              cursor: 'pointer',
              transform: 'translateX(-4px)',
            }}
          >
            TYPO vibe
          </h1>
        </div>
      </header>

      {/* ─── 본문: 네비 + 썸네일 ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '0 80px',
      }}>
        <div style={{
          display: 'flex',
          width: '100%',
          maxWidth: '1440px',
        }}>
          {/* ─── 좌측 네비게이션 ─── */}
          <nav style={{
            width: '340px',
            height: 'calc(100vh - 140px)',
            position: 'sticky',
            top: 20,
            paddingTop: '80px',
            flexShrink: 0,
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}>
            {/* 네비 목록 — 클릭 시 해당 위치로 스크롤 */}
            <ul style={{
              listStyle: 'none', padding: 0, margin: 0,
              display: 'flex', flexDirection: 'column', gap: '18px',
            }}>
              {WORKS.map(item => (
                <li
                  key={`nav-${item.id}`}
                  onClick={() => {
                    const el = document.getElementById(`thumb-${item.id}`)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    color: '#111',
                    cursor: 'pointer',
                    transition: 'font-weight 0.2s',
                    wordBreak: 'keep-all',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.fontWeight = '700'; }}
                  onMouseLeave={e => { e.currentTarget.style.fontWeight = '400'; }}
                >
                  {item.title}
                </li>
            ))}
          </ul>
        </nav>

        {/* ─── 우측 썸네일 그리드 ─── */}
        <main style={{
          flexGrow: 1,
          paddingTop: '80px',
          paddingBottom: '160px',
          paddingLeft: '60px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: GRID_GAP,
          }}>
            {(() => {
              const ordered = [...WORKS].reverse()
              // 그리드에서 차지하는 총 칸 수 계산 (span 2 포함)
              const totalCells = ordered.reduce((n, w) => n + (w.id === 'day2' ? 2 : 1), 0)
              const cols = 3
              const rem = totalCells % cols
              const leadingEmpty = rem === 0 ? 0 : cols - rem
              // 빈칸을 맨 앞에 삽입하면 가장 최근 작업(day7) 왼쪽이 비게 됨
              const items: (typeof WORKS[0] | null)[] = [
                ...Array(leadingEmpty).fill(null),
                ...ordered,
              ]
              return items.map((work, idx) => {
                if (!work) {
                  return <div key={`empty-${idx}`} style={{ gridColumn: 'span 1' }} />
                }
                const isWide = work.id === 'day2';
                return (
              <article
                id={`thumb-${work.id}`}
                key={work.id}
                style={{
                  cursor: 'pointer',
                  gridColumn: isWide ? 'span 2' : 'span 1',
                }}
              >
                <div
                  onClick={() => changeView(work.id)}
                  onMouseEnter={() => setHoveredId(work.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    width: '100%',
                    aspectRatio: work.ratio,
                    overflow: 'hidden',
                    position: 'relative',
                    border: hoveredId === work.id ? '3px solid #111' : '3px solid transparent',
                    transition: 'border-color 0.3s',
                    cursor: 'pointer',
                    background: '#fff',
                  }}
                >
                  {/* 라이브 iframe 프리뷰 */}
                  <iframe
                    src={`${import.meta.env.BASE_URL}works/${work.id}/index.html?thumb`}
                    loading="lazy"
                    style={{
                      width: '200%', height: '200%',
                      transform: 'scale(0.5)', transformOrigin: 'top left',
                      border: 'none', pointerEvents: 'none',
                    }}
                    tabIndex={-1}
                    title={work.title}
                  />

                  {/* 호버 오버레이 — 합의된 텍스트 규칙 */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(255,255,255,0.92)',
                    opacity: hoveredId === work.id ? 1 : 0,
                    transition: 'opacity 0.2s ease-in-out',
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'flex-start',
                    padding: '28px',
                  }}>
                   <div style={{ transform: 'scale(0.88)', transformOrigin: 'top left', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Day N | YYMMDD — 14px / 700 / #111 / mb 10px */}
                    <div style={{
                      fontSize: 16, color: '#111', marginBottom: 10,
                      fontFamily: '"Pretendard", sans-serif', fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span>Day {work.day}</span>
                      <span style={{
                        display: 'inline-block', width: '1.5px', height: '11px',
                        background: '#111',
                      }} />
                      <span>{work.date.replace(/\./g, '').slice(2)}</span>
                    </div>

                    {/* 타이틀 — 30px / 800 / #111 / mb 8px */}
                    <div style={{
                      fontSize: 30, fontWeight: 800, lineHeight: 1.2,
                      fontFamily: '"Pretendard", sans-serif', color: '#111',
                      marginBottom: 8, wordBreak: 'keep-all',
                    }}>
                      {work.title}
                    </div>

                    {/* 설명 — 16px / 700 / #111 / mb 14px */}
                    <div style={{
                      fontSize: 18, color: '#111', lineHeight: 1.5,
                      fontFamily: '"Pretendard", sans-serif', fontWeight: 700,
                      marginBottom: 14, whiteSpace: 'pre-line',
                      wordBreak: 'keep-all',
                    }}>
                      {work.desc}
                    </div>

                    {/* 태그 — 13px / 600 / border 1.5px #111 / radius 0 */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {work.tags.slice(0, 4).map(tag => (
                        <span key={tag} style={{
                          fontSize: 15, padding: '3px 6px',
                          border: '1.5px solid #111', borderRadius: 0,
                          color: '#111', fontFamily: '"Pretendard", sans-serif', fontWeight: 600,
                        }}>{tag}</span>
                      ))}
                    </div>
                   </div>
                  </div>
                </div>
              </article>
              )
            })
            })()}
          </div>
        </main>
        </div>
      </div>
    </div>
  )
}
