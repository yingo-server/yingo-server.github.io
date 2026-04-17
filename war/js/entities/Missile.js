import { MISSILE_LAUNCH_ANGLE, MISSILE_BASE_SPEED, ATTACK_SPEED, INTERCEPTOR_SPEED, ATTACK_TURN_RATE, INTERCEPTOR_TURN_RATE, PHASE_LAUNCH, BASE_SIZE } from '../constants.js';
import { bases } from '../state.js';

export function createMissile(type, faction, startX, startY, targetParam) {
  let baseVx = Math.cos(MISSILE_LAUNCH_ANGLE) * MISSILE_BASE_SPEED;
  let baseVy = -Math.sin(MISSILE_LAUNCH_ANGLE) * MISSILE_BASE_SPEED;
  if (faction === 'blue') baseVx = -baseVx;
  
  const vx = baseVx + (Math.random() - 0.5) * 30;
  const vy = baseVy + (Math.random() - 0.5) * 30;
  
  let targetAngle;
  if (type === 'attack') {
    targetAngle = Math.atan2(targetParam.y + BASE_SIZE/2 - startY, targetParam.x + BASE_SIZE/2 - startX);
  } else {
    const enemyBase = faction === 'red' ? bases.blue : bases.red;
    targetAngle = Math.atan2(enemyBase.y + BASE_SIZE/2 - startY, enemyBase.x + BASE_SIZE/2 - startX);
  }
  const rcsBias = ((Math.random() * 10) - 5) * Math.PI / 180;
  
  return {
    type, faction, x: startX, y: startY, vx, vy, active: true,
    phase: PHASE_LAUNCH, phaseTimer: 0,
    rcsTargetAngle: targetAngle + rcsBias,
    targetParam,
    life: type === 'attack' ? 22 : 18,
    speed: type === 'attack' ? ATTACK_SPEED : INTERCEPTOR_SPEED,
    turnRate: type === 'attack' ? ATTACK_TURN_RATE : INTERCEPTOR_TURN_RATE,
    terminalTriggered: false
  };
}