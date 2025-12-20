[file name]: app.js
[file content begin]
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
    { name: "项目 10", url: "", icon: "fas fa-database" },
    { name: "项目 11", url: "", icon: "fas fa-mobile-alt" },
    { name: "项目 12", url: "", icon: "fas fa-cloud" },
    { name: "项目 13", url: "", icon: "fas fa-code" },
    { name: "项目 14", url: "", icon: "fas fa-lock" },
    { name: "项目 15", url: "", icon: "fas fa-star" }
];

/**
 * 音乐文件配置数组
 * 格式：{ name: "歌曲名", url: "歌曲链接", artist: "歌手名", album: "专辑名" }
 * 注意：这里保留了30个位置，对应原代码中的所有音频文件
 */
const MUSIC_FILES = [
    // 直接使用filelist.txt中的MP3文件
    { name: "未命名星系_星尘原创_奥莉安多幻想曲", url: "https://yingo3.netlify.app/未命名星系/未命名星系_星尘原创_奥莉安多幻想曲.mp3", artist: "在虚无中永存", album: "未命名星系" },
    { name: "oc角色曲合集 (1)", url: "https://yingo3.netlify.app/悦灵音/oc角色曲合集_在虚无中永存 (1).mp3", artist: "在虚无中永存", album: "悦灵音" },
    { name: "oc角色曲合集", url: "https://yingo3.netlify.app/悦灵音/oc角色曲合集_在虚无中永存.mp3", artist: "在虚无中永存", album: "悦灵音" },
    { name: "【纯音乐手风琴改编】死别", url: "https://yingo3.netlify.app/死别/【纯音乐手风琴改编】死别_在虚无中永存.mp3", artist: "在虚无中永存", album: "死别" },
    { name: "【诗岸】幸福安定剂", url: "https://yingo3.netlify.app/混沌，虚无与纯真之歌/【诗岸】幸福安定剂/【诗岸】幸福安定剂_在虚无中永存.mp3", artist: "在虚无中永存", album: "混沌，虚无与纯真之歌" },
    { name: "【诗岸】日记「2025.02.25」", url: "https://yingo3.netlify.app/混沌，虚无与纯真之歌/【诗岸】日记「2025.02.25」/【诗岸】日记「2025.02.25」_在虚无中永存.mp3", artist: "在虚无中永存", album: "混沌，虚无与纯真之歌" },
    { name: "【诗岸】演绎", url: "https://yingo3.netlify.app/混沌，虚无与纯真之歌/【诗岸】演绎/【诗岸】演绎_在虚无中永存.mp3", artist: "在虚无中永存", album: "混沌，虚无与纯真之歌" },
    { name: "序章_「新叶词」", url: "https://yingo3.netlify.app/纯与沌/序章_「新叶词」/序章_「新叶词」_在虚无中永存.mp3", artist: "在虚无中永存", album: "纯与沌" },
    { name: "第一章_「自由之爱」", url: "https://yingo3.netlify.app/纯与沌/第一章_「自由之爱」/第一章_「自由之爱」_在虚无中永存.mp3", artist: "在虚无中永存", album: "纯与沌" },
    { name: "第七章_【皑如山上雪】", url: "https://yingo3.netlify.app/纯与沌/第七章_【皑如山上雪】/第七章_【皑如山上雪】_在虚无中永存.mp3", artist: "在虚无中永存", album: "纯与沌" },
    { name: "第三章_「未完待续」", url: "https://yingo3.netlify.app/纯与沌/第三章_「未完待续」/第三章_「未完待续」_在虚无中永存.mp3", artist: "在虚无中永存", album: "纯与沌" },
    { name: "第二章_「于是你再一次盛开」", url: "https://yingo3.netlify.app/纯与沌/第二章_「于是你再一次盛开」/第二章_「于是你再一次盛开」_在虚无中永存.mp3", artist: "在虚无中永存", album: "纯与沌" },
    { name: "第五章_【夜之声】", url: "https://yingo3.netlify.app/纯与沌/第五章_【夜之声】/第五章_【夜之声】_在虚无中永存.mp3", artist: "在虚无中永存", album: "纯与沌" },
    { name: "第六章_【长生树】", url: "https://yingo3.netlify.app/纯与沌/第六章_【长生树】/第六章_【长生树】_在虚无中永存.mp3", artist: "在虚无中永存", album: "纯与沌" },
    { name: "第四章_「无畏之心」", url: "https://yingo3.netlify.app/纯与沌/第四章_「无畏之心」/第四章_「无畏之心」_在虚无中永存.mp3", artist: "在虚无中永存", album: "纯与沌" },
    { name: "英雄主义", url: "https://yingo3.netlify.app/英雄主义/1.英雄主义/1.英雄主义_在虚无中永存.mp3", artist: "在虚无中永存", album: "英雄主义" },
    { name: "英雄主义pt.2", url: "https://yingo3.netlify.app/英雄主义/英雄主义pt.2/英雄主义pt.2_在虚无中永存.mp3", artist: "在虚无中永存", album: "英雄主义" },
    { name: "英雄主义【完整版】", url: "https://yingo3.netlify.app/英雄主义/英雄主义【完整版】/英雄主义【完整版】_在虚无中永存.mp3", artist: "在虚无中永存", album: "英雄主义" },
    { name: "英雄主义 (诞愿)", url: "https://yingo3.netlify.app/诞愿/1.英雄主义/1.英雄主义_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "再见？", url: "https://yingo3.netlify.app/诞愿/10.再见？/10.再见？_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "你与我的最终曲", url: "https://yingo3.netlify.app/诞愿/11.你与我的最终曲/11.你与我的最终曲_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "向花朵祈愿", url: "https://yingo3.netlify.app/诞愿/12.向花朵祈愿/12.向花朵祈愿_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "荒诞儿戏", url: "https://yingo3.netlify.app/诞愿/13.荒诞儿戏/13.荒诞儿戏_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "眠于春天", url: "https://yingo3.netlify.app/诞愿/14.眠于春天/14.眠于春天_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "晶状星体", url: "https://yingo3.netlify.app/诞愿/15.晶状星体/15.晶状星体_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "清醒梦", url: "https://yingo3.netlify.app/诞愿/2.清醒梦/2.清醒梦_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "泣爱", url: "https://yingo3.netlify.app/诞愿/3.泣爱/3.泣爱_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "你所期盼的春天", url: "https://yingo3.netlify.app/诞愿/4.你所期盼的春天/4.你所期盼的春天_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "失落花园", url: "https://yingo3.netlify.app/诞愿/5.失落花园/5.失落花园_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "新世纪", url: "https://yingo3.netlify.app/诞愿/6.新世纪/6.新世纪_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "旧日里", url: "https://yingo3.netlify.app/诞愿/7.旧日里/7.旧日里_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "记忆之门", url: "https://yingo3.netlify.app/诞愿/8.记忆之门/8.记忆之门_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" },
    { name: "捕星人", url: "https://yingo3.netlify.app/诞愿/9.捕星人/9.捕星人_在虚无中永存.mp3", artist: "在虚无中永存", album: "诞愿" }
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
[file content end]