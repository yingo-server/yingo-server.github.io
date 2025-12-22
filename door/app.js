/**
 * 项目入口页面 - JavaScript主文件
 * 功能：项目按钮生成、音乐播放器控制、交互处理
 */

// ========== 配置区域 ==========

/**
 * 项目配置数组
 * 格式：{ name: "项目名称", url: "项目链接", icon: "字体图标类名" }
 * 注意：如果url为空字符串""，则该按钮会被隐藏
 */
const PROJECTS = [
    // 实际项目（有URL的）
    { name: "home", url: "https://uegov.worldl", icon: "fas fa-rocket" },
    { name: "我的三体", url: "/3d", icon: "fas fa-gamepad" },
    { name: "三体2", url: "/2d", icon: "fas fa-palette" },
    { name: "永远的单摆", url: "/bai/dev", icon: "fas fa-cube" },
    { name: "单摆", url: "/bai", icon: "fas fa-chart-line" },
    
    // 预留项目（无URL的，将被隐藏）
    { name: "Github主页", url: "http://bgithub.xyz/yingo-server", icon: "fas fa-music" },
    { name: "网站后台", url: "https://yingo2.netlify.app", icon: "fas fa-video" },
    { name: "openlist", url: "/cloud", icon: "fas fa-robot" },
    { name: "聊天室", url: "/chat", icon: "fas fa-globe" },
    { name: "music1", url: "/music", icon: "fas fa-database" },
    { name: "music2", url: "http://yingo6.netlify.app", icon: "fas fa-mobile-alt" },
    { name: "洛伦兹吸引子", url: "/luo", icon: "fas fa-cloud" },
    { name: "追捕", url: "/zhui", icon: "fas fa-code" },
    { name: "项目 14", url: "", icon: "fas fa-lock" },
    { name: "项目 14", url: "", icon: "fas fa-lock" },
    { name: "项目 14", url: "", icon: "fas fa-lock" },
    { name: "项目 14", url: "", icon: "fas fa-lock" },
    { name: "项目 14", url: "", icon: "fas fa-lock" },
    { name: "项目 15", url: "", icon: "fas fa-star" }
];

/**
 * 音乐文件配置数组
 * 格式：{ name: "歌曲名", url: "歌曲链接", artist: "歌手名", album: "专辑名" }
 * 注意：这里保留了30个位置，对应原代码中的所有音频文件
 */
const MUSIC_FILES = [
    // 第1-10首歌曲
    { name: "歌曲 1", url: "https://yingo3.netlify.app/0/1/1.mp3", artist: "在虚无中永存", album: "目录0/1" },
    { name: "歌曲 2", url: "https://yingo3.netlify.app/0/2/1.mp3", artist: "在虚无中永存", album: "目录0/2" },
    { name: "歌曲 3", url: "https://yingo3.netlify.app/0/2/3.mp3", artist: "在虚无中永存", album: "目录0/2" },
    { name: "歌曲 4", url: "https://yingo3.netlify.app/0/3/1.mp3", artist: "在虚无中永存", album: "目录0/3" },
    { name: "歌曲 5", url: "https://yingo3.netlify.app/0/4/4.1/1.mp3", artist: "在虚无中永存", album: "目录0/4/4.1" },
    { name: "歌曲 6", url: "https://yingo3.netlify.app/0/4/4.2/1.mp3", artist: "在虚无中永存", album: "目录0/4/4.2" },
    { name: "歌曲 7", url: "https://yingo3.netlify.app/0/4/4.3/1.mp3", artist: "在虚无中永存", album: "目录0/4/4.3" },
    { name: "歌曲 8", url: "https://yingo3.netlify.app/0/5/5.1/1.mp3", artist: "在虚无中永存", album: "目录0/5/5.1" },
    { name: "歌曲 9", url: "https://yingo3.netlify.app/0/5/5.2/1.mp3", artist: "在虚无中永存", album: "目录0/5/5.2" },
    { name: "歌曲 10", url: "https://yingo3.netlify.app/0/5/5.3/1.mp3", artist: "在虚无中永存", album: "目录0/5/5.3" },
    
    // 第11-20首歌曲
    { name: "歌曲 11", url: "https://yingo3.netlify.app/0/5/5.4/1.mp3", artist: "在虚无中永存", album: "目录0/5/5.4" },
    { name: "歌曲 12", url: "https://yingo3.netlify.app/0/5/5.5/1.mp3", artist: "在虚无中永存", album: "目录0/5/5.5" },
    { name: "歌曲 13", url: "https://yingo3.netlify.app/0/5/5.6/1.mp3", artist: "在虚无中永存", album: "目录0/5/5.6" },
    { name: "歌曲 14", url: "https://yingo3.netlify.app/0/5/5.7/1.mp3", artist: "在虚无中永存", album: "目录0/5/5.7" },
    { name: "歌曲 15", url: "https://yingo3.netlify.app/0/5/5.8/1.mp3", artist: "在虚无中永存", album: "目录0/5/5.8" },
    { name: "歌曲 16", url: "https://yingo3.netlify.app/0/6/6.1/1.mp3", artist: "在虚无中永存", album: "目录0/6/6.1" },
    { name: "歌曲 17", url: "https://yingo3.netlify.app/0/6/6.2/1.mp3", artist: "在虚无中永存", album: "目录0/6/6.2" },
    { name: "歌曲 18", url: "https://yingo3.netlify.app/0/6/6.3/1.mp3", artist: "在虚无中永存", album: "目录0/6/6.3" },
    { name: "歌曲 19", url: "https://yingo3.netlify.app/0/7/7.1/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.1" },
    { name: "歌曲 20", url: "https://yingo3.netlify.app/0/7/7.2/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.2" },
    
    // 第21-30首歌曲（预留位置）
    { name: "歌曲 21", url: "https://yingo3.netlify.app/0/7/7.3/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.3" },
    { name: "歌曲 22", url: "https://yingo3.netlify.app/0/7/7.4/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.4" },
    { name: "歌曲 23", url: "https://yingo3.netlify.app/0/7/7.5/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.5" },
    { name: "歌曲 24", url: "https://yingo3.netlify.app/0/7/7.6/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.6" },
    { name: "歌曲 25", url: "https://yingo3.netlify.app/0/7/7.7/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.7" },
    { name: "歌曲 26", url: "https://yingo3.netlify.app/0/7/7.8/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.8" },
    { name: "歌曲 27", url: "https://yingo3.netlify.app/0/7/7.9/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.9" },
    { name: "歌曲 28", url: "https://yingo3.netlify.app/0/7/7.10/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.10" },
    { name: "歌曲 29", url: "https://yingo3.netlify.app/0/7/7.11/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.11" },
    { name: "歌曲 30", url: "https://yingo3.netlify.app/0/7/7.12/1.mp3", artist: "在虚无中永存", album: "目录0/7/7.12" }
];

// ========== 全局变量 ==========

/**
 * 音乐播放器状态管理
 */
const MusicPlayerState = {
    audioPlayer: null,          // 音频元素引用
    currentTrackIndex: 0,       // 当前播放的曲目索引
    isPlaying: false,           // 播放状态标志
    volume: 0.7,                // 音量值（0-1范围）
    
    // DOM元素引用
    elements: {
        buttonsContainer: null,
        playPauseBtn: null,
        prevBtn: null,
        nextBtn: null,
        progressBar: null,
        progress: null,
        currentTimeEl: null,
        durationEl: null,
        volumeSlider: null,
        volumeProgress: null,
        fileCountEl: null,
        trackTitleEl: null,
        trackArtistEl: null,
        trackAlbumEl: null
    }
};

// ========== 工具函数 ==========

/**
 * 格式化时间显示（秒转换为MM:SS格式）
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * 计算点击位置在元素上的百分比
 * @param {Event} event - 点击事件
 * @param {HTMLElement} element - 目标元素
 * @returns {number} 点击位置的百分比（0-1）
 */
function getClickPercentage(event, element) {
    const rect = element.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    return Math.max(0, Math.min(1, clickX / width));
}

// ========== 项目按钮模块 ==========

/**
 * 初始化项目按钮
 */
function initializeProjectButtons() {
    const container = document.getElementById('buttons-container');
    
    // 清空容器（防止重复初始化）
    container.innerHTML = '';
    
    // 遍历项目配置，创建按钮
    PROJECTS.forEach(project => {
        const btn = document.createElement('a');
        
        if (project.url && project.url.trim() !== '') {
            // 有URL的项目：创建可点击按钮
            btn.href = project.url;
            btn.target = "_blank";
            btn.className = "project-btn";
            btn.innerHTML = `
                <i class="${project.icon}"></i>
                <span>${project.name}</span>
            `;
        } else {
            // 无URL的项目：创建隐藏按钮
            btn.className = "project-btn hidden";
        }
        
        container.appendChild(btn);
    });
}

// ========== 音乐播放器模块 ==========

/**
 * 初始化音乐播放器
 */
function initializeMusicPlayer() {
    // 获取DOM元素引用
    MusicPlayerState.elements = {
        buttonsContainer: document.getElementById('buttons-container'),
        playPauseBtn: document.getElementById('play-pause-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        progressBar: document.getElementById('progress-bar'),
        progress: document.getElementById('progress'),
        currentTimeEl: document.getElementById('current-time'),
        durationEl: document.getElementById('duration'),
        volumeSlider: document.getElementById('volume-slider'),
        volumeProgress: document.getElementById('volume-progress'),
        fileCountEl: document.getElementById('file-count'),
        trackTitleEl: document.getElementById('track-title'),
        trackArtistEl: document.getElementById('track-artist'),
        trackAlbumEl: document.getElementById('track-album')
    };
    
    // 获取音频元素
    MusicPlayerState.audioPlayer = document.getElementById('audio-player');
    
    // 设置初始音量
    MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
    
    // 更新文件计数显示
    updateFileCount();
    
    // 更新音量显示
    updateVolumeDisplay();
    
    // 加载第一首歌曲
    loadTrack(0);
    
    // 设置事件监听器
    setupMusicEventListeners();
}

/**
 * 更新文件计数显示
 */
function updateFileCount() {
    const count = MUSIC_FILES.length;
    MusicPlayerState.elements.fileCountEl.textContent = `${count} 首歌曲`;
}

/**
 * 更新音量显示
 */
function updateVolumeDisplay() {
    const volumePercent = MusicPlayerState.volume * 100;
    MusicPlayerState.elements.volumeProgress.style.width = `${volumePercent}%`;
}

/**
 * 加载指定索引的歌曲
 * @param {number} index - 歌曲索引
 */
function loadTrack(index) {
    // 验证索引范围
    if (index < 0 || index >= MUSIC_FILES.length) {
        console.warn(`无效的歌曲索引: ${index}`);
        return;
    }
    
    // 更新当前曲目索引
    MusicPlayerState.currentTrackIndex = index;
    const track = MUSIC_FILES[index];
    
    // 设置音频源
    MusicPlayerState.audioPlayer.src = track.url;
    
    // 更新UI显示
    updateTrackInfo(track);
    
    // 重置进度条
    resetProgress();
    
    // 如果是播放状态，开始播放
    if (MusicPlayerState.isPlaying) {
        MusicPlayerState.audioPlayer.play();
    }
}

/**
 * 更新歌曲信息显示
 * @param {Object} track - 歌曲对象
 */
function updateTrackInfo(track) {
    MusicPlayerState.elements.trackTitleEl.textContent = track.name;
    MusicPlayerState.elements.trackArtistEl.textContent = track.artist || "在虚无中永存";
    MusicPlayerState.elements.trackAlbumEl.textContent = track.album || "未知专辑";
}

/**
 * 重置进度条
 */
function resetProgress() {
    MusicPlayerState.elements.progress.style.width = '0%';
    MusicPlayerState.elements.currentTimeEl.textContent = '0:00';
    MusicPlayerState.elements.durationEl.textContent = '0:00';
}

/**
 * 播放歌曲
 */
function playTrack() {
    if (MUSIC_FILES.length === 0) {
        console.warn('没有可播放的歌曲');
        return;
    }
    
    MusicPlayerState.isPlaying = true;
    MusicPlayerState.audioPlayer.play();
    MusicPlayerState.elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
}

/**
 * 暂停歌曲
 */
function pauseTrack() {
    MusicPlayerState.isPlaying = false;
    MusicPlayerState.audioPlayer.pause();
    MusicPlayerState.elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
}

/**
 * 切换播放/暂停状态
 */
function togglePlayPause() {
    if (MUSIC_FILES.length === 0) return;
    
    if (MusicPlayerState.isPlaying) {
        pauseTrack();
    } else {
        playTrack();
    }
}

/**
 * 播放下一首歌曲
 */
function playNextTrack() {
    if (MUSIC_FILES.length === 0) return;
    
    const nextIndex = (MusicPlayerState.currentTrackIndex + 1) % MUSIC_FILES.length;
    loadTrack(nextIndex);
    playTrack();
}

/**
 * 播放上一首歌曲
 */
function playPreviousTrack() {
    if (MUSIC_FILES.length === 0) return;
    
    const prevIndex = (MusicPlayerState.currentTrackIndex - 1 + MUSIC_FILES.length) % MUSIC_FILES.length;
    loadTrack(prevIndex);
    playTrack();
}

/**
 * 更新播放进度显示
 */
function updateProgressDisplay() {
    const { currentTime, duration } = MusicPlayerState.audioPlayer;
    
    if (duration > 0) {
        // 计算进度百分比
        const progressPercent = (currentTime / duration) * 100;
        MusicPlayerState.elements.progress.style.width = `${progressPercent}%`;
        
        // 更新时间显示
        MusicPlayerState.elements.currentTimeEl.textContent = formatTime(currentTime);
        MusicPlayerState.elements.durationEl.textContent = formatTime(duration);
    }
}

/**
 * 设置播放进度
 * @param {Event} event - 点击事件
 */
function setPlaybackProgress(event) {
    const percentage = getClickPercentage(event, MusicPlayerState.elements.progressBar);
    const duration = MusicPlayerState.audioPlayer.duration;
    
    if (duration) {
        MusicPlayerState.audioPlayer.currentTime = percentage * duration;
    }
}

/**
 * 设置音量
 * @param {Event} event - 点击事件
 */
function setVolume(event) {
    const percentage = getClickPercentage(event, MusicPlayerState.elements.volumeSlider);
    
    // 更新音量值
    MusicPlayerState.volume = percentage;
    MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
    
    // 更新音量显示
    updateVolumeDisplay();
}

/**
 * 设置音乐播放器事件监听器
 */
function setupMusicEventListeners() {
    const { 
        playPauseBtn, prevBtn, nextBtn, 
        progressBar, volumeSlider 
    } = MusicPlayerState.elements;
    
    // 播放控制按钮事件
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPreviousTrack);
    nextBtn.addEventListener('click', playNextTrack);
    
    // 音频元素事件
    MusicPlayerState.audioPlayer.addEventListener('timeupdate', updateProgressDisplay);
    MusicPlayerState.audioPlayer.addEventListener('ended', playNextTrack);
    MusicPlayerState.audioPlayer.addEventListener('loadedmetadata', () => {
        const duration = formatTime(MusicPlayerState.audioPlayer.duration);
        MusicPlayerState.elements.durationEl.textContent = duration;
    });
    
    // 进度条事件
    progressBar.addEventListener('click', setPlaybackProgress);
    
    // 音量控制事件（修复版本）
    volumeSlider.addEventListener('click', setVolume);
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * 处理键盘快捷键
 * @param {KeyboardEvent} event - 键盘事件
 */
function handleKeyboardShortcuts(event) {
    // 防止在输入框中触发快捷键
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch(event.key) {
        case ' ': // 空格键：播放/暂停
            event.preventDefault();
            togglePlayPause();
            break;
            
        case 'ArrowRight': // 右箭头+Ctrl：下一首
            if (event.ctrlKey) {
                event.preventDefault();
                playNextTrack();
            }
            break;
            
        case 'ArrowLeft': // 左箭头+Ctrl：上一首
            if (event.ctrlKey) {
                event.preventDefault();
                playPreviousTrack();
            }
            break;
            
        case '+': // 增加音量
        case '=':
            if (event.ctrlKey) {
                event.preventDefault();
                MusicPlayerState.volume = Math.min(1, MusicPlayerState.volume + 0.1);
                MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
                updateVolumeDisplay();
            }
            break;
            
        case '-': // 减小音量
            if (event.ctrlKey) {
                event.preventDefault();
                MusicPlayerState.volume = Math.max(0, MusicPlayerState.volume - 0.1);
                MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
                updateVolumeDisplay();
            }
            break;
    }
}

// ========== 页面初始化 ==========

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面初始化开始...');
    
    // 初始化项目按钮
    initializeProjectButtons();
    
    // 初始化音乐播放器
    initializeMusicPlayer();
    
    console.log('页面初始化完成');
    console.log(`加载了 ${PROJECTS.length} 个项目，其中 ${PROJECTS.filter(p => p.url).length} 个可见`);
    console.log(`加载了 ${MUSIC_FILES.length} 首歌曲`);
});

// 导出模块（如果使用模块系统）
// export { initializeProjectButtons, initializeMusicPlayer, MusicPlayerState };