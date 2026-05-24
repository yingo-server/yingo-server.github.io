// js/main.js - 入口文件，移除冗余 AudioManager
import { Game } from './game.js';

const rotateHint = document.getElementById('rotate-hint');
const logoOverlay = document.getElementById('logo-overlay');
const mobileControls = document.getElementById('mobile-controls');
let gameStarted = false;
let gameInstance = null;
let orientationTimer = null;

function isLandscape() {
    return window.innerWidth > window.innerHeight;
}

function updateOrientationUI() {
    const landscape = isLandscape();
    if (gameStarted) {
        if (landscape && gameInstance) gameInstance.onResize();
        return;
    }
    if (landscape) {
        rotateHint.classList.add('hidden');
        logoOverlay.classList.remove('hidden');
        if (orientationTimer) clearTimeout(orientationTimer);
        orientationTimer = setTimeout(() => {
            if (!gameStarted && isLandscape()) {
                startGame();
            }
        }, 2500);
    } else {
        rotateHint.classList.remove('hidden');
        logoOverlay.classList.add('hidden');
        if (orientationTimer) {
            clearTimeout(orientationTimer);
            orientationTimer = null;
        }
    }
}

function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    logoOverlay.classList.add('hidden');
    rotateHint.classList.add('hidden');
    mobileControls.classList.remove('hidden');
    gameInstance = new Game(document.getElementById('game-canvas'), mobileControls, null);
    gameInstance.init();
}

window.addEventListener('resize', () => {
    clearTimeout(window._resizeDebounce);
    window._resizeDebounce = setTimeout(updateOrientationUI, 150);
});
window.addEventListener('orientationchange', () => {
    setTimeout(updateOrientationUI, 200);
});

updateOrientationUI();
if (isLandscape() && !gameStarted && logoOverlay.classList.contains('hidden')) {
    updateOrientationUI();
}

// 全局禁用
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('gestureend', e => e.preventDefault());
document.addEventListener('touchmove', e => {
    if (e.target.closest('#game-container') || e.target.closest('#mobile-controls')) {
        e.preventDefault();
    }
}, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());
window.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Spacebar') e.preventDefault();
});