// 한강 쟁탈전 개념 지도: 실제 경위도 좌표를 단순 투영해 그린다(해안선은 간략화 — 실제 축척·국경 아님)
(function () {
  const W = 360, H = 540, K = 51, LON0 = 123.2, LAT0 = 42.0;
  const P = (lon, lat) => [+((lon - LON0) * K).toFixed(1), +((LAT0 - lat) * K * 1.27).toFixed(1)];
  // 한반도와 요동·만주 남부(시계 방향, 위쪽은 육지가 이어짐)
  const COAST = [[120.5, 43.5], [131.2, 43.5], [130.7, 42.4], [129.8, 41.8], [129.4, 41.0], [128.7, 40.3], [127.9, 39.95], [127.55, 39.6], [127.5, 39.15], [128.0, 38.75], [128.6, 38.2], [128.9, 37.75], [129.25, 37.2], [129.45, 36.5], [129.55, 36.0], [129.4, 35.5], [129.05, 35.08], [128.6, 34.95], [128.1, 34.85], [127.7, 34.7], [127.2, 34.55], [126.8, 34.4], [126.4, 34.35], [126.3, 34.8], [126.45, 35.3], [126.65, 35.95], [126.5, 36.35], [126.15, 36.75], [126.55, 37.0], [126.65, 37.4], [126.45, 37.72], [126.0, 37.75], [125.7, 38.0], [125.0, 37.9], [124.75, 38.1], [125.2, 38.55], [125.1, 39.0], [125.35, 39.5], [124.8, 39.65], [124.3, 39.9], [123.5, 39.8], [122.5, 39.55], [121.6, 39.0], [121.2, 38.85], [121.55, 39.6], [122.2, 40.6], [121.4, 40.95], [120.5, 40.6]];
  const RIVER = [[127.93, 36.97], [127.62, 37.28], [127.49, 37.49], [127.2, 37.55], [127.0, 37.53], [126.75, 37.62], [126.55, 37.72]];
  const NODES = {
    gungnae: { n: "국내성", ll: [126.18, 41.13], dx: 8, dy: -8 },
    pyeongyang: { n: "평양", ll: [125.75, 39.02], dx: 8, dy: 4 },
    hanseong: { n: "한성", sub: "한강 하류", ll: [127.08, 37.52], dx: -100, dy: -10, han: 1 },
    chungju: { n: "충주", sub: "한강 상류", ll: [127.93, 36.97], dx: 11, dy: 5, han: 1 },
    ungjin: { n: "웅진", ll: [127.12, 36.46], dx: 10, dy: -6 },
    sabi: { n: "사비", ll: [126.91, 36.28], dx: -34, dy: 14 },
    gwansan: { n: "관산성", ll: [127.57, 36.31], dx: 10, dy: 5 },
    geumseong: { n: "금성", ll: [129.21, 35.86], dx: -14, dy: -14 },
    daegaya: { n: "대가야", ll: [128.26, 35.73], dx: -46, dy: 16 },
    geumgwan: { n: "금관가야", ll: [128.88, 35.23], dx: -30, dy: 22 }
  };
  const COL = { G: "var(--gg)", B: "var(--bj)", S: "var(--sl)", Y: "var(--gy)" }, NAME = { G: "고구려", B: "백제", S: "신라", Y: "가야" };
  const pts = a => a.map(([x, y]) => P(x, y).join(",")).join(" ");
  // state = { own:{노드:'G'|'B'|'S'|'Y'}, cap:{G:노드,...}, hl:[노드], show:[노드] }
  function svg(st, o) {
    o = o || {}; const show = st.show || Object.keys(NODES), hl = new Set(st.hl || []);
    const caps = new Set(Object.values(st.cap || {}));
    const area = show.filter(k => st.own[k]).map(k => { const [x, y] = P(...NODES[k].ll); return `<circle cx="${x}" cy="${y}" r="${o.small ? 24 : 27}" fill="${COL[st.own[k]]}" opacity=".16"/>` }).join("");
    const nodes = show.map(k => {
      const d = NODES[k], [x, y] = P(...d.ll), c = st.own[k] ? COL[st.own[k]] : "var(--muted)", cap = caps.has(k), h = hl.has(k);
      const mark = cap ? `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="3" fill="${c}" stroke="var(--surface)" stroke-width="2.5" transform="rotate(45 ${x} ${y})"/>` : `<circle cx="${x}" cy="${y}" r="${d.han ? 7 : 5.5}" fill="${c}" stroke="var(--surface)" stroke-width="2.5"/>`;
      const ring = h ? `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${c}" stroke-width="2.5"><animate attributeName="r" values="11;17;11" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/></circle>` : "";
      const lab = o.labels === false ? "" : `<text x="${x + d.dx}" y="${y + d.dy}" font-size="${o.small ? 11 : 12.5}" font-weight="700" fill="var(--ink)" paint-order="stroke" stroke="var(--surface)" stroke-width="3.5" stroke-linejoin="round">${d.n}${d.sub && !o.small ? `<tspan font-weight="500" fill="var(--muted)" font-size="10.5"> ${d.sub}</tspan>` : ""}</text>`;
      return ring + mark + lab;
    }).join("");
    const legend = o.legend === false ? "" : `<g font-size="11" fill="var(--ink2)">${["G", "B", "S", "Y"].map((k, i) => `<g transform="translate(${12 + i * 62},${H - 14})"><circle r="5" cx="5" cy="-4" fill="${COL[k]}"/><text x="14" y="0">${NAME[k]}</text></g>`).join("")}<g transform="translate(268,${H - 14})"><rect x="0" y="-9" width="9" height="9" rx="2" transform="rotate(45 4.5 -4.5)" fill="var(--muted)"/><text x="15" y="0">수도</text></g></g>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.label || "한강 유역을 둘러싼 고구려·백제·신라·가야 개념 지도"}"><rect width="${W}" height="${H}" fill="color-mix(in srgb,var(--bj) 7%,var(--surface))"/><polygon points="${pts(COAST)}" fill="var(--surface)" stroke="var(--line2)" stroke-width="1.2" stroke-linejoin="round"/>${area}<polyline points="${pts(RIVER)}" fill="none" stroke="color-mix(in srgb,var(--bj) 55%,var(--surface))" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="${P(127.62, 37.42)[0]}" y="${P(127.62, 37.42)[1]}" font-size="10.5" fill="color-mix(in srgb,var(--bj) 70%,var(--ink))" font-weight="600">한강</text>${nodes}${legend}</svg>`;
  }
  window.K1MAP = { svg, NODES, COL, NAME };
})();
