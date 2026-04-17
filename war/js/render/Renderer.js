export function drawScene(ctx, gameState, bases, attackMissiles, interceptors, shells, bullets, bombers, bombs, tanks, tankShells, particles) {
  ctx.clearRect(0, 0, gameState.width, gameState.height);
  
  // 地面
  ctx.fillStyle = '#1a2a1a';
  ctx.fillRect(0, gameState.height - 5, gameState.width, 8);
  
  // 绘制基地
  drawBase(ctx, bases.red);
  drawBase(ctx, bases.blue);
  
  // 绘制血条
  drawHealthBar(ctx, bases.red);
  drawHealthBar(ctx, bases.blue);
  
  // 绘制坦克
  tanks.forEach(t => drawTank(ctx, t));
  tankShells.forEach(s => drawTankShell(ctx, s));
  
  // 绘制轰炸机与炸弹
  bombers.forEach(b => drawBomber(ctx, b));
  bombs.forEach(b => drawBomb(ctx, b));
  
  // 绘制导弹
  attackMissiles.forEach(m => drawMissile(ctx, m));
  interceptors.forEach(m => drawInterceptor(ctx, m));
  
  // 绘制炮弹与子弹
  shells.forEach(s => drawShell(ctx, s));
  bullets.forEach(b => drawBullet(ctx, b));
  
  // 粒子特效
  particles.forEach(p => drawParticle(ctx, p));
}

function drawBase(ctx, base) {
  ctx.fillStyle = base.color;
  ctx.shadowColor = base.faction === 'red' ? '#f66' : '#6af';
  ctx.shadowBlur = 25;
  ctx.fillRect(base.x, base.y, base.size, base.size);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff9e6';
  ctx.lineWidth = 3;
  ctx.strokeRect(base.x, base.y, base.size, base.size);
  ctx.fillStyle = '#111827';
  ctx.fillRect(base.x + base.size*0.3, base.y + base.size*0.3, base.size*0.4, base.size*0.4);
}

function drawHealthBar(ctx, base) {
  const barW = base.size * 0.8, barH = 8;
  const barX = base.x + base.size/2 - barW/2, barY = base.y - 18;
  ctx.fillStyle = '#222';
  ctx.fillRect(barX, barY, barW, barH);
  const percent = base.health / base.max;
  ctx.fillStyle = base.faction === 'red' ? '#ff6666' : '#66aaff';
  ctx.fillRect(barX, barY, barW * percent, barH);
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
}

function drawMissile(ctx, m) {
  const angle = Math.atan2(m.vy, m.vx);
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(angle);
  
  // 尾焰
  const flameLen = 14 + Math.sin(performance.now() * 0.02) * 4;
  const grad = ctx.createLinearGradient(-22, 0, -8, 0);
  grad.addColorStop(0, '#ffaa00');
  grad.addColorStop(0.6, '#ff5500');
  grad.addColorStop(1, '#aa2200');
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  ctx.lineTo(-14 - flameLen, 0);
  ctx.lineTo(-14, 6);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 16;
  ctx.fill();
  
  // 弹体
  ctx.shadowBlur = 0;
  ctx.fillStyle = m.faction === 'red' ? '#e55' : '#48f';
  ctx.fillRect(-12, -6, 22, 12);
  
  // 弹头
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(6, -8);
  ctx.lineTo(6, 8);
  ctx.closePath();
  ctx.fillStyle = '#ffbb88';
  ctx.fill();
  
  ctx.restore();
}

function drawInterceptor(ctx, m) {
  const angle = Math.atan2(m.vy, m.vx);
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(angle);
  
  const flameLen = 14 + Math.sin(performance.now() * 0.025) * 4;
  const grad = ctx.createLinearGradient(-22, 0, -8, 0);
  grad.addColorStop(0, '#aaccff');
  grad.addColorStop(0.5, '#3399ff');
  grad.addColorStop(1, '#0044aa');
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  ctx.lineTo(-14 - flameLen, 0);
  ctx.lineTo(-14, 6);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.shadowColor = '#66aaff';
  ctx.shadowBlur = 16;
  ctx.fill();
  
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(0, -10);
  ctx.lineTo(-8, 0);
  ctx.lineTo(0, 10);
  ctx.closePath();
  ctx.fillStyle = m.faction === 'red' ? '#fc9' : '#9cf';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.restore();
}

function drawTank(ctx, t) {
  ctx.save();
  ctx.translate(t.x, t.y);
  // 车体
  ctx.fillStyle = t.faction === 'red' ? '#a44' : '#48a';
  ctx.fillRect(-20, -8, 40, 12);
  // 炮塔
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(-8, -14, 16, 8);
  // 炮管
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(6, -12, 14, 4);
  // 履带
  ctx.beginPath();
  ctx.arc(-12, 6, 5, 0, Math.PI);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(12, 6, 5, 0, Math.PI);
  ctx.fill();
  ctx.restore();
}

function drawTankShell(ctx, s) {
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.radius, 0, 2 * Math.PI);
  ctx.fillStyle = s.faction === 'red' ? '#ff8844' : '#88aaff';
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ffaa00';
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawBomber(ctx, b) {
  const angle = Math.atan2(b.vy, b.vx);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(angle);
  ctx.fillStyle = b.faction === 'red' ? '#c44' : '#48c';
  ctx.shadowBlur = 15;
  ctx.shadowColor = b.faction === 'red' ? '#f66' : '#6af';
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-16, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(-6, -4, 10, 8);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawBomb(ctx, b) {
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, 2 * Math.PI);
  ctx.fillStyle = '#555';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#aaa';
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawShell(ctx, s) {
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.radius, 0, 2 * Math.PI);
  ctx.fillStyle = s.faction === 'red' ? '#ff8844' : '#88aaff';
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ffaa00';
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawBullet(ctx, b) {
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffdd44';
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ffaa00';
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawParticle(ctx, p) {
  ctx.globalAlpha = Math.min(1, p.life / p.max);
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * 0.7, 0, 2 * Math.PI);
  ctx.fillStyle = p.color;
  ctx.fill();
  ctx.globalAlpha = 1.0;
}