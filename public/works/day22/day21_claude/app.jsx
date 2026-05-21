// Main app: typewriter animation over the 4-line poem,
// with tweaks panel for speed / scale / paper tone / wobble.

const { useState, useEffect, useRef, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "speed": 380,
  "size": 170,
  "lineGap": 4,
  "wordGap": 0.5,
  "paper": "warm",
  "wobble": "strong",
  "autoLoop": true,
  "loopDelay": 2800,
  "showCaret": false
}/*EDITMODE-END*/;

const PAPER_PRESETS = {
  warm:  { paper: '#f1ece1', paper2: '#ece6d6', ink: '#14110d', mute: '#6b6354' },
  bone:  { paper: '#efe9dd', paper2: '#e6dfce', ink: '#1a1a1a', mute: '#7a7060' },
  cool:  { paper: '#eef0ed', paper2: '#e6e9e3', ink: '#0e1311', mute: '#5e6962' },
  dusk:  { paper: '#1c1a17', paper2: '#23201b', ink: '#f1ece1', mute: '#8a8270' },
};

function flattenPlanIndex(lines) {
  // Returns flat array of {line, col, plan} for non-null syllables, in animation order.
  const out = [];
  lines.forEach((line, li) => {
    line.forEach((plan, ci) => {
      if (plan) out.push({ line: li, col: ci, plan });
    });
  });
  return out;
}

function Poem({ visibleCount, size, lineGap, wordGap, wobble, showCaret, caretOn, t }) {
  // Build a stable order index for each non-null syllable.
  const order = useMemo(() => flattenPlanIndex(TEXT_LINES), []);
  const visibleSet = useMemo(() => {
    const s = new Set();
    for (let i = 0; i < visibleCount; i++) s.add(`${order[i].line}-${order[i].col}`);
    return s;
  }, [visibleCount, order]);

  // Compute jamo delay for the most-recently-shown syllable
  const lastIdx = visibleCount - 1;
  const lastKey = lastIdx >= 0 ? `${order[lastIdx].line}-${order[lastIdx].col}` : null;

  return (
    <div className="poem" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: `${lineGap}px`,
      alignItems: 'center',
    }}>
      {TEXT_LINES.map((line, li) => {
        // current line index = where the latest shown syllable is
        const currentLine = lastIdx >= 0 ? order[lastIdx].line : -1;
        return (
          <div key={li} className="line" style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: `${size * 0.04}px`,
            position: 'relative',
            minHeight: size * 1.05,
          }}>
            {line.map((plan, ci) => {
              if (plan === null) {
                // word break — render as a spacer
                return <div key={ci} style={{ width: size * (wordGap - 0.10), flex: '0 0 auto' }} />;
              }
              const key = `${li}-${ci}`;
              const visible = visibleSet.has(key);
              const isLatest = key === lastKey;
              return (
                <div key={ci} style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(8px)',
                  transition: visible ? 'opacity 240ms ease, transform 320ms cubic-bezier(.2,.7,.3,1)' : 'none',
                  willChange: 'opacity, transform',
                }}>
                  {visible && (
                    <Syllable
                      plan={plan}
                      size={size}
                      wobble={wobble}
                      jamoAnimDelay={isLatest ? 40 : 0}
                      jamoStagger={isLatest ? 90 : 0}
                    />
                  )}
                </div>
              );
            })}
            {/* caret on the current line */}
            {showCaret && currentLine === li && (
              <div className="caret" style={{
                width: 3,
                height: size * 0.7,
                background: 'var(--ink)',
                alignSelf: 'center',
                marginLeft: 6,
                opacity: caretOn ? 1 : 0,
                transition: 'opacity 90ms',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const palette = PAPER_PRESETS[t.paper] || PAPER_PRESETS.warm;

  const totalSyllables = useMemo(() => flattenPlanIndex(TEXT_LINES).length, []);
  const startFull = typeof location !== 'undefined' && location.search.includes('full');
  const [visible, setVisible] = useState(startFull ? totalSyllables : 0);
  const [caretOn, setCaretOn] = useState(true);
  const timerRef = useRef(null);
  const loopRef = useRef(null);

  // Apply paper palette as CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--paper', palette.paper);
    root.style.setProperty('--paper-2', palette.paper2);
    root.style.setProperty('--ink', palette.ink);
    root.style.setProperty('--mute', palette.mute);
  }, [palette]);

  // typewriter timer
  useEffect(() => {
    clearTimeout(timerRef.current);
    clearTimeout(loopRef.current);
    if (visible < totalSyllables) {
      timerRef.current = setTimeout(() => {
        setVisible(v => v + 1);
      }, t.speed);
    } else {
      // finished
      if (t.autoLoop) {
        loopRef.current = setTimeout(() => {
          setVisible(0);
        }, t.loopDelay);
      }
    }
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(loopRef.current);
    };
  }, [visible, t.speed, t.autoLoop, t.loopDelay, totalSyllables]);

  // caret blink
  useEffect(() => {
    const id = setInterval(() => setCaretOn(c => !c), 520);
    return () => clearInterval(id);
  }, []);

  const replay = () => {
    clearTimeout(timerRef.current);
    clearTimeout(loopRef.current);
    setVisible(0);
  };

  // counts for top-right meta
  const progress = Math.min(100, Math.round((visible / totalSyllables) * 100));

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 40px',
      color: 'var(--ink)',
    }}>
      {/* margin annotations */}
      <div className="crosshair">
        <span className="dot"></span>BMB ∙ 조형 활자 № 21
      </div>
      <div className="meta-r">
        <div>낯선 사람들이 / 모이면 …</div>
        <div style={{marginTop:4, opacity:0.7}}>typed {visible.toString().padStart(2,'0')} / {totalSyllables} ∙ {progress}%</div>
      </div>

      {/* subtle index/registration marks at corners */}
      <CornerMarks/>

      <Poem
        visibleCount={visible}
        size={t.size}
        lineGap={t.lineGap}
        wordGap={t.wordGap}
        wobble={t.wobble}
        showCaret={t.showCaret}
        caretOn={caretOn}
      />

      <div className="footer">
        <button className="replay-btn" onClick={replay}>↻ replay</button>
        <div style={{marginTop:14, fontSize:9, letterSpacing:'0.3em'}}>연결 ∙ 연대 ∙ 연속 — connection ∙ solidarity ∙ continuity</div>
      </div>

      <TweaksDrawer t={t} setTweak={setTweak}/>

      <style>{`
        @keyframes jamoIn {
          from { opacity: 0; transform: translateY(6px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function CornerMarks() {
  const mark = (style) => (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{position:'absolute', ...style, color:'var(--mute)'}}>
      <path d="M 0 7 L 14 7 M 7 0 L 7 14" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
  return (
    <>
      {mark({ top: 56, left: 56 })}
      {mark({ top: 56, right: 56 })}
      {mark({ bottom: 56, left: 56 })}
      {mark({ bottom: 56, right: 56 })}
    </>
  );
}

function TweaksDrawer({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Animation">
        <TweakSlider label="Speed (ms / 글자)" min={80} max={700} step={10}
          value={t.speed} onChange={v => setTweak('speed', v)} />
        <TweakToggle label="Auto-loop"
          value={t.autoLoop} onChange={v => setTweak('autoLoop', v)} />
        <TweakSlider label="Loop pause (ms)" min={600} max={6000} step={100}
          value={t.loopDelay} onChange={v => setTweak('loopDelay', v)} />
        <TweakToggle label="Caret"
          value={t.showCaret} onChange={v => setTweak('showCaret', v)} />
      </TweakSection>
      <TweakSection label="Layout">
        <TweakSlider label="글자 size (px)" min={48} max={160} step={2}
          value={t.size} onChange={v => setTweak('size', v)} />
        <TweakSlider label="Line gap (px)" min={4} max={80} step={2}
          value={t.lineGap} onChange={v => setTweak('lineGap', v)} />
        <TweakSlider label="Word gap (×size)" min={0.4} max={2.4} step={0.05}
          value={t.wordGap} onChange={v => setTweak('wordGap', v)} />
      </TweakSection>
      <TweakSection label="Style">
        <TweakRadio label="Paper" options={['warm','bone','cool','dusk']}
          value={t.paper} onChange={v => setTweak('paper', v)} />
        <TweakRadio label="Wobble" options={['off','soft','strong']}
          value={t.wobble} onChange={v => setTweak('wobble', v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
