// ========== 项目配置数组 ==========
const PROJECTS = [
    // 实际项目（有URL的）
    { name: "home", url: "https://uegov.world", icon: "fas fa-rocket" },
    { name: "我的三体", url: "/3d", icon: "fas fa-gamepad" },
    { name: "三体2", url: "/2d", icon: "fas fa-palette" },
    { name: "永远的单摆", url: "/bai/dev", icon: "fas fa-cube" },
    { name: "单摆", url: "/bai", icon: "fas fa-chart-line" },
    
    // 预留项目（无URL的，将被隐藏）
    { name: "Github主页", url: "http://bgithub.xyz/yingo-server", icon: "fas fa-music" },
    { name: "网站后台", url: "https://yingo2.netlify.app", icon: "fas fa-video" },
    { name: "openlist", url: "/cloud", icon: "fas fa-robot" },
    { name: "聊天室", url: "/chat", icon: "fas fa-globe" },
    { name: "music1", url: "/music", icon: "fas fa-database" },
    { name: "music2", url: "http://yingo6.netlify.app", icon: "fas fa-mobile-alt" },
    { name: "洛伦兹吸引子", url: "/luo", icon: "fas fa-cloud" },
    { name: "追捕", url: "/zhui", icon: "fas fa-code" },
    { name: "字醒", url: "/word", icon: "fas fa-lock" },
    { name: "壁纸", url: "/wall", icon: "fas fa-lock" },
    { name: "博客", url: "http://yingos.netlify.app", icon: "fas fa-lock" },
    { name: "项目 14", url: "", icon: "fas fa-lock" },
    { name: "项目 14", url: "", icon: "fas fa-lock" },
    { name: "项目 15", url: "", icon: "fas fa-star" }
];

// 导出数据
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PROJECTS };
}