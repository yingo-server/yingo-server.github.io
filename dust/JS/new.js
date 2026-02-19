// ==================== 工具函数 ====================
function utf8ToB64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}
function b64ToUtf8(str) {
    if (!str) return '';
    var clean = str.replace(/\s/g, '');
    return decodeURIComponent(escape(window.atob(clean)));
}
async function giteeRequest(url, options = {}) {
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

// ==================== 圈子渲染 ====================
function renderCircles() {
    var container = document.getElementById('circles-container');
    if (!container) return;
    var html = '<table style="width:100%; border-collapse: collapse;">';
    for (var i = 0; i < circles.length; i += 4) {
        html += '<tr>';
        for (var j = 0; j < 4; j++) {
            var index = i + j;
            if (index < circles.length) {
                var circleName = circles[index];
                var checked = (index === 0) ? 'checked' : '';
                html += '<td style="padding: 8px; vertical-align: middle;">' +
                        '<label style="display: flex; align-items: center; cursor: pointer;">' +
                        '<input type="radio" name="circle" value="' + circleName + '" ' + checked + 
                        ' style="margin-right: 6px; accent-color: #2196f3;">' +
                        '<span>' + circleName + '</span>' +
                        '</label>' +
                        '</td>';
            } else {
                html += '<td></td>';
            }
        }
        html += '</tr>';
    }
    html += '</table>';
    container.innerHTML = html;
}
function getSelectedCircle() {
    var radios = document.getElementsByName('circle');
    for (var i = 0; i < radios.length; i++) {
        if (radios[i].checked) return radios[i].value;
    }
    return null;
}

// ==================== 文件夹名生成 ====================
function generateFolderName(title, username, circle) {
    var now = new Date();
    var year = now.getFullYear();
    var month = pad(now.getMonth() + 1);
    var day = pad(now.getDate());
    var hour = pad(now.getHours());
    var minute = pad(now.getMinutes());
    // 替换标题和用户名中的非法字符（仅保留字母数字中文和下划线）
    var safeTitle = title.replace(/[^\w\u4e00-\u9fa5]/g, '_');
    var safeUser = username.replace(/[^\w\u4e00-\u9fa5]/g, '_');
    var safeCircle = circle.replace(/[^\w\u4e00-\u9fa5]/g, '_');
    return year + '-' + month + '-' + day + '-' + hour + '-' + minute + '-' + safeTitle + '-' + safeUser + '-' + safeCircle;
}
function pad(num, length = 2) {
    var str = num.toString();
    while (str.length < length) str = '0' + str;
    return str;
}

// ==================== 图片上传 ====================
var selectedImages = [];
function initImageUpload() {
    var imageBtn = document.getElementById('image-btn');
    var fileInput = document.getElementById('image-input');
    var previewContainer = document.getElementById('image-preview');
    if (!imageBtn || !fileInput) return;
    
    imageBtn.onclick = function() {
        fileInput.click();
    };
    fileInput.onchange = function(e) {
        var files = Array.from(e.target.files);
        for (var file of files) {
            if (file.size > 5 * 1024 * 1024) {
                alert('图片大小不能超过5MB');
                continue;
            }
            // 预览
            var reader = new FileReader();
            reader.onload = function(ev) {
                var div = document.createElement('div');
                div.className = 'image-preview-item';
                div.innerHTML = '<img src="' + ev.target.result + '" style="width:60px;height:60px;object-fit:cover;">';
                previewContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
            selectedImages.push(file);
        }
        // 显示预览区域
        previewContainer.style.display = 'flex';
    };
}

// 上传图片到指定文件夹（使用 POST 创建新文件）
async function uploadImages(folderPath, images) {
    var urls = [];
    for (var i = 0; i < images.length; i++) {
        var file = images[i];
        var ext = file.name.split('.').pop() || 'jpg';
        var fileName = 'image_' + Date.now() + '_' + i + '.' + ext;
        var filePath = folderPath + '/' + fileName;
        var encodedPath = filePath.split('/').map(seg => encodeURIComponent(seg)).join('/');
        var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + encodedPath;
        
        var base64 = await fileToBase64(file);
        var contentBase64 = base64.split(',')[1]; // 去掉 data:image/xxx;base64,
        var postBody = {
            content: contentBase64,
            message: 'Upload image ' + fileName
        };
        // 使用 POST 创建新文件
        await giteeRequest(url, { method: 'POST', body: JSON.stringify(postBody) });
        urls.push(fileName);
    }
    return urls;
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ==================== 发布文章 ====================
async function publishPost(title, description, circle, images) {
    var folderName = generateFolderName(title, currentUser.username, circle);
    var folderPath = 'post_data/' + folderName;
    
    // 先上传图片（如果有）
    var imageNames = [];
    if (images.length > 0) {
        imageNames = await uploadImages(folderPath, images);
    }
    
    // 准备 post.json 数据
    var postData = {
        title: title,
        content: description,
        circle: circle,
        user: currentUser.username,
        time: new Date().toISOString(),
        likes: 0,
        comments: [],
        images: imageNames
    };
    
    // 上传 post.json（使用 POST 创建新文件）
    var jsonPath = folderPath + '/post.json';
    var encodedJsonPath = jsonPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    var jsonUrl = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + encodedJsonPath;
    var jsonContent = JSON.stringify(postData, null, 2);
    var jsonBase64 = utf8ToB64(jsonContent);
    var postBody = {
        content: jsonBase64,
        message: 'Publish post: ' + title
    };
    await giteeRequest(jsonUrl, { method: 'POST', body: JSON.stringify(postBody) });
    
    // 更新用户 post.txt（更新已有文件，用 PUT）
    await updateUserPosts(currentUser.username, title);
}

// 更新用户帖子统计（用 PUT 更新已有文件）
async function updateUserPosts(username, newTitle) {
    var filePath = 'user_data/' + username + '/post.txt';
    var encodedPath = filePath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + encodedPath;
    try {
        var data = await giteeRequest(url, { method: 'GET' });
        var content = b64ToUtf8(data.content);
        var lines = content.split('\n');
        var count = parseInt(lines[0]) || 0;
        var titles = lines[1] ? lines[1].split('!').filter(t => t) : [];
        count++;
        titles.push(newTitle);
        var newTitles = titles.join('!');
        var newContent = count + '\n' + newTitles;
        var newContentBase64 = utf8ToB64(newContent);
        var putBody = {
            content: newContentBase64,
            sha: data.sha,
            message: 'Update post list'
        };
        await giteeRequest(url, { method: 'PUT', body: JSON.stringify(putBody) });
    } catch (error) {
        console.error('更新用户帖子失败', error);
        throw error;
    }
}

// ==================== 初始化新建页面 ====================
function initNew() {
    showBottomBar();
    console.log('新建页面已初始化');
    
    renderCircles();
    initImageUpload();
    
    var saveBtn = document.getElementById('save-btn');
    var cancelBtn = document.getElementById('cancel-btn');
    var statusDiv = document.getElementById('save-status');
    
    if (saveBtn) {
        saveBtn.onclick = async function() {
            var title = document.getElementById('new-title').value.trim();
            var description = document.getElementById('new-description').value.trim();
            var selectedCircle = getSelectedCircle();
            
            if (!title) {
                alert('请输入标题');
                return;
            }
            if (!selectedCircle) {
                alert('请选择一个圈子');
                return;
            }
            if (!currentUser) {
                alert('请先登录');
                loadPageByUrl('main/sign.html');
                return;
            }
            
            saveBtn.disabled = true;
            statusDiv.style.display = 'block';
            
            try {
                await publishPost(title, description, selectedCircle, selectedImages);
                statusDiv.style.display = 'none';
                alert('发布成功！');
                
                // 清空表单
                document.getElementById('new-title').value = '';
                document.getElementById('new-description').value = '';
                var radios = document.getElementsByName('circle');
                if (radios.length > 0) radios[0].checked = true;
                // 清空图片预览和数组
                document.getElementById('image-preview').innerHTML = '';
                document.getElementById('image-preview').style.display = 'none';
                selectedImages = [];
            } catch (error) {
                statusDiv.style.display = 'none';
                alert('发布失败：' + error.message);
                console.error('发布错误详情:', error);
            } finally {
                saveBtn.disabled = false;
            }
        };
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = function() {
            if (typeof loadPageByUrl === 'function') {
                loadPageByUrl('main/main.html');
            }
        };
    }
}