// ========== 音乐播放器主文件 ==========
// 功能：酷我音乐API集成、播放器控制、缓存管理
// 版本：2.0 - 酷我API版本
// 日期：2026-01-21

// ========== 配置区域 ==========

/**
 * 酷我音乐API配置
 */
const API_CONFIG = {
    baseUrl: "https://api.yaohud.cn/api/music/kuwo",
    key: "jJskjZNis3gwgsi0ntO", // 您的API密钥
    defaultQuality: "standard", // 音质：standard, exhigh, SQ, lossless, hires
    timeout: 15000, // 15秒超时
    cacheDuration: 2 * 60 * 60 * 1000, // 缓存2小时（与API一致）
    preloadRange: 5, // 预加载前后5首歌曲
    initialLoadCount: 10, // 初始加载10首歌曲
    rateLimit: {
        maxRequests: 10, // 60秒内最多10次请求
        timeWindow: 60 * 1000 // 60秒窗口
    },
    requestDelay: 1000 // 请求间延迟1秒（避免触发频率限制）
};

/**
 * 内置歌单 - 完整150首歌曲列表
 * 格式：{ name: "歌曲名", artist: "歌手名" }
 */
const MUSIC_PLAYLIST = [
    // 第1-20首
    { name: "苍穹之间", artist: "王天戈" },
    { name: "Cymatics", artist: "Nigel Stanford" },
    { name: "Liyue 璃月", artist: "HOYO-MiX、陈致逸" },
    { name: "黑塔", artist: "白翎" },
    { name: "将我葬于梦魇", artist: "三无Marblue" },
    { name: "WUWAHAHAHA(English Version)", artist: "PeachyFranny" },
    { name: "不鼓自鸣", artist: "尚雯婕" },
    { name: "四季-冬", artist: "Antonio Vivaldi、原声带" },
    { name: "我用什么把你留住(Live)", artist: "福禄寿FloruitShow" },
    { name: "轻", artist: "刘雪茗、三体宇宙" },
    
    // 第11-20首
    { name: "歌者", artist: "谭维维" },
    { name: "Bustling Afternoon of Mondstadt 蒙德城繁忙的午后", artist: "陈致逸、HOYO-MiX" },
    { name: "罪人舞步旋 Masquerade of the Guilty", artist: "HOYO-MiX" },
    { name: "尘世乐园 This Side of Paradise", artist: "HOYO-MiX" },
    { name: "戏剧性反讽 A Dramatic Irony", artist: "HOYO-MiX" },
    { name: "天地为枰 Heaven and Earth as a Chessboard", artist: "HOYO-MiX" },
    { name: "神女劈观·唤情 Devastation and Redemption", artist: "HOYO-MiX" },
    { name: "摆渡", artist: "金渔" },
    { name: "Fire Flower", artist: "PeachyFranny" },
    { name: "The Arena", artist: "Lindsey Stirling" },
    
    // 第21-40首
    { name: "Falling Stars", artist: "DVRST、polnalyubvi" },
    { name: "空游无依(On Still Waters)", artist: "The 1999" },
    { name: "独角戏 Monodrama", artist: "HOYO-MiX" },
    { name: "挪德卡莱 Nod-Krai", artist: "HOYO-MiX、AURORA" },
    { name: "傩戏", artist: "一只白羊" },
    { name: "大道不光明", artist: "一只白羊" },
    { name: "DAMIDAMI(中英双语版)", artist: "玹辞、Birdiee" },
    { name: "DAMIDAMI", artist: "Sihan、三Z-STUDIO、HOYO-MiX" },
    { name: "长生咒(梵语)", artist: "乐佩" },
    { name: "轻涟 La vaguelette", artist: "HOYO-MiX" },
    
    // 第41-60首
    { name: "猎罪者", artist: "金渔" },
    { name: "Wellerman(Sea Shanty)", artist: "Nathan Evans" },
    { name: "Walk Thru Fire", artist: "Vicetone、Meron Ryan" },
    { name: "混沌世界", artist: "蓝心羽" },
    { name: "Counting Stars", artist: "OneRepublic" },
    { name: "浑水", artist: "格雷西西西" },
    { name: "Slow Down", artist: "Madnap、Pauline Herr" },
    { name: "虫洞诗", artist: "原子邦妮" },
    { name: "Empires", artist: "Ruelle" },
    { name: "GRRRLS", artist: "AViVA" },
    
    // 第61-80首
    { name: "这世界非乐土", artist: "金渔" },
    { name: "world.execute(me);", artist: "Mili" },
    { name: "骁", artist: "井胧、井迪儿" },
    { name: "不被认可的花", artist: "糯米Nomi" },
    { name: "虞兮叹", artist: "闻人听書_" },
    { name: "道不破", artist: "指尖笑" },
    { name: "Different World", artist: "Alan Walker、K-391、Sofia Carson、CORSAK胡梦周" },
    { name: "Standing When It All Falls Down(Official NiP Team Song)(feat. Roshi)", artist: "John De Sohn、Roshi" },
    { name: "Unstoppable", artist: "Sia" },
    { name: "Escaping Gravity", artist: "TheFatRat、Cecilia Gault" },
    
    // 第81-100首
    { name: "摆渡", artist: "王天戈" },
    { name: "The Calling", artist: "TheFatRat、Laura Brehm" },
    { name: "Victory", artist: "Two Steps From Hell、Thomas Bergersen" },
    { name: "Between Worlds(世界之间)", artist: "Roger Subirana" },
    { name: "Rosabel【The red Coronation Rearrange】", artist: "Cre-sc3NT" },
    { name: "Call Of Silence(Attack On Titan)", artist: "Lo-Fi Luke、Sushi" },
    { name: "疯狂的挣扎", artist: "金渔" },
    { name: "不脱长衫", artist: "承桓、一只白羊" },
    { name: "海底(女版)", artist: "苏贝贝" },
    { name: "歌者", artist: "咻咻满" },
    
    // 第101-120首
    { name: "岁月成碑(Single Edition)", artist: "蔡明希-不才" },
    { name: "夜航星(Night Voyager)", artist: "蔡明希.不才、三体宇宙" },
    { name: "乱世一仗", artist: "一只白羊" },
    { name: "说书", artist: "一只白羊" },
    { name: "室内系的TrackMaker", artist: "hanser" },
    { name: "海底(英文版)", artist: "肖恩Shaun Gibson、Jasmine是茉莉花" },
    { name: "终焉——《十日终焉》同人曲", artist: "今燃、乐攸LIU" },
    { name: "史诗中国", artist: "路南、mAjorHon" },
    { name: "求神呐", artist: "柏鹿" },
    { name: "魑魅", artist: "周林枫" },
    
    // 第121-140首
    { name: "Even Ride", artist: "格温" },
    { name: "Rapture", artist: "dwayne ford" },
    { name: "SCP特殊收容基金会(战歌)", artist: "一只discord球" },
    { name: "In the End", artist: "Marcus Warner" },
    { name: "Never Back Down(Orchestral)", artist: "Two Steps From Hell" },
    { name: "Bad Apple", artist: "Lizz Robinett" },
    { name: "Villanelle", artist: "Jo Blankenburg" },
    { name: "Rush E(Playable)", artist: "Sheet Music Boss" },
    { name: "十面埋伏", artist: "曲中剑" },
    { name: "狂徒", artist: "大宇" },
    
    // 第141-150首（最后10首）
    { name: "Wild", artist: "Monogem" },
    { name: "Believer", artist: "Imagine Dragons" },
    { name: "暮霞", artist: "鹭起Herons" },
    { name: "变戏法", artist: "玥夏" },
    { name: "封神劫", artist: "江隐尘" },
    { name: "扶光", artist: "鹭起Herons" },
    { name: "耍把戏", artist: "阿禹ayy" },
    { name: "戏神道(我不是戏神)", artist: "kk柯文" },
    { name: "Apex", artist: "Far Out" },
    { name: "神说", artist: "心俞" }
];

// ========== 全局状态管理 ==========

/**
 * 音乐播放器状态管理
 */
const MusicPlayerState = {
    // 播放器状态
    audioPlayer: null,
    currentTrackIndex: 0,
    isPlaying: false,
    volume: 0.7,
    isSeeking: false,
    
    // API请求管理
    apiRequestTimestamps: [], // API请求时间记录（用于频率限制）
    activeRequests: 0, // 当前活跃请求数
    
    // 缓存系统
    trackCache: new Map(), // 内存缓存
    loadingTracks: new Set(), // 正在加载的歌曲（防止重复请求）
    
    // DOM元素引用
    elements: {
        playPauseBtn: null,
        prevBtn: null,
        nextBtn: null,
        progressBar: null,
        progress: null,
        currentTimeEl: null,
        durationEl: null,
        volumeSlider: null,
        volumeProgress: null,
        trackTitleEl: null,
        trackArtistEl: null,
        trackAlbumEl: null,
        albumCoverEl: null,
        albumCoverImg: null,
        songList: null,
        fileCountEl: null
    },
    
    // 初始化标记
    initialized: false
};

// ========== 工具函数 ==========

/**
 * 格式化时间（秒 → MM:SS）
 */
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * 计算点击位置百分比（用于进度条和音量条）
 */
function getClickPercentage(event, element) {
    const rect = element.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    return Math.max(0, Math.min(1, clickX / width));
}

/**
 * 修复图片URL格式
 */
function fixImageUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') return '';
    
    // 移除URL中的{size}占位符，替换为实际尺寸
    if (imageUrl.includes('{size}')) {
        return imageUrl.replace('{size}', '480');
    }
    
    // 确保URL协议完整
    if (imageUrl.startsWith('//')) {
        return 'https:' + imageUrl;
    }
    
    return imageUrl;
}

/**
 * 生成缓存键（歌曲名+歌手）
 */
function getCacheKey(track) {
    return `kuwo_${track.name}_${track.artist}`.replace(/[^\w]/g, '_');
}

// ========== 缓存管理系统 ==========

/**
 * 从localStorage加载缓存
 */
function loadCacheFromStorage() {
    try {
        const cacheData = localStorage.getItem('kuwo_music_cache');
        if (cacheData) {
            const parsed = JSON.parse(cacheData);
            const now = Date.now();
            
            // 清理过期缓存
            Object.keys(parsed).forEach(key => {
                if (now - parsed[key].timestamp > API_CONFIG.cacheDuration) {
                    delete parsed[key];
                }
            });
            
            // 加载到内存缓存
            MusicPlayerState.trackCache = new Map(Object.entries(parsed));
            console.log(`从缓存加载了 ${MusicPlayerState.trackCache.size} 首歌曲`);
        }
    } catch (e) {
        console.warn('加载缓存失败:', e);
    }
}

/**
 * 保存缓存到localStorage
 */
function saveCacheToStorage() {
    try {
        const cacheObj = Object.fromEntries(MusicPlayerState.trackCache);
        localStorage.setItem('kuwo_music_cache', JSON.stringify(cacheObj));
    } catch (e) {
        console.warn('保存缓存失败:', e);
    }
}

/**
 * 获取缓存中的歌曲信息
 */
function getCachedTrackInfo(track) {
    const cacheKey = getCacheKey(track);
    const cached = MusicPlayerState.trackCache.get(cacheKey);
    
    if (!cached) return null;
    
    // 检查缓存是否过期
    const isExpired = Date.now() - cached.timestamp > API_CONFIG.cacheDuration;
    if (isExpired) {
        MusicPlayerState.trackCache.delete(cacheKey);
        return null;
    }
    
    return cached;
}

/**
 * 保存歌曲信息到缓存
 */
function saveTrackCache(track, trackInfo) {
    const cacheKey = getCacheKey(track);
    MusicPlayerState.trackCache.set(cacheKey, trackInfo);
    saveCacheToStorage();
}

// ========== API请求管理 ==========

/**
 * 检查是否可以发起API请求（频率限制）
 */
function canMakeApiRequest() {
    const now = Date.now();
    const timeWindow = API_CONFIG.rateLimit.timeWindow;
    
    // 清理过期的请求记录
    MusicPlayerState.apiRequestTimestamps = MusicPlayerState.apiRequestTimestamps.filter(
        timestamp => now - timestamp < timeWindow
    );
    
    // 检查当前窗口内请求数
    const currentRequests = MusicPlayerState.apiRequestTimestamps.length;
    const canRequest = currentRequests < API_CONFIG.rateLimit.maxRequests;
    
    if (!canRequest) {
        console.warn(`频率限制：${timeWindow/1000}秒内已发起 ${currentRequests} 次请求，最大允许 ${API_CONFIG.rateLimit.maxRequests} 次`);
    }
    
    return canRequest;
}

/**
 * 记录API请求时间
 */
function recordApiRequest() {
    MusicPlayerState.apiRequestTimestamps.push(Date.now());
    MusicPlayerState.activeRequests++;
    
    // 定期清理旧的时间戳
    if (MusicPlayerState.apiRequestTimestamps.length > 100) {
        MusicPlayerState.apiRequestTimestamps = MusicPlayerState.apiRequestTimestamps.slice(-50);
    }
}

/**
 * 完成API请求
 */
function completeApiRequest() {
    MusicPlayerState.activeRequests = Math.max(0, MusicPlayerState.activeRequests - 1);
}

/**
 * 调用酷我音乐API获取歌曲信息
 */
async function fetchTrackInfo(track) {
    const cacheKey = getCacheKey(track);
    
    // 如果正在加载，直接返回null
    if (MusicPlayerState.loadingTracks.has(cacheKey)) {
        return null;
    }
    
    // 首先检查缓存
    const cached = getCachedTrackInfo(track);
    if (cached) {
        console.log(`使用缓存: ${track.name}`);
        return { ...cached, fromCache: true };
    }
    
    // 检查API频率限制
    if (!canMakeApiRequest()) {
        console.warn('API频率限制，返回备用信息');
        return getFallbackTrackInfo(track);
    }
    
    // 标记为正在加载
    MusicPlayerState.loadingTracks.add(cacheKey);
    
    try {
        // 构建API请求URL
        const searchQuery = encodeURIComponent(track.name);
        const apiUrl = `${API_CONFIG.baseUrl}?key=${API_CONFIG.key}&msg=${searchQuery}&n=1&size=${API_CONFIG.defaultQuality}`;
        
        console.log(`请求酷我API: ${searchQuery}`);
        
        // 记录请求时间
        recordApiRequest();
        
        // 设置请求超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        
        // 发起请求
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API响应:', result);
        
        if (result.code !== 200) {
            throw new Error(`API错误: ${result.msg || '未知错误'}`);
        }
        
        if (!result.data) {
            throw new Error('API返回数据为空');
        }
        
        // 提取歌曲信息
        const pictureUrl = fixImageUrl(result.data.picture);
        const musicUrl = result.data.vipmusic?.url || '';
        
        const trackInfo = {
            name: result.data.name || track.name,
            artist: result.data.songname || track.artist,
            album: result.data.album || "未知专辑",
            picture: pictureUrl,
            url: musicUrl,
            timestamp: Date.now(),
            fromCache: false,
            isFallback: false
        };
        
        // 保存到缓存
        saveTrackCache(track, trackInfo);
        console.log(`成功获取: ${trackInfo.name} - ${trackInfo.artist}`);
        
        return trackInfo;
        
    } catch (error) {
        console.error(`获取歌曲失败 (${track.name}):`, error.message);
        
        // 返回备用信息
        return getFallbackTrackInfo(track);
        
    } finally {
        // 移除加载标记
        MusicPlayerState.loadingTracks.delete(cacheKey);
        completeApiRequest();
    }
}

/**
 * 获取备用歌曲信息（API失败时使用）
 */
function getFallbackTrackInfo(track) {
    const fallbackInfo = {
        name: track.name,
        artist: track.artist,
        album: "备用专辑",
        picture: "",
        url: "", // 无播放链接
        timestamp: Date.now(),
        isFallback: true,
        fromCache: false
    };
    
    return fallbackInfo;
}

/**
 * 预加载指定范围的歌曲
 */
function preloadTracks(centerIndex) {
    const start = Math.max(0, centerIndex - API_CONFIG.preloadRange);
    const end = Math.min(MUSIC_PLAYLIST.length - 1, centerIndex + API_CONFIG.preloadRange);
    
    console.log(`预加载歌曲 ${start+1} 到 ${end+1}`);
    
    // 异步预加载，添加延迟避免同时发起太多请求
    for (let i = start; i <= end; i++) {
        if (i === centerIndex) continue; // 跳过当前歌曲
        
        const track = MUSIC_PLAYLIST[i];
        const cacheKey = getCacheKey(track);
        
        // 如果未缓存且不在加载中，则获取
        if (!getCachedTrackInfo(track) && !MusicPlayerState.loadingTracks.has(cacheKey)) {
            setTimeout(() => {
                if (canMakeApiRequest()) {
                    fetchTrackInfo(track).catch(() => {
                        // 静默处理错误
                    });
                }
            }, (i - start) * API_CONFIG.requestDelay);
        }
    }
}

/**
 * 初始加载前N首歌曲
 */
async function loadInitialTracks() {
    console.log(`开始初始加载前 ${API_CONFIG.initialLoadCount} 首歌曲`);
    
    const loadPromises = [];
    const end = Math.min(API_CONFIG.initialLoadCount, MUSIC_PLAYLIST.length);
    
    for (let i = 0; i < end; i++) {
        const track = MUSIC_PLAYLIST[i];
        if (!getCachedTrackInfo(track)) {
            loadPromises.push(
                fetchTrackInfo(track).catch(() => {
                    // 静默处理错误
                })
            );
        }
    }
    
    // 分批加载，避免触发API限制
    const batchSize = 2;
    for (let i = 0; i < loadPromises.length; i += batchSize) {
        const batch = loadPromises.slice(i, i + batchSize);
        await Promise.allSettled(batch);
        
        // 批次间延迟
        if (i + batchSize < loadPromises.length) {
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.requestDelay));
        }
    }
    
    console.log(`初始加载完成，共 ${MUSIC_PLAYLIST.length} 首歌曲`);
}

// ========== 播放器核心功能 ==========

/**
 * 加载指定索引的歌曲
 */
async function loadTrack(index) {
    // 验证索引范围
    if (index < 0 || index >= MUSIC_PLAYLIST.length) {
        console.error(`无效的歌曲索引: ${index}`);
        return;
    }
    
    // 更新当前曲目索引
    MusicPlayerState.currentTrackIndex = index;
    const track = MUSIC_PLAYLIST[index];
    
    console.log(`加载歌曲 ${index+1}/${MUSIC_PLAYLIST.length}: ${track.name}`);
    
    // 尝试获取歌曲信息
    const trackInfo = await fetchTrackInfo(track);
    
    if (!trackInfo) {
        console.error('无法获取歌曲信息');
        return;
    }
    
    // 设置音频源
    if (trackInfo.url && trackInfo.url.trim() !== '') {
        MusicPlayerState.audioPlayer.src = trackInfo.url;
        console.log(`音频源设置成功，时长: ${trackInfo.duration || '未知'}`);
    } else {
        MusicPlayerState.audioPlayer.src = '';
        console.warn(`歌曲没有可用的播放地址: ${trackInfo.name}`);
    }
    
    // 更新UI显示
    updateTrackInfo(trackInfo);
    
    // 更新歌曲列表中的活动项
    updateActiveSongInList();
    
    // 重置进度条
    resetProgress();
    
    // 预加载前后歌曲
    preloadTracks(index);
    
    // 如果是播放状态且音频源有效，开始播放
    if (MusicPlayerState.isPlaying && MusicPlayerState.audioPlayer.src) {
        MusicPlayerState.audioPlayer.play().catch(e => {
            console.warn('播放失败:', e.message);
            pauseTrack(); // 播放失败时暂停
        });
    }
    
    // 更新歌曲列表状态
    updateSongListStatus(index, trackInfo.url ? '已加载' : '无链接');
}

/**
 * 更新歌曲信息显示
 */
function updateTrackInfo(trackInfo) {
    const { trackTitleEl, trackArtistEl, trackAlbumEl, albumCoverEl } = MusicPlayerState.elements;
    
    if (!trackTitleEl || !trackArtistEl || !trackAlbumEl || !albumCoverEl) {
        console.warn('UI元素未找到，无法更新歌曲信息');
        return;
    }
    
    // 更新文本信息
    trackTitleEl.textContent = trackInfo.name || '未知歌曲';
    trackArtistEl.textContent = trackInfo.artist || '未知歌手';
    trackAlbumEl.textContent = trackInfo.album || '未知专辑';
    
    // 更新专辑封面
    updateAlbumCover(trackInfo.picture);
}

/**
 * 更新专辑封面
 */
function updateAlbumCover(pictureUrl) {
    const { albumCoverEl } = MusicPlayerState.elements;
    if (!albumCoverEl) return;
    
    // 清空内容
    albumCoverEl.innerHTML = '';
    albumCoverEl.style.backgroundImage = 'none';
    
    if (pictureUrl && pictureUrl.trim() !== '') {
        console.log(`加载专辑封面: ${pictureUrl}`);
        
        // 创建图片元素
        const img = document.createElement('img');
        img.id = 'album-cover-img';
        img.src = pictureUrl;
        img.alt = '专辑封面';
        img.crossOrigin = 'anonymous'; // 解决CORS问题
        
        // 图片加载成功
        img.onload = () => {
            console.log('专辑封面加载成功');
            albumCoverEl.appendChild(img);
            img.style.opacity = '1';
        };
        
        // 图片加载失败
        img.onerror = () => {
            console.warn('专辑封面加载失败，使用默认图标');
            showDefaultAlbumCover();
        };
        
        // 设置3秒超时
        setTimeout(() => {
            if (!albumCoverEl.querySelector('img') && !albumCoverEl.querySelector('i')) {
                console.warn('专辑封面加载超时，使用默认图标');
                showDefaultAlbumCover();
            }
        }, 3000);
        
        albumCoverEl.appendChild(img);
    } else {
        // 没有图片，显示默认图标
        showDefaultAlbumCover();
    }
}

/**
 * 显示默认专辑封面图标
 */
function showDefaultAlbumCover() {
    const { albumCoverEl } = MusicPlayerState.elements;
    if (!albumCoverEl) return;
    
    albumCoverEl.innerHTML = '<i class="fas fa-compact-disc"></i>';
    albumCoverEl.style.display = 'flex';
    albumCoverEl.style.justifyContent = 'center';
    albumCoverEl.style.alignItems = 'center';
    albumCoverEl.style.fontSize = '48px';
    albumCoverEl.style.color = 'rgba(255, 255, 255, 0.7)';
}

/**
 * 重置进度条
 */
function resetProgress() {
    const { progress, currentTimeEl, durationEl } = MusicPlayerState.elements;
    
    if (progress) {
        progress.style.width = '0%';
    }
    
    if (currentTimeEl) {
        currentTimeEl.textContent = '0:00';
    }
    
    if (durationEl) {
        durationEl.textContent = '0:00';
    }
}

/**
 * 播放歌曲
 */
function playTrack() {
    if (!MusicPlayerState.audioPlayer || !MusicPlayerState.audioPlayer.src) {
        console.warn('没有可播放的歌曲');
        return;
    }
    
    MusicPlayerState.isPlaying = true;
    
    MusicPlayerState.audioPlayer.play().then(() => {
        console.log('开始播放');
        updatePlayPauseButton(true);
    }).catch(e => {
        console.warn('播放失败:', e.message);
        pauseTrack(); // 播放失败时暂停
    });
}

/**
 * 暂停歌曲
 */
function pauseTrack() {
    MusicPlayerState.isPlaying = false;
    
    if (MusicPlayerState.audioPlayer) {
        MusicPlayerState.audioPlayer.pause();
    }
    
    updatePlayPauseButton(false);
}

/**
 * 更新播放/暂停按钮状态
 */
function updatePlayPauseButton(isPlaying) {
    const { playPauseBtn } = MusicPlayerState.elements;
    if (!playPauseBtn) return;
    
    if (isPlaying) {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

/**
 * 切换播放/暂停状态
 */
function togglePlayPause() {
    if (!MusicPlayerState.initialized) return;
    
    if (MusicPlayerState.isPlaying) {
        pauseTrack();
    } else {
        playTrack();
    }
}

/**
 * 播放下一首歌曲
 */
async function playNextTrack() {
    if (!MusicPlayerState.initialized || MUSIC_PLAYLIST.length === 0) return;
    
    const nextIndex = (MusicPlayerState.currentTrackIndex + 1) % MUSIC_PLAYLIST.length;
    await loadTrack(nextIndex);
    
    if (MusicPlayerState.isPlaying) {
        playTrack();
    }
}

/**
 * 播放上一首歌曲
 */
async function playPreviousTrack() {
    if (!MusicPlayerState.initialized || MUSIC_PLAYLIST.length === 0) return;
    
    const prevIndex = (MusicPlayerState.currentTrackIndex - 1 + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length;
    await loadTrack(prevIndex);
    
    if (MusicPlayerState.isPlaying) {
        playTrack();
    }
}

/**
 * 更新播放进度显示
 */
function updateProgressDisplay() {
    const { currentTime, duration } = MusicPlayerState.audioPlayer;
    const { progress, currentTimeEl, durationEl } = MusicPlayerState.elements;
    
    if (duration > 0 && progress && !MusicPlayerState.isSeeking) {
        const progressPercent = (currentTime / duration) * 100;
        progress.style.width = `${progressPercent}%`;
        
        if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(currentTime);
        }
    }
    
    // 更新总时长（仅当有变化时）
    if (durationEl && duration > 0 && durationEl.textContent === '0:00') {
        durationEl.textContent = formatTime(duration);
    }
}

/**
 * 设置播放进度
 */
function setPlaybackProgress(event) {
    const { progressBar } = MusicPlayerState.elements;
    if (!progressBar || !MusicPlayerState.audioPlayer) return;
    
    const percentage = getClickPercentage(event, progressBar);
    const duration = MusicPlayerState.audioPlayer.duration;
    
    if (duration) {
        MusicPlayerState.audioPlayer.currentTime = percentage * duration;
    }
}

/**
 * 设置音量
 */
function setVolume(event) {
    const { volumeSlider } = MusicPlayerState.elements;
    if (!volumeSlider || !MusicPlayerState.audioPlayer) return;
    
    const percentage = getClickPercentage(event, volumeSlider);
    
    MusicPlayerState.volume = percentage;
    MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
    updateVolumeDisplay();
}

/**
 * 更新音量显示
 */
function updateVolumeDisplay() {
    const { volumeProgress } = MusicPlayerState.elements;
    if (!volumeProgress) return;
    
    const volumePercent = MusicPlayerState.volume * 100;
    volumeProgress.style.width = `${volumePercent}%`;
}

// ========== 歌曲列表管理 ==========

/**
 * 初始化歌曲列表
 */
function initializeSongList() {
    const { songList, fileCountEl } = MusicPlayerState.elements;
    
    if (!songList) {
        console.warn('歌曲列表容器未找到');
        return;
    }
    
    // 清空列表
    songList.innerHTML = '';
    
    // 更新文件计数
    if (fileCountEl) {
        fileCountEl.textContent = `${MUSIC_PLAYLIST.length} 首歌曲`;
    }
    
    // 添加所有歌曲到列表
    MUSIC_PLAYLIST.forEach((track, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.dataset.index = index;
        
        // 检查是否有缓存
        const cached = getCachedTrackInfo(track);
        const hasInfo = cached && !cached.isFallback && cached.url;
        
        songItem.innerHTML = `
            <div class="song-item-index">${index + 1}</div>
            <div class="song-item-info">
                <div class="song-item-title">${track.name}</div>
                <div class="song-item-artist">${track.artist}</div>
            </div>
            <div class="song-item-duration">${hasInfo ? '已加载' : '未加载'}</div>
        `;
        
        // 添加点击事件
        songItem.addEventListener('click', () => {
            handleSongItemClick(index);
        });
        
        songList.appendChild(songItem);
    });
}

/**
 * 处理歌曲列表项点击
 */
async function handleSongItemClick(index) {
    if (index === MusicPlayerState.currentTrackIndex) {
        // 点击当前歌曲，切换播放状态
        togglePlayPause();
        return;
    }
    
    // 否则加载并播放选中的歌曲
    await loadTrack(index);
    
    // 如果之前是播放状态，继续播放
    if (MusicPlayerState.isPlaying) {
        playTrack();
    }
}

/**
 * 更新活动歌曲在列表中的显示
 */
function updateActiveSongInList() {
    const songItems = document.querySelectorAll('.song-item');
    
    songItems.forEach((item, index) => {
        if (index === MusicPlayerState.currentTrackIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * 更新歌曲列表状态
 */
function updateSongListStatus(index, status) {
    const songItems = document.querySelectorAll('.song-item');
    
    if (songItems[index]) {
        const durationEl = songItems[index].querySelector('.song-item-duration');
        if (durationEl) {
            durationEl.textContent = status;
        }
    }
}

// ========== 事件监听器 ==========

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    const { 
        playPauseBtn, 
        prevBtn, 
        nextBtn, 
        progressBar, 
        volumeSlider 
    } = MusicPlayerState.elements;
    
    // 播放控制按钮事件
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            playPreviousTrack().catch(console.error);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            playNextTrack().catch(console.error);
        });
    }
    
    // 音频元素事件
    if (MusicPlayerState.audioPlayer) {
        MusicPlayerState.audioPlayer.addEventListener('timeupdate', updateProgressDisplay);
        MusicPlayerState.audioPlayer.addEventListener('ended', () => {
            console.log('歌曲播放结束，自动下一首');
            playNextTrack().catch(console.error);
        });
        MusicPlayerState.audioPlayer.addEventListener('loadedmetadata', () => {
            console.log('音频元数据加载完成');
            const { durationEl } = MusicPlayerState.elements;
            if (durationEl) {
                const duration = formatTime(MusicPlayerState.audioPlayer.duration);
                durationEl.textContent = duration;
            }
        });
        MusicPlayerState.audioPlayer.addEventListener('error', (e) => {
            console.error('音频播放错误:', e);
        });
    }
    
    // 进度条事件
    if (progressBar) {
        progressBar.addEventListener('click', setPlaybackProgress);
        
        // 添加拖拽支持
        let isDragging = false;
        
        progressBar.addEventListener('mousedown', (e) => {
            isDragging = true;
            MusicPlayerState.isSeeking = true;
            setPlaybackProgress(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                setPlaybackProgress(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                MusicPlayerState.isSeeking = false;
            }
        });
    }
    
    // 音量控制事件
    if (volumeSlider) {
        volumeSlider.addEventListener('click', setVolume);
    }
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * 处理键盘快捷键
 */
function handleKeyboardShortcuts(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch(event.key) {
        case ' ':
            event.preventDefault();
            togglePlayPause();
            break;
            
        case 'ArrowRight':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                playNextTrack().catch(console.error);
            }
            break;
            
        case 'ArrowLeft':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                playPreviousTrack().catch(console.error);
            }
            break;
            
        case '+':
        case '=':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                MusicPlayerState.volume = Math.min(1, MusicPlayerState.volume + 0.1);
                MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
                updateVolumeDisplay();
            }
            break;
            
        case '-':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                MusicPlayerState.volume = Math.max(0, MusicPlayerState.volume - 0.1);
                MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
                updateVolumeDisplay();
            }
            break;
            
        case 'm':
        case 'M':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                MusicPlayerState.volume = MusicPlayerState.volume > 0 ? 0 : 0.7;
                MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
                updateVolumeDisplay();
            }
            break;
    }
}

// ========== 初始化函数 ==========

/**
 * 初始化音乐播放器
 */
async function initializeMusicPlayer() {
    console.log('开始初始化酷我音乐播放器...');
    
    try {
        // 获取DOM元素引用
        MusicPlayerState.elements = {
            playPauseBtn: document.getElementById('play-pause-btn'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            progressBar: document.getElementById('progress-bar'),
            progress: document.getElementById('progress'),
            currentTimeEl: document.getElementById('current-time'),
            durationEl: document.getElementById('duration'),
            volumeSlider: document.getElementById('volume-slider'),
            volumeProgress: document.getElementById('volume-progress'),
            trackTitleEl: document.getElementById('track-title'),
            trackArtistEl: document.getElementById('track-artist'),
            trackAlbumEl: document.getElementById('track-album'),
            albumCoverEl: document.getElementById('album-cover'),
            songList: document.getElementById('song-list'),
            fileCountEl: document.getElementById('file-count')
        };
        
        // 获取音频元素
        MusicPlayerState.audioPlayer = document.getElementById('audio-player');
        
        if (!MusicPlayerState.audioPlayer) {
            console.error('音频元素未找到！请确保HTML中有<audio id="audio-player">元素');
            return;
        }
        
        console.log('DOM元素加载完成');
        
        // 加载缓存
        loadCacheFromStorage();
        
        // 设置初始音量
        MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
        updateVolumeDisplay();
        
        // 初始化歌曲列表
        initializeSongList();
        
        // 设置事件监听器
        setupEventListeners();
        
        // 标记为已初始化
        MusicPlayerState.initialized = true;
        
        // 初始加载前10首歌曲
        await loadInitialTracks();
        
        // 加载并显示第一首歌曲（不自动播放）
        await loadTrack(0);
        
        console.log('酷我音乐播放器初始化完成！');
        console.log(`共 ${MUSIC_PLAYLIST.length} 首歌曲，${MusicPlayerState.trackCache.size} 首已缓存`);
        
    } catch (error) {
        console.error('音乐播放器初始化失败:', error);
        alert('音乐播放器初始化失败，请检查控制台错误信息');
    }
}

/**
 * 页面加载完成后初始化
 */
function initOnLoad() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeMusicPlayer().catch(console.error);
        });
    } else {
        initializeMusicPlayer().catch(console.error);
    }
}

// ========== 公开API ==========

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MUSIC_PLAYLIST,
        API_CONFIG,
        MusicPlayerState,
        initializeMusicPlayer,
        loadTrack,
        playTrack,
        pauseTrack,
        togglePlayPause,
        playNextTrack,
        playPreviousTrack,
        formatTime,
        getClickPercentage
    };
} else {
    // 浏览器环境 - 添加到全局对象
    window.MusicPlayer = {
        MUSIC_PLAYLIST,
        API_CONFIG,
        MusicPlayerState,
        initializeMusicPlayer,
        loadTrack,
        playTrack,
        pauseTrack,
        togglePlayPause,
        playNextTrack,
        playPreviousTrack
    };
    
    // 自动初始化
    initOnLoad();
}