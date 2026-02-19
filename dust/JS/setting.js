// ==================== 工具函数 ====================
if (typeof giteeRequest === 'undefined') {
    window.giteeRequest = async function(url, options = {}) {
        var separator = url.indexOf('?') === -1 ? '?' : '&';
        var fullUrl = url + separator + 'access_token=' + GITEE_CONFIG.ACCESS_TOKEN;
        var response = await fetch(fullUrl, {
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: options.body
        });
        var text = await response.text();
        var data;
        try { data = JSON.parse(text); } catch (e) { data = text; }
        if (!response.ok) {
            var err = new Error(data.message || 'HTTP ' + response.status);
            err.status = response.status; err.data = data; throw err;
        }
        return data;
    };
}
if (typeof b64ToUtf8 === 'undefined') {
    window.b64ToUtf8 = function(str) {
        if (!str) return '';
        var clean = str.replace(/\s/g, '');
        return decodeURIComponent(escape(window.atob(clean)));
    };
}
if (typeof utf8ToB64 === 'undefined') {
    window.utf8ToB64 = function(str) {
        return window.btoa(unescape(encodeURIComponent(str)));
    };
}

// ==================== 读取用户文件 ====================
async function readUserFile(username, fileName) {
    var filePath = 'user_data/' + username + '/' + fileName;
    var encodedPath = filePath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + encodedPath;
    try {
        var data = await giteeRequest(url, { method: 'GET' });
        if (Array.isArray(data) && data.length === 0) return '';
        if (data && data.content) return b64ToUtf8(data.content);
        return '';
    } catch (e) {
        if (e.status === 404) return '';
        throw e;
    }
}

// ==================== 渲染文章列表（直接从 post.txt 解析）====================
function renderPostList(titles) {
    var listDiv = document.getElementById('post-list');
    if (!listDiv) return;
    if (titles.length === 0) {
        listDiv.innerHTML = '<p style="color: #757575;">暂无文章</p>';
    } else {
        // 倒序显示（越靠后的越新，即最新在上）
        var reversed = titles.slice().reverse();
        var html = '';
        reversed.forEach((title, index) => {
            // 可以添加一个简单的标记，比如最新加个“新”字，但用户未要求，只显示标题
            html += `<div style="margin-bottom: 8px;">
                <div style="font-weight: 500;">${title}</div>
                <div style="font-size: 12px; color: #757575;">${index === 0 ? '最新' : ''}</div>
            </div>`;
        });
        listDiv.innerHTML = html;
    }
}

// ==================== 加载用户信息 ====================
async function loadUserInfo() {
    var username = currentUser.username;
    document.getElementById('profile-username').textContent = username;
    
    // 帖子总数和标题列表
    try {
        var postData = await readUserFile(username, 'post.txt');
        var postLines = postData.split('\n');
        var postCount = parseInt(postLines[0]) || 0;
        document.getElementById('post-count').textContent = postCount;
        var titles = postLines[1] ? postLines[1].split('!').filter(t => t) : [];
        renderPostList(titles);
    } catch (e) {
        document.getElementById('post-count').textContent = '0';
        renderPostList([]);
    }
    
    // 注册/登录时间
    try {
        var comeData = await readUserFile(username, 'come.txt');
        var comeLines = comeData.split('\n');
        var registerTime = comeLines[0] ? new Date(comeLines[0]).toLocaleString() : '-';
        var lastLoginTime = comeLines[1] ? new Date(comeLines[1]).toLocaleString() : '-';
        document.getElementById('register-time').textContent = registerTime;
        document.getElementById('last-login-time').textContent = lastLoginTime;
    } catch (e) {}
    
    // 关注人数
    try {
        var activeData = await readUserFile(username, 'active.txt');
        var lines = activeData.split('\n').filter(line => line.trim() !== '');
        document.getElementById('follow-count').textContent = lines.length;
    } catch (e) {
        document.getElementById('follow-count').textContent = '0';
    }
}

// ==================== 折叠函数 ====================
function toggleCollapse(contentId, iconId) {
    var content = document.getElementById(contentId);
    var icon = document.getElementById(iconId);
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
    }
}
function togglePostList() {
    var listDiv = document.getElementById('post-list');
    var icon = document.getElementById('post-expand-icon');
    if (listDiv.style.display === 'none') {
        listDiv.style.display = 'block';
        icon.textContent = '▼';
    } else {
        listDiv.style.display = 'none';
        icon.textContent = '▶';
    }
}

// ==================== 主题设置相关 ====================
async function readUserSettings(username) {
    var content = await readUserFile(username, 'set.txt');
    var lines = content.split('\n');
    var settings = {};
    lines.forEach(line => {
        line = line.trim();
        if (line && line.includes('=')) {
            var parts = line.split('=');
            var key = parts[0].trim();
            var value = parts[1].trim();
            settings[key] = value;
        }
    });
    return settings;
}
async function updateUserSettings(username, newSettings) {
    var current = await readUserSettings(username);
    for (var key in newSettings) {
        current[key] = newSettings[key];
    }
    var lines = [];
    for (var k in current) {
        lines.push(k + '=' + current[k]);
    }
    var newContent = lines.join('\n');
    
    var filePath = 'user_data/' + username + '/set.txt';
    var encodedPath = filePath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + encodedPath;
    
    var sha = null;
    try {
        var existing = await giteeRequest(url, { method: 'GET' });
        if (!Array.isArray(existing) && existing && existing.sha) {
            sha = existing.sha;
        }
    } catch (e) {
        if (e.status !== 404) throw e;
    }
    
    var putBody = {
        content: utf8ToB64(newContent),
        message: 'Update theme setting for ' + username
    };
    if (sha) putBody.sha = sha;
    
    await giteeRequest(url, {
        method: 'PUT',
        body: JSON.stringify(putBody)
    });
}
function applyDarkMode(enable) {
    if (enable) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}
async function initThemeSettings() {
    var toggle = document.getElementById('dark-mode-toggle');
    var statusEl = document.getElementById('theme-status');
    if (!toggle) return;
    
    var settings = await readUserSettings(currentUser.username);
    var darkMode = settings.dark === 'true';
    toggle.checked = darkMode;
    applyDarkMode(darkMode);
    
    var cooldown = false;
    
    toggle.addEventListener('change', async function(e) {
        if (cooldown) {
            toggle.checked = !toggle.checked;
            statusEl.style.display = 'block';
            statusEl.innerText = '请等待5秒后再试';
            return;
        }
        
        var newMode = toggle.checked;
        applyDarkMode(newMode);
        
        cooldown = true;
        toggle.disabled = true;
        statusEl.style.display = 'block';
        statusEl.innerText = '切换冷却中 (5秒)';
        
        await updateUserSettings(currentUser.username, { dark: newMode ? 'true' : 'false' });
        
        var countdown = 5;
        var interval = setInterval(() => {
            countdown--;
            if (statusEl) statusEl.innerText = `切换冷却中 (${countdown}秒)`;
        }, 1000);
        
        setTimeout(() => {
            clearInterval(interval);
            cooldown = false;
            toggle.disabled = false;
            if (statusEl) statusEl.style.display = 'none';
        }, 5000);
    });
}

// ==================== 主函数 ====================
function initSetting() {
    showBottomBar();
    console.log('个人页已初始化');
    
    if (!currentUser) {
        var cached = localStorage.getItem('currentUser');
        if (cached) {
            try { currentUser = JSON.parse(cached); } catch (e) { localStorage.removeItem('currentUser'); }
        }
    }
    if (!currentUser) {
        if (typeof loadPageByUrl === 'function') {
            loadPageByUrl('main/sign.html');
        } else {
            window.location.href = 'main/sign.html';
        }
        return;
    }
    
    loadUserInfo();
    initThemeSettings();
    
    var profileHeader = document.getElementById('profile-header');
    if (profileHeader) {
        profileHeader.addEventListener('click', function() {
            toggleCollapse('profile-content', 'profile-collapse-icon');
        });
    }
    
    var themeHeader = document.getElementById('theme-header');
    if (themeHeader) {
        themeHeader.addEventListener('click', function() {
            toggleCollapse('theme-content', 'theme-collapse-icon');
        });
    }
    
    var postExpandIcon = document.getElementById('post-expand-icon');
    if (postExpandIcon) {
        postExpandIcon.addEventListener('click', function(e) {
            e.stopPropagation();
            togglePostList();
        });
    }
    
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            currentUser = null;
            localStorage.removeItem('currentUser');
            if (typeof loadPageByUrl === 'function') {
                loadPageByUrl('main/sign.html');
            } else {
                window.location.href = 'main/sign.html';
            }
        };
    }
}