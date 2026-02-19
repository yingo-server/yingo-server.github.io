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

// ==================== 注册初始化 ====================
function initRegister() {
    hideBottomBar();
    console.log('注册页初始化');
    var registerBtn = document.getElementById('register-btn');
    var goLogin = document.getElementById('go-to-login');
    
    if (registerBtn) {
        registerBtn.onclick = async function() {
            var username = document.getElementById('reg-username').value.trim();
            var password = document.getElementById('reg-password').value.trim();
            var confirm = document.getElementById('reg-confirm').value.trim();
            
            if (!username || !password || !confirm) {
                alert('请填写所有字段');
                return;
            }
            if (password !== confirm) {
                alert('两次密码不一致');
                return;
            }
            
            try {
                // 检查用户名是否已存在
                var userExists = await checkUserExists(username);
                if (userExists) {
                    alert('用户名已存在');
                    return;
                }
                
                // 创建用户所有文件
                await createUserFiles(username, password);
                
                alert('注册成功！请登录');
                loadPageByUrl('main/sign.html');
            } catch (error) {
                console.error('注册过程中出错:', error);
                alert('注册失败：' + error.message);
            }
        };
    }
    
    if (goLogin) {
        goLogin.onclick = function(e) {
            e.preventDefault();
            loadPageByUrl('main/sign.html');
        };
    }
}

// ==================== 用户存在性检查 ====================
async function checkUserExists(username) {
    var filePath = 'user_data/' + username + '/passwd.txt';
    var encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + encodedPath;
    try {
        var data = await giteeRequest(url, { method: 'GET' });
        if (Array.isArray(data) && data.length === 0) return false;
        if (data && data.content) return true;
        return false;
    } catch (error) {
        if (error.status === 404) return false;
        throw error;
    }
}

// ==================== 创建用户所有文件 ====================
async function createUserFiles(username, password) {
    var now = new Date().toISOString();
    var basePath = 'user_data/' + username + '/';
    
    // 1. passwd.txt (密码)
    await createFile(basePath + 'passwd.txt', password);
    
    // 2. come.txt (注册时间|最后登录时间)
    await createFile(basePath + 'come.txt', now + '\n' + now);
    
    // 3. post.txt (帖子总数0，空标题行)
    await createFile(basePath + 'post.txt', '0\n');
    
    // 4. active.txt (关注的人列表，不能为空，写入一个空格)
    await createFile(basePath + 'active.txt', ' ');
    
    // 5. set.txt (设置，不能为空，写入一个空格)
    await createFile(basePath + 'set.txt', ' ');
}

// 通用创建文件函数（使用 POST）
async function createFile(filePath, content) {
    var encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + encodedPath;
    var contentBase64 = utf8ToB64(content);
    var postBody = {
        content: contentBase64,
        message: 'Create ' + filePath
    };
    await giteeRequest(url, {
        method: 'POST',
        body: JSON.stringify(postBody)
    });
}