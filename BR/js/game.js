import * as THREE from 'three';
import { Player } from './player.js';
import { AudioManager } from './audio.js';

export class Game {
    constructor(canvas, mobileControlsEl) {
        this.canvas = canvas;
        this.mobileControlsEl = mobileControlsEl;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.clock = new THREE.Clock();
        this.player = null;
        this.obstacles = [];
        this.groundMesh = null;
        this.groundCollision = null;      // 仅用于记录，不加入碰撞数组
        this.audioManager = null;

        // 输入
        this.inputRaw = {
            move: { x: 0, y: 0 },
            run: false,
            jump: false,
            slide: false,
            skill: false,
        };
        this.inputActions = {
            move: { x: 0, y: 0 },
            run: false,
            jumpTrigger: 'none',
            slideAction: 'none',
            skill: false,
        };
        this.buttonPressTime = { jump: 0, slide: 0 };
        this.jumpHandled = false;
        this.slideStartSent = false;      // 是否已发送滑铲开始

        // 技能
        this.skillModule = null;
        this.skillState = { cooldown: 0 };

        // 视角
        this.viewRotateActive = false;
        this.viewRotateId = null;
        this.viewRotateLast = { x: 0, y: 0 };

        // 摇杆
        this.joystickActive = false;
        this.joystickTouchId = null;
        this.joystickBase = null;
        this.joystickThumb = null;
        this.joystickBaseRect = null;

        this.dustParticles = null;
        this.lastPlayerState = {};
    }

    async init() {
        await this.setupRenderer();
        this.setupScene();
        this.setupLighting();
        this.setupCamera();
        this.player = new Player(this.scene, this.camera);
        this.audioManager = new AudioManager();
        await this.loadMap();
        this.setupDustParticles();
        this.setupInputListeners();
        this.setupViewRotation();
        this.animate();
    }

    async setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas, antialias: true, alpha: false, powerPreference: 'high-performance'
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#d4b896');
        this.scene.fog = new THREE.FogExp2('#d4b896', 0.00025);
    }

    setupLighting() {
        const ambient = new THREE.AmbientLight('#ffe8cc', 1.8);
        this.scene.add(ambient);
        const hemi = new THREE.HemisphereLight('#ffeedd', '#c2956b', 1.2);
        this.scene.add(hemi);
        const sun = new THREE.DirectionalLight('#fff5e8', 6);
        sun.position.set(50, 40, 30);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 200;
        sun.shadow.camera.left = -60;
        sun.shadow.camera.right = 60;
        sun.shadow.camera.top = 60;
        sun.shadow.camera.bottom = -60;
        sun.shadow.bias = -0.0003;
        this.scene.add(sun);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 200);
    }

    async loadMap() {
        try {
            const mapIndexRes = await fetch('map/map.json');
            const mapIndex = await mapIndexRes.json();
            const levelFile = mapIndex.levels[0].file;
            const levelRes = await fetch(`map/${levelFile}`);
            const mapData = await levelRes.json();
            this.mapData = mapData;
            this.buildGround(mapData.ground);
            this.buildObstacles(mapData.obstacles || []);
            if (mapData.skillScript) {
                try {
                    this.skillModule = await import(`../${mapData.skillScript}`);
                    if (this.skillModule && this.skillModule.init) {
                        this.skillModule.init(this);
                    }
                } catch (e) {
                    console.warn('[技能] 加载失败:', e);
                    this.skillModule = null;
                }
            } else {
                this.skillModule = null;
            }
            this.updateSkillButtonVisibility();
        } catch (err) {
            console.warn('[地图] 加载失败，使用默认地图:', err.message);
            this.buildDefaultMap();
        }
    }

    buildGround(g) {
        const geo = new THREE.BoxGeometry(g.width, g.thickness || 0.4, g.depth);
        const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(g.color || '#c2956b'), roughness: 0.85, metalness: 0.05 });
        this.groundMesh = new THREE.Mesh(geo, mat);
        this.groundMesh.position.set(g.x || 0, -(g.thickness || 0.4) / 2, g.z || 0);
        this.groundMesh.receiveShadow = true;
        this.groundMesh.castShadow = true;
        this.scene.add(this.groundMesh);
        const edgeGeo = new THREE.EdgesGeometry(geo);
        const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x0078d4, transparent: true, opacity: 0.5 }));
        edgeLine.position.copy(this.groundMesh.position);
        this.scene.add(edgeLine);
        const halfW = g.width / 2, halfD = g.depth / 2;
        this.groundCollision = {
            minX: (g.x || 0) - halfW, maxX: (g.x || 0) + halfW,
            minY: (g.y || 0) - (g.thickness || 0.4), maxY: g.y || 0,
            minZ: (g.z || 0) - halfD, maxZ: (g.z || 0) + halfD,
        };
    }

    buildObstacles(obstaclesData) {
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5, metalness: 0.2 });
        for (const obs of obstaclesData) {
            const w = obs.width || 1, h = obs.height || 1, d = obs.depth || 1;
            const geo = new THREE.BoxGeometry(w, h, d);
            const mesh = new THREE.Mesh(geo, blackMat);
            mesh.position.set(obs.x, obs.y, obs.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            const edgeGeo = new THREE.EdgesGeometry(geo);
            const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x0078d4, transparent: true, opacity: 0.7 }));
            edgeLine.position.copy(mesh.position);
            this.scene.add(edgeLine);
            this.obstacles.push({
                mesh, edgeLine,
                collision: {
                    minX: obs.x - w/2, maxX: obs.x + w/2,
                    minY: obs.y - h/2, maxY: obs.y + h/2,
                    minZ: obs.z - d/2, maxZ: obs.z + d/2,
                }
            });
        }
    }

    buildDefaultMap() {
        const geo = new THREE.BoxGeometry(180, 0.5, 180);
        const mat = new THREE.MeshStandardMaterial({ color: 0xc2956b, roughness: 0.85, metalness: 0.05 });
        this.groundMesh = new THREE.Mesh(geo, mat);
        this.groundMesh.position.set(0, -0.25, 0);
        this.groundMesh.receiveShadow = true; this.groundMesh.castShadow = true;
        this.scene.add(this.groundMesh);
        const edgeLine = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x0078d4, transparent: true, opacity: 0.5 }));
        edgeLine.position.copy(this.groundMesh.position);
        this.scene.add(edgeLine);
        this.groundCollision = { minX: -90, maxX: 90, minY: -0.5, maxY: 0, minZ: -90, maxZ: 90 };
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5, metalness: 0.2 });
        const defaultObs = [
            { x:8,y:0.6,z:-12,w:1.5,h:1.2,d:1.5 },
            { x:-6,y:0.5,z:-18,w:1,h:1,d:1 },
            { x:3,y:0.75,z:-25,w:2,h:1.5,d:2 }
        ];
        for (const obs of defaultObs) {
            const g = new THREE.BoxGeometry(obs.w, obs.h, obs.d);
            const mesh = new THREE.Mesh(g, blackMat);
            mesh.position.set(obs.x, obs.y, obs.z);
            mesh.castShadow = true; mesh.receiveShadow = true;
            this.scene.add(mesh);
            const eLine = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0x0078d4, transparent: true, opacity: 0.7 }));
            eLine.position.copy(mesh.position);
            this.scene.add(eLine);
            this.obstacles.push({
                mesh, edgeLine: eLine,
                collision: {
                    minX: obs.x - obs.w/2, maxX: obs.x + obs.w/2,
                    minY: obs.y - obs.h/2, maxY: obs.y + obs.h/2,
                    minZ: obs.z - obs.d/2, maxZ: obs.z + obs.d/2,
                }
            });
        }
    }

    setupDustParticles() {
        const count = 200;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 160;
            pos[i*3+1] = Math.random() * 8 + 0.2;
            pos[i*3+2] = (Math.random() - 0.5) * 160;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0xe8d5a3, size: 0.25, transparent: true, opacity: 0.4, depthWrite: false });
        this.dustParticles = new THREE.Points(geo, mat);
        this.scene.add(this.dustParticles);
    }

    updateSkillButtonVisibility() {
        const btn = document.getElementById('btn-skill');
        if (btn) btn.style.display = this.skillModule ? 'flex' : 'none';
    }

    setupInputListeners() {
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickThumb = document.getElementById('joystick-thumb');

        // 摇杆
        const onJoystickStart = (e) => {
            e.preventDefault();
            if (this.joystickActive) return;
            const touch = e.changedTouches[0];
            this.joystickActive = true;
            this.joystickTouchId = touch.identifier;
            this.joystickBaseRect = this.joystickBase.getBoundingClientRect();
            this.updateJoystickPosition(touch);
        };
        const onJoystickMove = (e) => {
            if (!this.joystickActive) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.joystickTouchId) {
                    e.preventDefault();
                    this.updateJoystickPosition(e.changedTouches[i]);
                }
            }
        };
        const onJoystickEnd = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.joystickTouchId) {
                    e.preventDefault();
                    this.resetJoystick();
                }
            }
        };
        this.joystickBase.addEventListener('touchstart', onJoystickStart, { passive: false });
        document.addEventListener('touchmove', onJoystickMove, { passive: false });
        document.addEventListener('touchend', onJoystickEnd, { passive: false });
        document.addEventListener('touchcancel', onJoystickEnd, { passive: false });

        // 四个按钮
        this.setupActionButton('btn-run', (pressed) => { this.inputRaw.run = pressed; });
        this.setupActionButton('btn-jump', (pressed) => {
            this.inputRaw.jump = pressed;
            if (pressed) {
                this.buttonPressTime.jump = performance.now();
                this.jumpHandled = false;
            } else {
                if (!this.jumpHandled) {
                    const dur = performance.now() - this.buttonPressTime.jump;
                    this.inputActions.jumpTrigger = dur < 150 ? 'short' : 'long';
                    this.jumpHandled = true;
                    setTimeout(() => { this.inputActions.jumpTrigger = 'none'; }, 50);
                }
            }
        });
        this.setupActionButton('btn-slide', (pressed) => {
            this.inputRaw.slide = pressed;
            if (pressed) {
                this.buttonPressTime.slide = performance.now();
                this.slideStartSent = false;      // 重置滑铲开始标记
            } else {
                const dur = performance.now() - this.buttonPressTime.slide;
                if (this.player && this.player.isSliding) {
                    // 已经处于滑铲，松开则发送结束
                    this.inputActions.slideAction = 'end';
                } else {
                    // 未滑铲，处理短按/长按
                    if (dur < 200) {
                        // 短按：切换下蹲（受滑铲冷却限制，player会检查）
                        this.inputActions.slideAction = 'toggle';
                    } else {
                        // 长按但未进入滑铲（可能因为奔跑条件不满足），不做任何事
                        this.inputActions.slideAction = 'none';
                    }
                }
                setTimeout(() => { this.inputActions.slideAction = 'none'; }, 50);
            }
        });
        this.setupActionButton('btn-skill', (pressed) => {
            if (pressed && this.skillModule && this.skillState.cooldown <= 0) {
                this.skillModule.activate(this);
            }
        });

        // 键盘支持
        this.keyStates = {};
        window.addEventListener('keydown', (e) => {
            this.keyStates[e.key.toLowerCase()] = true;
            this.updateKeyboardInput();
            if ([' ', 'space', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'control'].includes(e.key.toLowerCase())) e.preventDefault();
        });
        window.addEventListener('keyup', (e) => {
            this.keyStates[e.key.toLowerCase()] = false;
            this.updateKeyboardInput();
        });
    }

    setupActionButton(id, callback) {
        const btn = document.getElementById(id);
        if (!btn) return;
        const press = (e) => { e.preventDefault(); callback(true); btn.classList.add('pressed'); };
        const release = (e) => { e.preventDefault(); callback(false); btn.classList.remove('pressed'); };
        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
        btn.addEventListener('touchcancel', release);
        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);
    }

    updateKeyboardInput() {
        const moveX = (this.keyStates['a'] || this.keyStates['arrowleft'] ? -1 : 0) + (this.keyStates['d'] || this.keyStates['arrowright'] ? 1 : 0);
        const moveY = (this.keyStates['w'] || this.keyStates['arrowup'] ? 1 : 0) + (this.keyStates['s'] || this.keyStates['arrowdown'] ? -1 : 0);
        if (!this.joystickActive) {
            this.inputRaw.move = { x: Math.max(-1, Math.min(1, moveX)), y: Math.max(-1, Math.min(1, moveY)) };
        }
        this.inputRaw.run = !!this.keyStates['shift'];
        // 跳跃（空格）
        const jumpKey = this.keyStates[' '] || this.keyStates['space'];
        if (jumpKey && !this.inputRaw.jump) {
            this.inputRaw.jump = true;
            this.buttonPressTime.jump = performance.now();
            this.jumpHandled = false;
        } else if (!jumpKey && this.inputRaw.jump) {
            this.inputRaw.jump = false;
            if (!this.jumpHandled) {
                const dur = performance.now() - this.buttonPressTime.jump;
                this.inputActions.jumpTrigger = dur < 150 ? 'short' : 'long';
                this.jumpHandled = true;
                setTimeout(() => { this.inputActions.jumpTrigger = 'none'; }, 50);
            }
        }
        // 滑铲（Ctrl）
        const slideKey = this.keyStates['control'];
        if (slideKey && !this.inputRaw.slide) {
            this.inputRaw.slide = true;
            this.buttonPressTime.slide = performance.now();
            this.slideStartSent = false;
        } else if (!slideKey && this.inputRaw.slide) {
            this.inputRaw.slide = false;
            const dur = performance.now() - this.buttonPressTime.slide;
            if (this.player && this.player.isSliding) {
                this.inputActions.slideAction = 'end';
            } else {
                if (dur < 200) {
                    this.inputActions.slideAction = 'toggle';
                } else {
                    this.inputActions.slideAction = 'none';
                }
            }
            setTimeout(() => { this.inputActions.slideAction = 'none'; }, 50);
        }
        // 技能（E）
        if (this.keyStates['e'] && this.skillModule && this.skillState.cooldown <= 0) {
            this.skillModule.activate(this);
        }
    }

    updateJoystickPosition(touch) {
        if (!this.joystickBaseRect) return;
        const cx = this.joystickBaseRect.left + this.joystickBaseRect.width / 2;
        const cy = this.joystickBaseRect.top + this.joystickBaseRect.height / 2;
        const maxR = this.joystickBaseRect.width / 2 - 20;
        let dx = touch.clientX - cx, dy = touch.clientY - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const clamped = Math.min(dist, maxR);
        if (dist > 0.01) {
            dx = (dx / dist) * clamped;
            dy = (dy / dist) * clamped;
        }
        if (this.joystickThumb) {
            this.joystickThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
        this.inputRaw.move = { x: dx / maxR, y: -dy / maxR };
    }

    resetJoystick() {
        this.joystickActive = false;
        this.joystickTouchId = null;
        if (this.joystickThumb) this.joystickThumb.style.transform = 'translate(-50%, -50%)';
        this.inputRaw.move = { x: 0, y: 0 };
    }

    setupViewRotation() {
        const container = document.getElementById('game-container');
        container.addEventListener('touchstart', (e) => {
            const touch = e.changedTouches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && (target.closest('#action-buttons') || target.closest('#joystick-zone'))) return;
            if (this.viewRotateActive) return;
            this.viewRotateActive = true;
            this.viewRotateId = touch.identifier;
            this.viewRotateLast = { x: touch.clientX, y: touch.clientY };
        }, { passive: false });
        container.addEventListener('touchmove', (e) => {
            if (!this.viewRotateActive) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.viewRotateId) {
                    const dx = touch.clientX - this.viewRotateLast.x;
                    const dy = touch.clientY - this.viewRotateLast.y;
                    this.player.rotateView(-dx * 0.004, -dy * 0.004);
                    this.viewRotateLast = { x: touch.clientX, y: touch.clientY };
                }
            }
        }, { passive: false });
        container.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.viewRotateId) {
                    this.viewRotateActive = false;
                    this.viewRotateId = null;
                }
            }
        });
        let mouseDown = false;
        container.addEventListener('mousedown', (e) => {
            if (e.target.closest('#action-buttons') || e.target.closest('#joystick-zone')) return;
            mouseDown = true;
            this.viewRotateLast = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mousemove', (e) => {
            if (!mouseDown) return;
            const dx = e.clientX - this.viewRotateLast.x;
            const dy = e.clientY - this.viewRotateLast.y;
            this.player.rotateView(-dx * 0.003, -dy * 0.003);
            this.viewRotateLast = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mouseup', () => { mouseDown = false; });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = Math.min(this.clock.getDelta(), 0.1);

        // 检测长按滑铲（仅当奔跑且未开始滑铲时立即触发）
        if (this.inputRaw.slide && !this.slideStartSent && this.player) {
            const dur = performance.now() - this.buttonPressTime.slide;
            if (dur >= 200) {
                // 检查奔跑状态，且未在滑铲冷却期
                if ((this.player.isRunning || this.player.runDecay > 0.5) && this.player.slideCooldown <= 0 && this.player.isGrounded) {
                    this.inputActions.slideAction = 'start';
                    this.slideStartSent = true;
                }
                // 如果不满足条件，不触发滑铲，也不标记，避免松开时错误
            }
        }

        this.inputActions.move = { ...this.inputRaw.move };
        this.inputActions.run = this.inputRaw.run;

        // 仅使用障碍物碰撞，地面检测由 player 独立处理
        const allObs = [...this.obstacles];

        const prevState = this.lastPlayerState;
        const playerState = this.player.update(dt, this.inputActions, allObs);
        this.lastPlayerState = playerState;

        if (this.audioManager) this.audioManager.update(playerState, prevState);

        if (this.skillState.cooldown > 0) {
            this.skillState.cooldown -= dt;
            if (this.skillState.cooldown < 0) this.skillState.cooldown = 0;
        }
        this.updateSkillCooldownUI();

        if (this.dustParticles) {
            const pos = this.dustParticles.geometry.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
                pos[i+1] += (Math.random() - 0.5) * 0.03;
                pos[i] += (Math.random() - 0.5) * 0.04;
                pos[i+2] += (Math.random() - 0.5) * 0.04;
                if (pos[i+1] > 8) pos[i+1] = 0.2;
                if (pos[i+1] < -0.5) pos[i+1] = 7;
                if (Math.abs(pos[i]) > 80) pos[i] *= -0.9;
                if (Math.abs(pos[i+2]) > 80) pos[i+2] *= -0.9;
            }
            this.dustParticles.geometry.attributes.position.needsUpdate = true;
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateSkillCooldownUI() {
        const btn = document.getElementById('btn-skill');
        if (!btn || !this.skillModule) return;
        let cd = btn.querySelector('.cooldown-text');
        if (!cd) {
            cd = document.createElement('span');
            cd.className = 'cooldown-text';
            btn.appendChild(cd);
        }
        if (this.skillState.cooldown > 0) {
            cd.style.display = 'block';
            cd.textContent = this.skillState.cooldown.toFixed(1);
        } else {
            cd.style.display = 'none';
        }
    }

    onResize() {
        if (this.renderer && this.camera) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }
        this.joystickBaseRect = null;
    }
}