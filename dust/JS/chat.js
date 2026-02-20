// ==================== 聊天室配置 ====================
const CHAT_CONFIG = {
    ACCESS_TOKEN: 'e823c3a1265e30f429305ddebc27f855',
    OWNER: 'yingo-server',
    REPO: 'yingo',
    FILE_PATH: 'message.json',
    API_BASE: 'https://gitee.com/api/v5',
    MAX_RETRIES: 3,
    REFRESH_INTERVAL: 3000,
    MAX_MESSAGES: 300
};

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
    var fullUrl = url + separator + 'access_token=' + CHAT_CONFIG.ACCESS_TOKEN;
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

// ==================== 聊天室类 ====================
class ChatRoom {
    constructor(username) {
        this.username = username;          // 当前登录用户名（不带前缀）
        this.dustUsername = 'dust_' + username; // 发送时用的用户名
        this.userId = this.getOrCreateUserId();
        this.messages = [];
        this.sha = null;
        this.isLoading = false;
        this.retryCount = 0;
        this.isAtBottom = true;
        this.isUserScrolling = false;
        this.scrollTimeout = null;
        this.autoScrollEnabled = true;
        this.newMessageCount = 0;

        this.init();
    }

    getOrCreateUserId() {
        let userId = localStorage.getItem('chat_userId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chat_userId', userId);
        }
        return userId;
    }

    async init() {
        this.bindEvents();
        await this.loadMessages();
        this.startAutoRefresh();
        this.initScrollTracking();
    }

    // 销毁实例（清理定时器等）
    destroy() {
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        // 移除事件监听（由于事件绑定在匿名函数，需手动管理；此处简化，可忽略）
    }

    bindEvents() {
        var sendBtn = document.getElementById('sendBtn');
        var messageInput = document.getElementById('messageInput');
        var newMsgIndicator = document.getElementById('newMessageIndicator');

        sendBtn.onclick = () => this.sendMessage();
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        };
        messageInput.oninput = () => {
            sendBtn.disabled = !messageInput.value.trim();
        };
        // 新消息指示器点击仍然可用，但我们现在强制滚动，可忽略
        newMsgIndicator.onclick = () => this.scrollToBottom(true);
    }

    initScrollTracking() {
        var container = document.getElementById('chatContainer');
        container.addEventListener('scroll', () => this.handleScroll());
        this.checkIfAtBottom();
    }

    handleScroll() {
        var container = document.getElementById('chatContainer');
        var scrollTop = container.scrollTop;
        var scrollHeight = container.scrollHeight;
        var clientHeight = container.clientHeight;

        this.isUserScrolling = true;
        var distanceToBottom = Math.abs(scrollHeight - scrollTop - clientHeight);
        this.isAtBottom = distanceToBottom <= 100;

        if (this.isAtBottom) {
            this.hideNewMessageIndicator();
            this.newMessageCount = 0;
        }

        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.isUserScrolling = false;
        }, 150);
    }

    checkIfAtBottom() {
        var container = document.getElementById('chatContainer');
        var scrollTop = container.scrollTop;
        var scrollHeight = container.scrollHeight;
        var clientHeight = container.clientHeight;
        this.isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) <= 100;
        return this.isAtBottom;
    }

    showNewMessageIndicator(count = 1) {
        // 不再显示，保留函数以免报错
    }

    hideNewMessageIndicator() {
        var indicator = document.getElementById('newMessageIndicator');
        indicator.classList.remove('show');
    }

    scrollToBottom(force = false) {
        var container = document.getElementById('chatContainer');
        container.scrollTop = container.scrollHeight;
        this.hideNewMessageIndicator();
        this.newMessageCount = 0;
    }

    async loadMessages() {
        if (this.isLoading) return;
        this.isLoading = true;
        try {
            var url = `${CHAT_CONFIG.API_BASE}/repos/${CHAT_CONFIG.OWNER}/${CHAT_CONFIG.REPO}/contents/${CHAT_CONFIG.FILE_PATH}?access_token=${CHAT_CONFIG.ACCESS_TOKEN}`;
            var response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    this.messages = [];
                    this.sha = null;
                    this.renderMessages();
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            var data = await response.json();
            var content = b64ToUtf8(data.content);
            this.sha = data.sha;
            var newMessages = JSON.parse(content || '[]');
            
            // 如果消息数量增加，标记需要滚动
            if (this.messages.length > 0 && newMessages.length > this.messages.length) {
                this.autoScrollEnabled = true;
            }
            
            this.messages = newMessages;
            if (this.messages.length > CHAT_CONFIG.MAX_MESSAGES) {
                this.messages = this.messages.slice(-CHAT_CONFIG.MAX_MESSAGES);
            }
            this.renderMessages();
            this.retryCount = 0;
        } catch (error) {
            this.retryCount++;
            if (this.retryCount > CHAT_CONFIG.MAX_RETRIES) {
                console.error('加载消息失败', error);
            }
        } finally {
            this.isLoading = false;
        }
    }

    async saveMessages() {
        try {
            var content = JSON.stringify(this.messages, null, 2);
            var encoded = utf8ToB64(content);
            var url = `${CHAT_CONFIG.API_BASE}/repos/${CHAT_CONFIG.OWNER}/${CHAT_CONFIG.REPO}/contents/${CHAT_CONFIG.FILE_PATH}?access_token=${CHAT_CONFIG.ACCESS_TOKEN}`;
            var body = {
                content: encoded,
                message: `更新消息 - ${new Date().toISOString()}`,
                sha: this.sha
            };
            var response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                var errorData = await response.json();
                if (response.status === 409) {
                    await this.loadMessages();
                    return await this.saveMessages();
                }
                throw new Error(`保存失败: ${response.status}`);
            }
            var data = await response.json();
            this.sha = data.content.sha;
            return true;
        } catch (error) {
            console.error('保存消息失败', error);
            return false;
        }
    }

    async sendMessage() {
        var input = document.getElementById('messageInput');
        var text = input.value.trim();
        if (!text) return;

        var message = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId: this.userId,
            username: this.dustUsername,
            text: text,
            timestamp: Date.now(),
            time: this.formatTime(new Date())
        };

        this.messages.push(message);
        this.renderMessages();
        this.scrollToBottom(true);

        var sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = true;
        var originalText = sendBtn.textContent;
        sendBtn.textContent = '发送中...';

        var success = await this.saveMessages();
        if (success) {
            input.value = '';
            sendBtn.disabled = true;
            setTimeout(() => this.loadMessages(), 500);
        } else {
            this.showError('发送失败，请重试');
            this.messages.pop();
            this.renderMessages();
        }
        sendBtn.textContent = originalText;
        sendBtn.disabled = !input.value.trim();
    }

    renderMessages() {
        var container = document.getElementById('chatContainer');
        container.innerHTML = '';

        if (this.messages.length === 0) {
            container.innerHTML = '<div class="system-message">还没有消息，快来说点什么吧~</div>';
            return;
        }

        this.messages.forEach(msg => {
            var isOwn = msg.userId === this.userId;
            var displayName = msg.username;
            if (displayName && displayName.startsWith('dust_')) {
                displayName = displayName.substring(5);
            }
            var msgDiv = document.createElement('div');
            msgDiv.className = `message ${isOwn ? 'own' : ''}`;
            msgDiv.innerHTML = `
                <div class="message-header">
                    <span class="username">${this.escapeHtml(displayName)}</span>
                    <span class="message-time">${msg.time || this.formatTime(new Date(msg.timestamp))}</span>
                </div>
                <div class="message-text">${this.escapeHtml(msg.text)}</div>
            `;
            container.appendChild(msgDiv);
        });

        // 强制滚动到底部
        this.scrollToBottom(true);
    }

    showError(msg) {
        alert(msg);
    }

    formatTime(date) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    startAutoRefresh() {
        var delay = Math.random() * 3000;
        setTimeout(() => {
            this.refreshTimer = setInterval(() => {
                this.loadMessages();
            }, CHAT_CONFIG.REFRESH_INTERVAL);
        }, delay);
    }
}