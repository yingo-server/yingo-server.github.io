import Board from './board.js';
import Renderer from './renderer.js';
import { playDropSound } from '../utils/sound.js';
import { getBoardIndexFromClick } from '../utils/helpers.js';
import { BOARD_SIZE, ANIMATION_DURATION } from '../utils/constants.js';

export default class Game {
    constructor(canvas, turnIndicator, resetBtn) {
        this.canvas = canvas;
        this.turnIndicator = turnIndicator;
        this.resetBtn = resetBtn;
        this.board = new Board();
        this.renderer = new Renderer(canvas);
        this.currentPlayer = 1;
        this.gameOver = false;
        this.winner = null;
        this.animatingPiece = null;
        this.animationFrame = null;
        this.initEventListeners();
        this.startAnimationLoop();
        this.render();
        this.updateTurnDisplay();
    }
    initEventListeners() {
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        this.resetBtn.addEventListener('click', this.reset.bind(this));
    }
    handleCanvasClick(e) {
        if (this.gameOver) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        const index = getBoardIndexFromClick(mouseX, mouseY);
        if (!index) return;
        const { row, col } = index;
        if (!this.board.isCellEmpty(row, col)) return;
        this.board.setPiece(row, col, this.currentPlayer);
        playDropSound();
        this.animatingPiece = { row, col, startTime: Date.now() };
        const winner = this.checkWinner(row, col);
        if (winner) {
            this.gameOver = true;
            this.winner = winner;
            this.updateTurnDisplay();
        } else if (this.board.isFull()) {
            this.gameOver = true;
            this.winner = 'draw';
            this.updateTurnDisplay();
        } else {
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            this.updateTurnDisplay();
        }
        this.render();
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
                this.turnIndicator.classList.remove('white-turn');
            } else if (this.winner === 2) {
                this.turnIndicator.innerHTML = '<span class="material-icons">emoji_events</span> 白方胜利';
                this.turnIndicator.classList.add('white-turn');
            } else if (this.winner === 'draw') {
                this.turnIndicator.innerHTML = '<span class="material-icons">handshake</span> 无人获胜';
                this.turnIndicator.classList.remove('white-turn');
            }
        } else {
            if (this.currentPlayer === 1) {
                this.turnIndicator.innerHTML = '<span class="material-icons">circle</span> 黑方落子';
                this.turnIndicator.classList.remove('white-turn');
            } else {
                this.turnIndicator.innerHTML = '<span class="material-icons">circle</span> 白方落子';
                this.turnIndicator.classList.add('white-turn');
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
        this.renderer.draw(this.board.grid, this.currentPlayer, this.animatingPiece);
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
        this.updateTurnDisplay();
        this.render();
    }
}