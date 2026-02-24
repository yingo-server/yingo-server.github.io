import Board from './board.js';
import Renderer from './renderer.js';
import { playDropSound } from '../utils/sound.js';
import { getBoardIndexFromClick } from '../utils/helpers.js';
import { BOARD_SIZE, ANIMATION_DURATION } from '../utils/constants.js';
import { getRoomInfo, addMove, deleteRoom } from '../network/room-manager.js';
import { showToast, showError } from '../ui/toast.js';

export default class RemoteGame {
    constructor(canvas, roomId, playerName) {
        this.canvas = canvas;
        this.roomId = roomId;
        this.playerName = playerName;

        this.board = new Board();
        this.renderer = new Renderer(canvas);

        this.myColor = null;
        this.currentTurn = 1;
        this.gameOver = false;
        this.winner = null;

        this.animatingPiece = null;
        this.animationFrame = null;
        this.pollInterval = null;
        this.waitTimer = null;
        this.turnTimer = null;
        this.isMyTurn = false;
        this.waitingForOpponent = true;
        this.lastMove = null;
        this._firstStatusToast = true;

        this.waitTimeout = 5 * 60 * 1000;
        this.turnTimeout = 45 * 1000;

        this.initGame().catch(e => {
            showError(e, '初始化游戏失败');
        });
    }

    showStatusToast(message, initial = false) {
        const duration = initial ? 3000 : 1000;
        showToast(message, 'success', duration);
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

            if (info.white !== '') {
                this.waitingForOpponent = false;
                this.updateBoardFromMoves(info.moves);
                this.gameOver = info.gameOver;
                const moveCount = info.moves.length;
                this.currentTurn = (moveCount % 2 === 0) ? 1 : 2;
                this.isMyTurn = (this.currentTurn === this.myColor) && !this.gameOver;
                this.render();
                this.canvas.addEventListener('click', this.handleClick.bind(this));
                this.startPolling();
                this.startAnimationLoop();
                this.resetTurnTimer();
                this.showStatusToast('游戏开始，每步限时45秒', true);
            } else {
                this.waitingForOpponent = true;
                this.render();
                if (this.myColor === 1) {
                    this.waitTimer = setTimeout(() => this.handleWaitTimeout(), this.waitTimeout);
                    this.pollInterval = setInterval(() => this.checkOpponentJoined(), 1000);
                    this.showStatusToast('房间已创建，5分钟内对手未加入将自动销毁', true);
                } else {
                    this.pollInterval = setInterval(() => this.checkOpponentJoined(), 1000);
                    this.showStatusToast('等待黑方开始游戏...', true);
                }
                this.canvas.addEventListener('click', this.handleClick.bind(this));
                this.startAnimationLoop();
            }
        } catch (e) {
            showError(e, '无法加入房间');
            throw e;
        }
    }

    async checkOpponentJoined() {
        try {
            const info = await getRoomInfo(this.roomId);
            if (info && info.white !== '') {
                clearInterval(this.pollInterval);
                if (this.waitTimer) clearTimeout(this.waitTimer);
                this.waitingForOpponent = false;
                this.updateBoardFromMoves(info.moves);
                this.gameOver = info.gameOver;
                const moveCount = info.moves.length;
                this.currentTurn = (moveCount % 2 === 0) ? 1 : 2;
                this.isMyTurn = (this.currentTurn === this.myColor) && !this.gameOver;
                this.render();
                this.startPolling();
                this.resetTurnTimer();
                this.showStatusToast('对手已加入，游戏开始！', true);
            }
        } catch (e) {
            console.error('轮询对手状态失败', e);
        }
    }

    async handleWaitTimeout() {
        clearInterval(this.pollInterval);
        showToast('等待超时，房间已销毁', 'warning', 3000);
        try {
            await deleteRoom(this.roomId);
        } catch (e) {
            showError(e, '销毁房间失败');
        } finally {
            this.destroy();
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
        }
    }

    handleTurnTimeout() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.winner = this.myColor;
        showToast('对方超时，你获胜！', 'success', 3000);
    }

    resetTurnTimer() {
        if (this.turnTimer) clearTimeout(this.turnTimer);
        if (this.gameOver || this.waitingForOpponent) return;
        if (!this.isMyTurn) {
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
        if (moves.length > 0) {
            const lastMoveStr = moves[moves.length-1];
            const [r, c] = lastMoveStr.split(',').map(Number);
            this.lastMove = { row: r, col: c };
        }
    }

    startPolling() {
        this.pollInterval = setInterval(async () => {
            if (this.gameOver || this.waitingForOpponent) return;
            if (!this.isMyTurn) {
                try {
                    const info = await getRoomInfo(this.roomId);
                    if (!info) {
                        showToast('房间已丢失', 'error', 3000);
                        this.destroy();
                        return;
                    }
                    if (info.moves.length > this.getMoveCount()) {
                        this.updateBoardFromMoves(info.moves);
                        this.gameOver = info.gameOver;
                        const moveCount = info.moves.length;
                        this.currentTurn = (moveCount % 2 === 0) ? 1 : 2;
                        this.isMyTurn = (this.currentTurn === this.myColor) && !this.gameOver;
                        this.render();
                        this.resetTurnTimer();
                        if (this.gameOver) {
                            clearInterval(this.pollInterval);
                            if (this.winner === 1) showToast('黑方胜利', 'success', 3000);
                            else if (this.winner === 2) showToast('白方胜利', 'success', 3000);
                            else showToast('游戏结束', 'info', 3000);
                        } else {
                            // 显示对手落子后的回合提示
                            this.showStatusToast(this.isMyTurn ? '你的回合' : '等待对手...', false);
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

        this.board.setPiece(row, col, this.myColor);
        playDropSound();
        this.animatingPiece = { row, col, startTime: Date.now() };
        this.lastMove = { row, col };
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
                if (this.winner === 1) showToast('黑方胜利', 'success', 3000);
                else if (this.winner === 2) showToast('白方胜利', 'success', 3000);
                else showToast('无人获胜', 'success', 3000);
            } else {
                this.currentTurn = (this.currentTurn === 1) ? 2 : 1;
                this.isMyTurn = false;
                this.showStatusToast('等待对手...', false);
            }
            this.render();
            this.resetTurnTimer();

            const info = await getRoomInfo(this.roomId);
            if (info) {
                this.updateBoardFromMoves(info.moves);
                this.gameOver = info.gameOver;
                this.render();
            }
        } catch (e) {
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

    render() {
        if (this.animatingPiece) {
            const elapsed = Date.now() - this.animatingPiece.startTime;
            if (elapsed >= ANIMATION_DURATION) {
                this.animatingPiece = null;
            }
        }
        this.renderer.draw(this.board.grid, this.currentTurn, this.animatingPiece, this.lastMove);
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