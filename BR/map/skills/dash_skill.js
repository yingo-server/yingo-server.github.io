import * as THREE from 'three';

export function init(game) {
    game.skillState.cooldown = 0;
}

export function activate(game) {
    if (game.skillState.cooldown > 0) return;
    game.skillState.cooldown = 8.0;

    const player = game.player;
    const dashSpeed = 50;
    const dir = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
    player.velocity.x = dir.x * dashSpeed;
    player.velocity.z = dir.z * dashSpeed;
    player.velocity.y = Math.max(player.velocity.y, 10);
    player.isGrounded = false;

    if (game.audioManager && game.audioManager.ctx) {
        const ctx = game.audioManager.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    }
}