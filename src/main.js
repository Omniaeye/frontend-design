import './style.css';

const canvas = document.querySelector('#signal-field');
const ctx = canvas.getContext('2d', { alpha: true });
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let width = 0;
let height = 0;
let ratio = 1;
let pointerX = 0.68;
let pointerY = 0.48;
let scrollProgress = 0;

const palette = ['#78f2c2', '#18e69a', '#a8b8bd', '#28545b'];
const nodes = Array.from({ length: 76 }, (_, index) => ({
  x: Math.random(),
  y: Math.random(),
  depth: 0.35 + Math.random() * 0.85,
  phase: Math.random() * Math.PI * 2,
  size: index % 11 === 0 ? 2.2 : 0.65 + Math.random() * 1.25,
  color: palette[index % palette.length],
}));

function resize() {
  const rect = canvas.getBoundingClientRect();
  ratio = Math.min(devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function draw(time = 0) {
  ctx.clearRect(0, 0, width, height);
  const t = reduceMotion ? 0 : time * 0.00014;
  const lensX = width * (0.68 + (pointerX - 0.68) * 0.025);
  const lensY = height * (0.47 + (pointerY - 0.47) * 0.025);

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    let x = ((node.x + t * node.depth) % 1.18) * width - width * 0.09;
    let y = node.y * height + Math.sin(t * 13 + node.phase) * 16 * node.depth;
    const dx = lensX - x;
    const dy = lensY - y;
    const distance = Math.hypot(dx, dy);
    const influence = Math.max(0, 1 - distance / Math.min(width, height) / 0.55);
    x += dx * influence * scrollProgress * 0.12;
    y += dy * influence * scrollProgress * 0.12;

    ctx.globalAlpha = 0.12 + influence * 0.55;
    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(x, y, node.size * node.depth, 0, Math.PI * 2);
    ctx.fill();

    if (influence > 0.54 && i % 3 === 0) {
      ctx.globalAlpha = (influence - 0.5) * 0.22;
      ctx.strokeStyle = '#78f2c2';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(lensX, lensY);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(draw);
}

function updateScroll() {
  scrollProgress = Math.min(1, Math.max(0, scrollY / Math.max(innerHeight, 1)));
  document.documentElement.style.setProperty('--progress', scrollProgress.toFixed(3));
}

addEventListener('resize', resize, { passive: true });
addEventListener('scroll', updateScroll, { passive: true });
addEventListener('pointermove', (event) => {
  pointerX = event.clientX / innerWidth;
  pointerY = event.clientY / innerHeight;
}, { passive: true });

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting));
}, { threshold: 0.22 });
document.querySelectorAll('.focus, .boundary').forEach((section) => observer.observe(section));

resize();
updateScroll();
requestAnimationFrame(draw);
