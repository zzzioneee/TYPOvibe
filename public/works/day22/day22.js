// Day 22 — 낯선 사람들이 모이면 어느 순간 서로가 답이 돼요
// 조형 활자: 각 글자(음절)에 하나의 자연물 일러스트
// 메타포: 연결-연대-연속 / 삐뚤빼뚤 손그림 벡터

// ── 16개 글리프: 더 명확하고 지글지글한 자연물 일러스트 ─────
// viewBox="0 0 80 96"
// 면+라인 혼합, 거친 stroke, 불규칙한 윤곽

const GLYPHS = {
  // ─── 자음 기반 (초성으로 매핑) ───
  // ㄱ: 줄기 — 확 꺾인 가지에 잎 달림
  'ㄱ': `
    <path d="M18 22c3-2 12-3 22-3 8 0 16 1 20 2" fill="none" stroke="#000" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M58 20c2 4 3 14 2 28-1 10-3 18-5 24" fill="none" stroke="#000" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M54 36c4-2 9-1 11 3 2 5-1 9-6 9-4 0-7-4-6-8" fill="#000"/>
    <path d="M40 16c-2-5 0-10 4-11 3-1 6 2 5 5" fill="#000" opacity="0.8"/>
    <path d="M22 26c-4 2-7 7-5 11 1 3 5 3 7 0 2-4 0-8-3-9" fill="#000" opacity="0.6"/>
    <path d="M56 50c3 2 6 1 7-2" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M56 58c2 3 5 3 7 1" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
  `,

  // ㄴ: 뿌리 — 땅 속으로 내려가다 옆으로 뻗는 뿌리 시스템
  'ㄴ': `
    <path d="M20 16c-2 8-3 22-2 38 0 6 2 10 5 12" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M22 65c8 3 20 3 32 1 6-1 10-3 12-5" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M16 28c-5 1-9 5-8 10 1 4 5 5 8 3 2-2 2-6 0-8" fill="#000" opacity="0.7"/>
    <path d="M14 48c-6 2-8 7-6 11 2 3 6 2 8-1" fill="#000" opacity="0.5"/>
    <path d="M42 68c2 4 6 6 10 5 3-1 4-4 2-6" fill="#000" opacity="0.6"/>
    <path d="M56 62c4 0 8-2 9-5" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
    <path d="M60 56c3-1 5-4 4-7" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="18" cy="14" r="3.5" fill="#000"/>
  `,

  // ㄷ: 손 — 감싸 안는 두 손
  'ㄷ': `
    <path d="M16 22c10-3 28-3 42-1" fill="none" stroke="#000" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M16 22c-3 8-4 24-2 42" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M15 64c10 4 30 4 44 1" fill="none" stroke="#000" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M24 34c-2 3-1 8 3 10 4 2 8 0 9-4 1-4-2-7-5-8" fill="#000" opacity="0.7"/>
    <path d="M38 40c2-3 6-4 9-2 3 2 3 7 0 9-3 2-7 1-8-2" fill="#000" opacity="0.6"/>
    <path d="M20 48c-3 2-3 6 0 8 3 1 6-1 6-4" fill="#000" opacity="0.5"/>
    <path d="M48 28c3-1 6 1 6 4-1 3-4 4-6 2" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
    <path d="M50 52c4-1 7 0 8 3" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
  `,

  // ㄹ: 덩굴 — 꼬불꼬불 감기는 덩굴손
  'ㄹ': `
    <path d="M14 20c12-2 26 0 36 2" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
    <path d="M50 22c-2 6-12 10-24 12" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
    <path d="M26 34c10 1 22 4 28 7" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
    <path d="M54 41c-4 8-16 12-28 14" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
    <path d="M26 55c8 2 18 4 28 5" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
    <circle cx="12" cy="20" r="4" fill="#000"/>
    <path d="M56 44c4-1 8 1 9 5-1 4-5 5-8 3" fill="#000" opacity="0.7"/>
    <path d="M18 38c-5 1-7 5-5 8 2 3 6 2 7-1" fill="#000" opacity="0.6"/>
    <circle cx="58" cy="55" r="3" fill="#000" opacity="0.8"/>
    <path d="M54 26c3-3 7-2 8 1 1 3-2 5-4 4" fill="#000" opacity="0.5"/>
  `,

  // ㅁ: 사과/열매 — 통통한 열매에 꼭지와 잎
  'ㅁ': `
    <path d="M40 14c-1-6 1-11 3-13" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M42 8c3-2 8-1 10 2 2 3 0 7-3 7-3 0-5-3-4-6" fill="#000" opacity="0.8"/>
    <path d="M28 24c-10 4-16 14-15 28 1 12 8 22 18 26 4 1 8 1 12 0 10-4 17-14 18-26 1-14-6-24-16-28-4-2-9-3-14-1" fill="#000" opacity="0.9"/>
    <ellipse cx="34" cy="46" rx="6" ry="8" fill="#fff" opacity="0.2"/>
    <path d="M44 30c2-1 4 0 4 2 0 2-2 3-4 2" fill="#fff" opacity="0.25"/>
  `,

  // ㅂ: 두 그루 나무 — 나란히 서서 가지가 만남
  'ㅂ': `
    <path d="M24 80c0-16 1-36 0-52" fill="none" stroke="#000" stroke-width="3.8" stroke-linecap="round"/>
    <path d="M54 80c-1-14 0-34 0-50" fill="none" stroke="#000" stroke-width="3.8" stroke-linecap="round"/>
    <path d="M14 80c10 2 30 2 50 0" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
    <circle cx="24" cy="22" r="11" fill="#000" opacity="0.85"/>
    <circle cx="54" cy="24" r="10" fill="#000" opacity="0.85"/>
    <path d="M34 22c4-2 10-2 14 0" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M20 40c-5 1-8 5-7 9 1 3 4 3 6 1" fill="#000" opacity="0.5"/>
    <path d="M58 42c4-1 7 2 6 6-1 3-4 4-6 2" fill="#000" opacity="0.5"/>
    <path d="M36 30c2 3 4 6 3 10" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
  `,

  // ㅅ: 새싹/발아 — V자로 벌어지는 두 떡잎
  'ㅅ': `
    <path d="M40 78c-5-16-14-34-22-48" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M40 78c6-14 15-32 22-46" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M14 28c-6-4-5-12 1-15 6-3 12 2 12 8 0 5-4 8-8 7" fill="#000" opacity="0.85"/>
    <path d="M54 28c5-5 4-13-2-15-6-2-11 3-10 9 1 5 5 7 9 6" fill="#000" opacity="0.85"/>
    <circle cx="40" cy="80" r="4.5" fill="#000"/>
    <path d="M24 38c-3 2-4 6-2 8 2 2 5 0 5-3" fill="#000" opacity="0.5"/>
    <path d="M56 40c3 1 4 5 2 7-2 2-5 1-5-2" fill="#000" opacity="0.5"/>
  `,

  // ㅇ: 물방울/꽃봉오리 — 완전한 원에 생명력
  'ㅇ': `
    <circle cx="40" cy="50" r="22" fill="none" stroke="#000" stroke-width="3.5"/>
    <path d="M40 26c-2-6 0-12 3-15 2-2 5-1 5 2" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="42" cy="10" r="4" fill="#000"/>
    <path d="M30 42c4-5 12-5 16 0 3 4 2 11-3 14-5 3-12 1-14-4-2-4-1-8 1-10" fill="#000" opacity="0.25"/>
    <path d="M50 36c3-2 6 0 6 3 0 3-3 4-5 3" fill="#000" opacity="0.4"/>
    <path d="M28 56c-2 3-1 6 2 7 3 1 5-1 5-4" fill="#000" opacity="0.4"/>
  `,

  // ㅊ: 개화/꽃 — 활짝 핀 꽃 (ㅅ 위에 점)
  'ㅊ': `
    <path d="M40 82c-5-14-14-30-20-42" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
    <path d="M40 82c5-12 14-28 20-40" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
    <path d="M16 36c-5-3-5-10 0-12 5-2 10 2 9 7-1 4-4 6-7 5" fill="#000" opacity="0.8"/>
    <path d="M54 38c5-2 6-9 2-12-4-3-10 0-10 5 0 4 3 7 6 6" fill="#000" opacity="0.8"/>
    <circle cx="40" cy="12" r="6" fill="#000"/>
    <path d="M32 8c-4-2-4-7-1-8 3-1 6 1 6 4" fill="#000" opacity="0.7"/>
    <path d="M48 8c4-2 4-7 1-8-3-1-6 1-6 4" fill="#000" opacity="0.7"/>
    <path d="M36 20c-2-3 0-6 3-6 3 0 5 3 3 6" fill="#000" opacity="0.6"/>
    <circle cx="40" cy="84" r="3.5" fill="#000"/>
  `,

  // ─── 모음 기반 (중성으로 매핑 — 초성 없을 때 fallback) ───
  // ㅏ: 수직 줄기 + 오른쪽 가지
  'ㅏ': `
    <path d="M28 8c-1 12 0 40 1 68" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M29 46c8-2 20-2 28 0" fill="none" stroke="#000" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M54 42c4-3 8-1 8 4 0 4-4 6-7 4-3-2-3-5-1-7" fill="#000" opacity="0.7"/>
    <circle cx="28" cy="6" r="3.5" fill="#000"/>
    <path d="M24 24c-4 1-6 5-4 8 2 3 5 2 6-1" fill="#000" opacity="0.5"/>
  `,

  // ㅓ: 수직 줄기 + 왼쪽 가지
  'ㅓ': `
    <path d="M50 8c1 12 0 40-1 68" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M49 46c-8-1-20-1-28 1" fill="none" stroke="#000" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M22 44c-4-2-8 0-8 4 0 4 4 6 7 4 2-2 2-5 0-7" fill="#000" opacity="0.7"/>
    <circle cx="50" cy="6" r="3.5" fill="#000"/>
    <path d="M54 28c4 2 6 6 4 9-2 2-5 1-6-2" fill="#000" opacity="0.5"/>
  `,

  // ㅗ: 수평 줄기 + 위로 솟음
  'ㅗ': `
    <path d="M10 60c14 2 36 2 58 0" fill="none" stroke="#000" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M40 60c0-14 0-30 0-40" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M34 18c-3-5-1-12 4-14 5-2 10 2 9 8-1 5-5 8-9 7" fill="#000" opacity="0.8"/>
    <circle cx="40" cy="14" r="3" fill="#000"/>
  `,

  // ㅜ: 수평 줄기 + 아래로 뻗음
  'ㅜ': `
    <path d="M10 30c14-2 36-2 58 0" fill="none" stroke="#000" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M40 30c0 14 0 30 0 40" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M34 72c-2 4 0 10 5 12 5 2 9-2 8-7-1-4-5-7-9-6" fill="#000" opacity="0.8"/>
    <circle cx="40" cy="76" r="3" fill="#000"/>
  `,

  // ㅡ: 수평 연결선 — 뿌리 네트워크
  'ㅡ': `
    <path d="M8 48c14-3 34-2 62 0" fill="none" stroke="#000" stroke-width="3.8" stroke-linecap="round"/>
    <circle cx="8" cy="48" r="5" fill="#000" opacity="0.8"/>
    <circle cx="70" cy="48" r="5" fill="#000" opacity="0.8"/>
    <path d="M24 44c-3-3-2-7 2-8 3-1 6 2 5 5" fill="#000" opacity="0.5"/>
    <path d="M50 44c2-3 6-3 8 0 1 3-2 5-5 5" fill="#000" opacity="0.5"/>
    <path d="M36 52c-2 3 0 6 3 6 3 0 5-3 3-6" fill="#000" opacity="0.4"/>
  `,

  // ㅣ: 수직 줄기 — 성장
  'ㅣ': `
    <path d="M40 6c-1 14 0 42 1 72" fill="none" stroke="#000" stroke-width="3.8" stroke-linecap="round"/>
    <circle cx="40" cy="4" r="4.5" fill="#000"/>
    <path d="M34 30c-4 0-6 4-5 7 2 3 5 3 7 0 1-3 0-6-2-7" fill="#000" opacity="0.5"/>
    <path d="M46 52c4 1 6-2 5-5-1-3-4-4-6-2-2 2-1 5 1 6" fill="#000" opacity="0.5"/>
    <path d="M36 68c-3 2-3 5-1 7 2 1 5 0 5-3" fill="#000" opacity="0.4"/>
  `,

  // ㅕ: 수직 줄기 + 왼쪽 두 가지
  'ㅕ': `
    <path d="M52 6c0 14 0 42-1 72" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M51 34c-10-1-22 0-30 2" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M51 56c-8 0-20 1-28 3" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M20 32c-4-2-8 0-8 4 0 4 4 6 7 4 2-2 2-5 0-6" fill="#000" opacity="0.65"/>
    <path d="M22 56c-4-1-7 1-7 5 0 3 4 5 6 3 2-2 2-5 0-6" fill="#000" opacity="0.65"/>
    <circle cx="52" cy="4" r="3.5" fill="#000"/>
  `,
};

// ── 한글 음절 → 초성 추출 ─────────────────────────────
function getChosung(ch) {
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const code = ch.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const idx = Math.floor((code - 0xAC00) / (21 * 28));
    return CHO[idx];
  }
  return null;
}

// ── 초성을 사용 가능한 글리프로 매핑 ──────────────────
function mapChosung(cho) {
  if (GLYPHS[cho]) return cho;
  const fallback = {
    'ㄲ':'ㄱ','ㄸ':'ㄷ','ㅃ':'ㅂ','ㅆ':'ㅅ','ㅉ':'ㅊ',
    'ㅋ':'ㄱ','ㅌ':'ㄷ','ㅍ':'ㅂ','ㅎ':'ㅇ','ㅈ':'ㅊ',
  };
  return fallback[cho] || 'ㅇ';
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

  for (const ch of line) {
    const cell = document.createElement('div');
    cell.className = 'glyph-cell';

    if (ch === ' ') {
      cell.style.width = '36px';
      cell.style.minHeight = '0';
    } else {
      const cho = getChosung(ch);
      if (cho) {
        const mapped = mapChosung(cho);
        cell.innerHTML = `<svg viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">${GLYPHS[mapped]}</svg>`;
      }
    }
    row.appendChild(cell);
    allCells.push(cell);
  }

  stage.appendChild(row);
});

// ── 타이핑 애니메이션: 한 글자씩 위에서 떨어지며 등장 ──────
let currentIdx = 0;
const TYPING_INTERVAL = 120; // ms per character

function typeNext() {
  if (currentIdx >= allCells.length) return;
  const cell = allCells[currentIdx];
  cell.classList.add('visible');
  currentIdx++;
  setTimeout(typeNext, TYPING_INTERVAL);
}

// 페이지 로드 후 0.6초 뒤 시작
setTimeout(typeNext, 600);
