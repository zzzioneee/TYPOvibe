// Day 8 — 소문의 낙원 (실리카겔)
// 클로드코드에서 만든 lettering.jsx를 vanilla JS로 포팅.
// 66개 path(stroke+ext+flourish)를 자소 순서(ㅅ→ㅗ→ㅁ→ㅜ→ㄴ→ㅇ→ㅡ→ㅣ→ㄴ→ㅏ→ㄱ→ㅇ→ㅜ→ㅓ→ㄴ)로 자라나기.

(() => {
  console.log('[day8] start');
  window.addEventListener('error', (e) => {
    console.error('[day8] error', e.message, e.filename, e.lineno);
  });

  const typoWrap = document.getElementById('typoWrap');
  const unmuteBtn = document.getElementById('unmuteBtn');
  const playHint = document.getElementById('playHint');
  const ytFrame = document.getElementById('ytplayer');

  // ─── STROKES (from lettering.jsx) ───
  const STROKES = [
    // === 소 ===
    { d: "M 295 205 C 275 188, 252 198, 258 218 C 263 233, 282 232, 285 220 C 293 242, 268 258, 275 280 C 283 302, 253 318, 258 340 C 263 362, 232 378, 230 402 C 227 418, 208 422, 195 410 C 182 398, 162 412, 152 402 C 142 392, 152 378, 163 388 C 172 396, 165 410, 158 405", role: "stroke" },
    { d: "M 310 205 C 330 188, 353 198, 347 218 C 342 233, 323 232, 320 220 C 312 242, 337 258, 330 280 C 322 302, 352 318, 347 340 C 342 362, 373 378, 375 402 C 378 418, 397 422, 410 410 C 423 398, 443 412, 453 402 C 463 392, 453 378, 442 388 C 433 396, 440 410, 447 405", role: "stroke" },
    { d: "M 300 420 C 293 435, 303 452, 295 468 C 287 484, 302 495, 293 508 C 286 518, 273 508, 281 500", role: "stroke" },
    { d: "M 170 508 C 150 500, 135 485, 148 475 C 163 465, 178 480, 172 498 C 190 512, 215 498, 235 510 C 255 522, 280 500, 305 512 C 328 522, 355 500, 380 510 C 400 518, 420 505, 440 495 C 452 488, 465 498, 462 510 C 458 522, 443 522, 438 510", role: "stroke" },
    // 소 extensions
    { d: "M 258 218 C 225 195, 180 180, 130 185 C 80 195, 48 220, 55 250", role: "ext" },
    { d: "M 447 405 C 470 418, 478 438, 462 458", role: "ext" },
    { d: "M 148 475 C 108 482, 68 498, 52 528", role: "ext" },
    { d: "M 462 510 C 488 504, 504 488, 498 472", role: "ext" },
    // === 문 ===
    { d: "M 478 202 C 465 190, 470 172, 485 172 C 500 172, 502 188, 492 198 C 488 218, 498 248, 488 278 C 481 298, 498 318, 488 332 C 498 336, 530 332, 560 336 C 595 332, 640 338, 685 334 C 708 333, 730 340, 742 328 C 750 318, 740 295, 745 275 C 742 248, 748 218, 740 195 C 735 182, 748 170, 760 178 C 772 186, 765 200, 753 205 C 735 215, 710 222, 680 218 C 640 218, 570 222, 520 218 C 495 218, 480 215, 478 208", role: "stroke" },
    { d: "M 442 400 C 425 392, 422 375, 435 368 C 450 362, 462 377, 455 392 C 475 405, 500 395, 525 405 C 552 415, 580 395, 605 405 C 632 415, 660 395, 685 405 C 712 415, 740 395, 762 400 C 780 403, 795 388, 790 398 C 787 408, 775 406, 770 398", role: "stroke" },
    { d: "M 600 412 C 593 428, 607 445, 598 462 C 590 478, 605 490, 598 502 C 590 512, 578 500, 585 490", role: "stroke" },
    { d: "M 480 562 C 465 552, 462 535, 475 528 C 490 522, 498 538, 492 548 C 496 568, 488 595, 493 620 C 498 645, 488 670, 502 680 C 522 685, 555 680, 585 684 C 618 688, 655 682, 688 685 C 712 687, 745 682, 755 692 C 762 705, 748 712, 738 708 C 730 703, 735 698, 728 702", role: "stroke" },
    // 문 extensions
    { d: "M 485 172 C 478 148, 492 118, 525 110 C 555 105, 578 125, 565 142 C 552 158, 532 150, 542 138", role: "ext" },
    { d: "M 760 178 C 755 150, 780 120, 815 110 C 848 102, 870 128, 852 148 C 835 165, 818 150, 830 138", role: "ext" },
    { d: "M 790 398 C 818 388, 852 398, 862 420 C 870 438, 852 452, 838 443 C 828 435, 838 425, 848 432", role: "ext" },
    { d: "M 745 712 C 772 728, 800 728, 815 712 C 825 700, 838 712, 830 728 C 822 742, 808 738, 815 728", role: "ext" },
    // === 의 ===
    { d: "M 880 220 C 860 205, 830 215, 815 238 C 798 262, 775 282, 790 310 C 800 330, 805 355, 830 360 C 856 368, 885 378, 910 362 C 938 348, 958 325, 945 298 C 938 278, 955 258, 935 248 C 915 228, 892 232, 880 245 C 870 258, 880 275, 892 272", role: "stroke" },
    { d: "M 1028 195 C 1015 182, 1010 165, 1022 158 C 1035 152, 1045 168, 1038 180 C 1043 215, 1028 255, 1040 290 C 1050 322, 1030 358, 1042 390 C 1050 418, 1028 448, 1043 460 C 1055 470, 1055 458, 1048 455", role: "stroke" },
    { d: "M 795 492 C 780 485, 773 468, 788 462 C 803 457, 812 473, 805 485 C 825 500, 850 488, 875 498 C 900 508, 925 490, 950 498 C 975 508, 1000 490, 1025 498 C 1050 508, 1075 490, 1090 485 C 1105 478, 1118 488, 1115 500 C 1112 512, 1098 512, 1095 500", role: "stroke" },
    // 의 extensions
    { d: "M 880 222 C 872 192, 888 158, 918 150 C 948 143, 972 165, 958 182 C 944 198, 925 190, 932 178", role: "ext" },
    { d: "M 1035 160 C 1058 128, 1095 112, 1135 120 C 1168 128, 1178 158, 1152 168 C 1128 175, 1115 158, 1128 148 C 1140 140, 1152 148, 1150 160", role: "ext" },
    { d: "M 1048 460 C 1062 498, 1080 538, 1082 580 C 1082 615, 1068 648, 1050 668 C 1035 680, 1025 670, 1032 660", role: "ext" },
    { d: "M 1115 500 C 1142 498, 1170 512, 1178 540 C 1182 565, 1162 582, 1148 570 C 1138 560, 1150 548, 1160 558 C 1168 568, 1162 580, 1152 576", role: "ext" },
    // === 낙 ===
    { d: "M 240 720 C 225 710, 220 693, 233 685 C 247 678, 257 693, 250 708 C 255 740, 245 785, 253 830 C 260 872, 245 910, 255 940 C 260 950, 275 955, 293 953 C 325 955, 362 952, 398 954 C 420 955, 445 948, 455 934 C 462 922, 453 918, 445 928 C 440 935, 435 930, 440 925", role: "stroke" },
    { d: "M 470 720 C 455 710, 450 693, 463 685 C 477 678, 487 693, 480 708 C 485 745, 473 790, 483 832 C 490 875, 475 918, 483 955 C 488 970, 472 982, 460 972 C 450 964, 458 952, 468 958", role: "stroke" },
    { d: "M 485 832 C 508 830, 530 835, 550 832 C 565 830, 575 842, 568 852 C 560 860, 548 855, 553 848", role: "stroke" },
    { d: "M 205 995 C 190 988, 183 972, 195 965 C 210 958, 222 973, 215 988 C 245 1005, 280 993, 315 1002 C 350 1012, 385 992, 420 1002 C 450 1010, 480 995, 498 1002 C 518 1005, 530 1018, 525 1033 C 522 1062, 527 1102, 520 1132 C 517 1145, 503 1150, 493 1142 C 485 1134, 495 1122, 503 1128", role: "stroke" },
    // 낙 extensions
    { d: "M 233 685 C 218 650, 198 612, 175 588 C 155 568, 130 575, 128 598 C 128 620, 148 628, 160 615 C 170 605, 160 590, 150 598", role: "ext" },
    { d: "M 463 685 C 455 652, 475 618, 502 598 C 525 582, 548 592, 542 612 C 538 628, 518 625, 525 615", role: "ext" },
    { d: "M 195 965 C 162 972, 125 958, 92 972 C 62 985, 52 1015, 78 1025 C 105 1035, 122 1012, 105 1000 C 92 992, 82 1008, 92 1018", role: "ext" },
    { d: "M 510 1145 C 505 1170, 482 1185, 452 1182 C 428 1178, 425 1162, 443 1158 C 458 1155, 460 1172, 450 1172", role: "ext" },
    // === 원 ===
    { d: "M 720 745 C 700 735, 672 745, 655 770 C 638 795, 652 820, 670 838 C 685 850, 705 858, 728 852 C 750 848, 775 835, 780 815 C 790 795, 780 770, 765 755 C 750 742, 728 740, 718 752 C 712 762, 722 775, 732 770", role: "stroke" },
    { d: "M 1005 730 C 990 720, 985 703, 998 695 C 1012 688, 1022 703, 1015 715 C 1020 750, 1005 795, 1017 835 C 1025 870, 1008 910, 1015 945 C 1017 960, 1003 970, 993 962 C 984 954, 990 942, 998 948", role: "stroke" },
    { d: "M 945 822 C 928 818, 922 802, 935 795 C 948 788, 958 803, 950 815 C 972 820, 990 815, 1002 815", role: "stroke" },
    { d: "M 645 880 C 628 872, 622 858, 635 852 C 650 845, 660 860, 653 872 C 675 890, 705 878, 735 890 C 765 900, 795 880, 825 890 C 855 900, 885 880, 915 888 C 945 895, 970 880, 985 868 C 995 860, 1005 870, 995 878 C 988 885, 980 880, 982 872", role: "stroke" },
    { d: "M 805 888 C 800 903, 810 920, 803 935 C 798 945, 810 958, 802 968 C 795 975, 783 966, 790 958", role: "stroke" },
    { d: "M 658 1000 C 642 992, 635 975, 648 967 C 662 959, 673 975, 667 988 C 672 1020, 662 1055, 670 1090 C 675 1112, 685 1128, 708 1128 C 752 1130, 798 1120, 838 1128 C 875 1132, 910 1122, 945 1128 C 980 1132, 1012 1122, 1035 1128 C 1048 1130, 1058 1118, 1048 1108 C 1040 1100, 1028 1108, 1032 1116", role: "stroke" },
    // 원 extensions
    { d: "M 720 745 C 705 710, 735 670, 778 682", role: "ext" },
    { d: "M 998 695 C 1025 675, 1075 672, 1102 702", role: "ext" },
    { d: "M 790 958 C 795 985, 785 1015, 770 1020 C 758 1022, 755 1008, 765 1005", role: "ext" },
    { d: "M 1048 1118 C 1075 1140, 1098 1168, 1090 1190 C 1082 1208, 1060 1202, 1058 1185 C 1058 1172, 1075 1172, 1072 1185", role: "ext" },
    // === Flourishes (큰 커브) ===
    { d: "M 55 218 C 25 170, 45 95, 130 75 C 215 60, 280 115, 268 165 C 258 200, 215 205, 205 175", role: "flourish" },
    { d: "M 92 608 C 55 650, 30 725, 70 790 C 108 845, 165 830, 180 790", role: "flourish" },
    { d: "M 542 138 C 570 90, 640 78, 700 100 C 745 118, 748 150, 720 158", role: "flourish" },
    { d: "M 830 138 C 860 100, 920 85, 970 105 C 1008 122, 1010 150, 988 162", role: "flourish" },
    { d: "M 1150 160 C 1180 120, 1175 65, 1115 50 C 1055 38, 1000 65, 1010 100 C 1018 125, 1045 122, 1048 102", role: "flourish" },
    { d: "M 1178 540 C 1212 575, 1225 640, 1195 695 C 1168 745, 1115 745, 1098 708", role: "flourish" },
    { d: "M 1032 660 C 1060 700, 1085 735, 1075 780 C 1065 812, 1035 820, 1020 798", role: "flourish" },
    { d: "M 150 598 C 108 625, 72 700, 88 770 C 102 825, 85 885, 55 898", role: "flourish" },
    { d: "M 92 1018 C 58 1055, 30 1115, 80 1155 C 125 1185, 175 1175, 195 1145", role: "flourish" },
    { d: "M 525 615 C 548 590, 595 585, 625 608 C 648 628, 640 660, 610 658", role: "flourish" },
    { d: "M 450 1172 C 438 1202, 470 1232, 520 1238 C 565 1242, 595 1218, 585 1192", role: "flourish" },
    { d: "M 1072 1185 C 1115 1215, 1170 1205, 1188 1158 C 1202 1115, 1170 1080, 1138 1092", role: "flourish" },
    { d: "M 778 682 C 810 620, 795 550, 740 530", role: "flourish" },
    { d: "M 1102 702 C 1142 688, 1175 712, 1160 745", role: "flourish" },
    { d: "M 765 1005 C 748 1048, 762 1105, 725 1135 C 690 1158, 650 1142, 650 1110", role: "flourish" },
    // 광역 장식
    { d: "M 205 175 C 120 130, -30 130, -160 180 C -280 230, -320 310, -250 340 C -190 365, -140 300, -180 275", role: "flourish" },
    { d: "M 180 790 C 100 815, -20 810, -110 870 C -200 935, -210 1020, -130 1050 C -65 1072, -20 1020, -55 985", role: "flourish" },
    { d: "M -55 985 C -110 1080, -90 1170, 10 1200 C 115 1225, 225 1195, 290 1222", role: "flourish" },
    { d: "M 1048 102 C 1150 65, 1340 70, 1450 130 C 1560 195, 1570 285, 1490 320 C 1425 348, 1370 295, 1405 270", role: "flourish" },
    { d: "M 1098 708 C 1200 695, 1360 720, 1430 800 C 1490 870, 1470 960, 1390 985 C 1320 1005, 1278 960, 1305 925", role: "flourish" },
    { d: "M 1138 1092 C 1225 1080, 1360 1105, 1410 1170 L 1385 1230 C 1355 1258, 1280 1238, 1295 1200", role: "flourish" },
    { d: "M 1295 1200 C 1240 1255, 1110 1262, 990 1235 C 880 1210, 780 1222, 720 1245", role: "flourish" },
    { d: "M 130 75 C 50 30, -90 25, -220 65 C -330 100, -360 170, -300 200 C -245 228, -195 185, -225 165", role: "flourish" },
    { d: "M -300 200 C -370 270, -390 380, -320 450 C -260 510, -180 495, -165 455", role: "flourish" },
    { d: "M -130 1050 C -210 1095, -300 1095, -350 1040 C -380 995, -350 950, -295 955", role: "flourish" },
  ];

  // ─── 자소 그룹 (index list): ㅅ→ㅗ→ㅁ→ㅜ→ㄴ→ㅇ→ㅡ→ㅣ→ㄴ→ㅏ→ㄱ→ㅇ→ㅜ→ㅓ→ㄴ ───
  const JAMO_GROUPS = [
    { indices: [0, 1, 4, 5, 41, 56, 63, 64] },
    { indices: [2, 3, 6, 7, 42] },
    { indices: [8, 12, 13, 43] },
    { indices: [9, 10, 14] },
    { indices: [11, 15] },
    { indices: [16, 19, 44] },
    { indices: [18, 22, 46, 60] },
    { indices: [17, 20, 21, 45, 47, 59] },
    { indices: [23, 27, 48] },
    { indices: [24, 25, 28] },
    { indices: [26, 29, 30, 49, 50, 51, 57, 58, 65] },
    { indices: [31, 37, 53] },
    { indices: [34, 35, 39, 55] },
    { indices: [32, 33, 38, 54] },
    { indices: [36, 40, 52, 61, 62] },
  ];

  // ─── SVG 셋업 ───
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '-440 -30 2100 1330');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.maxWidth = '100vw';
  svg.style.maxHeight = '100vh';
  svg.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))';

  // wobble 필터 2종
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML = `
    <filter id="wobble" x="-460" y="-50" width="2150" height="1370" filterUnits="userSpaceOnUse">
      <feTurbulence id="turb1" type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="noise"/>
      <feDisplacementMap id="disp1" in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="wobble-soft" x="-460" y="-50" width="2150" height="1370" filterUnits="userSpaceOnUse">
      <feTurbulence id="turb2" type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="noise"/>
      <feDisplacementMap id="disp2" in="SourceGraphic" in2="noise" scale="1.0" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  `;
  svg.appendChild(defs);

  // stroke 그룹 (본체, soft wobble)
  const gStroke = document.createElementNS(SVG_NS, 'g');
  gStroke.setAttribute('filter', 'url(#wobble-soft)');
  // ext + flourish 그룹 (full wobble)
  const gDeco = document.createElementNS(SVG_NS, 'g');
  gDeco.setAttribute('filter', 'url(#wobble)');
  svg.appendChild(gStroke);
  svg.appendChild(gDeco);

  typoWrap.appendChild(svg);

  // path 생성
  const STROKE_WIDTH = 16;
  const EXT_SCALE = 1.0;
  const pathEls = new Array(STROKES.length);
  STROKES.forEach((s, i) => {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', s.d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', '#ffffff');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    let sw = STROKE_WIDTH;
    if (s.role === 'ext') sw = STROKE_WIDTH * 0.9 * EXT_SCALE;
    else if (s.role === 'flourish') sw = STROKE_WIDTH * 0.8 * EXT_SCALE;
    p.setAttribute('stroke-width', sw);
    (s.role === 'stroke' ? gStroke : gDeco).appendChild(p);
    pathEls[i] = p;
  });

  // 길이 측정
  const lengths = pathEls.map((p) => {
    try { return p.getTotalLength(); } catch { return 1000; }
  });

  // 초기 상태: 전부 숨김
  pathEls.forEach((p, i) => {
    p.style.strokeDasharray = lengths[i];
    p.style.strokeDashoffset = lengths[i];
  });

  // 시작/끝점 추출 (d 문자열의 앞뒤 숫자)
  const endpoints = STROKES.map(({ d }) => {
    const nums = d.match(/-?\d+\.?\d*/g).map(Number);
    return {
      start: [nums[0], nums[1]],
      end: [nums[nums.length - 2], nums[nums.length - 1]],
    };
  });

  // 자소 그룹 내부 greedy 순서 계산
  // ─── 순서 계산: Phase A (stroke 본체) → Phase B (ext + flourish) ───
  // 각 Phase 안에서는 자소 그룹 순서 + greedy 근접 배치
  function computeOrder(roleFilter) {
    const out = [];
    let penPos = null;
    for (const { indices } of JAMO_GROUPS) {
      // 이 그룹에서 roleFilter를 통과하는 애들만
      const group = new Set(indices.filter(i => roleFilter(STROKES[i].role)));
      if (group.size === 0) continue;
      let current;
      if (penPos === null) {
        let best = Infinity;
        for (const i of group) {
          const [x, y] = endpoints[i].start;
          const score = y * 2 + x;
          if (score < best) { best = score; current = i; }
        }
      } else {
        let bestScore = Infinity;
        for (const i of group) {
          const [sx, sy] = endpoints[i].start;
          const dx = sx - penPos[0], dy = sy - penPos[1];
          const dist = dx * dx + dy * dy;
          if (dist < bestScore) { bestScore = dist; current = i; }
        }
      }
      out.push(current);
      group.delete(current);
      penPos = endpoints[current].end;
      while (group.size > 0) {
        let bestIdx = -1, bestDist = Infinity;
        for (const i of group) {
          const [sx, sy] = endpoints[i].start;
          const dx = sx - penPos[0], dy = sy - penPos[1];
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) { bestDist = dist; bestIdx = i; }
        }
        out.push(bestIdx);
        group.delete(bestIdx);
        penPos = endpoints[bestIdx].end;
      }
    }
    // 그룹에 안 들어간 index (광역 flourish 등)를 역할이 맞으면 뒤에 추가
    for (let i = 0; i < STROKES.length; i++) {
      if (!roleFilter(STROKES[i].role)) continue;
      if (!out.includes(i)) out.push(i);
    }
    return out;
  }

  const phaseA = computeOrder(r => r === 'stroke');      // 글자 본체
  const phaseB = computeOrder(r => r !== 'stroke');      // 장식 (ext + flourish)

  // ─── 장식 path: 텍스트 중심에 가까운 쪽을 "뿌리(시작점)"로 결정 ───
  // 텍스트 본체(Phase A)의 모든 endpoints 평균으로 중심 계산
  const textCenter = (() => {
    let sx = 0, sy = 0, n = 0;
    for (const i of phaseA) {
      sx += endpoints[i].start[0] + endpoints[i].end[0];
      sy += endpoints[i].start[1] + endpoints[i].end[1];
      n += 2;
    }
    return n > 0 ? [sx / n, sy / n] : [600, 600];
  })();

  // 각 장식 path는 두 끝점 중 텍스트 중심에 더 가까운 쪽에서 시작.
  // path는 SVG d 속성에서 "M start ... end" 구조. d 자체의 시작이 이미 가까우면 그대로(=reversed false),
  // 끝이 더 가까우면 dashoffset 음수 방향으로 보간해서 "끝점에서 시작점으로" 그려지게 함.
  const reversedSet = new Set();
  for (const i of phaseB) {
    const ep = endpoints[i];
    const dxS = ep.start[0] - textCenter[0], dyS = ep.start[1] - textCenter[1];
    const dxE = ep.end[0] - textCenter[0],   dyE = ep.end[1] - textCenter[1];
    const distS = dxS * dxS + dyS * dyS;
    const distE = dxE * dxE + dyE * dyE;
    if (distE < distS) reversedSet.add(i);
  }

  // reversed 인 path는 dashoffset을 음수로 설정하여 끝점부터 그리게 함
  for (const i of reversedSet) {
    pathEls[i].style.strokeDashoffset = -lengths[i];
  }



  // ─── 타이밍: Phase A 먼저 → Phase B ───
  const SPEED_A = 14;   // 글자 본체 드로잉 시간
  const SPEED_B = 12;   // 장식 드로잉 시간
  const PHASE_GAP = 0.5; // A 끝나고 살짝 쉬었다가 B 시작

  const delays = {};
  const durations = {};

  function layoutPhase(order, speed, tStart) {
    const totalLen = order.reduce((sum, i) => sum + (lengths[i] || 1000), 0) || 1;
    let t = tStart;
    let lastEnd = tStart;
    for (const i of order) {
      delays[i] = t;
      const dur = Math.max(((lengths[i] || 1000) / totalLen) * speed, 0.3);
      durations[i] = dur;
      lastEnd = Math.max(lastEnd, t + dur);
      t += dur * 0.55; // 약간 오버랩
    }
    return lastEnd;
  }

  const endA = layoutPhase(phaseA, SPEED_A, 0);
  const endB = layoutPhase(phaseB, SPEED_B, endA + PHASE_GAP);

  console.log('[day8] rendered ' + STROKES.length + ' paths, phaseA=' + phaseA.length + ' phaseB=' + phaseB.length);

  let animStarted = false;
  let t0 = 0;
  const START_DELAY = 1.5; // 뮤비 로드 후

  // ─── 사이클 타이밍 ───
  const DRAW_DUR = endB;         // 전체 그리기 시간
  const HOLD_DUR = 2.0;          // 완성 후 유지
  const ERASE_DUR = DRAW_DUR * 0.6; // 지우기 (조금 더 빠르게)
  const PAUSE_DUR = 1.0;         // 다음 사이클 전 쉼
  const CYCLE_DUR = DRAW_DUR + HOLD_DUR + ERASE_DUR + PAUSE_DUR;

  // ERASE: 나중에 그려진 path가 먼저 사라짐. erase delay = DRAW 종료 시점 - (원본 delay + 원본 dur)
  const eraseDelays = {};
  const eraseDurations = {};
  for (let i = 0; i < STROKES.length; i++) {
    const d = delays[i] || 0;
    const du = durations[i] || 1;
    // 원본 drawing의 완성 시점 (d + du)이 늦을수록 erase는 먼저 시작
    const origEnd = d + du;
    const timeFromDrawEnd = DRAW_DUR - origEnd; // 작을수록 "나중에 완성"된 path
    // erase 길이는 원본 dur의 0.6x로 빠르게
    const eDur = Math.max(du * 0.6, 0.2);
    eraseDurations[i] = eDur;
    // erase delay = timeFromDrawEnd를 ERASE_DUR 스케일로 매핑
    // 나중 완성(timeFromDrawEnd=0) → 먼저 지움(eraseDelay=0)
    // 먼저 완성(timeFromDrawEnd=DRAW_DUR) → 나중 지움(eraseDelay=ERASE_DUR - eDur)
    const ratio = DRAW_DUR > 0 ? timeFromDrawEnd / DRAW_DUR : 0;
    eraseDelays[i] = ratio * Math.max(ERASE_DUR - eDur, 0);
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function setOffset(i, progress01) {
    // progress01: 0 = 완전히 안 그려짐, 1 = 완전히 그려짐
    const base = reversedSet.has(i) ? -lengths[i] : lengths[i];
    pathEls[i].style.strokeDashoffset = base * (1 - progress01);
  }

  function tick() {
    if (animStarted) {
      const absT = performance.now() / 1000 - t0;
      const cycleT = absT % CYCLE_DUR;

      for (let i = 0; i < STROKES.length; i++) {
        let progress; // 0 ~ 1
        if (cycleT < DRAW_DUR) {
          // 단계 1: DRAW
          const delay = delays[i] || 0;
          const dur = durations[i] || 1;
          const lt = (cycleT - delay) / dur;
          if (lt <= 0) progress = 0;
          else if (lt >= 1) progress = 1;
          else progress = easeOut(lt);
        } else if (cycleT < DRAW_DUR + HOLD_DUR) {
          // 단계 2: HOLD
          progress = 1;
        } else if (cycleT < DRAW_DUR + HOLD_DUR + ERASE_DUR) {
          // 단계 3: ERASE (역순)
          const et = cycleT - DRAW_DUR - HOLD_DUR;
          const eDelay = eraseDelays[i] || 0;
          const eDur = eraseDurations[i] || 1;
          const lt = (et - eDelay) / eDur;
          if (lt <= 0) progress = 1;          // 아직 내 차례 아님 → 그려진 상태 유지
          else if (lt >= 1) progress = 0;     // 내 차례 끝 → 완전 지워짐
          else progress = 1 - easeOut(lt);    // 점점 사라짐
        } else {
          // 단계 4: PAUSE (다 지워진 상태)
          progress = 0;
        }
        setOffset(i, progress);
      }
    }
    requestAnimationFrame(tick);
  }
  tick();


  setTimeout(() => {
    animStarted = true;
    t0 = performance.now() / 1000;
    console.log('[day8] anim started');
  }, START_DELAY * 1000);


  // ─── 찌글찌글 모션 (새싹 생장감) ───
  // 그려지는 중인 path가 많을수록 wobble 강도 증가 → 다 자라면 차분해짐
  const turb1 = document.getElementById('turb1');
  const turb2 = document.getElementById('turb2');
  const disp1 = document.getElementById('disp1');
  const disp2 = document.getElementById('disp2');
  let wiggleSeed = 7;
  let wiggleLastUpdate = 0;
  const WIGGLE_INTERVAL = 200; // ~18fps — 빠르게 떨리는 느낌

  // 기본 (안정 시) 값 / 최대 (생장 시) 값
  const BASE_SCALE_1 = 3.0, GROW_SCALE_1 = 5.5;   // flourish/ext (강)
  const BASE_SCALE_2 = 1.4, GROW_SCALE_2 = 2.4;   // stroke 본체 (약)
  const BASE_FREQ = 0.022, GROW_FREQ = 0.030;

  function growthAmount() {
    if (!animStarted) return 0;
    const absT = performance.now() / 1000 - t0;
    const cycleT = absT % CYCLE_DUR;

    // DRAW 단계에서는 현재 "그려지는 중"인 path 비율로 계산
    if (cycleT < DRAW_DUR) {
      let drawingCount = 0;
      for (let i = 0; i < STROKES.length; i++) {
        const delay = delays[i] || 0;
        const dur = durations[i] || 1;
        const t = (cycleT - delay) / dur;
        if (t > 0 && t < 1) drawingCount++;
      }
      return Math.min(1, drawingCount / 3);
    }
    // ERASE 단계에서는 지워지는 중인 path 비율
    if (cycleT >= DRAW_DUR + HOLD_DUR && cycleT < DRAW_DUR + HOLD_DUR + ERASE_DUR) {
      const et = cycleT - DRAW_DUR - HOLD_DUR;
      let erasingCount = 0;
      for (let i = 0; i < STROKES.length; i++) {
        const d = eraseDelays[i] || 0;
        const du = eraseDurations[i] || 1;
        const t = (et - d) / du;
        if (t > 0 && t < 1) erasingCount++;
      }
      return Math.min(1, erasingCount / 3);
    }
    // HOLD / PAUSE 단계: 0 (안정)
    return 0;
  }
  function wiggle() {
    const nowMs = performance.now();
    if (nowMs - wiggleLastUpdate > WIGGLE_INTERVAL) {
      wiggleLastUpdate = nowMs;
      wiggleSeed = (wiggleSeed + 1) % 10000;
      const g = growthAmount(); // 0~1
      const breathing = Math.sin(nowMs * 0.004);
      const scale1 = BASE_SCALE_1 + (GROW_SCALE_1 - BASE_SCALE_1) * g + breathing * 0.3;
      const scale2 = BASE_SCALE_2 + (GROW_SCALE_2 - BASE_SCALE_2) * g + breathing * 0.15;
      const freq = BASE_FREQ + (GROW_FREQ - BASE_FREQ) * g + breathing * 0.001;

      if (turb1) {
        turb1.setAttribute('seed', wiggleSeed);
        turb1.setAttribute('baseFrequency', freq.toFixed(4));
      }
      if (turb2) {
        turb2.setAttribute('seed', wiggleSeed + 13);
        turb2.setAttribute('baseFrequency', freq.toFixed(4));
      }
      if (disp1) disp1.setAttribute('scale', scale1.toFixed(2));
      if (disp2) disp2.setAttribute('scale', scale2.toFixed(2));
    }
    requestAnimationFrame(wiggle);
  }
  wiggle();


  // ─── YouTube IFrame API 로드 + 언뮤트 (src 재로딩 없이) ───
  let ytPlayer = null;

  // API 스크립트가 아직 없으면 주입
  if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  // API 준비되면 기존 iframe을 YT.Player로 래핑
  function initPlayer() {
    if (!window.YT || !window.YT.Player) return;
    try {
      ytPlayer = new YT.Player('ytplayer', {
        events: {
          onReady: () => {
            try { ytPlayer.mute(); ytPlayer.playVideo(); } catch (e) {}
          },
        },
      });
    } catch (e) {
      console.warn('[day8] YT player init failed', e);
    }
  }

  window.onYouTubeIframeAPIReady = initPlayer;
  // 이미 API 로드된 경우 대비
  if (window.YT && window.YT.Player) initPlayer();

  if (unmuteBtn) {
    unmuteBtn.addEventListener('click', () => {
      if (ytPlayer && typeof ytPlayer.unMute === 'function') {
        try {
          ytPlayer.unMute();
          ytPlayer.setVolume(80);
          ytPlayer.playVideo();
        } catch (e) { console.warn('[day8] unmute failed', e); }
      } else {
        // API 아직 로드 전 fallback: src 재설정 (리로드 동반)
        const src = ytFrame.src;
        if (src.includes('mute=1')) {
          ytFrame.src = src.replace('mute=1', 'mute=0');
        }
      }
      if (playHint) playHint.classList.add('hidden');
      unmuteBtn.style.pointerEvents = 'none';
      unmuteBtn.style.display = 'none';
    });
  }
})();
