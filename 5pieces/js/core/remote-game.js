import Board from './board.js';
import Renderer from './renderer.js';
import { playDropSound } from '../utils/sound.js';
import { getBoardIndexFromClick } from '../utils/helpers.js';
import { BOARD_SIZE, ANIMATION_DURATION } from '../utils/constants.js';
import { getRoomInfo, addMove, deleteRoom } from '../network/room-manager.js';
import { showToast, showError } from '../ui/toast.js';

export default class RemoteGame {
    constructor(canvas, turnIndicator, statusDiv, roomId, playerName) {
        this.canvas = canvas;
        this.turnIndicator = turnIndicator;
        this.statusDiv = statusDiv;
        this.roomId = roomId;
        this.playerName = playerName;

        this.board = new Board();
        this.renderer = new Renderer(canvas);

        this.myColor = null; // 1:黑, 2:白
        this.currentTurn = 1; // 当前该谁下（1黑2白）
        this.gameOver = false;
        this.winner = null;

        this.animatingPiece = null;
        this.animationFrame = null;
        this.pollInterval = null;
        this.waitTimer = null;
        this.turnTimer = null;
        this.isMyTurn = false;
        this.waitingForOpponent = true; // 是否在等待对手加入

        // 超时设定
        this.waitTimeout = 5 * 60 * 1000; // 5分钟
        this.turnTimeout = 45 * 1000;     // 45秒

        this.initGame().catch(e => {
            showError(e, '初始化游戏失败');
            this.statusDiv.textContent = '初始化失败';
        });
    }

    async initGame() {
        try {
            const info = await getRoomInfo(this.roomId);
            if (!info) {
                throw new Error('ROOM_NOT_FOUND', '房间不存在');
            }
            if (info.black === this.playerName) {
                this.myColor = 1;
            } else if (info.white === this.playerName) {
                this.myColor = 2;
            } else {
                throw new Error('NOT_PLAYER', '你不是该房间的玩家');
            }

            // 根据白方是否为空判断是否需要等待
            if (info.white !== '') {
                // 双方已到齐，直接开始游戏
                this.waitingForOpponent = false;
                this.updateBoardFromMoves(info.moves);
                this.gameOver = info.gameOver;
                const moveCount = info.moves.length;
                this.currentTurn = (moveCount % 2 === 0) ? 1 : 2;
                this.isMyTurn = (this.currentTurn === this.myColor) && !this.gameOver;
                this.updateUI();
                this.render();
                this.canvas.addEventListener('click', this.handleClick.bind(this));
                this.startPolling(); // 正常回合轮询
                this.startAnimationLoop();
                this.resetTurnTimer(); // 启动回合计时器
                showToast('游戏开始，每步限时45秒', 'info');
            } else {
                // 等待对手加入
                this.waitingForOpponent = true;
                this.statusDiv.textContent = this.myColor === 1 ? '等待白方加入...（5分钟超时）' : '等待黑方开始游戏...';
                this.render(); // 绘制空棋盘

                if (this.myColor === 1) {
                    // 黑方启动等待超时和轮询（间隔改为1秒）
                    this.waitTimer = setTimeout(() => this.handleWaitTimeout(), this.waitTimeout);
                    this.pollInterval = setInterval(() => this.checkOpponentJoined(), 1000);
                    showToast('房间已创建，5分钟内对手未加入将自动销毁', 'info');
                } else {
                    // 白方只需轮询（间隔改为1秒）
                    this.pollInterval = setInterval(() => this.checkOpponentJoined(), 1000);
                }
                this.canvas.addEventListener('click', this.handleClick.bind(this)); // 但点击会被waiting阻止
                this.startAnimationLoop();
            }
        } catch (e) {
            showError(e, '无法加入房间');
            throw e;
        }
    }

    // 检查对手是否已加入
    async checkOpponentJoined() {
        try {
            const info = await getRoomInfo(this.roomId);
            if (info && info.white !== '') {
                // 对手已加入
                clearInterval(this.pollInterval);
                if (this.waitTimer) clearTimeout(this.waitTimer);
                this.waitingForOpponent = false;
                this.updateBoardFromMoves(info.moves);
                this.gameOver = info.gameOver;
                const moveCount = info.moves.length;
                this.currentTurn = (moveCount % 2 === 0) ? 1 : 2;
                this.isMyTurn = (this.currentTurn === this.myColor) && !this.gameOver;
                this.updateUI();
                this.render();
                this.startPolling(); // 开始正常回合轮询
                this.resetTurnTimer();
                showToast('对手已加入，游戏开始！', 'success');
            }
        } catch (e) {
            console.error('轮询对手状态失败', e);
        }
    }

    // 等待超时处理（仅黑方）
    async handleWaitTimeout() {
        clearInterval(this.pollInterval);
        this.statusDiv.textContent = '等待超时，房间即将销毁...';
        showToast('等待超时，房间已销毁', 'warning');
        try {
            await deleteRoom(this.roomId);
        } catch (e) {
            showError(e, '销毁房间失败');
        } finally {
            this.destroy();
            // 触发返回大厅（可通过事件或直接跳转）
            setTimeout(() => {
                window.location.href = '../index.html'; // 简易返回，可根据需要调整
            }, 2000);
        }
    }

    // 回合超时处理
    handleTurnTimeout() {
        if (this.gameOver) return;
        // 对方超时未落子，当前玩家获胜
        this.gameOver = true;
        this.winner = this.myColor;
        this.updateUI();
        showToast('对方超时，你获胜！', 'success');
        // 可选：在 vs.txt 中记录超时结果
        // 由于没有落子，可以调用一个特殊的 API 来记录，这里简化处理
    }

    // 重置回合计时器
    resetTurnTimer() {
        if (this.turnTimer) clearTimeout(this.turnTimer);
        if (this.gameOver || this.waitingForOpponent) return;
        if (!this.isMyTurn) {
            // 对方回合，启动计时器
            this.turnTimer = setTimeout(() => this.handleTurnTimeout(), this.turnTimeout);
        }
    }

    updateBoardFromMoves(moves) {
        this.board.reset();
        moves.forEach((move, index) => {
            const [row, col] = move.split(',').map(Number);
            const player = (index % 2 === 0) ? 1 : 2;
            if (row >=0 && row < BOARD_SIZE && col >=0 && col < BOARD_SIZE) {
                this.board.grid[row][col] = player;
            }
        });
    }

    startPolling() {
        // 正常对局轮询（只在对手回合），间隔使用全局配置（现已改为1000ms）
        this.pollInterval = setInterval(async () => {
            if (this.gameOver || this.waitingForOpponent) return;
            if (!this.isMyTurn) {
                try {
                    const info = await getRoomInfo(this.roomId);
                    if (!info) {
                        showToast('房间已丢失', 'error');
                        this.destroy();
                        return;
                    }
                    if (info.moves.length > this.getMoveCount()) {
                        this.updateBoardFromMoves(info.moves);
                        this.gameOver = info.gameOver;
                        const moveCount = info.moves.length;
                        this.currentTurn = (moveCount % 2 === 0) ? 1 : 2;
                        this.isMyTurn = (this.currentTurn === this.myColor) && !this.gameOver;
                        this.updateUI();
                        this.render();
                        this.resetTurnTimer();
                        if (this.gameOver) {
                            clearInterval(this.pollInterval);
                            showToast('游戏结束', 'info');
                        }
                    }
                } catch (e) {
                    showError(e, '轮询更新失败');
                }
            }
        }, window.POLL_INTERVAL);
    }

    getMoveCount() {
        let count = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board.grid[r][c] !== 0) count++;
            }
        }
        return count;
    }

    async handleClick(e) {
        if (this.gameOver || !this.isMyTurn || this.waitingForOpponent) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        const index = getBoardIndexFromClick(mouseX, mouseY);
        if (!index) return;
        const { row, col } = index;
        if (!this.board.isCellEmpty(row, col)) return;

        // 本地乐观更新
        this.board.setPiece(row, col, this.myColor);
        playDropSound();
        this.animatingPiece = { row, col, startTime: Date.now() };
        this.render();

        try {
            const winner = this.checkWinnerLocal(row, col);
            const gameOver = !!winner || this.board.isFull();

            const success = await addMove(this.roomId, row, col, this.playerName, gameOver);
            if (!success) {
                throw new Error('MOVE_FAILED', '服务器拒绝落子');
            }

            if (gameOver) {
                this.gameOver = true;
                this.winner = winner || 'draw';
                clearInterval(this.pollInterval);
                showToast(this.winner === 1 ? '黑方胜利' : this.winner === 2 ? '白方胜利' : '无人获胜', 'success');
            } else {
                this.currentTurn = (this.currentTurn === 1) ? 2 : 1;
                this.isMyTurn = false;
            }
            this.updateUI();
            this.resetTurnTimer(); // 切换回合后重置计时器

            // 立即拉取一次确保同步
            const info = await getRoomInfo(this.roomId);
            if (info) {
                this.updateBoardFromMoves(info.moves);
                this.gameOver = info.gameOver;
                this.render();
            }
        } catch (e) {
            // 回滚
            this.board.grid[row][col] = 0;
            this.animatingPiece = null;
            this.render();
            showError(e, '落子失败');
        }
    }

    checkWinnerLocal(row, col) {
        const player = this.board.getPiece(row, col);
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (let [dx, dy] of directions) {
            let count = 1;
            for (let step = 1; step < 5; step++) {
                const nr = row + dx * step;
                const nc = col + dy * step;
                if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE || this.board.getPiece(nr, nc) !== player) break;
                count++;
            }
            for (let step = 1; step < 5; step++) {
                const nr = row - dx * step;
                const nc = col - dy * step;
                if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE || this.board.getPiece(nr, nc) !== player) break;
                count++;
            }
            if (count >= 5) return player;
        }
        return null;
    }

    updateUI() {
        if (this.waitingForOpponent) {
            if (this.myColor === 1) {
                this.turnIndicator.innerHTML = '<span class="material-icons">hourglass_empty</span> 等待白方加入';
            } else {
                this.turnIndicator.innerHTML = '<span class="material-icons">hourglass_empty</span> 等待黑方开始';
            }
            this.turnIndicator.classList.remove('white-turn');
            return;
        }

        if (this.gameOver) {
            if (this.winner === 1) {
                this.turnIndicator.innerHTML = '<span class="material-icons">emoji_events</span> 黑方胜利';
                this.turnIndicator.classList.remove('white-turn');
            } else if (this.winner === 2) {
                this.turnIndicator.innerHTML = '<span class="material-icons">emoji_events</span> 白方胜利';
                this.turnIndicator.classList.add('white-turn');
            } else if (this.winner === 'draw') {
                this.turnIndicator.innerHTML = '<span class="material-icons">handshake</span> 无人获胜';
                this.turnIndicator.classList.remove('white-turn');
            } else {
                this.turnIndicator.innerHTML = '游戏结束';
            }
        } else {
            const colorText = (this.currentTurn === 1) ? '黑方' : '白方';
            if (this.isMyTurn) {
                this.turnIndicator.innerHTML = `<span class="material-icons">circle</span> 你的回合 (${colorText})`;
            } else {
                this.turnIndicator.innerHTML = `<span class="material-icons">hourglass_empty</span> 等待对手 (${colorText})`;
            }
            if (this.currentTurn === 2) {
                this.turnIndicator.classList.add('white-turn');
            } else {
                this.turnIndicator.classList.remove('white-turn');
            }
        }
    }

    render() {
        if (this.animatingPiece) {
            const elapsed = Date.now() - this.animatingPiece.startTime;
            if (elapsed >= ANIMATION_DURATION) {
                this.animatingPiece = null;
            }
        }
        this.renderer.draw(this.board.grid, this.currentTurn, this.animatingPiece);
    }

    startAnimationLoop() {
        const loop = () => {
            this.render();
            this.animationFrame = requestAnimationFrame(loop);
        };
        this.animationFrame = requestAnimationFrame(loop);
    }

    destroy() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        if (this.waitTimer) clearTimeout(this.waitTimer);
        if (this.turnTimer) clearTimeout(this.turnTimer);
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    }
}