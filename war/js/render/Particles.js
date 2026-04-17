import { isOnGround } from '../utils.js';
import { GRAVITY } from '../constants.js';

export function spawnExplosion(x, y, color, count = 20, particles) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = 60 + Math.random() * 140;
    particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 1.0, max: 1.0, size: 3 + Math.random() * 6, color
    });
  }
}

export function updateParticles(delta, particles, gameState) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= delta;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.vy += GRAVITY * 0.5 * delta;
    p.vx *= 0.99;
    p.vy *= 0.99;
    if (isOnGround(p.y, gameState)) p.life = 0;
  }
}