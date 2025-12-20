[file name]: app.js
[file content begin]
/**
 * 项目入口页面 - JavaScript主文件
 * 功能：项目按钮生成、音乐播放器控制、交互处理
 */

// ========== 配置区域 ==========

/**
 * 项目配置数组
 * 格式：{ name: "项目名称", url: "项目链接", icon: "字体图标类名" }
 * 注意：如果url为空字符串""，则该按钮会被隐藏
 */
const PROJECTS = [
    // 实际项目（有URL的）
    { name: "home", url: "https://uegov.worldl", icon: "fas fa-rocket" },
    { name: "我的三体", url: "/3d", icon: "fas fa-gamepad" },
    { name: "三体2", url: "/2d", icon: "fas fa-palette" },
    { name: "永远的单摆", url: "/bai/dev", icon: "fas fa-cube" },
    { name: "单摆", url: "/bai", icon: "fas fa-chart-line" },
    
    // 预留项目（无URL的，将被隐藏）
    { name: "Github主页", url: "http://bgithub.xyz/yingo-server", icon: "fas fa-music" },
    { name: "网站后台", url: "https://yingo2.netlify.app", icon: "fas fa-video" },
    { name: "openlist", url: "/cloud", icon: "fas fa-robot" },
    { name: "聊天室", url: "/chat", icon: "fas fa-globe" },
    { name: "项目 10", url: "", icon: "fas fa-database" },
    { name: "项目 11", url: "", icon: "fas fa-mobile-alt" },
    { name: "项目 12", url: "", icon: "fas fa-cloud" },
    { name: "项目 13", url: "", icon: "fas fa-code" },
    { name: "项目 14", url: "", icon: "fas fa-lock" },
    { name: "项目 15", url: "", icon: "fas fa-star" }
];

/**
 * 音乐文件配置数组
 * 格式：{ name: "歌曲名", url: "歌曲链接", artist: "歌手名", album: "专辑名" }
 * 注意：这里从filelist.txt中提取所有.mp3文件
 */
const MUSIC_FILES = [
    // 从filelist.txt中提取的MP3文件
    { 
        name: "未命名星系𝔘𝔫𝔱𝔦𝔱𝔩𝔢𝔡 𝔊𝔞𝔩𝔞𝔵𝔶_星尘原创_奥莉安多幻想曲", 
        url: "https://yingo6.netlify.app/%E2%80%9C%E6%9C%AA%E5%91%BD%E5%90%8D%E6%98%9F%E7%B3%BB%F0%9D%94%98%F0%9D%94%8D%F0%9D%94%9D%F0%9D%94%A1%F0%9D%94%9D%F0%9D%94%84%F0%9D%94%9D%F0%9D%94%8A%F0%9D%94%85%E2%80%9D/%E2%80%9C%E6%9C%AA%E5%91%BD%E5%90%8D%E6%98%9F%E7%B3%BB%F0%9D%94%98%F0%9D%94%8D%F0%9D%94%9D%F0%9D%94%A1%F0%9D%94%9D%F0%9D%94%84%F0%9D%94%9D%F0%9D%94%8A%F0%9D%94%85%E2%80%9D_%E6%98%9F%E5%B0%98%E5%8E%9F%E5%88%9B_%E5%A5%A5%E8%8E%89%E5%AE%89%E5%A4%9A%E5%B9%BB%E6%83%B3%E6%9B%B2.mp3", 
        artist: "在虚无中永存", 
        album: "未命名星系" 
    },
    { 
        name: "oc角色曲合集", 
        url: "https://yingo6.netlify.app/%E6%82%A6%E7%81%B5%E9%9F%B3/oc%E8%A7%92%E8%89%B2%E6%9B%B2%E5%90%88%E9%9B%86_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "悦灵音" 
    },
    { 
        name: "oc角色曲合集", 
        url: "https://yingo6.netlify.app/%E6%82%A6%E7%81%B5%E9%9F%B3/oc%E8%A7%92%E8%89%B2%E6%9B%B2%E5%90%88%E9%9B%86_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98%20(1).mp3", 
        artist: "在虚无中永存", 
        album: "悦灵音" 
    },
    { 
        name: "【纯音乐手风琴改编】死别", 
        url: "https://yingo6.netlify.app/%E6%AD%BB%E5%88%AB/%E3%80%90%E7%BA%AF%E9%9F%B3%E4%B9%90%E6%89%8B%E9%A3%8E%E7%90%B4%E6%94%B9%E7%BC%96%E3%80%91%E6%AD%BB%E5%88%AB_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "死别" 
    },
    { 
        name: "【诗岸】幸福安定剂", 
        url: "https://yingo6.netlify.app/%E6%B7%B7%E6%B2%8C%EF%BC%8C%E8%99%9A%E6%97%A0%E4%B8%8E%E7%BA%AF%E7%9C%9F%E4%B9%8B%E6%AD%8C/%E3%80%90%E8%AF%97%E5%B2%B8%E3%80%91%E5%B9%B8%E7%A6%8F%E5%AE%89%E5%AE%9A%E5%89%82/%E3%80%90%E8%AF%97%E5%B2%B8%E3%80%91%E5%B9%B8%E7%A6%8F%E5%AE%89%E5%AE%9A%E5%89%82_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "混沌，虚无与纯真之歌" 
    },
    { 
        name: "【诗岸】日记「2025.02.25」", 
        url: "https://yingo6.netlify.app/%E6%B7%B7%E6%B2%8C%EF%BC%8C%E8%99%9A%E6%97%A0%E4%B8%8E%E7%BA%AF%E7%9C%9F%E4%B9%8B%E6%AD%8C/%E3%80%90%E8%AF%97%E5%B2%B8%E3%80%91%E6%97%A5%E8%AE%B0%E3%80%8C2025.02.25%E3%80%8D/%E3%80%90%E8%AF%97%E5%B2%B8%E3%80%91%E6%97%A5%E8%AE%B0%E3%80%8C2025.02.25%E3%80%8D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "混沌，虚无与纯真之歌" 
    },
    { 
        name: "【诗岸】演绎", 
        url: "https://yingo6.netlify.app/%E6%B7%B7%E6%B2%8C%EF%BC%8C%E8%99%9A%E6%97%A0%E4%B8%8E%E7%BA%AF%E7%9C%9F%E4%B9%8B%E6%AD%8C/%E3%80%90%E8%AF%97%E5%B2%B8%E3%80%91%E6%BC%94%E7%BB%8E/%E3%80%90%E8%AF%97%E5%B2%B8%E3%80%91%E6%BC%94%E7%BB%8E_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "混沌，虚无与纯真之歌" 
    },
    { 
        name: "序章_「新叶词」", 
        url: "https://yingo6.netlify.app/%E7%BA%AF%E4%B8%8E%E6%B2%8C/%E5%BA%8F%E7%AB%A0_%E3%80%8C%E6%96%B0%E5%8F%B6%E8%AF%8D%E3%80%8D/%E5%BA%8F%E7%AB%A0_%E3%80%8C%E6%96%B0%E5%8F%B6%E8%AF%8D%E3%80%8D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "纯与沌" 
    },
    { 
        name: "第一章_「自由之爱」", 
        url: "https://yingo6.netlify.app/%E7%BA%AF%E4%B8%8E%E6%B2%8C/%E7%AC%AC%E4%B8%80%E7%AB%A0_%E3%80%8C%E8%87%AA%E7%94%B1%E4%B9%8B%E7%88%B1%E3%80%8D/%E7%AC%AC%E4%B8%80%E7%AB%A0_%E3%80%8C%E8%87%AA%E7%94%B1%E4%B9%8B%E7%88%B1%E3%80%8D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "纯与沌" 
    },
    { 
        name: "第七章_【皑如山上雪】", 
        url: "https://yingo6.netlify.app/%E7%BA%AF%E4%B8%8E%E6%B2%8C/%E7%AC%AC%E4%B8%83%E7%AB%A0_%E3%80%90%E7%9A%91%E5%A6%82%E5%B1%B1%E4%B8%8A%E9%9B%AA%E3%80%91/%E7%AC%AC%E4%B8%83%E7%AB%A0_%E3%80%90%E7%9A%91%E5%A6%82%E5%B1%B1%E4%B8%8A%E9%9B%AA%E3%80%91_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "纯与沌" 
    },
    { 
        name: "第三章_「未完待续」", 
        url: "https://yingo6.netlify.app/%E7%BA%AF%E4%B8%8E%E6%B2%8C/%E7%AC%AC%E4%B8%89%E7%AB%A0_%E3%80%8C%E6%9C%AA%E5%AE%8C%E5%BE%85%E7%BB%AD%E3%80%8D/%E7%AC%AC%E4%B8%89%E7%AB%A0_%E3%80%8C%E6%9C%AA%E5%AE%8C%E5%BE%85%E7%BB%AD%E3%80%8D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "纯与沌" 
    },
    { 
        name: "第二章_「于是你再一次盛开」", 
        url: "https://yingo6.netlify.app/%E7%BA%AF%E4%B8%8E%E6%B2%8C/%E7%AC%AC%E4%BA%8C%E7%AB%A0_%E3%80%8C%E4%BA%8E%E6%98%AF%E4%BD%A0%E5%86%8D%E4%B8%80%E6%AC%A1%E7%9B%9B%E5%BC%80%E3%80%8D/%E7%AC%AC%E4%BA%8C%E7%AB%A0_%E3%80%8C%E4%BA%8E%E6%98%AF%E4%BD%A0%E5%86%8D%E4%B8%80%E6%AC%A1%E7%9B%9B%E5%BC%80%E3%80%8D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "纯与沌" 
    },
    { 
        name: "第五章_【夜之声】", 
        url: "https://yingo6.netlify.app/%E7%BA%AF%E4%B8%8E%E6%B2%8C/%E7%AC%AC%E4%BA%94%E7%AB%A0_%E3%80%90%E5%A4%9C%E4%B9%8B%E5%A3%B0%E3%80%91/%E7%AC%AC%E4%BA%94%E7%AB%A0_%E3%80%90%E5%A4%9C%E4%B9%8B%E5%A3%B0%E3%80%91_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "纯与沌" 
    },
    { 
        name: "第六章_【长生树】", 
        url: "https://yingo6.netlify.app/%E7%BA%AF%E4%B8%8E%E6%B2%8C/%E7%AC%AC%E5%85%AD%E7%AB%A0_%E3%80%90%E9%95%BF%E7%94%9F%E6%A0%91%E3%80%91/%E7%AC%AC%E5%85%AD%E7%AB%A0_%E3%80%90%E9%95%BF%E7%94%9F%E6%A0%91%E3%80%91_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "纯与沌" 
    },
    { 
        name: "第四章_「无畏之心」", 
        url: "https://yingo6.netlify.app/%E7%BA%AF%E4%B8%8E%E6%B2%8C/%E7%AC%AC%E5%9B%9B%E7%AB%A0_%E3%80%8C%E6%97%A0%E7%95%8F%E4%B9%8B%E5%BF%83%E3%80%8D/%E7%AC%AC%E5%9B%9B%E7%AB%A0_%E3%80%8C%E6%97%A0%E7%95%8F%E4%B9%8B%E5%BF%83%E3%80%8D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "纯与沌" 
    },
    { 
        name: "英雄主义", 
        url: "https://yingo6.netlify.app/%E8%8B%B1%E9%9B%84%E4%B8%BB%E4%B9%89/1.%E2%80%9C%E8%8B%B1%E9%9B%84%E4%B8%BB%E4%B9%89%E2%80%9D/1.%E2%80%9C%E8%8B%B1%E9%9B%84%E4%B8%BB%E4%B9%89%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "英雄主义" 
    },
    { 
        name: "英雄主义pt.2", 
        url: "https://yingo6.netlify.app/%E8%8B%B1%E9%9B%84%E4%B8%BB%E4%B9%89/%E8%8B%B1%E9%9B%84%E4%B8%BB%E4%B9%89pt.2/%E8%8B%B1%E9%9B%84%E4%B8%BB%E4%B9%89pt.2_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "英雄主义" 
    },
    { 
        name: "英雄主义【完整版】", 
        url: "https://yingo6.netlify.app/%E8%8B%B1%E9%9B%84%E4%B8%BB%E4%B9%89/%E8%8B%B1%E9%9B%84%E4%B8%BB%E4%B9%89%E3%80%90%E5%AE%8C%E6%95%B4%E7%89%88%E3%80%91/%E8%8B%B1%E9%9B%84%E4%B8%BB%E4%B9%89%E3%80%90%E5%AE%8C%E6%95%B4%E7%89%88%E3%80%91_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "英雄主义" 
    },
    { 
        name: "英雄主义", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/1.%E2%80%9C%E8%8B%B1%E9%9B%84%E4%B8%BB%E4%B9%89%E2%80%9D/1.%E2%80%9C%E8%8B%B1%E9%9B%84%E4%B8%BB%E4%B9%89%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "再见？", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/10.%E2%80%9C%E5%86%8D%E8%A7%81%EF%BC%9F%E2%80%9D/10.%E2%80%9C%E5%86%8D%E8%A7%81%EF%BC%9F%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "你与我的最终曲", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/11.%E2%80%9C%E4%BD%A0%E4%B8%8E%E6%88%91%E7%9A%84%E6%9C%80%E7%BB%88%E6%9B%B2%E2%80%9D/11.%E2%80%9C%E4%BD%A0%E4%B8%8E%E6%88%91%E7%9A%84%E6%9C%80%E7%BB%88%E6%9B%B2%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "向花朵祈愿", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/12.%E2%80%9C%E5%90%91%E8%8A%B1%E6%9C%B5%E7%A5%88%E6%84%BF%E2%80%9D/12.%E2%80%9C%E5%90%91%E8%8A%B1%E6%9C%B5%E7%A5%88%E6%84%BF%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "荒诞儿戏", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/13.%E2%80%9C%E8%8D%92%E8%AF%9E%E5%84%BF%E6%88%8F%E2%80%9D/13.%E2%80%9C%E8%8D%92%E8%AF%9E%E5%84%BF%E6%88%8F%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "眠于春天", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/14.%E2%80%9C%E7%9C%A0%E4%BA%8E%E6%98%A5%E5%A4%A9%E2%80%9D/14.%E2%80%9C%E7%9C%A0%E4%BA%8E%E6%98%A5%E5%A4%A9%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "晶状星体", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/15.%E2%80%9C%E6%99%B6%E7%8A%B6%E6%98%9F%E4%BD%93%E2%80%9D/15.%E2%80%9C%E6%99%B6%E7%8A%B6%E6%98%9F%E4%BD%93%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "清醒梦", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/2.%E2%80%9C%E6%B8%85%E9%86%92%E6%A2%A6%E2%80%9D/2.%E2%80%9C%E6%B8%85%E9%86%92%E6%A2%A6%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "泣爱", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/3.%E2%80%9C%E6%B3%A3%E7%88%B1%E2%80%9D/3.%E2%80%9C%E6%B3%A3%E7%88%B1%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "你所期盼的春天", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/4.%E2%80%9C%E4%BD%A0%E6%89%80%E6%9C%9F%E7%9B%BC%E7%9A%84%E6%98%A5%E5%A4%A9%E2%80%9D/4.%E2%80%9C%E4%BD%A0%E6%89%80%E6%9C%9F%E7%9B%BC%E7%9A%84%E6%98%A5%E5%A4%A9%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "失落花园", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/5.%E2%80%9C%E5%A4%B1%E8%90%BD%E8%8A%B1%E5%9B%AD%E2%80%9D/5.%E2%80%9C%E5%A4%B1%E8%90%BD%E8%8A%B1%E5%9B%AD%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "新世纪", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/6.%E2%80%9C%E6%96%B0%E4%B8%96%E7%BA%AA%E2%80%9D/6.%E2%80%9C%E6%96%B0%E4%B8%96%E7%BA%AA%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "旧日里", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/7.%E2%80%9C%E6%97%A7%E6%97%A5%E9%87%8C%E2%80%9D/7.%E2%80%9C%E6%97%A7%E6%97%A5%E9%87%8C%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "记忆之门", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/8.%E2%80%9C%E8%AE%B0%E5%BF%86%E4%B9%8B%E9%97%A8%E2%80%9D/8.%E2%80%9C%E8%AE%B0%E5%BF%86%E4%B9%8B%E9%97%A8%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    },
    { 
        name: "捕星人", 
        url: "https://yingo6.netlify.app/%E8%AF%9E%E6%84%BF/9.%E2%80%9C%E6%8D%95%E6%98%9F%E4%BA%BA%E2%80%9D/9.%E2%80%9C%E6%8D%95%E6%98%9F%E4%BA%BA%E2%80%9D_%E5%9C%A8%E8%99%9A%E6%97%A0%E4%B8%AD%E6%B0%B8%E5%AD%98.mp3", 
        artist: "在虚无中永存", 
        album: "诞愿" 
    }
];

// ========== 全局变量 ==========

/**
 * 音乐播放器状态管理
 */
const MusicPlayerState = {
    audioPlayer: null,          // 音频元素引用
    currentTrackIndex: 0,       // 当前播放的曲目索引
    isPlaying: false,           // 播放状态标志
    volume: 0.7,                // 音量值（0-1范围）
    
    // DOM元素引用
    elements: {
        buttonsContainer: null,
        playPauseBtn: null,
        prevBtn: null,
        nextBtn: null,
        progressBar: null,
        progress: null,
        currentTimeEl: null,
        durationEl: null,
        volumeSlider: null,
        volumeProgress: null,
        fileCountEl: null,
        trackTitleEl: null,
        trackArtistEl: null,
        trackAlbumEl: null
    }
};

// ========== 工具函数 ==========

/**
 * 格式化时间显示（秒转换为MM:SS格式）
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * 计算点击位置在元素上的百分比
 * @param {Event} event - 点击事件
 * @param {HTMLElement} element - 目标元素
 * @returns {number} 点击位置的百分比（0-1）
 */
function getClickPercentage(event, element) {
    const rect = element.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    return Math.max(0, Math.min(1, clickX / width));
}

// ========== 项目按钮模块 ==========

/**
 * 初始化项目按钮
 */
function initializeProjectButtons() {
    const container = document.getElementById('buttons-container');
    
    // 清空容器（防止重复初始化）
    container.innerHTML = '';
    
    // 遍历项目配置，创建按钮
    PROJECTS.forEach(project => {
        const btn = document.createElement('a');
        
        if (project.url && project.url.trim() !== '') {
            // 有URL的项目：创建可点击按钮
            btn.href = project.url;
            btn.target = "_blank";
            btn.className = "project-btn";
            btn.innerHTML = `
                <i class="${project.icon}"></i>
                <span>${project.name}</span>
            `;
        } else {
            // 无URL的项目：创建隐藏按钮
            btn.className = "project-btn hidden";
        }
        
        container.appendChild(btn);
    });
}

// ========== 音乐播放器模块 ==========

/**
 * 初始化音乐播放器
 */
function initializeMusicPlayer() {
    // 获取DOM元素引用
    MusicPlayerState.elements = {
        buttonsContainer: document.getElementById('buttons-container'),
        playPauseBtn: document.getElementById('play-pause-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        progressBar: document.getElementById('progress-bar'),
        progress: document.getElementById('progress'),
        currentTimeEl: document.getElementById('current-time'),
        durationEl: document.getElementById('duration'),
        volumeSlider: document.getElementById('volume-slider'),
        volumeProgress: document.getElementById('volume-progress'),
        fileCountEl: document.getElementById('file-count'),
        trackTitleEl: document.getElementById('track-title'),
        trackArtistEl: document.getElementById('track-artist'),
        trackAlbumEl: document.getElementById('track-album')
    };
    
    // 获取音频元素
    MusicPlayerState.audioPlayer = document.getElementById('audio-player');
    
    // 设置初始音量
    MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
    
    // 更新文件计数显示
    updateFileCount();
    
    // 更新音量显示
    updateVolumeDisplay();
    
    // 加载第一首歌曲
    loadTrack(0);
    
    // 设置事件监听器
    setupMusicEventListeners();
}

/**
 * 更新文件计数显示
 */
function updateFileCount() {
    const count = MUSIC_FILES.length;
    MusicPlayerState.elements.fileCountEl.textContent = `${count} 首歌曲`;
}

/**
 * 更新音量显示
 */
function updateVolumeDisplay() {
    const volumePercent = MusicPlayerState.volume * 100;
    MusicPlayerState.elements.volumeProgress.style.width = `${volumePercent}%`;
}

/**
 * 加载指定索引的歌曲
 * @param {number} index - 歌曲索引
 */
function loadTrack(index) {
    // 验证索引范围
    if (index < 0 || index >= MUSIC_FILES.length) {
        console.warn(`无效的歌曲索引: ${index}`);
        return;
    }
    
    // 更新当前曲目索引
    MusicPlayerState.currentTrackIndex = index;
    const track = MUSIC_FILES[index];
    
    // 设置音频源
    MusicPlayerState.audioPlayer.src = track.url;
    
    // 更新UI显示
    updateTrackInfo(track);
    
    // 重置进度条
    resetProgress();
    
    // 如果是播放状态，开始播放
    if (MusicPlayerState.isPlaying) {
        MusicPlayerState.audioPlayer.play();
    }
}

/**
 * 更新歌曲信息显示
 * @param {Object} track - 歌曲对象
 */
function updateTrackInfo(track) {
    MusicPlayerState.elements.trackTitleEl.textContent = track.name;
    MusicPlayerState.elements.trackArtistEl.textContent = track.artist || "在虚无中永存";
    MusicPlayerState.elements.trackAlbumEl.textContent = track.album || "未知专辑";
}

/**
 * 重置进度条
 */
function resetProgress() {
    MusicPlayerState.elements.progress.style.width = '0%';
    MusicPlayerState.elements.currentTimeEl.textContent = '0:00';
    MusicPlayerState.elements.durationEl.textContent = '0:00';
}

/**
 * 播放歌曲
 */
function playTrack() {
    if (MUSIC_FILES.length === 0) {
        console.warn('没有可播放的歌曲');
        return;
    }
    
    MusicPlayerState.isPlaying = true;
    MusicPlayerState.audioPlayer.play();
    MusicPlayerState.elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
}

/**
 * 暂停歌曲
 */
function pauseTrack() {
    MusicPlayerState.isPlaying = false;
    MusicPlayerState.audioPlayer.pause();
    MusicPlayerState.elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
}

/**
 * 切换播放/暂停状态
 */
function togglePlayPause() {
    if (MUSIC_FILES.length === 0) return;
    
    if (MusicPlayerState.isPlaying) {
        pauseTrack();
    } else {
        playTrack();
    }
}

/**
 * 播放下一首歌曲
 */
function playNextTrack() {
    if (MUSIC_FILES.length === 0) return;
    
    const nextIndex = (MusicPlayerState.currentTrackIndex + 1) % MUSIC_FILES.length;
    loadTrack(nextIndex);
    playTrack();
}

/**
 * 播放上一首歌曲
 */
function playPreviousTrack() {
    if (MUSIC_FILES.length === 0) return;
    
    const prevIndex = (MusicPlayerState.currentTrackIndex - 1 + MUSIC_FILES.length) % MUSIC_FILES.length;
    loadTrack(prevIndex);
    playTrack();
}

/**
 * 更新播放进度显示
 */
function updateProgressDisplay() {
    const { currentTime, duration } = MusicPlayerState.audioPlayer;
    
    if (duration > 0) {
        // 计算进度百分比
        const progressPercent = (currentTime / duration) * 100;
        MusicPlayerState.elements.progress.style.width = `${progressPercent}%`;
        
        // 更新时间显示
        MusicPlayerState.elements.currentTimeEl.textContent = formatTime(currentTime);
        MusicPlayerState.elements.durationEl.textContent = formatTime(duration);
    }
}

/**
 * 设置播放进度
 * @param {Event} event - 点击事件
 */
function setPlaybackProgress(event) {
    const percentage = getClickPercentage(event, MusicPlayerState.elements.progressBar);
    const duration = MusicPlayerState.audioPlayer.duration;
    
    if (duration) {
        MusicPlayerState.audioPlayer.currentTime = percentage * duration;
    }
}

/**
 * 设置音量
 * @param {Event} event - 点击事件
 */
function setVolume(event) {
    const percentage = getClickPercentage(event, MusicPlayerState.elements.volumeSlider);
    
    // 更新音量值
    MusicPlayerState.volume = percentage;
    MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
    
    // 更新音量显示
    updateVolumeDisplay();
}

/**
 * 设置音乐播放器事件监听器
 */
function setupMusicEventListeners() {
    const { 
        playPauseBtn, prevBtn, nextBtn, 
        progressBar, volumeSlider 
    } = MusicPlayerState.elements;
    
    // 播放控制按钮事件
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPreviousTrack);
    nextBtn.addEventListener('click', playNextTrack);
    
    // 音频元素事件
    MusicPlayerState.audioPlayer.addEventListener('timeupdate', updateProgressDisplay);
    MusicPlayerState.audioPlayer.addEventListener('ended', playNextTrack);
    MusicPlayerState.audioPlayer.addEventListener('loadedmetadata', () => {
        const duration = formatTime(MusicPlayerState.audioPlayer.duration);
        MusicPlayerState.elements.durationEl.textContent = duration;
    });
    
    // 进度条事件
    progressBar.addEventListener('click', setPlaybackProgress);
    
    // 音量控制事件（修复版本）
    volumeSlider.addEventListener('click', setVolume);
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * 处理键盘快捷键
 * @param {KeyboardEvent} event - 键盘事件
 */
function handleKeyboardShortcuts(event) {
    // 防止在输入框中触发快捷键
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch(event.key) {
        case ' ': // 空格键：播放/暂停
            event.preventDefault();
            togglePlayPause();
            break;
            
        case 'ArrowRight': // 右箭头+Ctrl：下一首
            if (event.ctrlKey) {
                event.preventDefault();
                playNextTrack();
            }
            break;
            
        case 'ArrowLeft': // 左箭头+Ctrl：上一首
            if (event.ctrlKey) {
                event.preventDefault();
                playPreviousTrack();
            }
            break;
            
        case '+': // 增加音量
        case '=':
            if (event.ctrlKey) {
                event.preventDefault();
                MusicPlayerState.volume = Math.min(1, MusicPlayerState.volume + 0.1);
                MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
                updateVolumeDisplay();
            }
            break;
            
        case '-': // 减小音量
            if (event.ctrlKey) {
                event.preventDefault();
                MusicPlayerState.volume = Math.max(0, MusicPlayerState.volume - 0.1);
                MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
                updateVolumeDisplay();
            }
            break;
    }
}

// ========== 页面初始化 ==========

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面初始化开始...');
    
    // 初始化项目按钮
    initializeProjectButtons();
    
    // 初始化音乐播放器
    initializeMusicPlayer();
    
    console.log('页面初始化完成');
    console.log(`加载了 ${PROJECTS.length} 个项目，其中 ${PROJECTS.filter(p => p.url).length} 个可见`);
    console.log(`加载了 ${MUSIC_FILES.length} 首歌曲`);
});

// 导出模块（如果使用模块系统）
// export { initializeProjectButtons, initializeMusicPlayer, MusicPlayerState };
[file content end]