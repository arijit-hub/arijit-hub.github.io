// Dynamic versions of the paper figures (teaser, training, sampling).
// Diagrams are SVG; images are canvases placed over the SVG in viewBox units.

// SVG colours follow the theme through CSS variables...
const FX = {
    img: 'var(--img)',
    dino: 'var(--dino)',
    acc: 'var(--accent)',
    grad: 'var(--grad)',
    mut: 'var(--faint)',
    manifold: 'var(--grad)',
};
// ...canvases need concrete values, re-read on every theme switch.
let PAL = {};
function readPalette() {
    PAL = Object.fromEntries(['img', 'dino', 'accent', 'grad', 'text', 'muted', 'faint', 'line', 'zero', 'neutral']
        .map(k => [k, cssVar(`--${k}`)]));
}
readPalette();
document.addEventListener('themechange', readPalette);
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


// ── helpers ──

function rng(seed) {
    return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function gauss(r) {
    const u = 1 - r(), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp01 = v => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

function loadImg(src) {
    return new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
    });
}

// Gaussian noise image: the epsilon of x_t = (1 - t) * eps + t * x.
function makeNoise(n, seed) {
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const ctx = c.getContext('2d');
    const d = ctx.createImageData(n, n);
    const r = rng(seed);
    for (let i = 0; i < n * n; i++) {
        for (let k = 0; k < 3; k++) d.data[i * 4 + k] = Math.max(0, Math.min(255, 128 + 62 * gauss(r)));
        d.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(d, 0, 0);
    return c;
}

// Linear interpolation drawn with alpha: no pixel reads, so it also works from file://.
function drawMix(ctx, noise, img, t) {
    const n = ctx.canvas.width;
    ctx.globalAlpha = 1;
    ctx.drawImage(noise, 0, 0, n, n);
    ctx.globalAlpha = clamp01(t);
    ctx.drawImage(img, 0, 0, n, n);
    ctx.globalAlpha = 1;
}

// Cheap blur: draw tiny, then upscale with smoothing.
const _tmp = document.createElement('canvas');
function drawBlurred(ctx, img, res) {
    const n = ctx.canvas.width, s = Math.max(2, Math.round(res));
    _tmp.width = _tmp.height = s;
    const t = _tmp.getContext('2d');
    t.imageSmoothingQuality = 'high';
    t.drawImage(img, 0, 0, s, s);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(_tmp, 0, 0, s, s, 0, 0, n, n);
}

// The all-zeros self-condition used at the first step.
function drawZeros(ctx) {
    const n = ctx.canvas.width;
    ctx.fillStyle = PAL.zero;
    ctx.fillRect(0, 0, n, n);
    const g = n / 3;
    ctx.strokeStyle = withAlpha(PAL.accent, 0.35);
    ctx.lineWidth = n / 64;
    ctx.fillStyle = withAlpha(PAL.accent, 0.75);
    ctx.font = `${Math.round(g * 0.42)}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        ctx.strokeRect(i * g + g * 0.14, j * g + g * 0.14, g * 0.72, g * 0.72);
        ctx.fillText('0', i * g + g / 2, j * g + g / 2 + 1);
    }
}

function overlay(stage, W, H, x, y, w, h, el) {
    const box = document.createElement('div');
    box.className = 'ov';
    Object.assign(box.style, {
        left: (x / W * 100) + '%', top: (y / H * 100) + '%',
        width: (w / W * 100) + '%', height: (h / H * 100) + '%',
    });
    box.appendChild(el);
    stage.appendChild(box);
    return el;
}
function ovCanvas(stage, W, H, x, y, w, h, res = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = res;
    return overlay(stage, W, H, x, y, w, h, c).getContext('2d');
}

function markers() {
    return `<defs>${Object.entries(FX).map(([k, c]) =>
        `<marker id="fxm-${k}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,4 L0,8 z" style="fill:${c}"/></marker>`).join('')}</defs>`;
}
// A solid wire with an arrow head, plus a dotted "flow" overlay that animates.
function wire(d, color, { show = '', arrow = true, flow = true, id = '', rev = false } = {}) {
    const s = show ? ` data-show="${show}"` : '';
    return `<path${id ? ` id="${id}"` : ''} d="${d}" class="wire" style="stroke:${FX[color]}"${arrow ? ` marker-end="url(#fxm-${color})"` : ''}/>` +
        (flow ? `<path d="${d}" class="flow${rev ? ' rev' : ''}" style="stroke:${FX[color]}"${s}/>` : '');
}
const plus = (x, y) => `<circle cx="${x}" cy="${y}" r="9" class="plus"/><path d="M${x - 4.5} ${y}h9M${x} ${y - 4.5}v9" class="plus-x"/>`;
const sub = (base, s, x, y, anchor = 'start', cls = 'm') =>
    `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${base}<tspan class="sub" dy="4">${s}</tspan></text>`;

// pseudo-3D token, like the paper's cubes
function tok(x, y, kind, s = 18, label = '') {
    return `<g class="tok tok--${kind}">
        <path d="M${x} ${y}l4 -4h${s}l-4 4z" class="tt"/>
        <path d="M${x + s} ${y}l4 -4v${s}l-4 4z" class="ts"/>
        <rect x="${x}" y="${y}" width="${s}" height="${s}" class="tf"/>
        ${label ? `<text x="${x + s / 2}" y="${y + s / 2 + 3.5}" text-anchor="middle" class="tl">${label}</text>` : ''}
    </g>`;
}
function col(x, y0, n, kind, label = '', gap = 22) {
    let s = '';
    for (let i = 0; i < n; i++) s += tok(x, y0 + i * gap, kind, 18, label);
    return s;
}

function onVisible(el, cb) {
    const io = new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: '80px' });
    io.observe(el);
}

function setPlayIcon(btn, playing) {
    btn.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}


// ── Figure 1: co-denoising vs Dino Forcing ──
(async function teaser() {
    const root = document.getElementById('fx-teaser');
    if (!root) return;
    const [parrot, pca] = await Promise.all([
        loadImg('static/images/figs/parrot.webp'),
        loadImg('static/images/figs/parrot_pca.webp'),
    ]);
    const nX = makeNoise(128, 7), nZ = makeNoise(128, 11);
    const W = 480, H = 236;
    const tD = tau => 1 - Math.pow(1 - tau, 2.6);   // representation denoised ahead of the image
    const DT = 0.15;

    function pipe(stage, mode) {
        const co = mode === 'co';
        stage.innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${markers()}
            ${co
                ? wire('M95 47H311', 'dino') + plus(320, 47) + wire('M329 47H383', 'dino', { flow: false }) +
                  wire('M160 47V90H183', 'dino')
                : wire('M95 47H160V90H183', 'dino') + wire('M295 90H320V47H383', 'dino')}
            ${wire('M116 162H311', 'img')}${plus(320, 162)}${wire('M329 162H362', 'img', { flow: false })}
            ${wire('M160 162V120H183', 'img')}
            ${co ? wire('M295 90H320V58', 'dino') : ''}
            ${wire('M295 120H320V151', 'img')}
            <rect x="185" y="72" width="110" height="66" rx="10" class="${co ? 'model model--prior' : 'model'}"/>
            <text x="240" y="${co ? 101 : 109}" text-anchor="middle" class="model-t">${co ? 'Prior' : 'Ours'}</text>
            ${co ? '<text x="240" y="119" text-anchor="middle" class="model-t">work</text>' : ''}
            <text x="240" y="38" text-anchor="middle" class="lbl">${co ? 'DINO ODE' : 'DINO prediction'}</text>
            <text x="240" y="182" text-anchor="middle" class="lbl">Image ODE</text>
            ${co ? sub('z', 't<tspan font-size="8">D</tspan>', 101, 38) : '<text x="101" y="38" class="m">ẑ</text>'}
            <text x="66" y="90" text-anchor="middle" class="ro ro--dino" data-ro="z">${co ? 't_D=0.00' : 'zeros'}</text>
            ${sub('x', co ? 't<tspan font-size="8">I</tspan>' : 't', 122, 154)}
            <text x="122" y="181" class="ro ro--img" data-ro="x">t=0.00</text>
            ${co ? sub('v', 'z', 326, 80) : ''}
            ${sub('v', 'x', 326, 142)}
            ${co ? sub('z', 't+Δt', 414, 92, 'middle') : '<text x="414" y="92" text-anchor="middle" class="m">ẑ</text>'}
            ${sub('x', 't+Δt', 414, 229, 'middle')}
        </svg>`;
        return {
            zin: ovCanvas(stage, W, H, 37, 18, 58, 58),
            xin: ovCanvas(stage, W, H, 16, 112, 100, 100),
            zout: ovCanvas(stage, W, H, 385, 18, 58, 58),
            xout: ovCanvas(stage, W, H, 364, 112, 100, 100),
            roZ: stage.querySelector('[data-ro="z"]'),
            roX: stage.querySelector('[data-ro="x"]'),
        };
    }

    // DF's prediction of the DINO map: blurry early (posterior mean), sharp late.
    function drawPred(ctx, tau) {
        if (tau < 0.02) return drawZeros(ctx);
        drawBlurred(ctx, pca, 2 + Math.pow(tau, 1.8) * 62);
        ctx.globalAlpha = 0.55 * Math.pow(1 - tau, 2);
        ctx.fillStyle = '#6f6a8a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.width);
        ctx.globalAlpha = 1;
    }

    // ── particles in (image, DINO) space ──
    const r = rng(3);
    const phi = x => 1.2 + 0.42 * Math.sin(2.6 * x) + 0.12 * x;  // the data manifold z = phi(x)
    const P = Array.from({ length: 34 }, (_, i) => {
        const x1 = Math.max(0.75, Math.min(2.55, (i % 2 ? 1.15 : 2.1) + 0.16 * gauss(r)));
        return { x1, z1: phi(x1), eI: 0.4 * gauss(r), eD: 0.4 * gauss(r), jit: (r() - 0.5) * 4 };
    });
    const cx = P.reduce((a, p) => a + p.x1, 0) / P.length;
    const cz = P.reduce((a, p) => a + p.z1, 0) / P.length;
    const trainPts = Array.from({ length: 70 }, () => [r(), r()]);

    const FW = 480, FH = 250, L = 34, R = 12, T = 14, B = 26;
    const X = x => L + (x + 1.4) / 4.2 * (FW - L - R);
    const Z = z => FH - B - (z + 1.3) / 3.6 * (FH - T - B);
    const AXIS = -1.05;

    function posCo(p, s) {
        const a = s, b = tD(s);
        return [X(lerp(p.eI, p.x1, a)), Z(lerp(p.eD, p.z1, b))];
    }
    function posDF(p, s) { return [X(lerp(p.eI, p.x1, s)), Z(AXIS) + p.jit]; }
    function predDF(p, s) {
        const w = smooth(clamp01(Math.pow(s, 0.8)));
        return [X(lerp(cx, p.x1, w)), Z(lerp(cz, p.z1, w))];
    }

    function drawFlow(cv, mode, tau) {
        const dpr = window.devicePixelRatio || 1;
        const w = cv.clientWidth, h = cv.clientHeight;
        if (!w) return;
        if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        const ctx = cv.getContext('2d');
        ctx.setTransform(cv.width / FW, 0, 0, cv.height / FH, 0, 0);
        ctx.clearRect(0, 0, FW, FH);
        ctx.font = '10px JetBrains Mono, monospace';

        // axes
        ctx.strokeStyle = PAL.line; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(-1.3), Z(2.2)); ctx.lineTo(X(-1.3), Z(AXIS)); ctx.lineTo(X(2.75), Z(AXIS)); ctx.stroke();
        ctx.fillStyle = PAL.faint;
        ctx.textAlign = 'right'; ctx.fillText('image →', X(2.75), Z(AXIS) + 16);
        ctx.save(); ctx.translate(X(-1.3) - 8, Z(0.6)); ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center'; ctx.fillText('DINO →', 0, 0); ctx.restore();

        // data manifold
        ctx.beginPath();
        for (let x = 0.7; x <= 2.62; x += 0.02) ctx.lineTo(X(x), Z(phi(x)));
        ctx.strokeStyle = withAlpha(PAL.grad, 0.18); ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();
        ctx.strokeStyle = withAlpha(PAL.grad, 0.85); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = withAlpha(PAL.grad, 0.9); ctx.textAlign = 'left';
        ctx.fillText('data: (x, φ(x))', X(1.45), Z(phi(2.62)) - 22);

        // noise source
        const co = mode === 'co';
        const g = co
            ? ctx.createRadialGradient(X(0), Z(0), 0, X(0), Z(0), 46)
            : ctx.createRadialGradient(X(0), Z(AXIS), 0, X(0), Z(AXIS), 40);
        g.addColorStop(0, co ? withAlpha(PAL.neutral, 0.28) : withAlpha(PAL.img, 0.35));
        g.addColorStop(1, withAlpha(co ? PAL.neutral : PAL.img, 0));
        ctx.fillStyle = g;
        if (co) { ctx.fillRect(X(0) - 50, Z(0) - 50, 100, 100); }
        else { ctx.save(); ctx.translate(X(0), Z(AXIS)); ctx.scale(1, 0.32); ctx.translate(-X(0), -Z(AXIS)); ctx.fillRect(X(0) - 44, Z(AXIS) - 44, 88, 88); ctx.restore(); }
        ctx.fillStyle = PAL.muted; ctx.textAlign = 'center';
        ctx.fillText(co ? 'ε_I, ε_D ~ N(0, I)' : 'ε_I ~ N(0, I)', X(0), co ? Z(0) + 58 : Z(AXIS) - 12);

        // trajectories
        const steps = 24;
        P.forEach(p => {
            ctx.beginPath();
            for (let k = 0; k <= steps; k++) {
                const s = tau * k / steps;
                const [x, y] = co ? posCo(p, s) : posDF(p, s);
                k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.strokeStyle = co ? withAlpha(PAL.neutral, 0.22) : withAlpha(PAL.img, 0.30);
            ctx.lineWidth = 1; ctx.stroke();

            if (!co) {
                ctx.beginPath();
                for (let k = 0; k <= steps; k++) {
                    const [x, y] = predDF(p, tau * k / steps);
                    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                }
                ctx.strokeStyle = withAlpha(PAL.dino, 0.16); ctx.stroke();
            }
        });
        P.forEach(p => {
            if (co) {
                const [x, y] = posCo(p, tau);
                ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7);
                ctx.fillStyle = PAL.neutral; ctx.fill();
            } else {
                const [x, y] = posDF(p, tau), [px, py] = predDF(p, tau);
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(px, py);
                ctx.setLineDash([2, 3]); ctx.strokeStyle = withAlpha(PAL.dino, 0.22); ctx.stroke(); ctx.setLineDash([]);
                ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fillStyle = PAL.img; ctx.fill();
                ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 7); ctx.fillStyle = PAL.dino; ctx.fill();
            }
        });

        // inset: the time domain the network must cover
        const ix = X(-1.3) + 14, iy = 12, S = 44;
        ctx.textAlign = 'left'; ctx.fillStyle = PAL.muted;
        if (co) {
            ctx.strokeStyle = PAL.line; ctx.strokeRect(ix, iy, S, S);
            ctx.fillStyle = withAlpha(PAL.dino, 0.35);
            trainPts.forEach(([a, b]) => ctx.fillRect(ix + a * S - 0.8, iy + S - b * S - 0.8, 1.6, 1.6));
            ctx.beginPath();
            for (let k = 0; k <= 30; k++) { const s = k / 30; ctx.lineTo(ix + s * S, iy + S - tD(s) * S); }
            ctx.strokeStyle = withAlpha(PAL.text, 0.6); ctx.stroke();
            ctx.beginPath(); ctx.arc(ix + tau * S, iy + S - tD(tau) * S, 3, 0, 7); ctx.fillStyle = PAL.text; ctx.fill();
            ctx.fillStyle = PAL.muted;
            ctx.fillText('(t_I, t_D) ∈ [0,1]²', ix + S + 8, iy + 14);
            ctx.fillText('image + DINO schedules', ix + S + 8, iy + 28);
            ctx.fillText('to hand-craft', ix + S + 8, iy + 40);
        } else {
            const ly = iy + S / 2;
            ctx.strokeStyle = PAL.line; ctx.beginPath(); ctx.moveTo(ix, ly); ctx.lineTo(ix + S, ly); ctx.stroke();
            ctx.fillStyle = withAlpha(PAL.accent, 0.45);
            for (let k = 0; k <= 10; k++) ctx.fillRect(ix + k / 10 * S - 0.8, ly - 0.8, 1.6, 1.6);
            ctx.beginPath(); ctx.arc(ix + tau * S, ly, 3, 0, 7); ctx.fillStyle = PAL.accent; ctx.fill();
            ctx.fillStyle = PAL.muted;
            ctx.fillText('t ∈ [0,1]', ix + S + 8, ly - 3);
            ctx.fillText('image schedule only', ix + S + 8, ly + 11);
        }
    }

    const panels = [...root.querySelectorAll('[data-mode]')].map(el => {
        const mode = el.dataset.mode;
        return { mode, flow: el.querySelector('.fx-flow'), ...pipe(el.querySelector('.fx-stage'), mode) };
    });

    function render(tau) {
        const t2 = Math.min(1, tau + DT);
        panels.forEach(p => {
            if (p.mode === 'co') {
                drawMix(p.zin, nZ, pca, tD(tau));
                drawMix(p.zout, nZ, pca, tD(t2));
                drawMix(p.xin, nX, parrot, tau);
                drawMix(p.xout, nX, parrot, t2);
                p.roZ.textContent = `t_D=${tD(tau).toFixed(2)}`;
                p.roX.textContent = `t_I=${tau.toFixed(2)}`;
            } else {
                drawPred(p.zin, tau);
                drawPred(p.zout, t2);
                drawMix(p.xin, nX, parrot, tau);
                drawMix(p.xout, nX, parrot, t2);
                p.roZ.textContent = tau < 0.02 ? 'zeros' : 'previous pred.';
                p.roX.textContent = `t=${tau.toFixed(2)}`;
            }
            drawFlow(p.flow, p.mode, tau);
        });
        slider.value = Math.round(tau * 1000);
        tval.textContent = `t = ${tau.toFixed(2)}`;
    }

    // ── timeline ──
    const slider = root.querySelector('input[type="range"]');
    const tval = root.querySelector('.tval');
    const playBtn = root.querySelector('.play');
    let tau = REDUCED ? 0.45 : 0, playing = !REDUCED, visible = false, hold = 0, last = 0;

    function setPlaying(v) { playing = v; setPlayIcon(playBtn, v); root.classList.toggle('paused', !v); }
    playBtn.addEventListener('click', () => { if (tau >= 1) tau = 0; setPlaying(!playing); });
    slider.addEventListener('input', () => { setPlaying(false); tau = slider.value / 1000; render(tau); });
    window.addEventListener('resize', () => render(tau));
    document.addEventListener('themechange', () => render(tau));
    onVisible(root, v => { visible = v; });

    function loop(ts) {
        requestAnimationFrame(loop);
        const dt = Math.min(64, ts - (last || ts)); last = ts;
        if (!visible || !playing) return;
        if (tau >= 1) { hold += dt; if (hold > 1500) { tau = 0; hold = 0; } else return; }
        tau = Math.min(1, tau + dt / 5000);
        render(tau);
    }
    setPlaying(playing);
    render(tau);
    requestAnimationFrame(loop);
})();


// ── Figure 2: two-pass training ──
(function training() {
    const root = document.getElementById('fx-train');
    if (!root) return;
    const stage = root.querySelector('.fx-stage');
    // Rows: DINO at YD, image at YI; the model sits halfway, inputs and outputs mirror each other.
    const W = 920, H = 360, YD = 112, YI = 262, YM = (YD + YI) / 2;

    const grid = (kind) => {
        let s = '';
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
            const x = 30 + i * 30, y = YD - 42 + j * 30;
            s += kind === 'zero'
                ? `<rect x="${x}" y="${y}" width="26" height="26" rx="4" class="zt"/><text x="${x + 13}" y="${y + 17}" text-anchor="middle" class="ztl">0</text>`
                : `<rect x="${x}" y="${y}" width="26" height="26" rx="4" class="dt" style="fill-opacity:${0.18 + ((i * 7 + j * 5) % 9) / 14}"/>`;
        }
        return s;
    };
    const catCol = (kind) => {
        let s = '';
        for (let i = 0; i < 6; i++) {
            const y = YM - 64 + i * 22;
            s += kind === 'img'
                ? `<rect x="232" y="${y}" width="10" height="18" class="ct ct--img"/>`
                : `<rect x="242" y="${y}" width="10" height="18" class="ct ct--${kind}"/>`;
        }
        return s;
    };
    // 6-token column centred on y: 5 gaps of 22 + one token of 18
    const col6 = y => y - 64, col4 = y => y - 42;

    stage.innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${markers()}
        <!-- feedback: look-ahead becomes the self-condition -->
        ${wire(`M519 ${col4(YD) - 6}V24H73V${YD - 46}`, 'dino', { id: 'fx-fb', show: '1' })}
        <text x="296" y="16" text-anchor="middle" class="lbl lbl--dino">the look-ahead prediction is fed back as the self-condition</text>
        <text x="296" y="40" text-anchor="middle" class="lbl lbl--grad" data-show="3">✕ stop-gradient: pass 1 gets no gradient</text>

        <g data-show="1">${grid('zero')}</g>
        <g data-show="2 3">${grid('dino')}</g>
        <text x="73" y="${YD + 56}" text-anchor="middle" class="lbl">self-condition</text>
        <text x="73" y="${YD + 70}" text-anchor="middle" class="lbl lbl--dino" data-show="1">zeros</text>
        <text x="73" y="${YD + 70}" text-anchor="middle" class="lbl lbl--dino" data-show="2 3">look-ahead ẑ</text>
        <text x="73" y="${YI + 72}" text-anchor="middle" class="lbl">noisy image</text>
        ${sub('x', 't', 73, YI + 88, 'middle')}

        ${wire(`M118 ${YD}H152`, 'dino', { show: '1 2' })}
        ${wire(`M130 ${YI}H152`, 'img', { show: '1 2' })}
        <g data-show="1">${col(158, col6(YD), 6, 'zero', '0')}</g>
        <g data-show="2 3">${col(158, col6(YD), 6, 'dino')}</g>
        ${col(158, col6(YI), 6, 'img')}

        ${wire(`M184 ${YD}H206V${YM - 30}H226`, 'dino', { show: '1 2' })}
        ${wire(`M184 ${YI}H206V${YM + 30}H226`, 'img', { show: '1 2' })}
        ${catCol('img')}
        <g data-show="1">${catCol('zero')}</g>
        <g data-show="2 3">${catCol('dino')}</g>
        <text x="242" y="${YM + 88}" text-anchor="middle" class="lbl">concat</text>
        <text x="242" y="${YM + 101}" text-anchor="middle" class="lbl">(channels)</text>

        ${wire(`M256 ${YM}H298`, 'acc', { show: '1 2' })}
        <rect x="300" y="${YM - 60}" width="150" height="120" rx="12" class="model"/>
        <rect x="296" y="${YM - 64}" width="158" height="128" rx="15" class="model-glow" data-show="3"/>
        <text x="375" y="${YM - 4}" text-anchor="middle" class="model-t">Model</text>
        <text x="375" y="${YM + 14}" text-anchor="middle" class="lbl" data-show="1">pass 1 · no grad</text>
        <text x="375" y="${YM + 14}" text-anchor="middle" class="lbl" data-show="2">pass 2</text>
        <text x="375" y="${YM + 14}" text-anchor="middle" class="lbl lbl--grad" data-show="3">∇θ update</text>
        <rect x="340" y="${YM + 90}" width="70" height="22" rx="5" class="chip"/>
        <text x="375" y="${YM + 105}" text-anchor="middle" class="chip-t">&lt;cls&gt;</text>
        ${wire(`M375 ${YM + 90}V${YM + 62}`, 'mut', { show: '1 2' })}

        ${wire(`M450 ${YM - 30}H480V${YD}H502`, 'dino', { show: '1 2' })}
        <g data-dim="0.15" data-show="2 3">${wire(`M450 ${YM + 30}H480V${YI}H502`, 'img', { show: '2' })}</g>
        ${col(510, col4(YD), 4, 'dino')}
        <g data-dim="0.15" data-show="2 3">${col(510, col4(YI), 4, 'img')}</g>
        <text x="506" y="${col4(YD) - 8}" text-anchor="end" class="m" data-show="1">ẑ⁽ᶲ⁾</text>
        <text x="506" y="${col4(YD) - 8}" text-anchor="end" class="m" data-show="2 3">ẑ</text>
        <g data-dim="0.15" data-show="2 3">${sub('v', 'θ', 521, col4(YI) + 106, 'middle')}</g>

        <g data-dim="0.12" data-show="2 3">
            ${wire(`M538 ${YD}H588`, 'dino', { show: '2' })}
            <rect x="590" y="${YD - 24}" width="172" height="48" rx="8" class="loss"/>
            <text x="676" y="${YD - 4}" text-anchor="middle" class="m">ℒ<tspan class="sub" dy="4">align</tspan></text>
            <text x="676" y="${YD + 15}" text-anchor="middle" class="lbl">−cos(ẑ, φ(x))</text>
            ${wire(`M842 ${YD}H764`, 'dino', { show: '2' })}
            ${col(850, col4(YD), 4, 'tgt')}
            <text x="861" y="${col4(YD) - 12}" text-anchor="middle" class="m">φ(x)</text>
            <text x="861" y="${YD + 60}" text-anchor="middle" class="lbl">DINOv2 ❄</text>

            ${wire(`M538 ${YI}H588`, 'img', { show: '2' })}
            <rect x="590" y="${YI - 24}" width="172" height="48" rx="8" class="loss"/>
            <text x="676" y="${YI - 4}" text-anchor="middle" class="m">ℒ<tspan class="sub" dy="4">FM</tspan></text>
            <text x="676" y="${YI + 15}" text-anchor="middle" class="lbl">‖v − (x − ε)‖²</text>
            ${wire(`M842 ${YI}H764`, 'img', { show: '2' })}
            <text x="861" y="${YI + 4}" text-anchor="middle" class="m">x − ε</text>
        </g>

        <g data-show="3" data-dim="0">
            ${wire(`M590 ${YD + 12}H470V${YM - 15}H452`, 'grad', { rev: false })}
            ${wire(`M590 ${YI - 12}H470V${YM + 15}H452`, 'grad', { rev: false })}
        </g>
        <g class="flyers"></g>
    </svg>`;
    const img = document.createElement('img');
    img.src = 'static/images/figs/puppy_noisy.webp';
    img.alt = '';
    overlay(stage, W, H, 18, YI - 55, 110, 110, img);

    const svg = stage.querySelector('svg');
    const fb = svg.querySelector('#fx-fb');
    const flyers = svg.querySelector('.flyers');
    const phaseBtns = [...root.querySelectorAll('[data-phase]')];
    const cap = root.querySelector('.caption');
    const playBtn = root.querySelector('.play');
    const captions = {
        1: '<strong>Pass 1 · look-ahead.</strong> The noisy image goes in with an all-zeros self-condition. The model predicts the DINO features ẑ⁽ᶲ⁾ of the clean image. No gradients.',
        2: '<strong>Pass 2 · condition &amp; predict.</strong> ẑ⁽ᶲ⁾ replaces the zeros. The same model now predicts the velocity v and a refined ẑ, supervised by flow matching and by cosine alignment to frozen DINOv2 features.',
        3: '<strong>Backprop.</strong> Gradients from ℒ<sub>FM</sub> + λ ℒ<sub>align</sub> flow through pass 2 only. The look-ahead is a stop-gradient input.',
    };

    let phase = 0, playing = !REDUCED, timer = null, visible = false;
    function setPhase(p) {
        phase = p;
        svg.querySelectorAll('[data-show]').forEach(el => {
            const on = el.dataset.show.split(' ').includes(String(p));
            el.style.opacity = on ? 1 : (el.dataset.dim ?? 0);
        });
        phaseBtns.forEach(b => b.setAttribute('aria-selected', String(+b.dataset.phase === p)));
        cap.innerHTML = captions[p];
    }

    // tokens travelling along the feedback wire between pass 1 and pass 2
    function fly(done) {
        const len = fb.getTotalLength();
        flyers.innerHTML = [0, 1, 2].map(() => '<rect width="11" height="11" rx="2" class="flyer"/>').join('');
        const rects = [...flyers.children];
        const t0 = performance.now(), dur = 1100;
        (function step(now) {
            const k = (now - t0) / dur;
            rects.forEach((r, i) => {
                const s = clamp01(k - i * 0.12);
                const pt = fb.getPointAtLength(smooth(s) * len);
                r.setAttribute('x', pt.x - 5.5); r.setAttribute('y', pt.y - 5.5);
                r.style.opacity = s <= 0 || s >= 1 ? 0 : 1;
            });
            if (k < 1.3) requestAnimationFrame(step); else { flyers.innerHTML = ''; done(); }
        })(t0);
    }

    function schedule() {
        clearTimeout(timer);
        if (!playing || !visible) return;
        const wait = { 1: 2600, 2: 2800, 3: 2600 }[phase];
        timer = setTimeout(() => {
            if (!playing) return;
            if (phase === 1) fly(() => { setPhase(2); schedule(); });
            else { setPhase(phase === 2 ? 3 : 1); schedule(); }
        }, wait);
    }
    function setPlaying(v) {
        playing = v; setPlayIcon(playBtn, v);
        root.classList.toggle('paused', !v);
        schedule();
    }
    phaseBtns.forEach(b => b.addEventListener('click', () => { setPlaying(false); setPhase(+b.dataset.phase); }));
    playBtn.addEventListener('click', () => setPlaying(!playing));
    onVisible(root, v => { visible = v; schedule(); });
    setPhase(1);
    setPlaying(playing);
})();


// ── Figure 3: sampling roll-out ──
(function sampling() {
    const root = document.getElementById('fx-sample');
    if (!root) return;
    const stage = root.querySelector('.fx-stage');
    const W = 920, H = 372, STEPS = 50;

    // Left column centred at x=96, right at x=620, model halfway (358); ẑ row at y=88, x row at y=236.
    // Both branch drops sit 63 from the model on either side (x=220 and x=496).
    stage.innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${markers()}
        ${wire('M668 88H700V16H96V38', 'dino')}
        <text x="398" y="34" text-anchor="middle" class="lbl lbl--dino">ẑ becomes the self-condition of the next step</text>
        ${wire('M680 236H712V352H96V298', 'img')}
        <text x="404" y="344" text-anchor="middle" class="lbl lbl--img">next step</text>

        <text x="96" y="152" text-anchor="middle" class="lbl" data-ro="cond">zeros at step 1</text>
        <text x="30" y="240" text-anchor="end" class="m">x<tspan class="sub" dy="4">t</tspan></text>

        ${wire('M144 88H220V137H281', 'dino')}
        ${wire('M220 236V187H281', 'img')}
        <rect x="283" y="112" width="150" height="100" rx="12" class="model"/>
        <text x="358" y="167" text-anchor="middle" class="model-t">Model</text>
        <rect x="323" y="62" width="70" height="22" rx="5" class="chip"/>
        <text x="358" y="77" text-anchor="middle" class="chip-t">&lt;cls&gt;</text>
        ${wire('M358 84V110', 'mut')}

        ${wire('M433 137H496V88H570', 'dino')}
        <text x="620" y="154" text-anchor="middle" class="lbl lbl--dino">prediction ẑ</text>
        ${wire('M433 187H496V225', 'img')}
        <text x="504" y="206" class="lbl lbl--img">ODE step</text>
        <text x="504" y="222" class="m">v·Δt</text>
        ${wire('M156 236H485', 'img')}
        ${plus(496, 236)}
        ${wire('M505 236H558', 'img', { flow: false })}
        <text x="620" y="318" text-anchor="middle" class="m">x<tspan class="sub" dy="4">t+Δt</tspan></text>

        <text x="820" y="146" text-anchor="middle" class="big" data-ro="step">step 1 / 50</text>
        <text x="820" y="174" text-anchor="middle" class="ro ro--acc" data-ro="t">t = 0.00</text>
        <rect x="750" y="192" width="140" height="4" rx="2" class="bar"/>
        <rect x="750" y="192" width="0" height="4" rx="2" class="bar-fill" data-ro="bar"/>
        <text x="820" y="222" text-anchor="middle" class="lbl">Euler · ${STEPS} steps</text>
    </svg>`;
    const zc = ovCanvas(stage, W, H, 48, 40, 96, 96, 160);
    const xt = ovCanvas(stage, W, H, 36, 176, 120, 120, 192);
    const zo = ovCanvas(stage, W, H, 572, 40, 96, 96, 160);
    const xn = ovCanvas(stage, W, H, 560, 176, 120, 120, 192);
    const ro = k => stage.querySelector(`[data-ro="${k}"]`);
    const noise = makeNoise(192, 5);
    const xhat = document.createElement('canvas'); xhat.width = xhat.height = 256;
    const zhat = document.createElement('canvas'); zhat.width = zhat.height = 256;

    const times = [0, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 1.0];
    const sets = [];
    [['sit256', 'SiT-XL · 256'], ['sit512', 'SiT-XL · 512'], ['jit256', 'JiT-XL · 256']].forEach(([key, name]) =>
        ['s0', 's1'].forEach((s, i) => sets.push({ label: `${name} · #${i + 1}`, base: `static/images/progression/${key}/${s}` })));

    let frames = null, step = 0, playing = !REDUCED, visible = false, timer = null, hold = 0;
    const slider = root.querySelector('input[type="range"]');
    const playBtn = root.querySelector('.play');
    const tval = root.querySelector('.tval');
    const strip = root.querySelector('.strip');

    // Crossfade between the stored intermediate predictions at time t.
    function at(list, t, out) {
        let i = 0;
        while (i < times.length - 2 && t > times[i + 1]) i++;
        const f = clamp01((t - times[i]) / (times[i + 1] - times[i]));
        const c = out.getContext('2d');
        c.globalAlpha = 1; c.drawImage(list[i], 0, 0, 256, 256);
        c.globalAlpha = f; c.drawImage(list[i + 1], 0, 0, 256, 256);
        c.globalAlpha = 1;
        return out;
    }

    function render() {
        if (!frames) return;
        const t = step / STEPS, t2 = (step + 1) / STEPS;
        if (step === 0) drawZeros(zc);
        else zc.drawImage(at(frames.pca, (step - 1) / STEPS, zhat), 0, 0, 160, 160);
        zo.drawImage(at(frames.pca, t, zhat), 0, 0, 160, 160);
        drawMix(xt, noise, at(frames.img, t, xhat), t);
        drawMix(xn, noise, at(frames.img, t2, xhat), t2);
        ro('cond').textContent = step === 0 ? 'zeros at step 1' : `ẑ from step ${step}`;
        ro('step').textContent = `step ${step + 1} / ${STEPS}`;
        ro('t').textContent = `t = ${t.toFixed(2)} → ${t2.toFixed(2)}`;
        ro('bar').setAttribute('width', 140 * (step + 1) / STEPS);
        slider.value = step;
        tval.textContent = `step ${step + 1}`;
        let active = 0;
        while (active < times.length - 1 && t2 >= times[active + 1] - 1e-6) active++;
        strip.querySelectorAll('button').forEach((b, j) => b.classList.toggle('active', j === active));
    }

    async function load(set) {
        const ids = [...times.keys()];
        const [img, pca] = await Promise.all([
            Promise.all(ids.map(i => loadImg(`${set.base}/img_${i}.webp`))),
            Promise.all(ids.map(i => loadImg(`${set.base}/pca_${i}.webp`))),
        ]);
        frames = { img, pca };
        strip.innerHTML = '';
        times.forEach((tt, i) => {
            const b = document.createElement('button');
            b.setAttribute('aria-label', `Jump to t = ${tt}`);
            b.innerHTML = `<img src="${set.base}/img_${i}.webp" alt=""><span>t=${tt.toFixed(1)}</span>`;
            b.addEventListener('click', () => { setPlaying(false); step = Math.max(0, Math.round(tt * STEPS) - 1); render(); });
            strip.appendChild(b);
        });
        render();
    }

    function tick() {
        clearTimeout(timer);
        if (!playing || !visible) return;
        timer = setTimeout(() => {
            if (step >= STEPS - 1) {
                hold++;
                if (hold > 12) { hold = 0; step = 0; }
            } else step++;
            render();
            tick();
        }, 130);
    }
    function setPlaying(v) {
        playing = v; setPlayIcon(playBtn, v);
        root.classList.toggle('paused', !v);
        tick();
    }
    playBtn.addEventListener('click', () => { if (step >= STEPS - 1) step = 0; setPlaying(!playing); });
    slider.addEventListener('input', () => { setPlaying(false); step = +slider.value; render(); });
    onVisible(root, v => { visible = v; tick(); });
    document.addEventListener('themechange', render);

    makeTabs(root.querySelector('.tabs'), sets, set => load(set));
    if (REDUCED) step = 24;
    setPlaying(playing);
})();
