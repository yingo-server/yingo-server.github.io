// ==================== 全局变量 ====================
var allPosts = [];          // 所有帖子元数据（按时间倒序）
var displayedCount = 0;      // 已显示的帖子数量
var isLoading = false;       // 是否正在加载
var hasMore = true;          // 是否还有更多帖子
var isAdmin = false;         // 管理员标志
var likedPostsKey = 'liked_posts_' + (currentUser ? currentUser.username : ''); // 点赞记录缓存key
var likedPosts = {};         // 当前用户点赞的帖子ID集合（从localStorage加载）
var imageCache = {};         // 图片缓存：键为图片路径，值为Blob URL或Promise

// ==================== 初始化 ====================
async function initMain() {
    showBottomBar();
    console.log('主页已初始化');
    
    // 加号按钮绑定
    var fab = document.getElementById('fab-add');
    if (fab) {
        fab.onclick = function() {
            if (typeof loadPageByUrl === 'function') {
                loadPageByUrl('main/tools/new.html');
            }
        };
    }
    
    if (!currentUser) {
        var cached = localStorage.getItem('currentUser');
        if (cached) {
            try { currentUser = JSON.parse(cached); } catch (e) { localStorage.removeItem('currentUser'); }
        }
    }
    if (!currentUser) {
        loadPageByUrl('main/sign.html');
        return;
    }
    
    loadLikedPosts();
    await checkAdminStatus();
    
    if (allPosts.length === 0) {
        // 首次加载
        await loadPostList();
    } else {
        // 重新渲染当前已加载的帖子（避免因切换页面导致内容清空）
        var container = document.getElementById('posts-container');
        container.innerHTML = ''; // 清空容器
        var toRender = allPosts.slice(0, displayedCount);
        await renderPosts(toRender);
        // 更新底部状态
        if (displayedCount >= allPosts.length) {
            document.getElementById('no-more-posts').style.display = 'block';
        } else {
            document.getElementById('no-more-posts').style.display = 'none';
        }
    }
    
    window.addEventListener('scroll', handleScroll);
}

// ==================== 管理员检测 ====================
async function checkAdminStatus() {
    var filePath = 'user_data/' + currentUser.username + '/admin.txt';
    var encodedPath = filePath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + encodedPath;
    
    try {
        var data = await giteeRequest(url, { method: 'GET' });
        if (Array.isArray(data)) {
            isAdmin = false;
            return;
        }
        if (!data.content) {
            isAdmin = false;
            return;
        }
        var content = b64ToUtf8(data.content);
        var firstLine = content.split('\n')[0] || '';
        isAdmin = (firstLine.trim() === '1');
    } catch (e) {
        if (e.status === 404) {
            isAdmin = false;
        } else {
            console.error('检查管理员失败', e);
            isAdmin = false;
        }
    }
    console.log('管理员状态:', isAdmin);
}

// ==================== 点赞记录 ====================
function loadLikedPosts() {
    likedPostsKey = 'liked_posts_' + currentUser.username;
    var stored = localStorage.getItem(likedPostsKey);
    if (stored) {
        try {
            likedPosts = JSON.parse(stored);
        } catch (e) {
            likedPosts = {};
        }
    } else {
        likedPosts = {};
    }
}
function saveLikedPosts() {
    localStorage.setItem(likedPostsKey, JSON.stringify(likedPosts));
}

// ==================== 获取所有帖子元数据 ====================
async function fetchAllPosts() {
    try {
        var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/post_data';
        var folders = await giteeRequest(url);
        var folderItems = folders.filter(item => item.type === 'dir');
        
        var posts = [];
        for (var folder of folderItems) {
            var folderName = folder.name;
            var parts = folderName.split('-');
            if (parts.length < 8) continue;
            var year = parts[0];
            var month = parts[1];
            var day = parts[2];
            var hour = parts[3];
            var minute = parts[4];
            var timeStr = year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':00.000Z';
            var timestamp = new Date(timeStr).getTime();
            
            var postJsonUrl = folder.url + '/post.json?ref=master';
            try {
                var postData = await giteeRequest(postJsonUrl);
                var content = b64ToUtf8(postData.content);
                var post = JSON.parse(content);
                posts.push({
                    folderName: folderName,
                    folderPath: folder.path,
                    title: post.title,
                    content: post.content,
                    user: post.user,
                    time: post.time,
                    likes: post.likes || 0,
                    images: post.images || [],
                    timestamp: timestamp,
                    sha: postData.sha
                });
            } catch (e) {
                console.warn('读取帖子失败', folderName, e);
            }
        }
        posts.sort((a, b) => b.timestamp - a.timestamp);
        return posts;
    } catch (e) {
        console.error('获取帖子列表失败', e);
        return [];
    }
}

// ==================== 加载帖子列表（分页）====================
async function loadPostList() {
    if (isLoading) return;
    isLoading = true;
    document.getElementById('loading-indicator').style.display = 'block';
    
    if (allPosts.length === 0) {
        allPosts = await fetchAllPosts();
        if (allPosts.length === 0) {
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('no-more-posts').style.display = 'block';
            isLoading = false;
            return;
        }
    }
    
    var start = displayedCount;
    var end = Math.min(start + 5, allPosts.length);
    var newPosts = allPosts.slice(start, end);
    
    if (newPosts.length === 0) {
        hasMore = false;
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('no-more-posts').style.display = 'block';
        isLoading = false;
        return;
    }
    
    await renderPosts(newPosts);
    
    displayedCount = end;
    if (displayedCount >= allPosts.length) {
        hasMore = false;
        document.getElementById('no-more-posts').style.display = 'block';
    }
    
    document.getElementById('loading-indicator').style.display = 'none';
    isLoading = false;
}

// ==================== 渲染帖子卡片 ====================
async function renderPosts(posts) {
    var container = document.getElementById('posts-container');
    for (var post of posts) {
        var card = document.createElement('div');
        card.className = 'post-card';
        card.dataset.folder = post.folderPath;
        card.dataset.title = post.title;
        
        var header = document.createElement('div');
        header.className = 'post-header';
        header.innerHTML = `
            <span class="post-author">${escapeHtml(post.user)}</span>
            <button class="follow-btn"><i class="material-icons">person_add</i> 关注</button>
        `;
        card.appendChild(header);
        
        var contentDiv = document.createElement('div');
        contentDiv.className = 'post-content';
        contentDiv.innerText = post.content;
        card.appendChild(contentDiv);
        
        if (post.images && post.images.length > 0) {
            var imagesDiv = document.createElement('div');
            imagesDiv.className = 'post-images';
            for (var i = 0; i < post.images.length; i++) {
                var imgName = post.images[i];
                var imagePath = post.folderPath + '/' + imgName;
                var wrapper = document.createElement('div');
                wrapper.className = 'image-wrapper';
                var img = document.createElement('img');
                img.dataset.path = imagePath;
                img.alt = '图片';
                img.onclick = (function(path) {
                    return function() { openImageModal(path); };
                })(imagePath);
                img.classList.add('lazy');
                wrapper.appendChild(img);
                imagesDiv.appendChild(wrapper);
            }
            card.appendChild(imagesDiv);
        }
        
        var liked = likedPosts[post.folderName] ? true : false;
        var footer = document.createElement('div');
        footer.className = 'post-footer';
        footer.innerHTML = `
            <button class="like-btn ${liked ? 'liked' : ''}" data-folder="${post.folderName}">
                <i class="material-icons">${liked ? 'favorite' : 'favorite_border'}</i>
                <span class="like-count">${post.likes}</span>
            </button>
            <button><i class="material-icons">comment</i><span class="placeholder"></span></button>
            <button><i class="material-icons">share</i><span class="placeholder"></span></button>
            ${isAdmin ? '<button class="delete-btn" onclick="deletePost(\'' + post.folderPath + '\', \'' + post.user + '\', \'' + post.title + '\')"><i class="material-icons">delete</i><span class="placeholder"></span></button>' : ''}
        `;
        card.appendChild(footer);
        
        container.appendChild(card);
        
        var likeBtn = footer.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.onclick = (function(postData) {
                return function() { handleLike(postData); };
            })(post);
        }
    }
    
    lazyLoadImages();
}

// ==================== 图片懒加载（通过API获取Blob）====================
async function getImageBlobUrl(imagePath) {
    if (imageCache[imagePath] && typeof imageCache[imagePath] === 'string') {
        return imageCache[imagePath];
    }
    if (imageCache[imagePath] === null) return null;
    
    var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/raw/' + imagePath;
    var separator = url.indexOf('?') === -1 ? '?' : '&';
    var fullUrl = url + separator + 'access_token=' + GITEE_CONFIG.ACCESS_TOKEN;
    
    try {
        var response = await fetch(fullUrl);
        if (!response.ok) throw new Error('图片加载失败');
        var blob = await response.blob();
        var blobUrl = URL.createObjectURL(blob);
        imageCache[imagePath] = blobUrl;
        return blobUrl;
    } catch (e) {
        console.error('图片加载失败', imagePath, e);
        imageCache[imagePath] = null;
        return null;
    }
}

async function lazyLoadImages() {
    var lazyImages = document.querySelectorAll('.post-images img.lazy');
    for (var img of lazyImages) {
        var rect = img.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            var imagePath = img.dataset.path;
            if (!imagePath) continue;
            
            if (imageCache[imagePath] && typeof imageCache[imagePath] === 'string') {
                img.src = imageCache[imagePath];
                img.classList.add('loaded');
                img.classList.remove('lazy');
            } else if (imageCache[imagePath] === undefined) {
                imageCache[imagePath] = getImageBlobUrl(imagePath);
                var blobUrl = await imageCache[imagePath];
                if (blobUrl) {
                    img.src = blobUrl;
                    img.classList.add('loaded');
                }
                img.classList.remove('lazy');
            }
        }
    }
}

// ==================== 图片预览 ====================
async function openImageModal(imagePath) {
    var blobUrl = imageCache[imagePath];
    if (!blobUrl || blobUrl === null) {
        blobUrl = await getImageBlobUrl(imagePath);
        if (!blobUrl) {
            alert('图片加载失败');
            return;
        }
    }
    var modal = document.getElementById('image-modal');
    var modalImg = document.getElementById('modal-image');
    modal.style.display = 'flex';
    modalImg.src = blobUrl;
}
function closeImageModal() {
    document.getElementById('image-modal').style.display = 'none';
}

// ==================== 处理点赞 ====================
async function handleLike(post) {
    var folderName = post.folderName;
    var liked = likedPosts[folderName] ? true : false;
    if (liked) {
        likedPosts[folderName] = false;
        post.likes--;
    } else {
        likedPosts[folderName] = true;
        post.likes++;
    }
    saveLikedPosts();
    
    var card = document.querySelector(`.post-card[data-folder="${post.folderPath}"]`);
    if (card) {
        var likeBtn = card.querySelector('.like-btn');
        var likeIcon = likeBtn.querySelector('i');
        var likeCount = likeBtn.querySelector('.like-count');
        if (likedPosts[folderName]) {
            likeBtn.classList.add('liked');
            likeIcon.textContent = 'favorite';
        } else {
            likeBtn.classList.remove('liked');
            likeIcon.textContent = 'favorite_border';
        }
        likeCount.textContent = post.likes;
    }
    
    try {
        var filePath = post.folderPath + '/post.json';
        var encodedPath = filePath.split('/').map(seg => encodeURIComponent(seg)).join('/');
        var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + encodedPath;
        var data = await giteeRequest(url, { method: 'GET' });
        var content = b64ToUtf8(data.content);
        var postData = JSON.parse(content);
        postData.likes = post.likes;
        var newContent = JSON.stringify(postData, null, 2);
        var newBase64 = utf8ToB64(newContent);
        var putBody = {
            content: newBase64,
            sha: data.sha,
            message: 'Update likes for ' + post.title
        };
        await giteeRequest(url, { method: 'PUT', body: JSON.stringify(putBody) });
    } catch (e) {
        console.error('更新点赞失败', e);
        if (likedPosts[folderName]) {
            likedPosts[folderName] = false;
            post.likes--;
        } else {
            likedPosts[folderName] = true;
            post.likes++;
        }
        saveLikedPosts();
        if (card) {
            var likeBtn = card.querySelector('.like-btn');
            var likeIcon = likeBtn.querySelector('i');
            var likeCount = card.querySelector('.like-count');
            if (likedPosts[folderName]) {
                likeBtn.classList.add('liked');
                likeIcon.textContent = 'favorite';
            } else {
                likeBtn.classList.remove('liked');
                likeIcon.textContent = 'favorite_border';
            }
            likeCount.textContent = post.likes;
        }
        alert('点赞失败，请重试');
    }
}

// ==================== 删除帖子（管理员）====================
async function deletePost(folderPath, username, title) {
    if (!isAdmin) return;
    if (!confirm('确定要删除此帖子吗？此操作不可恢复！')) return;
    try {
        await deleteFolderRecursive(folderPath);
        await updateUserPostAfterDelete(username, title);
        
        allPosts = allPosts.filter(p => p.folderPath !== folderPath);
        var card = document.querySelector(`.post-card[data-folder="${folderPath}"]`);
        if (card) card.remove();
        
        alert('帖子已删除');
    } catch (e) {
        alert('删除失败：' + e.message);
    }
}

async function deleteFolderRecursive(folderPath) {
    var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + folderPath;
    var items = await giteeRequest(url);
    for (var item of items) {
        if (item.type === 'dir') {
            await deleteFolderRecursive(item.path);
        } else {
            var deleteUrl = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + item.path;
            await giteeRequest(deleteUrl, {
                method: 'DELETE',
                body: JSON.stringify({ sha: item.sha, message: 'Delete post file' })
            });
        }
    }
}

async function updateUserPostAfterDelete(username, title) {
    var filePath = 'user_data/' + username + '/post.txt';
    var encodedPath = filePath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    var url = GITEE_CONFIG.BASE_URL + '/repos/' + GITEE_CONFIG.OWNER + '/' + GITEE_CONFIG.REPO + '/contents/' + encodedPath;
    
    try {
        var data = await giteeRequest(url, { method: 'GET' });
        var content = b64ToUtf8(data.content);
        var lines = content.split('\n');
        var count = parseInt(lines[0]) || 0;
        var titles = lines[1] ? lines[1].split('!').filter(t => t) : [];
        
        var index = titles.indexOf(title);
        if (index !== -1) {
            titles[index] = '帖子违规，已被管理员删除';
        }
        var newTitles = titles.join('!');
        var newContent = count + '\n' + newTitles;
        var newBase64 = utf8ToB64(newContent);
        var putBody = {
            content: newBase64,
            sha: data.sha,
            message: 'Update post list after delete'
        };
        await giteeRequest(url, { method: 'PUT', body: JSON.stringify(putBody) });
    } catch (e) {
        console.error('更新用户帖子失败', e);
        throw e;
    }
}

// ==================== 滚动懒加载 ====================
function handleScroll() {
    if (isLoading || !hasMore) return;
    var scrollY = window.scrollY;
    var windowHeight = window.innerHeight;
    var documentHeight = document.documentElement.scrollHeight;
    if (scrollY + windowHeight >= documentHeight - 200) {
        loadPostList();
    }
    lazyLoadImages();
}

// ==================== 工具函数 ====================
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 退出登录时清理缓存（由 toolbar.js 调用）
window.clearMainCache = function() {
    for (var key in imageCache) {
        if (imageCache[key] && imageCache[key].startsWith('blob:')) {
            URL.revokeObjectURL(imageCache[key]);
        }
    }
    imageCache = {};
    isAdmin = false;
};