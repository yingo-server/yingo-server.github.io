(function() {
    // ---------- 配置 ----------
    const API_BASE = 'https://kapi.344977.xyz';
    let TOKEN = null;
    let USERID = null;
    let DFID = null;

    // DOM 元素
    let homePage, myPage, playlistPage, searchPage, loginOverlay, minibar, fullPlayer;

    // 播放器状态
    let audio = new Audio();
    let currentPlaylist = [];
    let currentIndex = -1;
    let playing = false;
    let mode = 0; // 0列表 1单曲 2随机

    // 歌词相关
    let currentLyrics = [];
    let currentLyricIndex = -1;
    let lyricsContainer = null;

    // 歌单分页（自动加载）
    let currentPlaylistId = null;
    let currentPlaylistTotal = 0;
    let currentPlaylistMaxPage = 1;
    let playlistSongs = [];
    let autoLoadTimer = null;
    let currentLoadingPage = null;
    let isAutoLoading = false;

    // 验证码倒计时
    let cdTimer = null;
    let cdNum = 0;

    // ---------- 缓存管理器 ----------
    const CacheManager = {
        memoryCache: new Map(),

        set(key, data, ttlSeconds = 31536000, useLocalStorage = false) {
            const expireTime = Date.now() + ttlSeconds * 1000;
            const cacheItem = { data, expireTime };
            if (useLocalStorage) {
                try {
                    localStorage.setItem(key, JSON.stringify(cacheItem));
                } catch(e) { console.warn('localStorage set failed', e); }
            } else {
                this.memoryCache.set(key, cacheItem);
            }
        },

        get(key, useLocalStorage = false) {
            let cacheItem = null;
            if (useLocalStorage) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    try {
                        cacheItem = JSON.parse(raw);
                    } catch(e) {}
                }
            } else {
                cacheItem = this.memoryCache.get(key);
            }
            if (cacheItem && cacheItem.expireTime > Date.now()) {
                return cacheItem.data;
            }
            if (useLocalStorage && cacheItem) localStorage.removeItem(key);
            else if (!useLocalStorage && cacheItem) this.memoryCache.delete(key);
            return null;
        },

        clearPrefix(prefix, useLocalStorage = false) {
            if (useLocalStorage) {
                Object.keys(localStorage).forEach(k => {
                    if (k.startsWith(prefix)) localStorage.removeItem(k);
                });
            } else {
                for (let k of this.memoryCache.keys()) {
                    if (k.startsWith(prefix)) this.memoryCache.delete(k);
                }
            }
        },

        clearPlaylistCache(listid) {
            this.clearPrefix(`playlist_tracks_${listid}_`, true);
            this.set(`playlist_total_${listid}`, null, 0, true);
        }
    };

    // ---------- 工具 ----------
    function toast(msg, isError = false) {
        let el = document.querySelector('.toast');
        if (!el) {
            el = document.createElement('div');
            el.className = 'toast';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        if (isError) el.style.borderLeftColor = '#ff4444';
        else el.style.borderLeftColor = 'var(--accent)';
        el.classList.add('show');
        clearTimeout(el._timer);
        el._timer = setTimeout(() => el.classList.remove('show'), 4000);
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return '00:00';
        let m = Math.floor(sec / 60);
        let s = Math.floor(sec % 60);
        return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }

    function imgUrl(url, size = 240) {
        if (!url) return '';
        return url.replace(/\{size\}/g, String(size));
    }

    function setImage(el, url, fallback = '---') {
        if (!el) return;
        if (!url) { el.textContent = fallback; return; }
        let img = new Image();
        img.onload = () => { el.innerHTML = ''; el.appendChild(img); };
        img.onerror = () => { el.textContent = fallback; };
        img.src = imgUrl(url);
    }

    function updatePlayBtn() {
        let icon = playing ? 'fa-pause' : 'fa-play';
        let miniBtn = document.querySelector('#minibarPlayBtn i');
        let mainBtn = document.querySelector('#playerMainPlay i');
        if (miniBtn) miniBtn.className = `fas ${icon}`;
        if (mainBtn) mainBtn.className = `fas ${icon}`;
    }

    function bindAudioEvents() {
        audio.onplay = () => {
            playing = true;
            updatePlayBtn();
        };
        audio.onpause = () => {
            playing = false;
            updatePlayBtn();
        };
        audio.onended = () => {
            if (mode === 1) {
                audio.currentTime = 0;
                audio.play();
            } else {
                next();
            }
        };
        audio.ontimeupdate = () => {
            if (playing) updateProgressAndLyrics();
        };
    }

    function updateProgressAndLyrics() {
        let cur = audio.currentTime;
        let dur = audio.duration || 0;
        document.querySelector('#playerTimeCur').textContent = formatTime(cur);
        document.querySelector('#playerTimeTotal').textContent = formatTime(dur);
        let percent = (cur / dur) * 100;
        let fill = document.querySelector('#playerProgressFill');
        if (fill) fill.style.width = percent + '%';
        
        if (currentLyrics.length) {
            let newIndex = -1;
            for (let i = currentLyrics.length - 1; i >= 0; i--) {
                if (cur >= currentLyrics[i].time) {
                    newIndex = i;
                    break;
                }
            }
            if (newIndex !== currentLyricIndex) {
                currentLyricIndex = newIndex;
                renderThreeLyrics();
                let miniLyric = document.querySelector('#minibarLyric');
                if (miniLyric && currentLyricIndex >= 0) {
                    miniLyric.textContent = currentLyrics[currentLyricIndex].text;
                } else if (miniLyric) {
                    miniLyric.textContent = '';
                }
            }
        }
    }

    function renderThreeLyrics() {
        if (!lyricsContainer) return;
        const prev = currentLyricIndex > 0 ? currentLyrics[currentLyricIndex - 1].text : '';
        const current = currentLyricIndex >= 0 ? currentLyrics[currentLyricIndex].text : '';
        const next = currentLyricIndex + 1 < currentLyrics.length ? currentLyrics[currentLyricIndex + 1].text : '';
        lyricsContainer.innerHTML = `
            <div class="lyric-line prev">${escapeHtml(prev) || '　'}</div>
            <div class="lyric-line current">${escapeHtml(current) || '...'}</div>
            <div class="lyric-line next">${escapeHtml(next) || '　'}</div>
        `;
    }

    function escapeHtml(str) {
        if (str == null || str === undefined) return '';
        str = String(str);
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ---------- 歌词获取 ----------
    async function fetchLyric(hash) {
        try {
            let searchRes = await request('/search/lyric', { hash });
            let candidates = searchRes.candidates || [];
            if (!candidates.length) return [];
            let cand = candidates[0];
            let lyricRes = await request('/lyric', { id: cand.id, accesskey: cand.accesskey, fmt: 'lrc', decode: 'true' });
            let lrcText = lyricRes.decodeContent || lyricRes.content;
            if (!lrcText) return [];
            return parseLrc(lrcText);
        } catch(e) {
            console.warn('歌词获取失败', e);
            return [];
        }
    }

    function parseLrc(lrcText) {
        const lines = lrcText.split(/\r?\n/);
        const lyrics = [];
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
        for (let line of lines) {
            let match = timeRegex.exec(line);
            if (match) {
                let minutes = parseInt(match[1]);
                let seconds = parseInt(match[2]);
                let millis = parseInt(match[3].padEnd(3, '0'));
                let time = minutes * 60 + seconds + millis / 1000;
                let text = line.replace(timeRegex, '').trim();
                if (text) lyrics.push({ time, text });
            }
        }
        if (!lyrics.length && lrcText.trim()) {
            lyrics.push({ time: 0, text: lrcText.trim() });
        }
        return lyrics;
    }

    async function loadSongLyric(hash) {
        currentLyrics = await fetchLyric(hash);
        currentLyricIndex = -1;
        renderThreeLyrics();
        if (currentLyrics.length === 0) {
            document.querySelector('#minibarLyric').textContent = '纯音乐';
        } else {
            updateProgressAndLyrics();
        }
    }

    // ---------- 核心请求 ----------
    async function request(path, params = {}, skipCache = false, cacheTtl = null, cacheKey = null) {
        if (!DFID) {
            const ok = await ensureDfid();
            if (!ok) throw new Error('无法获取设备标识');
        }
        if (!skipCache && cacheKey) {
            const cached = CacheManager.get(cacheKey);
            if (cached) return cached;
        }
        let url = new URL(path, API_BASE);
        params.timestamp = Date.now();
        let cookieParts = [`dfid=${DFID}`];
        if (TOKEN && USERID) {
            cookieParts.push(`token=${TOKEN}`);
            cookieParts.push(`userid=${USERID}`);
        }
        params.cookie = cookieParts.join(';');
        Object.keys(params).forEach(k => {
            if (params[k] !== undefined && params[k] !== null && params[k] !== '')
                url.searchParams.set(k, String(params[k]));
        });
        try {
            let resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
            let json = await resp.json();
            let isSuccess = (json.status === 1 || json.status === 200 || json.error_code === 0);
            if (json.status === 2) {
                console.warn(`${path} 需要登录, status=2`);
                if (path !== '/user/detail' && path !== '/user/vip/detail' && path !== '/user/playlist') {
                    toast('请先登录', true);
                    loginOverlay.classList.add('show');
                }
                return null;
            }
            if (!isSuccess && json.error_code !== 20010 && json.status !== 2) {
                toast(`${path}: ${json.message || json.errmsg || `错误码${json.error_code}`}`, true);
            }
            if (!skipCache && cacheKey && isSuccess && cacheTtl) {
                CacheManager.set(cacheKey, json, cacheTtl);
            }
            return json;
        } catch (e) {
            toast(`请求失败: ${e.message}`, true);
            throw e;
        }
    }

    // ---------- dfid 管理 ----------
    function loadDfid() {
        const stored = localStorage.getItem('dfid');
        if (stored) {
            DFID = stored;
            return true;
        }
        return false;
    }

    async function fetchAndCacheDfid() {
        try {
            let url = new URL('/register/dev', API_BASE);
            url.searchParams.set('timestamp', Date.now());
            let resp = await fetch(url);
            let json = await resp.json();
            if (json.status === 1 && json.data && json.data.dfid) {
                DFID = json.data.dfid;
                localStorage.setItem('dfid', DFID);
                toast('设备标识获取成功');
                return true;
            } else {
                toast('获取 dfid 失败：' + (json.message || '未知错误'), true);
                return false;
            }
        } catch (e) {
            toast('获取 dfid 网络错误', true);
            return false;
        }
    }

    async function ensureDfid() {
        if (loadDfid()) return true;
        return await fetchAndCacheDfid();
    }

    // ---------- 认证管理 ----------
    function loadAuth() {
        const auth = localStorage.getItem('auth');
        if (auth) {
            try {
                const obj = JSON.parse(auth);
                if (obj.expire > Date.now()) {
                    TOKEN = obj.token;
                    USERID = obj.userid;
                    return true;
                } else {
                    localStorage.removeItem('auth');
                }
            } catch(e) {}
        }
        return false;
    }

    function saveAuth(token, userid) {
        const expire = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('auth', JSON.stringify({ token, userid, expire }));
        TOKEN = token;
        USERID = userid;
    }

    function clearAuth() {
        localStorage.removeItem('auth');
        TOKEN = null;
        USERID = null;
    }

    // ---------- 登录相关 ----------
    async function sendCode(mobile) {
        startCD(60);
        let res;
        try {
            res = await request('/captcha/sent', { mobile });
        } catch (e) {
            stopCD();
            toast('发送验证码失败: ' + e.message, true);
            return;
        }
        if (res?.error_code === 20015) {
            stopCD();
            toast('该号码发送的短信数已经超过上限', true);
        } else if (res?.status === 1) {
            toast('验证码已发送');
        } else {
            stopCD();
            toast(res?.message || '发送失败', true);
        }
    }

    function startCD(seconds) {
        if (cdTimer) clearInterval(cdTimer);
        cdNum = seconds;
        const btn = document.getElementById('loginSendBtn');
        if (!btn) return;
        btn.disabled = true;
        btn.textContent = `${cdNum}秒`;
        cdTimer = setInterval(() => {
            cdNum--;
            if (cdNum <= 0) {
                clearInterval(cdTimer);
                cdTimer = null;
                btn.disabled = false;
                btn.textContent = '获取验证码';
            } else {
                btn.textContent = `${cdNum}秒`;
            }
        }, 1000);
    }

    function stopCD() {
        if (cdTimer) {
            clearInterval(cdTimer);
            cdTimer = null;
        }
        const btn = document.getElementById('loginSendBtn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '获取验证码';
        }
    }

    async function loginWithCode(mobile, code) {
        let res = await request('/login/cellphone', { mobile, code });
        if (res?.data?.token) {
            saveAuth(res.data.token, res.data.userid);
            toast('登录成功');
            loginOverlay.classList.remove('show');
            loadMyPage();
            loadHome();
            return true;
        }
        toast('登录失败：' + (res?.message || '未知错误'), true);
        return false;
    }

    async function loginWithPassword(username, password) {
        let res = await request('/login', { username, password: encodeURIComponent(password) });
        if (res?.data?.token) {
            saveAuth(res.data.token, res.data.userid);
            toast('登录成功');
            loginOverlay.classList.remove('show');
            loadMyPage();
            loadHome();
            return true;
        }
        toast('登录失败：' + (res?.message || '未知错误'), true);
        return false;
    }

    let qrTimer = null;
    async function startQR() {
        let keyRes = await request('/login/qr/key');
        let key = keyRes?.data?.key;
        if (!key) {
            toast('获取二维码key失败', true);
            return;
        }
        let qrRes = await request('/login/qr/create', { key, qrimg: 1 });
        let imgData = qrRes?.data?.qrcode_img;
        if (!imgData) {
            toast('二维码生成失败：未返回图片数据', true);
            return;
        }
        let qrBox = document.querySelector('#loginQrBox');
        if (qrBox) {
            qrBox.innerHTML = `<img src="${imgData}" style="width:100%;height:auto;">`;
        }
        if (qrTimer) clearInterval(qrTimer);
        qrTimer = setInterval(async () => {
            let check = await request('/login/qr/check', { key });
            let status = check?.data?.status;
            if (status === 4) {
                clearInterval(qrTimer);
                if (check?.data?.token) {
                    saveAuth(check.data.token, check.data.userid);
                    toast('扫码登录成功');
                    loginOverlay.classList.remove('show');
                    loadMyPage();
                    loadHome();
                }
            } else if (status === 0) {
                clearInterval(qrTimer);
                toast('二维码已过期', true);
            } else if (status === 2) {
                if (qrBox) qrBox.innerHTML = '<span>已扫码，请确认</span>';
            }
        }, 2000);
    }
    function stopQR() { if (qrTimer) clearInterval(qrTimer); }

    // ---------- URL 提取辅助 ----------
    function extractPlayableUrl(res) {
        function findFirst(arr) {
            if (!Array.isArray(arr)) return null;
            for (let u of arr) {
                if (u && typeof u === 'string' && !u.includes('.mgg') && !u.includes('.mflac')) {
                    return u;
                }
            }
            return null;
        }
        if (res.url) return findFirst(res.url);
        if (res.backupUrl) return findFirst(res.backupUrl);
        if (Array.isArray(res.data) && res.data[0] && res.data[0].info && res.data[0].info.tracker_url) {
            return findFirst(res.data[0].info.tracker_url);
        }
        if (res.data && res.data.url) return findFirst(res.data.url);
        if (res.data && res.data.backupUrl) return findFirst(res.data.backupUrl);
        return null;
    }

    async function getSongUrl(song) {
        const { hash, album_audio_id, album_id } = song;
        if (!hash) {
            toast('歌曲哈希缺失', true);
            return null;
        }
        const cacheKey = `song_url_${hash}`;
        let cached = CacheManager.get(cacheKey);
        if (cached) {
            toast('使用缓存链接');
            return cached;
        }
        toast('尝试 320k 链接...');
        let params320 = { hash, quality: '320' };
        if (album_audio_id) params320.album_audio_id = album_audio_id;
        if (album_id) params320.album_id = album_id;
        let res320 = await request('/song/url', params320);
        let url = extractPlayableUrl(res320);
        if (url) {
            toast('成功获取 320k 链接');
            CacheManager.set(cacheKey, url, 86400);
            return url;
        } else {
            toast('320k 失败，尝试128k', true);
        }
        let params128 = { hash, quality: '128' };
        if (album_audio_id) params128.album_audio_id = album_audio_id;
        if (album_id) params128.album_id = album_id;
        let res128 = await request('/song/url', params128);
        url = extractPlayableUrl(res128);
        if (url) {
            toast('成功获取 128k 链接');
            CacheManager.set(cacheKey, url, 86400);
            return url;
        }
        toast('尝试新版接口...');
        let resNew = await request('/song/url/new', { hash });
        url = extractPlayableUrl(resNew);
        if (url) {
            toast('成功获取新版试听链接');
            CacheManager.set(cacheKey, url, 86400);
            return url;
        }
        toast('尝试 64k...');
        let params64 = { hash, quality: '64' };
        if (album_audio_id) params64.album_audio_id = album_audio_id;
        if (album_id) params64.album_id = album_id;
        let res64 = await request('/song/url', params64);
        url = extractPlayableUrl(res64);
        if (url) {
            toast('成功获取 64k 链接');
            CacheManager.set(cacheKey, url, 86400);
            return url;
        }
        toast('正则暴力提取...');
        let allResponses = [];
        for (let q of ['320','128','64']) {
            let p = { hash, quality: q };
            if (album_audio_id) p.album_audio_id = album_audio_id;
            if (album_id) p.album_id = album_id;
            let fu = new URL('/song/url', API_BASE);
            p.timestamp = Date.now();
            p.cookie = `dfid=${DFID}`;
            if (TOKEN && USERID) p.cookie = `token=${TOKEN};userid=${USERID};dfid=${DFID}`;
            Object.keys(p).forEach(k=>fu.searchParams.set(k, p[k]));
            try { let r=await fetch(fu); let t=await r.text(); allResponses.push(t); } catch(e){}
        }
        let fuNew = new URL('/song/url/new', API_BASE);
        let pNew = { hash, timestamp: Date.now(), cookie: `dfid=${DFID}` };
        if (TOKEN && USERID) pNew.cookie = `token=${TOKEN};userid=${USERID};dfid=${DFID}`;
        Object.keys(pNew).forEach(k=>fuNew.searchParams.set(k, pNew[k]));
        try { let r=await fetch(fuNew); let t=await r.text(); allResponses.push(t); } catch(e){}
        let fullText = allResponses.join('\n');
        let matches = fullText.match(/https?:\/\/[^\s"']+\.(mp3|flac)/gi);
        if (matches && matches.length) {
            matches.sort((a,b)=>a.length-b.length);
            toast('正则匹配成功');
            CacheManager.set(cacheKey, matches[0], 86400);
            return matches[0];
        }
        toast('所有方式均失败', true);
        return null;
    }

    // 播放核心（修复：确保 currentPlaylist 引用自动更新）
    async function playSong(song, playlist, idx) {
        if (!song.hash) { toast('歌曲标识缺失', true); return; }
        // 如果 playlist 是 playlistSongs 的引用，后面会同步
        currentPlaylist = playlist;
        currentIndex = idx;
        let url = await getSongUrl(song);
        if (!url) { toast('无法获取播放链接', true); return; }
        audio.src = url;
        audio.crossOrigin = 'anonymous';
        try {
            await audio.play();
            updateMiniBar(song);
            updatePlayerCover(song);
            loadSongLyric(song.hash);
            // 如果是歌单且未加载完，继续自动加载
            if (currentPlaylistId && playlistSongs.length > 0 && playlistSongs.length < currentPlaylistTotal && !isAutoLoading) {
                startAutoLoadPlaylist();
            }
        } catch (e) {
            toast(`直接播放失败，尝试转换: ${e.message}`, true);
            try {
                let resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                let blob = await resp.blob();
                let blobUrl = URL.createObjectURL(blob);
                audio.src = blobUrl;
                await audio.play();
                updateMiniBar(song);
                updatePlayerCover(song);
                loadSongLyric(song.hash);
                if (currentPlaylistId && playlistSongs.length > 0 && playlistSongs.length < currentPlaylistTotal && !isAutoLoading) {
                    startAutoLoadPlaylist();
                }
            } catch (e2) {
                toast('播放失败: ' + e2.message, true);
            }
        }
    }

    function updateMiniBar(song) {
        document.querySelector('#minibarTitle').textContent = `${song.name} - ${song.singer}`;
        setImage(document.querySelector('#minibarCover'), song.cover);
        document.querySelector('#minibarLyric').textContent = '加载歌词...';
    }

    function updatePlayerCover(song) {
        setImage(document.querySelector('#playerCover'), song.cover);
    }

    function togglePlay() {
        if (playing) audio.pause();
        else audio.play().catch(e=>toast(e.message,true));
    }

    function next() {
        if (!currentPlaylist.length) return;
        let idx = mode === 2 ? Math.floor(Math.random() * currentPlaylist.length) : (currentIndex + 1) % currentPlaylist.length;
        playSong(currentPlaylist[idx], currentPlaylist, idx);
    }

    function prev() {
        if (!currentPlaylist.length) return;
        let idx = mode === 2 ? Math.floor(Math.random() * currentPlaylist.length) : (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        playSong(currentPlaylist[idx], currentPlaylist, idx);
    }

    function cycleMode() {
        mode = (mode + 1) % 3;
        let btn = document.querySelector('#playerModeBtn');
        if (btn) btn.style.opacity = mode === 0 ? '0.5' : '1';
        let names = ['列表循环', '单曲循环', '随机'];
        toast(names[mode]);
    }

    function seekProgress(e) {
        let bar = document.getElementById('playerProgressBar');
        let rect = bar.getBoundingClientRect();
        let percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = audio.duration * Math.min(1, Math.max(0, percent));
    }

    // ---------- 歌单自动加载核心逻辑（修正版）----------
    // 仅从缓存读取并填充 playlistSongs，不渲染（渲染由调用方完成）
    function tryRestorePlaylistFromCache() {
        const missingPages = [];
        const pageDataMap = new Map();
        for (let page = 1; page <= currentPlaylistMaxPage; page++) {
            const cacheKey = `playlist_tracks_${currentPlaylistId}_page${page}`;
            const pageData = CacheManager.get(cacheKey, true);
            if (pageData && pageData.data && pageData.data.info && pageData.data.info.length > 0) {
                let rows = pageData.data.info;
                let mapped = rows.map(r => normalizeSong(r)).reverse();
                pageDataMap.set(page, mapped);
            } else {
                missingPages.push(page);
            }
        }
        if (missingPages.length === 0) {
            let allSongs = [];
            for (let p = currentPlaylistMaxPage; p >= 1; p--) {
                const pageSongs = pageDataMap.get(p);
                if (pageSongs) allSongs.push(...pageSongs);
            }
            playlistSongs = allSongs;
            return true;
        }
        return false;
    }

    async function startAutoLoadPlaylist() {
        if (!currentPlaylistId) return;
        if (isAutoLoading) return;
        if (playlistSongs.length >= currentPlaylistTotal) {
            updateLoadStatus('已加载全部歌曲');
            return;
        }
        isAutoLoading = true;
        let loadedCount = playlistSongs.length;
        let loadedPages = Math.floor(loadedCount / 50);
        let nextPageToLoad = currentPlaylistMaxPage - loadedPages;
        if (nextPageToLoad < 1) nextPageToLoad = 1;
        currentLoadingPage = nextPageToLoad;
        await loadPageAndSchedule(currentLoadingPage);
    }

    async function loadPageAndSchedule(page) {
        if (page < 1) {
            updateLoadStatus('已加载全部歌曲');
            isAutoLoading = false;
            currentLoadingPage = null;
            if (autoLoadTimer) clearTimeout(autoLoadTimer);
            autoLoadTimer = null;
            return;
        }
        const currentPageIndex = currentPlaylistMaxPage - page + 1;
        updateLoadStatus(`正在加载第${currentPageIndex}/${currentPlaylistMaxPage}页...`);
        await loadOnePlaylistPage(page);
        if (page > 1 && playlistSongs.length < currentPlaylistTotal) {
            autoLoadTimer = setTimeout(() => {
                loadPageAndSchedule(page - 1);
            }, 2000);
        } else {
            updateLoadStatus('已加载全部歌曲');
            isAutoLoading = false;
            currentLoadingPage = null;
        }
    }

    async function loadOnePlaylistPage(page) {
        if (page < 1 || page > currentPlaylistMaxPage) return;
        const cacheKey = `playlist_tracks_${currentPlaylistId}_page${page}`;
        let res = CacheManager.get(cacheKey, true);
        if (!res) {
            res = await request('/playlist/track/all/new', { listid: currentPlaylistId, page: page, pagesize: 50 }, false, 86400*30, cacheKey); // 30天缓存
            if (res && res.data && res.data.info) {
                CacheManager.set(cacheKey, res, 86400*30, true);
            }
        }
        let rows = res?.data?.info || [];
        if (rows.length === 0) return;
        let mapped = rows.map(r => normalizeSong(r)).reverse();
        if (playlistSongs.length === 0) {
            playlistSongs = mapped;
        } else {
            playlistSongs = [...playlistSongs, ...mapped];
        }
        renderPlaylistSongs(); // 每次加载完一页就刷新UI
        // 同步更新当前播放列表（如果当前播放的正是这个歌单）
        if (currentPlaylistId && currentPlaylist === currentPlaylist) {
            // 如果 currentPlaylist 是指向旧数组，需要重新指向
            currentPlaylist = playlistSongs;
        }
    }

    function updateLoadStatus(text) {
        const statusDiv = document.getElementById('plLoadStatus');
        if (statusDiv) statusDiv.textContent = text;
    }

    function stopAutoLoad() {
        if (autoLoadTimer) {
            clearTimeout(autoLoadTimer);
            autoLoadTimer = null;
        }
        isAutoLoading = false;
        currentLoadingPage = null;
    }

    function renderPlaylistSongs() {
        const listEl = document.getElementById('plSongList');
        if (!listEl) return;
        listEl.innerHTML = '';
        playlistSongs.forEach((s, idx) => {
            let div = document.createElement('div');
            div.className = 'song-item';
            div.onclick = () => playSong(s, playlistSongs, idx);
            div.innerHTML = `<div class="index">${idx+1}</div><div class="info"><div class="name">${escapeHtml(s.name)}</div><div class="singer">${escapeHtml(s.singer)}</div></div>`;
            listEl.appendChild(div);
        });
    }

    // 打开歌单（修复缓存恢复后不显示）
    async function openPlaylist(pl) {
        stopAutoLoad();
        currentPlaylistId = pl.listid;
        currentPlaylistTotal = pl.count;
        currentPlaylistMaxPage = Math.ceil(currentPlaylistTotal / 50);
        
        const cachedTotal = CacheManager.get(`playlist_total_${currentPlaylistId}`, true);
        if (cachedTotal !== null && cachedTotal !== currentPlaylistTotal) {
            CacheManager.clearPlaylistCache(currentPlaylistId);
        }
        CacheManager.set(`playlist_total_${currentPlaylistId}`, currentPlaylistTotal, 86400*30, true); // 30天
        
        const restored = tryRestorePlaylistFromCache();
        
        // 构建DOM
        playlistPage.innerHTML = `
            <div style="display:flex;padding:12px 16px;gap:12px;border-bottom:1px solid var(--border-subtle);">
                <div style="cursor:pointer;" id="plBack"><i class="fas fa-arrow-left"></i></div>
                <div style="flex:1;">${escapeHtml(pl.name)} (${currentPlaylistTotal}首)</div>
                <div style="cursor:pointer;color:var(--accent);" id="plPlayAll">全部播放</div>
            </div>
            <div class="song-list" id="plSongList"></div>
            <div id="plLoadStatus" style="text-align:center;padding:14px;color:var(--text-hint);">${restored ? '已加载全部歌曲' : '准备加载...'}</div>
        `;
        document.getElementById('plBack').onclick = () => switchView('my');
        document.getElementById('plPlayAll').onclick = () => { if(playlistSongs.length) playSong(playlistSongs[0], playlistSongs, 0); };
        switchView('playlist');
        
        if (restored) {
            // 缓存完整，直接渲染
            renderPlaylistSongs();
            updateLoadStatus('已加载全部歌曲');
            // 同步当前播放列表
            if (currentPlaylistId && currentPlaylist === currentPlaylist) {
                currentPlaylist = playlistSongs;
            }
        } else {
            // 缓存不完整，开始自动加载
            playlistSongs = [];
            renderPlaylistSongs();
            await startAutoLoadPlaylist();
        }
    }

    // ---------- UI 构建 ----------
    function buildUI() {
        const appDiv = document.getElementById('app');
        appDiv.innerHTML = `
            <div id="homePage" class="page active"></div>
            <div id="myPage" class="page"></div>
            <div id="playlistPage" class="page"></div>
            <div id="searchPage" class="search-page"></div>
            <div id="loginOverlay" class="login-overlay"></div>
            <div class="tabbar">
                <div class="tabbar-item" data-page="home"><i class="fas fa-home"></i><span>首页</span></div>
                <div class="tabbar-item" data-page="my"><i class="fas fa-user"></i><span>我的</span></div>
            </div>
            <div class="minibar" id="minibar">
                <div class="minibar-cover" id="minibarCover">---</div>
                <div class="minibar-info">
                    <div class="minibar-title" id="minibarTitle">未播放</div>
                    <div class="minibar-lyric" id="minibarLyric">点击播放</div>
                </div>
                <div class="minibar-btn" id="minibarPlayBtn"><i class="fas fa-play"></i></div>
            </div>
            <div class="player-full" id="fullPlayer">
                <div class="player-close" id="playerClose"><i class="fas fa-times"></i></div>
                <div class="player-cover" id="playerCover">---</div>
                <div class="player-lyrics-container" id="playerLyricsContainer"></div>
                <div class="player-progress-row">
                    <span class="player-time" id="playerTimeCur">00:00</span>
                    <div class="player-progress" id="playerProgressBar"><div class="player-progress-fill"></div></div>
                    <span class="player-time" id="playerTimeTotal">00:00</span>
                </div>
                <div class="player-controls">
                    <div class="player-ctrl-btn" id="playerModeBtn"><i class="fas fa-redo-alt"></i></div>
                    <div class="player-ctrl-btn" id="playerPrevBtn"><i class="fas fa-step-backward"></i></div>
                    <div class="player-ctrl-btn main-play" id="playerMainPlay"><i class="fas fa-play"></i></div>
                    <div class="player-ctrl-btn" id="playerNextBtn"><i class="fas fa-step-forward"></i></div>
                    <div class="player-ctrl-btn" id="playerListBtn"><i class="fas fa-list-ul"></i></div>
                </div>
                <div class="playlist-overlay" id="playlistOverlay">
                    <div class="playlist-panel" id="playlistPanel"></div>
                </div>
            </div>
        `;
        homePage = document.getElementById('homePage');
        myPage = document.getElementById('myPage');
        playlistPage = document.getElementById('playlistPage');
        searchPage = document.getElementById('searchPage');
        loginOverlay = document.getElementById('loginOverlay');
        minibar = document.getElementById('minibar');
        fullPlayer = document.getElementById('fullPlayer');
        lyricsContainer = document.getElementById('playerLyricsContainer');

        document.querySelectorAll('.tabbar-item').forEach(t => {
            t.addEventListener('click', () => switchView(t.dataset.page));
        });
        minibar.addEventListener('click', () => showFullPlayer());
        document.getElementById('minibarPlayBtn').addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
        document.getElementById('playerClose').addEventListener('click', hideFullPlayer);
        document.getElementById('playerModeBtn').addEventListener('click', cycleMode);
        document.getElementById('playerPrevBtn').addEventListener('click', prev);
        document.getElementById('playerMainPlay').addEventListener('click', togglePlay);
        document.getElementById('playerNextBtn').addEventListener('click', next);
        document.getElementById('playerListBtn').addEventListener('click', showPlaylistPanel);
        document.getElementById('playerProgressBar').addEventListener('click', seekProgress);
        document.getElementById('playlistOverlay').addEventListener('click', (e) => { if(e.target.id === 'playlistOverlay') hidePlaylistPanel(); });

        buildHomePage();
        buildSearchPage();
        buildLoginDialog();
    }

    function switchView(view) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(view+'Page').classList.add('active');
        document.querySelectorAll('.tabbar-item').forEach(t => t.classList.toggle('active', t.dataset.page === view));
        if (view === 'my') loadMyPage();
        if (view !== 'playlist') {
            stopAutoLoad();
        }
    }

    function showFullPlayer() { fullPlayer.classList.add('show'); document.body.style.overflow = 'hidden'; }
    function hideFullPlayer() { fullPlayer.classList.remove('show'); document.body.style.overflow = ''; }
    function showPlaylistPanel() {
        let panel = document.getElementById('playlistPanel');
        panel.innerHTML = '';
        currentPlaylist.forEach((s, i) => {
            let div = document.createElement('div');
            div.className = 'playlist-item' + (i === currentIndex ? ' current' : '');
            div.innerHTML = `<div>${i+1}</div><div><div>${escapeHtml(s.name)}</div><div>${escapeHtml(s.singer)}</div></div>`;
            div.onclick = () => { playSong(s, currentPlaylist, i); hidePlaylistPanel(); };
            panel.appendChild(div);
        });
        document.getElementById('playlistOverlay').classList.add('show');
    }
    function hidePlaylistPanel() { document.getElementById('playlistOverlay').classList.remove('show'); }

    // 首页
    async function buildHomePage() {
        homePage.innerHTML = `
            <div class="search-bar" id="homeSearch"><i class="fas fa-search"></i><span>搜索音乐</span></div>
            <div><div class="section-title">每日推荐</div><div class="scroll-h" id="dailyScroll"></div></div>
            <div><div class="section-title">猜你喜欢</div><div class="song-list" id="fmList"></div></div>
            <div><div class="section-title">新歌速递</div><div class="song-list" id="hotList"></div></div>
        `;
        document.getElementById('homeSearch').onclick = () => searchPage.classList.add('show');
        await loadHome();
    }

    async function loadHome() {
        try {
            const today = new Date().toISOString().slice(0,10);
            const dailyKey = `daily_recommend_${today}`;
            let daily = CacheManager.get(dailyKey);
            if (!daily) {
                let secondsUntilMidnight = (new Date().setHours(23,59,59,999) - Date.now()) / 1000;
                daily = await request('/everyday/recommend', { platform: 'ios' }, false, secondsUntilMidnight, dailyKey);
            }
            const fmKey = `personal_fm`;
            let fm = CacheManager.get(fmKey);
            if (!fm) {
                fm = await request('/personal/fm', { mode: 'normal' }, false, 600, fmKey);
            }
            const hotKey = `top_song`;
            let hot = CacheManager.get(hotKey);
            if (!hot) {
                hot = await request('/top/song', {}, false, 600, hotKey);
            }
            renderScroll('dailyScroll', daily?.data?.song_list || []);
            renderList('fmList', fm?.data?.song_list || []);
            renderList('hotList', (hot?.data || []).slice(0,20));
        } catch(e) { toast('首页加载失败', true); }
    }

    function renderScroll(containerId, songs) {
        let container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        songs.forEach(s => {
            let song = normalizeSong(s);
            let card = document.createElement('div');
            card.className = 'song-card';
            card.onclick = () => playSong(song, songs.map(normalizeSong), songs.indexOf(s));
            card.innerHTML = `
                <div class="cover">${song.cover ? `<img src="${imgUrl(song.cover)}">` : '---'}</div>
                <div class="name">${escapeHtml(song.name)}</div>
                <div class="singer">${escapeHtml(song.singer)}</div>
            `;
            container.appendChild(card);
        });
    }

    function renderList(containerId, songs) {
        let container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        songs.forEach((s, idx) => {
            let song = normalizeSong(s);
            let div = document.createElement('div');
            div.className = 'song-item';
            div.onclick = () => playSong(song, songs.map(normalizeSong), idx);
            div.innerHTML = `<div class="index">${idx+1}</div><div class="info"><div class="name">${escapeHtml(song.name)}</div><div class="singer">${escapeHtml(song.singer)}</div></div>`;
            container.appendChild(div);
        });
    }

    function normalizeSong(raw) {
        let name = raw.SongName || raw.songname || raw.name || raw.FileName || '未知';
        let singer = raw.SingerName || raw.author_name || raw.singer || raw.author || (raw.authors?.[0]?.author_name) || '';
        let hash = raw.FileHash || raw.hash || (raw.HQ?.Hash) || raw.hash_320 || raw.hash_128 || '';
        let cover = raw.Image || raw.album_sizable_cover || raw.cover || raw.imgurl || raw.trans_param?.union_cover || '';
        let album_audio_id = raw.album_audio_id || raw.mixsongid || raw.Audioid || '';
        let album_id = raw.album_id || raw.AlbumID || '';
        return { name, singer, hash, cover, album_audio_id, album_id };
    }

    // 我的页面
    async function loadMyPage() {
        if (!TOKEN) {
            toast('请先登录', true);
            loginOverlay.classList.add('show');
            return;
        }
        myPage.innerHTML = `<div style="padding:40px;text-align:center;">加载中...</div>`;
        try {
            const userKey = `user_detail_${USERID}`;
            let userRes = CacheManager.get(userKey, true);
            if (!userRes) {
                userRes = await request('/user/detail', {}, false, 12*3600, userKey);
            }
            const vipKey = `user_vip_detail_${USERID}`;
            let vipRes = CacheManager.get(vipKey, true);
            if (!vipRes) {
                vipRes = await request('/user/vip/detail', {}, false, 12*3600, vipKey);
            }
            const playlistKey = `user_playlist_${USERID}`;
            let playlistRes = CacheManager.get(playlistKey, true);
            if (!playlistRes) {
                playlistRes = await request('/user/playlist', {}, false, 12*3600, playlistKey);
            }

            if (!userRes || userRes.status !== 1) {
                toast('获取用户信息失败，请重新登录', true);
                loginOverlay.classList.add('show');
                return;
            }

            let u = userRes.data || {};
            let v = (vipRes && vipRes.data) ? vipRes.data : {};
            let pls = (playlistRes && playlistRes.data && playlistRes.data.info) ? playlistRes.data.info : [];

            myPage.innerHTML = `
                <div class="my-header">
                    <div class="my-avatar" id="myAvatar">${u.pic ? `<img src="${imgUrl(u.pic,120)}">` : '---'}</div>
                    <div class="my-info">
                        <div class="my-nickname">${escapeHtml(u.nickname)}</div>
                        <div class="my-meta">关注 ${escapeHtml(u.follows)}  |  粉丝 ${escapeHtml(u.fans)}</div>
                        ${v.is_vip ? '<div class="my-vip">VIP</div>' : ''}
                    </div>
                </div>
                <div class="my-detail-toggle" id="detailToggle">详细信息 <i class="fas fa-chevron-down"></i></div>
                <div class="my-detail-content" id="detailContent"></div>
                <div id="myPlaylist"></div>
            `;

            let detailRows = [
                ['昵称', u.nickname],
                ['所在地', u.loc || '未知'],
                ['性别', u.gender===1?'男':u.gender===2?'女':'未设置'],
                ['简介', u.descri || '无'],
                ['VIP类型', v.vip_type],
                ['VIP到期', v.vip_end_time || '--']
            ];
            let cont = document.getElementById('detailContent');
            cont.innerHTML = '';
            detailRows.forEach(([l, val]) => {
                let row = document.createElement('div');
                row.className = 'detail-row';
                row.innerHTML = `<span>${escapeHtml(l)}</span><span>${escapeHtml(val)}</span>`;
                cont.appendChild(row);
            });

            document.getElementById('detailToggle').onclick = () => {
                document.getElementById('detailContent').classList.toggle('show');
            };

            let plContainer = document.getElementById('myPlaylist');
            plContainer.innerHTML = '';
            if (pls.length === 0) {
                plContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-hint)">暂无歌单</div>';
            } else {
                pls.forEach(pl => {
                    let div = document.createElement('div');
                    div.className = 'playlist-item';
                    div.onclick = () => openPlaylist(pl);
                    div.innerHTML = `<div class="playlist-cover">${pl.pic ? `<img src="${imgUrl(pl.pic,100)}">` : '---'}</div><div><div>${escapeHtml(pl.name)}</div><div>${escapeHtml(pl.count)}首</div></div>`;
                    plContainer.appendChild(div);
                });
            }
        } catch(e) {
            console.error('我的页面加载异常', e);
            toast('加载我的页面失败: ' + (e.message || '未知错误'), true);
        }
    }

    // 搜索页面
    function buildSearchPage() {
        searchPage.innerHTML = `
            <div class="search-top">
                <input class="search-input" id="searchInput" placeholder="搜索歌曲">
                <span class="search-cancel" id="searchCancel">取消</span>
            </div>
            <div class="search-results song-list" id="searchResults"></div>
        `;
        let input = document.getElementById('searchInput');
        let searchTimeout = null;
        input.addEventListener('input', async () => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                let kw = input.value.trim();
                let resDiv = document.getElementById('searchResults');
                if (!kw) { resDiv.innerHTML = ''; return; }
                resDiv.innerHTML = '<div style="padding:20px;">搜索中...</div>';
                try {
                    const cacheKey = `search_${kw}_page1`;
                    let data = CacheManager.get(cacheKey);
                    if (!data) {
                        data = await request('/search', { keywords: kw, type: 'song', page: 1, pagesize: 20 }, false, 600, cacheKey);
                    }
                    let songs = data?.data?.lists || [];
                    if (!songs.length) { resDiv.innerHTML = '<div style="padding:20px;">未找到</div>'; return; }
                    let normalized = songs.map(normalizeSong);
                    resDiv.innerHTML = '';
                    normalized.forEach((s, i) => {
                        let div = document.createElement('div');
                        div.className = 'song-item';
                        div.onclick = () => playSong(s, normalized, i);
                        div.innerHTML = `<div class="index">${i+1}</div><div class="info"><div class="name">${escapeHtml(s.name)}</div><div class="singer">${escapeHtml(s.singer)}</div></div>`;
                        resDiv.appendChild(div);
                    });
                } catch(e) { resDiv.innerHTML = '<div style="padding:20px;">搜索失败</div>'; }
            }, 500);
        });
        document.getElementById('searchCancel').onclick = () => {
            searchPage.classList.remove('show');
            input.value = '';
            document.getElementById('searchResults').innerHTML = '';
        };
    }

    // 登录弹窗
    function buildLoginDialog() {
        loginOverlay.innerHTML = `
            <div class="login-dialog">
                <div class="login-tabs">
                    <span class="login-tab active" data-idx="0">验证码</span>
                    <span class="login-tab" data-idx="1">扫码</span>
                    <span class="login-tab" data-idx="2">密码</span>
                    <div class="login-tab-slider"></div>
                </div>
                <div data-panel="0">
                    <input class="login-input" id="loginMobile" placeholder="手机号">
                    <input class="login-input" id="loginCode" placeholder="验证码">
                    <div class="login-send-btn" id="loginSendBtn">获取验证码</div>
                </div>
                <div data-panel="1" style="display:none;">
                    <div class="login-qr" id="loginQrBox">二维码</div>
                </div>
                <div data-panel="2" style="display:none;">
                    <input class="login-input" id="loginUser" placeholder="用户名">
                    <input class="login-input" id="loginPass" placeholder="密码" type="password">
                </div>
                <button class="login-submit" id="loginSubmit">登录</button>
            </div>
        `;
        let loginTab = 0;
        let tabs = document.querySelectorAll('.login-tab');
        let panels = document.querySelectorAll('[data-panel]');
        let slider = document.querySelector('.login-tab-slider');
        function updateSlider() {
            let active = tabs[loginTab];
            slider.style.left = active.offsetLeft + 'px';
            slider.style.width = active.offsetWidth + 'px';
        }
        tabs.forEach((t,i) => t.addEventListener('click', () => {
            loginTab = i;
            tabs.forEach((tt,ii)=>tt.classList.toggle('active', ii===i));
            panels.forEach(p=>p.style.display = parseInt(p.dataset.panel)===i ? 'block' : 'none');
            updateSlider();
            if (i===1) startQR();
            else if (i!==1 && qrTimer) stopQR();
        }));
        updateSlider();

        const sendBtn = document.getElementById('loginSendBtn');
        if (sendBtn) {
            sendBtn.onclick = async () => {
                const mobile = document.getElementById('loginMobile').value;
                if (!mobile) { toast('输入手机号'); return; }
                await sendCode(mobile);
            };
        }

        const submitBtn = document.getElementById('loginSubmit');
        if (submitBtn) {
            submitBtn.onclick = async () => {
                if (loginTab === 0) {
                    let mobile = document.getElementById('loginMobile').value;
                    let code = document.getElementById('loginCode').value;
                    if (!mobile || !code) { toast('请填写完整'); return; }
                    await loginWithCode(mobile, code);
                } else if (loginTab === 2) {
                    let user = document.getElementById('loginUser').value;
                    let pass = document.getElementById('loginPass').value;
                    if (!user || !pass) { toast('请填写完整'); return; }
                    await loginWithPassword(user, pass);
                }
            };
        }
    }

    // 启动
    async function init() {
        await ensureDfid();
        loadAuth();
        bindAudioEvents();
        buildUI();
        if (!TOKEN) {
            loginOverlay.classList.add('show');
        } else {
            loadHome();
            loadMyPage();
        }
        let hour = new Date().getHours();
        let isLight = hour >= 6 && hour < 18;
        document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
        setInterval(() => {
            let h = new Date().getHours();
            let light = h >= 6 && h < 18;
            document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
        }, 60000);
    }

    init();
})();