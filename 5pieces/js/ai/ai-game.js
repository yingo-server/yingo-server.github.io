import Board from '../core/board.js';
import Renderer from '../core/renderer.js';
import { playDropSound } from '../utils/sound.js';
import { getBoardIndexFromClick } from '../utils/helpers.js';
import { BOARD_SIZE, ANIMATION_DURATION } from '../utils/constants.js';
import { evaluate } from './evaluator.js';
import { showToast } from '../ui/toast.js';

export default class AIGame {
    constructor(canvas, turnIndicator, resetBtn, playerColor = 1) {
        this.canvas = canvas;
        this.turnIndicator = turnIndicator;
        this.resetBtn = resetBtn;
        this.board = new Board();
        this.renderer = new Renderer(canvas);
        this.playerColor = playerColor;
        this.aiColor = playerColor === 1 ? 2 : 1;
        this.currentPlayer = 1;
        this.gameOver = false;
        this.winner = null;
        this.animatingPiece = null;
        this.animationFrame = null;
        this.step = 0;
        this.lastMove = null; // 新增

        this.initEventListeners();
        this.startAnimationLoop();
        this.render();
        this.updateTurnDisplay();

        if (this.currentPlayer === this.aiColor) {
            setTimeout(() => this.aiMove(), 500);
        }
    }

    initEventListeners() {
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        this.resetBtn.addEventListener('click', this.reset.bind(this));
    }

    handleCanvasClick(e) {
        if (this.gameOver) return;
        if (this.currentPlayer !== this.playerColor) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        const index = getBoardIndexFromClick(mouseX, mouseY);
        if (!index) return;

        const { row, col } = index;
        if (!this.board.isCellEmpty(row, col)) return;

        console.log(`[人类] 落子 (${row},${col})`);
        this.placePiece(row, col, this.playerColor);
    }

    placePiece(row, col, player) {
        this.board.setPiece(row, col, player);
        playDropSound();
        this.animatingPiece = { row, col, startTime: Date.now() };
        this.lastMove = { row, col }; // 记录最后落子
        this.step++;

        const winner = this.checkWinner(row, col);
        if (winner) {
            this.gameOver = true;
            this.winner = winner;
            this.updateTurnDisplay();
            this.render();
            console.log(`游戏结束，${winner === 1 ? '黑方' : '白方'}胜利`);
            return;
        }
        if (this.board.isFull()) {
            this.gameOver = true;
            this.winner = 'draw';
            this.updateTurnDisplay();
            this.render();
            console.log('游戏结束，平局');
            return;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateTurnDisplay();
        this.render();

        if (this.currentPlayer === this.aiColor && !this.gameOver) {
            setTimeout(() => this.aiMove(), 300);
        }
    }

    aiMove() {
        if (this.gameOver) return;

        console.log(`[AI] 开始决策，当前步数 ${this.step + 1}`);
        const [row, col] = evaluate(this.board.grid, this.aiColor, this.step);
        console.log(`[AI] 落子 (${row},${col})`);

        if (!this.board.isCellEmpty(row, col)) {
            console.warn(`[AI] 选择的点 (${row},${col}) 已有棋子，寻找第一个空位`);
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (this.board.isCellEmpty(r, c)) {
                        this.placePiece(r, c, this.aiColor);
                        return;
                    }
                }
            }
        } else {
            this.placePiece(row, col, this.aiColor);
        }
    }

    checkWinner(row, col) {
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

    updateTurnDisplay() {
        if (this.gameOver) {
            if (this.winner === 1) {
                this.turnIndicator.innerHTML = '<span class="material-icons">emoji_events</span> 黑方胜利';
            } else if (this.winner === 2) {
                this.turnIndicator.innerHTML = '<span class="material-icons">emoji_events</span> 白方胜利';
            } else if (this.winner === 'draw') {
                this.turnIndicator.innerHTML = '<span class="material-icons">handshake</span> 无人获胜';
            }
            this.turnIndicator.classList.remove('white-turn');
            return;
        }

        if (this.currentPlayer === this.playerColor) {
            this.turnIndicator.innerHTML = '<span class="material-icons">circle</span> 你的回合';
            this.turnIndicator.classList.remove('white-turn');
        } else {
            this.turnIndicator.innerHTML = '<span class="material-icons">smart_toy</span> AI思考中...';
            this.turnIndicator.classList.add('white-turn');
        }
    }

    render() {
        if (this.animatingPiece) {
            const elapsed = Date.now() - this.animatingPiece.startTime;
            if (elapsed >= ANIMATION_DURATION) {
                this.animatingPiece = null;
            }
        }
        // 传入 lastMove
        this.renderer.draw(this.board.grid, this.currentPlayer, this.animatingPiece, this.lastMove);
    }

    startAnimationLoop() {
        const loop = () => {
            this.render();
            this.animationFrame = requestAnimationFrame(loop);
        };
        this.animationFrame = requestAnimationFrame(loop);
    }

    reset() {
        this.board.reset();
        this.currentPlayer = 1;
        this.gameOver = false;
        this.winner = null;
        this.animatingPiece = null;
        this.lastMove = null; // 重置
        this.step = 0;
        this.updateTurnDisplay();
        this.render();
        if (this.currentPlayer === this.aiColor) {
            setTimeout(() => this.aiMove(), 500);
        }
    }
}