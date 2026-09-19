/**
 * 今日公告檢視模組 (today.js)
 * 純顯示今天的公告，大字、清楚、無操作按鈕
 */

const TodayView = {

  /**
   * 取得今天的日期字串 'YYYY-MM-DD'
   */
  getTodayStr() {
    const now = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  },

  /**
   * 渲染今日公告
   * @param {Array} announcements - 所有公告陣列
   */
  render(announcements) {
    const container = document.getElementById('todayAnnouncementContent');
    if (!container) return;

    const today = this.getTodayStr();
    const weekday = DataStore.getDayOfWeek(today, true);
    const todayItems = (announcements || [])
      .filter(item => (item.date || '').startsWith(today))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // ── 頂部日期大標題 ──
    const dateHeader = `
      <div style="
        text-align: center;
        padding: 28px 0 20px;
        border-bottom: 2px solid var(--border-tech);
        margin-bottom: 24px;
      ">
        <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px;">TODAY</div>
        <div style="font-size: 2.6rem; font-weight: 900; color: var(--text-primary); letter-spacing: 2px;">${today}</div>
        <div style="
          display: inline-block;
          background: var(--cyber-blue);
          color: #fff;
          font-size: 1.2rem;
          font-weight: 800;
          padding: 4px 22px;
          border-radius: 999px;
          margin-top: 8px;
          letter-spacing: 2px;
        ">${weekday}</div>
      </div>
    `;

    // ── 無公告狀態 ──
    if (todayItems.length === 0) {
      container.innerHTML = dateHeader + `
        <div class="empty-state-box" style="margin-top: 40px;">
          <div class="empty-state-icon" style="font-size: 3.5rem;">📭</div>
          <div class="empty-state-text" style="font-size: 1.4rem;">今日尚無任何公告</div>
          <div class="empty-state-sub" style="font-size: 1rem;">可點擊右上角「+ 發布新公告」新增今日事項</div>
        </div>
      `;
      return;
    }

    // ── 公告卡片清單（純顯示，大字） ──
    const cardsHtml = todayItems.map((item, idx) => {
      const timeStr = (item.date || '').split(' ')[1] || '';
      const attendees = Array.isArray(item.attendees) ? item.attendees : [];
      const attendeesHtml = attendees.length > 0
        ? attendees.sort().map(num =>
            `<span class="attendee-chip" style="font-size:1.1rem; padding:6px 14px;">${num} 號</span>`
          ).join('')
        : '<span style="color:var(--text-muted);">無指定</span>';

      return `
        <div style="
          background: #fff;
          border: 2px solid var(--border-tech);
          border-left: 6px solid var(--cyber-blue);
          border-radius: var(--radius-lg);
          padding: 28px 32px;
          margin-bottom: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transition: box-shadow 0.2s;
        ">
          <!-- 序號 + 時間 -->
          <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">
            <div style="
              background: var(--cyber-blue);
              color: #fff;
              font-size: 1.1rem;
              font-weight: 900;
              width: 36px; height: 36px;
              border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              flex-shrink: 0;
            ">${idx + 1}</div>
            ${timeStr ? `<div style="font-size:1.4rem; font-weight:900; color:var(--cyber-blue); letter-spacing:2px;">⏰ ${timeStr}</div>` : ''}
            <div style="margin-left:auto; font-size:0.95rem; color:var(--text-muted);">
              發布人：<strong style="color:var(--cyber-blue);">${item.author || ''} 號</strong>
            </div>
          </div>

          <!-- 公告內文（大字） -->
          <div style="
            font-size: 1.45rem;
            font-weight: 700;
            color: var(--text-primary);
            line-height: 1.7;
            margin-bottom: 20px;
            white-space: pre-wrap;
          ">${ListView.escapeHtml(item.content)}</div>

          <!-- 出勤人員 -->
          <div style="
            background: #f0f9ff;
            border: 1.5px solid #bae6fd;
            border-radius: var(--radius-md);
            padding: 14px 18px;
          ">
            <div style="font-size:1rem; font-weight:800; color:var(--text-muted); margin-bottom:10px;">👥 今日出勤人員</div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">${attendeesHtml}</div>
          </div>
        </div>
      `;
    }).join('');

    // ── 底部統計 ──
    const summary = `
      <div style="text-align:center; padding: 16px 0; color:var(--text-muted); font-size:1rem; font-weight:700;">
        共 ${todayItems.length} 則今日公告
      </div>
    `;

    container.innerHTML = dateHeader + cardsHtml + summary;
  }
};
