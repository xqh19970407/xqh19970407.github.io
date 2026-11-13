(() => {
    'use strict';

    // Display starts at the owner's requested 370; the API stores new likes only.
    const initialLikes = 370;
    const api = 'https://applause.chabouis.fr';
    const page = 'https://xqh19970407.github.io/';
    const storageKey = 'homepage-liked-v1';
    const button = document.getElementById('like-button');
    const count = document.getElementById('like-count');
    const labelZh = document.getElementById('like-label-zh');
    const labelEn = document.getElementById('like-label-en');
    const message = document.getElementById('like-message');
    let total = 0;
    let ready = false;
    let pending = false;
    let liked = false;

    function savedLike() {
        try { return localStorage.getItem(storageKey) === '1'; }
        catch (_) { return false; }
    }

    function say(zh, en) {
        message.replaceChildren();
        [['lang-zh-inline', zh], ['lang-en-inline', en]].forEach(([cls, text]) => {
            const span = document.createElement('span');
            span.className = cls;
            span.textContent = text;
            message.appendChild(span);
        });
    }

    function render() {
        button.disabled = !ready || pending || liked;
        button.setAttribute('aria-pressed', String(liked));
        button.setAttribute('aria-busy', String(pending));
        labelZh.textContent = liked ? '已点赞' : pending ? '提交中…' : '点赞';
        labelEn.textContent = liked ? 'Liked' : pending ? 'Saving…' : 'Like';
        if (ready) count.textContent = (initialLikes + total).toLocaleString('en-US');
    }

    async function request(increment = false) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
            const options = { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' };
            if (increment) {
                options.method = 'POST';
                options.headers = { 'Content-Type': 'text/plain' };
                options.body = JSON.stringify('1,4.0.7');
            }
            const endpoint = increment ? 'update-claps' : 'get-claps';
            const response = await fetch(`${api}/${endpoint}?url=${encodeURIComponent(page)}`, options);
            if (!response.ok) throw new Error('Like service unavailable');
            const text = (await response.text()).trim();
            const value = Number(text);
            if (!/^\d+$/.test(text) || !Number.isSafeInteger(value + initialLikes)) throw new Error('Invalid count');
            return value;
        } finally {
            clearTimeout(timer);
        }
    }

    async function submit() {
        liked = liked || savedLike();
        if (liked) { render(); return; }
        const updated = await request(true);
        if (updated <= total) throw new Error('Like not accepted');
        total = updated;
        liked = true;
        try { localStorage.setItem(storageKey, '1'); } catch (_) { /* Keep this visit protected. */ }
        say('感谢支持！', 'Thank you for your support!');
    }

    button.addEventListener('click', async () => {
        if (!ready || pending || liked) return;
        pending = true;
        render();
        try {
            if (navigator.locks) await navigator.locks.request(storageKey, submit);
            else await submit();
        } catch (_) {
            say('暂未确认点赞，请稍后重试。', 'Your like could not be confirmed. Please try again later.');
        } finally {
            pending = false;
            render();
        }
    });

    window.addEventListener('storage', (event) => {
        if (event.key !== storageKey || event.newValue !== '1') return;
        liked = true;
        say('感谢支持！', 'Thank you for your support!');
        render();
        request().then((value) => { total = value; render(); }).catch(() => {});
    });

    liked = savedLike();
    render();
    request().then((value) => {
        total = value;
        ready = true;
        say(liked ? '感谢支持！' : '', liked ? 'Thank you for your support!' : '');
        render();
    }).catch(() => {
        say('赞数暂时无法加载，请稍后刷新。', 'Likes are temporarily unavailable. Please refresh later.');
    });
})();
