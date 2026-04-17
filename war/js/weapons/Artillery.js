import { ARTILLERY_BURST, ARTILLERY_INTERVAL, ARTILLERY_COOLDOWN, ARTILLERY_ACC, GRAVITY, SHELL_DAMAGE, BASE_SIZE } from '../constants.js';

export function fireArtillery(faction, bases, shells) {
  const base = faction === 'red' ? bases.red : bases.blue;
  const target = faction === 'red' ? bases.blue : bases.red;
  const sx = base.x + BASE_SIZE/2, sy = base.y - 10;
  const tx = target.x + BASE_SIZE/2, ty = target.y + BASE_SIZE/2;
  const dx = tx - sx, dy = ty - sy;
  const dist = Math.hypot(dx, dy);
  const t = Math.sqrt(2 * dist / 300);
  let vx = dx / t;
  let vy = (dy - 0.5 * GRAVITY * t * t) / t;
  
  if (Math.random() > ARTILLERY_ACC) {
    vx += (Math.random() - 0.5) * 90;
    vy += (Math.random() - 0.5) * 70;
  }
  
  shells.push({
    faction, x: sx, y: sy, vx, vy,
    active: true, damage: SHELL_DAMAGE, radius: 7
  });
}

export function updateArtillery(delta, bases, gameState, artillery, shells) {
  if (!gameState.gameOver) {
    // 红方火炮
    if (bases.blue.health > 0) {
      if (artillery.redBurstRem > 0) {
        artillery.redBurstDelay -= delta;
        if (artillery.redBurstDelay <= 0) {
          fireArtillery('red', bases, shells);
          artillery.redBurstRem--;
          artillery.redBurstDelay = ARTILLERY_INTERVAL;
          if (artillery.redBurstRem === 0) artillery.redTimer = ARTILLERY_COOLDOWN;
        }
      } else {
        artillery.redTimer -= delta;
        if (artillery.redTimer <= 0) {
          artillery.redBurstRem = ARTILLERY_BURST;
          artillery.redBurstDelay = 0;
        }
      }
    }
    
    // 蓝方火炮
    if (bases.red.health > 0) {
      if (artillery.blueBurstRem > 0) {
        artillery.blueBurstDelay -= delta;
        if (artillery.blueBurstDelay <= 0) {
          fireArtillery('blue', bases, shells);
          artillery.blueBurstRem--;
          artillery.blueBurstDelay = ARTILLERY_INTERVAL;
          if (artillery.blueBurstRem === 0) artillery.blueTimer = ARTILLERY_COOLDOWN;
        }
      } else {
        artillery.blueTimer -= delta;
        if (artillery.blueTimer <= 0) {
          artillery.blueBurstRem = ARTILLERY_BURST;
          artillery.blueBurstDelay = 0;
        }
      }
    }
  }
}