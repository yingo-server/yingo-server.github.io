(function (global) {
    'use strict';

    var CM = global.CM = global.CM || {};

    var el = null;

    function switchTab(name) {
        var activeTab = el.querySelector('.settings__tab.is-active');
        if (activeTab) activeTab.classList.remove('is-active');

        var newTab = el.querySelector('[data-tab="' + name + '"]');
        if (newTab) newTab.classList.add('is-active');

        var activePanel = el.querySelector('.settings__panel.is-active');
        if (activePanel) activePanel.classList.remove('is-active');

        var newPanel = el.querySelector('[data-panel="' + name + '"]');
        if (newPanel) newPanel.classList.add('is-active');
    }

    function open() {
        if (!el) return;
        el.classList.add('is-active');
    }

    function close() {
        if (!el) return;
        el.classList.remove('is-active');
    }

    function init() {
        el = document.getElementById('settings');
        if (!el) return;

        var tabs = el.querySelectorAll('.settings__tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function (e) {
                var name = e.currentTarget.getAttribute('data-tab');
                switchTab(name);
            });
        }

        var closeBtn = el.querySelector('.settings__close');
        if (closeBtn) closeBtn.addEventListener('click', close);

        var backdrop = el.querySelector('.settings__backdrop');
        if (backdrop) backdrop.addEventListener('click', close);

        if (CM.clock && CM.clock.onZoneLongPress) {
            CM.clock.onZoneLongPress(1, open);
        }
    }

    CM.settings = {
        init: init,
        open: open,
        close: close,
        switchTab: switchTab
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(typeof window !== 'undefined' ? window : this);
