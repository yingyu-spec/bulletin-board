/**
 * 條列式公告檢視模組 (list.js)
 * 負責渲染科技感、大字、清晰明亮的條列式卡片清單
 */

const ListView = {
  container: null,

  init() {
    this.container = document.getElementById('announcementList');
  },

  /**
   * 渲染公告卡片清單
   * @param {Array} announcements - 公告陣列
   */
  render(announcements) {
    if (!this.container) return;

    if (!announcements || announcements.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-state-icon">📡</div>
          <div class="empty-state-text">目前尚無任何公告</div>
          <div class="empty-state-sub">點擊右上角「+ 發布新公告」建立第一筆出勤或工作事項</div>
        </div>
      `;
      return;
    }

    // 依日期降序排序 (最新在前)
    const sorted = [...announcements].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const html = sorted.map(item => {
      const weekday = item.dayOfWeek || DataStore.getDayOfWeek(item.date, true);
      const isWeekendSat = weekday.includes('六');
      const isWeekendSun = weekday.includes('日');
      const weekendClass = isWeekendSun ? 'weekend-sun' : (isWeekendSat ? 'weekend-sat' : '');

      // 出勤人員徽章 (01~16)
      const attendees = Array.isArray(item.attendees) ? item.attendees : [];
      const attendeesHtml = attendees.length > 0 
        ? attendees.sort().map(num => `<span class="attendee-chip" title="出勤同仁">${num} 號</span>`).join('')
        : '<span style="color: var(--text-muted); font-size: 1rem;">無指定出勤人員</span>';

      return `
        <article class="announcement-card" data-id="${item.id}">
          <!-- 左側：特大日期與星期標籤 -->
          <div class="card-date-column">
            <div class="card-date-primary">${item.date}</div>
            <div class="card-date-weekday ${weekendClass}">${weekday}</div>
          </div>

          <!-- 中央：公告內文與出勤人員 01~16 -->
          <div class="card-body-column">
            <div class="card-content-text">${this.escapeHtml(item.content)}</div>
            <div class="attendees-section">
              <span class="attendees-label">👥 出勤：</span>
              ${attendeesHtml}
            </div>
          </div>

          <!-- 右側：發布人、時間與操作 -->
          <div class="card-meta-column">
            <div class="meta-author-box">
              <span class="meta-author-title">發布人員</span>
              <span class="meta-author-badge">
                <strong>${item.author || '01'}</strong> 號
              </span>
            </div>

            <div class="meta-publish-time" title="發布時間">
              🕒 ${item.createdAt || ''}
            </div>

            <div class="card-actions-btn-group">
              <button type="button" class="btn-card-action" onclick="App.openEditModal('${item.id}')">✏️ 編輯</button>
              <button type="button" class="btn-card-action danger" onclick="App.requestDelete('${item.id}')">🗑️ 刪除</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    this.container.innerHTML = html;
  },

  /**
   * 簡易 HTML 跳脫防 XSS
   */
  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }
};
