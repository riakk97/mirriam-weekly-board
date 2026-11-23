# Mirriam Daily & Weekly Board（固定網頁版）

搭配 Google Apps Script（`daily-briefing-gas`）與 Google 試算表運作的固定網頁前端，部署於 GitHub Pages 後可在手機與電腦隨時開啟：
- **跨日自動切換**：00:00（Asia/Taipei）過後打開即自動切換成今天最新畫面並即時讀取試算表。
- **📅 日曆查詢過往紀錄**：可挑選任意日期查看 `DailyArchive` 封存的每日簡報快照與當週任務。
- **⚡ 紅／黃／綠能量看板**：即時對接 `Mirriam_Weekly_Board` 的 `Tasks` 分頁，自動計算三層級能量配額（紅 ≤ 50%、黃 ≤ 25%、綠 ≥ 25%）。
- **🍅 番茄鐘 JSON 匯入**：貼上「番茄鐘專注小助手」Gemini Gem 產出的標準 JSON，預覽比對重複日期後一鍵寫入「番茄鐘專注總表（每日專注記錄）」的「總計／日均」上方並自動更新公式。

---

## 檔案結構
- `index.html`：主頁面（今日簡報、能量看板、番茄鐘匯入三大分頁與彈窗）
- `style.css`：乾燥玫瑰（`#7A3036` / `#A95C62`）× 霧霾藍（`#2F4B5E` / `#69899E`）× 暖白（`#FBF8F6`）手機自適應樣式
- `app.js`：前端邏輯、跨日偵測、GAS Web App API 串接與示範預覽模式
- `pomodoro-gem-prompt.md`：「番茄鐘專注小助手」Gemini Gem System Prompt

---

## 部署至 GitHub Pages 步驟

1. **先部署 GAS 後端 Web App**
   - 將 `../daily-briefing-gas/Code.gs` 與 `appsscript.json` 更新至你的 Google Apps Script 專案。
   - 點選 **部署 ＞ 新增部署 ＞ 網頁應用程式**（執行身分：`我`、誰可以存取：`所有人`），取得 `/exec` 網址。
   - （選填）可先打開 `app.js` 第一行，將 `DEFAULT_API_URL` 改成你的 `/exec` 網址，換手機或新瀏覽器打開就不用重貼；若留空也能透過網頁右上角 **⚙️ 連線設定** 儲存在該裝置的 `localStorage`。

2. **建立並推送至 GitHub Repository**
   ```bash
   cd /Users/nhmtw/.gemini/antigravity/scratch/mirriam-weekly-board
   git add .
   git commit -m "Initial Mirriam Daily & Weekly Board"
   # 在 GitHub 建立新 repo（建議設為 Public 以便免費啟用 GitHub Pages，若不填入 DEFAULT_API_URL 且啟用 WEB_API_TOKEN 則無外洩風險）
   git remote add origin https://github.com/<你的帳號>/mirriam-weekly-board.git
   git branch -M main
   git push -u origin main
   ```

3. **開啟 GitHub Pages**
   - 進入該 GitHub repo 的 **Settings ＞ Pages**。
   - **Build and deployment ＞ Source** 選 `Deploy from a branch`，Branch 選 `main`、資料夾選 `/ (root)`，按 **Save**。
   - 約 1–2 分鐘後即可獲得固定網址 `https://<你的帳號>.github.io/mirriam-weekly-board/`，可直接加到手機主畫面使用。
