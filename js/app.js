/**
 * 主應用程式整合控制器 (app.js)
 * 協同管理資料流通、UI 互動、彈窗操作與事件監聽
 */

window.App = {
  announcements: [],
  selectedAttendees: new Set(),
  currentView: 'list', // 'list' or 'calendar'
  currentDayDetailDate: '',

  async init() {
    // 1. 初始化各模組
    ListView.init();
    CalendarView.init();
    await LiffAuth.init();

    // 2. 渲染身分選單與 01~16 出勤按鈕
    this.initMemberSelects();
    this.renderAttendeesGrid();
    this.renderBindingMemberGrid();  // LINE 綁定選號網格
    this.initTimeSelects();          // 24 小時制時間下拉

    // 3. 綁定全域按鈕與表單事件
    this.bindEvents();

    // 4. 載入並渲染公告資料
    await this.refreshData();
  },

  /**
   * 初始化 01~16 身分下拉選單與出勤篩選器
   */
  initMemberSelects() {
    const userSwitcher = document.getElementById('userSwitcherSelect');
    const filterSelect = document.getElementById('attendeeFilterSelect');
    const currentUser = LiffAuth.getCurrentUser();

    if (userSwitcher) {
      userSwitcher.innerHTML = CONFIG.MEMBERS.map(m => `
        <option value="${m.id}" ${m.id === currentUser.id ? 'selected' : ''}>
          切換操作：${m.name}
        </option>
      `).join('');

      userSwitcher.addEventListener('change', (e) => {
        LiffAuth.setCurrentUser(e.target.value);
      });
    }

    if (filterSelect) {
      const options = CONFIG.MEMBERS.map(m => `
        <option value="${m.id}">${m.name}</option>
      `).join('');
      filterSelect.innerHTML = `<option value="ALL">全部人員 (01~16)</option>` + options;

      filterSelect.addEventListener('change', () => this.applyFilters());
    }
  },

  /**
   * 生成 01~16 出勤人員大按鈕網格
   */
  renderAttendeesGrid() {
    const grid = document.getElementById('attendeesGrid');
    if (!grid) return;

    grid.innerHTML = CONFIG.MEMBERS.map(m => `
      <button type="button" class="attendee-btn-toggle" data-id="${m.id}" onclick="App.toggleAttendeeSelection('${m.id}')">
        ${m.id}
      </button>
    `).join('');
  },

  /**
   * 生成 LINE 綁定用的 01~16 號碼選擇網格
   */
  renderBindingMemberGrid() {
    const grid = document.getElementById('bindingMemberGrid');
    if (!grid) return;

    grid.innerHTML = CONFIG.MEMBERS.map(m => `
      <button type="button"
        class="attendee-btn-toggle"
        data-id="${m.id}"
        style="font-size:1.3rem; font-weight:900; padding:14px 0;"
        onclick="App.selectBindingMember('${m.id}')">
        ${m.id}
      </button>
    `).join('');
  },

  /**
   * 初始化 24 小時制時間下拉選單 (00~23 小時, 00~59 分鐘)
   */
  initTimeSelects() {
    const hourSel = document.getElementById('postHourInput');
    const minSel  = document.getElementById('postMinuteInput');
    if (!hourSel || !minSel) return;

    // 小時 00~23
    hourSel.innerHTML = Array.from({ length: 24 }, (_, i) => {
      const v = i.toString().padStart(2, '0');
      return `<option value="${v}">${v}</option>`;
    }).join('');

    // 分鐘 00~59
    minSel.innerHTML = Array.from({ length: 60 }, (_, i) => {
      const v = i.toString().padStart(2, '0');
      return `<option value="${v}">${v}</option>`;
    }).join('');
  },

  /**
   * 讀取当前選定的時間字串 'HH:mm'
   */
  getSelectedTime() {
    const h = document.getElementById('postHourInput')?.value  || '00';
    const m = document.getElementById('postMinuteInput')?.value || '00';
    return `${h}:${m}`;
  },

  /**
   * 設定小時與分鐘下拉選單
   */
  setSelectedTime(timeStr) {
    const parts = (timeStr || '').split(':');
    const h = (parts[0] || '00').padStart(2, '0');
    const m = (parts[1] || '00').padStart(2, '0');
    const hourSel = document.getElementById('postHourInput');
    const minSel  = document.getElementById('postMinuteInput');
    if (hourSel) hourSel.value = h;
    if (minSel)  minSel.value  = m;
  },

  /**
   * 點選綁定號碼
   */
  selectBindingMember(memberId) {
    // 清除所有選取
    document.querySelectorAll('#bindingMemberGrid .attendee-btn-toggle').forEach(btn => {
      btn.classList.remove('selected');
    });
    // 標記選取
    const btn = document.querySelector(`#bindingMemberGrid [data-id="${memberId}"]`);
    if (btn) btn.classList.add('selected');

    // 啟用確認按鈕並記錄選取的 ID
    const confirmBtn = document.getElementById('btnConfirmBinding');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.dataset.selectedId = memberId;
    }
  },

  /**
   * 切換某號碼的出勤選取狀態
   */
  toggleAttendeeSelection(memberId) {
    const btn = document.querySelector(`.attendee-btn-toggle[data-id="${memberId}"]`);
    if (this.selectedAttendees.has(memberId)) {
      this.selectedAttendees.delete(memberId);
      btn?.classList.remove('selected');
    } else {
      this.selectedAttendees.add(memberId);
      btn?.classList.add('selected');
    }
  },

  /**
   * 全選出勤人員
   */
  selectAllAttendees() {
    CONFIG.MEMBERS.forEach(m => {
      this.selectedAttendees.add(m.id);
      const btn = document.querySelector(`.attendee-btn-toggle[data-id="${m.id}"]`);
      btn?.classList.add('selected');
    });
  },

  /**
   * 清空出勤人員
   */
  clearAllAttendees() {
    this.selectedAttendees.clear();
    document.querySelectorAll('.attendee-btn-toggle').forEach(btn => {
      btn.classList.remove('selected');
    });
  },

  /**
   * 設定選取的出勤人員名單
   */
  setSelectedAttendees(attendeeArray) {
    this.clearAllAttendees();
    if (Array.isArray(attendeeArray)) {
      attendeeArray.forEach(id => this.toggleAttendeeSelection(id));
    }
  },

  /**
   * 綁定頁面互動事件
   */
  bindEvents() {
    // 視圖切換
    document.getElementById('tabBtnList')?.addEventListener('click', () => this.switchView('list'));
    document.getElementById('tabBtnCalendar')?.addEventListener('click', () => this.switchView('calendar'));

    // 新增公告彈窗觸發
    document.getElementById('btnOpenCreateModal')?.addEventListener('click', () => this.openCreateModal());
    document.getElementById('btnCloseModal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btnCancelModal')?.addEventListener('click', () => this.closeModal());

    // 出勤全選 / 清空
    document.getElementById('btnSelectAllAttendees')?.addEventListener('click', () => this.selectAllAttendees());
    document.getElementById('btnClearAllAttendees')?.addEventListener('click', () => this.clearAllAttendees());

    // 日期輸入變更時，立即動態計算並展示星期幾
    const dateInput = document.getElementById('postDateInput');
    dateInput?.addEventListener('input', (e) => this.updateDateWeekdayPreview(e.target.value));

    // 表單提交
    document.getElementById('announcementForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // 關鍵字搜尋即時過濾
    document.getElementById('searchInput')?.addEventListener('input', () => this.applyFilters());

    // 重新整理資料
    document.getElementById('btnRefreshData')?.addEventListener('click', () => this.refreshData(true));

    // LINE 登入按鈕
    document.getElementById('btnLineAuth')?.addEventListener('click', () => LiffAuth.toggleLineLogin());

    // 查看單日公告彈窗關閉
    document.getElementById('btnCloseDayDetailModal')?.addEventListener('click', () => this.closeDayDetailModal());
    document.getElementById('btnCloseDayDetailBtn')?.addEventListener('click', () => this.closeDayDetailModal());
    document.getElementById('btnAddNewPostOnThisDay')?.addEventListener('click', () => {
      const date = this.currentDayDetailDate;
      this.closeDayDetailModal();
      this.openCreateModal(date);
    });

    // 刪除確認彈窗事件
    document.getElementById('btnCloseConfirmDeleteModal')?.addEventListener('click', () => this.closeConfirmDeleteModal());
    document.getElementById('btnCancelDelete')?.addEventListener('click', () => this.closeConfirmDeleteModal());
    document.getElementById('btnConfirmDeleteExec')?.addEventListener('click', () => this.confirmExecuteDelete());

    // LINE 綁定彈窗事件
    document.getElementById('btnCancelBinding')?.addEventListener('click', () => LiffAuth.closeBindingModal());
  },

  /**
   * 切換視圖 (條列式 vs 行事曆)
   */
  switchView(viewName) {
    this.currentView = viewName;
    const tabList = document.getElementById('tabBtnList');
    const tabCal = document.getElementById('tabBtnCalendar');
    const secList = document.getElementById('listViewSection');
    const secCal = document.getElementById('calendarViewSection');

    if (viewName === 'list') {
      tabList.classList.add('active');
      tabCal.classList.remove('active');
      secList.style.display = 'flex';
      secCal.style.display = 'none';
      this.applyFilters();
    } else {
      tabCal.classList.add('active');
      tabList.classList.remove('active');
      secCal.style.display = 'block';
      secList.style.display = 'none';
      CalendarView.setData(this.announcements);
    }
  },

  /**
   * 日期變更時，即時更新星期預覽
   * @param {string} dateStr - 'YYYY-MM-DD'
   */
  updateDateWeekdayPreview(dateStr) {
    const textEl = document.getElementById('postWeekdayText');
    if (!textEl) return;
    if (!dateStr) { textEl.textContent = '尚未選擇日期'; return; }
    // 取日期部分計算星期
    const datePart = dateStr.split(' ')[0].split('T')[0];
    const fullWeekday = DataStore.getDayOfWeek(datePart, true);
    textEl.textContent = fullWeekday || '格式無效';
  },

  /**
   * 當使用者切換身分時
   */
  onUserChanged(newUser) {
    this.showToast(`已切換操作人員為：${newUser.name}`);
  },

  /**
   * 開啟新增公告 Modal
   */
  openCreateModal(targetDate = '') {
    const modal = document.getElementById('announcementModal');
    document.getElementById('modalFormTitle').innerHTML = `<span>📢</span><span>發布新公告</span>`;
    document.getElementById('editAnnouncementId').value = '';
    document.getElementById('postContentInput').value = '';

    const now = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);

    // 日期欄位
    let dateToSet = targetDate || `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    if (dateToSet.includes(' ')) dateToSet = dateToSet.split(' ')[0];
    if (dateToSet.includes('T')) dateToSet = dateToSet.split('T')[0];
    document.getElementById('postDateInput').value = dateToSet;

    // 時間下拉預設現在時間
    this.setSelectedTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);

    this.updateDateWeekdayPreview(dateToSet);

    // 清空並預設選取出勤同仁 (或預設當前登入者)
    this.clearAllAttendees();
    const currentUser = LiffAuth.getCurrentUser();
    this.toggleAttendeeSelection(currentUser.id);

    // 更新發布人名稱顯示
    document.getElementById('postAuthorDisplay').textContent = `${currentUser.name} (號碼: ${currentUser.id})`;

    modal?.classList.add('active');
  },

  /**
   * 開啟編輯公告 Modal
   */
  openEditModal(id) {
    const item = this.announcements.find(p => p.id === id);
    if (!item) return;

    const modal = document.getElementById('announcementModal');
    document.getElementById('modalFormTitle').innerHTML = `<span>✏️</span><span>編輯公告內容</span>`;
    document.getElementById('editAnnouncementId').value = item.id; // 編輯時回塡日期與時間到兩個欄位
    const existingDate = item.date || '';
    const datePart = existingDate.split(' ')[0];
    const timePart = existingDate.split(' ')[1] || '';
    document.getElementById('postDateInput').value = datePart;
    this.setSelectedTime(timePart);   // 回塡小時與分鐘到下拉
    this.updateDateWeekdayPreview(datePart);
    document.getElementById('postContentInput').value = item.content;

    this.setSelectedAttendees(item.attendees || []);
    document.getElementById('postAuthorDisplay').textContent = `${item.author || '01'} 號成員 (原作者)`;

    modal?.classList.add('active');
  },

  /**
   * 關閉公告 Modal
   */
  closeModal() {
    document.getElementById('announcementModal')?.classList.remove('active');
  },

  /**
   * 儲存公告 (新增或修改)
   */
  async handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('editAnnouncementId').value;
    const dateVal = document.getElementById('postDateInput').value;   // 'YYYY-MM-DD'
    const timeVal = this.getSelectedTime();                            // 'HH:mm'
    const date = `${dateVal} ${timeVal}`;
    const content = document.getElementById('postContentInput').value.trim();

    if (!dateVal || !content) {
      this.showToast('請務必填寫日期與公告內容！', 'error');
      return;
    }

    // 取日期部分計算星期
    const datePart = dateVal;
    const weekday = DataStore.getDayOfWeek(datePart, true);
    const attendees = Array.from(this.selectedAttendees);
    const currentUser = LiffAuth.getCurrentUser();

    const postPayload = {
      id: id || undefined,
      date: date,
      dayOfWeek: weekday,
      content: content,
      attendees: attendees,
      author: id ? undefined : currentUser.id, // 若為新增則填寫當前登入者
      createdAt: id ? undefined : DataStore.formatCurrentDateTime()
    };

    // 若為編輯，保留原作者與建立時間
    if (id) {
      const origin = this.announcements.find(p => p.id === id);
      if (origin) {
        postPayload.author = origin.author;
        postPayload.createdAt = origin.createdAt;
      }
    }

    const submitBtn = document.getElementById('btnSavePost');
    submitBtn.disabled = true;
    submitBtn.textContent = '儲存中...';

    try {
      await DataStore.saveAnnouncement(postPayload);
      this.closeModal();
      this.showToast(id ? '公告修改成功！' : '🎉 公告發布成功！', 'success');
      await this.refreshData();
    } catch (err) {
      this.showToast('儲存失敗，請重試: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '確認發布';
    }
  },

  pendingDeleteId: null,

  /**
   * 觸發刪除請求 (開啟自訂無閃退確認視窗)
   */
  requestDelete(id) {
    const item = this.announcements.find(p => p.id === id);
    if (!item) return;

    this.pendingDeleteId = id;
    const details = document.getElementById('confirmDeleteDetails');
    if (details) {
      const shortContent = item.content.length > 60 ? item.content.substring(0, 60) + '…' : item.content;
      details.innerHTML = `
        <div style="font-weight: 700; color: #0369a1; margin-bottom: 4px;">📅 日期：${item.date} (${item.dayOfWeek})</div>
        <div style="margin-bottom: 4px;"><strong>📝 內容：</strong>${ListView.escapeHtml(shortContent)}</div>
        <div><strong>👥 出勤：</strong>${(item.attendees || []).join(', ') || '無'}</div>
      `;
    }

    document.getElementById('confirmDeleteModal')?.classList.add('active');
  },

  /**
   * 關閉刪除確認視窗
   */
  closeConfirmDeleteModal() {
    this.pendingDeleteId = null;
    document.getElementById('confirmDeleteModal')?.classList.remove('active');
  },

  /**
   * 確認執行刪除 (同步雲端與本地)
   */
  async confirmExecuteDelete() {
    if (!this.pendingDeleteId) return;
    const id = this.pendingDeleteId;
    const btn = document.getElementById('btnConfirmDeleteExec');

    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ 刪除中...';
    }

    try {
      await DataStore.deleteAnnouncement(id);
      this.closeConfirmDeleteModal();
      this.showToast('✅ 公告已成功刪除！', 'success');
      await this.refreshData();

      // 若當前正開啟單日詳情視窗，即時更新該日內容
      if (this.currentDayDetailDate && document.getElementById('dayDetailModal')?.classList.contains('active')) {
        this.openDayDetailModal(this.currentDayDetailDate);
      }
    } catch (err) {
      this.showToast('刪除失敗: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '確認刪除';
      }
    }
  },

  /**
   * 從 DataStore 重新載入最新資料
   */
  async refreshData(showToastMsg = false) {
    const btn = document.getElementById('btnRefreshData');
    if (btn) btn.textContent = '🔄 讀取中...';

    try {
      this.announcements = await DataStore.getAnnouncements();
      this.applyFilters();
      CalendarView.setData(this.announcements);
      if (showToastMsg) {
        this.showToast('✅ 資料已完成同步最新狀態！', 'success');
      }
    } catch (e) {
      this.showToast('讀取公告失敗', 'error');
    } finally {
      if (btn) btn.textContent = '🔄 重新整理';
    }
  },

  /**
   * 執行關鍵字與人員篩選
   */
  applyFilters() {
    const keyword = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const attendeeFilter = document.getElementById('attendeeFilterSelect')?.value || 'ALL';

    let filtered = [...this.announcements];

    if (attendeeFilter !== 'ALL') {
      filtered = filtered.filter(item => {
        return Array.isArray(item.attendees) && item.attendees.includes(attendeeFilter);
      });
    }

    if (keyword) {
      filtered = filtered.filter(item => {
        const text = `${item.content} ${item.date} ${item.dayOfWeek} ${item.author}`.toLowerCase();
        const attendeeStr = (item.attendees || []).join(' ');
        return text.includes(keyword) || attendeeStr.includes(keyword);
      });
    }

    ListView.render(filtered);
  },

  /**
   * 開啟特定日期的公告詳細視窗 (從月曆點擊)
   */
  openDayDetailModal(dateStr) {
    this.currentDayDetailDate = dateStr;
    const weekday = DataStore.getDayOfWeek(dateStr, true);
    document.getElementById('dayDetailDateText').textContent = `${dateStr} (${weekday}) 公告與出勤`;

    const dayItems = this.announcements.filter(p => p.date === dateStr);
    const body = document.getElementById('dayDetailBody');

    if (dayItems.length === 0) {
      body.innerHTML = `
        <div class="empty-state-box" style="padding: 30px;">
          <div class="empty-state-icon" style="font-size: 2.5rem;">📅</div>
          <div class="empty-state-text" style="font-size: 1.15rem;">此日尚無任何出勤安排或公告事項</div>
          <div class="empty-state-sub">點擊下方按鈕可立即為 ${dateStr} 新增公告</div>
        </div>
      `;
    } else {
      body.innerHTML = dayItems.map(item => {
        const attendees = (item.attendees || []).map(num => `<span class="attendee-chip">${num} 號</span>`).join('');
        return `
          <div style="background: #f8fafc; border: 1.5px solid var(--border-tech); border-radius: var(--radius-md); padding: 18px; margin-bottom: 14px;">
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 10px;">
              ${ListView.escapeHtml(item.content)}
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
              <span style="font-weight: 800; color: var(--text-muted);">👥 出勤同仁：</span>
              ${attendees || '無指定'}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 0.95rem; color: var(--text-muted);">
              <span>發布人：<strong style="color: var(--cyber-blue);">${item.author} 號</strong> | ${item.createdAt}</span>
              <div>
                <button type="button" class="btn-card-action" onclick="App.openEditModal('${item.id}')">✏️ 編輯</button>
                <button type="button" class="btn-card-action danger" onclick="App.requestDelete('${item.id}')">🗑️ 刪除</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    document.getElementById('dayDetailModal')?.classList.add('active');
  },

  closeDayDetailModal() {
    document.getElementById('dayDetailModal')?.classList.remove('active');
  },

  /**
   * 顯示 Toast 浮動提示
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
};

// 頁面加載完成後自動啟動
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
