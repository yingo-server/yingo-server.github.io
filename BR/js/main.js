// 关卡1：最简单的跳跃训练（支持动态移动平台，玩家可被携带）
(function () {
    const rotateHint = document.getElementById('rotate-hint');
    const logoOverlay = document.getElementById('logo-overlay');
    let game = null;

    function isLandscape() {
        return window.innerWidth > window.innerHeight;
    }

    function checkOrientation() {
        if (isLandscape()) {
            if (!game && logoOverlay.classList.contains('hidden')) {
                rotateHint.classList.add('hidden');
                logoOverlay.classList.remove('hidden');
                setTimeout(() => {
                    if (!game && isLandscape()) startGame();
                }, 2500);
            }
        } else {
            if (!game) {
                rotateHint.classList.remove('hidden');
                logoOverlay.classList.add('hidden');
            }
        }
    }

    function startGame() {
        game = new Game(document.getElementById('game-canvas'));
        logoOverlay.classList.add('hidden');
        window.addEventListener('resize', () => game.onResize());
    }

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation();

    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    // ---------- 玩家 ----------
    class Player {
        constructor(camera, scene, startPos) {
            this.camera = camera;
            this.scene = scene;
            this.position = startPos.clone();
            this.velocity = new THREE.Vector3();
            this.yaw = 0;
            this.pitch = 0;
            this.isGrounded = false;
            this.gravity = 22;
            this.jumpForce = 14;
            this.speed = 9;
            this.height = 1.6;
            this.radius = 0.4;
            this.startPosition = startPos.clone();

            // 平台携带相关
            this.lastGroundMesh = null;
            this.lastGroundPos = new THREE.Vector3();

            this.camera.position.copy(this.position);
            this.camera.rotation.order = 'YXZ';
        }

        update(dt, input, worldMeshes) {
            // 水平移动（基于当前视角）
            const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
            const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
            const moveDir = new THREE.Vector3(0,0,0);
            moveDir.add(forward.clone().multiplyScalar(input.move.y * this.speed));
            moveDir.add(right.clone().multiplyScalar(input.move.x * this.speed));
            if (moveDir.length() > this.speed) moveDir.normalize().multiplyScalar(this.speed);

            // 平台携带：如果上一帧站在某个动态平台上，且当前仍然接地于同一物体，则跟随其移动
            if (this.isGrounded && this.lastGroundMesh) {
                const currentGroundPos = new THREE.Vector3();
                this.lastGroundMesh.getWorldPosition(currentGroundPos);
                const delta = currentGroundPos.clone().sub(this.lastGroundPos);
                this.position.add(delta);
                this.lastGroundPos.copy(currentGroundPos);
            }

            // 跳跃
            if (input.jump && this.isGrounded) {
                this.velocity.y = this.jumpForce;
                this.isGrounded = false;
                this.lastGroundMesh = null; // 跳起后不再跟随平台
            }

            // 重力
            if (!this.isGrounded) this.velocity.y -= this.gravity * dt;

            // 应用水平移动和垂直速度
            this.position.x += moveDir.x * dt;
            this.position.z += moveDir.z * dt;
            this.position.y += this.velocity.y * dt;

            // 接地检测
            this.isGrounded = false;
            const rayOrigin = this.position.clone();
            rayOrigin.y += 0.1;
            const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, this.height + 0.3);
            const intersects = raycaster.intersectObjects(worldMeshes, false);
            if (intersects.length > 0) {
                const groundY = intersects[0].point.y;
                if (this.position.y - this.height <= groundY + 0.05) {
                    this.position.y = groundY + this.height;
                    this.velocity.y = 0;
                    this.isGrounded = true;

                    // 记录脚下的物体，用于下一帧携带
                    const groundMesh = intersects[0].object;
                    if (groundMesh !== this.lastGroundMesh) {
                        this.lastGroundMesh = groundMesh;
                        groundMesh.getWorldPosition(this.lastGroundPos);
                    }
                }
            }

            // 掉落重置
            if (this.position.y < -5) {
                this.position.copy(this.startPosition);
                this.velocity.set(0,0,0);
                this.lastGroundMesh = null;
            }

            // 碰撞推开（仅非地面物体）
            const playerBox = {
                minX: this.position.x - this.radius,
                maxX: this.position.x + this.radius,
                minY: this.position.y - this.height,
                maxY: this.position.y,
                minZ: this.position.z - this.radius,
                maxZ: this.position.z + this.radius,
            };
            for (const mesh of worldMeshes) {
                if (mesh.userData.isGround) continue;
                const box = new THREE.Box3().setFromObject(mesh);
                const obs = {
                    minX: box.min.x, maxX: box.max.x,
                    minY: box.min.y, maxY: box.max.y,
                    minZ: box.min.z, maxZ: box.max.z,
                };
                const overlapX = Math.min(playerBox.maxX, obs.maxX) - Math.max(playerBox.minX, obs.minX);
                const overlapY = Math.min(playerBox.maxY, obs.maxY) - Math.max(playerBox.minY, obs.minY);
                const overlapZ = Math.min(playerBox.maxZ, obs.maxZ) - Math.max(playerBox.minZ, obs.minZ);
                if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
                    if (overlapX < overlapY && overlapX < overlapZ) {
                        const dir = this.position.x > (obs.minX + obs.maxX) / 2 ? 1 : -1;
                        this.position.x += dir * overlapX;
                    } else if (overlapY < overlapX && overlapY < overlapZ) {
                        const dir = this.position.y > (obs.minY + obs.maxY) / 2 ? 1 : -1;
                        this.position.y += dir * overlapY;
                    } else {
                        const dir = this.position.z > (obs.minZ + obs.maxZ) / 2 ? 1 : -1;
                        this.position.z += dir * overlapZ;
                    }
                }
            }

            // 更新相机
            this.camera.position.copy(this.position);
            this.camera.rotation.y = this.yaw;
            this.camera.rotation.x = this.pitch;
        }

        rotate(dx, dy) {
            this.yaw -= dx * 0.005;
            this.pitch -= dy * 0.005;
            this.pitch = Math.max(-1.2, Math.min(0.6, this.pitch));
        }
    }

    // ---------- 游戏主类 ----------
    class Game {
        constructor(canvas) {
            this.canvas = canvas;
            this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color('#d4b896');
            this.scene.fog = new THREE.FogExp2('#d4b896', 0.00025);

            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
            this.clock = new THREE.Clock();

            const ambient = new THREE.AmbientLight('#ffe8cc', 2);
            this.scene.add(ambient);
            const dirLight = new THREE.DirectionalLight('#fff5e8', 4);
            dirLight.position.set(50, 40, 30);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 1024;
            dirLight.shadow.mapSize.height = 1024;
            this.scene.add(dirLight);

            this.worldMeshes = [];
            this.dynamicObjects = [];   // 动态移动的物体
            this.player = null;
            this.input = { move: { x: 0, y: 0 }, jump: false };
            this.moveTouchId = null;
            this.viewTouchId = null;
            this.moveStart = null;
            this.viewStart = null;
            this.jumpCooldown = false;
            this.startPosition = new THREE.Vector3(0, 1.6, 15);

            this.loadWorld().then(() => {
                this.player = new Player(this.camera, this.scene, this.startPosition);
                this.setupInput();
                this.animate();
            }).catch(err => console.error('世界加载失败', err));
        }

        async loadWorld() {
            const resp = await fetch('map/level1.json');
            const data = await resp.json();

            if (data.startPosition) {
                this.startPosition.set(data.startPosition.x, data.startPosition.y, data.startPosition.z);
            }

            (data.platforms || []).forEach(p => {
                const w = p.width || 10, d = p.depth || 20, h = p.height || 0.5;
                const color = p.color || '#c2956b';
                const geo = new THREE.BoxGeometry(w, h, d);
                const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
                const mesh = new THREE.Mesh(geo, mat);
                const initX = Array.isArray(p.x) ? (p.x[0] + p.x[1]) / 2 : (p.x || 0);
                const initY = Array.isArray(p.y) ? (p.y[0] + p.y[1]) / 2 : (p.y || 0);
                const initZ = Array.isArray(p.z) ? (p.z[0] + p.z[1]) / 2 : (p.z || 0);
                mesh.position.set(initX, initY, initZ);
                mesh.receiveShadow = true;
                mesh.userData.isGround = true;
                this.scene.add(mesh);
                this.worldMeshes.push(mesh);

                // 边缘线
                const edgeGeo = new THREE.EdgesGeometry(geo);
                const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x0078d4 }));
                edgeLine.position.copy(mesh.position);
                this.scene.add(edgeLine);

                // 检测动态属性
                const dynamicAxes = [];
                if (Array.isArray(p.x)) dynamicAxes.push({ axis: 'x', range: p.x, speed: p.speed || 0.5 });
                if (Array.isArray(p.y)) dynamicAxes.push({ axis: 'y', range: p.y, speed: p.speed || 0.5 });
                if (Array.isArray(p.z)) dynamicAxes.push({ axis: 'z', range: p.z, speed: p.speed || 0.5 });
                if (dynamicAxes.length > 0) {
                    this.dynamicObjects.push({
                        mesh: mesh,
                        edgeLine: edgeLine,
                        axes: dynamicAxes,
                        startTime: performance.now() / 1000
                    });
                }
            });

            (data.decorations || []).forEach(dec => {
                if (dec.type === 'arrow') {
                    const shape = new THREE.Shape();
                    shape.moveTo(0, 0.5);
                    shape.lineTo(-1, -1);
                    shape.lineTo(0, -0.5);
                    shape.lineTo(1, -1);
                    shape.closePath();
                    const geo = new THREE.ShapeGeometry(shape);
                    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
                    const arrow = new THREE.Mesh(geo, mat);
                    arrow.position.set(dec.x, dec.y, dec.z);
                    arrow.rotation.x = -Math.PI / 2;
                    const s = dec.scale || 1;
                    arrow.scale.set(s, s, s);
                    this.scene.add(arrow);
                }
            });
        }

        setupInput() {
            const container = document.getElementById('game-container');
            const midX = () => window.innerWidth / 2;

            container.addEventListener('touchstart', (e) => {
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (touch.clientX < midX()) {
                        if (this.moveTouchId !== null) continue;
                        this.moveTouchId = touch.identifier;
                        this.moveStart = { x: touch.clientX, y: touch.clientY };
                    } else {
                        if (this.viewTouchId !== null) continue;
                        this.viewTouchId = touch.identifier;
                        this.viewStart = { x: touch.clientX, y: touch.clientY };
                        this._pendingJump = true;
                    }
                }
            }, { passive: false });

            container.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (touch.identifier === this.moveTouchId) {
                        const dx = touch.clientX - this.moveStart.x;
                        const dy = touch.clientY - this.moveStart.y;
                        const maxDist = 80;
                        this.input.move = {
                            x: Math.max(-1, Math.min(1, dx / maxDist)),
                            y: Math.max(-1, Math.min(1, -dy / maxDist))
                        };
                    } else if (touch.identifier === this.viewTouchId) {
                        const dx = touch.clientX - this.viewStart.x;
                        const dy = touch.clientY - this.viewStart.y;
                        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this._pendingJump = false;
                        if (this.player) this.player.rotate(dx, dy);
                        this.viewStart = { x: touch.clientX, y: touch.clientY };
                    }
                }
            }, { passive: false });

            container.addEventListener('touchend', (e) => {
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (touch.identifier === this.moveTouchId) {
                        this.moveTouchId = null;
                        this.input.move = { x: 0, y: 0 };
                    } else if (touch.identifier === this.viewTouchId) {
                        if (this._pendingJump && !this.jumpCooldown) {
                            this.input.jump = true;
                            this.jumpCooldown = true;
                            setTimeout(() => { this.jumpCooldown = false; }, 200);
                        }
                        this.viewTouchId = null;
                        this._pendingJump = false;
                    }
                }
            });

            const keys = {};
            window.addEventListener('keydown', (e) => {
                keys[e.key.toLowerCase()] = true;
                const x = (keys['a'] || keys['arrowleft'] ? -1 : 0) + (keys['d'] || keys['arrowright'] ? 1 : 0);
                const y = (keys['w'] || keys['arrowup'] ? 1 : 0) + (keys['s'] || keys['arrowdown'] ? -1 : 0);
                this.input.move = { x, y };
                if (e.key === ' ') { e.preventDefault(); this.input.jump = true; }
            });
            window.addEventListener('keyup', (e) => {
                keys[e.key.toLowerCase()] = false;
                const x = (keys['a'] || keys['arrowleft'] ? -1 : 0) + (keys['d'] || keys['arrowright'] ? 1 : 0);
                const y = (keys['w'] || keys['arrowup'] ? 1 : 0) + (keys['s'] || keys['arrowdown'] ? -1 : 0);
                this.input.move = { x, y };
                if (e.key === ' ') this.input.jump = false;
            });

            let mouseDown = false;
            container.addEventListener('mousedown', (e) => {
                mouseDown = true;
                this.viewStart = { x: e.clientX, y: e.clientY };
            });
            window.addEventListener('mousemove', (e) => {
                if (!mouseDown || !this.player) return;
                const dx = e.clientX - this.viewStart.x;
                const dy = e.clientY - this.viewStart.y;
                this.player.rotate(dx, dy);
                this.viewStart = { x: e.clientX, y: e.clientY };
            });
            window.addEventListener('mouseup', () => { mouseDown = false; });
        }

        updateDynamicObjects(now) {
            for (const dyn of this.dynamicObjects) {
                const elapsed = now - dyn.startTime;
                for (const axisData of dyn.axes) {
                    const range = axisData.range;
                    const speed = axisData.speed;
                    const t = Math.sin(elapsed * speed * 2 * Math.PI) * 0.5 + 0.5;
                    const value = range[0] + (range[1] - range[0]) * t;
                    if (axisData.axis === 'x') dyn.mesh.position.x = value;
                    else if (axisData.axis === 'y') dyn.mesh.position.y = value;
                    else if (axisData.axis === 'z') dyn.mesh.position.z = value;
                }
                // 同步边缘线
                if (dyn.edgeLine) {
                    dyn.edgeLine.position.copy(dyn.mesh.position);
                }
            }
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            const dt = Math.min(this.clock.getDelta(), 0.1);
            const now = performance.now() / 1000;

            // 1. 更新动态物体位置（在玩家更新之前，确保平台位置是最新的）
            this.updateDynamicObjects(now);

            // 2. 玩家更新
            if (this.player) {
                this.player.update(dt, this.input, this.worldMeshes);
                this.input.jump = false;
            }
            this.renderer.render(this.scene, this.camera);
        }

        onResize() {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }
    }
})();