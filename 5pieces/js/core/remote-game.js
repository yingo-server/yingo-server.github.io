import Board from './board.js';
import Renderer from './renderer.js';
import { playDropSound } from '../utils/sound.js';
import { getBoardIndexFromClick } from '../utils/helpers.js';
import { BOARD_SIZE, ANIMATION_DURATION } from '../utils/constants.js';
import { getRoomInfo, addMove } from '../network/room-manager.js';
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
        this.currentTurn = 1;
        this.gameOver = false;
        this.winner = null;

        this.animatingPiece = null;
        this.animationFrame = null;
        this.pollInterval = null;
        this.isMyTurn = false;

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

            this.updateBoardFromMoves(info.moves);
            this.gameOver = info.gameOver;

            const moveCount = info.moves.length;
            this.currentTurn = (moveCount % 2 === 0) ? 1 : 2;
            this.isMyTurn = (this.currentTurn === this.myColor) && !this.gameOver;

            this.updateUI();
            this.render();

            this.canvas.addEventListener('click', this.handleClick.bind(this));
            this.startPolling();
            this.startAnimationLoop();

            showToast(`你扮演 ${this.myColor === 1 ? '黑方' : '白方'}`, 'info', 2000);
        } catch (e) {
            showError(e, '无法加入房间');
            throw e;
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
        this.pollInterval = setInterval(async () => {
            if (this.gameOver) return;
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
                        if (this.gameOver) {
                            clearInterval(this.pollInterval);
                            showToast('游戏结束', 'info');
                        }
                    }
                } catch (e) {
                    showError(e, '轮询更新失败');
                }
            }
        }, window.POLL_INTERVAL || 2000);
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
        if (this.gameOver || !this.isMyTurn) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        const index = getBoardIndexFromClick(mouseX, mouseY);
        if (!index) return;
        const { row, col } = index;
        if (!this.board.isCellEmpty(row, col)) return;

        // 本地先落子（乐观更新）
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
            this.statusDiv.textContent = '';
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
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    }
}