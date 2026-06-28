/**
 * body.js - 项目网格模块 (Material Design 3)
 * 功能：渲染项目卡片，内嵌样式，支持动态卸载
 * 开关：BODY_ENABLED
 * 
 * 【图标重匹配说明】
 * - home: home
 * - 我的三体: public (科幻/宇宙)
 * - 三体2: animation (2D 动画相关)
 * - 永远的单摆: show_chart (数据图表/模拟)
 * - 单摆: monitoring (保留，较合适)
 * - Github主页: code (开发)
 * - 网站后台: dashboard (管理后台)
 * - openlist: cloud (或 list_alt 但 cloud 也合理)
 * - 聊天室: forum (合适)
 * - music1: library_music (合适)
 * - 洛伦兹吸引子: data_thresholding (混沌/数据)
 * - 追捕: gps_fixed (追踪)
 * - 字醒: edit_note (文字编辑)
 * - 壁纸: wallpaper (合适)
 * - 博客: rss_feed (订阅/博客)
 * - 流萤 Firebee: flash_on (发光/萤火)
 * - 十日备案: verified (备案/认证)
 * - 旧版入口: history (历史)
 * - 尘光: visibility (可见/尘光)
 * - 五子棋: grid_on (棋盘)
 * - RTS: military_tech (战略游戏)
 * - 箴: code (编程)
 * - 有理: robot (AI 机器人)
 * - MoonJump: rocket (火箭跳跃)
 * - Chess: chess (国际象棋)
 */
const BODY_ENABLED = true;

(function() {
    'use strict';

    if (!BODY_ENABLED) {
        window.__registerExtension && window.__registerExtension('body.js', function(){});
        return;
    }

    // ---------- 有效项目（18个），已重新匹配图标 ----------
    const VALID_PROJECTS = [
        { name: "home", url: "https://github.com/yingo-server", icon: "home" },
        { name: "我的三体", url: "/3d", icon: "public" },
        { name: "三体2", url: "/2d", icon: "animation" },
        { name: "永远的单摆", url: "/bai/dev", icon: "show_chart" },
        { name: "单摆", url: "/bai", icon: "monitoring" },
        { name: "Github主页", url: "http://github.com/yingo-server", icon: "code" },
        { name: "网站后台", url: "https://yingo2.netlify.app", icon: "dashboard" },
        { name: "openlist", url: "https://jreepmqo.sealosbja.site/", icon: "cloud" },
        { name: "聊天室", url: "/chat", icon: "forum" },
        { name: "酷狗收藏室", url: "/music", icon: "library_music" },
        { name: "洛伦兹吸引子", url: "/luo", icon: "data_thresholding" },
        { name: "追捕", url: "/zhui", icon: "gps_fixed" },
        { name: "字醒", url: "/word", icon: "edit_note" },
        { name: "壁纸", url: "/wall", icon: "wallpaper" },
        { name: "博客", url: "http://yingos.netlify.app/", icon: "rss_feed" },
        { name: "流萤 Firebee", url: "/firefly", icon: "flash_on" },
        { name: "十日备案", url: "https://icp-yingo.netlify.app/", icon: "verified" }
    ];

    // ---------- 预留30个空位（您可直接在此填空）----------
    const EMPTY_SLOTS = [
        { name: "旧版入口", url: "/history", icon: "history" },        // 1
        { name: "尘光", url: "/dust", icon: "visibility" },            // 2
        { name: "五子棋", url: "/5pieces", icon: "grid_on" },          // 3
        { name: "RTS", url: "/rts", icon: "military_tech" },           // 4
        { name: "箴", url: "/tk", icon: "code" },                      // 5
        { name: "有理", url: "/AI", icon: "robot" },                   // 6
        { name: "MoonJump", url: "/moonjump", icon: "rocket" },        // 7
        { name: "Chess", url: "/chess", icon: "chess" },               // 8
        { name: "kugou", url: "/kugou/mobile", icon: "music" }, // 9
        { name: "MCJS", url: "https://www.mcjs.cc/", icon: "craft" }, // 10
        { name: "", url: "", icon: "" }, // 11
        { name: "", url: "", icon: "" }, // 12
        { name: "", url: "", icon: "" }, // 13
        { name: "", url: "", icon: "" }, // 14
        { name: "", url: "", icon: "" }, // 15
        { name: "", url: "", icon: "" }, // 16
        { name: "", url: "", icon: "" }, // 17
        { name: "", url: "", icon: "" }, // 18
        { name: "", url: "", icon: "" }, // 19
        { name: "", url: "", icon: "" }, // 20
        { name: "", url: "", icon: "" }, // 21
        { name: "", url: "", icon: "" }, // 22
        { name: "", url: "", icon: "" }, // 23
        { name: "", url: "", icon: "" }, // 24
        { name: "", url: "", icon: "" }, // 25
        { name: "", url: "", icon: "" }, // 26
        { name: "", url: "", icon: "" }, // 27
        { name: "", url: "", icon: "" }, // 28
        { name: "", url: "", icon: "" }, // 29
        { name: "", url: "", icon: "" }  // 30
    ];

    const PROJECTS = [...VALID_PROJECTS, ...EMPTY_SLOTS];

    let styleElement = null;
    const containerId = 'buttons-container';
    let container = null;

    function injectStyles() {
        if (styleElement) return;
        styleElement = document.createElement('style');
        styleElement.setAttribute('data-module', 'body.js');
        styleElement.textContent = `
            .buttons-grid {
                display: grid;
                gap: var(--md3-spacing-md, 16px);
                justify-content: center;
                margin: 0 auto;
                grid-template-columns: repeat(auto-fit, minmax(var(--md3-grid-min-column-width, 130px), 1fr));
            }
            @media (max-width: 599px) {
                .buttons-grid {
                    grid-template-columns: repeat(3, 1fr) !important;
                }
            }
            @media (min-width: 600px) and (max-width: 719px) {
                .buttons-grid {
                    grid-template-columns: repeat(4, 1fr);
                }
            }
            @media (min-width: 720px) {
                .buttons-grid {
                    grid-template-columns: repeat(5, 1fr);
                }
            }
            .project-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-decoration: none;
                background: var(--md3-primary-container);
                color: var(--md3-on-primary-container);
                padding: var(--md3-spacing-sm);
                border-radius: var(--md3-shape-corner-large);
                transition: background 0.2s ease;
                border: none;
                aspect-ratio: 1 / 1;
                width: 100%;
                height: auto;
                overflow: hidden;
                text-align: center;
                word-break: break-word;
                box-shadow: none;
            }
            .project-btn:hover {
                background: var(--md3-secondary-container);
            }
            .project-btn .material-symbols-outlined {
                font-size: 32px;
                margin-bottom: 4px;
                font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 40;
            }
            .project-btn span:not(.material-symbols-outlined) {
                font: var(--md3-body-medium);
                color: var(--md3-on-primary-container);
                max-width: 100%;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
                padding: 0 2px;
            }
        `;
        document.head.appendChild(styleElement);
    }

    function renderButtons() {
        container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        PROJECTS.forEach(project => {
            const btn = document.createElement('a');
            if (project.url && project.url.trim() !== '') {
                btn.href = project.url;
                btn.target = '_blank';
                btn.rel = 'noopener noreferrer';
                btn.className = 'project-btn';
                const iconSpan = document.createElement('span');
                iconSpan.className = 'material-symbols-outlined';
                iconSpan.textContent = project.icon || 'link';
                const textSpan = document.createElement('span');
                textSpan.textContent = project.name;
                btn.appendChild(iconSpan);
                btn.appendChild(textSpan);
            } else {
                btn.className = 'project-btn hidden';
            }
            container.appendChild(btn);
        });
    }

    function init() {
        injectStyles();
        renderButtons();
    }

    function destroy() {
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
            styleElement = null;
        }
        const c = document.getElementById(containerId);
        if (c) c.innerHTML = '';
    }

    init();
    window.__registerExtension && window.__registerExtension('body.js', destroy);
})();
