// 物理与游戏常量
export const GRAVITY = 280;
export const BASE_SIZE = 100;
export const BASE_MAX_HEALTH = 100;
export const MISSILE_DAMAGE = 20;
export const SHELL_DAMAGE = 5;
export const BOMB_DAMAGE = 5;
export const TANK_SHELL_DAMAGE = 12;
export const TANK_HEALTH = 30;
export const TANK_SPEED = 45;
export const TANK_SPAWN_INTERVAL = 5.0;
export const TANK_RANGE = 480;

// 导弹
export const MISSILE_LAUNCH_ANGLE = 75 * Math.PI / 180;
export const MISSILE_BASE_SPEED = 420;
export const ATTACK_SPEED = 600;
export const ATTACK_TURN_RATE = (45 * Math.PI) / 180;
export const INTERCEPTOR_SPEED = 780;
export const INTERCEPTOR_TURN_RATE = (45 * Math.PI) / 180;
export const PROXIMITY_RADIUS = 52;
export const MAX_AMMO = 20;
export const RELOAD_TIME = 3.0;

export const PHASE_LAUNCH = 0;
export const PHASE_RCS = 1;
export const PHASE_GUIDED = 2;
export const TERMINAL_DISTANCE = 200;
export const COOLDOWN_TIME = 0.4;
export const GROUND_Y_OFFSET = 8;

// 火炮
export const ARTILLERY_BURST = 10;
export const ARTILLERY_INTERVAL = 0.1;
export const ARTILLERY_COOLDOWN = 1.0;
export const ARTILLERY_ACC = 0.7;

// 近防炮
export const CIWS_RANGE = 320;
export const CIWS_BULLET_SPEED = 450;
export const CIWS_RATE = 20;
export const CIWS_ACC = 0.8;

// 轰炸机
export const BOMBER_SPEED = 200;
export const BOMBER_HEALTH = 5;
export const BOMBER_BOMBS = 10;
export const BOMBER_SPAWN_INT = 10.0;
export const BOMBERS_PER_WAVE = 3;
export const BOMB_DROP_INT = 0.45;
export const BOMB_DROP_RANGE = 280;
export const BOMBER_COLLIDE_RAD = 40;
export const BOMBER_EXPLOSION_RAD = 150;
export const BOMBER_TURN_RATE = 2.8;

export const BASE_Y_OFFSET = 110;
export const REPAIR_RATE = 1.0;
export const RESTART_DELAY = 2.0;