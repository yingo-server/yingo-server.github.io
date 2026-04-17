import { TANK_SPEED, TANK_HEALTH, TANK_SHELL_DAMAGE, TANK_RANGE, TANK_SPAWN_INTERVAL, GRAVITY, GROUND_Y_OFFSET, BASE_SIZE } from '../constants.js';
import { isOnGround, inBase } from '../utils.js';

export function spawnTank(faction, bases, tanks) {
  const base = faction === 'red' ? bases.red : bases.blue;
  const x = base.x + BASE_SIZE/2 + (Math.random() - 0.5) * 30;
  const y = base.y + BASE_SIZE - 15;
  tanks.push({
    faction, x, y, vx: faction === 'red' ? TANK_SPEED : -TANK_SPEED, vy: 0,
    health: TANK_HEALTH, active: true, shootCd: Math.random() * 1.5
  });
}

export function updateTanks(delta, tanks, tankShells, bases, gameState, spawnTimers, spawnFn) {
  // 生产
  if (!gameState.gameOver) {
    if (spawnTimers.redTank >= TANK_SPAWN_INTERVAL) {
      spawnTimers.redTank = 0;
      spawnFn('red', bases, tanks);
    }
    if (spawnTimers.blueTank >= TANK_SPAWN_INTERVAL) {
      spawnTimers.blueTank = 0;
      spawnFn('blue', bases, tanks);
    }
  }
  
  for (let i = tanks.length - 1; i >= 0; i--) {
    const t = tanks[i];
    if (!t.active || t.health <= 0) {
      tanks.splice(i, 1);
      continue;
    }
    
    // AI：优先攻击敌方坦克
    const enemies = tanks.filter(ot => ot.active && ot.faction !== t.faction);
    let closest = null, minD = Infinity;
    enemies.forEach(e => {
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d < minD) { minD = d; closest = e; }
    });
    
    const target = (closest && minD < TANK_RANGE) ? closest : (t.faction === 'red' ? bases.blue : bases.red);
    const tx = target.x !== undefined ? target.x : target.x + BASE_SIZE/2;
    const ty = target.y !== undefined ? target.y : target.y + BASE_SIZE/2;
    
    const dx = tx - t.x, dy = ty - t.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 30) {
      t.vx = (dx / dist) * TANK_SPEED * (t.faction === 'red' ? 1 : -1);
    }
    t.x += t.vx * delta;
    t.y = bases.red.y + BASE_SIZE - 15; // 固定地面高度
    
    // 边界清除
    if (t.x < -50 || t.x > gameState.width + 50) t.active = false;
    
    // 射击
    t.shootCd -= delta;
    if (t.shootCd <= 0 && dist < TANK_RANGE) {
      t.shootCd = 1.2 + Math.random() * 0.8;
      const angle = Math.atan2(ty - t.y, tx - t.x) + (Math.random() - 0.5) * 0.15;
      const power = 380;
      tankShells.push({
        faction: t.faction, x: t.x, y: t.y - 10,
        vx: Math.cos(angle) * power, vy: Math.sin(angle) * power,
        active: true, damage: TANK_SHELL_DAMAGE, radius: 6
      });
    }
  }
}

export function updateTankShells(delta, tankShells, tanks, bases, gameState, spawnExplosion) {
  for (let i = tankShells.length - 1; i >= 0; i--) {
    const s = tankShells[i];
    if (!s.active) { tankShells.splice(i, 1); continue; }
    
    s.vx += 0;
    s.vy += GRAVITY * delta;
    s.x += s.vx * delta;
    s.y += s.vy * delta;
    
    if (isOnGround(s.y, gameState) || s.x < -50 || s.x > gameState.width + 50) {
      s.active = false;
      continue;
    }
    
    // 命中坦克
    for (const t of tanks) {
      if (!t.active || t.faction === s.faction) continue;
      if (Math.hypot(t.x - s.x, t.y - s.y) < 28) {
        t.health -= s.damage;
        s.active = false;
        spawnExplosion(s.x, s.y, '#ff8800', 10);
        break;
      }
    }
    if (!s.active) continue;
    
    // 命中基地
    const enemyBase = s.faction === 'red' ? bases.blue : bases.red;
    if (inBase(s.x, s.y, enemyBase)) {
      enemyBase.health = Math.max(0, enemyBase.health - s.damage);
      s.active = false;
      spawnExplosion(s.x, s.y, '#cc6600', 12);
    }
  }
}