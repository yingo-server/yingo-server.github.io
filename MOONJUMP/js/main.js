// main.js - 修复转场时序、增强错误处理、确保关卡加载健壮
(function () {
    const logoOverlay = document.getElementById('logo-overlay');
    const countdownEl = document.getElementById('countdown');
    const transitionOverlay = document.getElementById('transition-overlay');
    const levelTitleEl = document.getElementById('level-title');
    const tooltipEl = document.getElementById('tooltip');
    const skipBtn = document.getElementById('skip-btn');
    const divider = document.getElementById('divider');
    let game = null;

    skipBtn.style.display = 'none';

    // 垂直分割线动画：上端滑到下端（0.1s）→ 闪烁三次（1s）→ 消失
    function animateDivider() {
        if (!divider) return;
        divider.style.transition = 'none';
        divider.style.opacity = '1';
        divider.style.height = '0';
        requestAnimationFrame(() => {
            divider.style.transition = 'height 0.1s linear';
            divider.style.height = '100%';
        });
        setTimeout(() => {
            divider.style.transition = 'opacity 0.15s';
            let count = 0;
            const blink = setInterval(() => {
                divider.style.opacity = (count % 2 === 0) ? '0' : '1';
                count++;
                if (count === 6) {
                    clearInterval(blink);
                    divider.style.opacity = '0';
                    divider.style.height = '0';
                    divider.style.transition = 'none';
                }
            }, 166);
        }, 100);
    }

    // 关卡标题渐入渐出
    function showLevelTitle(title) {
        if (!levelTitleEl) return;
        levelTitleEl.textContent = title || '未知关卡';
        levelTitleEl.style.transition = 'opacity 0.3s';
        levelTitleEl.style.opacity = '1';
        setTimeout(() => {
            levelTitleEl.style.opacity = '0';
        }, 900);
    }

    // 预加载月球纹理（容错）
    let cachedMoonTexture = null;
    function preloadMoonTexture(callback) {
        if (cachedMoonTexture) { callback(cachedMoonTexture); return; }
        const loader = new THREE.TextureLoader();
        loader.load('./img/moon.png', (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            cachedMoonTexture = tex;
            callback(tex);
        }, undefined, () => {
            console.warn('月球纹理加载失败，使用纯色替代');
            const canvas = document.createElement('canvas');
            canvas.width = 2; canvas.height = 2;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 2, 2);
            cachedMoonTexture = new THREE.CanvasTexture(canvas);
            callback(cachedMoonTexture);
        });
    }

    // 玩家类（含攀爬）
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
            this.lastAirborneTime = 0;
            this.isClimbing = false;
            this.climbData = null;
            this.postClimbTimer = 0;
        }

        update(dt, input, worldMeshes, wallMeshes) {
            const now = performance.now() / 1000;
            if (!this.isGrounded) this.lastAirborneTime = now;

            if (this.isClimbing) { this.updateClimbing(dt, now); return; }
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
            const rayOrigin = this.position.clone(); rayOrigin.y += 0.1;
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

            // 墙壁碰撞与攀爬
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
            for (const mesh of wallMeshes) {
                const box = new THREE.Box3().setFromObject(mesh);
                const obs = { minX: box.min.x, maxX: box.max.x, minY: box.min.y, maxY: box.max.y, minZ: box.min.z, maxZ: box.max.z };
                const overlapX = Math.min(playerBox.maxX, obs.maxX) - Math.max(playerBox.minX, obs.minX);
                const overlapY = Math.min(playerBox.maxY, obs.maxY) - Math.max(playerBox.minY, obs.minY);
                const overlapZ = Math.min(playerBox.maxZ, obs.maxZ) - Math.max(playerBox.minZ, obs.minZ);
                if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
                    let normal = new THREE.Vector3();
                    if (overlapX <= overlapY && overlapX <= overlapZ) normal.x = this.position.x > (obs.minX + obs.maxX) / 2 ? 1 : -1;
                    else if (overlapY <= overlapX && overlapY <= overlapZ) normal.y = this.position.y > (obs.minY + obs.maxY) / 2 ? 1 : -1;
                    else normal.z = this.position.z > (obs.minZ + obs.maxZ) / 2 ? 1 : -1;

                    const wallNormal = new THREE.Vector3(normal.x, 0, normal.z).normalize();
                    const camForward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
                    const dot = camForward.dot(wallNormal.clone().multiplyScalar(-1));
                    if (wallNormal.length() > 0.1 && dot > Math.cos(15 * Math.PI / 180)) {
                        if (now - this.lastAirborneTime < 1.0) {
                            if (dot > bestClimbDot) { bestClimbDot = dot; bestClimbCandidate = { mesh, normal: wallNormal.clone(), box }; }
                        }
                    }
                }
            }
            if (bestClimbCandidate) { this.startClimbing(bestClimbCandidate); return; }
            // 推开墙壁
            for (const mesh of wallMeshes) {
                const box = new THREE.Box3().setFromObject(mesh);
                const obs = { minX: box.min.x, maxX: box.max.x, minY: box.min.y, maxY: box.max.y, minZ: box.min.z, maxZ: box.max.z };
                const overlapX = Math.min(playerBox.maxX, obs.maxX) - Math.max(playerBox.minX, obs.minX);
                const overlapY = Math.min(playerBox.maxY, obs.maxY) - Math.max(playerBox.minY, obs.minY);
                const overlapZ = Math.min(playerBox.maxZ, obs.maxZ) - Math.max(playerBox.minZ, obs.minZ);
                if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
                    if (overlapX <= overlapY && overlapX <= overlapZ) this.position.x += (this.position.x > (obs.minX + obs.maxX) / 2 ? 1 : -1) * overlapX;
                    else if (overlapY <= overlapX && overlapY <= overlapZ) this.position.y += (this.position.y > (obs.minY + obs.maxY) / 2 ? 1 : -1) * overlapY;
                    else this.position.z += (this.position.z > (obs.minZ + obs.maxZ) / 2 ? 1 : -1) * overlapZ;
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
            const box = candidate.box; const normal = candidate.normal;
            const targetY = box.max.y + this.height;
            const climbSpeed = 5.0;
            const heightDiff = targetY - this.position.y;
            const duration = Math.max(0.2, heightDiff / climbSpeed);
            const wallOffset = 0.6;
            const targetXZ = new THREE.Vector2(
                (box.min.x + box.max.x) / 2 + normal.x * (box.max.x - box.min.x) / 2 + normal.x * wallOffset,
                (box.min.z + box.max.z) / 2 + normal.z * (box.max.z - box.min.z) / 2 + normal.z * wallOffset
            );
            this.climbData = { normal, startPos: this.position.clone(), targetPos: new THREE.Vector3(targetXZ.x, targetY, targetXZ.y), startTime: performance.now() / 1000, duration, startYaw: this.yaw };
            this.isClimbing = true; this.velocity.set(0, 0, 0); this.isGrounded = false;
        }
        updateClimbing(dt, now) {
            const data = this.climbData;
            const elapsed = now - data.startTime;
            const progress = Math.min(elapsed / data.duration, 1.0);
            this.position.lerpVectors(data.startPos, data.targetPos, progress);
            const swingFreq = 2.5, maxSwingAmp = 0.15;
            const amp = Math.sin(progress * Math.PI) * maxSwingAmp;
            const swingAngle = Math.sin(progress * Math.PI * 2 * swingFreq) * amp;
            const pitchSwing = Math.cos(progress * Math.PI * 2 * (swingFreq + 0.3)) * Math.sin(progress * Math.PI) * 0.05;
            this.camera.position.copy(this.position);
            this.camera.rotation.y = data.startYaw + swingAngle;
            this.camera.rotation.x = this.pitch + pitchSwing;
            if (progress >= 1.0) this.finishClimbing();
        }
        finishClimbing() {
            this.position.copy(this.climbData.targetPos);
            this.isClimbing = false; this.climbData = null;
            this.isGrounded = true; this.velocity.set(0, 0, 0);
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

            this.ambient = new THREE.AmbientLight('#404060', 0.6); this.scene.add(this.ambient);
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

            // 月球
            const radius = 225, glowOffset = 30;
            this.glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.createGlowTexture(), blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, opacity: 0.9 }));
            this.glowSprite.scale.set(140, 140, 1); this.glowSprite.renderOrder = 0; this.scene.add(this.glowSprite);
            this.moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, transparent: true, color: 0xffffff, depthTest: true, depthWrite: false }));
            this.moonSprite.scale.set(27.5, 27.5, 1); this.moonSprite.renderOrder = 1; this.scene.add(this.moonSprite);
            this.moonBrightLayer = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.6, depthTest: true, depthWrite: false }));
            this.moonBrightLayer.scale.set(29, 29, 1); this.moonBrightLayer.renderOrder = 0; this.scene.add(this.moonBrightLayer);

            if (cachedMoonTexture) this.applyMoonTexture(cachedMoonTexture);
            else preloadMoonTexture((tex) => this.applyMoonTexture(tex));

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
            this.stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.3, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
            this.scene.add(this.stars);

            this.worldMeshes = []; this.wallMeshes = []; this.dynamicObjects = [];
            this.player = null;
            this.input = { move: { x: 0, y: 0 }, jump: false };
            this.moveTouchId = null; this.viewTouchId = null; this.moveStart = null; this.viewStart = null;
            this.keyJumpConsumed = false;
            this.lastRotation = { x: 0, y: 0 };
            this.pendingJump = false;
            this.touchStartTime = 0; this.touchStartPos = { x: 0, y: 0 };
            this.goalPlatformMesh = null;
            this.goalTimer = 0; this.goalRequiredTime = 5; this.goalReached = false;
            this.currentLevel = 1;
            this.transitioning = true;  // 初始锁定
            this.shownTooltips = new Set();
            this.currentLevelName = '';

            const elevation = 35 * Math.PI / 180;
            const azimuth = Math.random() * Math.PI * 2;
            const x = Math.cos(elevation) * Math.cos(azimuth);
            const y = Math.sin(elevation);
            const z = Math.cos(elevation) * Math.sin(azimuth);
            this.moonDirection = new THREE.Vector3(x, y, z).normalize();
            this.moonRadius = radius; this.glowOffset = glowOffset;

            const saved = parseInt(localStorage.getItem('blockRunLevel'));
            if (saved && saved >= 1) this.currentLevel = saved;

            this.initPromise = this.loadLevel(this.currentLevel);
            this.setupSkipButton();
        }

        applyMoonTexture(texture) {
            this.moonSprite.material.map = texture; this.moonSprite.material.needsUpdate = true;
            this.moonBrightLayer.material.map = texture; this.moonBrightLayer.material.needsUpdate = true;
        }

        createGlowTexture() {
            const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
            gradient.addColorStop(0, 'rgba(255, 240, 210, 1)');
            gradient.addColorStop(0.1, 'rgba(210, 230, 255, 0.95)');
            gradient.addColorStop(0.25, 'rgba(160, 190, 240, 0.7)');
            gradient.addColorStop(0.5, 'rgba(100, 140, 200, 0.4)');
            gradient.addColorStop(0.8, 'rgba(70, 100, 160, 0.15)');
            gradient.addColorStop(1, 'rgba(50, 70, 130, 0)');
            ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 512);
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
            // 清理场景
            this.worldMeshes.length = 0; this.wallMeshes.length = 0; this.dynamicObjects.length = 0;
            this.goalPlatformMesh = null; this.goalTimer = 0; this.goalReached = false;
            countdownEl.style.display = 'none';
            this.shownTooltips.clear();

            const keep = [this.ambient, this.sunLight, this.moonSprite, this.moonBrightLayer, this.glowSprite, this.stars, this.sunLight.target];
            const toRemove = [];
            this.scene.children.forEach(c => { if (!keep.includes(c)) toRemove.push(c); });
            toRemove.forEach(c => this.scene.remove(c));

            try {
                const resp = await fetch(`map/level${levelNum}.json`);
                if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
                const data = await resp.json();
                this.buildLevel(data);
                if (!data.startPosition || isNaN(data.startPosition.x)) {
                    throw new Error('无效的出生点');
                }
                this.player = new Player(this.camera, this.scene, new THREE.Vector3(data.startPosition.x, data.startPosition.y, data.startPosition.z));
                localStorage.setItem('blockRunLevel', levelNum);
                this.currentLevelName = data.name || `第 ${levelNum} 关`;
                console.log(`关卡 ${levelNum} 加载成功: ${this.currentLevelName}`);
            } catch (err) {
                console.error(`加载关卡 ${levelNum} 失败:`, err.message);
                this.buildFallbackLevel();
                this.player = new Player(this.camera, this.scene, new THREE.Vector3(0, 2, 0));
                this.currentLevelName = `第 ${levelNum} 关 (默认场地)`;
            }

            skipBtn.style.display = 'flex';

            if (!this._inputSetup) { this.setupInput(); this._inputSetup = true; }
            if (!this._animating) { this.animate(); this._animating = true; }
        }

        buildFallbackLevel() {
            const geo = new THREE.BoxGeometry(20, 0.5, 20);
            const mat = new THREE.MeshStandardMaterial({ color: '#404040', roughness: 0.5 });
            const ground = new THREE.Mesh(geo, mat);
            ground.position.set(0, -1, 0);
            ground.receiveShadow = true; ground.castShadow = true;
            ground.userData.isGround = true; ground.userData.isGoal = false; ground.userData.tooltip = '默认平台';
            this.scene.add(ground);
            this.worldMeshes.push(ground);
        }

        buildLevel(data) {
            (data.platforms || []).forEach(p => {
                const w = p.width || 10, d = p.depth || 20, h = p.height || 0.5;
                const geo = new THREE.BoxGeometry(w, h, d);
                const color = p.isGoal ? '#ffffff' : '#202020';
                const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 });
                const mesh = new THREE.Mesh(geo, mat);
                const initX = Array.isArray(p.x) ? (p.x[0] + p.x[1]) / 2 : (p.x || 0);
                const initY = Array.isArray(p.y) ? (p.y[0] + p.y[1]) / 2 : (p.y || 0);
                const initZ = Array.isArray(p.z) ? (p.z[0] + p.z[1]) / 2 : (p.z || 0);
                mesh.position.set(initX, initY, initZ);
                mesh.receiveShadow = true; mesh.castShadow = true;
                mesh.userData.isGround = true;
                mesh.userData.isGoal = p.isGoal || false;
                if (p.isGoal) this.goalPlatformMesh = mesh;
                mesh.userData.tooltip = p.tooltip || '';
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

            (data.walls || []).forEach(w => {
                const width = w.width || 10, height = w.height || 3, depth = w.depth || 0.5;
                const geo = new THREE.BoxGeometry(width, height, depth);
                const mat = new THREE.MeshStandardMaterial({ color: '#505050', roughness: 0.7, metalness: 0.2 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(w.x, w.y + height/2, w.z);
                mesh.receiveShadow = true; mesh.castShadow = true;
                mesh.userData.isGround = false;
                this.scene.add(mesh);
                this.wallMeshes.push(mesh);
                const edgeGeo = new THREE.EdgesGeometry(geo);
                const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x888888 }));
                edgeLine.position.copy(mesh.position);
                this.scene.add(edgeLine);
            });

            (data.decorations || []).forEach(dec => {
                if (dec.type === 'arrow') {
                    const shape = new THREE.Shape();
                    shape.moveTo(0, 0.5); shape.lineTo(-1, -1); shape.lineTo(0, -0.5); shape.lineTo(1, -1); shape.closePath();
                    const geo = new THREE.ShapeGeometry(shape);
                    const mat = new THREE.MeshStandardMaterial({ color: 0xaaccff, roughness: 0.5 });
                    const arrow = new THREE.Mesh(geo, mat);
                    arrow.position.set(dec.x, dec.y, dec.z);
                    const orient = dec.orientation || 'forward';
                    if (orient === 'forward') arrow.rotation.x = -Math.PI / 2;
                    else if (orient === 'up') arrow.rotation.x = 0;
                    else if (orient === 'backward') { arrow.rotation.x = -Math.PI / 2; arrow.rotation.z = Math.PI; }
                    arrow.scale.set(dec.scale || 1, dec.scale || 1, dec.scale || 1);
                    this.scene.add(arrow);
                }
            });
        }

        setupSkipButton() {
            skipBtn.addEventListener('click', () => { if (!this.transitioning) this.transitionToNextLevel(); });
            skipBtn.addEventListener('touchend', (e) => { e.preventDefault(); if (!this.transitioning) this.transitionToNextLevel(); });
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
                        const dx = touch.clientX - this.moveStart.x, dy = touch.clientY - this.moveStart.y;
                        this.input.move = { x: Math.max(-1, Math.min(1, dx / 80)), y: Math.max(-1, Math.min(1, -dy / 80)) };
                    } else if (touch.identifier === this.viewTouchId) {
                        const dx = touch.clientX - this.touchStartPos.x, dy = touch.clientY - this.touchStartPos.y;
                        if (Math.abs(dx) > 15 || Math.abs(dy) > 15) this.pendingJump = false;
                        if (this.lastRotation.x !== 0 || this.lastRotation.y !== 0) {
                            if (this.player) this.player.rotate(touch.clientX - this.lastRotation.x, touch.clientY - this.lastRotation.y);
                        }
                        this.lastRotation = { x: touch.clientX, y: touch.clientY };
                    }
                }
            }, { passive: false });
            container.addEventListener('touchend', (e) => {
                if (this.transitioning) return;
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (touch.identifier === this.moveTouchId) { this.moveTouchId = null; this.input.move = { x: 0, y: 0 }; }
                    else if (touch.identifier === this.viewTouchId) {
                        if (this.pendingJump && (performance.now() - this.touchStartTime) < 200) this.input.jump = true;
                        this.viewTouchId = null; this.pendingJump = false; this.lastRotation = { x: 0, y: 0 };
                    }
                }
            });
            const keys = {};
            window.addEventListener('keydown', (e) => {
                if (this.transitioning) return;
                keys[e.key.toLowerCase()] = true;
                this.input.move = {
                    x: (keys['a'] || keys['arrowleft'] ? -1 : 0) + (keys['d'] || keys['arrowright'] ? 1 : 0),
                    y: (keys['w'] || keys['arrowup'] ? 1 : 0) + (keys['s'] || keys['arrowdown'] ? -1 : 0)
                };
                if (e.key === ' ') { e.preventDefault(); if (!this.keyJumpConsumed) { this.input.jump = true; this.keyJumpConsumed = true; } }
            });
            window.addEventListener('keyup', (e) => {
                if (this.transitioning) return;
                keys[e.key.toLowerCase()] = false;
                this.input.move = {
                    x: (keys['a'] || keys['arrowleft'] ? -1 : 0) + (keys['d'] || keys['arrowright'] ? 1 : 0),
                    y: (keys['w'] || keys['arrowup'] ? 1 : 0) + (keys['s'] || keys['arrowdown'] ? -1 : 0)
                };
                if (e.key === ' ') { this.input.jump = false; this.keyJumpConsumed = false; }
            });
            let mouseDown = false;
            container.addEventListener('mousedown', () => { if (this.transitioning) return; mouseDown = true; });
            window.addEventListener('mousemove', (e) => { if (mouseDown && this.player && !this.transitioning) this.player.rotate(e.movementX, e.movementY); });
            window.addEventListener('mouseup', () => { mouseDown = false; });
        }

        updateDynamicObjects(now) {
            for (const dyn of this.dynamicObjects) {
                if (dyn.type !== 'platform') continue;
                const elapsed = now - dyn.startTime;
                for (const axisData of dyn.axes) {
                    const t = Math.sin(elapsed * axisData.speed * 2 * Math.PI) * 0.5 + 0.5;
                    const value = axisData.range[0] + (axisData.range[1] - axisData.range[0]) * t;
                    if (axisData.axis === 'x') dyn.mesh.position.x = value;
                    else if (axisData.axis === 'y') dyn.mesh.position.y = value;
                    else if (axisData.axis === 'z') dyn.mesh.position.z = value;
                }
                if (dyn.edgeLine) dyn.edgeLine.position.copy(dyn.mesh.position);
            }
        }

        showTooltip(text) {
            tooltipEl.textContent = text;
            tooltipEl.classList.add('show');
            clearTimeout(this._tooltipTimeout);
            this._tooltipTimeout = setTimeout(() => tooltipEl.classList.remove('show'), 3000);
        }

        checkTooltip() {
            if (!this.player || !this.player.currentGroundMesh) return;
            const mesh = this.player.currentGroundMesh;
            const tip = mesh.userData.tooltip;
            if (!tip || tip === '') return;
            if (this.shownTooltips.has(mesh.uuid)) return;
            this.shownTooltips.add(mesh.uuid);
            this.showTooltip(tip);
        }

        async transitionToNextLevel() {
            if (this.transitioning) return;
            this.transitioning = true;
            transitionOverlay.style.transition = 'opacity 0.8s';
            transitionOverlay.style.opacity = '1';
            await new Promise(r => setTimeout(r, 600));

            // 加载下一关（必须先完成）
            this.currentLevel++;
            await this.loadLevel(this.currentLevel);

            // 显示新关卡标题
            showLevelTitle(this.currentLevelName);
            await new Promise(r => setTimeout(r, 1200));

            transitionOverlay.style.opacity = '0';
            await new Promise(r => setTimeout(r, 500));
            animateDivider();
            await new Promise(r => setTimeout(r, 1300));
            this.transitioning = false;
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            if (this.transitioning) { this.renderer.render(this.scene, this.camera); return; }
            const dt = Math.min(this.clock.getDelta(), 0.1);
            const now = performance.now() / 1000;
            this.updateDynamicObjects(now);
            if (this.player) {
                this.player.update(dt, this.input, this.worldMeshes, this.wallMeshes);
                this.updateSkyAndLighting(this.player.position);
                this.input.jump = false;
                this.checkTooltip();
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
        }
    }

    // 启动
    logoOverlay.classList.remove('hidden');
    preloadMoonTexture(() => {});
    setTimeout(() => {
        if (!game) startGame();
    }, 4500);

    async function startGame() {
        logoOverlay.classList.add('hidden');
        game = new Game(document.getElementById('game-canvas'));
        await game.initPromise; // 等待首关加载完毕
        // 首关转场
        transitionOverlay.style.transition = 'opacity 0.8s';
        transitionOverlay.style.opacity = '1';
        await new Promise(r => setTimeout(r, 600));
        showLevelTitle(game.currentLevelName);
        await new Promise(r => setTimeout(r, 1200));
        transitionOverlay.style.opacity = '0';
        await new Promise(r => setTimeout(r, 500));
        animateDivider();
        await new Promise(r => setTimeout(r, 1300));
        game.transitioning = false;
        window.addEventListener('resize', () => game.onResize());
    }
})();