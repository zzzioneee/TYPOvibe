// Day 22 — 낯선 사람들이 모이면 어느 순간 서로가 답이 돼요
// 조형 활자: 자모를 자연물 메타포(연결/연대/연속)로 표현
// 삐뚤빼뚤한 손그림 벡터 일러스트

// ── 16개 자모 SVG 글리프 (연결/연대/연속 메타포) ──────────
// 각 글리프는 viewBox="0 0 60 72" 기준의 path
// 면(fill) + 라인(stroke) 혼합, 손그림 느낌의 불규칙 path

const GLYPHS = {
  // ─── 자음 (9개) ───
  // ㄱ: 줄기 — 꺾인 가지
  'ㄱ': `<path d="M15 18c2-1 28-3 40-2" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M53 16c1 3 2 18-1 35 -1 5-2 8-3 10" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <circle cx="52" cy="14" r="3" fill="#000"/>
         <path d="M20 22c-2 3-4 8-3 12 1 3 4 2 6 0" fill="#000" opacity="0.7"/>`,

  // ㄴ: 뿌리 — 아래로 뻗다 옆으로 퍼짐
  'ㄴ': `<path d="M16 14c-1 5-2 20 0 36 1 5 3 8 5 9" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M18 58c5 2 18 1 30-1" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M10 20c-3 2-5 6-3 9 2 2 5 1 6-1" fill="#000" opacity="0.6"/>
         <path d="M42 54c2-1 4-4 3-6" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>`,

  // ㄷ: 손바닥 — 감싸는 형태
  'ㄷ': `<path d="M14 18c8-2 25-1 32 0" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M14 18c-2 6-3 22-1 36" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M14 55c7 2 24 2 33 0" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <ellipse cx="30" cy="37" rx="10" ry="8" fill="#000" opacity="0.15"/>
         <path d="M22 30c-1 4 1 8 4 9" fill="none" stroke="#000" stroke-width="1.2"/>`,

  // ㄹ: 덩굴 — 구불구불 이어짐
  'ㄹ': `<path d="M12 20c10-2 20 0 28 1" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>
         <path d="M40 21c-1 5-8 8-18 10" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>
         <path d="M22 31c8 0 18 2 22 5" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>
         <path d="M44 36c-2 6-10 10-20 12" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>
         <path d="M24 48c6 1 14 3 20 4" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>
         <circle cx="14" cy="25" r="2.5" fill="#000"/>
         <circle cx="46" cy="40" r="2" fill="#000"/>`,

  // ㅁ: 씨앗/열매 — 둥근 사각
  'ㅁ': `<path d="M16 20c0-3 3-5 6-5h16c3 0 6 2 6 5v28c0 3-3 6-6 6H22c-3 0-6-3-6-6z" fill="#000" opacity="0.85"/>
         <path d="M22 30c2-2 6-2 8 0 2 2 2 6 0 8-2 2-6 2-8 0-2-2-2-6 0-8" fill="#fff" opacity="0.6"/>
         <path d="M30 16c0-4 2-8 4-10" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>`,

  // ㅂ: 두 그루 나무 — 나란히 선 연대
  'ㅂ': `<path d="M20 56c0-12 1-28 0-38" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M38 56c1-10 0-26-1-38" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M14 56c6 1 20 2 32 0" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>
         <circle cx="20" cy="14" r="7" fill="#000" opacity="0.8"/>
         <circle cx="38" cy="16" r="6" fill="#000" opacity="0.8"/>
         <path d="M26 14c3-1 6 0 8 2" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>`,

  // ㅅ: 새싹 — 두 잎이 벌어짐
  'ㅅ': `<path d="M30 58c-3-12-10-26-16-36" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M30 58c4-10 12-24 17-35" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M12 20c-4-3-3-8 1-10 4-2 8 1 8 5" fill="#000" opacity="0.7"/>
         <path d="M40 20c2-4 6-5 9-3 3 2 2 7-1 9" fill="#000" opacity="0.7"/>
         <circle cx="30" cy="60" r="2.5" fill="#000"/>`,

  // ㅇ: 물방울/꽃봉오리 — 원형
  'ㅇ': `<circle cx="30" cy="38" r="16" fill="none" stroke="#000" stroke-width="2.8"/>
         <path d="M24 32c3-4 9-4 12 0 2 3 1 8-2 10-4 2-9 0-10-4" fill="#000" opacity="0.3"/>
         <path d="M30 20c-1-4 0-8 2-10" fill="none" stroke="#000" stroke-width="1.3" stroke-linecap="round"/>
         <circle cx="32" cy="10" r="2" fill="#000"/>`,

  // ㅊ: 꽃 — 위로 피어오르는 형태
  'ㅊ': `<path d="M30 62c-4-12-12-24-16-34" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>
         <path d="M30 62c4-10 13-22 17-33" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>
         <path d="M25 26c-2-3-1-7 2-8 3-1 6 1 6 4" fill="#000" opacity="0.75"/>
         <path d="M33 24c1-3 4-5 7-4 3 1 3 5 1 7" fill="#000" opacity="0.75"/>
         <path d="M30 10c0-4 1-7 0-10" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
         <circle cx="30" cy="8" r="3.5" fill="#000"/>
         <path d="M24 6c-3-2-2-5 1-5 2 0 4 2 3 4" fill="#000" opacity="0.6"/>
         <path d="M36 6c3-2 2-5-1-5-2 0-4 2-3 4" fill="#000" opacity="0.6"/>`,

  // ─── 모음 (7개) ───
  // ㅏ: 줄기에서 뻗는 가지
  'ㅏ': `<path d="M22 10c-1 8 0 30 1 50" fill="none" stroke="#000" stroke-width="2.8" stroke-linecap="round"/>
         <path d="M23 36c6-1 14-2 20-1" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>
         <path d="M40 32c3-2 5 0 5 3-1 3-4 4-6 2" fill="#000" opacity="0.6"/>
         <circle cx="22" cy="8" r="2.5" fill="#000"/>`,

  // ㅓ: 뿌리가 왼쪽으로
  'ㅓ': `<path d="M38 10c1 8 0 30-1 50" fill="none" stroke="#000" stroke-width="2.8" stroke-linecap="round"/>
         <path d="M37 36c-6-1-14-1-20 0" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>
         <path d="M18 33c-3-1-5 1-5 4 1 3 4 3 6 1" fill="#000" opacity="0.6"/>
         <circle cx="38" cy="8" r="2.5" fill="#000"/>`,

  // ㅗ: 위로 솟는 새싹
  'ㅗ': `<path d="M10 48c8 1 24 2 40 0" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M30 48c0-10 1-22 0-30" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M26 16c-2-4 0-8 4-9 4-1 7 3 5 7" fill="#000" opacity="0.7"/>
         <circle cx="30" cy="12" r="2" fill="#000"/>`,

  // ㅜ: 아래로 내린 뿌리
  'ㅜ': `<path d="M10 24c8-1 24-2 40 0" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M30 24c0 10-1 22 0 30" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M26 56c-1 3 1 6 4 7 3 0 5-3 4-6" fill="#000" opacity="0.7"/>
         <circle cx="30" cy="58" r="2" fill="#000"/>`,

  // ㅡ: 수평 연결 — 뿌리 네트워크
  'ㅡ': `<path d="M8 36c10-2 22-1 44 0" fill="none" stroke="#000" stroke-width="2.8" stroke-linecap="round"/>
         <path d="M14 36c-2 4-1 8 2 9" fill="none" stroke="#000" stroke-width="1.3"/>
         <path d="M44 36c2-4 1-7-2-8" fill="none" stroke="#000" stroke-width="1.3"/>
         <circle cx="8" cy="36" r="3" fill="#000" opacity="0.7"/>
         <circle cx="52" cy="36" r="3" fill="#000" opacity="0.7"/>`,

  // ㅣ: 수직 줄기 — 성장
  'ㅣ': `<path d="M30 8c-1 10 0 30 1 52" fill="none" stroke="#000" stroke-width="2.8" stroke-linecap="round"/>
         <circle cx="30" cy="6" r="3" fill="#000"/>
         <path d="M28 25c-3 0-5 3-4 5 1 2 4 2 5 0" fill="#000" opacity="0.4"/>
         <path d="M32 44c3 0 5-2 4-5-1-2-3-2-5 0" fill="#000" opacity="0.4"/>`,

  // ㅕ: 왼쪽으로 두 가지
  'ㅕ': `<path d="M40 8c0 10 0 32-1 52" fill="none" stroke="#000" stroke-width="2.8" stroke-linecap="round"/>
         <path d="M39 28c-8-1-16 0-22 1" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
         <path d="M39 44c-7 0-15 1-21 2" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
         <path d="M16 26c-3-1-5 1-4 4 1 2 3 2 5 0" fill="#000" opacity="0.5"/>
         <path d="M17 42c-3 0-5 2-4 5 1 2 4 2 5-1" fill="#000" opacity="0.5"/>
         <circle cx="40" cy="6" r="2.5" fill="#000"/>`,
};

// ── 텍스트를 자모로 분해 ──────────────────────────────
function decomposeHangul(text) {
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄹㄱ','ㄹㅁ','ㄹㅂ','ㄹㅅ','ㄹㅌ','ㄹㅍ','ㄹㅎ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  const result = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const offset = code - 0xAC00;
      const cho = Math.floor(offset / (21 * 28));
      const jung = Math.floor((offset % (21 * 28)) / 28);
      const jong = offset % 28;
      result.push(CHO[cho]);
      result.push(JUNG[jung]);
      if (jong > 0) {
        // 겹받침은 개별 자모로
        const j = JONG[jong];
        for (const c of j) result.push(c);
      }
    } else if (ch === ' ') {
      result.push(' ');
    }
  }
  return result;
}

// ── 사용 가능한 자모만 필터링 (없는 건 가까운 것으로 대체) ──
function mapToAvailable(jamo) {
  if (GLYPHS[jamo]) return jamo;
  // 대체 맵핑
  const fallback = {
    'ㄲ':'ㄱ','ㄸ':'ㄷ','ㅃ':'ㅂ','ㅆ':'ㅅ','ㅉ':'ㅊ',
    'ㅋ':'ㄱ','ㅌ':'ㄷ','ㅍ':'ㅂ','ㅎ':'ㅇ','ㅈ':'ㅊ',
    'ㅐ':'ㅏ','ㅑ':'ㅏ','ㅒ':'ㅏ','ㅔ':'ㅓ','ㅖ':'ㅓ',
    'ㅘ':'ㅗ','ㅙ':'ㅗ','ㅚ':'ㅗ','ㅛ':'ㅗ',
    'ㅝ':'ㅜ','ㅞ':'ㅜ','ㅟ':'ㅜ','ㅠ':'ㅜ','ㅢ':'ㅡ',
  };
  return fallback[jamo] || 'ㅇ';
}

// ── 메인 텍스트 4행 ───────────────────────────────────
const LINES = [
  '낯선 사람들이',
  '모이면',
  '어느 순간',
  '서로가 답이 돼요',
];

// ── 렌더링 ────────────────────────────────────────────
const stage = document.getElementById('stage');
const allCells = [];

LINES.forEach(line => {
  const row = document.createElement('div');
  row.className = 'line-row';

  const jamos = decomposeHangul(line);
  jamos.forEach(j => {
    const cell = document.createElement('div');
    cell.className = 'glyph-cell';

    if (j === ' ') {
      cell.style.width = '28px';
    } else {
      const mapped = mapToAvailable(j);
      const svg = GLYPHS[mapped];
      cell.innerHTML = `<svg viewBox="0 0 60 72" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
    }
    row.appendChild(cell);
    allCells.push(cell);
  });

  stage.appendChild(row);
});

// ── 타이핑 애니메이션: 한 자모씩 떨어지며 등장 ───────────
let currentIdx = 0;
const TYPING_INTERVAL = 80; // ms per glyph

function typeNext() {
  if (currentIdx >= allCells.length) return;
  allCells[currentIdx].classList.add('visible');
  currentIdx++;
  setTimeout(typeNext, TYPING_INTERVAL);
}

// 페이지 로드 후 0.5초 뒤 시작
setTimeout(typeNext, 500);
