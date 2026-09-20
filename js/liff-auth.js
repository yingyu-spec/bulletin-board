/**
 * LINE LIFF 認證與 01~16 成員身分管理模組 (liff-auth.js)
 * 支援 LINE 登入後自動綁定 / 選擇 01~16 號碼
 */

const LiffAuth = {
  currentUser: { id: '01', name: '01 號' },
  lineProfile: null,   // LINE 個人資料 { userId, displayName, pictureUrl }
  isLiffReady: false,

  /* ─────────────────────────────────────────
     初始化
  ───────────────────────────────────────── */
  async init() {
    // 1. 從本地讀取上次選定的號碼
    const savedId = localStorage.getItem('bulletin_current_user_id') || '01';
    const member  = CONFIG.MEMBERS.find(m => m.id === savedId) || CONFIG.MEMBERS[0];
    this.currentUser = { ...member };

    // 2. 初始化 LINE LIFF（若有設定 LIFF_ID）
    if (CONFIG.LIFF_ID && CONFIG.LIFF_ID.trim() !== '' && typeof liff !== 'undefined') {
      try {
        await liff.init({ liffId: CONFIG.LIFF_ID });
        this.isLiffReady = true;

        if (liff.isLoggedIn()) {
          this.lineProfile = await liff.getProfile();
          await this._handleAfterLogin();   // ← 核心：登入後處理綁定
        } else {
          // 從 LINE 圖文選單／LIFF URL 進入時，直接開啟授權流程。
          // 授權完成後會回到目前網址，接著自動查詢或建立綁定。
          liff.login({ redirectUri: window.location.href });
          return;
        }
      } catch (err) {
        console.warn('⚠️ LIFF 初始化失敗:', err);
        this.updateLineUI(false);
      }
    } else {
      this.updateLineUI(false);
    }

    this.renderUserUI();
  },

  /* ─────────────────────────────────────────
     LINE 登入後處理：查詢綁定 → 自動設定或彈窗
  ───────────────────────────────────────── */
  async _handleAfterLogin() {
    if (!this.lineProfile) return;

    this.updateLineUI(true);

    // 查詢 GAS：此 LINE User 是否已綁定號碼
    const bound = await this._fetchBoundMember(this.lineProfile.userId);

    if (bound) {
      // 已綁定 → 自動切換到對應號碼
      this.setCurrentUser(bound);
      if (window.App) {
        window.App.showToast(`✅ LINE 已綁定 ${bound} 號，自動登入成功！`, 'success');
      }
    } else {
      // 未綁定 → 開啟選號視窗
      this._openBindingModal();
    }
  },

  /* ─────────────────────────────────────────
     查詢 GAS：此 LINE UserID 對應哪個號碼
  ───────────────────────────────────────── */
  async _fetchBoundMember(lineUserId) {
    if (!CONFIG.GAS_API_URL || CONFIG.GAS_API_URL.trim() === '') return null;
    try {
      const url = `${CONFIG.GAS_API_URL}?action=getUserByLineId&lineUserId=${encodeURIComponent(lineUserId)}&t=${Date.now()}`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const res = await resp.json();
      if (res && res.status === 'success' && res.memberId) {
        return res.memberId; // '01'~'16'
      }
    } catch (e) {
      console.warn('查詢綁定失敗', e);
    }
    return null;
  },

  /* ─────────────────────────────────────────
     呼叫 GAS 儲存 LINE ↔ 號碼 綁定
  ───────────────────────────────────────── */
  async _saveBinding(memberId) {
    if (!CONFIG.GAS_API_URL || CONFIG.GAS_API_URL.trim() === '') {
      throw new Error('尚未設定 Google Apps Script API 網址');
    }
    if (!this.lineProfile) {
      throw new Error('尚未取得 LINE 使用者資料，請重新登入');
    }
    try {
      const url = `${CONFIG.GAS_API_URL}?action=bindUser` +
        `&memberId=${encodeURIComponent(memberId)}` +
        `&lineUserId=${encodeURIComponent(this.lineProfile.userId)}` +
        `&displayName=${encodeURIComponent(this.lineProfile.displayName || '')}` +
        `&t=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API 回應錯誤：${response.status}`);

      const result = await response.json();
      if (!result || result.status !== 'success') {
        throw new Error((result && result.message) || '伺服器未完成綁定');
      }
      return true;
    } catch (e) {
      console.warn('儲存綁定失敗', e);
      throw e;
    }
  },

  /* ─────────────────────────────────────────
     開啟「選擇號碼」綁定視窗
  ───────────────────────────────────────── */
  _openBindingModal() {
    const modal = document.getElementById('lineBindingModal');
    if (!modal) return;

    // 顯示 LINE 暱稱
    const nameEl = document.getElementById('lineBindingDisplayName');
    if (nameEl && this.lineProfile) {
      nameEl.textContent = this.lineProfile.displayName || 'LINE 使用者';
    }

    modal.classList.add('active');
  },

  closeBindingModal() {
    document.getElementById('lineBindingModal')?.classList.remove('active');
  },

  /* 使用者點選號碼後確認綁定 */
  async confirmBinding(memberId) {
    const btn = document.getElementById('btnConfirmBinding');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ 綁定中...'; }

    try {
      await this._saveBinding(memberId);
      this.setCurrentUser(memberId);
      this.closeBindingModal();
      if (window.App) {
        window.App.showToast(`🎉 LINE 帳號已成功綁定 ${memberId} 號！`, 'success');
      }
    } catch (e) {
      if (window.App) {
        window.App.showToast(`綁定失敗：${e.message || '請確認網路與 GAS 部署設定後重試'}`, 'error');
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '確認綁定'; }
    }
  },

  /* ─────────────────────────────────────────
     切換使用者號碼 (01~16)
  ───────────────────────────────────────── */
  setCurrentUser(userId) {
    const member = CONFIG.MEMBERS.find(m => m.id === userId);
    if (member) {
      this.currentUser = { ...member };
      localStorage.setItem('bulletin_current_user_id', userId);
      this.renderUserUI();
      if (window.App && typeof window.App.onUserChanged === 'function') {
        window.App.onUserChanged(this.currentUser);
      }
    }
  },

  getCurrentUser() { return this.currentUser; },

  /* ─────────────────────────────────────────
     更新頂部 UI 顯示
  ───────────────────────────────────────── */
  renderUserUI() {
    const tagEl = document.getElementById('currentUserIdTag');
    if (tagEl) tagEl.textContent = `${this.currentUser.id} 號`;

    const postAuthorDisplay = document.getElementById('postAuthorDisplay');
    if (postAuthorDisplay) postAuthorDisplay.textContent = `${this.currentUser.id} 號成員`;

    const selectEl = document.getElementById('userSwitcherSelect');
    if (selectEl && selectEl.value !== this.currentUser.id) selectEl.value = this.currentUser.id;
  },

  /* LINE 按鈕外觀 */
  updateLineUI(isLoggedIn) {
    const btn    = document.getElementById('btnLineAuth');
    const textEl = document.getElementById('lineAuthText');
    if (!btn || !textEl) return;

    if (isLoggedIn && this.lineProfile) {
      textEl.textContent = `LINE: ${this.lineProfile.displayName || '已登入'}`;
      btn.style.background = '#0ea5e9';
      btn.title = '點擊登出 LINE';
    } else {
      textEl.textContent = 'LINE 登入';
      btn.style.background = '#06c755';
      btn.title = '點擊進行 LINE 登入授權';
    }
  },

  /* LINE 登入 / 登出 切換 */
  toggleLineLogin() {
    if (!this.isLiffReady) {
      if (window.App) window.App.showToast('💡 目前為本機模式，請用上方選單切換號碼！');
      return;
    }
    if (liff.isLoggedIn()) {
      liff.logout();
      this.lineProfile = null;
      this.updateLineUI(false);
      if (window.App) window.App.showToast('已登出 LINE');
    } else {
      liff.login();
    }
  }
};
