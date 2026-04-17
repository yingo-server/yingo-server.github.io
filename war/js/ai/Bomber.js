import { BOMBER_SPEED, BOMBER_HEALTH, BOMBER_BOMBS, BOMBER_SPAWN_INT, BOMBERS_PER_WAVE, BOMB_DROP_INT, BOMB_DROP_RANGE, BOMBER_COLLIDE_RAD, BOMBER_EXPLOSION_RAD, BOMBER_TURN_RATE, GRAVITY, GROUND_Y_OFFSET, BASE_SIZE, BOMB_DAMAGE } from '../constants.js';
import { inBase } from '../utils.js';

export function spawnBomber(faction, bases, gameState, bombers) {
  const isRed = faction === 'red';
  const startX = isRed ? -60 : gameState.width + 60;
  const startY = gameState.height * 0.35 + Math.random() * 100;
  const target = isRed ? bases.blue : bases.red;
  
  for (let i = 0; i < BOMBERS_PER_WAVE; i++) {
    const angle = Math.atan2(target.y + BASE_SIZE/2 - startY, target.x + BASE_SIZE/2 - startX);
    bombers.push({
      faction, x: startX, y: startY + (i - 1) * 30,
      vx: Math.cos(angle) * BOMBER_SPEED,
      vy: Math.sin(angle) * BOMBER_SPEED,
      health: BOMBER_HEALTH,
      bombs: BOMBER_BOMBS,
      bombCd: 0,
      active: true,
      target
    });
  }
}

export function updateBombers(delta, bombers, bombs, bases, gameState, spawnTimers, spawnExplosion) {
  // 生产
  if (!gameState.gameOver) {
    if (spawnTimers.redBomber >= BOMBER_SPAWN_INT) {
      spawnTimers.redBomber = 0;
      spawnBomber('red', bases, gameState, bombers);
    }
    if (spawnTimers.blueBomber >= BOMBER_SPAWN_INT) {
      spawnTimers.blueBomber = 0;
      spawnBomber('blue', bases, gameState, bombers);
    }
  }
  
  // 相撞检测与殉爆
  for (let i = 0; i < bombers.length; i++) {
    const a = bombers[i];
    if (!a.active) continue;
    for (let j = i + 1; j < bombers.length; j++) {
      const b = bombers[j];
      if (!b.active || a.faction === b.faction) continue;
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist < BOMBER_COLLIDE_RAD) {
        a.active = false;
        b.active = false;
        const blastX = (a.x + b.x) / 2, blastY = (a.y + b.y) / 2;
        spawnExplosion(blastX, blastY, '#ff6600', 30);
        // 殉爆：清除周围导弹/炮弹（在AIController中统一处理）
        return { type: 'bomberExplosion', x: blastX, y: blastY, radius: BOMBER_EXPLOSION_RAD };
      }
    }
  }
  
  for (let i = bombers.length - 1; i >= 0; i--) {
    const b = bombers[i];
    if (!b.active) { bombers.splice(i, 1); continue; }
    if (b.health <= 0) {
      spawnExplosion(b.x, b.y, '#ff6644', 18);
      bombers.splice(i, 1);
      continue;
    }
    
    const target = b.target;
    const tx = target.x + BASE_SIZE/2, ty = target.y + BASE_SIZE/2;
    const dx = tx - b.x, dy = ty - b.y;
    const dist = Math.hypot(dx, dy);
    
    // 高机动转向
    if (dist > 30) {
      const desired = Math.atan2(dy, dx);
      const current = Math.atan2(b.vy, b.vx);
      let diff = desired - current;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const turn = Math.max(-BOMBER_TURN_RATE * delta, Math.min(BOMBER_TURN_RATE * delta, diff));
      const newAngle = current + turn;
      const spd = Math.hypot(b.vx, b.vy);
      b.vx = Math.cos(newAngle) * BOMBER_SPEED;
      b.vy = Math.sin(newAngle) * BOMBER_SPEED;
    }
    
    b.x += b.vx * delta;
    b.y += b.vy * delta;
    
    // 边界清除
    if (b.x < -150 || b.x > gameState.width + 150 || b.y < -50) {
      b.active = false;
      continue;
    }
    
    // 投弹
    if (b.bombs > 0 && dist < BOMB_DROP_RANGE) {
      b.bombCd -= delta;
      if (b.bombCd <= 0) {
        b.bombCd = BOMB_DROP_INT;
        b.bombs--;
        bombs.push({
          faction: b.faction, x: b.x, y: b.y,
          vx: b.vx * 0.5, vy: b.vy + 30,
          active: true, damage: BOMB_DAMAGE, radius: 8
        });
      }
    }
  }
  return null;
}

export function updateBombs(delta, bombs, bases, gameState, spawnExplosion) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    if (!b.active) { bombs.splice(i, 1); continue; }
    
    b.vy += GRAVITY * delta;
    b.x += b.vx * delta;
    b.y += b.vy * delta;
    
    if (b.y > gameState.height - GROUND_Y_OFFSET || b.x < -50 || b.x > gameState.width + 50) {
      b.active = false;
      continue;
    }
    
    const enemyBase = b.faction === 'red' ? bases.blue : bases.red;
    if (inBase(b.x, b.y, enemyBase)) {
      enemyBase.health = Math.max(0, enemyBase.health - b.damage);
      b.active = false;
      spawnExplosion(b.x, b.y, '#aa5533', 15);
    }
  }
}