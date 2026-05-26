// main.js - 夜晚沙漠跑酷，2D月球 Sprite 始终面向玩家，光晕在月球后方，攀爬系统，旗帜飘动
(function () {
    const logoOverlay = document.getElementById('logo-overlay');
    const countdownEl = document.getElementById('countdown');
    const transitionOverlay = document.getElementById('transition-overlay');
    let game = null;

    // 动态对角线
    function updateDiagonalDivider() {
        const divider = document.getElementById('divider');
        if (!divider) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const diagonalLen = Math.sqrt(w * w + h * h);
        const angle = Math.atan2(h, w) * 180 / Math.PI;
        divider.style.width = diagonalLen + 'px';
        divider.style.transform = `rotate(${angle}deg)`;
    }
    window.addEventListener('resize', updateDiagonalDivider);
    window.addEventListener('orientationchange', () => setTimeout(updateDiagonalDivider, 30));
    updateDiagonalDivider();

    // 预加载月球 PNG 纹理
    let cachedMoonTexture = null;
    function preloadMoonTexture(callback) {
        if (cachedMoonTexture) { callback(cachedMoonTexture); return; }
        const loader = new THREE.TextureLoader();
        loader.load('./img/moon.png', (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            cachedMoonTexture = tex;
            callback(tex);
        });
    }

    // 玩家类（含攀爬系统）
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
            this.lastGroundMesh = null;
            this.lastGroundPos = new THREE.Vector3();
            this.currentGroundMesh = null;
            this.camera.position.copy(this.position);
            this.camera.rotation.order = 'YXZ';

            // 离地计时（用于攀爬前置条件）
            this.lastAirborneTime = 0;
            // 攀爬状态
            this.isClimbing = false;
            this.climbData = null;
            this.postClimbTimer = 0;
        }

        update(dt, input, worldMeshes, wallMeshes) {
            const now = performance.now() / 1000;

            if (!this.isGrounded) {
                this.lastAirborneTime = now;
            }

            if (this.isClimbing) {
                this.updateClimbing(dt, now);
                return;
            }

            if (this.postClimbTimer > 0) {
                this.postClimbTimer -= dt;
                const shakeAmt = Math.max(0, this.postClimbTimer) * 0.05;
                this.camera.rotation.y = this.yaw + Math.sin(now * 30) * shakeAmt;
                this.camera.rotation.x = this.pitch + Math.cos(now * 25) * shakeAmt * 0.5;
                if (this.postClimbTimer <= 0) {
                    this.camera.rotation.y = this.yaw;
                    this.camera.rotation.x = this.pitch;
                }
                return;
            }

            // 常规移动
            const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
            const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
            const moveDir = new THREE.Vector3(0,0,0);
            moveDir.add(forward.clone().multiplyScalar(input.move.y * this.speed));
            moveDir.add(right.clone().multiplyScalar(input.move.x * this.speed));
            if (moveDir.length() > this.speed) moveDir.normalize().multiplyScalar(this.speed);

            if (this.isGrounded && this.lastGroundMesh) {
                const currentGroundPos = new THREE.Vector3();
                this.lastGroundMesh.getWorldPosition(currentGroundPos);
                const delta = currentGroundPos.clone().sub(this.lastGroundPos);
                this.position.add(delta);
                this.lastGroundPos.copy(currentGroundPos);
            }

            if (input.jump && this.isGrounded) {
                this.velocity.y = this.jumpForce;
                this.isGrounded = false;
                this.lastGroundMesh = null;
                this.currentGroundMesh = null;
            }

            if (!this.isGrounded) this.velocity.y -= this.gravity * dt;

            this.position.x += moveDir.x * dt;
            this.position.z += moveDir.z * dt;
            this.position.y += this.velocity.y * dt;

            this.isGrounded = false;
            this.currentGroundMesh = null;
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
                    const groundMesh = intersects[0].object;
                    if (groundMesh !== this.lastGroundMesh) {
                        this.lastGroundMesh = groundMesh;
                        groundMesh.getWorldPosition(this.lastGroundPos);
                    }
                    this.currentGroundMesh = groundMesh;
                }
            }

            if (this.position.y < -5) {
                this.position.copy(this.startPosition);
                this.velocity.set(0,0,0);
                this.lastGroundMesh = null;
                this.currentGroundMesh = null;
            }

            // 墙壁碰撞与攀爬判定
            const playerBox = {
                minX: this.position.x - this.radius,
                maxX: this.position.x + this.radius,
                minY: this.position.y - this.height,
                maxY: this.position.y,
                minZ: this.position.z - this.radius,
                maxZ: this.position.z + this.radius,
            };

            let bestClimbCandidate = null;
            let bestClimbDot = -1;

            // 先遍历墙壁检查攀爬
            for (const mesh of wallMeshes) {
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
                    let normal = new THREE.Vector3();
                    if (overlapX <= overlapY && overlapX <= overlapZ) {
                        normal.x = this.position.x > (obs.minX + obs.maxX) / 2 ? 1 : -1;
                    } else if (overlapY <= overlapX && overlapY <= overlapZ) {
                        normal.y = this.position.y > (obs.minY + obs.maxY) / 2 ? 1 : -1;
                    } else {
                        normal.z = this.position.z > (obs.minZ + obs.maxZ) / 2 ? 1 : -1;
                    }

                    const wallNormal = new THREE.Vector3(normal.x, 0, normal.z).normalize();
                    const camForward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
                    const dot = camForward.dot(wallNormal.clone().multiplyScalar(-1));
                    if (wallNormal.length() > 0.1 && dot > Math.cos(15 * Math.PI / 180)) {
                        if (now - this.lastAirborneTime < 1.0) {
                            if (dot > bestClimbDot) {
                                bestClimbDot = dot;
                                bestClimbCandidate = { mesh, normal: wallNormal.clone(), box };
                            }
                        }
                    }
                }
            }

            if (bestClimbCandidate) {
                this.startClimbing(bestClimbCandidate);
                return;
            }

            // 推开墙壁（非攀爬情况）
            for (const mesh of wallMeshes) {
                const box = new THREE.Box3().setFromObject(mesh);
                const obs = { minX: box.min.x, maxX: box.max.x, minY: box.min.y, maxY: box.max.y, minZ: box.min.z, maxZ: box.max.z };
                const overlapX = Math.min(playerBox.maxX, obs.maxX) - Math.max(playerBox.minX, obs.minX);
                const overlapY = Math.min(playerBox.maxY, obs.maxY) - Math.max(playerBox.minY, obs.minY);
                const overlapZ = Math.min(playerBox.maxZ, obs.maxZ) - Math.max(playerBox.minZ, obs.minZ);
                if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
                    if (overlapX <= overlapY && overlapX <= overlapZ) {
                        const dir = this.position.x > (obs.minX + obs.maxX) / 2 ? 1 : -1;
                        this.position.x += dir * overlapX;
                    } else if (overlapY <= overlapX && overlapY <= overlapZ) {
                        const dir = this.position.y > (obs.minY + obs.maxY) / 2 ? 1 : -1;
                        this.position.y += dir * overlapY;
                    } else {
                        const dir = this.position.z > (obs.minZ + obs.maxZ) / 2 ? 1 : -1;
                        this.position.z += dir * overlapZ;
                    }
                }
            }

            this.camera.position.copy(this.position);
            this.camera.rotation.y = this.yaw;
            this.camera.rotation.x = this.pitch;
        }

        rotate(dx, dy) {
            if (this.isClimbing || this.postClimbTimer > 0) return;
            this.yaw -= dx * 0.005;
            this.pitch -= dy * 0.005;
            this.pitch = Math.max(-1.0, Math.min(0.5, this.pitch));
        }

        startClimbing(candidate) {
            const box = candidate.box;
            const normal = candidate.normal;
            const targetY = box.max.y + this.height;
            const climbSpeed = 5.0;
            const heightDiff = targetY - this.position.y;
            const duration = Math.max(0.2, heightDiff / climbSpeed);
            const wallOffset = 0.6;
            const targetXZ = new THREE.Vector2(
                (box.min.x + box.max.x) / 2 + normal.x * (box.max.x - box.min.x) / 2 + normal.x * wallOffset,
                (box.min.z + box.max.z) / 2 + normal.z * (box.max.z - box.min.z) / 2 + normal.z * wallOffset
            );
            this.climbData = {
                normal,
                startPos: this.position.clone(),
                targetPos: new THREE.Vector3(targetXZ.x, targetY, targetXZ.y),
                startTime: performance.now() / 1000,
                duration,
                startYaw: this.yaw,
            };
            this.isClimbing = true;
            this.velocity.set(0, 0, 0);
            this.isGrounded = false;
        }

        updateClimbing(dt, now) {
            const data = this.climbData;
            const elapsed = now - data.startTime;
            const progress = Math.min(elapsed / data.duration, 1.0);
            this.position.lerpVectors(data.startPos, data.targetPos, progress);

            const swingFreq = 2.5;
            const maxSwingAmp = 0.15;
            const amp = Math.sin(progress * Math.PI) * maxSwingAmp;
            const swingAngle = Math.sin(progress * Math.PI * 2 * swingFreq) * amp;
            const pitchAmp = 0.05;
            const pitchSwing = Math.cos(progress * Math.PI * 2 * (swingFreq + 0.3)) * Math.sin(progress * Math.PI) * pitchAmp;

            this.camera.position.copy(this.position);
            this.camera.rotation.y = data.startYaw + swingAngle;
            this.camera.rotation.x = this.pitch + pitchSwing;

            if (progress >= 1.0) {
                this.finishClimbing();
            }
        }

        finishClimbing() {
            this.position.copy(this.climbData.targetPos);
            this.isClimbing = false;
            this.climbData = null;
            this.isGrounded = true;
            this.velocity.set(0, 0, 0);
            this.postClimbTimer = 0.3;
            this.camera.position.copy(this.position);
            this.camera.rotation.y = this.yaw;
            this.camera.rotation.x = this.pitch;
        }
    }

    // 游戏主类
    class Game {
        constructor(canvas) {
            this.canvas = canvas;
            this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.toneMapping = THREE.ReinhardToneMapping;
            this.renderer.toneMappingExposure = 2.0;

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color('#0a1030');
            this.scene.fog = new THREE.FogExp2('#0a1030', 0.003);

            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
            this.clock = new THREE.Clock();

            this.ambient = new THREE.AmbientLight('#404060', 0.6);
            this.scene.add(this.ambient);

            this.sunLight = new THREE.DirectionalLight('#c0d0ff', 2.0);
            this.sunLight.castShadow = true;
            this.sunLight.shadow.mapSize.width = 2048;
            this.sunLight.shadow.mapSize.height = 2048;
            this.sunLight.shadow.camera.near = 0.5;
            this.sunLight.shadow.camera.far = 300;
            this.sunLight.shadow.camera.left = -80;
            this.sunLight.shadow.camera.right = 80;
            this.sunLight.shadow.camera.top = 80;
            this.sunLight.shadow.camera.bottom = -80;
            this.sunLight.shadow.bias = -0.0001;
            this.sunLight.target = new THREE.Object3D();
            this.scene.add(this.sunLight.target);
            this.scene.add(this.sunLight);

            // 月球设置
            const radius = 225;
            const glowOffset = 30;
            this.glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.createGlowTexture(), blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, opacity: 0.9 }));
            this.glowSprite.scale.set(140, 140, 1);
            this.glowSprite.renderOrder = 0;
            this.scene.add(this.glowSprite);

            this.moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, transparent: true, color: 0xffffff, depthTest: true, depthWrite: false }));
            this.moonSprite.scale.set(27.5, 27.5, 1);
            this.moonSprite.renderOrder = 1;
            this.scene.add(this.moonSprite);

            this.moonBrightLayer = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.6, depthTest: true, depthWrite: false }));
            this.moonBrightLayer.scale.set(29, 29, 1);
            this.moonBrightLayer.renderOrder = 0;
            this.scene.add(this.moonBrightLayer);

            if (cachedMoonTexture) {
                this.applyMoonTexture(cachedMoonTexture);
            } else {
                preloadMoonTexture((tex) => this.applyMoonTexture(tex));
            }

            // 星星
            const starsGeo = new THREE.BufferGeometry();
            const starsCount = 3000;
            const starsPositions = new Float32Array(starsCount * 3);
            for (let i = 0; i < starsCount * 3; i += 3) {
                starsPositions[i] = (Math.random() - 0.5) * 1000;
                starsPositions[i+1] = Math.random() * 300 + 10;
                starsPositions[i+2] = (Math.random() - 0.5) * 800 - 200;
            }
            starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
            const starsMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.3, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
            this.stars = new THREE.Points(starsGeo, starsMat);
            this.scene.add(this.stars);

            this.worldMeshes = [];
            this.wallMeshes = [];
            this.dynamicObjects = [];
            this.player = null;
            this.input = { move: { x: 0, y: 0 }, jump: false };
            this.moveTouchId = null;
            this.viewTouchId = null;
            this.moveStart = null;
            this.viewStart = null;
            this.keyJumpConsumed = false;
            this.lastRotation = { x: 0, y: 0 };
            this.pendingJump = false;
            this.touchStartTime = 0;
            this.touchStartPos = { x: 0, y: 0 };
            this.goalPlatformMesh = null;
            this.goalTimer = 0;
            this.goalRequiredTime = 5;
            this.goalReached = false;
            this.currentLevel = 1;
            this.transitioning = false;

            const elevation = 35 * Math.PI / 180;
            const azimuth = Math.random() * Math.PI * 2;
            const x = Math.cos(elevation) * Math.cos(azimuth);
            const y = Math.sin(elevation);
            const z = Math.cos(elevation) * Math.sin(azimuth);
            this.moonDirection = new THREE.Vector3(x, y, z).normalize();
            this.moonRadius = radius;
            this.glowOffset = glowOffset;

            this.loadLevel(this.currentLevel);
        }

        applyMoonTexture(texture) {
            this.moonSprite.material.map = texture;
            this.moonSprite.material.needsUpdate = true;
            this.moonBrightLayer.material.map = texture;
            this.moonBrightLayer.material.needsUpdate = true;
        }

        createGlowTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
            gradient.addColorStop(0, 'rgba(255, 240, 210, 1)');
            gradient.addColorStop(0.1, 'rgba(210, 230, 255, 0.95)');
            gradient.addColorStop(0.25, 'rgba(160, 190, 240, 0.7)');
            gradient.addColorStop(0.5, 'rgba(100, 140, 200, 0.4)');
            gradient.addColorStop(0.8, 'rgba(70, 100, 160, 0.15)');
            gradient.addColorStop(1, 'rgba(50, 70, 130, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 512, 512);
            return new THREE.CanvasTexture(canvas);
        }

        updateSkyAndLighting(playerPos) {
            const moonPos = this.moonDirection.clone().multiplyScalar(this.moonRadius);
            const glowPos = this.moonDirection.clone().multiplyScalar(this.moonRadius + this.glowOffset);
            this.sunLight.position.copy(moonPos);
            this.sunLight.target.position.set(0, 0, 0);
            this.moonSprite.position.copy(moonPos);
            this.moonBrightLayer.position.copy(moonPos);
            this.glowSprite.position.copy(glowPos);
            this.stars.position.copy(playerPos);
        }

        async loadLevel(levelNum) {
            this.worldMeshes.length = 0;
            this.wallMeshes.length = 0;
            this.dynamicObjects.length = 0;
            this.goalPlatformMesh = null;
            this.goalTimer = 0;
            this.goalReached = false;
            countdownEl.style.display = 'none';

            const keep = [this.ambient, this.sunLight, this.moonSprite, this.moonBrightLayer, this.glowSprite, this.stars, this.sunLight.target];
            const toRemove = [];
            this.scene.children.forEach(child => { if (!keep.includes(child)) toRemove.push(child); });
            toRemove.forEach(child => this.scene.remove(child));

            try {
                const resp = await fetch(`map/level${levelNum}.json`);
                const data = await resp.json();
                this.buildLevel(data);
                this.player = new Player(this.camera, this.scene,
                    new THREE.Vector3(data.startPosition.x, data.startPosition.y, data.startPosition.z));
                if (!this._inputSetup) {
                    this.setupInput();
                    this._inputSetup = true;
                }
                if (!this._animating) {
                    this.animate();
                    this._animating = true;
                }
            } catch (err) {
                console.error('关卡加载失败', err);
            }
        }

        buildLevel(data) {
            const platformColor = '#202020';
            // 平台
            (data.platforms || []).forEach(p => {
                const w = p.width || 10, d = p.depth || 20, h = p.height || 0.5;
                const geo = new THREE.BoxGeometry(w, h, d);
                const mat = new THREE.MeshStandardMaterial({ color: platformColor, roughness: 0.5, metalness: 0.1 });
                const mesh = new THREE.Mesh(geo, mat);
                const initX = Array.isArray(p.x) ? (p.x[0] + p.x[1]) / 2 : (p.x || 0);
                const initY = Array.isArray(p.y) ? (p.y[0] + p.y[1]) / 2 : (p.y || 0);
                const initZ = Array.isArray(p.z) ? (p.z[0] + p.z[1]) / 2 : (p.z || 0);
                mesh.position.set(initX, initY, initZ);
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                mesh.userData.isGround = true;
                mesh.userData.isGoal = p.isGoal || false;
                if (p.isGoal) this.goalPlatformMesh = mesh;
                this.scene.add(mesh);
                this.worldMeshes.push(mesh);

                const edgeGeo = new THREE.EdgesGeometry(geo);
                const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x88aaff }));
                edgeLine.position.copy(mesh.position);
                this.scene.add(edgeLine);

                const dynamicAxes = [];
                if (Array.isArray(p.x)) dynamicAxes.push({ axis: 'x', range: p.x, speed: p.speed || 0.5 });
                if (Array.isArray(p.y)) dynamicAxes.push({ axis: 'y', range: p.y, speed: p.speed || 0.5 });
                if (Array.isArray(p.z)) dynamicAxes.push({ axis: 'z', range: p.z, speed: p.speed || 0.5 });
                if (dynamicAxes.length > 0) {
                    this.dynamicObjects.push({ mesh, edgeLine, axes: dynamicAxes, startTime: performance.now() / 1000, type: 'platform' });
                }
            });

            // 墙壁（可攀爬）
            (data.walls || []).forEach(w => {
                const width = w.width || 10, height = w.height || 3, depth = w.depth || 0.5;
                const geo = new THREE.BoxGeometry(width, height, depth);
                const mat = new THREE.MeshStandardMaterial({ color: '#505050', roughness: 0.7, metalness: 0.2 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(w.x, w.y + height/2, w.z);
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                mesh.userData.isGround = false; // 不作为地面
                this.scene.add(mesh);
                this.wallMeshes.push(mesh);

                const edgeGeo = new THREE.EdgesGeometry(geo);
                const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x888888 }));
                edgeLine.position.copy(mesh.position);
                this.scene.add(edgeLine);
            });

            // 装饰物
            (data.decorations || []).forEach(dec => {
                if (dec.type === 'arrow') {
                    const shape = new THREE.Shape();
                    shape.moveTo(0, 0.5);
                    shape.lineTo(-1, -1);
                    shape.lineTo(0, -0.5);
                    shape.lineTo(1, -1);
                    shape.closePath();
                    const geo = new THREE.ShapeGeometry(shape);
                    const mat = new THREE.MeshStandardMaterial({ color: 0xaaccff, roughness: 0.5 });
                    const arrow = new THREE.Mesh(geo, mat);
                    arrow.position.set(dec.x, dec.y, dec.z);
                    arrow.rotation.x = -Math.PI / 2;
                    const s = dec.scale || 1;
                    arrow.scale.set(s, s, s);
                    this.scene.add(arrow);
                } else if (dec.type === 'flag') {
                    // 旗杆
                    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
                    const poleMat = new THREE.MeshStandardMaterial({ color: '#bbbbbb', roughness: 0.4, metalness: 0.6 });
                    const pole = new THREE.Mesh(poleGeo, poleMat);
                    pole.position.set(dec.x, dec.y - 0.5, dec.z);
                    pole.castShadow = true;
                    pole.receiveShadow = true;
                    this.scene.add(pole);

                    // 旗面
                    const flagGeo = new THREE.PlaneGeometry(1.5, 1);
                    const flagMat = new THREE.MeshStandardMaterial({ color: dec.color || '#ff4444', side: THREE.DoubleSide, roughness: 0.8 });
                    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
                    flagMesh.position.set(dec.x + 0.7, dec.y + 0.8, dec.z);
                    flagMesh.castShadow = true;
                    flagMesh.receiveShadow = true;
                    this.scene.add(flagMesh);

                    // 注册为动态对象，用于飘动
                    this.dynamicObjects.push({
                        type: 'flag',
                        mesh: flagMesh,
                        pivot: new THREE.Vector3(dec.x, dec.y, dec.z),
                        startTime: performance.now() / 1000,
                        speed: 2.0,
                        amplitude: 0.2
                    });
                }
            });
        }

        setupInput() {
            const container = document.getElementById('game-container');
            const midX = () => window.innerWidth / 2;
            container.addEventListener('touchstart', (e) => {
                if (this.transitioning) return;
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (touch.clientX < midX()) {
                        if (this.moveTouchId !== null) continue;
                        this.moveTouchId = touch.identifier;
                        this.moveStart = { x: touch.clientX, y: touch.clientY };
                    } else {
                        if (this.viewTouchId !== null) continue;
                        this.viewTouchId = touch.identifier;
                        this.touchStartTime = performance.now();
                        this.touchStartPos = { x: touch.clientX, y: touch.clientY };
                        this.pendingJump = true;
                        this.lastRotation = { x: touch.clientX, y: touch.clientY };
                    }
                }
            }, { passive: false });
            container.addEventListener('touchmove', (e) => {
                if (this.transitioning) return;
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (touch.identifier === this.moveTouchId) {
                        const dx = touch.clientX - this.moveStart.x;
                        const dy = touch.clientY - this.moveStart.y;
                        const maxDist = 80;
                        this.input.move = { x: Math.max(-1, Math.min(1, dx / maxDist)), y: Math.max(-1, Math.min(1, -dy / maxDist)) };
                    } else if (touch.identifier === this.viewTouchId) {
                        const dx = touch.clientX - this.touchStartPos.x;
                        const dy = touch.clientY - this.touchStartPos.y;
                        if (Math.abs(dx) > 15 || Math.abs(dy) > 15) this.pendingJump = false;
                        if (this.lastRotation.x !== 0 || this.lastRotation.y !== 0) {
                            const deltaX = touch.clientX - this.lastRotation.x;
                            const deltaY = touch.clientY - this.lastRotation.y;
                            if (this.player) this.player.rotate(deltaX, deltaY);
                        }
                        this.lastRotation = { x: touch.clientX, y: touch.clientY };
                    }
                }
            }, { passive: false });
            container.addEventListener('touchend', (e) => {
                if (this.transitioning) return;
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (touch.identifier === this.moveTouchId) {
                        this.moveTouchId = null;
                        this.input.move = { x: 0, y: 0 };
                    } else if (touch.identifier === this.viewTouchId) {
                        const duration = performance.now() - this.touchStartTime;
                        if (this.pendingJump && duration < 200) this.input.jump = true;
                        this.viewTouchId = null;
                        this.pendingJump = false;
                        this.lastRotation = { x: 0, y: 0 };
                    }
                }
            });
            const keys = {};
            window.addEventListener('keydown', (e) => {
                if (this.transitioning) return;
                keys[e.key.toLowerCase()] = true;
                const x = (keys['a'] || keys['arrowleft'] ? -1 : 0) + (keys['d'] || keys['arrowright'] ? 1 : 0);
                const y = (keys['w'] || keys['arrowup'] ? 1 : 0) + (keys['s'] || keys['arrowdown'] ? -1 : 0);
                this.input.move = { x, y };
                if (e.key === ' ') {
                    e.preventDefault();
                    if (!this.keyJumpConsumed) { this.input.jump = true; this.keyJumpConsumed = true; }
                }
            });
            window.addEventListener('keyup', (e) => {
                if (this.transitioning) return;
                keys[e.key.toLowerCase()] = false;
                const x = (keys['a'] || keys['arrowleft'] ? -1 : 0) + (keys['d'] || keys['arrowright'] ? 1 : 0);
                const y = (keys['w'] || keys['arrowup'] ? 1 : 0) + (keys['s'] || keys['arrowdown'] ? -1 : 0);
                this.input.move = { x, y };
                if (e.key === ' ') { this.input.jump = false; this.keyJumpConsumed = false; }
            });
            let mouseDown = false;
            container.addEventListener('mousedown', (e) => { mouseDown = true; this.lastRotation = { x: e.clientX, y: e.clientY }; });
            window.addEventListener('mousemove', (e) => { if (!mouseDown || !this.player) return; const dx = e.clientX - this.lastRotation.x; const dy = e.clientY - this.lastRotation.y; this.player.rotate(dx, dy); this.lastRotation = { x: e.clientX, y: e.clientY }; });
            window.addEventListener('mouseup', () => { mouseDown = false; });
        }

        updateDynamicObjects(now) {
            for (const dyn of this.dynamicObjects) {
                if (dyn.type === 'platform') {
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
                    if (dyn.edgeLine) dyn.edgeLine.position.copy(dyn.mesh.position);
                } else if (dyn.type === 'flag') {
                    const elapsed = now - dyn.startTime;
                    dyn.mesh.rotation.y = Math.sin(elapsed * dyn.speed) * dyn.amplitude;
                    dyn.mesh.position.x = dyn.pivot.x + 0.7 + Math.sin(elapsed * dyn.speed) * 0.1;
                }
            }
        }

        async transitionToNextLevel() {
            if (this.transitioning) return;
            this.transitioning = true;
            transitionOverlay.style.transition = 'opacity 0.8s';
            transitionOverlay.style.opacity = '1';
            await new Promise(resolve => setTimeout(resolve, 800));
            this.currentLevel++;
            this.loadLevel(this.currentLevel);
            await new Promise(resolve => setTimeout(resolve, 300));
            transitionOverlay.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 800));
            this.transitioning = false;
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            if (this.transitioning) {
                this.renderer.render(this.scene, this.camera);
                return;
            }
            const dt = Math.min(this.clock.getDelta(), 0.1);
            const now = performance.now() / 1000;
            this.updateDynamicObjects(now);
            if (this.player) {
                this.player.update(dt, this.input, this.worldMeshes, this.wallMeshes);
                this.updateSkyAndLighting(this.player.position);
                this.input.jump = false;
                if (this.goalPlatformMesh && this.player.currentGroundMesh === this.goalPlatformMesh && !this.player.isClimbing) {
                    if (!this.goalReached) {
                        this.goalTimer += dt;
                        const remaining = Math.ceil(this.goalRequiredTime - this.goalTimer);
                        if (remaining <= 0) {
                            this.goalReached = true;
                            countdownEl.style.display = 'none';
                            this.transitionToNextLevel();
                        } else {
                            countdownEl.style.display = 'block';
                            countdownEl.textContent = remaining;
                        }
                    }
                } else {
                    this.goalTimer = 0;
                    countdownEl.style.display = 'none';
                }
            }
            this.renderer.render(this.scene, this.camera);
        }

        onResize() {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            updateDiagonalDivider();
        }
    }

    // 启动
    logoOverlay.classList.remove('hidden');
    preloadMoonTexture(() => {});
    setTimeout(() => {
        if (!game) startGame();
    }, 4500);
    function startGame() {
        game = new Game(document.getElementById('game-canvas'));
        logoOverlay.classList.add('hidden');
        window.addEventListener('resize', () => game.onResize());
    }
})();