import * as THREE from 'three';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // 基础状态
        this.position = new THREE.Vector3(0, 0.9, 5);
        this.velocity = new THREE.Vector3();
        this.yaw = 0;
        this.pitch = 0;
        this.isGrounded = true;
        this.isCrouching = false;      // 蹲下状态（短按切换）
        this.isSliding = false;        // 滑铲中
        this.isRunning = false;        // 按住奔跑键
        this.runDecay = 0;             // 奔跑衰减系数 (0-1)

        // 滑铲与下蹲控制
        this.slideTimer = 0;           // 当前滑铲已持续时间
        this.slideDuration = 3.0;      // 滑铲最长3秒
        this.slideCooldown = 0;        // 滑铲结束后3秒内无法下蹲/滑铲

        // 跳跃
        this.jumpCooldown = 0;         // 防止连续跳跃

        // 移动参数
        this.walkSpeed = 8;
        this.runSpeed = 16;
        this.crouchSpeed = 5;
        this.slideSpeed = 14;
        this.jumpForceSmall = 10;
        this.jumpForceLarge = 15;
        this.gravity = 28;

        // 碰撞体
        this.collisionWidth = 0.55;
        this.collisionHeight = 1.75;
        this.collisionDepth = 0.55;
        this.crouchCollisionHeight = 0.9;
        this.slideCollisionHeight = 0.6;

        // 相机
        this.cameraGroup = new THREE.Group();
        this.cameraGroup.add(this.camera);
        this.scene.add(this.cameraGroup);
        this.cameraGroup.position.copy(this.position);
        this.camera.position.set(0, 0, 0);
    }

    getCollisionHeight() {
        if (this.isSliding) return this.slideCollisionHeight;
        if (this.isCrouching) return this.crouchCollisionHeight;
        return this.collisionHeight;
    }

    getCollisionBox() {
        const h = this.getCollisionHeight();
        return {
            minX: this.position.x - this.collisionWidth / 2,
            maxX: this.position.x + this.collisionWidth / 2,
            minY: this.position.y - h,
            maxY: this.position.y,
            minZ: this.position.z - this.collisionDepth / 2,
            maxZ: this.position.z + this.collisionDepth / 2,
        };
    }

    update(deltaTime, inputData, obstacles) {
        const dt = Math.min(deltaTime, 0.1);

        // 冷却递减
        if (this.jumpCooldown > 0) this.jumpCooldown -= dt;
        if (this.slideCooldown > 0) this.slideCooldown -= dt;

        // 奔跑状态管理
        if (inputData.run && this.isGrounded && !this.isSliding && !this.isCrouching) {
            this.isRunning = true;
            this.runDecay = 1.0;
        } else {
            this.isRunning = false;
            if (this.runDecay > 0) {
                this.runDecay -= dt / 1.5;   // 1.5秒衰减
                if (this.runDecay < 0) this.runDecay = 0;
            }
        }

        // 跳跃处理（短按/长按）
        if (inputData.jumpTrigger !== 'none' && this.jumpCooldown <= 0 && this.isGrounded && !this.isSliding) {
            const strength = inputData.jumpTrigger === 'long' ? this.jumpForceLarge : this.jumpForceSmall;
            const runBonus = 1.0 + this.runDecay * 0.5;
            this.velocity.y = strength * runBonus;
            this.isGrounded = false;
            this.jumpCooldown = 0.2;
            // 跳跃恢复站立
            this.isCrouching = false;
            this.isSliding = false;
            this.slideTimer = 0;
            // 注意：跳跃不清除滑铲冷却，符合COD手感
        }

        // 滑铲/下蹲状态机
        this.updateSlideState(inputData.slideAction, dt);

        // 当前允许的最大水平速度
        let currentMaxSpeed = this.walkSpeed;
        if (this.isRunning) currentMaxSpeed = this.runSpeed;
        else if (this.runDecay > 0.01) currentMaxSpeed = this.walkSpeed + (this.runSpeed - this.walkSpeed) * this.runDecay;
        if (this.isCrouching && !this.isSliding) currentMaxSpeed = this.crouchSpeed;
        if (this.isSliding) currentMaxSpeed = this.slideSpeed;

        // 输入移动
        const moveInput = inputData.move;
        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
        const moveX = moveInput.x * currentMaxSpeed;
        const moveZ = moveInput.y * currentMaxSpeed;
        const moveDir = new THREE.Vector3(0,0,0);
        if (Math.abs(moveInput.x) > 0.1 || Math.abs(moveInput.y) > 0.1) {
            moveDir.add(forward.clone().multiplyScalar(moveZ));
            moveDir.add(right.clone().multiplyScalar(moveX));
            if (moveDir.length() > currentMaxSpeed) moveDir.normalize().multiplyScalar(currentMaxSpeed);
        }
        this.velocity.x = moveDir.x;
        this.velocity.z = moveDir.z;

        // 重力
        if (!this.isGrounded) {
            this.velocity.y -= this.gravity * dt;
        } else {
            if (this.velocity.y < 0) this.velocity.y = 0;
        }

        // 位移
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        // 碰撞检测（仅障碍物，不包括地面）
        this.resolveCollisions(obstacles, dt);

        // 独立地面检测（地面位于 y=0）
        const playerBottom = this.position.y - this.getCollisionHeight();
        if (playerBottom <= 0.01 && this.velocity.y <= 0) {
            this.position.y = this.getCollisionHeight();
            this.velocity.y = 0;
            this.isGrounded = true;
        } else if (playerBottom > 0.02) {
            this.isGrounded = false;
        }

        // 边界限制
        const mapHalf = 90;
        this.position.x = Math.max(-mapHalf, Math.min(mapHalf, this.position.x));
        this.position.z = Math.max(-mapHalf, Math.min(mapHalf, this.position.z));
        if (this.position.y < -20) {
            this.position.set(0, 5, 5);
            this.velocity.set(0,0,0);
            this.isGrounded = false;
        }

        // 相机高度
        let camHeight = 0.9;
        if (this.isCrouching) camHeight = 0.4;
        if (this.isSliding) camHeight = 0.3;
        this.cameraGroup.position.set(this.position.x, this.position.y + camHeight, this.position.z);
        this.cameraGroup.rotation.order = 'YXZ';
        this.cameraGroup.rotation.y = this.yaw;
        this.cameraGroup.rotation.x = this.pitch;

        return {
            isGrounded: this.isGrounded,
            isRunning: this.isRunning || this.runDecay > 0.1,
            isCrouching: this.isCrouching,
            isSliding: this.isSliding,
            speed: this.velocity.length(),
        };
    }

    updateSlideState(action, dt) {
        // 滑铲进行中计时
        if (this.isSliding) {
            this.slideTimer -= dt;
            if (this.slideTimer <= 0) {
                this.endSlide();       // 时间到，自动起立
                return;
            }
        }

        // 根据外部指令处理
        if (action === 'toggle' && !this.isSliding && this.slideCooldown <= 0) {
            // 短按：切换蹲下/站立
            this.isCrouching = !this.isCrouching;
            if (this.isCrouching) {
                this.isRunning = false;
                this.runDecay = 0;
            }
        } else if (action === 'start' && !this.isSliding && this.slideCooldown <= 0 && this.isGrounded) {
            // 长按触发滑铲（仅当奔跑状态下才真正滑铲，否则忽略，按钮逻辑已过滤）
            if (this.isRunning || this.runDecay > 0.5) {
                this.startSlide();
            }
        } else if (action === 'end' && this.isSliding) {
            // 主动结束滑铲（松开按钮）
            this.endSlide();
        }
    }

    startSlide() {
        this.isSliding = true;
        this.slideTimer = this.slideDuration;
        this.isCrouching = false;
        this.runDecay = 0;
        const slideDir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize().multiplyScalar(this.slideSpeed);
        this.velocity.x = slideDir.x;
        this.velocity.z = slideDir.z;
        this.velocity.y = -2;   // 轻微向下加速度
    }

    endSlide() {
        this.isSliding = false;
        this.isCrouching = false;
        // 滑铲结束后3秒内不能下蹲/滑铲（模仿硬直）
        this.slideCooldown = 3.0;
    }

    resolveCollisions(obstacles, dt) {
        const playerBox = this.getCollisionBox();
        for (const obs of obstacles) {
            if (!obs.collision) continue;
            const obsBox = obs.collision;
            const overlapX = Math.min(playerBox.maxX, obsBox.maxX) - Math.max(playerBox.minX, obsBox.minX);
            const overlapY = Math.min(playerBox.maxY, obsBox.maxY) - Math.max(playerBox.minY, obsBox.minY);
            const overlapZ = Math.min(playerBox.maxZ, obsBox.maxZ) - Math.max(playerBox.minZ, obsBox.minZ);
            if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
                const overlaps = [
                    { axis: 'x', value: overlapX, dir: this.position.x > (obsBox.minX + obsBox.maxX) / 2 ? 1 : -1 },
                    { axis: 'y', value: overlapY, dir: this.position.y > (obsBox.minY + obsBox.maxY) / 2 ? 1 : -1 },
                    { axis: 'z', value: overlapZ, dir: this.position.z > (obsBox.minZ + obsBox.maxZ) / 2 ? 1 : -1 },
                ];
                overlaps.sort((a, b) => a.value - b.value);
                const min = overlaps[0];
                if (min.axis === 'y') {
                    this.position.y += min.dir * min.value;
                    if (min.dir > 0 && this.velocity.y < 0) {
                        this.velocity.y = 0;
                        this.isGrounded = true;
                    } else if (min.dir < 0 && this.velocity.y > 0) {
                        this.velocity.y = 0;
                    }
                } else if (min.axis === 'x') {
                    this.position.x += min.dir * min.value;
                    this.velocity.x *= -0.3;
                } else if (min.axis === 'z') {
                    this.position.z += min.dir * min.value;
                    this.velocity.z *= -0.3;
                }
            }
        }
    }

    rotateView(deltaYaw, deltaPitch) {
        this.yaw += deltaYaw;
        this.pitch += deltaPitch;
        this.pitch = Math.max(-1.2, Math.min(0.6, this.pitch));
    }
}