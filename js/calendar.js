/**
 * 行事曆月曆檢視模組 (calendar.js)
 * 負責渲染科技感、大字、互動式月曆與當日公告出勤預覽
 */

const CalendarView = {
  currentDate: new Date(),
  announcements: [],
  container: null,
  titleElement: null,

  init() {
    this.container = document.getElementById('calendarDaysGrid');
    this.titleElement = document.getElementById('calCurrentMonthTitle');

    // 綁定月份導航按鈕
    document.getElementById('calBtnPrev')?.addEventListener('click', () => this.changeMonth(-1));
    document.getElementById('calBtnNext')?.addEventListener('click', () => this.changeMonth(1));
    document.getElementById('calBtnToday')?.addEventListener('click', () => this.goToToday());
  },

  /**
   * 設定公告資料並重新繪製行事曆
   */
  setData(announcements) {
    this.announcements = Array.isArray(announcements) ? announcements : [];
    this.render();
  },

  /**
   * 前進/後退月份
   */
  changeMonth(delta) {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    this.render();
  },

  /**
   * 回到今天
   */
  goToToday() {
    this.currentDate = new Date();
    this.render();
  },

  /**
   * 繪製當前月份行事曆
   */
  render() {
    if (!this.container) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth(); // 0-indexed

    // 更新頂部標題
    if (this.titleElement) {
      this.titleElement.textContent = `${year} 年 ${month + 1} 月`;
    }

    // 計算本月第一天是星期幾，以及本月總天數
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0(日) - 6(六)
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    // 上個月的天數 (用於填補第一週空格)
    const prevMonthDays = new Date(year, month, 0).getDate();

    // 計算今日日期字串 YYYY-MM-DD
    const today = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    // 將公告按日期分組以加快查詢
    const eventMap = {};
    this.announcements.forEach(item => {
      if (!item.date) return;
      // 公告日期可包含時間（YYYY-MM-DD HH:mm），月曆則以日期格為單位。
      const dateKey = String(item.date).split(' ')[0].split('T')[0];
      if (!eventMap[dateKey]) eventMap[dateKey] = [];
      eventMap[dateKey].push(item);
    });

    let cellsHtml = '';

    // 1. 上個月的溢出日期格子
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevMonth = month === 0 ? 12 : month;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${pad(prevMonth)}-${pad(dayNum)}`;

      cellsHtml += `
        <div class="calendar-day-cell other-month" onclick="CalendarView.onDayClick('${dateStr}')">
          <div class="day-header-row">
            <span class="day-number">${dayNum}</span>
          </div>
        </div>
      `;
    }

    // 2. 當月所有日期格子
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
      const isToday = dateStr === todayStr;
      const dayEvents = eventMap[dateStr] || [];
      const hasEvents = dayEvents.length > 0;

      // 產生當日活動前 2 條精簡摘要標籤 (配合格子大小簡化)
      const eventBadgesHtml = dayEvents.slice(0, 2).map(ev => {
        // 出勤人員精簡標記：例如 [01] 或 [01,02] 或 [01..]
        let attendeeSnippet = '';
        if (ev.attendees && ev.attendees.length > 0) {
          const first = ev.attendees[0];
          const label = ev.attendees.length === 1 
            ? `${first}` 
            : (ev.attendees.length === 2 ? `${first},${ev.attendees[1]}` : `${first}..`);
          attendeeSnippet = `<span class="cal-attendee-mini" title="出勤: ${ev.attendees.join(', ')}">${label}</span>`;
        }

        // 文字簡化：取純文字簡短摘要
        const rawContent = (ev.content || '').replace(/\s+/g, ' ').trim();
        const shortContent = rawContent.length > 7 ? rawContent.substring(0, 7) + '…' : rawContent;
        const fullTooltip = `${ev.content}\n👥 出勤: ${(ev.attendees || []).join(', ') || '無'}\n👤 發布: ${ev.author || '01'} 號`;

        return `
          <div class="day-event-badge" title="${this.escapeAttr(fullTooltip)}">
            ${attendeeSnippet}
            <span class="cal-event-text">${this.escapeHtml(shortContent)}</span>
          </div>
        `;
      }).join('');

      const moreCountBadge = dayEvents.length > 2 
        ? `<div class="day-more-badge">+${dayEvents.length - 2} 則</div>` 
        : '';

      cellsHtml += `
        <div class="calendar-day-cell ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''}" 
             onclick="CalendarView.onDayClick('${dateStr}')">
          <div class="day-header-row">
            <span class="day-number">${day}</span>
            ${hasEvents ? `<span class="day-event-count">${dayEvents.length}</span>` : ''}
          </div>
          <div class="day-events-list">
            ${eventBadgesHtml}
            ${moreCountBadge}
          </div>
        </div>
      `;
    }

    // 3. 下個月的溢出日期格子 (補滿最後一週 7 格)
    const totalCellsSoFar = firstDayIndex + totalDaysInMonth;
    const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
    for (let j = 1; j <= remainingCells; j++) {
      const nextMonth = month === 11 ? 1 : month + 2;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${pad(nextMonth)}-${pad(j)}`;

      cellsHtml += `
        <div class="calendar-day-cell other-month" onclick="CalendarView.onDayClick('${dateStr}')">
          <div class="day-header-row">
            <span class="day-number">${j}</span>
          </div>
        </div>
      `;
    }

    this.container.innerHTML = cellsHtml;
  },

  /**
   * 點擊某個日期格子
   */
  onDayClick(dateStr) {
    if (window.App && typeof window.App.openDayDetailModal === 'function') {
      window.App.openDayDetailModal(dateStr);
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  escapeAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;');
  }
};
