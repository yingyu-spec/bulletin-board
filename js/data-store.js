/**
 * 資料儲存與 API 串接層 (data-store.js)
 * 支援 Google Sheets (Google Apps Script Web App) 與本地 LocalStorage 離線/測試雙軌並行
 */

const DataStore = {
  // 本地快取鍵值
  STORAGE_KEY: 'bulletin_announcements_v1',

  /**
   * 計算特定日期的星期幾
   * @param {string} dateStr - 'YYYY-MM-DD'
   * @param {boolean} isFull - 是否返回完整如 '星期五' 或簡寫 '五'
   * @returns {string}
   */
  getDayOfWeek(dateStr, isFull = true) {
    if (!dateStr) return '';
    // 支援 'YYYY-MM-DD HH:mm' 或 'YYYY-MM-DDTHH:mm' 格式，只取日期部分
    const datePart = dateStr.split(' ')[0].split('T')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return '';
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const dayIndex = dateObj.getDay();
    return isFull ? CONFIG.WEEKDAYS[dayIndex] : CONFIG.WEEKDAYS_SHORT[dayIndex];
  },

  /**
   * 格式化當下時間為 'YYYY-MM-DD HH:mm'
   */
  formatCurrentDateTime() {
    const now = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const h = pad(now.getHours());
    const min = pad(now.getMinutes());
    return `${y}-${m}-${d} ${h}:${min}`;
  },

  /**
   * 取得初始預設測試資料 (若尚未連接 Google Sheet 即可立即體驗)
   */
  getInitialSampleData() {
    const today = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);
    const y = today.getFullYear();
    const m = pad(today.getMonth() + 1);
    const d = today.getDate();
    
    const formatDate = (offsetDays) => {
      const target = new Date(today);
      target.setDate(target.getDate() + offsetDays);
      return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
    };

    const d0 = formatDate(0);
    const d1 = formatDate(1);
    const d3 = formatDate(3);

    return [
      {
        id: 'ann_sample_1',
        date: d0,
        dayOfWeek: this.getDayOfWeek(d0, true),
        content: '今日全體常規早會與各區設備巡檢，請負責同仁於上午 09:30 前完成簽到。',
        attendees: ['01', '02', '05', '08'],
        author: '01',
        createdAt: `${d0} 08:30`
      },
      {
        id: 'ann_sample_2',
        date: d1,
        dayOfWeek: this.getDayOfWeek(d1, true),
        content: '重要專案里程碑交付與客戶展示會議，技術組與支援人員請備妥簡報與測試環境。',
        attendees: ['02', '03', '06', '11', '14'],
        author: '02',
        createdAt: `${d0} 14:20`
      },
      {
        id: 'ann_sample_3',
        date: d3,
        dayOfWeek: this.getDayOfWeek(d3, true),
        content: '例行性機房空調防護保養及備援發電機測試，屆時將有間歇性噪音。',
        attendees: ['04', '07', '09', '12', '16'],
        author: '04',
        createdAt: `${d0} 16:50`
      }
    ];
  },

  /**
   * 取得所有公告列表 (先嘗試 Google Sheets，失敗或未設定則讀取 LocalStorage)
   * @returns {Promise<Array>}
   */
  async getAnnouncements() {
    if (CONFIG.GAS_API_URL && CONFIG.GAS_API_URL.trim() !== '') {
      try {
        const response = await fetch(`${CONFIG.GAS_API_URL}?action=getAnnouncements&t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP 錯誤: ${response.status}`);
        const result = await response.json();
        if (result && result.status === 'success' && Array.isArray(result.data)) {
          // 同步快取至本地備份
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(result.data));
          return result.data;
        }
      } catch (err) {
        console.warn('⚠️ Google Sheets API 連線異常，將自動載入本地資料:', err);
      }
    }

    // 本地快取或預設示範資料
    const cached = localStorage.getItem(this.STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('解析本地快取資料失敗', e);
      }
    }

    const initialData = this.getInitialSampleData();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialData));
    return initialData;
  },

  /**
   * 新增或更新公告
   * @param {Object} item - 公告物件
   * @returns {Promise<Object>}
   */
  async saveAnnouncement(item) {
    // 確保欄位齊全與正確
    if (!item.id) {
      item.id = 'ann_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }
    if (!item.dayOfWeek) {
      item.dayOfWeek = this.getDayOfWeek(item.date, true);
    }
    if (!item.createdAt) {
      item.createdAt = this.formatCurrentDateTime();
    }
    if (!Array.isArray(item.attendees)) {
      item.attendees = [];
    }

    // 1. 若有 Google Apps Script API，優先以 GET (無 CORS 阻礙) 同步至 Google Sheets
    let cloudSynced = false;
    if (CONFIG.GAS_API_URL && CONFIG.GAS_API_URL.trim() !== '') {
      try {
        const jsonStr = JSON.stringify(item);
        const url = `${CONFIG.GAS_API_URL}?action=saveAnnouncement&data=${encodeURIComponent(jsonStr)}&t=${Date.now()}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const res = await resp.json();
          if (res && res.status === 'success' && Array.isArray(res.data)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(res.data));
            cloudSynced = true;
            return item;
          }
        }
      } catch (err) {
        console.warn('雲端 GET 儲存失敗，嘗試 POST 模式:', err);
        try {
          await fetch(CONFIG.GAS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'saveAnnouncement', payload: item })
          });
        } catch (e2) {
          console.warn('POST 亦發生警告:', e2);
        }
      }
    }

    // 2. 本地儲存即時更新 (若未透過雲端即時回傳完整資料)
    if (!cloudSynced) {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      let list = [];
      try { list = cached ? JSON.parse(cached) : []; } catch (e) { list = []; }
      const index = list.findIndex(p => String(p.id).trim() === String(item.id).trim());
      if (index >= 0) {
        list[index] = item;
      } else {
        list.unshift(item);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    }
    return item;
  },

  /**
   * 刪除公告 (支援雲端與本機即時雙向清除)
   * @param {string} id - 公告 ID
   * @returns {Promise<boolean>}
   */
  async deleteAnnouncement(id) {
    let cloudSynced = false;
    if (CONFIG.GAS_API_URL && CONFIG.GAS_API_URL.trim() !== '') {
      try {
        const url = `${CONFIG.GAS_API_URL}?action=deleteAnnouncement&id=${encodeURIComponent(id)}&t=${Date.now()}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const res = await resp.json();
          if (res && res.status === 'success' && Array.isArray(res.data)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(res.data));
            cloudSynced = true;
            return true;
          }
        }
      } catch (err) {
        console.warn('GET 刪除失敗，嘗試 POST 模式:', err);
        try {
          await fetch(CONFIG.GAS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deleteAnnouncement', payload: { id } })
          });
        } catch (e2) {}
      }
    }

    // 本地快取立即移除該項
    const cached = localStorage.getItem(this.STORAGE_KEY);
    let list = [];
    try { list = cached ? JSON.parse(cached) : []; } catch (e) { list = []; }
    const filtered = list.filter(p => String(p.id).trim() !== String(id).trim());
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }
};
