// Dark/light switch, shared by every page on tvserviceschicago.com.
//
// Dark stays the default: the site has always been dark, and picking up the
// visitor's OS setting would silently flip the look for most phone traffic.
// Light is opt-in, remembered in localStorage, and shared across tabs.
//
// The <head> of each page carries a tiny inline twin of applyTheme() that runs
// before first paint, so a returning light-mode visitor never sees a dark flash.
// This file only builds the control.

(function () {
    'use strict';

    var STORAGE_KEY = 'tvicTheme';
    var DARK_META = '#0A0A0A';
    var LIGHT_META = '#F7F3EA';

    var STRINGS = {
        en: { light: 'Light', dark: 'Dark', toLight: 'Switch to light mode', toDark: 'Switch to dark mode' },
        es: { light: 'Claro', dark: 'Oscuro', toLight: 'Cambiar a modo claro', toDark: 'Cambiar a modo oscuro' },
        pl: { light: 'Jasny', dark: 'Ciemny', toLight: 'Przełącz na tryb jasny', toDark: 'Przełącz na tryb ciemny' }
    };

    var lang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    var t = STRINGS[lang] || STRINGS.en;

    var SUN = '<svg class="theme-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>';
    var MOON = '<svg class="theme-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.3 8.3 0 1 0 10.5 10.5z"/></svg>';

    function read() {
        try {
            var v = localStorage.getItem(STORAGE_KEY);
            return v === 'light' || v === 'dark' ? v : null;
        } catch (e) {
            return null;
        }
    }

    function write(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) {
            /* private browsing: the choice just won't outlive the page */
        }
    }

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        var meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', theme === 'light' ? LIGHT_META : DARK_META);
    }

    function current() {
        return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    // Button advertises the theme it will switch TO, which is the convention
    // people expect from a two-state control.
    function paint(button) {
        var next = current() === 'light' ? 'dark' : 'light';
        button.innerHTML = (next === 'light' ? SUN : MOON) +
            '<span class="theme-toggle-label">' + (next === 'light' ? t.light : t.dark) + '</span>';
        button.setAttribute('aria-label', next === 'light' ? t.toLight : t.toDark);
        button.setAttribute('aria-pressed', current() === 'light' ? 'true' : 'false');
    }

    function build() {
        if (document.querySelector('.theme-toggle')) return;

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'theme-toggle';

        var host = document.querySelector('.lang-switch');
        if (host) {
            host.appendChild(button);
        } else {
            button.classList.add('theme-toggle--floating');
            document.body.appendChild(button);
        }

        paint(button);

        button.addEventListener('click', function () {
            var next = current() === 'light' ? 'dark' : 'light';
            apply(next);
            write(next);
            paint(button);
        });

        // Keep other open tabs in step.
        window.addEventListener('storage', function (e) {
            if (e.key !== STORAGE_KEY) return;
            apply(e.newValue === 'light' ? 'light' : 'dark');
            paint(button);
        });
    }

    apply(read() || current());

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
