import * as THREE from 'three';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this.position = new THREE.Vector3(0, 0.9, 5);
        this.velocity = new THREE.Vector3();
        this.yaw = 0;
        this.pitch = 0;
        this.isGrounded = true;
        this.isCrouching = false;
        this.isSliding = false;
        this.isRunning = false;
        this.runDecay = 0;

        // 滑铲参数
        this.slideTimer = 0;
        this.slideDuration = 3.0;       // 最长3秒
        this.slideCooldown = 0;         // 滑铲后冷却
        this.slideRecovery = 0.6;       // 0.6秒冷却（已缩短）

        // 跳跃
        this.jumpCooldown = 0;

        // 速度
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

        if (this.jumpCooldown > 0) this.jumpCooldown -= dt;
        if (this.slideCooldown > 0) this.slideCooldown -= dt;

        // 奔跑状态（实时响应 inputData.run）
        if (inputData.run && this.isGrounded && !this.isSliding && !this.isCrouching) {
            this.isRunning = true;
            this.runDecay = 1.0;
        } else {
            this.isRunning = false;
            if (this.runDecay > 0) {
                this.runDecay -= dt / 1.5;
                if (this.runDecay < 0) this.runDecay = 0;
            }
        }

        // 跳跃
        if (inputData.jumpTrigger !== 'none' && this.jumpCooldown <= 0 && this.isGrounded && !this.isSliding) {
            const strength = inputData.jumpTrigger === 'long' ? this.jumpForceLarge : this.jumpForceSmall;
            const runBonus = 1.0 + this.runDecay * 0.5;
            this.velocity.y = strength * runBonus;
            this.isGrounded = false;
            this.jumpCooldown = 0.2;
            this.isCrouching = false;
            this.isSliding = false;
            this.slideTimer = 0;
        }

        // 滑铲/下蹲状态机
        this.updateSlideState(inputData.slideAction, inputData.move, dt);

        // 速度上限
        let maxSpeed = this.walkSpeed;
        if (this.isRunning) maxSpeed = this.runSpeed;
        else if (this.runDecay > 0.01) maxSpeed = this.walkSpeed + (this.runSpeed - this.walkSpeed) * this.runDecay;
        if (this.isCrouching && !this.isSliding) maxSpeed = this.crouchSpeed;
        if (this.isSliding) maxSpeed = this.slideSpeed;

        const moveInput = inputData.move;
        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
        const moveX = moveInput.x * maxSpeed;
        const moveZ = moveInput.y * maxSpeed;
        const moveDir = new THREE.Vector3(0,0,0);
        if (Math.abs(moveInput.x) > 0.1 || Math.abs(moveInput.y) > 0.1) {
            moveDir.add(forward.clone().multiplyScalar(moveZ));
            moveDir.add(right.clone().multiplyScalar(moveX));
            if (moveDir.length() > maxSpeed) moveDir.normalize().multiplyScalar(maxSpeed);
        }
        this.velocity.x = moveDir.x;
        this.velocity.z = moveDir.z;

        // 重力
        if (!this.isGrounded) {
            this.velocity.y -= this.gravity * dt;
        } else {
            if (this.velocity.y < 0) this.velocity.y = 0;
        }

        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        this.resolveCollisions(obstacles, dt);

        // 地面检测
        const playerBottom = this.position.y - this.getCollisionHeight();
        if (playerBottom <= 0.01 && this.velocity.y <= 0) {
            this.position.y = this.getCollisionHeight();
            this.velocity.y = 0;
            this.isGrounded = true;
        } else if (playerBottom > 0.02) {
            this.isGrounded = false;
        }

        const mapHalf = 90;
        this.position.x = Math.max(-mapHalf, Math.min(mapHalf, this.position.x));
        this.position.z = Math.max(-mapHalf, Math.min(mapHalf, this.position.z));
        if (this.position.y < -20) {
            this.position.set(0, 5, 5);
            this.velocity.set(0,0,0);
            this.isGrounded = false;
        }

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

    updateSlideState(action, moveInput, dt) {
        if (this.isSliding) {
            this.slideTimer -= dt;
            if (this.slideTimer <= 0) {
                this.endSlide();
                return;
            }
        }

        if (action === 'toggle' && !this.isSliding && this.slideCooldown <= 0) {
            this.isCrouching = !this.isCrouching;
            if (this.isCrouching) {
                this.isRunning = false;
                this.runDecay = 0;
            }
        } else if (action === 'start' && !this.isSliding && this.slideCooldown <= 0 && this.isGrounded) {
            // 不再检查奔跑状态，直接滑铲（调用者已确保奔跑意图）
            this.startSlide(moveInput);
        } else if (action === 'end' && this.isSliding) {
            this.endSlide();
        }
    }

    startSlide(moveInput) {
        this.isSliding = true;
        this.slideTimer = this.slideDuration;
        this.isCrouching = false;
        this.runDecay = 0;

        // 滑铲方向：优先沿当前水平速度方向（若移动中），否则沿视角方向
        let dir;
        const horVel = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
        if (horVel.length() > 0.5) {
            dir = horVel.clone().normalize();
        } else {
            dir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
        }
        dir.multiplyScalar(this.slideSpeed);
        this.velocity.x = dir.x;
        this.velocity.z = dir.z;
        this.velocity.y = -2;
    }

    endSlide() {
        this.isSliding = false;
        this.isCrouching = false;
        this.slideCooldown = this.slideRecovery;   // 0.6秒冷却
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
                    this.velocity.x *= -0.5;   // 保留更多动量
                } else if (min.axis === 'z') {
                    this.position.z += min.dir * min.value;
                    this.velocity.z *= -0.5;
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