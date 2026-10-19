// Results as charts: Dino Forcing highlighted in the accent, every other method in neutral gray.

const RV = {
    df: '#34d399',
    other: '#6f7680',
    grid: '#262626',
    axis: '#3a3a3a',
    text: '#dededd',
    muted: '#8a8a8a',
    faint: '#5f5f5f',
};

// ── data (from the paper's tables) ──
// [name, DINO use, params, epochs, [FID, IS, P, R] w/o CFG, [FID, IS, P, R] w/ CFG]
const SOTA = {
    latent: [
        ['DiT', 'None', '675M', 1400, [9.62, 121.5, 0.67, 0.67], [2.27, 278.2, 0.83, 0.57]],
        ['SiT', 'None', '675M', 1400, [8.61, 131.7, 0.68, 0.67], [2.06, 270.3, 0.82, 0.59]],
        ['REPA', 'Alignment', '675M', 800, [5.78, 158.3, 0.70, 0.68], [1.42, 305.7, 0.80, 0.65]],
        ['RAE-DiT-DH-XL', 'Rep. space', '839M', 800, [1.51, 242.9, 0.79, 0.63], [1.13, 262.6, 0.78, 0.67]],
        ['RAE-DiT-XL', 'Rep. space', '676M', 800, [1.87, 209.7, 0.80, 0.63], [1.41, 309.4, 0.80, 0.63]],
        ['ReDi', 'Joint gen.', '675M', 800, null, [1.61, 295.1, 0.78, 0.64]],
        ['REG', 'Joint gen.', '677M', 800, [1.80], [1.36, 299.4, 0.77, 0.66]],
        ['DiT + TREAD', 'None', '675M', 680, [3.93, 211.4, 0.76, 0.60], null],
        ['HASTE', 'Alignment', '675M', 500, null, [1.42, 299.5, 0.80, 0.65]],
        ['DDT', 'Alignment', '675M', 400, [6.27, 154.7, 0.68, 0.69], [1.26, 310.6, 0.79, 0.65]],
        ['CoReDi', 'Joint gen.', '675M', 400, [3.30, 176.8, 0.74, 0.66], [1.58, 297.2, 0.63, 0.78]],
        ['REED', 'Alignment', '675M', 200, [4.70], [1.80, 267.5, 0.81, 0.61]],
        ['REG', 'Joint gen.', '677M', 200, [2.70], null],
        ['SFD+LDiT/1', 'Joint gen.', '675M', 200, [2.54, 191.7, 0.75, 0.67], [1.06, 267.0, 0.78, 0.67]],
        ['REGLUE', 'Joint gen.', '677M', 200, [2.50, 188.6, 0.76, 0.65], null],
        ['iREPA', 'Alignment', '675M', 80, [7.13, 132.9, 0.71, 0.66], [1.89, 272.4, 0.80, 0.60]],
        ['DF (ours)', 'Forcing', '684M', 100, [2.47, 250.1, 0.84, 0.68], [2.35, 266.1, 0.85, 0.68], true],
    ],
    pixel: [
        ['JiT-G', 'None', '2B', 600, null, [1.82, 292.6]],
        ['JiT-XL + fv-loss', 'None', '676M', 600, [11.5, 118.5], [2.13, 290.3]],
        ['DeCo-XL', 'Alignment', '682M', 600, null, [1.69, 304.0, 0.79, 0.63]],
        ['PixelREPA', 'Alignment', '953M', 600, null, [1.81, 317.2]],
        ['PixelDiT2-H', 'Grounding', '1B', 480, null, [1.48, 299.1]],
        ['PixelDiT-XL', 'Alignment', '797M', 320, null, [1.61, 292.7, 0.78, 0.64]],
        ['V-Co', 'Joint gen.', '1.9B', 300, null, [1.71, 263.3]],
        ['JiT-L', 'None', '459M', 200, [17.19, 85.4, 0.70, 0.73], [3.06, 271.5, 0.85, 0.66]],
        ['JiT-XL', 'None', '676M', 200, [12.71, 101.7, 0.74, 0.73], [2.89, 272.1, 0.85, 0.66]],
        ['LatentForcing-L', 'Joint gen.', '465M', 200, [7.20], [2.48]],
        ['PixelDiT2-L', 'Grounding', '503M', 200, null, [2.35, 270.1]],
        ['PixelGen-XL', 'Percept.+Align.', '676M', 160, null, [1.83, 293.6, 0.79, 0.63]],
        ['DF-L (ours)', 'Forcing', '468M', 200, [5.53, 163.6, 0.79, 0.72], [2.26, 309.9, 0.84, 0.70], true],
        ['DF-XL (ours)', 'Forcing', '686M', 200, [4.56, 179.6, 0.79, 0.73], [2.13, 310.0, 0.83, 0.71], true],
    ],
};

const NOTES = {
    'latent-0': 'Without guidance, DF reaches the best FID among methods trained for at most 200 epochs, after only 100 epochs. Only 800-epoch models do better.',
    'latent-1': 'With guidance (AutoGuidance), DF improves to 2.35, a smaller gain than prior works trained 2–8× longer. Better guidance for DF is left to future work.',
    'pixel-0': 'In pixel space, DF-L improves on Latent Forcing from 7.20 to 5.53 FID at the same size and budget.',
    'pixel-1': 'With default interval guidance, no method-specific split: DF-XL reaches 2.13 against 2.89 for JiT-XL at the same budget.',
};

// ── shared bits ──

const SVGNS = 'http://www.w3.org/2000/svg';
function s(tag, attrs, parent, text) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
}
const ease = t => 1 - Math.pow(1 - t, 3);
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function tween(draw, dur = 750) {
    if (REDUCED_MOTION) return draw(1);
    const t0 = performance.now();
    let done = false;
    (function f(now) {
        if (done) return;
        const k = Math.max(0, Math.min(1, (now - t0) / dur));
        draw(ease(k));
        if (k < 1) requestAnimationFrame(f); else done = true;
    })(t0);
    // rAF is throttled in background tabs: make sure the final state lands anyway
    setTimeout(() => { if (!done) { done = true; draw(1); } }, dur + 150);
}

const tip = document.createElement('div');
tip.className = 'viz-tip';
tip.hidden = true;
document.body.appendChild(tip);
function showTip(html, ev) {
    tip.innerHTML = html;
    tip.hidden = false;
    let x, y;
    if (ev.clientX !== undefined && ev.type.startsWith('pointer')) { x = ev.clientX; y = ev.clientY; }
    else { const r = ev.target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top; }
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x + 14)) + 'px';
    tip.style.top = Math.max(8, y - h - 12) + 'px';
}
function hideTip() { tip.hidden = true; }
window.addEventListener('scroll', hideTip, { passive: true });

function bindHover(el, html) {
    el.setAttribute('tabindex', '0');
    el.addEventListener('pointermove', e => showTip(html, e));
    el.addEventListener('pointerleave', hideTip);
    el.addEventListener('focus', e => showTip(html, e));
    el.addEventListener('blur', hideTip);
}

// Re-render at the container's real pixel width so text never scales.
function responsive(el, render, { immediate = false } = {}) {
    // mode: 'zero' (marks at their start, waiting to animate), 'anim', or 'still'
    let w = 0, shown = false;
    if (immediate && el.clientWidth) { shown = true; w = Math.round(el.clientWidth); render(w, 'anim'); }
    const ro = new ResizeObserver(() => {
        const nw = Math.round(el.clientWidth);
        if (nw && nw !== w) { w = nw; render(w, shown || REDUCED_MOTION ? 'still' : 'zero'); }
    });
    ro.observe(el);
    const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && !shown && w) { shown = true; render(w, 'anim'); io.disconnect(); }
    }), { threshold: 0.2 });
    io.observe(el);
}


// ── scales ──
const L10 = Math.log10;
const rlerp = (a, b, t) => a + (b - a) * t;
const rclamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
function logScale([d0, d1], [r0, r1]) {
    const a = L10(d0), b = L10(d1);
    return v => r0 + (L10(v) - a) / (b - a) * (r1 - r0);
}
const LOG_TICKS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 40, 50, 60, 80];
function logTicks(lo, hi, max = 6) {
    let t = LOG_TICKS.filter(v => v >= lo && v <= hi);
    while (t.length > max) t = t.filter((_, i) => i % 2 === 0);
    return t;
}
const parseParams = p => parseFloat(p) * (p.endsWith('B') ? 1000 : 1);
const textW = (str, px = 11) => str.length * px * 0.6 + 4;

// Start once the element is on screen; rebuild (without animating) on resize.
function whenVisible(el, start, resize) {
    let started = false, w = 0;
    new ResizeObserver(() => {
        const nw = Math.round(el.clientWidth);
        if (!nw || nw === w) return;
        w = nw;
        if (started) resize();
    }).observe(el);
    const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && !started && el.clientWidth) { started = true; io.disconnect(); start(); }
    }), { threshold: 0.2 });
    io.observe(el);
}


// ── 1. State of the art: FID vs training budget, animated between views ──
(function sota() {
    const root = document.getElementById('viz-sota');
    if (!root) return;
    const host = root.querySelector('.viz-chart');
    const note = root.querySelector('.viz-note');
    const X_DOMAIN = [60, 2000], X_TICKS = [100, 200, 400, 800, 1400];

    const views = {};
    for (const space of ['latent', 'pixel']) for (const cfg of [0, 1]) {
        views[`${space}-${cfg}`] = SOTA[space].map(([name, use, params, ep, a, b, df]) => {
            const m = cfg ? b : a;
            if (!m) return null;
            const [fid, is, p, r] = m;
            return { key: `${space}|${name}|${ep}`, name, use, params, ep, fid, is, p, r, df: !!df, P: parseParams(params) };
        }).filter(Boolean);
    }

    let view = 'latent-0', W = 0, H = 0, svg, L, nodes = new Map(), domain = null, anim = 0;
    const M = { l: 42, r: 14, t: 14, b: 40 };
    const xs = () => logScale(X_DOMAIN, [M.l, W - M.r]);
    const ys = d => logScale(d, [H - M.b, M.t]);
    const radius = P => 4.5 + Math.sqrt(P / 2000) * 5.5;
    const domainFor = pts => {
        const v = pts.map(p => p.fid);
        return [Math.min(...v) / 1.22, Math.max(...v) * 1.18];
    };

    function build() {
        host.innerHTML = '';
        W = host.clientWidth;
        H = W < 560 ? 360 : 440;
        svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img',
            'aria-label': 'FID versus training epochs on log axes. Each bubble is a method; Dino Forcing is highlighted.' }, host);
        const defs = s('defs', {}, svg);
        const glow = s('radialGradient', { id: 'sota-glow' }, defs);
        s('stop', { offset: '0%', 'stop-color': RV.df, 'stop-opacity': 0.5 }, glow);
        s('stop', { offset: '100%', 'stop-color': RV.df, 'stop-opacity': 0 }, glow);
        L = {
            zone: s('g', {}, svg), grid: s('g', {}, svg), frontier: s('g', {}, svg),
            pts: s('g', {}, svg), labels: s('g', { class: 'labels' }, svg),
        };
        nodes = new Map();
        domain = null;
        const x = xs();
        const zx = x(235);
        s('rect', { x: M.l, y: M.t, width: zx - M.l, height: H - M.t - M.b, class: 'zone' }, L.zone);
        s('text', { x: zx - 6, y: M.t + 14, 'text-anchor': 'end', class: 'zone-t' }, L.zone, '≤ 200 epochs');
    }

    function drawGrid(d) {
        L.grid.innerHTML = '';
        const x = xs(), y = ys(d);
        X_TICKS.forEach(t => {
            s('line', { x1: x(t), x2: x(t), y1: M.t, y2: H - M.b, stroke: RV.grid }, L.grid);
            s('text', { x: x(t), y: H - M.b + 16, 'text-anchor': 'middle', class: 'tick' }, L.grid, t);
        });
        logTicks(d[0], d[1], 6).forEach(t => {
            s('line', { x1: M.l, x2: W - M.r, y1: y(t), y2: y(t), stroke: RV.grid }, L.grid);
            s('text', { x: M.l - 8, y: y(t) + 3.5, 'text-anchor': 'end', class: 'tick' }, L.grid, t);
        });
        s('text', { x: W - M.r, y: H - 6, 'text-anchor': 'end', class: 'axis-title' }, L.grid, 'training epochs (log) →');
        s('text', { x: M.l - 8, y: M.t - 2, 'text-anchor': 'end', class: 'axis-title' }, L.grid, 'FID');
        s('text', { x: M.l + 10, y: H - M.b - 10, class: 'better' }, L.grid, '↙ better');
    }

    // positions for a view; methods sharing an epoch count are nudged sideways
    function layout(pts, d) {
        const x = xs(), y = ys(d), out = new Map(), placed = [];
        pts.slice().sort((a, b) => (b.df - a.df) || (a.fid - b.fid)).forEach(p => {
            const r = radius(p.P), px = x(p.ep), py = y(p.fid);
            let nx = px;
            for (const o of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
                const cx = px + o * (r + 2.5);
                if (placed.every(q => Math.hypot(q.x - cx, q.y - py) >= q.r + r + 1.5)) { nx = cx; break; }
            }
            const n = { x: nx, y: py, r };
            placed.push(n);
            out.set(p.key, n);
        });
        return out;
    }

    function makeNode(p) {
        const old = p.ep > 200;
        const g = s('g', { class: 'pt' + (p.df ? ' pt--df' : old ? ' pt--old' : '') }, L.pts);
        const n = { g, x: 0, y: 0, r: 0, o: 0, p };
        if (p.df) {
            n.glow = s('circle', { r: 0, fill: 'url(#sota-glow)' }, g);
            n.ring = s('circle', { r: 0, class: 'pulse' }, g);
        }
        n.c = s('circle', { r: 0, class: 'dot' }, g);
        s('circle', { r: 14, class: 'hit' }, g);
        const f = (v, k) => v === undefined ? '–' : v.toFixed(k);
        bindHover(g, `<b>${p.name}</b><span>${p.use} · ${p.params} · ${p.ep} epochs</span>
            <div class="viz-tip__grid"><i>FID</i><b>${f(p.fid, 2)}</b><i>IS</i><b>${f(p.is, 1)}</b><i>Precision</i><b>${f(p.p, 2)}</b><i>Recall</i><b>${f(p.r, 2)}</b></div>`);
        if (p.df) L.pts.appendChild(g);
        return n;
    }
    function place(n, x, y, r, o) {
        Object.assign(n, { x, y, r, o });
        n.g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
        n.g.style.opacity = o;
        n.c.setAttribute('r', Math.max(0, r));
        if (n.glow) { n.glow.setAttribute('r', Math.max(0, r * 3.4)); n.ring.setAttribute('r', Math.max(0, r)); }
    }

    function frontierOf(pts) {
        let best = Infinity;
        return pts.slice().sort((a, b) => a.ep - b.ep || a.fid - b.fid).filter(p => {
            if (p.fid < best - 1e-9) { best = p.fid; return true; }
            return false;
        });
    }
    function drawFrontier(pts, pos) {
        L.frontier.innerHTML = '';
        const f = frontierOf(pts).map(p => pos.get(p.key));
        if (!f.length) return;
        let d = `M${f[0].x},${f[0].y}`;
        f.slice(1).forEach(q => { d += `H${q.x}V${q.y}`; });
        d += `H${W - M.r}`;
        s('path', { d, pathLength: 1, class: 'frontier' }, L.frontier);
        const last = f[f.length - 1];
        s('text', { x: W - M.r - 2, y: last.y - 7, 'text-anchor': 'end', class: 'frontier-t' }, L.frontier, 'best FID at each budget');
    }

    // greedy direct labels: ours first, then the frontier, then everything else that fits
    function drawLabels(pts, pos) {
        L.labels.innerHTML = '';
        const front = new Set(frontierOf(pts).map(p => p.key));
        const boxes = [...pos.values()].map(n => ({ x0: n.x - n.r, x1: n.x + n.r, y0: n.y - n.r, y1: n.y + n.r }));
        boxes.push({ x0: W - M.r - 170, x1: W - M.r, y0: 0, y1: 0 });
        const hit = b => b.x0 < M.l + 2 || b.x1 > W - M.r || b.y0 < M.t || b.y1 > H - M.b ||
            boxes.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
        const rank = p => p.df ? 0 : front.has(p.key) ? 1 : p.ep <= 200 ? 2 : 3;
        pts.slice().sort((a, b) => rank(a) - rank(b) || a.fid - b.fid).forEach(p => {
            const n = pos.get(p.key);
            const str = p.df ? `${W < 560 ? p.name.replace(' (ours)', '') : p.name} · ${p.fid.toFixed(2)}` : p.name;
            const w = textW(str, p.df ? 12 : 10.5), h = 13;
            const cands = [
                [n.x + n.r + 5, n.y - h / 2, 'start'], [n.x - n.r - 5 - w, n.y - h / 2, 'end'],
                [n.x - w / 2, n.y - n.r - 4 - h, 'middle'], [n.x - w / 2, n.y + n.r + 4, 'middle'],
                [n.x + n.r + 3, n.y - n.r - h, 'start'], [n.x + n.r + 3, n.y + n.r, 'start'],
            ];
            for (const [i, [bx, by, anchor]] of cands.entries()) {
                const b = { x0: bx, x1: bx + w, y0: by, y1: by + h };
                // ours is always labelled: fall back to the first slot inside the plot
                if (hit(b) && !(p.df && i === cands.length - 1)) continue;
                boxes.push(b);
                const tx = anchor === 'start' ? bx : anchor === 'end' ? bx + w : bx + w / 2;
                s('text', { x: tx, y: by + h - 3, 'text-anchor': anchor, class: p.df ? 'lab lab--df' : p.ep > 200 ? 'lab lab--old' : 'lab' }, L.labels, str);
                break;
            }
        });
    }

    function go(next, { first = false, instant = false } = {}) {
        const pts = views[next];
        const d1 = domainFor(pts), d0 = domain || d1;
        const target = layout(pts, d1);
        nodes.forEach((n, k) => { if (!target.has(k) && n.o === 0) { n.g.remove(); nodes.delete(k); } });
        const from = new Map();
        nodes.forEach((n, k) => from.set(k, { x: n.x, y: n.y, r: n.r, o: n.o }));
        pts.forEach(p => {
            if (nodes.has(p.key)) return;
            const t = target.get(p.key);
            nodes.set(p.key, makeNode(p));
            from.set(p.key, { x: t.x, y: first ? M.t : t.y, r: 0, o: 0 });
        });
        L.labels.innerHTML = '';
        L.frontier.innerHTML = '';
        view = next;
        note.textContent = NOTES[next];
        const id = ++anim;
        const order = k => rclamp((target.get(k)?.x - M.l) / (W - M.l));
        const frame = p => {
            if (id !== anim) return;
            const lo = 10 ** rlerp(L10(d0[0]), L10(d1[0]), p), hi = 10 ** rlerp(L10(d0[1]), L10(d1[1]), p);
            drawGrid([lo, hi]);
            nodes.forEach((n, k) => {
                const a = from.get(k), b = target.get(k);
                if (b) {
                    const q = first ? rclamp(p * 1.6 - order(k) * 0.6) : p;
                    place(n, rlerp(a.x, b.x, q), rlerp(a.y, b.y, q), rlerp(a.r, b.r, q), rlerp(a.o, 1, q));
                } else {
                    place(n, a.x, a.y, a.r * (1 - p), a.o * (1 - p));
                }
            });
            if (p >= 1) {
                nodes.forEach((n, k) => { if (!target.has(k)) { n.g.remove(); nodes.delete(k); } });
                domain = d1;
                drawFrontier(pts, target);
                drawLabels(pts, target);
            }
        };
        instant ? frame(1) : tween(frame, first ? 1500 : 850);
    }

    let space = 'latent', cfg = 0;
    const pick = (attr, val) => root.querySelectorAll(`[${attr}]`).forEach(b => b.setAttribute('aria-selected', String(b.getAttribute(attr) === val)));
    root.querySelectorAll('[data-space]').forEach(b => b.addEventListener('click', () => {
        space = b.dataset.space; pick('data-space', space); go(`${space}-${cfg}`);
    }));
    root.querySelectorAll('[data-cfg]').forEach(b => b.addEventListener('click', () => {
        cfg = +b.dataset.cfg; pick('data-cfg', String(cfg)); go(`${space}-${cfg}`);
    }));
    note.textContent = NOTES[view];
    whenVisible(host, () => { build(); go(view, { first: true }); }, () => { build(); go(view, { instant: true }); });
})();


// ── 2. Improvement comets: a trail falls from the baseline FID to the new FID (log scale) ──
let cometId = 0;   // gradient ids must be unique across every chart on the page
function comets(el, facets, { domain = [1.6, 70], yTicks = [2, 3, 5, 10, 20, 50], ref = null } = {}) {
    responsive(el, (W, mode) => {
        el.innerHTML = '';
        const narrow = W < 400;
        const H = narrow ? 300 : 320, top = 46, bottom = 46, left = 34, right = 8;
        const y = logScale(domain, [H - bottom, top]);
        const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': el.dataset.label || '' }, el);
        const defs = s('defs', {}, svg);

        yTicks.filter(t => t >= domain[0] && t <= domain[1]).forEach(t => {
            s('line', { x1: left, x2: W - right, y1: y(t), y2: y(t), stroke: RV.grid }, svg);
            s('text', { x: left - 6, y: y(t) + 3.5, 'text-anchor': 'end', class: 'tick' }, svg, t);
        });
        s('text', { x: left - 6, y: 12, 'text-anchor': 'end', class: 'axis-title' }, svg, 'FID');
        s('text', { x: W - right, y: 12, 'text-anchor': 'end', class: 'better' }, svg, 'lower is better ↓');
        if (ref) {
            s('line', { x1: left, x2: W - right, y1: y(ref.v), y2: y(ref.v), class: 'refline' }, svg);
            s('text', { x: W - right, y: y(ref.v) - 6, 'text-anchor': 'end', class: 'meta' }, svg, ref.label);
        }

        const n = facets.reduce((a, f) => a + f.cols.length, 0);
        const gap = facets.length > 1 ? 14 : 0;
        const colW = (W - left - right - gap * (facets.length - 1)) / n;
        let x0 = left;
        const marks = [];
        facets.forEach((f, fi) => {
            if (fi) s('line', { x1: x0 - gap / 2, x2: x0 - gap / 2, y1: top - 26, y2: H - bottom + 34, stroke: RV.grid }, svg);
            if (f.title) s('text', { x: x0 + 4, y: top - 16, class: 'group' }, svg, f.title);
            f.cols.forEach(c => {
                const cx = x0 + colW / 2, yb = y(c.base.v), yd = y(c.df);
                const id = `comet-${cometId++}`;
                const grad = s('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: cx, x2: cx, y1: yb, y2: yd }, defs);
                s('stop', { offset: '0%', 'stop-color': RV.other, 'stop-opacity': 0.15 }, grad);
                s('stop', { offset: '100%', 'stop-color': c.muted ? '#9aa3ad' : RV.df, 'stop-opacity': 1 }, grad);

                const g = s('g', { class: 'comet' + (c.muted ? ' comet--muted' : '') }, svg);
                s('rect', { x: x0, y: top - 8, width: colW, height: H - bottom - top + 16, class: 'hit' }, g);
                const tail = s('line', { x1: cx, x2: cx, y1: yb, y2: yb, stroke: `url(#${id})`, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
                (c.mids || []).forEach(m => {
                    s('circle', { cx, cy: y(m.v), r: 4.5, class: 'mid' }, g);
                    s('text', { x: cx - 9, y: y(m.v) + 3.5, 'text-anchor': 'end', class: 'meta' }, g, m.label);
                });
                s('circle', { cx, cy: yb, r: 4.5, fill: RV.other, stroke: '#191919', 'stroke-width': 2 }, g);
                if (!ref) s('text', { x: cx + 9, y: yb + 4, class: 'meta' }, g, c.base.v.toFixed(narrow ? 1 : 2));
                const ripple = s('circle', { cx, cy: yd, r: 6, class: 'ripple' }, g);
                const head = s('circle', { cx, cy: yb, r: 6, class: 'head' }, g);
                const val = s('text', { x: cx, y: yd + 21, 'text-anchor': 'middle', class: c.muted ? 'val' : 'val val--df' }, g, c.df.toFixed(2));
                s('text', { x: cx, y: H - bottom + 18, 'text-anchor': 'middle', class: 'name' }, g, c.label);
                if (c.note) s('text', { x: cx, y: H - bottom + 33, 'text-anchor': 'middle', class: 'note' }, g, c.note);
                if (c.tip) bindHover(g, c.tip);
                marks.push({ tail, head, val, ripple, yb, yd });
                x0 += colW;
            });
            x0 += gap;
        });

        const st = Math.min(0.1, 0.5 / marks.length);
        const draw = p => marks.forEach((m, i) => {
            const q = ease(rclamp((p - i * st) / (1 - (marks.length - 1) * st)));
            const yy = rlerp(m.yb, m.yd, q);
            m.tail.setAttribute('y2', yy);
            m.head.setAttribute('cy', yy);
            m.val.style.opacity = rclamp((q - 0.85) / 0.15);
            m.ripple.classList.toggle('on', q >= 1);
        });
        mode === 'anim' ? tween(draw, 1900) : draw(mode === 'zero' ? 0 : 1);
    });
}

const cometTip = (title, sub, base, df, mids = []) =>
    `<b>${title}</b><span>${sub}</span><div class="viz-tip__grid">
        <i>${base[0]}</i><b>${base[1].toFixed(2)}</b>${mids.map(m => `<i>${m[0]}</i><b>${m[1].toFixed(2)}</b>`).join('')}
        <i>Dino Forcing</i><b>${df.toFixed(2)}</b><i>FID ratio</i><b>${(base[1] / df).toFixed(1)}×</b></div>`;

(function scaling() {
    const el = document.getElementById('viz-scale');
    if (!el) return;
    el.dataset.label = 'FID of the baseline and with Dino Forcing for B, L and XL models, latent (SiT) and pixel (JiT) space';
    const facet = (title, arch, steps, rows) => ({
        title,
        cols: rows.map(([size, base, df]) => ({
            label: size, base: { v: base }, df,
            note: `${(base / df).toFixed(1)}×`,
            tip: cometTip(`${arch}-${size}`, `${steps}, no guidance`, [`${arch}-${size}`, base], df),
        })),
    });
    comets(el, [
        facet('Latent · SiT', 'SiT', '400K steps', [['B', 33.00, 4.51], ['L', 18.80, 3.04], ['XL', 17.20, 2.61]]),
        facet('Pixel · JiT', 'JiT', '100K steps', [['B', 48.61, 13.37], ['L', 26.64, 6.80], ['XL', 23.03, 5.45]]),
    ]);
})();

(function beyond() {
    const el = document.getElementById('viz-beyond');
    if (!el) return;
    el.dataset.label = 'FID at 512 resolution and for unconditional generation: baseline, prior method and Dino Forcing';
    comets(el, [{
        cols: [
            { label: '512²', base: { v: 20.45 }, mids: [{ label: 'REPA', v: 11.05 }], df: 3.11, note: '6.6×',
              tip: cometTip('ImageNet 512²', 'SiT-XL/2, 80 epochs, no guidance', ['SiT-XL/2', 20.45], 3.11, [['REPA', 11.05]]) },
            { label: 'No label', base: { v: 49.51 }, df: 9.14, note: 'latent · 5.4×',
              tip: cometTip('Unconditional, latent', 'SiT-L/2, 400K steps', ['SiT-L/2', 49.51], 9.14) },
            { label: 'No label', base: { v: 53.97 }, mids: [{ label: 'LF', v: 20.44 }], df: 15.19, note: 'pixel · 3.6×',
              tip: cometTip('Unconditional, pixel', 'JiT-L/16, 100K steps', ['JiT-L/16', 53.97], 15.19, [['Latent Forcing', 20.44]]) },
        ],
    }]);
})();


// ── 3. Ablation: every target starts from the no-branch baseline ──
(function ablation() {
    const el = document.getElementById('viz-ablation');
    if (!el) return;
    el.dataset.label = 'FID by supervision target for the representation branch, SiT-L/2, starting from the no-branch baseline of 18.80';
    const base = 18.80;
    const rows = [
        ['Unsupervised', 'DF-∅: the conditioning mechanism only', 12.96],
        ['Image', 'DF-image: the branch predicts the image', 11.93],
        ['MAE-B', 'DF-MAE: reconstruction-based SSL features', 7.97],
        ['DINOv2', 'DF-DINOv2: our full method', 3.04, true],
    ];
    comets(el, [{
        cols: rows.map(([label, what, v, ours]) => ({
            label, base: { v: base }, df: v, muted: !ours,
            note: `−${Math.round((1 - v / base) * 100)}%`,
            tip: cometTip(label, what, ['No branch', base], v).replace('<i>Dino Forcing</i>', '<i>With target</i>'),
        })),
    }], { domain: [2, 26], yTicks: [2, 3, 5, 10, 20], ref: { v: base, label: `no branch · ${base.toFixed(2)}` } });
})();


// ── DINO inversion: drag to compare ──
(function inversion() {
    const root = document.getElementById('inv-compare');
    if (!root) return;
    const recon = root.querySelector('.inv-recon');
    const orig = root.querySelector('.inv-orig');
    const wrap = root.querySelector('.inv-orig-wrap');
    const handle = root.querySelector('.inv-handle');
    const range = root.querySelector('input');
    const thumbs = [...document.querySelectorAll('#inv-thumbs button')];

    function set(v) {
        range.value = v;
        wrap.style.clipPath = `inset(0 0 0 ${v}%)`;
        handle.style.left = `${v}%`;
    }
    function pick(i) {
        recon.src = `static/images/dino_inversion/${i}_recon.webp`;
        orig.src = `static/images/dino_inversion/${i}_original.webp`;
        thumbs.forEach(b => b.setAttribute('aria-selected', String(+b.dataset.i === i)));
    }
    range.addEventListener('input', () => set(+range.value));
    thumbs.forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));

    // dragging anywhere on the image
    let drag = false;
    const fromEvent = e => {
        const r = root.getBoundingClientRect();
        set(Math.round(rclamp((e.clientX - r.left) / r.width) * 100));
    };
    root.addEventListener('pointerdown', e => { drag = true; root.setPointerCapture(e.pointerId); fromEvent(e); });
    root.addEventListener('pointermove', e => { if (drag) fromEvent(e); });
    root.addEventListener('pointerup', () => { drag = false; });

    set(50);
    pick(1);
    // a one-time sweep hints that the image can be dragged
    if (!REDUCED_MOTION) {
        const io = new IntersectionObserver(es => es.forEach(e => {
            if (!e.isIntersecting) return;
            io.disconnect();
            tween(p => set(Math.round(50 + 32 * Math.sin(p * Math.PI * 2))), 1800);
        }), { threshold: 0.5 });
        io.observe(root);
    }
})();
