// Day 9 — 러브버그 출몰 시기
// lovebug2.jsx(Claude) 기반 vanilla Canvas 포팅.
// LOVE(노랑) + BUG(핑크)가 각자 ±8도 기울어져 위아래로 겹쳐 한 쌍처럼 날아다님.
// 둘 다 머리(L, B 쪽)가 같은 방향(왼쪽). dash ↔ pause로 뽈뽈뽈.
// 클릭 시 LOVE는 위-왼쪽, BUG는 위-오른쪽으로 튕기며 낙하.
(() => {
  console.log('[day9] start');

  // ─── 사운드 (Web Audio API, 외부 파일 없음) ───
  // 썸네일 프리뷰 모드면 소리 재생 안 함 (day6 동일 패턴)
  const IS_THUMB = new URLSearchParams(location.search).has('thumb');
  let audioCtx = null;
  let hoverGain = null;      // 붕붕 배경음 볼륨 제어
  let hoverOsc = null;
  let hoverOsc2 = null;
  let hoverNoise = null;

  function getCtx() {
    if (IS_THUMB) return null;
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  // 사용자 첫 상호작용 후 unlock
  ['click', 'keydown', 'pointerdown'].forEach(ev =>
    window.addEventListener(ev, () => { getCtx(); startHoverLoop(); }, { once: true })
  );

  // 붕붕 배경음 (항상 재생, 볼륨만 쌍 개수에 따라 조절)
  function startHoverLoop() {
    const ctx = getCtx();
    if (!ctx || hoverGain) return;
    hoverGain = ctx.createGain();
    hoverGain.gain.value = 0; // 시작은 0
    hoverGain.connect(ctx.destination);

    // 두 개 겹친 낮은 사인 웨이브 + LFO 진동 + 화이트노이즈 필터링 = 벌레 날갯짓
    hoverOsc = ctx.createOscillator();
    hoverOsc.type = 'sawtooth';
    hoverOsc.frequency.value = 90;
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.12;
    hoverOsc.connect(oscGain).connect(hoverGain);

    hoverOsc2 = ctx.createOscillator();
    hoverOsc2.type = 'sine';
    hoverOsc2.frequency.value = 180;
    const oscGain2 = ctx.createGain();
    oscGain2.gain.value = 0.05;
    hoverOsc2.connect(oscGain2).connect(hoverGain);

    // LFO: 주파수를 미세하게 떨어 "위이잉" 변조
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 7;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 12;
    lfo.connect(lfoGain).connect(hoverOsc.frequency);
    const lfoGain2 = ctx.createGain();
    lfoGain2.gain.value = 18;
    lfo.connect(lfoGain2).connect(hoverOsc2.frequency);

    // 화이트 노이즈 (약간) — "부스럭" 느낌
    const bufSize = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    hoverNoise = ctx.createBufferSource();
    hoverNoise.buffer = noiseBuf;
    hoverNoise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 200;
    noiseFilter.Q.value = 2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.08;
    hoverNoise.connect(noiseFilter).connect(noiseGain).connect(hoverGain);

    hoverOsc.start();
    hoverOsc2.start();
    lfo.start();
    hoverNoise.start();
  }

  // 쌍 개수에 따라 볼륨 부드럽게 조절
  function updateHoverVolume(pairCount) {
    const ctx = getCtx();
    if (!ctx || !hoverGain) return;
    // 쌍 0개 → 0, 4개 → 0.08 (최대)
    const target = Math.min(0.08, pairCount * 0.02);
    hoverGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.3);
  }

  // 퇴치 소리 — 클릭 시 짧은 "퍽"
  function playSwat() {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    // 1) 짧은 noise burst (퍽!)
    const bufSize = ctx.sampleRate * 0.15;
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'lowpass';
    nFilter.frequency.value = 1800;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.35, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    noise.connect(nFilter).connect(nGain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.15);

    // 2) 낮은 톤 descend (슈웅 떨어지는 느낌)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.18);
    const oGain = ctx.createGain();
    oGain.gain.setValueAtTime(0, t);
    oGain.gain.linearRampToValueAtTime(0.12, t + 0.01);
    oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(oGain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  const cv = document.getElementById('canvas');
  const ctx = cv.getContext('2d');
  const countEl = document.getElementById('count');
  const stage = document.getElementById('stage');

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ─── 글자 패턴 (col, row) ───
  const LETTER = {
    L: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4]],
    O: [[0,1],[0,2],[0,3],[1,0],[1,4],[2,0],[2,4],[3,1],[3,2],[3,3]],
    V: [[0,0],[0,1],[0,2],[1,3],[2,3],[3,0],[3,1],[3,2]],
    E: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[1,4],[2,0],[2,2],[2,4]],
    B: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[1,4],[2,0],[2,2],[2,4],[3,1],[3,3]],
    U: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[3,0],[3,1],[3,2],[3,3],[3,4]],
    G: [[1,0],[2,0],[3,0],[0,1],[0,2],[0,3],[1,4],[2,4],[3,4],[3,3],[3,2],[2,2]],
  };

  // lovebug2 파라미터와 맞춤
  const DOT_R = 10;
  const SPACING = 14;
  const STROKE = '#FF0000';
  const LOVE_FILL = '#03ff00';
  const BUG_FILL = '#ffff00';

  // 글자 배치: LOVE = L(0) O(45) V(105) E(160)
  // BUG = B(0) U(55) G(115)
  const LOVE_LETTERS = [['L', 0], ['O', 45], ['V', 105], ['E', 160]];
  const BUG_LETTERS = [['B', 0], ['U', 55], ['G', 115]];
  const LOVE_WIDTH = 195; // 160 + 3*14 정도
  const BUG_WIDTH = 160;  // 115 + 3*14 정도
  const LETTER_H = 5 * SPACING; // 4 * 14 = 56

  // 컨테이너 전체 크기
  const CONTAINER_W = 350;
  const CONTAINER_H = 120;
  // 한 쌍 크기 (hit test용, bbox)
  const PAIR_W = 350;
  const PAIR_H = 130;

  class LovebugPair {
    constructor(dir) {
      // dir: +1(오른쪽으로 이동) or -1(왼쪽으로 이동)
      this.dir = dir || (Math.random() < 0.5 ? -1 : 1);

      // 초기 위치: 이동 방향 반대편 가장자리에서 등장
      if (this.dir > 0) {
        this.x = -PAIR_W - Math.random() * 100;
      } else {
        this.x = W + Math.random() * 100;
      }
      this.y = 60 + Math.random() * Math.max(1, H - PAIR_H - 120);

      this.speed = 1.2 + Math.random() * 0.8; // X축 횡단 속도

      this.frame = Math.random() * 1000;
      this.yCenter = this.y;            // Y 기준선
      this.yAmp = 30 + Math.random() * 35; // Y 파도 진폭
      this.yFreq = 0.015 + Math.random() * 0.015; // 느린 파도

      this.state = 'flying';
      this.lovePos = { x: 0, y: 0 };
      this.bugPos = { x: 0, y: 0 };
      this.loveVel = { x: 0, y: 0 };
      this.bugVel = { x: 0, y: 0 };

      // 날갯짓
      this.wingPhase = Math.random() * Math.PI * 2;
      this.bobPhase = Math.random() * Math.PI * 2;

      this.vib = { x: 0, y: 0 };

      // angle: 이동 방향(왼쪽=π, 오른쪽=0)
      this.angle = this.dir > 0 ? 0 : Math.PI;
    }

    update(dt) {
      this.frame += 1;
      if (this.state === 'flying') {
        // ─── X축 횡단 (핵심) ───
        this.x += this.speed * this.dir;

        // ─── Y축 웨이브 (위아래 출렁) ───
        // 느린 큰 파도
        this.y = this.yCenter + Math.sin(this.frame * this.yFreq) * this.yAmp;
        // 빠른 날갯짓 미세 진동
        this.bobPhase += 0.35;
        this.y += Math.sin(this.bobPhase) * 0.8;

        // ─── Y 중심 드리프트 (가끔 높이 바뀜) ───
        if (this.frame % 200 === 0) {
          this.yCenter += (Math.random() - 0.5) * 60;
          this.yCenter = Math.max(80, Math.min(H - 100, this.yCenter));
        }

        // 화면 밖으로 나가면 반대편으로 리셋
        if (this.dir > 0 && this.x > W + 50) {
          this.x = -PAIR_W - 50;
          this.yCenter = 60 + Math.random() * (H - 200);
        } else if (this.dir < 0 && this.x < -PAIR_W - 50) {
          this.x = W + 50;
          this.yCenter = 60 + Math.random() * (H - 200);
        }

        // 날갯짓
        this.wingPhase += 0.7;
        this.vib.x = Math.sin(this.wingPhase) * 1.2;
        this.vib.y = Math.cos(this.wingPhase * 1.3) * 1.2;
      } else if (this.state === 'exploding') {
        this.lovePos.x += this.loveVel.x;
        this.lovePos.y += this.loveVel.y;
        this.bugPos.x += this.bugVel.x;
        this.bugPos.y += this.bugVel.y;
        this.loveVel.x *= 0.98;
        this.loveVel.y += 0.5;
        this.bugVel.x *= 0.98;
        this.bugVel.y += 0.5;
        const maxY = Math.max(Math.abs(this.lovePos.y), Math.abs(this.bugPos.y));
        if (maxY > 700) this.state = 'dead';
      }
    }

    hitTest(mx, my) {
      if (this.state !== 'flying') return false;
      return mx >= this.x && mx <= this.x + PAIR_W &&
             my >= this.y - 20 && my <= this.y + PAIR_H + 20;
    }

    explode() {
      this.state = 'exploding';
      this.loveVel.x = -6 - Math.random() * 3;
      this.loveVel.y = -8 - Math.random() * 2;
      this.bugVel.x = 6 + Math.random() * 3;
      this.bugVel.y = -8 - Math.random() * 2;
    }

    draw(ctx) {
      const isExplode = this.state === 'exploding';

      const cx = this.x + PAIR_W / 2;
      const cy = this.y + PAIR_H / 2;

      ctx.save();
      ctx.translate(cx, cy);
      // dir +1(오른쪽 이동)이면 좌우 반전 — 머리(L)가 오른쪽을 향하게
      if (!isExplode && this.dir > 0) ctx.scale(-1, 1);
      ctx.translate(-PAIR_W / 2, -PAIR_H / 2);

      // LOVE
      ctx.save();
      ctx.translate(this.lovePos.x, -15 + this.lovePos.y);
      ctx.translate(100, 50);
      // 몸체 S자 흔들림: 기본 -8도 + 호버와 반대 위상의 미세 진동
      const loveBodyA = -8 + Math.sin(this.bobPhase + 0.3) * 1.2;
      ctx.rotate(loveBodyA * Math.PI / 180);
      ctx.translate(-100, -50);
      // 글자
      ctx.save();
      ctx.translate(this.vib.x, this.vib.y);
      this.drawWord(ctx, LOVE_LETTERS, LOVE_FILL);
      ctx.restore();
      // 꼬리털 (E 뒤, 몸 끝 암시)
      // 더듬이 (L 위, 머리)
      this.drawAntennae(ctx);
      ctx.restore();

      // BUG
      ctx.save();
      ctx.translate(200 + this.bugPos.x, 15 + this.bugPos.y);
      ctx.translate(75, 50);
      // 몸체 S자: 기본 +8도 - LOVE와 반대 위상
      const bugBodyA = 8 - Math.sin(this.bobPhase + 0.3) * 1.2;
      ctx.rotate(bugBodyA * Math.PI / 180);
      ctx.translate(-75, -50);
      ctx.save();
      ctx.translate(this.vib.x, this.vib.y);
      this.drawWord(ctx, BUG_LETTERS, BUG_FILL);
      ctx.restore();
      this.drawAntennae(ctx);
      ctx.restore();

      ctx.restore();
    }

    drawTail(ctx, wordWidth, fill) {
      // 글자 몸통 끝(오른쪽) 뒤에 작은 원 3개 — 배 끝 꼬리털 느낌
      // wordWidth는 LOVE_WIDTH/BUG_WIDTH
      const tailX = wordWidth - 20;
      const positions = [
        { x: tailX + 12, y: 28, r: 5 },
        { x: tailX + 22, y: 22, r: 3.5 },
        { x: tailX + 28, y: 34, r: 2.8 },
      ];
      ctx.strokeStyle = STROKE;
      ctx.lineWidth = 2;
      for (const p of positions) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(p.r - 1, 1), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawWord(ctx, letters, fill) {
      // 각 원마다 개별 fill + stroke (lovebug2 스타일)
      ctx.strokeStyle = STROKE;
      ctx.lineWidth = 3;
      ctx.fillStyle = fill;
      for (const [ch, offsetX] of letters) {
        const pattern = LETTER[ch];
        if (!pattern) continue;
        for (const [col, row] of pattern) {
          const cx = offsetX + col * SPACING;
          const cy = row * SPACING;
          ctx.beginPath();
          ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    drawAntennae(ctx) {
      // L의 머리 원(col=0, row=0) 중심 (0, 0)에서 V자로 뻗음
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      // 왼쪽 더듬이: L 머리 위쪽에서 왼쪽 위로
      ctx.beginPath();
      ctx.moveTo(-2, -6); ctx.lineTo(-10, -22);
      ctx.stroke();
      // 오른쪽 더듬이: L 머리 위쪽에서 오른쪽 위로
      ctx.beginPath();
      ctx.moveTo(2, -6); ctx.lineTo(10, -22);
      ctx.stroke();
      // 끝 bulb
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-10, -22, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(10, -22, 4.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ─── 월드 ───
  const MAX_PAIRS = 4;
  const pairs = [];
  let killCount = 0;
  let respawnTimer = 0;

  function spawnPair() {
    // 방향 섞기: 기존 쌍들의 방향과 다른 쪽 선호
    const rightCount = pairs.filter(p => p.dir > 0).length;
    const leftCount = pairs.filter(p => p.dir < 0).length;
    const dir = rightCount < leftCount ? 1 : (leftCount < rightCount ? -1 : (Math.random() < 0.5 ? 1 : -1));
    pairs.push(new LovebugPair(dir));
  }
  for (let i = 0; i < 2; i++) spawnPair();

  stage.addEventListener('pointerdown', (e) => {
    const rect = stage.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (let i = pairs.length - 1; i >= 0; i--) {
      const p = pairs[i];
      if (p.hitTest(mx, my)) {
        p.explode();
        playSwat();
        killCount++;
        countEl.textContent = killCount;
        break;
      }
    }
  });

  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    for (const p of pairs) p.update(dt);
    for (let i = pairs.length - 1; i >= 0; i--) {
      if (pairs[i].state === 'dead') pairs.splice(i, 1);
    }
    if (pairs.length < MAX_PAIRS) {
      respawnTimer += dt;
      if (respawnTimer > 1.5) { spawnPair(); respawnTimer = 0; }
    } else {
      respawnTimer = 0;
    }
    ctx.clearRect(0, 0, W, H);
    for (const p of pairs) p.draw(ctx);

    // 붕붕 배경음 볼륨: 날아다니는 쌍 개수에 비례
    const flyingCount = pairs.filter(p => p.state === 'flying').length;
    updateHoverVolume(flyingCount);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
