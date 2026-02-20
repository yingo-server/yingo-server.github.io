// ==================== 工具函数 ====================
function utf8ToB64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}
function b64ToUtf8(str) {
    if (!str) throw new Error('无法解码空内容');
    var clean = str.replace(/\s/g, '');
    return decodeURIComponent(escape(window.atob(clean)));
}

async function giteeRequest(url, options) {
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

function applyDarkMode(enable) {
    if (enable) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// ==================== 登录验证 ====================
async function verifyPassword(username, password) {
    var storedPassword = await readUserFile(username, 'passwd.txt');
    return storedPassword === password;
}

async function updateLastLoginTime(username) {
    var filePath = 'user_data/' + username + '/come.txt';
    var encodedPath = filePath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + encodedPath;
    try {
        var data = await giteeRequest(url, { method: 'GET' });
        var content = b64ToUtf8(data.content);
        var lines = content.split('\n');
        var now = new Date().toISOString();
        var newContent = lines[0] + '\n' + now;
        var newContentBase64 = utf8ToB64(newContent);
        var putBody = {
            content: newContentBase64,
            sha: data.sha,
            message: 'Update last login time'
        };
        await giteeRequest(url, {
            method: 'PUT',
            body: JSON.stringify(putBody)
        });
    } catch (error) {
        console.error('更新最后登录时间失败', error);
    }
}

// ==================== 登录初始化 ====================
function initSign() {
    hideBottomBar();
    console.log('登录页初始化');
    
    // 检查缓存登录
    var cachedUser = localStorage.getItem('currentUser');
    if (cachedUser) {
        try {
            currentUser = JSON.parse(cachedUser);
            // 应用缓存用户的主题
            readUserSettings(currentUser.username).then(settings => {
                applyDarkMode(settings.dark === 'true');
            }).catch(() => {});
            loadPage('main');
            return;
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
    }
    
    var loginBtn = document.getElementById('login-btn');
    var goRegister = document.getElementById('go-to-register');
    
    if (loginBtn) {
        loginBtn.onclick = async function() {
            var username = document.getElementById('login-username').value.trim();
            var password = document.getElementById('login-password').value.trim();
            if (!username || !password) {
                alert('请输入用户名和密码');
                return;
            }
            try {
                var isValid = await verifyPassword(username, password);
                if (!isValid) {
                    alert('用户名或密码错误');
                    return;
                }
                
                currentUser = { username: username };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                // 更新最后登录时间
                await updateLastLoginTime(username);
                // 应用主题
                try {
                    var settings = await readUserSettings(username);
                    applyDarkMode(settings.dark === 'true');
                } catch (e) {
                    console.error('应用主题失败', e);
                }
                alert('登录成功！');
                loadPage('main');
            } catch (error) {
                alert('登录失败：' + error.message);
            }
        };
    }
    
    if (goRegister) {
        goRegister.onclick = function(e) {
            e.preventDefault();
            loadPageByUrl('main/register.html');
        };
    }
}