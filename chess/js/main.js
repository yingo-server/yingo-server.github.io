// 主逻辑：棋盘渲染、事件处理、本地/在线游戏控制
(function() {
    let engine = null;
    let net = new NetworkManager();
    let gameMode = 'local';
    let myColor = 'white';
    let selectedIdx = -1;
    let legalMoves = [];
    let lastFrom = -1, lastTo = -1;
    let gameOver = false;
    let animPiece = null, animRook = null, rafId = null;
    let pollTimer = null;
    let isMoving = false; // 操作锁，防止轮询覆盖本地走棋
    let lastPolledFen = null; // 上次轮询的FEN，用于检测对手走棋

    const canvas = document.getElementById('boardCanvas');
    const ctx = canvas.getContext('2d');
    const transitionOverlay = document.getElementById('transitionOverlay');
    const reconnectModal = document.getElementById('reconnectModal');
    const lobby = document.getElementById('lobby');
    const onlineMenu = document.getElementById('onlineMenu');
    const gameContainer = document.getElementById('gameContainer');
    const promoOverlay = document.getElementById('promoOverlay');
    const promoOpts = document.getElementById('promoOpts');
    const notifContainer = document.getElementById('notifContainer');

    // 音频上下文单例
    let audioCtx = null;
    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    // 页面切换转场效果
    async function transitionTo(showElement, hideElements = []) {
        transitionOverlay.classList.add('active');
        await new Promise(resolve => setTimeout(resolve, 300));
        hideElements.forEach(el => { if (el) el.style.display = 'none'; });
        if (showElement) showElement.style.display = 'block';
        transitionOverlay.offsetHeight;
        transitionOverlay.classList.remove('active');
    }

    // 音效（音量增强）
    function beep(f, d, t='sine', v=0.15) {
        try {
            const a = getAudioCtx();
            const o = a.createOscillator(), g = a.createGain();
            o.type = t; o.frequency.value = f; g.gain.value = v;
            o.connect(g); g.connect(a.destination);
            o.start(); o.stop(a.currentTime + d);
        } catch(e) {}
    }

    function sfxMove() { beep(660, 0.06, 'sine', 0.15); }
    function sfxCapture() { beep(280, 0.09, 'triangle', 0.18); setTimeout(() => beep(180, 0.06, 'triangle', 0.12), 40); }
    function sfxCheck() { beep(500, 0.1, 'square', 0.12); setTimeout(() => beep(750, 0.12, 'square', 0.12), 80); }
    function sfxPromote() { beep(360, 0.06, 'sine', 0.12); setTimeout(() => beep(540, 0.06, 'sine', 0.12), 50); setTimeout(() => beep(800, 0.08, 'sine', 0.14), 100); }
    function sfxEnd() { beep(200, 0.2, 'triangle', 0.16); setTimeout(() => beep(300, 0.25, 'triangle', 0.14), 150); }

    // 棋盘坐标转换（黑方反转视角）
    function displayToStandard(r, c) {
        const standardR = myColor === 'black' ? (7 - r) : r;
        return standardR * 8 + c;
    }
    function standardToDisplay(idx) {
        const r = Math.floor(idx / 8), c = idx % 8;
        const displayR = myColor === 'black' ? (7 - r) : r;
        return { r: displayR, c };
    }

    function setupCanvasSize() {
        const maxW = Math.min(480, window.innerWidth - 32);
        const maxH = Math.min(480, window.innerHeight - 200);
        const size = Math.min(maxW, maxH);
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }

    function render() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            rafId = null;
            if (!engine || !canvas.style.width) return;
            const sq = parseFloat(canvas.style.width) / 8;
            ctx.clearRect(0, 0, sq*8, sq*8);
            const now = performance.now();

            let pieceAnimDone = false, rookAnimDone = false;
            if (animPiece && now - animPiece.startTime >= 220) pieceAnimDone = true;
            if (animRook && now - animRook.startTime >= 220) rookAnimDone = true;

            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const x = c * sq, y = r * sq;
                    const standardIdx = displayToStandard(r, c);
                    const light = (r + c) % 2 === 0;
                    let fill = light ? '#c8c4bc' : '#5b5a56';

                    if (standardIdx === lastFrom || standardIdx === lastTo) {
                        fill = light ? 'rgba(0,122,180,0.22)' : 'rgba(0,122,180,0.28)';
                    }
                    if (standardIdx === selectedIdx) fill = '#007acc';
                    if (!gameOver && engine.isKingInCheck(engine.turn)) {
                        const ki = engine.turn === 'white' ? engine.wkIdx : engine.bkIdx;
                        if (standardIdx === ki) fill = 'rgba(215,50,50,0.55)';
                    }

                    ctx.fillStyle = fill;
                    ctx.fillRect(x, y, sq, sq);

                    const lm = legalMoves.find(m => m.toIdx === standardIdx);
                    if (lm) {
                        const cx = x + sq / 2, cy = y + sq / 2;
                        if (lm.isCap || lm.isEP) {
                            ctx.strokeStyle = 'rgba(200,50,50,0.7)';
                            ctx.lineWidth = sq * 0.08;
                            ctx.beginPath(); ctx.arc(cx, cy, sq * 0.38, 0, Math.PI * 2); ctx.stroke();
                        } else {
                            ctx.fillStyle = 'rgba(0,0,0,0.25)';
                            ctx.beginPath(); ctx.arc(cx, cy, sq * 0.12, 0, Math.PI * 2); ctx.fill();
                        }
                    }

                    const isPieceAnimTarget = animPiece && animPiece.idx === standardIdx;
                    const isRookAnimTarget = animRook && animRook.idx === standardIdx;
                    if ((!isPieceAnimTarget || pieceAnimDone) && (!isRookAnimTarget || rookAnimDone)) {
                        const piece = engine.board[standardIdx];
                        if (piece) drawPiece(ctx, piece, x + sq / 2, y + sq / 2, sq * 0.75);
                    }
                }
            }

            if (animPiece && !pieceAnimDone && engine.board[animPiece.idx]) {
                const { r, c } = standardToDisplay(animPiece.idx);
                const x = c * sq + sq / 2, y = r * sq + sq / 2;
                const elapsed = now - animPiece.startTime;
                const t = Math.min(elapsed / 220, 1);
                const scale = 0.55 + 0.45 * (1 - Math.pow(1 - t, 3)) + Math.sin(t * Math.PI * 2) * 0.08 * (1 - t);
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
                drawPiece(ctx, engine.board[animPiece.idx], 0, 0, sq * 0.75);
                ctx.restore();
            } else if (animPiece && pieceAnimDone) animPiece = null;

            if (animRook && !rookAnimDone && engine.board[animRook.idx]) {
                const { r, c } = standardToDisplay(animRook.idx);
                const x = c * sq + sq / 2, y = r * sq + sq / 2;
                const elapsed = now - animRook.startTime;
                const t = Math.min(elapsed / 220, 1);
                const scale = 0.55 + 0.45 * (1 - Math.pow(1 - t, 3));
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
                drawPiece(ctx, engine.board[animRook.idx], 0, 0, sq * 0.75);
                ctx.restore();
            } else if (animRook && rookAnimDone) animRook = null;

            if (animPiece || animRook) {
                if (!rafId) rafId = requestAnimationFrame(() => { rafId = null; render(); });
            }
        });
    }

    function drawPiece(ctx, piece, cx, cy, size) {
        const ch = FA_CHESS[piece.type];
        if (!ch) return;
        ctx.save();
        ctx.font = `900 ${size}px "Font Awesome 6 Free"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const shadowOffset = size * 0.06;
        if (piece.color === 'white') {
            ctx.fillStyle = '#b8956e';
            ctx.fillText(ch, cx + shadowOffset, cy + shadowOffset);
            ctx.fillStyle = '#faf3e0';
            ctx.fillText(ch, cx, cy);
        } else {
            ctx.fillStyle = '#8a724b';
            ctx.fillText(ch, cx + shadowOffset, cy + shadowOffset);
            ctx.fillStyle = '#1a1008';
            ctx.fillText(ch, cx, cy);
        }
        ctx.restore();
    }

    function getClickIndex(e) {
        const rect = canvas.getBoundingClientRect();
        const sq = parseFloat(canvas.style.width) / 8;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const col = Math.floor(mx / sq);
        const row = Math.floor(my / sq);
        if (row < 0 || row > 7 || col < 0 || col > 7) return -1;
        return displayToStandard(row, col);
    }

    function handleClick(i) {
        if (gameOver || !engine || (gameMode === 'online' && engine.turn !== myColor)) return;

        // 点击同一棋子取消选中
        if (selectedIdx === i) {
            selectedIdx = -1;
            legalMoves = [];
            render();
            return;
        }

        if (selectedIdx >= 0) {
            const move = legalMoves.find(m => m.toIdx === i);
            if (move) {
                if (move.isPromo) { showPromo(selectedIdx, i, move); return; }
                executeMove(selectedIdx, move);
            } else if (engine.board[i]?.color === engine.turn) {
                selectedIdx = i;
                legalMoves = engine.getLegalMoves(i);
            } else {
                selectedIdx = -1;
                legalMoves = [];
            }
        } else {
            if (engine.board[i]?.color === engine.turn) {
                selectedIdx = i;
                legalMoves = engine.getLegalMoves(i);
            }
        }
        render();
    }

    async function executeMove(fromIdx, move, promoType = null) {
        if (isMoving) return;
        isMoving = true;
        const result = engine.makeMove(fromIdx, move, promoType);
        
        // 播放对应音效
        if (move.isPromo) sfxPromote();
        else if (result.captured || move.isEP) sfxCapture();
        else sfxMove();
        
        lastFrom = fromIdx;
        lastTo = move.toIdx;
        animPiece = { idx: move.toIdx, startTime: performance.now() };
        if (move.isCastle) animRook = { idx: move.rookTo, startTime: performance.now() };
        selectedIdx = -1;
        legalMoves = [];
        render();
        updateStatus();

        if (gameMode === 'online') {
            try {
                const status = engine.getGameStatus();
                const resultStr = status.over ? (status.result === 'white' ? 'white' : status.result === 'black' ? 'black' : 'draw') : null;
                await net.updateData(engine.getFEN(), [], resultStr, status.over ? 'finished' : 'playing');
                lastPolledFen = engine.getFEN();
                if (status.over) {
                    gameOver = true;
                    showResult(status.result);
                    clearInterval(pollTimer);
                }
                if (!gameOver && engine.isKingInCheck(engine.turn)) sfxCheck();
            } catch(e) {
                notify('同步失败，请重试', 'err');
            }
        } else {
            const st = engine.getGameStatus();
            if (st.over) {
                gameOver = true;
                showResult(st.result);
                updateStatus();
                sfxEnd();
            } else if (engine.isKingInCheck(engine.turn)) {
                sfxCheck();
            }
        }
        isMoving = false;
    }

    function showPromo(fromIdx, toIdx, move) {
        const color = engine.turn;
        promoOpts.innerHTML = '';
        for (const t of ['queen', 'rook', 'bishop', 'knight']) {
            const btn = document.createElement('button');
            btn.textContent = FA_CHESS[t];
            btn.style.color = color === 'white' ? '#faf3e0' : '#1a1008';
            btn.style.textShadow = color === 'white' ? '2px 2px 0 #b8956e' : '2px 2px 0 #8a724b';
            btn.onclick = () => {
                promoOverlay.style.display = 'none';
                executeMove(fromIdx, move, t);
            };
            promoOpts.appendChild(btn);
        }
        promoOverlay.style.display = 'flex';
    }

    function updateStatus() {
        if (!engine) return;
        const dot = document.getElementById('turnDot');
        const text = document.getElementById('turnText');
        const statusDot = document.getElementById('statusDot');
        if (gameOver) {
            dot.className = 'tdot'; dot.style.background = '#888';
            text.textContent = '对局结束';
            statusDot.className = 'dot err';
        } else {
            dot.className = 'tdot ' + (engine.turn === 'white' ? 'w' : 'b');
            dot.style.background = '';
            if (gameMode === 'online') {
                text.textContent = engine.turn === myColor ? '你的回合' : '对方回合';
            } else {
                text.textContent = engine.turn === 'white' ? '白方走棋' : '黑方走棋';
            }
            statusDot.className = 'dot' + (engine.isKingInCheck(engine.turn) ? ' warn' : '');
        }
        document.getElementById('moveCount').textContent = '第' + engine.fullMove + '步';
    }

    function showResult(winner) {
        let msg = '';
        if (gameMode === 'local') {
            msg = winner === 'draw' ? '和棋' : (winner === 'white' ? '白方获胜' : '黑方获胜');
        } else {
            msg = winner === 'draw' ? '和棋' : (winner === myColor ? '你赢了！' : '你输了');
        }
        notify(`<strong>${msg}</strong>`, winner === 'draw' ? 'warn' : (winner === myColor ? 'warn' : 'err'));
    }

    function notify(msg, type = 'info') {
        const el = document.createElement('div');
        el.className = 'notif ' + (type === 'err' ? 'err' : type === 'warn' ? 'warn' : '');
        el.innerHTML = `<span style="display:block; padding-right:2px;">${msg}</span><button class="close">✕</button>`;
        el.querySelector('.close').onclick = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
        notifContainer.appendChild(el);
        setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3000);
    }

    // 分析FEN差异，找到对手移动的棋子索引
    function detectOpponentMove(oldFen, newFen) {
        if (!oldFen || !newFen) return { toIdx: -1, fromIdx: -1, isCapture: false, isCastle: false, rookToIdx: -1 };
        
        const oldParts = oldFen.split(' ');
        const newParts = newFen.split(' ');
        if (oldParts.length < 6 || newParts.length < 6) return { toIdx: -1, fromIdx: -1, isCapture: false, isCastle: false, rookToIdx: -1 };
        
        // 解析棋盘布局
        function parseBoard(boardStr) {
            const board = new Array(64).fill(null);
            let row = 0, col = 0;
            for (const ch of boardStr) {
                if (ch === '/') { row++; col = 0; continue; }
                if (ch >= '1' && ch <= '8') { col += parseInt(ch); continue; }
                const color = ch === ch.toUpperCase() ? 'white' : 'black';
                const typeMap = { 'k':'king', 'q':'queen', 'r':'rook', 'b':'bishop', 'n':'knight', 'p':'pawn' };
                board[row * 8 + col] = { type: typeMap[ch.toLowerCase()], color };
                col++;
            }
            return board;
        }
        
        const oldBoard = parseBoard(oldParts[0]);
        const newBoard = parseBoard(newParts[0]);
        
        // 找到新增的棋子（目标格）
        let toIdx = -1;
        let fromIdx = -1;
        let removedFrom = -1;
        
        for (let i = 0; i < 64; i++) {
            if (!oldBoard[i] && newBoard[i]) {
                toIdx = i; // 新棋子出现的位置
            }
            if (oldBoard[i] && !newBoard[i]) {
                removedFrom = i; // 棋子消失的位置
            }
        }
        
        // 如果没直接找到新增，可能是吃子（目标格本来有棋子）
        if (toIdx < 0) {
            for (let i = 0; i < 64; i++) {
                if (oldBoard[i] && newBoard[i] && oldBoard[i].color !== newBoard[i].color) {
                    toIdx = i;
                    break;
                }
            }
        }
        
        // 找到起点：旧棋盘有、新棋盘无，且不是被吃掉的格（被吃掉的格在新棋盘可能为空或被替换）
        if (removedFrom >= 0 && toIdx >= 0) {
            fromIdx = removedFrom;
        } else {
            // 尝试通过局面差异推断
            for (let i = 0; i < 64; i++) {
                if (oldBoard[i] && !newBoard[i] && i !== toIdx) {
                    fromIdx = i;
                    break;
                }
            }
        }
        
        // 检测是否是王车易位
        let isCastle = false;
        let rookToIdx = -1;
        if (fromIdx >= 0 && toIdx >= 0) {
            const piece = oldBoard[fromIdx];
            if (piece && piece.type === 'king') {
                const fromCol = fromIdx % 8;
                const toCol = toIdx % 8;
                if (Math.abs(toCol - fromCol) === 2) {
                    isCastle = true;
                    // 推断车的位置
                    if (toCol === 6) rookToIdx = toIdx - 1; // 短易位
                    else if (toCol === 2) rookToIdx = toIdx + 1; // 长易位
                }
            }
        }
        
        // 检测是否吃子
        const isCapture = oldBoard[toIdx] !== null || (removedFrom >= 0 && removedFrom !== fromIdx);
        
        return { toIdx, fromIdx, isCapture, isCastle, rookToIdx };
    }

    function startPolling() {
        if (pollTimer) clearInterval(pollTimer);
        lastPolledFen = engine.getFEN();
        pollTimer = setInterval(async () => {
            if (isMoving) return; // 走棋期间跳过轮询
            try {
                const { data } = await net.pollData();
                if (!data || !data.fen) return;
                const remoteFen = data.fen;
                const localFen = engine.getFEN();
                
                if (remoteFen !== localFen && remoteFen !== lastPolledFen) {
                    // 检测对手走棋，播放动画
                    const moveInfo = detectOpponentMove(localFen, remoteFen);
                    
                    // 加载远程数据
                    engine.loadFEN(remoteFen);
                    selectedIdx = -1;
                    legalMoves = [];
                    lastFrom = moveInfo.fromIdx >= 0 ? moveInfo.fromIdx : -1;
                    lastTo = moveInfo.toIdx >= 0 ? moveInfo.toIdx : -1;
                    
                    // 播放对手走棋动画
                    if (moveInfo.toIdx >= 0) {
                        animPiece = { idx: moveInfo.toIdx, startTime: performance.now() };
                        if (moveInfo.isCastle && moveInfo.rookToIdx >= 0) {
                            animRook = { idx: moveInfo.rookToIdx, startTime: performance.now() };
                        }
                        // 播放音效
                        if (moveInfo.isCapture) sfxCapture();
                        else sfxMove();
                    }
                    
                    render();
                    updateStatus();
                    lastPolledFen = remoteFen;
                    
                    if (data.status === 'finished') {
                        gameOver = true;
                        showResult(data.result);
                        clearInterval(pollTimer);
                        sfxEnd();
                    }
                    if (!gameOver && engine.isKingInCheck(engine.turn)) sfxCheck();
                }
                
                // 超时检测
                if (data.status === 'playing') {
                    const lastMoveDate = new Date(data.lastMoveTime);
                    if (!isNaN(lastMoveDate.getTime()) && (Date.now() - lastMoveDate.getTime()) > 120000) {
                        const currentTurn = engine.turn;
                        if (currentTurn !== myColor) {
                            const winner = myColor === 'white' ? 'white' : 'black';
                            await net.updateData(engine.getFEN(), [], winner, 'finished');
                        }
                    }
                }
            } catch(e) {}
        }, 1500);
    }

    function startLocalGame() {
        gameMode = 'local'; myColor = 'white';
        engine = new ChessEngine();
        lastPolledFen = null;
        transitionTo(gameContainer, [lobby, onlineMenu]).then(() => {
            document.getElementById('gameModeLabel').textContent = '本地对战';
            document.getElementById('roomDisplayInGame').textContent = '';
            document.getElementById('resignBtn').style.display = 'none';
            setupCanvasSize();
            resetBoard();
            render();
            updateStatus();
        });
    }

    function startOnlineGame() {
        lastPolledFen = engine.getFEN();
        transitionTo(gameContainer, [lobby, onlineMenu]).then(() => {
            document.getElementById('gameModeLabel').textContent = '在线对战';
            document.getElementById('roomDisplayInGame').textContent = `房间 ${net.roomId}`;
            document.getElementById('resignBtn').style.display = 'inline-block';
            setupCanvasSize();
            resetBoard();
            render();
            updateStatus();
            startPolling();
        });
    }

    function resetBoard() {
        selectedIdx = -1; legalMoves = []; lastFrom = -1; lastTo = -1;
        gameOver = false; isMoving = false;
        animPiece = animRook = null;
    }

    function clearPolling() {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    // 缓存管理
    function saveCache() {
        let cache = {};
        try { cache = JSON.parse(localStorage.getItem('chess_cache') || '{}'); } catch(e) {}
        cache[net.roomId] = { role: net.role, password: net.password, uuid: net.uuid, lastActive: Date.now() };
        localStorage.setItem('chess_cache', JSON.stringify(cache));
    }
    function clearCache() {
        let cache = {};
        try { cache = JSON.parse(localStorage.getItem('chess_cache') || '{}'); } catch(e) {}
        delete cache[net.roomId];
        localStorage.setItem('chess_cache', JSON.stringify(cache));
    }

    // 事件绑定
    canvas.addEventListener('click', e => { const i = getClickIndex(e); if (i >= 0) handleClick(i); });
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const i = getClickIndex(e.touches[0]);
        if (i >= 0) handleClick(i);
    }, { passive: false });

    document.getElementById('localBtn').addEventListener('click', startLocalGame);
    document.getElementById('onlineBtn').addEventListener('click', () => transitionTo(onlineMenu, [lobby]));
    document.getElementById('backToLobbyBtn').addEventListener('click', () => {
        clearPolling();
        transitionTo(lobby, [onlineMenu, gameContainer]);
    });
    document.getElementById('createRoomBtn').addEventListener('click', async () => {
        try {
            await net.createRoom();
            saveCache();
            document.getElementById('roomIdDisplay').textContent = net.roomId;
            document.getElementById('roomInfo').style.display = 'block';
            document.getElementById('joinPanel').style.display = 'none';
            document.getElementById('cancelRoomBtn').onclick = async () => {
                await net.deleteRoom();
                clearCache();
                transitionTo(onlineMenu, [gameContainer]).then(() => { document.getElementById('roomInfo').style.display = 'none'; });
                notify('已取消房间', 'warn');
            };
            engine = new ChessEngine();
            gameMode = 'online'; myColor = 'white';
            startOnlineGame();
        } catch(e) { notify(e.message, 'err'); }
    });
    document.getElementById('joinRoomBtn').addEventListener('click', () => {
        document.getElementById('joinPanel').style.display = 'flex';
        document.getElementById('roomInfo').style.display = 'none';
    });
    document.getElementById('joinSubmitBtn').addEventListener('click', async () => {
        const room = document.getElementById('joinRoomIdInput').value.trim();
        if (room.length !== 5) { notify('请输入5位房间号', 'err'); return; }
        try {
            await net.joinRoom(room);
            saveCache();
            engine = new ChessEngine();
            gameMode = 'online'; myColor = 'black';
            startOnlineGame();
        } catch(e) { notify(e.message, 'err'); }
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (gameMode !== 'local') {
            notify('在线对局无法重置', 'warn');
            return;
        }
        engine = new ChessEngine();
        resetBoard();
        render();
        updateStatus();
    });
    document.getElementById('resignBtn').addEventListener('click', async () => {
        if (gameMode === 'online' && !gameOver) {
            const winner = myColor === 'white' ? 'black' : 'white';
            await net.updateData(engine.getFEN(), [], winner, 'finished');
            gameOver = true;
            showResult(winner);
            clearPolling();
            updateStatus();
            sfxEnd();
        }
    });
    document.getElementById('copyRoomBtn').addEventListener('click', () => {
        navigator.clipboard.writeText(net.roomId).then(() => notify('房间号已复制'));
    });

    // 重连逻辑
    function checkReconnect() {
        let cache = {};
        try { cache = JSON.parse(localStorage.getItem('chess_cache') || '{}'); } catch(e) {}
        const now = Date.now();
        const valid = Object.entries(cache).filter(([id, v]) => now - v.lastActive < 300000);
        if (valid.length === 0) {
            transitionTo(lobby, []);
            return;
        }
        valid.sort((a,b) => b[1].lastActive - a[1].lastActive);
        const [roomId, info] = valid[0];
        document.getElementById('reconnectList').textContent = `房间 ${roomId} (角色: ${info.role})`;
        reconnectModal.style.display = 'flex';
        document.getElementById('reconnectBtn').onclick = async () => {
            try {
                net.roomId = roomId; net.role = info.role; net.password = info.password; net.uuid = info.uuid;
                if (!await net.verifyPassword(info.role)) throw new Error('验证失败');
                const { data } = await net.pollData();
                engine = new ChessEngine(data.fen);
                myColor = info.role;
                gameMode = 'online';
                reconnectModal.style.display = 'none';
                transitionTo(gameContainer, [lobby, onlineMenu]).then(() => {
                    document.getElementById('gameModeLabel').textContent = '在线对战';
                    document.getElementById('roomDisplayInGame').textContent = `房间 ${net.roomId}`;
                    document.getElementById('resignBtn').style.display = 'inline-block';
                    setupCanvasSize();
                    render();
                    updateStatus();
                    startPolling();
                });
            } catch(e) {
                delete cache[roomId]; localStorage.setItem('chess_cache', JSON.stringify(cache));
                reconnectModal.style.display = 'none';
                transitionTo(lobby, []);
            }
        };
        document.getElementById('ignoreReconnectBtn').onclick = () => {
            delete cache[roomId]; localStorage.setItem('chess_cache', JSON.stringify(cache));
            reconnectModal.style.display = 'none';
            transitionTo(lobby, []);
        };
    }

    // 初始化入口
    function doInit() {
        if (window.splashReady) {
            setTimeout(() => {
                const splash = document.getElementById('splash');
                const piece = document.getElementById('splashPiece');
                piece.style.animation = '';
                splash.style.opacity = '0';
                setTimeout(() => {
                    splash.style.display = 'none';
                    checkReconnect();
                }, 500);
            }, 1000);
        } else {
            window.tryInitApp = doInit;
        }
    }

    window.initApp = doInit;

    window.addEventListener('beforeunload', () => {
        if (audioCtx) audioCtx.close();
    });

    if (window.splashReady) {
        doInit();
    } else {
        window.tryInitApp = doInit;
    }
})();