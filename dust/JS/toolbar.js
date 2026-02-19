// 当前登录用户信息（全局）
var currentUser = null;

// 显示底栏
function showBottomBar() {
    var bottomBar = document.getElementById('bottom-bar');
    if (bottomBar) {
        bottomBar.style.display = 'block';
    }
}

// 隐藏底栏
function hideBottomBar() {
    var bottomBar = document.getElementById('bottom-bar');
    if (bottomBar) {
        bottomBar.style.display = 'none';
    }
}

// 加载底栏HTML
function loadToolbar() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'toolbar.html', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            document.getElementById('bottom-bar').innerHTML = xhr.responseText;
            bindNavEvents();
        }
    };
    xhr.send();
}

// 绑定底栏点击事件
function bindNavEvents() {
    var navItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < navItems.length; i++) {
        navItems[i].addEventListener('click', function(e) {
            var page = this.getAttribute('data-page');
            setActiveNav(this);
            loadPage(page);
        });
    }
}

// 设置当前激活的导航项
function setActiveNav(activeItem) {
    var navItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < navItems.length; i++) {
        navItems[i].classList.remove('active');
    }
    activeItem.classList.add('active');
}

// 根据页面名称加载
function loadPage(pageName) {
    loadPageByUrl('main/' + pageName + '.html');
}

// 通用加载函数
function loadPageByUrl(url) {
    var content = document.getElementById('content');
    var bottomBar = document.getElementById('bottom-bar');
    
    // 判断是否为登录页或注册页，若是则隐藏底栏
    if (url.indexOf('sign.html') !== -1 || url.indexOf('register.html') !== -1) {
        bottomBar.style.display = 'none';
        content.style.minHeight = '100vh';
    } else {
        bottomBar.style.display = 'block';
        content.style.minHeight = '';
    }
    
    // 淡出
    content.classList.remove('fade-in');
    content.classList.add('fade-out');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                setTimeout(function() {
                    content.innerHTML = xhr.responseText;
                    content.classList.remove('fade-out');
                    content.classList.add('fade-in');
                    
                    var fileName = url.split('/').pop().replace('.html', '');
                    var initFuncName = 'init' + fileName.charAt(0).toUpperCase() + fileName.slice(1);
                    if (typeof window[initFuncName] === 'function') {
                        window[initFuncName]();
                    }
                }, 150);
            } else {
                // 增强错误提示，显示具体状态码和路径
                var errorMsg = '页面加载失败 (HTTP ' + xhr.status + ')';
                if (xhr.status === 404) {
                    errorMsg = '页面不存在 (404)，请检查路径：' + url;
                } else if (xhr.status === 500) {
                    errorMsg = '服务器内部错误 (500)';
                }
                content.innerHTML = '<p style="color:red; padding:20px; text-align:center;">' + errorMsg + '</p>';
                content.classList.remove('fade-out');
                content.classList.add('fade-in');
            }
        }
    };
    xhr.send();
}

// 退出登录函数
// 退出登录函数
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    if (typeof window.clearMainCache === 'function') {
        window.clearMainCache();
    }
    loadPageByUrl('main/sign.html');
}