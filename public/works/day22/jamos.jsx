// 조형 활자 — each jamo keeps its STRUCTURAL skeleton (ㄱ의 꺾임, ㅏ의 가로획,
// ㅗ의 가로+세로 등) but is illustrated as a recognisable object.
// Mixed styles: SOLID silhouette · LINE drawing · OUTLINE + filled detail.

const ink = 'currentColor';
const LINE = (w = 5) => ({
  fill: 'none',
  stroke: ink,
  strokeWidth: w,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

const Jamos = {
  // ── 자음 ───────────────────────────────────────────────────────────────

  // ㄱ — 꺾이며 떨어지는 덩굴이 (twisting vine: horizontal then drops, with curls + leaves)
  'ㄱ': (
    <g>
      {/* main thick vine line: horizontal then curving down */}
      <path {...LINE(7)} d="
        M 6 26
        Q 24 14, 50 16
        Q 72 18, 82 26
        Q 84 36, 80 50
        Q 76 70, 72 88"/>
      {/* curl at start (left) */}
      <path {...LINE(4)} d="M 8 22 Q 2 18, 4 12 Q 8 8, 12 14"/>
      {/* curl at end (bottom-right) */}
      <path {...LINE(4)} d="M 72 86 Q 76 94, 70 96 Q 64 96, 64 88"/>
      {/* small leaves dotted along */}
      <ellipse cx="30" cy="14" rx="5" ry="2.6" transform="rotate(-20 30 14)" fill={ink}/>
      <ellipse cx="58" cy="14" rx="5" ry="2.6" transform="rotate(15 58 14)" fill={ink}/>
      <ellipse cx="86" cy="38" rx="4.5" ry="2.4" transform="rotate(60 86 38)" fill={ink}/>
      <ellipse cx="84" cy="60" rx="4.5" ry="2.4" transform="rotate(70 84 60)" fill={ink}/>
      {/* a small twist mid-stem */}
      <path {...LINE(3)} d="M 80 42 Q 88 44, 86 50 Q 80 52, 80 46"/>
    </g>
  ),

  // ㄴ — L자로 휘어진 덩굴 뿌리 (twisting vine root, curls + leaves)
  'ㄴ': (
    <g>
      {/* main thick vine: vertical drop then horizontal sweep */}
      <path {...LINE(7)} d="
        M 18 6
        Q 16 30, 18 52
        Q 22 66, 36 68
        Q 60 70, 88 64"/>
      {/* starting tendril curl at the top */}
      <path {...LINE(4)} d="M 18 10 Q 12 4, 10 10 Q 12 16, 18 14"/>
      {/* end curl at the right */}
      <path {...LINE(4)} d="M 86 62 Q 96 60, 94 68 Q 88 72, 84 68"/>
      {/* mid-stem knot */}
      <path {...LINE(3)} d="M 18 36 Q 26 38, 24 44 Q 16 44, 18 38"/>
      {/* tendril sprouts (small leaves) */}
      <ellipse cx="22" cy="20" rx="4" ry="2.4" transform="rotate(70 22 20)" fill={ink}/>
      <ellipse cx="22" cy="58" rx="4" ry="2.4" transform="rotate(-70 22 58)" fill={ink}/>
      <ellipse cx="42" cy="72" rx="4.5" ry="2.4" transform="rotate(15 42 72)" fill={ink}/>
      <ellipse cx="68" cy="72" rx="4.5" ry="2.4" transform="rotate(-5 68 72)" fill={ink}/>
      {/* root hairs at bottom */}
      <g {...LINE(2)}>
        <path d="M 36 68 L 32 78"/>
        <path d="M 50 68 L 48 80"/>
        <path d="M 64 66 L 66 80"/>
      </g>
    </g>
  ),

  // ㄷ — 사람 옆얼굴 (line outline, opens to the right — like ㄷ does)
  'ㄷ': (
    <g>
      {/* top stroke */}
      <path {...LINE(6)} d="M 16 14 Q 50 8 84 14"/>
      {/* left stroke — back of head */}
      <path {...LINE(6)} d="M 18 16 Q 14 50 18 84"/>
      {/* bottom stroke — chin */}
      <path {...LINE(6)} d="M 16 84 Q 50 92 84 84"/>
      {/* face features inside */}
      <ellipse cx="64" cy="38" rx="3" ry="4.5" fill={ink}/>
      <path {...LINE(3)} d="M 58 28 Q 64 26 70 28"/>
      <path {...LINE(3)} d="M 76 42 Q 78 50 72 52"/>
      <path {...LINE(3)} d="M 54 60 Q 64 64 70 60"/>
    </g>
  ),

  // ㄹ — 꼬인 덩굴 chain (twisting vine knots stacked in ㄹ's zigzag)
  'ㄹ': (
    <g>
      {/* main ㄹ-shape thick stroke */}
      <path {...LINE(6)} d="
        M 6 14
        Q 50 8, 92 14
        Q 90 26, 50 28
        Q 12 30, 14 42
        Q 50 48, 88 42
        Q 92 56, 50 60
        Q 8 62, 6 84"/>
      {/* twist curls along the path */}
      <path {...LINE(2.5)} d="M 28 14 Q 36 8, 32 4 Q 24 8, 28 14"/>
      <path {...LINE(2.5)} d="M 70 26 Q 78 20, 74 16 Q 66 20, 70 26"/>
      <path {...LINE(2.5)} d="M 32 44 Q 24 38, 28 32 Q 36 36, 32 44"/>
      <path {...LINE(2.5)} d="M 70 58 Q 78 52, 74 48 Q 66 52, 70 58"/>
      {/* tendril sprouts (small leaves) */}
      <ellipse cx="14" cy="22" rx="4" ry="2.2" transform="rotate(-60 14 22)" fill={ink}/>
      <ellipse cx="86" cy="34" rx="4" ry="2.2" transform="rotate(60 86 34)" fill={ink}/>
      <ellipse cx="14" cy="50" rx="4" ry="2.2" transform="rotate(-60 14 50)" fill={ink}/>
      <ellipse cx="86" cy="64" rx="4" ry="2.2" transform="rotate(60 86 64)" fill={ink}/>
      {/* small root hairs at bottom */}
      <g {...LINE(2)}>
        <path d="M 12 84 L 8 94"/>
        <path d="M 24 84 L 22 94"/>
        <path d="M 38 84 L 38 94"/>
      </g>
      {/* base ground bar */}
      <path {...LINE(5)} d="M 2 86 Q 30 82, 60 84"/>
    </g>
  ),

  // ㅁ — SOLID 네모난 돌/항아리 (square stone keeping ㅁ's box silhouette)
  'ㅁ': (
    <g>
      <path fill={ink} d="
        M 14 18
        C 14 14, 18 12, 24 12
        L 78 14
        C 86 14, 88 18, 88 24
        L 88 78
        C 88 84, 84 88, 78 88
        L 22 88
        C 16 88, 12 84, 12 78
        L 14 22
        Z"/>
      {/* texture cracks — line work in paper colour */}
      <g {...LINE(1.6)} stroke="var(--paper)">
        <path d="M 26 26 L 38 34"/>
        <path d="M 62 60 L 74 50"/>
        <path d="M 30 70 Q 38 76 50 74"/>
      </g>
    </g>
  ),

  // ㅂ — 화분 + 두 줄기: keeps the ㅂ two-prong skeleton
  'ㅂ': (
    <g>
      {/* two upward prongs — solid */}
      <path fill={ink} d="
        M 24 6
        C 22 26, 24 44, 26 52
        L 36 52
        C 36 40, 36 24, 34 6
        C 32 2, 26 2, 24 6 Z"/>
      <path fill={ink} d="
        M 66 6
        C 64 24, 64 40, 64 52
        L 74 52
        C 76 44, 78 26, 76 6
        C 74 2, 68 2, 66 6 Z"/>
      {/* pot — solid trapezoidal block */}
      <path fill={ink} d="
        M 14 52
        L 86 52
        L 80 92
        C 78 96, 22 96, 20 92
        L 14 52 Z"/>
      {/* horizontal middle bar — ㅂ's defining feature */}
      <path fill="var(--paper)" d="M 22 68 L 78 68 L 78 74 L 22 74 Z"/>
      {/* small leaf accents on top of each prong — line drawing */}
      <path {...LINE(3)} d="M 26 6 Q 18 0 14 -2"/>
      <path {...LINE(3)} d="M 74 6 Q 82 0 86 -2"/>
    </g>
  ),

  // ㅅ — 두 줄기가 위에서 만나는 작은 나무 (preserves the V apex of ㅅ)
  'ㅅ': (
    <g>
      {/* tiny apex bud */}
      <circle cx="50" cy="6" r="3.5" fill={ink}/>
      {/* two diverging trunks — line drawing */}
      <g {...LINE(5)}>
        <path d="M 50 8 Q 36 30 14 86"/>
        <path d="M 50 8 Q 64 30 86 86"/>
      </g>
      {/* small branches */}
      <g {...LINE(2.5)}>
        <path d="M 32 38 L 22 36"/>
        <path d="M 32 38 L 24 44"/>
        <path d="M 24 62 L 14 60"/>
        <path d="M 24 62 L 16 68"/>
        <path d="M 68 38 L 78 36"/>
        <path d="M 68 38 L 76 44"/>
        <path d="M 76 62 L 86 60"/>
        <path d="M 76 62 L 84 68"/>
      </g>
      {/* leaf dots */}
      <g fill={ink}>
        <circle cx="22" cy="36" r="2"/>
        <circle cx="14" cy="60" r="2"/>
        <circle cx="78" cy="36" r="2"/>
        <circle cx="86" cy="60" r="2"/>
      </g>
    </g>
  ),

  // ㅇ — SOLID 사과 (clear apple silhouette with stem + leaf)
  'ㅇ': (
    <g>
      {/* apple body — round filled */}
      <path fill={ink} d="
        M 50 22
        C 30 22, 14 36, 14 56
        C 14 78, 30 92, 50 92
        C 70 92, 86 78, 86 56
        C 86 36, 70 22, 50 22 Z"/>
      {/* notch at the top (paper colour creates a dip) */}
      <path fill="var(--paper)" d="M 44 22 Q 50 30 56 22 Q 50 26 44 22 Z"/>
      {/* stem — thick */}
      <path fill={ink} d="M 48 24 Q 50 14 56 8 L 60 12 Q 56 18 52 28 Z"/>
      {/* leaf attached to stem */}
      <path fill={ink} d="
        M 58 10
        C 66 8, 78 6, 84 4
        C 82 12, 72 18, 60 18
        C 56 16, 56 12, 58 10 Z"/>
      <path {...LINE(1.2)} stroke="var(--paper)" d="M 62 12 Q 72 12 80 8"/>
      {/* tiny highlight on apple */}
      <ellipse cx="38" cy="42" rx="3" ry="5" fill="var(--paper)" opacity="0.7" transform="rotate(-20 38 42)"/>
    </g>
  ),

  // ㅊ — 꽃: 위 봉오리 + 가로 잎 + V로 갈라지는 두 줄기
  'ㅊ': (
    <g>
      {/* TOP bud — small flower */}
      <ellipse cx="50" cy="6" rx="5" ry="6" fill={ink}/>
      <g {...LINE(2)}>
        {/* petals around bud */}
        <path d="M 50 2 L 48 -4"/>
        <path d="M 50 2 L 52 -4"/>
        <path d="M 44 6 L 38 4"/>
        <path d="M 56 6 L 62 4"/>
      </g>
      {/* short stem connecting bud to bar */}
      <path {...LINE(4)} d="M 50 12 L 50 22"/>
      {/* HORIZONTAL leaf bar */}
      <path fill={ink} d="
        M 6 28
        C 4 22, 22 22, 38 24
        C 50 24, 62 24, 78 22
        C 94 22, 96 28, 92 32
        C 88 36, 70 36, 56 34
        C 40 34, 22 36, 14 34
        C 6 34, 4 32, 6 28 Z"/>
      <path {...LINE(1.2)} stroke="var(--paper)" d="M 14 30 Q 50 32 86 30"/>
      {/* two diverging roots/stems — line drawing */}
      <path {...LINE(5)} d="M 42 36 Q 32 56 16 86"/>
      <path {...LINE(5)} d="M 58 36 Q 68 56 84 86"/>
      {/* root tips */}
      <g {...LINE(2.5)}>
        <path d="M 16 86 L 8 92"/>
        <path d="M 16 86 L 18 96"/>
        <path d="M 84 86 L 92 92"/>
        <path d="M 84 86 L 82 96"/>
      </g>
      {/* tiny leaves on each stem */}
      <ellipse cx="26" cy="66" rx="4" ry="2.2" transform="rotate(-60 26 66)" fill={ink}/>
      <ellipse cx="74" cy="66" rx="4" ry="2.2" transform="rotate(60 74 66)" fill={ink}/>
    </g>
  ),

  // ── 모음 ───────────────────────────────────────────────────────────────

  // ㅏ — 세로 잎 + 오른쪽 가로획 (vertical leaf + clear right horizontal bar)
  'ㅏ': (
    <g>
      {/* SOLID vertical leaf — main stem of ㅏ */}
      <path fill={ink} d="
        M 36 2
        C 26 18, 20 40, 22 60
        C 24 80, 28 92, 36 98
        C 44 92, 48 76, 46 58
        C 44 36, 42 14, 36 2 Z"/>
      <path {...LINE(1.4)} stroke="var(--paper)" d="M 36 10 Q 34 50 36 86"/>
      {/* RIGHT horizontal bar — small SOLID leaf branch */}
      <path fill={ink} d="
        M 46 46
        C 56 44, 70 44, 82 46
        L 86 50
        C 82 54, 70 54, 56 54
        C 50 54, 44 52, 46 46 Z"/>
      {/* small leaf veins on bar */}
      <path {...LINE(1.2)} stroke="var(--paper)" d="M 56 50 L 78 50"/>
    </g>
  ),

  // ㅓ — 거울 (mirror of ㅏ)
  'ㅓ': (
    <g>
      <path fill={ink} d="
        M 64 2
        C 74 18, 80 40, 78 60
        C 76 80, 72 92, 64 98
        C 56 92, 52 76, 54 58
        C 56 36, 58 14, 64 2 Z"/>
      <path {...LINE(1.4)} stroke="var(--paper)" d="M 64 10 Q 66 50 64 86"/>
      <path fill={ink} d="
        M 54 46
        C 44 44, 30 44, 18 46
        L 14 50
        C 18 54, 30 54, 44 54
        C 50 54, 56 52, 54 46 Z"/>
      <path {...LINE(1.2)} stroke="var(--paper)" d="M 22 50 L 44 50"/>
    </g>
  ),

  // ㅗ — 가로획 + 짧은 세로획 위 (horizontal dominant, short stem up with bud)
  'ㅗ': (
    <g>
      {/* HORIZONTAL ground — solid bar */}
      <path fill={ink} d="
        M 4 64
        C 14 58, 28 56, 50 56
        C 72 56, 86 58, 96 64
        C 96 70, 92 74, 50 74
        C 8 74, 4 70, 4 64 Z"/>
      {/* vertical stem up — line */}
      <path {...LINE(5)} d="M 50 56 Q 50 38 50 22"/>
      {/* small flower/sun on top */}
      <circle cx="50" cy="14" r="8" {...LINE(3)}/>
      <g {...LINE(2.2)}>
        <path d="M 50 2 L 50 -2"/>
        <path d="M 42 8 L 38 4"/>
        <path d="M 58 8 L 62 4"/>
        <path d="M 38 14 L 32 14"/>
        <path d="M 62 14 L 68 14"/>
      </g>
    </g>
  ),

  // ㅜ — 가로획 + 짧은 세로획 아래 (horizontal dominant, hanging stem + fruit)
  'ㅜ': (
    <g>
      {/* HORIZONTAL bar — solid canopy */}
      <path fill={ink} d="
        M 4 32
        C 14 26, 28 24, 50 24
        C 72 24, 86 26, 96 32
        C 96 38, 92 42, 50 42
        C 8 42, 4 38, 4 32 Z"/>
      {/* small leaves on canopy */}
      <g {...LINE(2.5)}>
        <path d="M 22 24 L 18 16"/>
        <path d="M 78 24 L 82 16"/>
      </g>
      {/* vertical stem down — line */}
      <path {...LINE(5)} d="M 50 42 Q 50 60 50 72"/>
      {/* fruit hanging — solid */}
      <ellipse cx="50" cy="84" rx="11" ry="10" fill={ink}/>
      {/* small highlight */}
      <circle cx="46" cy="80" r="1.6" fill="var(--paper)"/>
    </g>
  ),

  // ㅡ — 가로 통나무/애벌레 (LINE outline, horizontal log preserves ㅡ)
  'ㅡ': (
    <g>
      <path {...LINE(5)} d="
        M 6 50
        C 6 42, 16 38, 26 44
        C 32 42, 42 50, 50 48
        C 58 46, 70 42, 80 46
        C 92 42, 96 52, 92 58
        C 86 64, 76 60, 68 60
        C 60 60, 50 56, 42 58
        C 30 62, 14 60, 8 56
        C 4 54, 4 52, 6 50 Z"/>
      <g {...LINE(2)}>
        <path d="M 24 46 L 24 60"/>
        <path d="M 44 50 L 44 60"/>
        <path d="M 64 50 L 64 60"/>
        <path d="M 82 48 L 82 58"/>
      </g>
      <circle cx="14" cy="50" r="2" fill={ink}/>
      <path {...LINE(2)} d="M 10 44 L 6 36"/>
      <path {...LINE(2)} d="M 14 44 L 12 34"/>
    </g>
  ),

  // ㅣ — 세로획 (tall vertical — palm tree, vertical-dominant)
  'ㅣ': (
    <g>
      {/* solid tall trunk preserves ㅣ */}
      <path fill={ink} d="
        M 46 28
        C 44 50, 46 70, 48 92
        C 48 98, 54 98, 54 92
        C 56 70, 56 50, 54 28
        C 54 24, 46 24, 46 28 Z"/>
      {/* trunk rings — paper colour */}
      <g {...LINE(1.4)} stroke="var(--paper)">
        <path d="M 44 44 L 56 44"/>
        <path d="M 44 58 L 56 58"/>
        <path d="M 44 72 L 56 72"/>
        <path d="M 44 86 L 56 86"/>
      </g>
      {/* fronds on top */}
      <path fill={ink} d="M 50 28 C 36 22, 22 16, 12 12 C 18 22, 32 28, 48 32 Z"/>
      <path fill={ink} d="M 50 28 C 64 22, 78 16, 88 12 C 82 22, 68 28, 52 32 Z"/>
      <path fill={ink} d="M 50 26 C 44 14, 42 6, 42 0 C 48 6, 50 16, 52 26 Z"/>
      <path fill={ink} d="M 50 26 C 56 14, 58 6, 58 0 C 52 6, 50 16, 48 26 Z"/>
      {/* coconut */}
      <circle cx="44" cy="32" r="3.5" fill={ink}/>
    </g>
  ),

  // ㅕ — 오른쪽 세로 + 왼쪽 두 가로 (vertical on RIGHT, 2 horizontals LEFT)
  'ㅕ': (
    <g>
      {/* vertical trunk — on the RIGHT */}
      <path fill={ink} d="
        M 66 4
        C 64 30, 66 60, 68 94
        C 68 98, 74 98, 74 94
        C 76 60, 76 30, 74 4
        C 72 0, 68 0, 66 4 Z"/>
      {/* upper horizontal — broad leaf extending LEFT */}
      <path fill={ink} d="
        M 66 28
        C 52 22, 30 24, 14 28
        L 10 32
        C 16 38, 36 40, 62 36
        C 68 36, 70 32, 66 28 Z"/>
      {/* lower horizontal */}
      <path fill={ink} d="
        M 66 62
        C 52 56, 30 58, 14 62
        L 10 66
        C 16 72, 36 74, 62 70
        C 68 70, 70 66, 66 62 Z"/>
      <path {...LINE(1.4)} stroke="var(--paper)" d="M 50 32 L 18 30"/>
      <path {...LINE(1.4)} stroke="var(--paper)" d="M 50 66 L 18 64"/>
    </g>
  ),

  // ── 추가 ──────────────────────────────────────────────────────────────

  // ㅐ — 얼굴 사이로 두 기둥 (preserves ㅐ structure: 세로 + 가로 + 세로)
  'ㅐ': (
    <g>
      {/* left tall pillar — chunky line */}
      <path {...LINE(9)} d="M 18 4 Q 20 50 24 96"/>
      {/* right tall pillar */}
      <path {...LINE(9)} d="M 80 4 Q 78 50 78 96"/>
      {/* middle horizontal bar — connects them */}
      <path fill={ink} d="
        M 28 44
        L 74 44
        L 74 52
        L 28 52 Z"/>
      {/* face features — eyes, mouth */}
      <ellipse cx="40" cy="32" rx="4.5" ry="6" fill={ink}/>
      <ellipse cx="62" cy="32" rx="4.5" ry="6" fill={ink}/>
      <ellipse cx="50" cy="70" rx="12" ry="4.5" fill={ink}/>
      <path {...LINE(2.5)} d="M 34 22 Q 40 18 46 22"/>
      <path {...LINE(2.5)} d="M 56 22 Q 62 18 68 22"/>
    </g>
  ),

  // ㅛ — 가로획 + 두 세로 (preserves ㅛ structure: 흙 + 두 새싹 위)
  'ㅛ': (
    <g>
      {/* horizontal soil — solid */}
      <path fill={ink} d="
        M 4 70
        C 14 64, 28 62, 50 62
        C 72 62, 86 64, 96 70
        C 96 76, 92 80, 50 80
        C 8 80, 4 76, 4 70 Z"/>
      {/* TWO vertical sprouts up */}
      <g {...LINE(5)}>
        <path d="M 32 62 L 32 28"/>
        <path d="M 68 62 L 68 28"/>
      </g>
      {/* sprout heads */}
      <g {...LINE(3)}>
        <path d="M 32 36 Q 24 32 20 24"/>
        <path d="M 32 36 Q 40 32 44 24"/>
        <path d="M 68 36 Q 60 32 56 24"/>
        <path d="M 68 36 Q 76 32 80 24"/>
      </g>
      <ellipse cx="20" cy="22" rx="4" ry="2.2" fill={ink}/>
      <ellipse cx="44" cy="22" rx="4" ry="2.2" fill={ink}/>
      <ellipse cx="56" cy="22" rx="4" ry="2.2" fill={ink}/>
      <ellipse cx="80" cy="22" rx="4" ry="2.2" fill={ink}/>
      {/* tiny buds at sprout tips */}
      <circle cx="32" cy="26" r="2" fill={ink}/>
      <circle cx="68" cy="26" r="2" fill={ink}/>
    </g>
  ),
};

function JamoSVG({ name, wobble = 'strong' }) {
  const content = Jamos[name];
  if (!content) return null;
  const filter = wobble === 'off' ? null
    : (wobble === 'soft' ? 'url(#hd-wobble-soft)' : 'url(#hd-wobble)');
  return (
    <svg
      viewBox="-6 -6 112 112"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }}
      aria-hidden="true"
    >
      <g filter={filter} style={{ color: 'var(--ink)' }}>{content}</g>
    </svg>
  );
}

window.JamoSVG = JamoSVG;
window.Jamos = Jamos;
