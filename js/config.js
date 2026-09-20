/**
 * 系統全域設定檔 (config.js)
 * 提供 Google Apps Script Web App 串接與 LINE LIFF 設定
 */
const CONFIG = {
  // 1. Google Apps Script 部署後的 Web App URL (部署完成後請替換此處)
  // 例: 'https://script.google.com/macros/s/AKfycbx.../exec'
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycby5pfEYygOVxY5Zm-hIsl3yuiS7V-MeSHW0HaQi6OE8zPxVYzfnIvxh_nSq1wzOtc8q/exec',

  // 2. LINE LIFF ID (若尚未申請，系統會自動使用本機模擬登入模式)
  // 例: '2001234567-abcdefgh'
  LIFF_ID: '2011665856-Jbwo8OoB',

  // 3. 成員名單 (01 ~ 16 號)
  MEMBERS: [
    { id: '01', name: '01 號' },
    { id: '02', name: '02 號' },
    { id: '03', name: '03 號' },
    { id: '04', name: '04 號' },
    { id: '05', name: '05 號' },
    { id: '06', name: '06 號' },
    { id: '07', name: '07 號' },
    { id: '08', name: '08 號' },
    { id: '09', name: '09 號' },
    { id: '10', name: '10 號' },
    { id: '11', name: '11 號' },
    { id: '12', name: '12 號' },
    { id: '13', name: '13 號' },
    { id: '14', name: '14 號' },
    { id: '15', name: '15 號' },
    { id: '16', name: '16 號' }
  ],

  // 星期對照表
  WEEKDAYS: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  WEEKDAYS_SHORT: ['日', '一', '二', '三', '四', '五', '六'],

  // 是否在未配置 GAS API 時啟用 LocalStorage 本地資料模擬模式
  ENABLE_LOCAL_FALLBACK: true
};
