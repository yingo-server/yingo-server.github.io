import { CIWS_RANGE, CIWS_BULLET_SPEED, CIWS_RATE, CIWS_ACC, BASE_SIZE } from '../constants.js';

export function updateCIWS(delta, bases, gameState, ciws, shells, bombers, bullets) {
  if (gameState.gameOver) return;
  
  const processCIWS = (faction, base, timer, delta) => {
    timer += delta;
    const fireInterval = 1.0 / CIWS_RATE;
    while (timer >= fireInterval) {
      timer -= fireInterval;
      
      const enemyFaction = faction === 'red' ? 'blue' : 'red';
      let target = null;
      
      // 优先拦截炮弹
      for (const s of shells) {
        if (!s.active || s.faction !== enemyFaction) continue;
        const dx = s.x - base.x - BASE_SIZE/2;
        const dy = s.y - base.y - BASE_SIZE/2;
        if (Math.hypot(dx, dy) < CIWS_RANGE) {
          target = s;
          break;
        }
      }
      
      // 其次拦截轰炸机
      if (!target) {
        for (const b of bombers) {
          if (!b.active || b.faction !== enemyFaction) continue;
          const dx = b.x - base.x - BASE_SIZE/2;
          const dy = b.y - base.y - BASE_SIZE/2;
          if (Math.hypot(dx, dy) < CIWS_RANGE) {
            target = b;
            break;
          }
        }
      }
      
      if (target && Math.random() < CIWS_ACC) {
        let angle = Math.atan2(target.y - base.y - BASE_SIZE/2, target.x - base.x - BASE_SIZE/2);
        angle += (Math.random() - 0.5) * 0.15;
        bullets.push({
          faction, x: base.x + BASE_SIZE/2, y: base.y + BASE_SIZE/2,
          vx: Math.cos(angle) * CIWS_BULLET_SPEED,
          vy: Math.sin(angle) * CIWS_BULLET_SPEED,
          active: true, life: 2.5, radius: 5, damage: 1
        });
      }
    }
    return timer;
  };
  
  ciws.redTimer = processCIWS('red', bases.red, ciws.redTimer, delta);
  ciws.blueTimer = processCIWS('blue', bases.blue, ciws.blueTimer, delta);
}