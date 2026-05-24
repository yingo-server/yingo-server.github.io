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
        this.isSliding = false;
        this.isRunning = false;
        this.runDecay = 0;

        // 滑铲参数
        this.slideTimer = 0;
        this.slideDuration = 3.0;        // 最长3秒
        this.slideDirection = new THREE.Vector3();  // 滑铲锁定方向
        this.slideSpeed = 14;

        // 跳跃
        this.jumpCooldown = 0;

        // 移动参数
        this.walkSpeed = 8;
        this.runSpeed = 16;
        this.jumpForceSmall = 10;
        this.jumpForceLarge = 15;
        this.gravity = 28;

        // 碰撞体
        this.collisionWidth = 0.55;
        this.collisionHeight = 1.75;
        this.collisionDepth = 0.55;
        this.slideCollisionHeight = 0.6;

        // 相机
        this.cameraGroup = new THREE.Group();
        this.cameraGroup.add(this.camera);
        this.scene.add(this.cameraGroup);
        this.cameraGroup.position.copy(this.position);
        this.camera.position.set(0, 0, 0);
    }

    getCollisionHeight() {
        return this.isSliding ? this.slideCollisionHeight : this.collisionHeight;
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

        // 奔跑状态
        if (inputData.run && this.isGrounded && !this.isSliding) {
            this.isRunning = true;
            this.runDecay = 1.0;
        } else {
            this.isRunning = false;
            if (this.runDecay > 0) {
                this.runDecay -= dt / 1.5;
                if (this.runDecay < 0) this.runDecay = 0;
            }
        }

        // 跳跃处理（可打断滑铲）
        if (inputData.jumpTrigger !== 'none' && this.jumpCooldown <= 0 && this.isGrounded) {
            // 如果正在滑铲，跳跃会打断它
            if (this.isSliding) {
                this.isSliding = false;
                this.slideTimer = 0;
            }
            const strength = inputData.jumpTrigger === 'long' ? this.jumpForceLarge : this.jumpForceSmall;
            const runBonus = 1.0 + this.runDecay * 0.5;
            this.velocity.y = strength * runBonus;
            this.isGrounded = false;
            this.jumpCooldown = 0.2;
        }

        // 滑铲状态机（新逻辑）
        this.updateSlideState(inputData.slideAction, inputData.move, dt);

        // 水平移动：如果滑铲中，强制使用锁定方向
        if (this.isSliding) {
            // 锁定速度方向，不受摇杆影响
            this.velocity.x = this.slideDirection.x * this.slideSpeed;
            this.velocity.z = this.slideDirection.z * this.slideSpeed;
        } else {
            let currentMaxSpeed = this.walkSpeed;
            if (this.isRunning) currentMaxSpeed = this.runSpeed;
            else if (this.runDecay > 0.01) currentMaxSpeed = this.walkSpeed + (this.runSpeed - this.walkSpeed) * this.runDecay;

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
        }

        // 重力
        if (!this.isGrounded) {
            this.velocity.y -= this.gravity * dt;
        } else {
            if (this.velocity.y < 0) this.velocity.y = 0;
        }

        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        // 碰撞（不包含地面，地面由独立检测）
        this.resolveCollisions(obstacles, dt);

        // 地面检测
        const playerBottom = this.position.y - this.getCollisionHeight();
        if (playerBottom <= 0.01 && this.velocity.y <= 0) {
            this.position.y = this.getCollisionHeight();
            this.velocity.y = 0;
            this.isGrounded = true;
        } else if (playerBottom > 0.02) {
            this.isGrounded = false;
            // 如果滑铲期间离开地面（被撞飞或跳跃打断），自动结束滑铲
            if (this.isSliding) {
                this.isSliding = false;
                this.slideTimer = 0;
            }
        }

        // 边界
        const mapHalf = 90;
        this.position.x = Math.max(-mapHalf, Math.min(mapHalf, this.position.x));
        this.position.z = Math.max(-mapHalf, Math.min(mapHalf, this.position.z));
        if (this.position.y < -20) {
            this.position.set(0, 5, 5);
            this.velocity.set(0,0,0);
            this.isGrounded = false;
            this.isSliding = false;
            this.slideTimer = 0;
        }

        // 相机高度
        let camHeight = 0.9;
        if (this.isSliding) camHeight = 0.3;
        this.cameraGroup.position.set(this.position.x, this.position.y + camHeight, this.position.z);
        this.cameraGroup.rotation.order = 'YXZ';
        this.cameraGroup.rotation.y = this.yaw;
        this.cameraGroup.rotation.x = this.pitch;

        return {
            isGrounded: this.isGrounded,
            isRunning: this.isRunning || this.runDecay > 0.1,
            isSliding: this.isSliding,
            speed: this.velocity.length(),
        };
    }

    updateSlideState(action, moveInput, dt) {
        // 滑铲计时
        if (this.isSliding) {
            this.slideTimer -= dt;
            if (this.slideTimer <= 0) {
                this.isSliding = false;   // 时间到，自动站立
                return;
            }
        }

        // 只有在非滑铲状态下才处理外部动作
        if (!this.isSliding) {
            if (action === 'start' && this.isGrounded) {
                // 获取滑铲方向：基于当前水平速度（若移动）或朝向
                const horVel = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
                if (horVel.length() > 0.5) {
                    this.slideDirection.copy(horVel.normalize());
                } else {
                    this.slideDirection.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
                }
                this.isSliding = true;
                this.slideTimer = this.slideDuration;
                this.runDecay = 0;      // 滑铲打断奔跑衰减
            }
            // 'end' 动作忽略（松开按钮不影响滑铲）
        }
        // 如果滑铲中收到 'start'，忽略（因为已经有滑铲进行中）
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
                    // 滑铲时碰撞反弹减少动量，但仍保持方向（方向被锁定）
                    this.velocity.x *= -0.5;
                } else if (min.axis === 'z') {
                    this.position.z += min.dir * min.value;
                    this.velocity.z *= -0.5;
                }
                // 注意：滑铲方向锁定会在下一帧重新覆盖速度，所以反弹效果仅一帧，但足以产生推开效果
            }
        }
    }

    rotateView(deltaYaw, deltaPitch) {
        this.yaw += deltaYaw;
        this.pitch += deltaPitch;
        this.pitch = Math.max(-1.2, Math.min(0.6, this.pitch));
    }
}