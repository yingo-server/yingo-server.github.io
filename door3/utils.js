// ========== 工具函数 ==========

/**
 * 格式化时间显示
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间 (MM:SS)
 */
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * 计算点击位置百分比
 * @param {Event} event - 点击事件
 * @param {HTMLElement} element - 元素
 * @returns {number} 百分比 (0-1)
 */
function getClickPercentage(event, element) {
    const rect = element.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    return Math.max(0, Math.min(1, clickX / width));
}

/**
 * 优化图片URL - 修复图片加载问题
 * @param {string} imageUrl - 原始图片URL
 * @returns {string} 修复后的图片URL
 */
function fixImageUrl(imageUrl) {
    if (!imageUrl) return '';
    
    // 确保URL是完整的
    if (imageUrl.startsWith('//')) {
        return 'https:' + imageUrl;
    }
    
    // 如果已经是http或https开头，直接返回
    if (imageUrl.startsWith('http')) {
        return imageUrl;
    }
    
    // 对于相对URL，返回空字符串（使用默认图标）
    return '';
}

/**
 * 从localStorage加载缓存
 * @param {string} key - 缓存键
 * @returns {Object|null} 缓存数据
 */
function loadCacheFromStorage(key) {
    try {
        const cacheData = localStorage.getItem(key);
        if (cacheData) {
            return JSON.parse(cacheData);
        }
    } catch (e) {
        console.warn(`加载缓存失败 (${key}):`, e);
    }
    return null;
}

/**
 * 保存缓存到localStorage
 * @param {string} key - 缓存键
 * @param {Object} data - 要缓存的数据
 */
function saveCacheToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn(`保存缓存失败 (${key}):`, e);
    }
}

/**
 * 检查缓存是否过期
 * @param {Object} cache - 缓存对象
 * @param {number} duration - 缓存时长（毫秒）
 * @returns {boolean} 是否过期
 */
function isCacheExpired(cache, duration = 2 * 60 * 60 * 1000) { // 默认2小时
    if (!cache || !cache.timestamp) return true;
    return Date.now() - cache.timestamp > duration;
}

/**
 * 生成歌曲缓存键
 * @param {Object} track - 歌曲对象
 * @returns {string} 缓存键
 */
function getTrackCacheKey(track) {
    return `track_${track.name}_${track.artist}`.replace(/[^\w]/g, '_');
}

/**
 * 节流函数，避免频繁调用API
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 防抖函数，避免频繁调用API
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * 检测屏幕方向并设置背景图片
 */
function setBackgroundBasedOnOrientation() {
    const landscapeBg = document.querySelector('.landscape-bg');
    const portraitBg = document.querySelector('.portrait-bg');
    
    if (!landscapeBg || !portraitBg) return;
    
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isPortrait) {
        landscapeBg.style.display = 'none';
        portraitBg.style.display = 'block';
    } else {
        landscapeBg.style.display = 'block';
        portraitBg.style.display = 'none';
    }
}

// 导出函数供其他文件使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatTime,
        getClickPercentage,
        fixImageUrl,
        loadCacheFromStorage,
        saveCacheToStorage,
        isCacheExpired,
        getTrackCacheKey,
        throttle,
        debounce,
        setBackgroundBasedOnOrientation
    };
}