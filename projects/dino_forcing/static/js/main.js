// ── Theme helpers ──
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// '#rrggbb' + alpha -> rgba() string, for canvas drawing
function withAlpha(hex, a) {
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}

(function () {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const root = document.documentElement;
        root.classList.add('theme-anim');
        window.setTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
        setTimeout(() => root.classList.remove('theme-anim'), 350);
    });
})();


// ── ODE flow-path background (same as arijit-hub.github.io) ──
(function () {
    const canvas = document.getElementById('ode-canvas');
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    const N = 30;
    let accent = cssVar('--accent');
    document.addEventListener('themechange', () => { accent = cssVar('--accent'); });
    let W, H, paths, pinchLX, pinchRX;

    function build() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        pinchLX = W * 0.35;
        pinchRX = W * 0.65;

        const midSpread = 0.28;
        const midBase = (1 - midSpread) / 2;

        paths = Array.from({ length: N }, (_, i) => {
            const frac = i / (N - 1);
            return {
                y0: frac * H,
                yMid: (midBase + frac * midSpread) * H,
                y1: frac * H,
                t: i / N,
                speed: 0.0016 + Math.random() * 0.0014
            };
        });
    }

    const T1 = 0.38, T2 = 0.62;

    function pathPos(p, t) {
        if (t < T1) {
            const s = t / T1, u = 1 - s;
            return {
                x: 3*u*u*s*(W*0.15) + 3*u*s*s*(pinchLX - W*0.05) + s*s*s*pinchLX,
                y: u*u*u*p.y0 + 3*u*u*s*p.y0 + 3*u*s*s*p.yMid + s*s*s*p.yMid
            };
        }
        if (t < T2) {
            const s = (t - T1) / (T2 - T1);
            return { x: pinchLX + s * (pinchRX - pinchLX), y: p.yMid };
        }
        const s = (t - T2) / (1 - T2), u = 1 - s;
        return {
            x: u*u*u*pinchRX + 3*u*u*s*(pinchRX + W*0.05) + 3*u*s*s*(W*0.85) + s*s*s*W,
            y: u*u*u*p.yMid + 3*u*u*s*p.yMid + 3*u*s*s*p.y1 + s*s*s*p.y1
        };
    }

    function drawPath(p) {
        ctx.beginPath();
        ctx.moveTo(0, p.y0);
        ctx.bezierCurveTo(W*0.15, p.y0, pinchLX - W*0.05, p.yMid, pinchLX, p.yMid);
        ctx.lineTo(pinchRX, p.yMid);
        ctx.bezierCurveTo(pinchRX + W*0.05, p.yMid, W*0.85, p.y1, W, p.y1);
    }

    let last = 0;
    function render(ts) {
        requestAnimationFrame(render);
        if (ts - last < 33) return;
        last = ts;
        ctx.clearRect(0, 0, W, H);

        paths.forEach(p => {
            drawPath(p);
            ctx.strokeStyle = withAlpha(accent, 0.10);
            ctx.lineWidth = 1;
            ctx.stroke();

            const pt = pathPos(p, p.t);
            const fade = Math.sin(p.t * Math.PI);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = withAlpha(accent, 0.15 + 0.50 * fade);
            ctx.fill();

            p.t = (p.t + p.speed) % 1;
        });
    }

    build();
    window.addEventListener('resize', build);
    requestAnimationFrame(render);
})();


// ── Convergence chart (FID-50K vs epochs, log-log) ──
(function () {
    const svg = document.getElementById('convergence');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';

    const series = [
        { name: 'REPA', color: 'var(--s-repa)', pts: [[20,19.4],[40,11.1],[80,7.9],[800,5.9]] },
        { name: 'ReDi', color: 'var(--s-redi)', pts: [[20,23.1],[40,12.6],[60,9.7],[80,7.5],[800,3.3]] },
        { name: 'RAE',  color: 'var(--s-rae)', pts: [[20,31],[32,8.26],[48,5.90],[80,4.28],[200,3.1],[260,2.7],[400,2.5],[760,2.39]] },
        { name: 'REG',  color: 'var(--s-reg)', pts: [[20,8.9],[40,5.0],[80,3.4],[200,2.7],[480,2.2],[800,1.8]] },
        { name: 'DF (ours)', color: 'var(--accent)', pts: [[20,4.78],[40,3.08],[50,2.88],[80,2.61],[100,2.47]], ours: true },
    ];

    const W = 520, H = 400, m = { l: 46, r: 14, t: 14, b: 46 };
    const xMin = 18, xMax = 900, yMin = 2.2, yMax = 34;
    const lx = v => m.l + (Math.log(v) - Math.log(xMin)) / (Math.log(xMax) - Math.log(xMin)) * (W - m.l - m.r);
    const ly = v => H - m.b - (Math.log(v) - Math.log(yMin)) / (Math.log(yMax) - Math.log(yMin)) * (H - m.t - m.b);

    function el(tag, attrs, parent = svg) {
        const e = document.createElementNS(NS, tag);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        parent.appendChild(e);
        return e;
    }

    const defs = el('defs', {});
    const clip = el('clipPath', { id: 'plot-clip' }, defs);
    el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b }, clip);

    [20, 40, 100, 200, 400, 800].forEach(v => {
        el('line', { class: 'grid', x1: lx(v), x2: lx(v), y1: m.t, y2: H - m.b });
        el('text', { class: 'tick', x: lx(v), y: H - m.b + 18, 'text-anchor': 'middle' }).textContent = v;
    });
    [3, 4, 5, 8, 12, 20, 30].forEach(v => {
        el('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: ly(v), y2: ly(v) });
        el('text', { class: 'tick', x: m.l - 8, y: ly(v) + 4, 'text-anchor': 'end' }).textContent = v;
    });
    el('text', { class: 'axis-label', x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle' }).textContent = 'Training epochs';
    el('text', { class: 'axis-label', x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle',
                 transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})` }).textContent = 'FID-50K ↓';

    el('line', { class: 'ref', x1: m.l, x2: W - m.r, y1: ly(8.3), y2: ly(8.3) });
    el('text', { class: 'ref-label', x: W - m.r - 4, y: ly(8.3) - 6, 'text-anchor': 'end' }).textContent = 'SiT-XL/2 @1400ep: 8.3';

    const plot = el('g', { 'clip-path': 'url(#plot-clip)' });
    series.forEach(s => {
        const g = el('g', { opacity: s.ours ? 1 : 0.55 }, plot);
        el('polyline', {
            class: 'draw', pathLength: 1,
            points: s.pts.map(([x, y]) => `${lx(x)},${ly(y)}`).join(' '),
            fill: 'none', 'stroke-width': s.ours ? 3.5 : 2.5,
            'stroke-linejoin': 'round', 'stroke-linecap': 'round',
            style: `stroke: ${s.color}; transition-delay: ${s.ours ? 0.9 : 0}s`
        }, g);
        s.pts.forEach(([x, y]) => {
            const c = el('circle', { class: 'pt', cx: lx(x), cy: ly(y), r: s.ours ? 4.5 : 3.5, 'stroke-width': 1.5, style: `fill: ${s.color}; stroke: var(--surface)` }, g);
            el('title', {}, c).textContent = `${s.name}: FID ${y} @ ${x} epochs`;
        });
    });
    el('text', { class: 'final', x: lx(100) + 9, y: ly(2.47) - 8, style: 'fill: var(--accent)', 'font-size': 14, 'font-weight': 700 }).textContent = '2.47';

    const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { svg.classList.add('drawn'); io.disconnect(); }
    }), { threshold: 0.35 });
    io.observe(svg);

    const legend = document.getElementById('convergence-legend');
    series.slice().reverse().forEach(s => {
        const span = document.createElement('span');
        if (s.ours) span.className = 'df';
        span.innerHTML = `<i style="background:${s.color};opacity:${s.ours ? 1 : 0.6}"></i>${s.name}`;
        legend.appendChild(span);
    });
})();


// ── Generic tabs helper ──
function makeTabs(container, items, onSelect) {
    container.innerHTML = '';
    const buttons = items.map((it, i) => {
        const b = document.createElement('button');
        b.className = 'tab';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        b.textContent = it.label;
        b.addEventListener('click', () => {
            buttons.forEach(x => x.setAttribute('aria-selected', 'false'));
            b.setAttribute('aria-selected', 'true');
            onSelect(it, i);
        });
        container.appendChild(b);
        return b;
    });
    onSelect(items[0], 0);
}


// ── Uncurated gallery + lightbox ──
(function () {
    const tabsEl = document.getElementById('gallery-tabs');
    if (!tabsEl) return;
    const grid = document.getElementById('gallery');
    const caption = document.getElementById('gallery-caption');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');

    const sets = [
        { label: 'SiT-XL · 256 · CFG',     dir: 'sit256_cfg',   n: 40, cap: 'Uncurated samples from DF-SiT-XL/2 on ImageNet 256×256, with cfg = 4.0.' },
        { label: 'SiT-XL · 256 · no CFG',  dir: 'sit256_nocfg', n: 40, cap: 'Uncurated samples from DF-SiT-XL/2 on ImageNet 256×256, without guidance.' },
        { label: 'SiT-XL · 512 · CFG',     dir: 'sit512_cfg',   n: 9,  cap: 'Uncurated samples from DF-SiT-XL/2 on ImageNet 512×512, with cfg = 4.0.' },
        { label: 'SiT-XL · 512 · no CFG',  dir: 'sit512_nocfg', n: 9,  cap: 'Uncurated samples from DF-SiT-XL/2 on ImageNet 512×512, without guidance.' },
        { label: 'JiT-XL · 256 · CFG',     dir: 'jit256_cfg',   n: 40, cap: 'Uncurated samples from DF-JiT-XL/16 (pixel space) on ImageNet 256×256, with cfg = 4.0.' },
        { label: 'JiT-XL · 256 · no CFG',  dir: 'jit256_nocfg', n: 40, cap: 'Uncurated samples from DF-JiT-XL/16 (pixel space) on ImageNet 256×256, without guidance.' },
    ];

    function load(set) {
        grid.innerHTML = '';
        grid.classList.toggle('g3', set.n === 9);
        for (let i = 0; i < set.n; i++) {
            const src = `static/images/gallery/${set.dir}/${i}.webp`;
            const b = document.createElement('button');
            b.setAttribute('aria-label', `Enlarge sample ${i + 1}`);
            b.innerHTML = `<img src="${src}" alt="Uncurated sample ${i + 1}" loading="lazy">`;
            b.addEventListener('click', () => {
                lightboxImg.src = src;
                lightbox.hidden = false;
            });
            grid.appendChild(b);
        }
        caption.textContent = set.cap;
    }

    lightbox.addEventListener('click', () => { lightbox.hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') lightbox.hidden = true; });
    makeTabs(tabsEl, sets, load);
})();


// ── Copy BibTeX ──
(function () {
    const btn = document.getElementById('copy-bib');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(document.getElementById('bibtex-text').textContent);
            btn.innerHTML = '<i class="fas fa-check"></i> Copied';
        } catch (e) {
            btn.textContent = 'Select & copy';
        }
        setTimeout(() => { btn.innerHTML = '<i class="far fa-copy"></i> Copy'; }, 1800);
    });
})();
