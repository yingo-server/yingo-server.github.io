import { GRAVITY, PHASE_LAUNCH, PHASE_RCS, PHASE_GUIDED, TERMINAL_DISTANCE, PROXIMITY_RADIUS, BASE_SIZE, BOMBER_EXPLOSION_RAD } from '../constants.js';
import { isOnGround, inBase } from '../utils.js';

// 导弹更新
export function updateMissiles(delta, missiles, bases, gameState, spawnExplosion) {
  for (let i = missiles.length - 1; i >= 0; i--) {
    const m = missiles[i];
    if (!m.active) { missiles.splice(i, 1); continue; }
    
    m.life -= delta;
    if (m.life <= 0) { m.active = false; continue; }
    if (isOnGround(m.y, gameState)) {
      spawnExplosion(m.x, m.y, '#ff8866', 16, gameState);
      m.active = false;
      continue;
    }
    
    m.vy += GRAVITY * delta;
    
    const target = m.targetParam;
    const tx = target.x + BASE_SIZE/2;
    const ty = target.y + BASE_SIZE/2;
    const dx = tx - m.x, dy = ty - m.y;
    const dist = Math.hypot(dx, dy);
    
    switch (m.phase) {
      case PHASE_LAUNCH:
        m.phaseTimer += delta;
        if (m.phaseTimer > 0.25) { m.phase = PHASE_RCS; m.phaseTimer = 0; }
        break;
      case PHASE_RCS:
        m.phaseTimer += delta;
        {
          let cur = Math.atan2(m.vy, m.vx);
          let diff = m.rcsTargetAngle - cur;
          while (diff > Math.PI) diff -= 2*Math.PI;
          while (diff < -Math.PI) diff += 2*Math.PI;
          const rcsRate = 8.0;
          const turn = Math.max(-rcsRate*delta, Math.min(rcsRate*delta, diff));
          const newAng = cur + turn;
          const spd = Math.hypot(m.vx, m.vy);
          const newSpd = spd + (m.speed - spd) * 0.35;
          m.vx = Math.cos(newAng) * newSpd;
          m.vy = Math.sin(newAng) * newSpd;
          if (Math.abs(diff) < 0.15 && m.phaseTimer > 0.3) m.phase = PHASE_GUIDED;
          if (m.phaseTimer > 0.55) m.phase = PHASE_GUIDED;
        }
        break;
      case PHASE_GUIDED:
        if (m.type === 'attack' && dist < TERMINAL_DISTANCE && !m.terminalTriggered) {
          m.terminalTriggered = true;
          const baseAngle = Math.atan2(dy, dx);
          const bias = ((Math.random()*40)-20) * Math.PI/180;
          m.rcsTargetAngle = baseAngle + bias;
          m.phase = -1; // 锁定
          break;
        }
        {
          let desired = Math.atan2(dy, dx);
          const gravityComp = 0.2 * (dist / 500);
          desired += gravityComp;
          let cur = Math.atan2(m.vy, m.vx);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= 2*Math.PI;
          while (diff < -Math.PI) diff += 2*Math.PI;
          const maxTurn = m.turnRate * delta;
          const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
          const newAng = cur + turn;
          const spd = m.speed;
          m.vx = Math.cos(newAng) * spd;
          m.vy = Math.sin(newAng) * spd;
        }
        break;
      default: // 末端锁定，仅受重力
        break;
    }
    
    m.x += m.vx * delta;
    m.y += m.vy * delta;
    
    if (m.x < -200 || m.x > gameState.width + 200) { m.active = false; continue; }
    
    if (m.type === 'attack' && inBase(m.x, m.y, target)) {
      target.health = Math.max(0, target.health - 20);
      m.active = false;
      spawnExplosion(m.x, m.y, m.faction==='red'?'#ff8866':'#88aaff', 24, gameState);
    }
  }
}

// 拦截弹更新
export function updateInterceptors(delta, interceptors, attackMissiles, bases, gameState, spawnExplosion) {
  for (let i = interceptors.length - 1; i >= 0; i--) {
    const m = interceptors[i];
    if (!m.active) { interceptors.splice(i, 1); continue; }
    
    m.life -= delta;
    if (m.life <= 0) { m.active = false; continue; }
    if (isOnGround(m.y, gameState)) {
      spawnExplosion(m.x, m.y, '#aaccff', 16, gameState);
      m.active = false;
      continue;
    }
    
    m.vy += GRAVITY * delta;
    
    // 寻找最近敌方攻击导弹
    const enemyFaction = m.faction === 'red' ? 'blue' : 'red';
    let closest = null, minD2 = Infinity;
    for (const a of attackMissiles) {
      if (!a.active || a.faction !== enemyFaction) continue;
      const dx = a.x - m.x, dy = a.y - m.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < minD2) { minD2 = d2; closest = a; }
    }
    
    let targetX, targetY;
    if (closest) {
      m.targetParam = closest;
      targetX = closest.x; targetY = closest.y;
    } else {
      const enemyBase = m.faction === 'red' ? bases.blue : bases.red;
      targetX = enemyBase.x + BASE_SIZE/2;
      targetY = enemyBase.y + BASE_SIZE/2;
    }
    
    const dx = targetX - m.x, dy = targetY - m.y;
    const dist = Math.hypot(dx, dy);
    
    switch (m.phase) {
      case PHASE_LAUNCH:
        m.phaseTimer += delta;
        if (m.phaseTimer > 0.25) { m.phase = PHASE_RCS; m.phaseTimer = 0; }
        break;
      case PHASE_RCS:
        m.phaseTimer += delta;
        {
          let cur = Math.atan2(m.vy, m.vx);
          let diff = m.rcsTargetAngle - cur;
          while (diff > Math.PI) diff -= 2*Math.PI;
          while (diff < -Math.PI) diff += 2*Math.PI;
          const rcsRate = 8.0;
          const turn = Math.max(-rcsRate*delta, Math.min(rcsRate*delta, diff));
          const newAng = cur + turn;
          const spd = Math.hypot(m.vx, m.vy);
          const newSpd = spd + (m.speed - spd) * 0.35;
          m.vx = Math.cos(newAng) * newSpd;
          m.vy = Math.sin(newAng) * newSpd;
          if (Math.abs(diff) < 0.15 && m.phaseTimer > 0.3) m.phase = PHASE_GUIDED;
          if (m.phaseTimer > 0.55) m.phase = PHASE_GUIDED;
        }
        break;
      case PHASE_GUIDED:
        {
          let desired = Math.atan2(dy, dx);
          let cur = Math.atan2(m.vy, m.vx);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= 2*Math.PI;
          while (diff < -Math.PI) diff += 2*Math.PI;
          const maxTurn = m.turnRate * delta;
          const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
          const newAng = cur + turn;
          const spd = m.speed;
          m.vx = Math.cos(newAng) * spd;
          m.vy = Math.sin(newAng) * spd;
        }
        break;
    }
    
    m.x += m.vx * delta;
    m.y += m.vy * delta;
    
    if (m.x < -200 || m.x > gameState.width + 200) { m.active = false; continue; }
    
    // 近炸检测
    const target = m.targetParam;
    if (target && target.active && Math.hypot(m.x - target.x, m.y - target.y) < PROXIMITY_RADIUS) {
      target.active = false;
      m.active = false;
      spawnExplosion(m.x, m.y, '#ffcc66', 26, gameState);
    }
  }
}

// 碰撞处理（含轰炸机殉爆）
export function handleCollisions(attackMissiles, interceptors, shells, bullets, bombers, bombs, tanks, tankShells, bases, gameState, spawnExplosion) {
  // 拦截弹与攻击导弹二次近炸
  for (const inter of interceptors) {
    if (!inter.active) continue;
    for (const a of attackMissiles) {
      if (!a.active || a.faction === inter.faction) continue;
      if (Math.hypot(a.x - inter.x, a.y - inter.y) < PROXIMITY_RADIUS) {
        a.active = false;
        inter.active = false;
        spawnExplosion(inter.x, inter.y, '#ffaa33', 22, gameState);
        break;
      }
    }
  }
  
  // 轰炸机殉爆清除周围实体
  // 已在Bomber.js中标记，此处统一处理
}