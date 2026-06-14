'use strict';

const Tool = (() => {
    const storage = {
        get(k) {
            try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; }
        },
        set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
        remove(k) { localStorage.removeItem(k); }
    };

    const cache = new Map();

    function cachedFetch(key, fetcher, ttl = 600000) {
        const now = Date.now();
        if (cache.has(key)) {
            const entry = cache.get(key);
            if (now - entry.time < ttl) return Promise.resolve(entry.data);
        }
        const stored = storage.get('cache_' + key);
        if (stored && now - stored.time < ttl) {
            cache.set(key, stored);
            return Promise.resolve(stored.data);
        }
        return fetcher().then(data => {
            const entry = { data, time: now };
            cache.set(key, entry);
            storage.set('cache_' + key, entry);
            return data;
        });
    }

    function formatTime(sec) {
        if (!sec || sec < 0 || !isFinite(sec)) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function imgUrl(url, size = 240) {
        if (!url) return '';
        return url.includes('{size}') ? url.replace(/\{size\}/g, String(size)) : url;
    }

    function coverUrl(song) {
        const url = song.Image || song.album_sizable_cover || song.cover ||
                    song.imgurl || (song.trans_param && song.trans_param.union_cover) ||
                    (song.info && song.info.image) || '';
        return imgUrl(url);
    }

    function setImage(container, url, fallback = '---') {
        if (!container) return;
        if (!url) {
            container.textContent = fallback;
            return;
        }
        const img = new Image();
        img.onload = () => {
            container.innerHTML = '';
            container.appendChild(img);
        };
        img.onerror = () => {
            container.textContent = fallback;
        };
        img.src = url;
    }

    function toast(msg, dur = 2000) {
        let el = document.getElementById('toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'toast';
            el.className = 'toast';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.remove('show'), dur);
    }

    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    return { storage, cachedFetch, formatTime, imgUrl, coverUrl, setImage, toast, delay };
})();