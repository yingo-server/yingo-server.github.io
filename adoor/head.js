/**
 * head.js - 头部日期时间模块 (Flex版)
 * 功能：显示当前日期时间，始终位于页面顶部第一行
 * 开关：HEAD_ENABLED
 * 
 * 【2025.02.14 · Flex适配】
 * - 完全依赖父级 Flex 布局，无任何 Grid 操作
 * - 仅创建 header 元素，样式由内嵌控制
 */
const HEAD_ENABLED = true;

(function() {
    'use strict';

    if (!HEAD_ENABLED) {
        window.__registerExtension && window.__registerExtension('head.js', function(){});
        return;
    }

    let headerElement = null;
    let styleElement = null;
    let timeInterval = null;

    function injectStyles() {
        if (styleElement) return;
        styleElement = document.createElement('style');
        styleElement.setAttribute('data-module', 'head.js');
        styleElement.textContent = `
            #app-header {
                background: var(--md3-surface);
                color: var(--md3-on-surface);
                padding: var(--md3-spacing-md) var(--md3-spacing-lg);
                border-bottom: 1px solid var(--md3-surface-variant);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                width: 100%;
                box-sizing: border-box;
            }
            .datetime {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .date {
                font: var(--md3-title-medium);
                color: var(--md3-on-surface);
            }
            .time {
                font: var(--md3-title-large);
                color: var(--md3-primary);
            }
            @media (max-width: 480px) {
                #app-header {
                    padding: var(--md3-spacing-sm) var(--md3-spacing-md);
                }
                .date {
                    font: var(--md3-title-small);
                }
                .time {
                    font: var(--md3-title-medium);
                }
            }
        `;
        document.head.appendChild(styleElement);
    }

    function removeExistingHeader() {
        const existing = document.getElementById('app-header');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    }

    function createHeader() {
        headerElement = document.createElement('header');
        headerElement.id = 'app-header';
        headerElement.innerHTML = `
            <div class="datetime">
                <div class="date" id="header-date"></div>
                <div class="time" id="header-time"></div>
            </div>
        `;
        // 插入到 body 最前面（Flex 第一项）
        const body = document.body;
        if (body.firstChild) {
            body.insertBefore(headerElement, body.firstChild);
        } else {
            body.appendChild(headerElement);
        }
    }

    function updateDateTime() {
        const dateEl = document.getElementById('header-date');
        const timeEl = document.getElementById('header-time');
        if (!dateEl || !timeEl) return;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const weekday = weekdays[now.getDay()];
        dateEl.textContent = `${year}年${month}月${day}日 ${weekday}`;
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }

    function startTimer() {
        if (timeInterval) clearInterval(timeInterval);
        updateDateTime();
        timeInterval = setInterval(updateDateTime, 1000);
    }

    function stopTimer() {
        if (timeInterval) { clearInterval(timeInterval); timeInterval = null; }
    }

    function init() {
        removeExistingHeader();
        injectStyles();
        createHeader();
        startTimer();
    }

    function destroy() {
        stopTimer();
        removeExistingHeader();
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
            styleElement = null;
        }
        headerElement = null;
    }

    init();
    window.__registerExtension && window.__registerExtension('head.js', destroy);
})();