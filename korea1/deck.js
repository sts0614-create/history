/* 수업 슬라이드 엔진: <script type="text/plain" id="deck"> 안의 짧은 문법을 슬라이드로 바꾼다.
 문법 (줄 맨 앞 기호)
  # 제목 | 부제 | 머리글 | 하단 정보      표지
  ## 제목 | 부제                          단원·활동 구분 슬라이드
  = 제목 | 작은 머리말                    새 슬라이드
  - 글머리   -- 하위 글머리   + 하나씩 나타나는 글머리 (++ 하위)
  > 강조 상자   ! 크게 가운데   ~ 작은 설명   (뒤에 + 를 붙이면 하나씩 등장: >+ !+)
  | 칸 | 칸 |                            표 (첫 줄은 머리줄, |+ 는 하나씩 등장)
  * 아이콘 제목 :: 내용                   사례 카드 (*+ 하나씩 등장)
  ^ 단계                                 번호 단계 (^+ 하나씩 등장)
  ? 질문 :: 답                           발문 (답은 클릭하면 등장)
  Q 문제 / o 보기 / o* 정답 / :: 해설     선택형 문항 (보기를 누르면 채점)
  @ 주소 | 설명                          시뮬레이션·앱 끼워 넣기
  C 제목 | x축 | y축 | 이름:x,y x,y | …    꺾은선 그래프
  ||                                     여기부터 오른쪽 칸
  V 제목 | 출처 | 주소 | 쓰는 법          영상 (유튜브는 화면 안에서 재생, 그 밖은 새 창으로 열기)
  " 사료 본문 | 출처                     사료 상자
  T 분 | 할 일                           활동 타이머 (눌러서 시작·멈춤)
  % 교사용 메모 (N 키)
  글 안: **굵게** ==형광펜== [[빈칸 정답]]
*/
(() => {
  const esc = s => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/==(.+?)==/g, '<span class="hl">$1</span>').replace(/\[\[(.+?)\]\]/g, '<span class="blank">$1</span>');
  const isIcon = s => /^\p{Extended_Pictographic}/u.test(s);
  const body = document.body, src = document.getElementById('deck').textContent;
  const crumb = body.dataset.crumb || '', back = body.dataset.back || '../../index.html';
  // ---------- 읽기 ----------
  const slides = []; let cur = null, secN = 0;
  const newSlide = (type, o) => { cur = Object.assign({type, cols: [[]], notes: []}, o); slides.push(cur); };
  const add = b => { if (!cur) newSlide('content', {title: ''}); const col = cur.cols[cur.cols.length - 1], last = col[col.length - 1]; if (last && last.k === b.k && ['li', 'tr', 'card', 'step', 'opt'].includes(b.k) && !b.newGroup) last.items.push(b); else col.push({k: b.k, items: [b], ...(b.k === 'quiz' ? b : {})}); };
  src.split('\n').forEach(raw => {
    const L = raw.trim(); if (!L) return; let m;
    if (L.startsWith('## ')) { const [t, s] = L.slice(3).split('|').map(x => x.trim()); newSlide('sec', {title: t, sub: s, n: ++secN}); }
    else if (L.startsWith('# ')) { const [t, s, k, me] = L.slice(2).split('|').map(x => x.trim()); newSlide('cover', {title: t, sub: s, kick: k, meta: me}); }
    else if (L.startsWith('= ')) { const [t, s] = L.slice(2).split('|').map(x => x.trim()); newSlide('content', {title: t, kick: s}); }
    else if (L === '||') cur.cols.push([]);
    else if (L.startsWith('% ')) cur.notes.push(L.slice(2));
    else if ((m = L.match(/^(\+\+|--)\s+(.*)/))) add({k: 'li', sub: true, frag: m[1] === '++', t: m[2]});
    else if ((m = L.match(/^([-+])\s+(.*)/))) add({k: 'li', frag: m[1] === '+', t: m[2]});
    else if ((m = L.match(/^(>|!|~)(\+?)\s+(.*)/))) add({k: {'>': 'call', '!': 'big', '~': 'cap'}[m[1]], frag: !!m[2], t: m[3]});
    else if ((m = L.match(/^\|(\+?)(.*)\|$/))) add({k: 'tr', frag: !!m[1], cells: m[2].split('|').map(x => x.trim())});
    else if ((m = L.match(/^\*(\+?)\s+(.*)/))) { const [h, d] = m[2].split('::').map(x => x.trim()); const parts = h.split(/\s+/); const ic = isIcon(parts[0]) ? parts.shift() : ''; add({k: 'card', frag: !!m[1], ic, h: parts.join(' '), d: d || ''}); }
    else if ((m = L.match(/^\^(\+?)\s+(.*)/))) add({k: 'step', frag: !!m[1], t: m[2]});
    else if ((m = L.match(/^\?\s+(.*)/))) { const [q, a] = m[1].split('::').map(x => x.trim()); add({k: 'qa', q, a}); }
    else if ((m = L.match(/^Q\s+(.*)/))) add({k: 'quiz', q: m[1], opts: [], expl: ''});
    else if ((m = L.match(/^o(\*?)\s+(.*)/))) { const col = cur.cols[cur.cols.length - 1], qz = col[col.length - 1]; qz.opts.push({t: m[2], ok: !!m[1]}); }
    else if ((m = L.match(/^::\s+(.*)/))) { const col = cur.cols[cur.cols.length - 1]; col[col.length - 1].expl = m[1]; }
    else if ((m = L.match(/^V\s+(.*)/))) { const [t, src, u, use] = m[1].split('|').map(x => x.trim()); add({k: 'video', t, src, u, use}); }
    else if ((m = L.match(/^"(\+?)\s+(.*)/))) { const [t, src] = m[2].split('|').map(x => x.trim()); add({k: 'src', frag: !!m[1], t, src}); }
    else if ((m = L.match(/^T\s+(.*)/))) { const [mm, t] = m[1].split('|').map(x => x.trim()); add({k: 'timer', m: +mm || 3, t}); }
    else if ((m = L.match(/^@\s+(.*)/))) { const [h, c] = m[1].split('|').map(x => x.trim()); add({k: 'frame', h, c}); }
    else if ((m = L.match(/^C\s+(.*)/))) { const p = m[1].split('|').map(x => x.trim()); add({k: 'chart', t: p[0], x: p[1], y: p[2], ser: p.slice(3).map(s => { const i = s.indexOf(':'); return {n: s.slice(0, i), pts: s.slice(i + 1).trim().split(/\s+/).map(q => q.split(',').map(Number))}; })}); }
    else add({k: 'p', t: L});
  });
  // ---------- 그래프 ----------
  const nice = (a, b) => { const r = b - a || 1, st = Math.pow(10, Math.floor(Math.log10(r / 5))), k = [1, 2, 2.5, 5, 10].find(k => r / (st * k) <= 6) * st; return [Math.floor(a / k) * k, Math.ceil(b / k) * k, k]; };
  function chart(c){ const W = 1300, H = 520, L = 110, R = 30, T = 30, B = 80, all = c.ser.flatMap(s => s.pts), [x0, x1, xs] = nice(Math.min(...all.map(p => p[0]), 0), Math.max(...all.map(p => p[0]))), [y0, y1, ys] = nice(Math.min(...all.map(p => p[1]), 0), Math.max(...all.map(p => p[1])));
    const X = v => L + (v - x0) / (x1 - x0) * (W - L - R), Y = v => T + (H - T - B) - (v - y0) / (y1 - y0) * (H - T - B), cols = ['var(--area)', 'var(--hot)', 'var(--ok)', '#7a3fc4', '#c98a0b'];
    let s = `<svg viewBox="0 0 ${W} ${H}" font-family="IBM Plex Mono, monospace">`;
    for (let v = y0; v <= y1 + 1e-9; v += ys) s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e4e9ee"/><text x="${L - 14}" y="${Y(v) + 8}" text-anchor="end" font-size="22" fill="#5d6975">${+v.toFixed(3)}</text>`;
    for (let v = x0; v <= x1 + 1e-9; v += xs) s += `<text x="${X(v)}" y="${H - B + 34}" text-anchor="middle" font-size="22" fill="#5d6975">${+v.toFixed(3)}</text>`;
    s += `<line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="#16202a" stroke-width="2"/><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#16202a" stroke-width="2"/>`;
    s += `<text x="${(L + W - R) / 2}" y="${H - 12}" text-anchor="middle" font-size="24" fill="#16202a" font-family="IBM Plex Sans KR">${esc(c.x || '')}</text><text transform="translate(28 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" font-size="24" fill="#16202a" font-family="IBM Plex Sans KR">${esc(c.y || '')}</text>`;
    c.ser.forEach((se, i) => { const col = cols[i % cols.length], p = se.pts; s += `<polyline fill="none" stroke="${col}" stroke-width="6" stroke-linejoin="round" points="${p.map(q => X(q[0]) + ',' + Y(q[1])).join(' ')}"/>` + p.map(q => `<circle cx="${X(q[0])}" cy="${Y(q[1])}" r="8" fill="${col}"/>`).join('') + (q => `<text x="${X(q[0])}" y="${Y(q[1]) - 22}" text-anchor="middle"`)(p[Math.min(p.length - 1, Math.floor(p.length * .7))]) + ` font-size="26" font-weight="700" fill="${col}" font-family="IBM Plex Sans KR">${esc(se.n)}</text>`; });
    return `<div class="chart">${c.t ? `<div class="cap">${esc(c.t)}</div>` : ''}${s}</svg></div>`; }
  // ---------- 그리기 ----------
  const F = b => b.frag ? ' frag' : '';
  function block(b){ const it = b.items;
    switch (b.k) {
      case 'li': return `<ul>${it.map(x => `<li class="${x.sub ? 'sub' : ''}${F(x)}">${inl(x.t)}</li>`).join('')}</ul>`;
      case 'call': case 'big': case 'cap': return it.map(x => `<div class="${b.k}${F(x)}">${inl(x.t)}</div>`).join('');
      case 'p': return it.map(x => `<div>${inl(x.t)}</div>`).join('');
      case 'tr': return `<table class="tb">${it.map((r, i) => `<tr class="${F(r)}">${r.cells.map(c => i ? `<td>${inl(c)}</td>` : `<th>${inl(c)}</th>`).join('')}</tr>`).join('')}</table>`;
      case 'card': return `<div class="cards">${it.map(c => `<div class="card${F(c)}">${c.ic ? `<span class="ic">${c.ic}</span>` : ''}<h3>${inl(c.h)}</h3>${inl(c.d)}</div>`).join('')}</div>`;
      case 'step': return `<div class="steps">${it.map(x => `<div class="step${F(x)}"><div>${inl(x.t)}</div></div>`).join('')}</div>`;
      case 'qa': return it.map(x => `<div class="qa"><div class="q">${inl(x.q)}</div>${x.a ? `<div class="a frag">${inl(x.a)}</div>` : ''}</div>`).join('');
      case 'quiz': return `<div class="quiz"><div class="q">${inl(b.q)}</div><div class="opts">${b.opts.map((o, i) => `<button type="button" class="opt" data-ok="${o.ok ? 1 : 0}"><span class="n">${i + 1}</span><span>${inl(o.t)}</span></button>`).join('')}</div><div class="expl frag" data-quiz>${inl(b.expl || '정답을 확인해 보세요.')}</div></div>`;
      case 'frame': return it.map(x => `<div class="frame"><a class="open" href="${esc(x.h)}" target="_blank" rel="noopener">새 창으로 열기 ↗</a><iframe loading="lazy" src="${esc(x.h)}" title="${esc(x.c || '시뮬레이션')}"></iframe></div>${x.c ? `<div class="cap">${inl(x.c)}</div>` : ''}`).join('');
      case 'chart': return it.map(chart).join('');
      case 'video': return it.map(v => { const y = /(?:youtu\.be\/|[?&]v=)([\w-]{11})/.exec(v.u || ''); return `<div class="video">${y ? `<div class="frame"><a class="open" href="${esc(v.u)}" target="_blank" rel="noopener">유튜브에서 열기 ↗</a><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${y[1]}?rel=0" title="${esc(v.t)}" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>` : `<a class="vcard" href="${esc(v.u)}" target="_blank" rel="noopener"><span class="play">▶</span><span><b>${inl(v.t)}</b><em>${esc(v.src || '')}</em><span class="go">새 창에서 영상 열기 ↗</span></span></a>`}<div class="vmeta"><b>${inl(v.t)}</b> · ${esc(v.src || '')}${v.use ? `<span class="use">${inl(v.use)}</span>` : ''}</div></div>`; }).join('');
      case 'src': return it.map(x => `<blockquote class="srcq${F(x)}"><p>${inl(x.t)}</p>${x.src ? `<cite>${inl(x.src)}</cite>` : ''}</blockquote>`).join('');
      case 'timer': return it.map(x => `<div class="timer" data-sec="${x.m * 60}"><button type="button" class="tbtn" data-t="go">▶ 시작</button><span class="tnum">${String(x.m).padStart(2, '0')}:00</span><span class="tlab">${inl(x.t || '')}</span><button type="button" class="tbtn ghost" data-t="reset">다시</button></div>`).join('');
    } return ''; }
  const stage = document.createElement('div'); stage.className = 'stage';
  stage.innerHTML = slides.map((s, i) => {
    const no = `<div class="no">${i + 1} / ${slides.length}</div>`;
    if (s.type === 'cover') return `<section class="slide cover">${s.kick ? `<div class="kick">${inl(s.kick)}</div>` : ''}<h1>${inl(s.title)}</h1>${s.sub ? `<div class="sub">${inl(s.sub)}</div>` : ''}${s.meta ? `<div class="meta">${inl(s.meta)}</div>` : ''}${no}</section>`;
    if (s.type === 'sec') return `<section class="slide sec"><div class="num">${String(s.n).padStart(2, '0')}</div><h1>${inl(s.title)}</h1>${s.sub ? `<div class="sub">${inl(s.sub)}</div>` : ''}${no}</section>`;
    const cols = s.cols.map(c => c.map(block).join(''));
    return `<section class="slide"><h2 class="t">${s.kick ? `<small>${inl(s.kick)}</small>` : ''}${inl(s.title)}</h2><div class="body">${cols.length > 1 ? `<div class="cols">${cols.map(c => `<div>${c}</div>`).join('')}</div>` : cols[0]}</div><div class="crumb">${esc(crumb)}</div>${no}</section>`;
  }).join('');
  const vp = document.createElement('div'); vp.className = 'viewport'; vp.appendChild(stage); body.appendChild(vp);
  const prog = document.createElement('div'); prog.className = 'prog'; body.appendChild(prog);
  const notes = document.createElement('div'); notes.className = 'notes'; body.appendChild(notes);
  const ov = document.createElement('div'); ov.className = 'grid-ov'; body.appendChild(ov);
  const bar = document.createElement('div'); bar.className = 'bar';
  bar.innerHTML = `<a href="${esc(back)}">← 목록</a><span class="ttl">${esc(document.title)}</span><button type="button" data-a="prev" aria-label="이전">◀</button><span class="pg"></span><button type="button" data-a="next" aria-label="다음">▶</button><button type="button" data-a="ov">전체 보기 (O)</button><button type="button" data-a="notes">메모 (N)</button><button type="button" data-a="fs">전체 화면 (F)</button><button type="button" data-a="print">인쇄</button>`;
  body.appendChild(bar);
  const els = [...stage.querySelectorAll('.slide')];
  const frags = els.map(el => [...el.querySelectorAll('.frag, .blank')]);
  let i = 0, f = 0;
  const fit = () => { const w = innerWidth, h = innerHeight - 52, k = Math.min(w / 1600, h / 900) * .98; stage.style.transform = `translate(-50%, -50%) scale(${k})`; };
  const showFrag = (el, on) => { el.classList.toggle('shown', on); if (el.hasAttribute('data-quiz')) el.closest('.quiz').querySelectorAll('.opt[data-ok="1"]').forEach(o => o.classList.toggle('right', on)); };
  function go(n, fr){ i = Math.max(0, Math.min(els.length - 1, n)); els.forEach((e, k) => e.classList.toggle('on', k === i)); const fs = frags[i]; f = fr === 'all' ? fs.length : 0; fs.forEach((e, k) => showFrag(e, k < f)); bar.querySelector('.pg').textContent = `${i + 1} / ${els.length}`; prog.style.width = ((i + 1) / els.length * 100) + '%'; notes.innerHTML = slides[i].notes.length ? slides[i].notes.map(n => '• ' + inl(n)).join('<br>') : '<i>이 슬라이드에는 메모가 없어요.</i>'; try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) {} ov.querySelectorAll('button').forEach((b, k) => b.classList.toggle('cur', k === i)); }
  const next = () => { const fs = frags[i]; if (f < fs.length) showFrag(fs[f++], true); else if (i < els.length - 1) go(i + 1); };
  const prev = () => { if (f > 0) showFrag(frags[i][--f], false); else if (i > 0) go(i - 1, 'all'); };
  ov.innerHTML = slides.map((s, k) => `<button type="button"><span>${k + 1}</span>${esc(s.title || '')}</button>`).join('');
  ov.querySelectorAll('button').forEach((b, k) => b.onclick = () => { go(k); ov.classList.remove('on'); });
  const act = {prev, next, ov: () => ov.classList.toggle('on'), notes: () => notes.classList.toggle('on'), fs: () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(), print: () => window.print()};
  bar.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act[b.dataset.a]());
  addEventListener('keydown', e => { if (e.target.closest && e.target.closest('input,textarea')) return; const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0); else if (k === 'End') go(els.length - 1); else if (k === 'o' || k === 'O') act.ov(); else if (k === 'n' || k === 'N') act.notes(); else if (k === 'f' || k === 'F') act.fs(); else if (k === 'Escape') ov.classList.remove('on'); });
  const tick = el => { const n = Math.max(0, +el.dataset.left), num = el.querySelector('.tnum'); num.textContent = `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; el.classList.toggle('end', n === 0 && el.dataset.run !== '1' && el.dataset.started === '1'); };
  stage.addEventListener('click', e => { const tb = e.target.closest('.tbtn'); if (tb) { const el = tb.closest('.timer'); if (el.dataset.left === undefined) el.dataset.left = el.dataset.sec;
      if (tb.dataset.t === 'reset') { clearInterval(el._iv); el.dataset.run = '0'; el.dataset.started = '0'; el.dataset.left = el.dataset.sec; el.querySelector('[data-t=go]').textContent = '▶ 시작'; tick(el); return; }
      if (el.dataset.run === '1') { clearInterval(el._iv); el.dataset.run = '0'; tb.textContent = '▶ 계속'; return; }
      el.dataset.run = '1'; el.dataset.started = '1'; tb.textContent = '❚❚ 멈춤'; el._iv = setInterval(() => { el.dataset.left = +el.dataset.left - 1; if (+el.dataset.left <= 0) { clearInterval(el._iv); el.dataset.run = '0'; tb.textContent = '▶ 시작'; el.dataset.left = 0; } tick(el); }, 1000); return; }
    const o = e.target.closest('.opt'); if (o) { const q = o.closest('.quiz'), ok = o.dataset.ok === '1'; o.classList.add(ok ? 'right' : 'wrong'); if (ok) { const ex = q.querySelector('.expl'), k = frags[i].indexOf(ex); if (k >= 0 && k >= f) { for (let j = f; j <= k; j++) showFrag(frags[i][j], true); f = k + 1; } } return; } if (e.target.closest('a,button,iframe,.frame')) return; next(); });
  let tx = null; stage.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive: true}); stage.addEventListener('touchend', e => { if (tx === null) return; const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) { d < 0 ? next() : prev(); } tx = null; });
  addEventListener('resize', fit); fit();
  const start = parseInt((location.hash || '').slice(1), 10); go(start > 0 ? start - 1 : 0);
})();
