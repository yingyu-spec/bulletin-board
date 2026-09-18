# ⚡ 智慧雲端佈告欄 (Google Sheets + LINE 登入 + 01~16 成員)

專為團隊設計的現代化佈告欄系統，具備**科技感明亮風格**與**超清晰大字體設計**，支援條列式與月曆行事曆雙重視圖切換，後端直接採用 Google 試算表（Google Sheets）儲存，無需租用主機。

---

## 🌟 核心特色

1. **科技感・明亮・大字 (High-Luminosity Tech Design)**：
   - 採用現代冰藍、電光青與極簡科技水晶質感，視覺輕快明亮、無壓迫感。
   - 特大字號與高對比排版，遠距或手機瀏覽皆一清二楚。
2. **條列式 + 行事曆 雙重視圖**：
   - **條列式**：左側大字號日期含**星期幾**（週六日彩色亮色區隔），中央突出公告內容與 01~16 出勤晶片標籤，右側清楚顯示發布人與發布時間。
   - **行事曆**：全螢幕科技月曆，完整呈現星期日到星期六，每日直接顯示出勤縮圖與排程筆數，點擊任一日期即可展開詳細資訊並直接在該日發布公告。
3. **01 ~ 16 號成員識別**：
   - 系統固定支援 01 到 16 號同仁。
   - 發布公告時可一鍵「全選」、「清空」或任意點選 01~16 大膠囊按鈕進行複選。
   - 頂部導覽列提供「**快速身分切換器**」，便於隨時切換 01~16 號進行操作與測試。
4. **LINE 登入 (LIFF 支援)**：
   - 整合 LINE Front-end Framework (LIFF)，支援在 LINE 內直接免密碼登入。
   - 支援本機模擬測試模式：即使尚未申請 LINE LIFF ID，也能立即透過右上角切換器測試所有功能。
5. **Google Sheets 雲端資料庫**：
   - 透過 Google Apps Script (GAS) 免費將 Google 試算表轉為高效 REST API，資料即時同步。

---

## 📂 專案檔案結構

```
公布欄/
├── index.html                   # 主系統介面 (包含條列式清單、月曆、新增彈窗)
├── css/
│   └── style.css                # 科技感明亮大字專屬樣式系統 (Tech Lumina)
├── js/
│   ├── config.js                # 全域配置 (GAS API 網址、LIFF ID、01~16 成員定義)
│   ├── data-store.js            # 資料存取層 (支援 Google Sheets 與 LocalStorage 本地模擬)
│   ├── liff-auth.js             # LINE 登入與 01~16 身分管理
│   ├── list.js                  # 條列式卡片檢視模組
│   ├── calendar.js              # 行事曆月曆檢視模組 (含星期與每日摘要)
│   └── app.js                   # 主控邏輯 (視圖切換、表單驗證、星期自動計算)
├── google-apps-script/
│   ├── Code.gs                  # Google 試算表後端程式碼 (複製貼上至 Apps Script)
│   └── 部署說明.md               # 3 步驟串接 Google Sheets 詳細教學
└── README.md                    # 本專案說明文件
```

---

## 🚀 快速開始

### 1. 本地即時預覽 (免設定即可玩)
直接以瀏覽器開啟 `index.html` 即可使用！系統內建完整預設示範資料與 01~16 身分切換器，可直接體驗新增公告、切換條列式/行事曆、依人員篩選等功能。

### 2. 連接 Google 試算表 (正式資料庫)
請參閱 [`google-apps-script/部署說明.md`](file:///Users/yingyu/Library/Mobile%20Documents/com~apple~CloudDocs/yingyu%E8%B3%87%E6%96%99/ai%E7%A8%8B%E5%BC%8F%E9%96%8B%E7%99%BC/%E5%85%AC%E5%B8%83%E6%AC%84/google-apps-script/部署說明.md)：
1. 在 Google 雲端硬碟新增一份 Google 試算表。
2. 進入「擴充功能」➔「Apps Script」，貼上 `Code.gs`。
3. 部署為網頁應用程式 (所有人可存取)。
4. 將取得的網址貼入 `js/config.js` 的 `GAS_API_URL` 即可！

### 3. 設定 LINE 登入 (可選)
若要在 LINE 群組或手機中透過 LINE 帳號登入：
1. 至 [LINE Developers Console](https://developers.line.biz/) 建立一個 Provider 與 LINE Login Channel。
2. 在 Channel 內新增 LIFF App，將網頁網址填入 Endpoint URL。
3. 複製 LIFF ID 並填入 `js/config.js` 的 `LIFF_ID` 即可。
