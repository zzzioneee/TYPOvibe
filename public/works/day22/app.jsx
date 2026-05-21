// Main app: typewriter animation over the 4-line poem,
// with tweaks panel for speed / scale / paper tone / wobble.

const { useState, useEffect, useRef, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "speed": 380,
  "size": 130,
  "lineGap": 28,
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
                  transform: 'translateY(0)',
                  willChange: 'opacity',
                }}>
                  {visible && (
                    <Syllable
                      plan={plan}
                      size={size}
                      wobble={wobble}
                      jamoAnimDelay={0}
                      jamoStagger={0}
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

  // Apply fixed dark-bg palette — ignore presets
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--paper', '#111');
    root.style.setProperty('--paper-2', '#1a1a1a');
    root.style.setProperty('--ink', '#ffffff');
    root.style.setProperty('--mute', 'rgba(255,255,255,0.5)');
  }, []);

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
      <Poem
        visibleCount={visible}
        size={t.size}
        lineGap={t.lineGap}
        wordGap={t.wordGap}
        wobble={t.wobble}
        showCaret={t.showCaret}
        caretOn={caretOn}
      />

      <style>{`
        @keyframes jamoIn {
          from { transform: scale(0.94); }
          to   { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
