const Auth = {
    TOKEN_KEY: 'token',
    _me: null,

    getToken() { return sessionStorage.getItem(this.TOKEN_KEY); },
    setToken(t) { sessionStorage.setItem(this.TOKEN_KEY, t); },
    clear() { sessionStorage.removeItem(this.TOKEN_KEY); },

    decode(token) {
        try {
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const json = decodeURIComponent(
                atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
            );
            return JSON.parse(json);
        } catch { return null; }
    },

    // Payload si hay token válido y no vencido; si no, limpia y devuelve null
    getSession() {
        const token = this.getToken();
        if (!token) return null;
        const payload = this.decode(token);
        if (!payload || (payload.exp && payload.exp * 1000 <= Date.now())) {
            this.clear();
            return null;
        }
        return payload;
    },

    homePath() {
        const s = this.getSession();
        return s && s.roles.includes('admin') ? '/dashboard/admin' : '/dashboard/user';
    },

    // Protección de rutas: sin token => /signIn, sin rol => /403
    guard(allowedRoles = []) {
        const s = this.getSession();
        if (!s) { location.replace('/signIn'); return false; }
        if (allowedRoles.length && !s.roles.some(r => allowedRoles.includes(r))) {
            location.replace('/403');
            return false;
        }
        // Cierre automático cuando el token expire
        const ms = s.exp * 1000 - Date.now();
        if (ms > 0) setTimeout(() => Auth.logout(), ms);
        return true;
    },

    logout() {
        this.clear();
        location.replace('/signIn');
    },

    async api(path, options = {}) {
        const res = await fetch(path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + this.getToken(),
                ...(options.headers || {})
            }
        });
        if (res.status === 401) { this.logout(); throw new Error('Sesión expirada'); }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Error en la petición');
        return data;
    },

    // Datos del usuario logueado (GET /api/users/me), memorizado por página
    me(force = false) {
        if (force || !this._me) this._me = this.api('/api/users/me');
        return this._me;
    },

    esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    fmtDate(d) { // fechas "puras" como cumpleaños (UTC)
        return d ? new Date(d).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '-';
    },
    fmtDateLocal(d) {
        return d ? new Date(d).toLocaleDateString('es-PE') : '-';
    },

    avatar(u, size = 40) {
        const ini = ((u.name || '?').charAt(0) + (u.lastName || '').charAt(0)).toUpperCase();
        const img = u.url_profile ? `<img src="${this.esc(u.url_profile)}" alt="" onerror="this.remove()">` : '';
        return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px">${this.esc(ini)}${img}</span>`;
    },

    renderNav(u) {
        const el = document.getElementById('nav-user');
        if (!el) return;
        el.innerHTML = this.avatar(u, 34) +
            `<span class="hide-on-small-only">${this.esc(u.name + ' ' + u.lastName)}</span>` +
            '<i class="material-icons">arrow_drop_down</i>';
    },

    togglePw(id, icon) {
        const input = document.getElementById(id);
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        icon.textContent = show ? 'visibility_off' : 'visibility';
    }
};