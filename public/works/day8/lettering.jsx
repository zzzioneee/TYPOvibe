// 소문의 낙원 — vine lettering v4
// Base: user-supplied v6 SVG letterforms. Decorations are extensions + flourishes
// that grow from letter terminals. Everything gets a wobble filter for hand-drawn feel.

const { useState, useEffect, useRef, useMemo } = React;

const STROKES = [
  // === 소 ===
  { d: "M 295 205 C 275 188, 252 198, 258 218 C 263 233, 282 232, 285 220 C 293 242, 268 258, 275 280 C 283 302, 253 318, 258 340 C 263 362, 232 378, 230 402 C 227 418, 208 422, 195 410 C 182 398, 162 412, 152 402 C 142 392, 152 378, 163 388 C 172 396, 165 410, 158 405", letter: "소", role: "stroke" },
  { d: "M 310 205 C 330 188, 353 198, 347 218 C 342 233, 323 232, 320 220 C 312 242, 337 258, 330 280 C 322 302, 352 318, 347 340 C 342 362, 373 378, 375 402 C 378 418, 397 422, 410 410 C 423 398, 443 412, 453 402 C 463 392, 453 378, 442 388 C 433 396, 440 410, 447 405", letter: "소", role: "stroke" },
  { d: "M 300 420 C 293 435, 303 452, 295 468 C 287 484, 302 495, 293 508 C 286 518, 273 508, 281 500", letter: "소", role: "stroke" },
  { d: "M 170 508 C 150 500, 135 485, 148 475 C 163 465, 178 480, 172 498 C 190 512, 215 498, 235 510 C 255 522, 280 500, 305 512 C 328 522, 355 500, 380 510 C 400 518, 420 505, 440 495 C 452 488, 465 498, 462 510 C 458 522, 443 522, 438 510", letter: "소", role: "stroke" },

  // 소 extensions (깔끔한 아치 — 내부 루프 제거)
  { d: "M 258 218 C 225 195, 180 180, 130 185 C 80 195, 48 220, 55 250", letter: "소", role: "ext" },
  { d: "M 447 405 C 470 418, 478 438, 462 458", letter: "소", role: "ext" },
  { d: "M 148 475 C 108 482, 68 498, 52 528", letter: "소", role: "ext" },
  { d: "M 462 510 C 488 504, 504 488, 498 472", letter: "소", role: "ext" },

  // === 문 ===
  { d: "M 478 202 C 465 190, 470 172, 485 172 C 500 172, 502 188, 492 198 C 488 218, 498 248, 488 278 C 481 298, 498 318, 488 332 C 498 336, 530 332, 560 336 C 595 332, 640 338, 685 334 C 708 333, 730 340, 742 328 C 750 318, 740 295, 745 275 C 742 248, 748 218, 740 195 C 735 182, 748 170, 760 178 C 772 186, 765 200, 753 205 C 735 215, 710 222, 680 218 C 640 218, 570 222, 520 218 C 495 218, 480 215, 478 208", letter: "문", role: "stroke" },
  { d: "M 442 400 C 425 392, 422 375, 435 368 C 450 362, 462 377, 455 392 C 475 405, 500 395, 525 405 C 552 415, 580 395, 605 405 C 632 415, 660 395, 685 405 C 712 415, 740 395, 762 400 C 780 403, 795 388, 790 398 C 787 408, 775 406, 770 398", letter: "문", role: "stroke" },
  { d: "M 600 412 C 593 428, 607 445, 598 462 C 590 478, 605 490, 598 502 C 590 512, 578 500, 585 490", letter: "문", role: "stroke" },
  { d: "M 480 562 C 465 552, 462 535, 475 528 C 490 522, 498 538, 492 548 C 496 568, 488 595, 493 620 C 498 645, 488 670, 502 680 C 522 685, 555 680, 585 684 C 618 688, 655 682, 688 685 C 712 687, 745 682, 755 692 C 762 705, 748 712, 738 708 C 730 703, 735 698, 728 702", letter: "문", role: "stroke" },

  // 문 extensions
  { d: "M 485 172 C 478 148, 492 118, 525 110 C 555 105, 578 125, 565 142 C 552 158, 532 150, 542 138", letter: "문", role: "ext" },
  { d: "M 760 178 C 755 150, 780 120, 815 110 C 848 102, 870 128, 852 148 C 835 165, 818 150, 830 138", letter: "문", role: "ext" },
  { d: "M 790 398 C 818 388, 852 398, 862 420 C 870 438, 852 452, 838 443 C 828 435, 838 425, 848 432", letter: "문", role: "ext" },
  { d: "M 745 712 C 772 728, 800 728, 815 712 C 825 700, 838 712, 830 728 C 822 742, 808 738, 815 728", letter: "문", role: "ext" },

  // === 의 ===
  { d: "M 880 220 C 860 205, 830 215, 815 238 C 798 262, 775 282, 790 310 C 800 330, 805 355, 830 360 C 856 368, 885 378, 910 362 C 938 348, 958 325, 945 298 C 938 278, 955 258, 935 248 C 915 228, 892 232, 880 245 C 870 258, 880 275, 892 272", letter: "의", role: "stroke" },
  { d: "M 1028 195 C 1015 182, 1010 165, 1022 158 C 1035 152, 1045 168, 1038 180 C 1043 215, 1028 255, 1040 290 C 1050 322, 1030 358, 1042 390 C 1050 418, 1028 448, 1043 460 C 1055 470, 1055 458, 1048 455", letter: "의", role: "stroke" },
  { d: "M 795 492 C 780 485, 773 468, 788 462 C 803 457, 812 473, 805 485 C 825 500, 850 488, 875 498 C 900 508, 925 490, 950 498 C 975 508, 1000 490, 1025 498 C 1050 508, 1075 490, 1090 485 C 1105 478, 1118 488, 1115 500 C 1112 512, 1098 512, 1095 500", letter: "의", role: "stroke" },

  // 의 extensions
  { d: "M 880 222 C 872 192, 888 158, 918 150 C 948 143, 972 165, 958 182 C 944 198, 925 190, 932 178", letter: "의", role: "ext" },
  { d: "M 1035 160 C 1058 128, 1095 112, 1135 120 C 1168 128, 1178 158, 1152 168 C 1128 175, 1115 158, 1128 148 C 1140 140, 1152 148, 1150 160", letter: "의", role: "ext" },
  { d: "M 1048 460 C 1062 498, 1080 538, 1082 580 C 1082 615, 1068 648, 1050 668 C 1035 680, 1025 670, 1032 660", letter: "의", role: "ext" },
  { d: "M 1115 500 C 1142 498, 1170 512, 1178 540 C 1182 565, 1162 582, 1148 570 C 1138 560, 1150 548, 1160 558 C 1168 568, 1162 580, 1152 576", letter: "의", role: "ext" },

  // === 낙 ===
  { d: "M 240 720 C 225 710, 220 693, 233 685 C 247 678, 257 693, 250 708 C 255 740, 245 785, 253 830 C 260 872, 245 910, 255 940 C 260 950, 275 955, 293 953 C 325 955, 362 952, 398 954 C 420 955, 445 948, 455 934 C 462 922, 453 918, 445 928 C 440 935, 435 930, 440 925", letter: "낙", role: "stroke" },
  { d: "M 470 720 C 455 710, 450 693, 463 685 C 477 678, 487 693, 480 708 C 485 745, 473 790, 483 832 C 490 875, 475 918, 483 955 C 488 970, 472 982, 460 972 C 450 964, 458 952, 468 958", letter: "낙", role: "stroke" },
  { d: "M 485 832 C 508 830, 530 835, 550 832 C 565 830, 575 842, 568 852 C 560 860, 548 855, 553 848", letter: "낙", role: "stroke" },
  { d: "M 205 995 C 190 988, 183 972, 195 965 C 210 958, 222 973, 215 988 C 245 1005, 280 993, 315 1002 C 350 1012, 385 992, 420 1002 C 450 1010, 480 995, 498 1002 C 518 1005, 530 1018, 525 1033 C 522 1062, 527 1102, 520 1132 C 517 1145, 503 1150, 493 1142 C 485 1134, 495 1122, 503 1128", letter: "낙", role: "stroke" },

  // 낙 extensions
  { d: "M 233 685 C 218 650, 198 612, 175 588 C 155 568, 130 575, 128 598 C 128 620, 148 628, 160 615 C 170 605, 160 590, 150 598", letter: "낙", role: "ext" },
  { d: "M 463 685 C 455 652, 475 618, 502 598 C 525 582, 548 592, 542 612 C 538 628, 518 625, 525 615", letter: "낙", role: "ext" },
  { d: "M 195 965 C 162 972, 125 958, 92 972 C 62 985, 52 1015, 78 1025 C 105 1035, 122 1012, 105 1000 C 92 992, 82 1008, 92 1018", letter: "낙", role: "ext" },
  { d: "M 510 1145 C 505 1170, 482 1185, 452 1182 C 428 1178, 425 1162, 443 1158 C 458 1155, 460 1172, 450 1172", letter: "낙", role: "ext" },

  // === 원 ===
  { d: "M 720 745 C 700 735, 672 745, 655 770 C 638 795, 652 820, 670 838 C 685 850, 705 858, 728 852 C 750 848, 775 835, 780 815 C 790 795, 780 770, 765 755 C 750 742, 728 740, 718 752 C 712 762, 722 775, 732 770", letter: "원", role: "stroke" },
  { d: "M 1005 730 C 990 720, 985 703, 998 695 C 1012 688, 1022 703, 1015 715 C 1020 750, 1005 795, 1017 835 C 1025 870, 1008 910, 1015 945 C 1017 960, 1003 970, 993 962 C 984 954, 990 942, 998 948", letter: "원", role: "stroke" },
  { d: "M 945 822 C 928 818, 922 802, 935 795 C 948 788, 958 803, 950 815 C 972 820, 990 815, 1002 815", letter: "원", role: "stroke" },
  { d: "M 645 880 C 628 872, 622 858, 635 852 C 650 845, 660 860, 653 872 C 675 890, 705 878, 735 890 C 765 900, 795 880, 825 890 C 855 900, 885 880, 915 888 C 945 895, 970 880, 985 868 C 995 860, 1005 870, 995 878 C 988 885, 980 880, 982 872", letter: "원", role: "stroke" },
  { d: "M 805 888 C 800 903, 810 920, 803 935 C 798 945, 810 958, 802 968 C 795 975, 783 966, 790 958", letter: "원", role: "stroke" },
  { d: "M 658 1000 C 642 992, 635 975, 648 967 C 662 959, 673 975, 667 988 C 672 1020, 662 1055, 670 1090 C 675 1112, 685 1128, 708 1128 C 752 1130, 798 1120, 838 1128 C 875 1132, 910 1122, 945 1128 C 980 1132, 1012 1122, 1035 1128 C 1048 1130, 1058 1118, 1048 1108 C 1040 1100, 1028 1108, 1032 1116", letter: "원", role: "stroke" },

  // 원 extensions
  { d: "M 720 745 C 705 710, 735 670, 778 682", letter: "원", role: "ext" },
  { d: "M 998 695 C 1025 675, 1075 672, 1102 702", letter: "원", role: "ext" },
  { d: "M 790 958 C 795 985, 785 1015, 770 1020 C 758 1022, 755 1008, 765 1005", letter: "원", role: "ext" },
  { d: "M 1048 1118 C 1075 1140, 1098 1168, 1090 1190 C 1082 1208, 1060 1202, 1058 1185 C 1058 1172, 1075 1172, 1072 1185", letter: "원", role: "ext" },

  // ============================================================
  // FLOURISHES — 깔끔한 큰 커브로만. 자기 자신에 감기거나 꽃잎 크로스 금지.
  // ============================================================

  // 소 좌측 상단 — 크게 위로 올라갔다가 내려오는 아치
  { d: "M 55 218 C 25 170, 45 95, 130 75 C 215 60, 280 115, 268 165 C 258 200, 215 205, 205 175", letter: "소", role: "flourish" },
  // 소 왼쪽 중단 — 왼쪽 바깥으로 흘러내리는 덩굴
  { d: "M 92 608 C 55 650, 30 725, 70 790 C 108 845, 165 830, 180 790", letter: "소", role: "flourish" },
  // 소와 문 사이 상단 — 가로로 이어지는 아치
  { d: "M 542 138 C 570 90, 640 78, 700 100 C 745 118, 748 150, 720 158", letter: "문", role: "flourish" },
  // 문과 의 사이 상단 — 부드러운 꼬리
  { d: "M 830 138 C 860 100, 920 85, 970 105 C 1008 122, 1010 150, 988 162", letter: "의", role: "flourish" },
  // 의 우측 상단 — 크게 위로 올라갔다가 돌아오는 아치
  { d: "M 1150 160 C 1180 120, 1175 65, 1115 50 C 1055 38, 1000 65, 1010 100 C 1018 125, 1045 122, 1048 102", letter: "의", role: "flourish" },
  // 의 우측 중단 — 오른쪽 바깥으로 크게 흘러가는 곡선
  { d: "M 1178 540 C 1212 575, 1225 640, 1195 695 C 1168 745, 1115 745, 1098 708", letter: "의", role: "flourish" },
  // 의와 원 사이 — 오른쪽 중앙 연결 덩굴
  { d: "M 1032 660 C 1060 700, 1085 735, 1075 780 C 1065 812, 1035 820, 1020 798", letter: "의", role: "flourish" },

  // 낙 좌측 — 왼쪽 바깥으로 크게 흐르는 곡선
  { d: "M 150 598 C 108 625, 72 700, 88 770 C 102 825, 85 885, 55 898", letter: "낙", role: "flourish" },
  // 낙 하단 좌측 — 바닥을 감싸는 부드러운 곡선
  { d: "M 92 1018 C 58 1055, 30 1115, 80 1155 C 125 1185, 175 1175, 195 1145", letter: "낙", role: "flourish" },
  // 낙과 원 사이 — 가운데 부드럽게 올라오는 덩굴 (꽃 없이)
  { d: "M 525 615 C 548 590, 595 585, 625 608 C 648 628, 640 660, 610 658", letter: "낙", role: "flourish" },
  // 낙 하단 중앙 — 아래로 흘러내리는 꼬리
  { d: "M 450 1172 C 438 1202, 470 1232, 520 1238 C 565 1242, 595 1218, 585 1192", letter: "낙", role: "flourish" },

  // 원 하단 우측 — 오른쪽 바닥을 감싸는 큰 곡선
  { d: "M 1072 1185 C 1115 1215, 1170 1205, 1188 1158 C 1202 1115, 1170 1080, 1138 1092", letter: "원", role: "flourish" },
  // 원 위로 뻗는 큰 덩굴 — 깔끔한 상승 커브 (루프 제거)
  { d: "M 778 682 C 810 620, 795 550, 740 530", letter: "원", role: "flourish" },
  // 원 상단 우측 — 부드러운 끝 곡선 (단순화)
  { d: "M 1102 702 C 1142 688, 1175 712, 1160 745", letter: "원", role: "flourish" },
  // 원 아래로 흘러내리는 꼬리
  { d: "M 765 1005 C 748 1048, 762 1105, 725 1135 C 690 1158, 650 1142, 650 1110", letter: "원", role: "flourish" },

  // ============================================================
  // 가로 판형용 광역 장식 — 좌우로 크게 뻗어나가는 덩굴
  // ============================================================

  // 왼쪽 멀리로 뻗어나가는 상단 아치 (소 위쪽에서 시작 → 왼쪽 바깥 → 위로 돌아감)
  { d: "M 205 175 C 120 130, -30 130, -160 180 C -280 230, -320 310, -250 340 C -190 365, -140 300, -180 275", letter: "소", role: "flourish" },
  // 왼쪽 하단 덩굴 (소 왼쪽 ext 끝에서 → 바깥으로 → 아래로 크게 둥글게)
  { d: "M 180 790 C 100 815, -20 810, -110 870 C -200 935, -210 1020, -130 1050 C -65 1072, -20 1020, -55 985", letter: "낙", role: "flourish" },
  // 왼쪽 바닥에서 시작해서 아래쪽 가장자리를 따라 흘러가는 리본
  { d: "M -55 985 C -110 1080, -90 1170, 10 1200 C 115 1225, 225 1195, 290 1222", letter: "낙", role: "flourish" },

  // 오른쪽 멀리로 뻗어나가는 상단 아치 (의 위쪽 오른쪽에서 → 멀리 → 위로 돌아감)
  { d: "M 1048 102 C 1150 65, 1340 70, 1450 130 C 1560 195, 1570 285, 1490 320 C 1425 348, 1370 295, 1405 270", letter: "의", role: "flourish" },
  // 오른쪽 중단 덩굴 (의 오른쪽 ext에서 → 멀리 오른쪽 → 감싸고 돌아옴)
  { d: "M 1098 708 C 1200 695, 1360 720, 1430 800 C 1490 870, 1470 960, 1390 985 C 1320 1005, 1278 960, 1305 925", letter: "의", role: "flourish" },
  // 오른쪽 하단 덩굴 (원 오른쪽 아래 ext에서 → 오른쪽 바깥 → 바닥 가장자리)
  { d: "M 1138 1092 C 1225 1080, 1360 1105, 1410 1170, 1385 1230 C 1355 1258, 1280 1238, 1295 1200", letter: "원", role: "flourish" },
  // 하단 중앙-오른쪽 연결 리본
  { d: "M 1295 1200 C 1240 1255, 1110 1262, 990 1235 C 880 1210, 780 1222, 720 1245", letter: "원", role: "flourish" },

  // ============================================================
  // 왼쪽 균형 보강 — 오른쪽과 맞춰 더 크고 풍성하게
  // ============================================================

  // 왼쪽 상단 2차 아치 — 소 위쪽에서 더 높이 올라갔다가 바깥으로 빠지는 큰 덩굴
  { d: "M 130 75 C 50 30, -90 25, -220 65 C -330 100, -360 170, -300 200 C -245 228, -195 185, -225 165", letter: "소", role: "flourish" },
  // 왼쪽 중단 — 소 ext 끝에서 바깥쪽으로 흐르는 긴 가로 리본
  { d: "M -300 200 C -370 270, -390 380, -320 450 C -260 510, -180 495, -165 455", letter: "소", role: "flourish" },
  // 왼쪽 하단 2차 — 낙 아래에서 왼쪽 멀리 흘러가는 긴 꼬리
  { d: "M -130 1050 C -210 1095, -300 1095, -350 1040 C -380 995, -350 950, -295 955", letter: "낙", role: "flourish" },
];

function VineLettering({ tweaks, trigger }) {
  const { bg, stroke, weight, speed, glow, extScale, wobble } = tweaks;
  const safeWeight = Number(weight) || 16;
  const safeSpeed = Number(speed) || 10;
  const safeExtScale = Number(extScale ?? 1) || 1;
  const wobbleAmount = Number(wobble ?? 2.2);

  const pathRefs = useRef([]);
  const [lengths, setLengths] = useState([]);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const ls = pathRefs.current.map((p) => {
      if (!p) return 1000;
      try { return p.getTotalLength(); } catch { return 1000; }
    });
    setLengths(ls);
  }, []);

  useEffect(() => { setAnimKey((k) => k + 1); }, [trigger]);

  // JAMO-ORDERED one-stroke: draw in the exact reading order of jamo
  // ㅅ → ㅗ → ㅁ → ㅜ → ㄴ → ㅇ → ㅡ → ㅣ → ㄴ → ㅏ → ㄱ → ㅇ → ㅜ → ㅓ → ㄴ
  // Each path index is assigned to its jamo. Within a jamo group, greedy
  // spatial ordering keeps the pen smooth.
  //
  // Index map (see STROKES array above):
  // 소 (0-7):   0,1=ㅅ  2,3=ㅗ  4,5=ㅅ-ext  6,7=ㅗ-ext
  // 문 (8-15):  8=ㅁ  9,10=ㅜ  11=ㄴ  12,13=ㅁ-ext  14=ㅜ-ext  15=ㄴ-ext
  // 의 (16-22): 16=ㅇ  17=ㅣ  18=ㅡ  19=ㅇ-ext  20,21=ㅣ-ext  22=ㅡ-ext
  // 낙 (23-30): 23=ㄴ  24,25=ㅏ  26=ㄱ  27=ㄴ-ext  28=ㅏ-ext  29,30=ㄱ-ext
  // 원 (31-40): 31=ㅇ  32,33=ㅓ  34,35=ㅜ  36=ㄴ  37=ㅇ-ext  38=ㅓ-ext  39=ㅜ-ext  40=ㄴ-ext
  // Flourishes (41-55): tagged individually below
  const JAMO_SEQ = ["ㅅ","ㅗ","ㅁ","ㅜ","ㄴ","ㅇ","ㅡ","ㅣ","ㄴ","ㅏ","ㄱ","ㅇ","ㅜ","ㅓ","ㄴ"];
  const JAMO_GROUPS = [
    // Each element is {jamo, indices} — jamo appears in order, even when duplicated
    { jamo: "ㅅ", indices: [0, 1, 4, 5, 41, 56, 63, 64] },    // 소 ㅅ + flourish + 왼쪽 상단 2차 + 중단 리본
    { jamo: "ㅗ", indices: [2, 3, 6, 7, 42] },            // 소 ㅗ + flourish
    { jamo: "ㅁ", indices: [8, 12, 13, 43] },             // 문 ㅁ + 사이 flourish
    { jamo: "ㅜ", indices: [9, 10, 14] },                 // 문 ㅜ
    { jamo: "ㄴ", indices: [11, 15] },                    // 문 ㄴ
    { jamo: "ㅇ", indices: [16, 19, 44] },                // 의 ㅇ + 문-의 사이 flourish
    { jamo: "ㅡ", indices: [18, 22, 46, 60] },            // 의 ㅡ + 오른쪽 중단 확장
    { jamo: "ㅣ", indices: [17, 20, 21, 45, 47, 59] },    // 의 ㅣ + 오른쪽 상단 확장
    { jamo: "ㄴ", indices: [23, 27, 48] },                // 낙 ㄴ
    { jamo: "ㅏ", indices: [24, 25, 28] },                // 낙 ㅏ
    { jamo: "ㄱ", indices: [26, 29, 30, 49, 50, 51, 57, 58, 65] }, // 낙 ㄱ + 왼쪽 하단 + 바닥 리본 + 왼쪽 멀리
    { jamo: "ㅇ", indices: [31, 37, 53] },                // 원 ㅇ
    { jamo: "ㅜ", indices: [34, 35, 39, 55] },            // 원 ㅜ
    { jamo: "ㅓ", indices: [32, 33, 38, 54] },            // 원 ㅓ
    { jamo: "ㄴ", indices: [36, 40, 52, 61, 62] },        // 원 ㄴ + 오른쪽 하단 + 하단 리본
  ];
  const order = useMemo(() => {
    const endpoints = STROKES.map(({ d }) => {
      const nums = d.match(/-?\d+\.?\d*/g).map(Number);
      return {
        start: [nums[0], nums[1]],
        end:   [nums[nums.length - 2], nums[nums.length - 1]],
      };
    });

    const out = [];
    let penPos = null;

    for (const { indices } of JAMO_GROUPS) {
      const group = new Set(indices);
      if (group.size === 0) continue;

      // Pick starting path for this jamo group
      let current;
      if (penPos === null) {
        // First jamo: prefer stroke role, topmost-leftmost start
        let best = Infinity;
        for (const i of group) {
          const [x, y] = endpoints[i].start;
          const roleBonus = STROKES[i].role === "stroke" ? 0 : 800;
          const score = y * 2 + x + roleBonus;
          if (score < best) { best = score; current = i; }
        }
      } else {
        // Subsequent: prefer stroke role AND nearest to pen
        let bestScore = Infinity;
        for (const i of group) {
          const [sx, sy] = endpoints[i].start;
          const dx = sx - penPos[0], dy = sy - penPos[1];
          const dist = dx*dx + dy*dy;
          const roleBonus = STROKES[i].role === "stroke" ? 0 : 50000;
          const score = dist + roleBonus;
          if (score < bestScore) { bestScore = score; current = i; }
        }
      }

      out.push(current);
      group.delete(current);
      penPos = endpoints[current].end;

      // Greedy within the jamo group
      while (group.size > 0) {
        let bestIdx = -1, bestDist = Infinity;
        for (const i of group) {
          const [sx, sy] = endpoints[i].start;
          const dx = sx - penPos[0], dy = sy - penPos[1];
          const dist = dx*dx + dy*dy;
          if (dist < bestDist) { bestDist = dist; bestIdx = i; }
        }
        out.push(bestIdx);
        group.delete(bestIdx);
        penPos = endpoints[bestIdx].end;
      }
    }
    return out;
  }, []);

  // Sequential timing (one-at-a-time, minimal overlap) — truly looks like a single pen.
  const timing = useMemo(() => {
    const totalLen = order.reduce((sum, i) => sum + (lengths[i] || 1000), 0) || 1;
    const delays = {};
    const durations = {};
    let t = 0;
    for (const i of order) {
      delays[i] = t;
      const dur = ((lengths[i] || 1000) / totalLen) * safeSpeed;
      durations[i] = dur;
      // Almost no overlap — next path starts just as current finishes.
      t += dur * 0.55;
    }
    return { delays, durations, totalLen };
  }, [lengths, safeSpeed, order]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: bg,
      display: "grid", placeItems: "center", overflow: "hidden",
      fontFamily: "'Space Mono', monospace",
    }}>
      <svg
        key={animKey}
        viewBox="-440 -30 2100 1330"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100vw",
          maxHeight: "100vh",
          padding: "2vmin",
          boxSizing: "border-box",
          filter: glow ? `drop-shadow(0 0 10px ${stroke}99) drop-shadow(0 0 24px ${stroke}55)` : "none",
        }}
      >
        <defs>
          {/* Two wobble filters — strokes get a milder version so the text stays legible,
              ext/flourish get full strength for the hand-drawn vine feel.
              Uses userSpaceOnUse so the filter region covers the whole letter, not each path's bbox. */}
          <filter id="wobble" x="-460" y="-50" width="2150" height="1370" filterUnits="userSpaceOnUse">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={wobbleAmount} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="wobble-soft" x="-460" y="-50" width="2150" height="1370" filterUnits="userSpaceOnUse">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={wobbleAmount * 0.45} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <style>{`
            @keyframes draw { to { stroke-dashoffset: 0; } }
          `}</style>
        </defs>

        <g filter={wobbleAmount > 0 ? "url(#wobble-soft)" : undefined}>
          {STROKES.map((s, i) => {
            if (s.role !== "stroke") return null;
            const len = lengths[i] || 2000;
            const delay = timing.delays[i] || 0;
            const dur = Math.max(timing.durations[i] || ((lengths[i] || 1000) / timing.totalLen) * safeSpeed, 0.3);
            return (
              <path
                key={`s-${i}-${animKey}`}
                ref={(el) => (pathRefs.current[i] = el)}
                d={s.d}
                fill="none"
                stroke={stroke}
                strokeWidth={safeWeight}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: len,
                  strokeDashoffset: len,
                  animation: `draw ${dur}s linear ${delay}s forwards`,
                }}
              />
            );
          })}
        </g>
        <g filter={wobbleAmount > 0 ? "url(#wobble)" : undefined}>
          {STROKES.map((s, i) => {
            if (s.role === "stroke") return null;
            const len = lengths[i] || 2000;
            const delay = timing.delays[i] || 0;
            const dur = Math.max(timing.durations[i] || ((lengths[i] || 1000) / timing.totalLen) * safeSpeed, 0.3);
            const sw = s.role === "ext"
              ? safeWeight * 0.9 * safeExtScale
              : safeWeight * 0.8 * safeExtScale;
            return (
              <path
                key={`s-${i}-${animKey}`}
                ref={(el) => (pathRefs.current[i] = el)}
                d={s.d}
                fill="none"
                stroke={stroke}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: len,
                  strokeDashoffset: len,
                  animation: `draw ${dur}s linear ${delay}s forwards`,
                }}
              />
            );
          })}
        </g>
      </svg>

      <div style={{
        position: "absolute", bottom: 24, left: 0, right: 0,
        textAlign: "center", color: stroke, opacity: 0.5,
        fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3,
      }}>
        소문의 낙원 · SOMUN-UI NAKWON
      </div>
    </div>
  );
}

window.VineLettering = VineLettering;
