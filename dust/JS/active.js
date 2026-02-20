// active.js - 圈子页面初始化

// 导入聊天室模块（实际上 chat.js 会挂载到 window）
// 确保在 HTML 中先引入 chat.js

function initActive() {
    showBottomBar();
    console.log('圈子页已初始化');

    // 检查当前用户
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

    // 初始化聊天室，传入当前用户名（用于发送时加前缀）
    if (window.chatRoom) {
        window.chatRoom.destroy(); // 清理之前的实例（如果有）
    }
    window.chatRoom = new ChatRoom(currentUser.username);
}