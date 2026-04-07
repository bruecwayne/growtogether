class ReactiveAnim {
  constructor(el) {
    this.container = el;
    this.animEl = document.createElement('div');
    this.animEl.className = 'reactive-anim-inner';
    
    // Pick colors based on parent element's gradient property if passed, or default random
    const gradient = el.getAttribute('data-gradient') || 'moss';
    const Palettes = {
      gold: ['#d4a84b', '#f5f0e8', '#e8c97d', '#3e2c1c'],
      forest: ['#1a3a2a', '#3d6b4f', '#7a9e7e', '#0f2419'],
      green: ['#3d6b4f', '#a8c5ab', '#f0d68a', '#1a3a2a'],
      earth: ['#3e2c1c', '#c2703e', '#d4956a', '#5c4033'],
      terracotta: ['#c2703e', '#1a1a18', '#d4956a', '#3e2c1c'],
      orange: ['#d4956a', '#f5f0e8', '#c2703e', '#1a1a18'],
      purple: ['#5b3a5a', '#a37c98', '#d4a84b', '#1a1a18'],
      moss: ['#3d6b4f', '#7a9e7e', '#a8c5ab', '#0f2419'],
    };
    
    let colors = Palettes[gradient] || Palettes.forest;
    
    // Assign custom props for colors
    this.animEl.style.setProperty('--c1', colors[0]);
    this.animEl.style.setProperty('--c2', colors[1]);
    this.animEl.style.setProperty('--c3', colors[2]);
    this.animEl.style.setProperty('--c4', colors[3]);
    
    // Create base noise layer
    const noiseLayer = document.createElement('div');
    noiseLayer.className = 'reactive-noise-layer';
    this.animEl.appendChild(noiseLayer);

    this.container.appendChild(this.animEl);
    
    // Check if an image should be overlayed
    const imageUrl = el.getAttribute('data-image');
    if (imageUrl) {
      this.imgLayer = document.createElement('div');
      this.imgLayer.className = 'reactive-image-layer';
      this.imgLayer.style.backgroundImage = `url('${imageUrl}')`;
      this.container.appendChild(this.imgLayer);
    }
    
    this.rect = this.container.getBoundingClientRect();
    
    this.mouseX = 50;
    this.mouseY = 50;
    this.targetRotX = 0;
    this.targetRotY = 0;
    this.rotX = 0;
    this.rotY = 0;
    
    this.hue = Math.random() * 360;
    this.angle = Math.random() * 360;
    this.targetHue = this.hue;
    
    this.bindEvents();
  }
  
  bindEvents() {
    this.onMouseMove = (e) => {
      this.rect = this.container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const px = (clientX - this.rect.left) / this.rect.width;
      const py = (clientY - this.rect.top) / this.rect.height;
      
      this.mouseX = px * 100;
      this.mouseY = py * 100;
      
      this.targetRotX = -(py - 0.5) * 45; // Max 45deg tilt
      this.targetRotY = (px - 0.5) * 45;
    };
    
    this.onMouseLeave = () => {
      this.targetRotX = 0;
      this.targetRotY = 0;
    };

    if (window.matchMedia('(hover: hover)').matches) {
      this.container.addEventListener('mousemove', this.onMouseMove);
      this.container.addEventListener('mouseleave', this.onMouseLeave);
    } else {
      this.container.addEventListener('touchmove', this.onMouseMove, {passive: true});
      this.container.addEventListener('touchend', this.onMouseLeave);
    }
  }

  update(scrollY) {
    // Lerp rotation for smooth 3D tilt
    this.rotX += (this.targetRotX - this.rotX) * 0.1;
    this.rotY += (this.targetRotY - this.rotY) * 0.1;
    
    // Scroll affects hue and conic rotation
    this.targetHue = scrollY * 0.05;
    this.hue += (this.targetHue - this.hue) * 0.1;
    
    this.angle += 0.5; // continuous spin
    
    const transformStr = `rotateX(${this.rotX}deg) rotateY(${this.rotY}deg) scale(1.1)`;
    this.animEl.style.transform = transformStr;
    if (this.imgLayer) this.imgLayer.style.transform = transformStr;
    
    this.animEl.style.setProperty('--mouseX', `${this.mouseX}%`);
    this.animEl.style.setProperty('--mouseY', `${this.mouseY}%`);
    this.animEl.style.setProperty('--h', `${this.hue}deg`);
    this.animEl.style.setProperty('--a', `${this.angle}deg`);
  }
}

// Inject Global CSS
const style = document.createElement('style');
style.textContent = `
  .reactive-anim-wrapper {
    position: relative;
    border-radius: inherit;
    overflow: hidden;
    background: #000;
    perspective: 1000px;
    /* Ensure child can break out safely in 3d without clipping badly */
    z-index: 1;
  }
  
  .reactive-anim-inner {
    position: absolute;
    inset: -25%; 
    border-radius: inherit;
    background: conic-gradient(from var(--a, 0deg), var(--c1) 0%, var(--c2) 30%, var(--c3) 60%, var(--c4) 90%, var(--c1) 100%);
    filter: blur(15px) contrast(1.2) saturate(1.5) hue-rotate(var(--h, 0deg));
    transition: filter 0.2s;
    transform-style: preserve-3d;
    will-change: transform;
    pointer-events: none;
  }
  
  .reactive-noise-layer {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at var(--mouseX, 50%) var(--mouseY, 50%), rgba(255,255,255,0.6), transparent 40%);
    mix-blend-mode: overlay;
    pointer-events: none;
    z-index: 2;
  }
  
  /* Additional noise if available */
  .reactive-anim-wrapper::after {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0.1;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    pointer-events: none;
    mix-blend-mode: color-burn;
  }
  
  .reactive-image-layer {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    border-radius: inherit;
    z-index: 3;
    opacity: 0.9;
    mix-blend-mode: normal;
    pointer-events: none;
    transition: transform 0.2s;
  }
`;
document.head.appendChild(style);

// Expose a way to initialize newly added DOM elements (for SPAs or dynamic renders)
window._anims = [];
window.initReactiveAnimations = () => {
  const elements = document.querySelectorAll('.reactive-anim-wrapper:not(.initialized)');
  elements.forEach(el => {
    el.classList.add('initialized');
    window._anims.push(new ReactiveAnim(el));
  });
};

// Start tick
let lastY = 0;
function globalTick() {
  lastY += (window.scrollY - lastY) * 0.1;
  window._anims.forEach(anim => anim.update(lastY));
  requestAnimationFrame(globalTick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.initReactiveAnimations();
    requestAnimationFrame(globalTick);
  });
} else {
  window.initReactiveAnimations();
  requestAnimationFrame(globalTick);
}
