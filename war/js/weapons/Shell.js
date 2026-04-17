import { GRAVITY, SHELL_DAMAGE, CIWS_BULLET_SPEED, BOMBER_HEALTH } from '../constants.js';
import { isOnGround, inBase } from '../utils.js';

export function updateShells(delta, shells, bases, gameState, spawnExplosion) {
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i];
    if (!s.active) { shells.splice(i, 1); continue; }
    
    s.vx += 0;
    s.vy += GRAVITY * delta;
    s.x += s.vx * delta;
    s.y += s.vy * delta;
    
    if (isOnGround(s.y, gameState) || s.x < -50 || s.x > gameState.width + 50) {
      s.active = false;
      continue;
    }
    
    const enemyBase = s.faction === 'red' ? bases.blue : bases.red;
    if (inBase(s.x, s.y, enemyBase)) {
      enemyBase.health = Math.max(0, enemyBase.health - s.damage);
      s.active = false;
      spawnExplosion(s.x, s.y, '#cc9966', 12, gameState);
    }
  }
}

export function updateBullets(delta, bullets, shells, bombers, bases, gameState, spawnExplosion) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if (!b.active) { bullets.splice(i, 1); continue; }
    
    b.x += b.vx * delta;
    b.y += b.vy * delta;
    b.life -= delta;
    
    if (b.life <= 0 || isOnGround(b.y, gameState) || b.x < -50 || b.x > gameState.width + 50) {
      b.active = false;
      continue;
    }
    
    const enemyFaction = b.faction === 'red' ? 'blue' : 'red';
    
    // 拦截炮弹
    for (const s of shells) {
      if (!s.active || s.faction !== enemyFaction) continue;
      if (Math.hypot(s.x - b.x, s.y - b.y) < s.radius + b.radius) {
        s.active = false;
        b.active = false;
        spawnExplosion(b.x, b.y, '#ffdd99', 8, gameState);
        break;
      }
    }
    if (!b.active) continue;
    
    // 攻击轰炸机
    for (const bm of bombers) {
      if (!bm.active || bm.faction !== enemyFaction) continue;
      if (Math.hypot(bm.x - b.x, bm.y - b.y) < 25) {
        bm.health -= b.damage || 1;
        b.active = false;
        spawnExplosion(b.x, b.y, '#ffaa00', 6, gameState);
        break;
      }
    }
  }
}