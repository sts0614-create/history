// 공통: 상단 바 · 연대 띠 · 아이콘 · 작은 도우미
(function () {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // 연대 눈금: 고대는 시간 간격이 넓고 삼국은 촘촘해서, 구간마다 비율을 달리한다(기원전 2000~기원전 300 · ~300 · ~600)
  const SEG = [[-2000, -300, 0, 26], [-300, 300, 26, 52], [300, 600, 52, 100]];
  const eraX = y => { for (const [a, b, p, q] of SEG) if (y <= b) return p + (Math.max(y, a) - a) / (b - a) * (q - p); return 100 };
  const yName = y => (y < 0 ? "기원전 " + (-y) : y) + "년";
  const TICKS = [[-2000, "기원전 2000"], [-300, "기원전 300"], [1, "1"], [300, "300"], [400, "400"], [500, "500"], [600, "600년"]];
  const ticks = () => TICKS.map(([y, t], i) => `<span class="era-tick${i === 0 ? " first" : i === TICKS.length - 1 ? " last" : [1, 2, 4, 5].includes(i) ? " m" : ""}" style="left:${eraX(y)}%">${t}</span>`).join("");
  // 한 줄 띠: 이 차시만 진하게, 나머지 차시는 옅게(누르면 그 차시로)
  function eraRibbon(cur) {
    const segs = LESSONS.filter(l => l.n !== cur.n && l.n !== 9).map(l => `<a class="era-seg dim" href="lesson.html?n=${l.n}" style="left:${eraX(l.era[0])}%;width:${Math.max(eraX(l.era[1]) - eraX(l.era[0]), .8)}%;top:${14 + 0}px;height:8px;margin-top:4px" title="${l.n}차시 ${esc(l.title)}" aria-label="${l.n}차시로"></a>`).join("");
    const me = `<span class="era-seg" style="left:${eraX(cur.era[0])}%;width:${Math.max(eraX(cur.era[1]) - eraX(cur.era[0]), 1.2)}%" title="${esc(cur.eraLabel)}"></span>`;
    return `<div class="era" role="img" aria-label="이 차시가 다루는 시기: ${esc(cur.eraLabel)}"><div class="era-rail"></div>${segs}${me}${ticks()}</div>`;
  }
  // 목록 안의 작은 띠(공통 눈금)
  function eraMini(l) {
    return `<div class="era" style="height:20px;margin:0" aria-label="${esc(l.eraLabel)}"><div class="era-rail" style="top:8px"></div><span class="era-seg" style="top:4px;height:12px;left:${eraX(l.era[0])}%;width:${Math.max(eraX(l.era[1]) - eraX(l.era[0]), 1.4)}%"></span></div>`;
  }
  const I = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    ext: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    screen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/></svg>',
    game: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="11" rx="4"/><path d="M7 11v3M5.5 12.5h3M15.5 12h.01M18 13.5h.01"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>'
  };
  const BADGE = { ok: ["확인", "ok", "직접 열어 내용을 확인한 영상"], list: ["추천 목록", "brand", "금성출판사 역사자료드림센터가 교과용으로 모은 영상"], search: ["미리보기 필요", "warn", "검색으로 찾은 영상 — 수업 전에 길이와 구간을 확인하세요"] };
  const ytId = u => { const m = /(?:v=|youtu\.be\/)([\w-]{11})/.exec(u); return m ? m[1] : "" };
  function gnb(crumbs, right) {
    return `<header class="gnb"><div class="gnb-in"><a class="logo" href="../index.html"><i>史</i><span class="hide-m">역사 수업 실험실</span></a><nav class="crumb" aria-label="현재 위치">${crumbs.map((c, i) => (i ? '<span class="sl">/</span>' : "") + (c[1] ? `<a href="${c[1]}">${esc(c[0])}</a>` : `<b>${esc(c[0])}</b>`)).join("")}</nav><span class="sp"></span>${right || ""}</div></header>`;
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem("k1:" + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } },
    set(k, v) { try { localStorage.setItem("k1:" + k, JSON.stringify(v)) } catch (e) { } }
  };
  // 효과음(짧게) — 소리 끄기는 store "mute"
  let AC = null;
  const tone = (f, d = .12, t0 = 0) => { if (store.get("mute", false)) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + t0; o.frequency.value = f; o.type = "triangle"; g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d) } catch (e) { } };
  const sfx = { good: () => { tone(660); tone(990, .2, .1) }, bad: () => tone(190, .25), tick: () => tone(880, .05), end: () => { tone(523, .2); tone(659, .2, .2); tone(784, .35, .4) } };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a };
  const qs = k => new URLSearchParams(location.search).get(k);
  window.K1 = { esc, eraX, yName, eraRibbon, eraMini, I, BADGE, ytId, gnb, store, sfx, shuffle, qs };
})();
