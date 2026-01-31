// ========== 核心参数 ==========
const BALL_COLORS = {
    RED: '#ff4444',
    GREEN: '#44ff44',
    BLUE: '#4444ff'
};

let params = {
    speedFactor: 1.0,
    gravityFactor: 1.0,
    accelerationFactor: 1.0,
    angleVariance: 15
};

// ========== 游戏状态 ==========
let canvas, ctx;
let balls = [];
let lines = [];
let gameRunning = true;
let universeRestarting = false;
let canvasSize = { width: 0, height: 0 };
let boundary = { x: 0, y: 0, radius: 0 };

// ========== 初始化 ==========
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    setupControls();
    resetGame();
    
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    canvasSize.width = window.innerWidth;
    canvasSize.height = window.innerHeight;
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // 边界设置
    boundary.radius = Math.min(canvasSize.width, canvasSize.height) * 0.4;
    boundary.x = canvasSize.width / 2;
    boundary.y = canvasSize.height / 2;
}

function setupControls() {
    // 参数控制
    const sliders = {
        speedFactor: document.getElementById('speedFactor'),
        gravityFactor: document.getElementById('gravityFactor'),
        accelerationFactor: document.getElementById('accelerationFactor'),
        angleVariance: document.getElementById('angleVariance')
    };
    
    const displays = {
        speedFactor: document.getElementById('speedValue'),
        gravityFactor: document.getElementById('gravityValue'),
        accelerationFactor: document.getElementById('accelerationValue'),
        angleVariance: document.getElementById('angleValue')
    };
    
    for (const [key, slider] of Object.entries(sliders)) {
        slider.addEventListener('input', () => {
            params[key] = parseFloat(slider.value);
            displays[key].textContent = key === 'angleVariance' ? `${params[key]}°` : params[key].toFixed(2);
        });
    }
    
    // 按钮控制
    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('settingsPanel').style.display = 'flex';
    });
    
    document.getElementById('closeBtn').addEventListener('click', () => {
        document.getElementById('settingsPanel').style.display = 'none';
    });
    
    document.getElementById('applyBtn').addEventListener('click', () => {
        document.getElementById('settingsPanel').style.display = 'none';
        resetGame();
    });
    
    document.getElementById('settingsPanel').addEventListener('click', (e) => {
        if (e.target === document.getElementById('settingsPanel')) {
            document.getElementById('settingsPanel').style.display = 'none';
        }
    });
    
    // 窗口大小变化
    window.addEventListener('resize', () => {
        resizeCanvas();
        resetGame();
    });
}

// ========== 游戏逻辑 ==========
function resetGame() {
    balls = [];
    lines = [];
    gameRunning = true;
    universeRestarting = false;
    
    // 创建三个球
    const ballRadius = boundary.radius / 8;
    const initialRadius = boundary.radius * 0.9;
    
    // 创建红球
    const redBall = {
        id: 0,
        color: BALL_COLORS.RED,
        originalColor: BALL_COLORS.RED,
        x: boundary.x + initialRadius * Math.cos(0),
        y: boundary.y + initialRadius * Math.sin(0),
        radius: ballRadius,
        vx: 0,
        vy: 0,
        hasGravity: false,
        isActive: true,
        sameColorLines: 0,
        canChangeColors: [BALL_COLORS.GREEN, BALL_COLORS.BLUE] // 红球可以改变绿线和蓝线
    };
    
    // 创建绿球
    const greenBall = {
        id: 1,
        color: BALL_COLORS.GREEN,
        originalColor: BALL_COLORS.GREEN,
        x: boundary.x + initialRadius * Math.cos(2 * Math.PI / 3),
        y: boundary.y + initialRadius * Math.sin(2 * Math.PI / 3),
        radius: ballRadius,
        vx: 0,
        vy: 0,
        hasGravity: false,
        isActive: true,
        sameColorLines: 0,
        canChangeColors: [BALL_COLORS.RED, BALL_COLORS.BLUE] // 绿球可以改变红线和蓝线
    };
    
    // 创建蓝球
    const blueBall = {
        id: 2,
        color: BALL_COLORS.BLUE,
        originalColor: BALL_COLORS.BLUE,
        x: boundary.x + initialRadius * Math.cos(4 * Math.PI / 3),
        y: boundary.y + initialRadius * Math.sin(4 * Math.PI / 3),
        radius: ballRadius,
        vx: 0,
        vy: 0,
        hasGravity: false,
        isActive: true,
        sameColorLines: 0,
        canChangeColors: [BALL_COLORS.RED, BALL_COLORS.GREEN] // 蓝球可以改变红线和绿线
    };
    
    // 设置初始速度
    [redBall, greenBall, blueBall].forEach(ball => {
        const dx = boundary.x - ball.x;
        const dy = boundary.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = boundary.radius * params.speedFactor / 60;
        
        ball.vx = (dx / distance) * speed;
        ball.vy = (dy / distance) * speed;
        
        // 添加随机角度偏移
        const varianceRad = (Math.random() * 2 - 1) * (params.angleVariance * Math.PI / 180);
        const angle = Math.atan2(ball.vy, ball.vx) + varianceRad;
        const magnitude = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.vx = Math.cos(angle) * magnitude;
        ball.vy = Math.sin(angle) * magnitude;
        
        balls.push(ball);
    });
    
    updateStatus();
}

function gameLoop() {
    if (!gameRunning) return;
    
    update();
    render();
    
    requestAnimationFrame(gameLoop);
}

function update() {
    if (universeRestarting) return;
    
    // 检查宇宙重启
    const activeBalls = balls.filter(b => b.isActive).length;
    if (activeBalls === 1 && !universeRestarting) {
        startUniverseRestart();
        return;
    }
    
    // 更新球
    for (const ball of balls) {
        if (!ball.isActive) continue;
        
        // 应用重力
        if (ball.hasGravity) {
            ball.vy += 9.8 * params.gravityFactor / 60;
        }
        
        // 更新位置
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // 检查飞出屏幕
        if (ball.x < -ball.radius || ball.x > canvasSize.width + ball.radius ||
            ball.y < -ball.radius || ball.y > canvasSize.height + ball.radius) {
            ball.isActive = false;
            playBreakSound();
            updateStatus();
            continue;
        }
        
        // 检查边界碰撞（无重力时）
        if (!ball.hasGravity) {
            checkBoundaryCollision(ball);
        }
        
        // 检查线碰撞
        checkLineCollisions(ball);
    }
    
    // 检查球间碰撞
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            checkBallCollision(balls[i], balls[j]);
        }
    }
    
    // 更新线端点
    for (const line of lines) {
        const ball = balls.find(b => b.id === line.ballId && b.isActive);
        if (ball) {
            line.endX = ball.x;
            line.endY = ball.y;
        }
    }
    
    // 更新同色线计数
    updateSameColorLineCount();
}

function checkBoundaryCollision(ball) {
    const dx = ball.x - boundary.x;
    const dy = ball.y - boundary.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance + ball.radius >= boundary.radius) {
        // 计算碰撞点
        const angle = Math.atan2(dy, dx);
        const collisionX = boundary.x + boundary.radius * Math.cos(angle);
        const collisionY = boundary.y + boundary.radius * Math.sin(angle);
        
        // 创建线
        const line = {
            startX: collisionX,
            startY: collisionY,
            endX: ball.x,
            endY: ball.y,
            color: ball.color,
            ballId: ball.id
        };
        
        lines.push(line);
        
        // 反弹
        const normalX = dx / distance;
        const normalY = dy / distance;
        const dot = ball.vx * normalX + ball.vy * normalY;
        
        ball.vx = ball.vx - 2 * dot * normalX;
        ball.vy = ball.vy - 2 * dot * normalY;
        
        // 移回边界内
        const overlap = distance + ball.radius - boundary.radius;
        ball.x -= normalX * overlap;
        ball.y -= normalY * overlap;
    }
}

function checkLineCollisions(ball) {
    for (const line of lines) {
        // 计算点到线段距离
        const distance = pointToLineDistance(ball.x, ball.y, line.startX, line.startY, line.endX, line.endY);
        
        if (distance < ball.radius) {
            // 使用 ball.canChangeColors 数组来判断是否可以改变线颜色
            if (ball.canChangeColors.includes(line.color)) {
                // 改变线颜色
                line.color = ball.color;
                line.ballId = ball.id;
                
                // 加速
                const acceleration = 1 + (0.0001 * params.accelerationFactor);
                ball.vx *= acceleration;
                ball.vy *= acceleration;
            }
        }
    }
}

function checkBallCollision(ball1, ball2) {
    if (!ball1.isActive || !ball2.isActive) return;
    
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < ball1.radius + ball2.radius) {
        // 碰撞响应
        const normalX = dx / distance;
        const normalY = dy / distance;
        const tangentX = -normalY;
        const tangentY = normalX;
        
        // 速度分解
        const v1n = ball1.vx * normalX + ball1.vy * normalY;
        const v1t = ball1.vx * tangentX + ball1.vy * tangentY;
        const v2n = ball2.vx * normalX + ball2.vy * normalY;
        const v2t = ball2.vx * tangentX + ball2.vy * tangentY;
        
        // 交换法向速度
        ball1.vx = v2n * normalX + v1t * tangentX;
        ball1.vy = v2n * normalY + v1t * tangentY;
        ball2.vx = v1n * normalX + v2t * tangentX;
        ball2.vy = v1n * normalY + v2t * tangentY;
        
        // 分离球体
        const overlap = (ball1.radius + ball2.radius - distance) / 2;
        ball1.x -= normalX * overlap;
        ball1.y -= normalY * overlap;
        ball2.x += normalX * overlap;
        ball2.y += normalY * overlap;
    }
}

function updateSameColorLineCount() {
    // 重置计数
    for (const ball of balls) {
        ball.sameColorLines = 0;
    }
    
    // 统计同色线
    for (const line of lines) {
        const ball = balls.find(b => b.id === line.ballId && b.isActive);
        if (ball && ball.color === line.color) {
            ball.sameColorLines++;
        }
    }
    
    // 更新重力状态
    for (const ball of balls) {
        if (ball.isActive) {
            ball.hasGravity = ball.sameColorLines === 0;
        }
    }
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
        param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// ========== 渲染 ==========
function render() {
    // 清空画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    
    // 绘制边界
    ctx.beginPath();
    ctx.arc(boundary.x, boundary.y, boundary.radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 绘制线
    for (const line of lines) {
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
    
    // 绘制球
    for (const ball of balls) {
        if (!ball.isActive) continue;
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        
        // 重力指示器
        if (ball.hasGravity) {
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y + ball.radius);
            ctx.lineTo(ball.x - 5, ball.y + ball.radius + 8);
            ctx.lineTo(ball.x + 5, ball.y + ball.radius + 8);
            ctx.closePath();
            ctx.fillStyle = '#ffff00';
            ctx.fill();
        }
    }
}

// ========== 工具函数 ==========
function updateStatus() {
    const status = {
        red: '已销毁',
        green: '已销毁',
        blue: '已销毁'
    };
    
    let activeCount = 0;
    
    for (const ball of balls) {
        if (ball.isActive) {
            activeCount++;
            let text = '活跃';
            if (ball.hasGravity) text = '受重力';
            
            if (ball.originalColor === BALL_COLORS.RED) status.red = text;
            else if (ball.originalColor === BALL_COLORS.GREEN) status.green = text;
            else if (ball.originalColor === BALL_COLORS.BLUE) status.blue = text;
        }
    }
    
    document.getElementById('redStatus').textContent = status.red;
    document.getElementById('greenStatus').textContent = status.green;
    document.getElementById('blueStatus').textContent = status.blue;
    document.getElementById('ballCount').textContent = activeCount;
    document.getElementById('lineCount').textContent = lines.length;
}

function playBreakSound() {
    // 创建简单的电子音效
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('音频不可用');
    }
}

function startUniverseRestart() {
    universeRestarting = true;
    
    const blackScreen = document.getElementById('blackScreen');
    const whiteScreen = document.getElementById('whiteScreen');
    
    // 3秒黑屏
    blackScreen.style.transition = 'opacity 3s';
    blackScreen.style.opacity = '1';
    
    setTimeout(() => {
        // 1秒白屏
        whiteScreen.style.transition = 'opacity 1s';
        whiteScreen.style.opacity = '1';
        
        setTimeout(() => {
            // 恢复
            blackScreen.style.transition = 'opacity 0s';
            whiteScreen.style.transition = 'opacity 0s';
            blackScreen.style.opacity = '0';
            whiteScreen.style.opacity = '0';
            
            // 重置游戏
            setTimeout(() => {
                resetGame();
            }, 100);
        }, 1000);
    }, 3000);
}

// ========== 启动 ==========
window.addEventListener('load', init);