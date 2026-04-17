import { gameState, bases, resetState, attackMissiles, interceptors, shells, bullets, bombers, bombs, tanks, tankShells, particles, ammo, artillery, ciws, spawnTimers } from './state.js';
import { RESTART_DELAY, REPAIR_RATE, MAX_AMMO, RELOAD_TIME, COOLDOWN_TIME, BASE_SIZE, BASE_Y_OFFSET } from './constants.js';
import { isOnGround, getLaunchPoint } from './utils.js';
import { createMissile } from './entities/Missile.js';
import { spawnTank, updateTanks, updateTankShells } from './entities/Tank.js';
import { spawnBomber, updateBombers, updateBombs } from './entities/Bomber.js';
import { updateArtillery, fireArtillery } from './weapons/Artillery.js';
import { updateCIWS } from './weapons/CIWS.js';
import { updateShells, updateBullets } from './weapons/Shell.js';
import { updateMissiles, updateInterceptors, handleCollisions } from './ai/AIController.js';
import { updateParticles, spawnExplosion } from './render/Particles.js';
import { drawScene } from './render/Renderer.js';

const canvas = document.getElementById('gameCanvas');

// 调整画布与基地位置
function resizeCanvas() {
  gameState.width = window.innerWidth;
  gameState.height = window.innerHeight;
  canvas.width = gameState.width;
  canvas.height = gameState.height;
  bases.red.x = 20;
  bases.red.y = gameState.height - BASE_SIZE - BASE_Y_OFFSET;
  bases.blue.x = gameState.width - BASE_SIZE - 20;
  bases.blue.y = gameState.height - BASE_SIZE - BASE_Y_OFFSET;
}

// 装填逻辑
function handleReload(delta) {
  if (ammo.redAtk === 0) { ammo.redAtkReload += delta; if (ammo.redAtkReload >= RELOAD_TIME) { ammo.redAtk = MAX_AMMO; ammo.redAtkReload = 0; } } else ammo.redAtkReload = 0;
  if (ammo.redInt === 0) { ammo.redIntReload += delta; if (ammo.redIntReload >= RELOAD_TIME) { ammo.redInt = MAX_AMMO; ammo.redIntReload = 0; } } else ammo.redIntReload = 0;
  if (ammo.blueAtk === 0) { ammo.blueAtkReload += delta; if (ammo.blueAtkReload >= RELOAD_TIME) { ammo.blueAtk = MAX_AMMO; ammo.blueAtkReload = 0; } } else ammo.blueAtkReload = 0;
  if (ammo.blueInt === 0) { ammo.blueIntReload += delta; if (ammo.blueIntReload >= RELOAD_TIME) { ammo.blueInt = MAX_AMMO; ammo.blueIntReload = 0; } } else ammo.blueIntReload = 0;
}

// 自动发射决策
function attemptLaunch(delta) {
  // 红方攻击导弹
  if (ammo.redAtk > 0 && ammo.redAtkCd <= 0 && bases.blue.health > 0 && !gameState.gameOver) {
    if (Math.random() < 0.035 * delta * 60) {
      const p = getLaunchPoint('red', bases);
      attackMissiles.push(createMissile('attack', 'red', p.x, p.y, bases.blue));
      ammo.redAtk--;
      ammo.redAtkCd = COOLDOWN_TIME;
    }
  }
  // 蓝方攻击导弹
  if (ammo.blueAtk > 0 && ammo.blueAtkCd <= 0 && bases.red.health > 0 && !gameState.gameOver) {
    if (Math.random() < 0.035 * delta * 60) {
      const p = getLaunchPoint('blue', bases);
      attackMissiles.push(createMissile('attack', 'blue', p.x, p.y, bases.red));
      ammo.blueAtk--;
      ammo.blueAtkCd = COOLDOWN_TIME;
    }
  }
  // 红方拦截弹
  if (ammo.redInt > 0 && ammo.redIntCd <= 0 && !gameState.gameOver) {
    if (attackMissiles.some(m => m.active && m.faction === 'blue') && Math.random() < 0.045 * delta * 60) {
      const p = getLaunchPoint('red', bases);
      interceptors.push(createMissile('interceptor', 'red', p.x, p.y, null));
      ammo.redInt--;
      ammo.redIntCd = COOLDOWN_TIME * 0.7;
    }
  }
  // 蓝方拦截弹
  if (ammo.blueInt > 0 && ammo.blueIntCd <= 0 && !gameState.gameOver) {
    if (attackMissiles.some(m => m.active && m.faction === 'red') && Math.random() < 0.045 * delta * 60) {
      const p = getLaunchPoint('blue', bases);
      interceptors.push(createMissile('interceptor', 'blue', p.x, p.y, null));
      ammo.blueInt--;
      ammo.blueIntCd = COOLDOWN_TIME * 0.7;
    }
  }
}

// 冷却递减
function updateCooldowns(delta) {
  ammo.redAtkCd = Math.max(0, ammo.redAtkCd - delta);
  ammo.redIntCd = Math.max(0, ammo.redIntCd - delta);
  ammo.blueAtkCd = Math.max(0, ammo.blueAtkCd - delta);
  ammo.blueIntCd = Math.max(0, ammo.blueIntCd - delta);
}

// 基地维修
function repairBases(delta) {
  if (!gameState.gameOver) {
    bases.red.health = Math.min(bases.red.max, bases.red.health + REPAIR_RATE * delta);
    bases.blue.health = Math.min(bases.blue.max, bases.blue.health + REPAIR_RATE * delta);
  }
}

// 游戏结束检查
function checkGameOver() {
  if (!gameState.gameOver && (bases.red.health <= 0 || bases.blue.health <= 0)) {
    gameState.gameOver = true;
    gameState.blackoutAlpha = 0;
    gameState.restartTimer = 0;
  }
}

// 主更新循环
function updateWorld(delta) {
  repairBases(delta);
  handleReload(delta);
  updateCooldowns(delta);
  attemptLaunch(delta);
  
  updateArtillery(delta, bases, gameState, artillery, shells, spawnExplosion, fireArtillery);
  updateCIWS(delta, bases, gameState, ciws, shells, bombers, bullets, spawnExplosion);
  
  // 坦克
  spawnTimers.redTank += delta;
  spawnTimers.blueTank += delta;
  updateTanks(delta, tanks, tankShells, bases, gameState, spawnTimers, TANK_SPAWN_INTERVAL, spawnTank, spawnExplosion);
  updateTankShells(delta, tankShells, tanks, bases, gameState, spawnExplosion);
  
  // 轰炸机
  spawnTimers.redBomber += delta;
  spawnTimers.blueBomber += delta;
  updateBombers(delta, bombers, bombs, bases, gameState, spawnTimers, spawnBomber, spawnExplosion);
  updateBombs(delta, bombs, bases, gameState, spawnExplosion);
  
  // 导弹
  updateMissiles(delta, attackMissiles, bases, gameState, spawnExplosion);
  updateInterceptors(delta, interceptors, attackMissiles, bases, gameState, spawnExplosion);
  
  // 其他弹药
  updateShells(delta, shells, bases, gameState, spawnExplosion);
  updateBullets(delta, bullets, shells, bombers, bases, gameState, spawnExplosion);
  
  // 碰撞与粒子
  handleCollisions(attackMissiles, interceptors, shells, bullets, bombers, bombs, tanks, tankShells, bases, gameState, spawnExplosion);
  updateParticles(delta, particles, gameState);
  
  checkGameOver();
}

// 游戏结束处理
function handleGameOver(delta) {
  gameState.blackoutAlpha = Math.min(1, gameState.blackoutAlpha + delta * 0.8);
  gameState.restartTimer += delta;
  if (gameState.restartTimer >= RESTART_DELAY) {
    resetState();
    resizeCanvas(); // 重新计算基地位置
  }
  updateParticles(delta, particles, gameState);
}

// 动画循环
function tick(now) {
  requestAnimationFrame(tick);
  if (!gameState.lastTimestamp) {
    gameState.lastTimestamp = now;
    return;
  }
  const delta = Math.min(0.03, (now - gameState.lastTimestamp) / 1000);
  
  if (!gameState.gameOver) {
    updateWorld(delta);
  } else {
    handleGameOver(delta);
  }
  
  drawScene(ctx, gameState, bases, attackMissiles, interceptors, shells, bullets, bombers, bombs, tanks, tankShells, particles);
  
  if (gameState.gameOver) {
    ctx.fillStyle = `rgba(0,0,0,${gameState.blackoutAlpha})`;
    ctx.fillRect(0, 0, gameState.width, gameState.height);
  }
  
  gameState.lastTimestamp = now;
}

// 初始化
resizeCanvas();
resetState();
window.addEventListener('resize', () => {
  resizeCanvas();
});
requestAnimationFrame(tick);