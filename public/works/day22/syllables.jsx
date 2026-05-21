// Composes Korean syllables (글자) by placing jamo SVGs in standard Hangul layout.
// Layout types:
//   V   = vertical-vowel, no batchim  (사 가 어 이 …)  → 초성 | 중성
//   H   = horizontal-vowel, no batchim (모 로 요 …)    → 초성 / 중성
//   VB  = vertical-vowel + batchim    (낯 선 람 면 …) → [초성|중성] / 종성
//   HB  = horizontal-vowel + batchim  (들 순)         → 초성 / 중성 / 종성
//   DAE = special compound for 돼     → ㄷ | (ㅗ / ㅐ)

// Each entry: {type, ch, jung, jong?} — jung may be an array for compound vowels.
// Positions are {x,y,w,h} in percentages of the syllable box.

// Boxes are intentionally OVERSIZED — each jamo overlaps its neighbours so each
// reads as its own illustration rather than a tight glyph compartment.
const SYLLABLE_LAYOUTS = {
  V: {
    type: 'V',
    boxes: (ch, jung) => [
      { name: ch,   x: -12, y: -6, w: 72, h: 106 },
      { name: jung, x:  40, y: -6, w: 72, h: 106 },
    ],
  },
  H: {
    type: 'H',
    boxes: (ch, jung) => [
      { name: ch,   x:   4, y: -10, w: 92, h: 64 },
      { name: jung, x:  -8, y:  44, w: 116, h: 62 },
    ],
  },
  VB: {
    type: 'VB',
    boxes: (ch, jung, jong) => [
      { name: ch,   x: -10, y: -8, w: 64, h: 78 },
      { name: jung, x:  40, y: -8, w: 70, h: 78 },
      { name: jong, x:  -4, y: 48, w: 108, h: 56 },
    ],
  },
  HB: {
    type: 'HB',
    boxes: (ch, jung, jong) => [
      { name: ch,   x:  10, y: -10, w: 80, h: 50 },
      { name: jung, x: -10, y:  28, w: 120, h: 46 },
      { name: jong, x:   4, y:  62, w: 92, h: 46 },
    ],
  },
};

// Per-syllable plan for our text.
// Each entry: [type, ch, jung, jong?]  OR  ['custom', renderFn]
const TEXT_LINES = [
  // Line 1: 낯선 사람들이
  [
    ['VB','ㄴ','ㅏ','ㅊ'],   // 낯
    ['VB','ㅅ','ㅓ','ㄴ'],   // 선
    null,                    // space
    ['V', 'ㅅ','ㅏ'],         // 사
    ['VB','ㄹ','ㅏ','ㅁ'],   // 람
    ['HB','ㄷ','ㅡ','ㄹ'],   // 들
    ['V', 'ㅇ','ㅣ'],         // 이
  ],
  // Line 2: 모이면
  [
    ['H', 'ㅁ','ㅗ'],         // 모
    ['V', 'ㅇ','ㅣ'],         // 이
    ['VB','ㅁ','ㅕ','ㄴ'],   // 면
  ],
  // Line 3: 어느 순간
  [
    ['V', 'ㅇ','ㅓ'],         // 어
    ['H', 'ㄴ','ㅡ'],         // 느
    null,
    ['HB','ㅅ','ㅜ','ㄴ'],   // 순
    ['VB','ㄱ','ㅏ','ㄴ'],   // 간
  ],
  // Line 4: 서로가 답이 돼요
  [
    ['V', 'ㅅ','ㅓ'],         // 서
    ['H', 'ㄹ','ㅗ'],         // 로
    ['V', 'ㄱ','ㅏ'],         // 가
    null,
    ['VB','ㄷ','ㅏ','ㅂ'],   // 답
    ['V', 'ㅇ','ㅣ'],         // 이
    null,
    ['DOE'],                  // 돼 (커스텀: ㄷ+ㅗ+ㅐ)
    ['H', 'ㅇ','ㅛ'],         // 요
  ],
];

// Custom layout for 돼: ㄷ on left, then ㅗ stacked over ㅐ on right
// Custom layout for 돼 — horizontal arrangement ㄷ | ㅗ(small) | ㅐ
// to read as ㄷ + ㅙ rather than ㄷ + ㅐ stacked with ㅗ above.
function renderDae(boxSize) {
  return [
    { name: 'ㄷ', x: -14, y:  -6, w: 52, h: 110 },
    { name: 'ㅗ', x:  30, y:  10, w: 40, h: 86 },
    { name: 'ㅐ', x:  62, y:  -6, w: 52, h: 110 },
  ];
}

function Syllable({ plan, size, wobble, jamoAnimDelay = 0, jamoStagger = 60 }) {
  let boxes;
  if (plan[0] === 'DOE') {
    // 돼: ㄷ(좌상) + ㅗ(하단 가로) + ㅐ(우측 세로)
    boxes = [
      { name: 'ㄷ', x: -6, y: -10, w: 62, h: 60 },
      { name: 'ㅗ', x: -10, y: 40, w: 70, h: 58 },
      { name: 'ㅐ', x: 48, y: -6, w: 56, h: 108 },
    ];
  } else {
    const [type, ch, jung, jong] = plan;
    boxes = SYLLABLE_LAYOUTS[type].boxes(ch, jung, jong);
  }
  return (
    <div className="syllable" style={{
      position: 'relative',
      width: size,
      height: size * 1.05,
      flex: '0 0 auto',
    }}>
      {boxes.map((b, i) => (
        <div key={i} className="jamo" style={{
          position: 'absolute',
          left: `${b.x}%`,
          top: `${b.y}%`,
          width: `${b.w}%`,
          height: `${b.h}%`,
          animation: `jamoIn 420ms ${jamoAnimDelay + i * jamoStagger}ms cubic-bezier(.2,.7,.3,1) both`,
        }}>
          <JamoSVG name={b.name} wobble={wobble} />
        </div>
      ))}
    </div>
  );
}

window.Syllable = Syllable;
window.TEXT_LINES = TEXT_LINES;
