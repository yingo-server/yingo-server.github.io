/**
 * foot.js - 底部音乐播放器 (Material Design 3)
 * 功能：从 GitHub 仓库获取 MP3/PNG，镜像加速，竖屏按钮两排，横屏正常
 * 开关：FOOT_ENABLED (true: 启用; false: 完全静默)
 * 
 * 【已配置仓库 & 镜像代理】
 * owner: yingo-server
 * repo: yingo-server.github.io
 * path: mfile
 * 镜像服务：https://ghproxy.net/raw.githubusercontent.com
 * 
 * 【2026.02.14 修复】
 * - 修复全局点击监听无法卸载的问题（监听器具名存储，destroy 中移除）
 * - 增强 destroy 彻底性：移除所有 audio 事件、清理 DOM 引用
 * - 保留 window.refreshMusicCache 供外部调用刷新歌单
 */
const FOOT_ENABLED = true;

(function() {
    'use strict';

    if (!FOOT_ENABLED) {
        window.__registerExtension?.('foot.js', () => {});
        return;
    }

    // ========== GitHub 仓库配置 ==========
    const GITHUB_REPO = {
        owner: "yingo-server",
        repo: "yingo-server.github.io",
        path: "mfile"
    };

    // ========== 镜像代理配置 ==========
    const MIRROR_PREFIX = "https://ghproxy.net/raw.githubusercontent.com";

    // ========== 常量 ==========
    const CACHE_KEY = 'musicPlayerCache';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时
    const TOAST_DURATION = 3000;

    // ========== 全局状态 ==========
    let audio = null;
    let playlist = [];
    let currentIndex = 0;
    let isPlaying = false;
    let loopMode = 'list';
    let volumeVisible = false;

    // ========== DOM 元素 ==========
    let footerElement = null;
    let styleElement = null;
    let toastElement = null;
    let toastTimer = null;
    let volumeSliderContainer = null;
    let volumeIcon = null;
    let progressBar = null;
    let progressFilled = null;
    let currentTimeEl = null;
    let durationEl = null;
    let playPauseBtn = null;
    let loopBtn = null;
    let trackTitleEl = null;

    // ========== 工具函数：转换为镜像 URL ==========
    function getMirrorUrl(originalUrl) {
        if (!originalUrl) return null;
        const match = originalUrl.match(/raw\.githubusercontent\.com\/(.+)$/i);
        if (match) {
            return `${MIRROR_PREFIX}/${match[1]}`;
        }
        return originalUrl;
    }

    // ========== GitHub API 请求（带24h缓存）==========
    async function fetchMusicList(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        return data;
                    }
                } catch (e) {}
            }
        }

        const apiUrl = `https://api.github.com/repos/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/contents/${GITHUB_REPO.path}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`API错误 ${response.status}`);
            const files = await response.json();

            const mp3Files = files.filter(f => f.name.endsWith('.mp3'));
            const pngFiles = files.filter(f => f.name.endsWith('.png'));

            const list = mp3Files.map(mp3 => {
                const baseName = mp3.name.slice(0, -4);
                const png = pngFiles.find(p => p.name === baseName + '.png');
                return {
                    name: baseName,
                    mp3Url: getMirrorUrl(mp3.download_url),
                    pngUrl: png ? getMirrorUrl(png.download_url) : null
                };
            });

            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: list,
                timestamp: Date.now()
            }));
            return list;
        } catch (error) {
            console.error('获取音乐列表失败:', error);
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data } = JSON.parse(cached);
                return data;
            }
            return [];
        }
    }

    // ========== 全局刷新缓存（供设置面板调用）==========
    window.refreshMusicCache = async function() {
        localStorage.removeItem(CACHE_KEY);
        const newList = await fetchMusicList(true);
        if (newList.length > 0) {
            playlist = newList;
            currentIndex = 0;
            loadTrack(currentIndex);
            showToast('歌单已刷新');
        }
    };

    // ========== 内嵌样式（MD3 + 竖屏两排适配）==========
    function injectStyles() {
        if (styleElement) return;
        styleElement = document.createElement('style');
        styleElement.setAttribute('data-module', 'foot.js');
        styleElement.textContent = `
            /* ----- 底部播放器 MD3 ----- */
            #app-footer {
                flex: 0 0 auto;
                width: 100%;
                margin-top: auto;
                background: var(--md3-surface-container-low, #F7F2FA);
                border-top: 1px solid var(--md3-outline-variant, #CAC4D0);
                box-sizing: border-box;
            }
            .music-player {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 16px;
                max-width: 1200px;
                margin: 0 auto;
                gap: 12px;
                background: var(--md3-surface-container-low, #F7F2FA);
                color: var(--md3-on-surface, #1C1B1F);
                min-height: 72px;
            }
            .player-cover {
                flex: 0 0 56px;
                height: 56px;
                border-radius: var(--md3-shape-corner-small, 8px);
                background: var(--md3-surface-variant, #E7E0EC);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }
            .player-cover img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .player-cover .material-symbols-outlined {
                font-size: 32px;
                color: var(--md3-on-surface-variant, #49454F);
            }
            .player-info {
                flex: 1 1 auto;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .track-title {
                font: var(--md3-title-small, 500 1rem/1.5rem Roboto);
                color: var(--md3-on-surface, #1C1B1F);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .progress-area {
                display: flex;
                align-items: center;
                gap: 8px;
                font: var(--md3-body-small, 400 0.75rem/1rem Roboto);
                color: var(--md3-on-surface-variant, #49454F);
                min-width: 180px;
            }
            .progress-bar-container {
                flex: 1;
                height: 4px;
                background: var(--md3-surface-variant, #E7E0EC);
                border-radius: var(--md3-shape-corner-full, 999px);
                position: relative;
                cursor: pointer;
            }
            .progress-filled {
                width: 0%;
                height: 100%;
                background: var(--md3-primary, #6750A4);
                border-radius: var(--md3-shape-corner-full, 999px);
                transition: width 0.1s;
            }
            .player-controls {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .control-btn {
                background: transparent;
                border: none;
                color: var(--md3-on-surface-variant, #49454F);
                width: 40px;
                height: 40px;
                border-radius: var(--md3-shape-corner-full, 999px);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background 0.2s;
            }
            .control-btn:hover {
                background: var(--md3-state-layer-hover, rgba(28,27,31,0.08));
            }
            .control-btn.active {
                color: var(--md3-primary, #6750A4);
            }
            .control-btn .material-symbols-outlined {
                font-size: 24px;
                font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 40;
            }
            .volume-wrapper {
                position: relative;
                display: flex;
                align-items: center;
            }
            .volume-slider-popup {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                margin-bottom: 8px;
                background: var(--md3-surface, #FEF7FF);
                padding: 12px;
                border-radius: var(--md3-shape-corner-medium, 12px);
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                display: none;
                width: 140px;
                border: 1px solid var(--md3-outline-variant, #CAC4D0);
            }
            .volume-slider-popup.show {
                display: block;
            }
            .volume-slider {
                width: 100%;
                height: 4px;
                background: var(--md3-surface-variant, #E7E0EC);
                border-radius: var(--md3-shape-corner-full, 999px);
                -webkit-appearance: none;
                appearance: none;
            }
            .volume-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: var(--md3-primary, #6750A4);
                border-radius: var(--md3-shape-corner-full, 999px);
                cursor: pointer;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .music-toast {
                position: fixed;
                top: 16px;
                right: 16px;
                background: var(--md3-inverse-surface, #313033);
                color: var(--md3-inverse-on-surface, #F4EFF4);
                padding: 12px 20px;
                border-radius: var(--md3-shape-corner-medium, 12px);
                font: var(--md3-body-medium, 400 0.875rem/1.25rem Roboto);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 2000;
                max-width: 300px;
                pointer-events: none;
                transition: opacity 0.2s;
            }

            /* ========== 竖屏适配：按钮两排 ========== */
            @media (max-width: 480px) {
                .music-player {
                    flex-wrap: wrap;
                    padding: 12px 12px;
                }
                .player-cover {
                    flex: 0 0 48px;
                    height: 48px;
                }
                .player-info {
                    flex: 1 1 calc(100% - 64px);
                    min-width: 0;
                }
                .progress-area {
                    min-width: 140px;
                    font-size: 11px;
                }
                .player-controls {
                    flex: 0 0 100%;
                    justify-content: center;
                    margin-top: 8px;
                    flex-wrap: wrap;
                    gap: 12px;
                }
                .control-btn {
                    width: 44px;
                    height: 44px;
                }
                .volume-slider-popup {
                    bottom: 120%;
                    left: 0;
                    transform: none;
                }
            }
        `;
        document.head.appendChild(styleElement);
    }

    // ========== 创建播放器 DOM ==========
    function createPlayer() {
        const existing = document.getElementById('app-footer');
        if (existing) existing.remove();

        footerElement = document.createElement('footer');
        footerElement.id = 'app-footer';
        footerElement.innerHTML = `
            <div class="music-player">
                <div class="player-cover" id="player-cover">
                    <span class="material-symbols-outlined">music_note</span>
                </div>
                <div class="player-info">
                    <div class="track-title" id="track-title">未播放</div>
                    <div class="progress-area">
                        <span id="current-time">0:00</span>
                        <div class="progress-bar-container" id="progress-bar">
                            <div class="progress-filled" id="progress-filled"></div>
                        </div>
                        <span id="duration">0:00</span>
                    </div>
                </div>
                <div class="player-controls">
                    <button class="control-btn" id="loop-btn">
                        <span class="material-symbols-outlined">repeat</span>
                    </button>
                    <button class="control-btn" id="prev-btn">
                        <span class="material-symbols-outlined">skip_previous</span>
                    </button>
                    <button class="control-btn" id="play-pause-btn">
                        <span class="material-symbols-outlined">play_arrow</span>
                    </button>
                    <button class="control-btn" id="next-btn">
                        <span class="material-symbols-outlined">skip_next</span>
                    </button>
                    <div class="volume-wrapper">
                        <button class="control-btn" id="volume-icon">
                            <span class="material-symbols-outlined">volume_up</span>
                        </button>
                        <div class="volume-slider-popup" id="volume-popup">
                            <input type="range" class="volume-slider" id="volume-slider" min="0" max="1" step="0.01" value="0.7">
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(footerElement);

        trackTitleEl = document.getElementById('track-title');
        progressBar = document.getElementById('progress-bar');
        progressFilled = document.getElementById('progress-filled');
        currentTimeEl = document.getElementById('current-time');
        durationEl = document.getElementById('duration');
        playPauseBtn = document.getElementById('play-pause-btn');
        loopBtn = document.getElementById('loop-btn');
        volumeIcon = document.getElementById('volume-icon');
        volumeSliderContainer = document.getElementById('volume-popup');
        const volumeSlider = document.getElementById('volume-slider');

        audio.volume = 0.7;
        volumeSlider.value = 0.7;

        bindEvents();
    }

    // ========== 事件绑定 ==========
    function bindEvents() {
        playPauseBtn.addEventListener('click', togglePlay);
        document.getElementById('prev-btn').addEventListener('click', playPrev);
        document.getElementById('next-btn').addEventListener('click', playNext);
        loopBtn.addEventListener('click', toggleLoopMode);
        progressBar.addEventListener('click', seek);

        volumeIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleVolumePopup();
        });

        const volumeSlider = document.getElementById('volume-slider');
        volumeSlider.addEventListener('input', (e) => {
            audio.volume = parseFloat(e.target.value);
            updateVolumeIcon();
        });

        // 【修复】全局点击监听：具名函数，存储到 audio 对象上以便卸载
        audio._docClickHandler = (e) => {
            if (!volumeIcon.contains(e.target) && !volumeSliderContainer.contains(e.target)) {
                volumeSliderContainer.classList.remove('show');
                volumeVisible = false;
            }
        };
        document.addEventListener('click', audio._docClickHandler);

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(audio.duration);
        });
        audio.addEventListener('ended', handleTrackEnd);
    }

    // ========== 音量弹窗 ==========
    function toggleVolumePopup() {
        if (volumeVisible) {
            volumeSliderContainer.classList.remove('show');
        } else {
            volumeSliderContainer.classList.add('show');
        }
        volumeVisible = !volumeVisible;
    }

    function updateVolumeIcon() {
        const icon = volumeIcon.querySelector('.material-symbols-outlined');
        if (audio.volume === 0) {
            icon.textContent = 'volume_off';
        } else if (audio.volume < 0.5) {
            icon.textContent = 'volume_down';
        } else {
            icon.textContent = 'volume_up';
        }
    }

    // ========== 加载歌曲 ==========
    async function loadTrack(index) {
        if (!playlist.length) return;
        if (index < 0) index = playlist.length - 1;
        if (index >= playlist.length) index = 0;
        currentIndex = index;
        const track = playlist[currentIndex];

        // 更新封面
        if (track.pngUrl) {
            const img = document.createElement('img');
            img.src = track.pngUrl;
            img.alt = track.name;
            img.onerror = () => {
                const coverDiv = document.querySelector('.player-cover');
                coverDiv.innerHTML = '<span class="material-symbols-outlined">music_note</span>';
            };
            const coverDiv = document.querySelector('.player-cover');
            coverDiv.innerHTML = '';
            coverDiv.appendChild(img);
        } else {
            const coverDiv = document.querySelector('.player-cover');
            coverDiv.innerHTML = '<span class="material-symbols-outlined">music_note</span>';
        }

        trackTitleEl.textContent = track.name;
        audio.src = track.mp3Url;
        audio.load();
        showToast(`正在播放：${track.name}`);
    }

    // ========== 播放控制 ==========
    function togglePlay() {
        if (!playlist.length) return;
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            playPauseBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
        } else {
            if (!audio.src && playlist.length > 0) {
                loadTrack(currentIndex);
            }
            audio.play().then(() => {
                isPlaying = true;
                playPauseBtn.innerHTML = '<span class="material-symbols-outlined">pause</span>';
            }).catch(() => {});
        }
    }

    function playPrev() {
        if (!playlist.length) return;
        let newIndex;
        if (loopMode === 'random') {
            newIndex = Math.floor(Math.random() * playlist.length);
        } else {
            newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = playlist.length - 1;
        }
        loadTrack(newIndex);
        if (isPlaying) audio.play();
    }

    function playNext() {
        if (!playlist.length) return;
        let newIndex;
        if (loopMode === 'random') {
            newIndex = Math.floor(Math.random() * playlist.length);
        } else {
            newIndex = (currentIndex + 1) % playlist.length;
        }
        loadTrack(newIndex);
        if (isPlaying) audio.play();
    }

    function handleTrackEnd() {
        if (loopMode === 'single') {
            audio.currentTime = 0;
            audio.play();
        } else {
            playNext();
        }
    }

    function toggleLoopMode() {
        const modes = ['list', 'single', 'random'];
        const nextIndex = (modes.indexOf(loopMode) + 1) % modes.length;
        loopMode = modes[nextIndex];
        const icon = loopBtn.querySelector('.material-symbols-outlined');
        switch (loopMode) {
            case 'list':
                icon.textContent = 'repeat';
                loopBtn.classList.remove('active');
                break;
            case 'single':
                icon.textContent = 'repeat_one';
                loopBtn.classList.add('active');
                break;
            case 'random':
                icon.textContent = 'shuffle';
                loopBtn.classList.add('active');
                break;
        }
    }

    // ========== 进度条 ==========
    function updateProgress() {
        if (!audio.duration) return;
        const percent = (audio.currentTime / audio.duration) * 100;
        progressFilled.style.width = percent + '%';
        currentTimeEl.textContent = formatTime(audio.currentTime);
    }

    function seek(e) {
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percent = Math.max(0, Math.min(1, clickX / width));
        audio.currentTime = percent * audio.duration;
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // ========== 弹窗 ==========
    function showToast(text) {
        if (toastTimer) clearTimeout(toastTimer);
        if (!toastElement) {
            toastElement = document.createElement('div');
            toastElement.className = 'music-toast';
            document.body.appendChild(toastElement);
        }
        toastElement.textContent = text;
        toastElement.style.opacity = '1';
        toastTimer = setTimeout(() => {
            toastElement.style.opacity = '0';
        }, TOAST_DURATION);
    }

    // ========== 初始化 ==========
    async function init() {
        audio = new Audio();
        playlist = await fetchMusicList();
        if (playlist.length === 0) {
            console.warn('未获取到音乐文件');
            return;
        }

        injectStyles();
        createPlayer();
        loadTrack(0);

        // 尝试自动播放
        audio.play().then(() => {
            isPlaying = true;
            playPauseBtn.innerHTML = '<span class="material-symbols-outlined">pause</span>';
            showToast(`正在播放：${playlist[0].name}`);
        }).catch(() => {
            isPlaying = false;
        });
    }

    // ========== 销毁函数（完全清理）==========
    function destroy() {
        // 1. 暂停并清除音频
        if (audio) {
            audio.pause();
            audio.src = '';
            
            // 移除所有 audio 事件监听
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', () => {});
            audio.removeEventListener('ended', handleTrackEnd);
            
            // 移除全局文档点击监听
            if (audio._docClickHandler) {
                document.removeEventListener('click', audio._docClickHandler);
                delete audio._docClickHandler;
            }
            
            audio = null;
        }

        // 2. 移除 DOM 元素
        if (footerElement?.parentNode) {
            footerElement.parentNode.removeChild(footerElement);
            footerElement = null;
        }
        if (styleElement?.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
            styleElement = null;
        }
        if (toastElement?.parentNode) {
            toastElement.parentNode.removeChild(toastElement);
            toastElement = null;
        }

        // 3. 清除定时器
        if (toastTimer) {
            clearTimeout(toastTimer);
            toastTimer = null;
        }

        // 4. 清除变量引用
        volumeSliderContainer = null;
        volumeIcon = null;
        progressBar = null;
        progressFilled = null;
        currentTimeEl = null;
        durationEl = null;
        playPauseBtn = null;
        loopBtn = null;
        trackTitleEl = null;
        playlist = [];
        currentIndex = 0;
        isPlaying = false;
        loopMode = 'list';
        volumeVisible = false;
    }

    init();
    window.__registerExtension?.('foot.js', destroy);
})();