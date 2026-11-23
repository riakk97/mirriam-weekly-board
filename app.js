/**
 * Mirriam Daily & Weekly Board 前端應用程式（純靜態零建置，適用 GitHub Pages）
 *
 * 部署時若想直接固定連線網址，可於下方 DEFAULT_API_URL 填入你的 GAS Web App (/exec) URL，
 * 亦可留空並透過網頁右上角「⚙️ 連線設定」存在本機 localStorage。
 */
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycby05fp4vZkLg9mVQg4Aco-KZ9zYO0AOI_suPEz2dwFzMXWDoMosMcrBq2F3jQgDJuQ/exec';

const STORAGE_KEYS = {
  API_URL: 'mirriam_board_api_url',
  API_TOKEN: 'mirriam_board_api_token',
  DEMO_MODE: 'mirriam_board_demo_mode'
};

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

const state = {
  apiUrl: '',
  apiToken: '',
  demoMode: false,
  knownToday: getTaipeiTodayStr(),
  selectedDate: getTaipeiTodayStr(),
  weekStart: '',
  activeTab: 'briefing',
  zoneFilter: 'all',
  briefingSource: 'live',
  briefingUpdatedAt: '',
  briefing: null,
  archiveDates: [],
  tasks: [],
  pomoData: null,
  parsedPomoRecords: []
};

/* ============================================================================
 * 日期與台北時區工具（00:00 自動換日）
 * ========================================================================== */

function getTaipeiTodayStr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function getWeekdayIndex(dateStr) {
  const dt = new Date(dateStr + 'T12:00:00+08:00');
  return dt.getUTCDay();
}

function getWeekdayZh(dateStr) {
  return WEEKDAY_NAMES[getWeekdayIndex(dateStr)] || '';
}

function addDays(dateStr, days) {
  const base = new Date(dateStr + 'T12:00:00+08:00');
  const next = new Date(base.getTime() + days * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(next);
}

function getMondayOfWeek(dateStr) {
  const dayIdx = getWeekdayIndex(dateStr); // 0=日, 1=一...
  const diffToMon = dayIdx === 0 ? -6 : (1 - dayIdx);
  return addDays(dateStr, diffToMon);
}

function normalizeDateInput(val) {
  if (!val) return '';
  const m = String(val).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!m) return '';
  const y = m[1];
  const mo = m[2].padStart(2, '0');
  const d = m[3].padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function escapeHtml(str) {
  return String(str === null || str === undefined ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(n) {
  const num = Number(n) || 0;
  return Math.round(num).toLocaleString('en-US');
}

/* ============================================================================
 * 示範模式預設資料（未設定 GAS URL 時供完整預覽與互動測試）
 * ========================================================================== */

function createDemoState(targetDate) {
  const today = getTaipeiTodayStr();
  const mon = getMondayOfWeek(today);
  return {
    today: today,
    archiveDates: [today, addDays(today, -1), addDays(today, -2)],
    tasks: [
      {
        id: 'demo-1',
        date: today,
        day: '週' + getWeekdayZh(today),
        time: '09:00–11:00',
        zone: 'red',
        title: '完成譯文核心段落初稿（紅區深度產出）',
        note: '守住每日最多 2 個深度區塊原則',
        completed: false,
        source: 'demo',
        edited: false
      },
      {
        id: 'demo-2',
        date: addDays(mon, 3),
        day: '週四',
        time: '13:30–16:30',
        zone: 'red',
        title: '光華雙語語料庫練習與舊約聖經閱讀',
        note: '週四下午核心學校作業長區塊',
        completed: false,
        source: 'demo',
        edited: false
      },
      {
        id: 'demo-3',
        date: addDays(mon, 3),
        day: '週四',
        time: '16:30–17:30',
        zone: 'yellow',
        title: '整理翻譯科技期末雙語純文字樣本',
        note: '排在週四下午收尾時段，不提前手動對齊',
        completed: false,
        source: 'demo',
        edited: false
      },
      {
        id: 'demo-4',
        date: addDays(mon, 4),
        day: '週五',
        time: '20:00',
        zone: 'green',
        title: '信用卡付款截止日提醒（聯邦）',
        note: '純日期提醒，不消耗黃區能量配額',
        completed: true,
        source: 'demo',
        edited: false
      },
      {
        id: 'demo-5',
        date: addDays(mon, 5),
        day: '週六',
        time: '20:00',
        zone: 'green',
        title: '每週系統健檢與無螢幕空白修復',
        note: '保護下週至少 15% 緩衝空間',
        completed: false,
        source: 'demo',
        edited: false
      }
    ],
    pomoData: {
      dayCount: 3,
      firstDate: addDays(today, -3),
      lastDate: addDays(today, -1),
      totalHours: '10.50',
      avgHours: '3.50',
      avgRate: '100%',
      totalTasks: '13',
      avgTasks: '4.3',
      fullAchievementDays: 3,
      allDates: [addDays(today, -3), addDays(today, -2), addDays(today, -1)],
      recentDays: [
        {
          dateStr: addDays(today, -1),
          weekday: getWeekdayZh(addDays(today, -1)),
          hours: '3.50',
          goalHours: '3',
          rate: '100%',
          tasks: '4',
          details: '口譯單詞複習 1小時30分鐘；VOM 翻譯 2小時',
          source: 'Gemini JSON 匯入'
        },
        {
          dateStr: addDays(today, -2),
          weekday: getWeekdayZh(addDays(today, -2)),
          hours: '4.00',
          goalHours: '3',
          rate: '100%',
          tasks: '5',
          details: '希伯來文預習 2小時；翻譯科技樣本整理 2小時',
          source: 'Gemini JSON 匯入'
        },
        {
          dateStr: addDays(today, -3),
          weekday: getWeekdayZh(addDays(today, -3)),
          hours: '3.00',
          goalHours: '3',
          rate: '100%',
          tasks: '4',
          details: '舊約導論閱讀 3小時',
          source: 'Gemini JSON 匯入'
        }
      ]
    },
    briefingsByDate: {
      [today]: buildSampleBriefing(today),
      [addDays(today, -1)]: buildSampleBriefing(addDays(today, -1)),
      [addDays(today, -2)]: buildSampleBriefing(addDays(today, -2))
    }
  };
}

function buildSampleBriefing(dateStr) {
  const wdIdx = getWeekdayIndex(dateStr);
  const wd = WEEKDAY_NAMES[wdIdx];
  return {
    todayStr: dateStr,
    weekdayName: wd,
    weekdayTip: '（示範資料）連線 GAS Web App URL 後，將即時顯示你的真實日曆、課綱進度與 VOM 總表數據。',
    cycleStatus: {
      d1Str: '2026-11-15',
      day: 9,
      label: '收尾期（示範）',
      tip: '恢復常規紅區節奏，守住每日最多 2 個深度工作區塊與 21:30 認知關機線。',
      isAlert: false
    },
    summary: `目前為示範預覽模式（${dateStr} 週${wd}）。請點選右上角「⚙️ 連線設定」填入 GAS Web App URL，即可即時讀取試算表與所有子日曆。`,
    calendarData: {
      semesterWeek: 'W12',
      todayEvents: [
        { timeLabel: '09:10–12:10', title: '示範行程：口譯技巧（連線後將顯示真實日曆）', location: '師大' },
        { timeLabel: '14:00–16:00', title: '示範行程：VOMT 辦公室討論', location: 'VOMT 辦公室' }
      ],
      yesterdayEvents: [
        { timeLabel: '20:30–21:15', title: '睡前溫習週一口譯單詞', location: '' }
      ],
      upcomingDays: [
        {
          dateStr: addDays(dateStr, 1),
          weekday: getWeekdayZh(addDays(dateStr, 1)),
          events: [{ timeLabel: '14:00–17:00', title: '希伯來文（台神）', location: '台神' }]
        }
      ],
      hebrewCalendarEvent: null,
      thursdayAfternoonConflicts: []
    },
    courseData: {
      oralReports: [
        { dateStr: addDays(dateStr, -1), done: '已完成口譯單詞預習與舊約教材摘要', note: '示範口頭回報資料' }
      ],
      urgentTodos: [
        { course: '翻譯科技', category: '本週作業', item: '練習使用光華雙語語料庫', dueStr: addDays(dateStr, 3), note: '排於週四下午或週六黃金區塊' }
      ],
      nextHebrewTodo: { course: '希伯來文 II', category: '小考', item: '動詞變化複習與每週小考', note: '週二 13:00–14:00 考前複習' },
      otStatus: {
        bibleProgress: '9 / 15 週',
        biblePct: 60,
        textbookProgress: '10 / 15 週',
        textbookPct: 67,
        bibleOverdue: [],
        bibleNext: { week: 'W13', dateStr: addDays(dateStr, 3), content: '先知書選讀' },
        textbookNext: { week: 'W13', dateStr: addDays(dateStr, 3), content: 'Ch. 11' }
      }
    },
    vomData: {
      summary: {
        avgHourlyRate: '$850',
        revenueGoal: 42000,
        revenueCurrent: 31500,
        hoursGoal: 50,
        hoursCurrent: 37,
        hoursGap: 13,
        wordsGoal: 30000,
        wordsCurrent: 22800,
        wordsGap: 7200,
        wordsPct: 76,
        hoursPct: 74
      },
      dueTasks: [{ title: '示範待翻稿件', due: '11/28', category: 'Book' }],
      completedCount: 6,
      recentCompleted: [
        { completed: '11/21', category: 'Article', title: '示範已完成譯稿', due: '11/22', hours: 4.5, words: 3200 }
      ],
      olderCount: 0,
      olderHours: 0,
      olderWords: 0
    },
    pomoData: {
      dayCount: 3,
      firstDate: addDays(dateStr, -3),
      lastDate: addDays(dateStr, -1),
      totalHours: '10.50',
      avgHours: '3.50',
      avgRate: '100%',
      totalTasks: '13',
      avgTasks: '4.3',
      fullAchievementDays: 3,
      recentDays: [
        { dateStr: addDays(dateStr, -1), weekday: getWeekdayZh(addDays(dateStr, -1)), hours: '3.50', rate: '100%', tasks: '4', details: '口譯單詞複習 1小時30分鐘；VOM 翻譯 2小時' }
      ]
    }
  };
}

let demoMemory = null;

/* ============================================================================
 * GAS API 通訊層
 * ========================================================================== */

async function apiGet(action, params = {}) {
  if (!state.apiUrl) {
    throw new Error('尚未設定 GAS Web App URL');
  }
  const url = new URL(state.apiUrl);
  url.searchParams.set('action', action);
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
      url.searchParams.set(k, params[k]);
    }
  });
  if (state.apiToken) {
    url.searchParams.set('token', state.apiToken);
  }

  const res = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data || data.ok === false) {
    throw new Error((data && data.error) || 'API 回傳錯誤');
  }
  return data;
}

async function apiPost(action, body = {}) {
  if (!state.apiUrl) {
    throw new Error('尚未設定 GAS Web App URL');
  }
  const payload = Object.assign({}, body, { action: action });
  if (state.apiToken) {
    payload.token = state.apiToken;
  }

  // 使用 text/plain 避開 Google Apps Script CORS preflight 攔截
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data || data.ok === false) {
    throw new Error((data && data.error) || 'API 寫入失敗');
  }
  return data;
}

/* ============================================================================
 * 初始化與資料載入
 * ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  loadSavedSettings();
  bindEvents();
  state.knownToday = getTaipeiTodayStr();
  state.selectedDate = state.knownToday;
  state.weekStart = getMondayOfWeek(state.selectedDate);

  if (!state.apiUrl) {
    state.demoMode = true;
    demoMemory = createDemoState(state.selectedDate);
    showConnectionBanner('尚未設定 GAS Web App URL，目前顯示示範資料。設定後即可即時讀寫你的試算表與日曆。');
    loadDemoBootstrap(state.selectedDate);
  } else {
    loadBootstrap(state.selectedDate);
  }

  startMidnightWatcher();
});

function loadSavedSettings() {
  const savedUrl = localStorage.getItem(STORAGE_KEYS.API_URL) || '';
  const savedToken = localStorage.getItem(STORAGE_KEYS.API_TOKEN) || '';
  const savedDemo = localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
  state.apiUrl = (savedUrl || DEFAULT_API_URL || '').trim();
  state.apiToken = savedToken.trim();
  state.demoMode = !state.apiUrl || savedDemo;
}

function startMidnightWatcher() {
  const checkRollover = () => {
    const currentToday = getTaipeiTodayStr();
    if (currentToday !== state.knownToday) {
      const wasViewingOldToday = state.selectedDate === state.knownToday;
      state.knownToday = currentToday;
      if (wasViewingOldToday) {
        state.selectedDate = currentToday;
        state.weekStart = getMondayOfWeek(currentToday);
        showToast(`已跨日更新為 ${currentToday}，自動載入今日最新資料`);
        reloadCurrentView();
      }
    }
  };
  setInterval(checkRollover, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkRollover();
  });
}

function reloadCurrentView() {
  if (state.demoMode || !state.apiUrl) {
    loadDemoBootstrap(state.selectedDate);
  } else {
    loadBootstrap(state.selectedDate);
  }
}

async function loadBootstrap(targetDate) {
  setBriefingLoading(true);
  hideConnectionBanner();
  try {
    const data = await apiGet('bootstrap', { date: targetDate });
    state.demoMode = false;
    state.knownToday = data.today || getTaipeiTodayStr();
    state.selectedDate = data.selectedDate || targetDate;
    state.weekStart = getMondayOfWeek(state.selectedDate);
    state.briefingSource = data.source || 'empty';
    state.briefingUpdatedAt = data.updatedAt || '';
    state.briefing = data.briefing || null;
    state.archiveDates = Array.isArray(data.archiveDates) ? data.archiveDates : [];
    state.tasks = Array.isArray(data.tasks) ? data.tasks : [];
    state.pomoData = data.pomoData || null;
    renderAll();
  } catch (err) {
    setBriefingLoading(false);
    showConnectionBanner(`無法連線至 GAS 後端（${err.message}）。請確認已部署 Web App 並設為「所有人可存取」。`);
    if (!state.briefing && !demoMemory) {
      demoMemory = createDemoState(state.selectedDate);
      state.demoMode = true;
      loadDemoBootstrap(state.selectedDate);
    }
  }
}

function loadDemoBootstrap(targetDate) {
  if (!demoMemory) {
    demoMemory = createDemoState(targetDate);
  }
  state.selectedDate = targetDate;
  state.weekStart = getMondayOfWeek(targetDate);
  state.archiveDates = demoMemory.archiveDates;
  state.tasks = demoMemory.tasks;
  state.pomoData = demoMemory.pomoData;
  const archived = demoMemory.briefingsByDate[targetDate];
  if (targetDate === state.knownToday) {
    state.briefingSource = 'live';
    state.briefing = archived || buildSampleBriefing(targetDate);
    state.briefingUpdatedAt = '示範即時資料';
  } else if (archived) {
    state.briefingSource = 'archive';
    state.briefing = archived;
    state.briefingUpdatedAt = `${targetDate} 07:00:00（示範快照）`;
  } else {
    state.briefingSource = 'empty';
    state.briefing = null;
    state.briefingUpdatedAt = '';
  }
  renderAll();
}

async function switchSelectedDate(newDate) {
  const norm = normalizeDateInput(newDate);
  if (!norm) {
    showToast('請選擇有效日期', true);
    return;
  }
  state.selectedDate = norm;
  state.weekStart = getMondayOfWeek(norm);
  closeModal('modal-calendar');

  if (state.demoMode || !state.apiUrl) {
    loadDemoBootstrap(norm);
    return;
  }

  setBriefingLoading(true);
  try {
    const data = await apiGet('getBriefing', { date: norm });
    state.knownToday = data.today || getTaipeiTodayStr();
    state.briefingSource = data.source || 'empty';
    state.briefingUpdatedAt = data.updatedAt || '';
    state.briefing = data.briefing || null;
    if (Array.isArray(data.archiveDates)) {
      state.archiveDates = data.archiveDates;
    }
    renderAll();
  } catch (err) {
    setBriefingLoading(false);
    showToast(`切換日期失敗：${err.message}`, true);
  }
}

/* ============================================================================
 * 畫面渲染：頂部狀態 + 簡報 + 看板 + 番茄鐘
 * ========================================================================== */

function renderAll() {
  setBriefingLoading(false);
  renderHeader();
  renderBriefingView();
  renderBoardView();
  renderPomoStats();
  renderPomoPreview();
}

function renderHeader() {
  const badge = document.getElementById('status-badge');
  const subtitle = document.getElementById('header-subtitle');
  const calLabel = document.getElementById('btn-calendar-label');

  const wd = getWeekdayZh(state.selectedDate);
  const semWeek = state.briefing && state.briefing.calendarData && state.briefing.calendarData.semesterWeek
    ? `・${state.briefing.calendarData.semesterWeek}`
    : '';
  const cycleTxt = state.briefing && state.briefing.cycleStatus
    ? `・生理週期 D${state.briefing.cycleStatus.day}（${state.briefing.cycleStatus.label}）`
    : '';

  calLabel.textContent = state.selectedDate === state.knownToday
    ? `今天 ${state.selectedDate.slice(5)}`
    : state.selectedDate;

  subtitle.textContent = `${state.selectedDate}（週${wd}）${semWeek}${cycleTxt}`;

  badge.className = 'badge';
  if (state.demoMode) {
    badge.classList.add('badge-demo');
    badge.textContent = '示範模式';
  } else if (state.selectedDate === state.knownToday && state.briefingSource === 'live') {
    badge.classList.add('badge-live');
    badge.textContent = '今日即時';
  } else if (state.briefingSource === 'archive') {
    badge.classList.add('badge-archive');
    badge.textContent = '歷史快照';
  } else {
    badge.classList.add('badge-empty');
    badge.textContent = '無快照';
  }
}

function setBriefingLoading(isLoading) {
  document.getElementById('briefing-loading').classList.toggle('hidden', !isLoading);
  if (isLoading) {
    document.getElementById('briefing-content').classList.add('hidden');
    document.getElementById('briefing-empty').classList.add('hidden');
  }
}

function renderBriefingView() {
  const emptyEl = document.getElementById('briefing-empty');
  const contentEl = document.getElementById('briefing-content');

  if (!state.briefing || state.briefingSource === 'empty') {
    emptyEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    document.getElementById('briefing-empty-title').textContent = `${state.selectedDate}（週${getWeekdayZh(state.selectedDate)}）尚無歷史簡報快照`;
    return;
  }

  emptyEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  const m = state.briefing;
  const cal = m.calendarData || {};
  const todayEvents = cal.todayEvents || [];
  const yesterdayEvents = cal.yesterdayEvents || [];
  const upcomingDays = cal.upcomingDays || [];
  const vom = m.vomData || { summary: {}, dueTasks: [], recentCompleted: [] };
  const vomSum = vom.summary || {};
  const course = m.courseData || { oralReports: [], urgentTodos: [], otStatus: {} };
  const ot = course.otStatus || {};
  const pomo = m.pomoData || { recentDays: [] };
  const cycle = m.cycleStatus || {};

  const todayShortSummary = todayEvents.length > 0
    ? todayEvents.slice(0, 3).map((e) => e.title).join('、') + (todayEvents.length > 3 ? ' 等' : '')
    : '今日無已排定行程';

  const wordsBar = Math.min(100, Math.max(0, Number(vomSum.wordsPct) || 0));
  const hoursBar = Math.min(100, Math.max(0, Number(vomSum.hoursPct) || 0));
  const bibleBar = Math.min(100, Math.max(0, Number(ot.biblePct) || 0));
  const tbBar = Math.min(100, Math.max(0, Number(ot.textbookPct) || 0));

  const todayEventsHtml = todayEvents.length > 0
    ? todayEvents.map((ev) => {
        const loc = ev.location ? `（${escapeHtml(ev.location)}）` : '';
        return `<li><strong>${escapeHtml(ev.timeLabel)}</strong> ${escapeHtml(ev.title)}${loc}</li>`;
      }).join('')
    : '<li>今日暫無已排定行程，依日常節奏保護綠區緩衝並守住 21:30 關機線。</li>';

  const reviewItems = [];
  (course.oralReports || []).forEach((rep) => {
    const mmdd = (rep.dateStr || '').slice(5).replace('-', '/');
    if (rep.done) reviewItems.push(`【口頭回報 ${escapeHtml(mmdd)}】${escapeHtml(rep.done)}`);
    if (rep.note) reviewItems.push(`【補充備註 ${escapeHtml(mmdd)}】${escapeHtml(rep.note)}`);
  });
  yesterdayEvents.forEach((yev) => {
    const loc = yev.location ? `，${escapeHtml(yev.location)}` : '';
    reviewItems.push(`<strong>${escapeHtml(yev.timeLabel)}</strong> ${escapeHtml(yev.title)}${loc}`);
  });
  const reviewHtml = reviewItems.length > 0
    ? reviewItems.map((x) => `<li>${x}</li>`).join('')
    : '<li>昨日無額外日曆紀錄或口頭回報。</li>';

  let upcomingHtml = '';
  upcomingDays.forEach((dayObj) => {
    const mmdd = (dayObj.dateStr || '').slice(5).replace('-', '/');
    const items = [];
    (dayObj.events || []).forEach((ev) => {
      const loc = ev.location ? ` @${escapeHtml(ev.location)}` : '';
      items.push(`<strong>${escapeHtml(ev.timeLabel)}</strong> ${escapeHtml(ev.title)}${loc}`);
    });
    (vom.dueTasks || []).forEach((vt) => {
      const dueNorm = normalizeDateInput(vt.due);
      const dueMmdd = dueNorm ? dueNorm : (vt.due ? `${m.todayStr.slice(0, 4)}-${vt.due.replace('/', '-')}` : '');
      if (normalizeDateInput(dueMmdd) === dayObj.dateStr) {
        items.push(`【VOM Due】${escapeHtml(vt.title)}${vt.category ? `（${escapeHtml(vt.category)}）` : ''}`);
      }
    });
    (course.urgentTodos || []).forEach((td) => {
      if (td.dueStr === dayObj.dateStr) {
        const note = td.note ? `（${escapeHtml(td.note)}）` : '';
        items.push(`【${escapeHtml(td.course)}・${escapeHtml(td.category)}】${escapeHtml(td.item)}${note}`);
      }
    });
    if (getWeekdayIndex(dayObj.dateStr) === 4 && (cal.thursdayAfternoonConflicts || []).length > 0) {
      items.push('<strong>行程壓縮預警：</strong>週四下午已有外部行程佔用時段，常規學校作業長區塊將被壓縮。');
    }

    if (items.length > 0) {
      upcomingHtml += `
        <div class="upcoming-day">
          <div class="upcoming-day-title">${escapeHtml(mmdd)}（週${escapeHtml(dayObj.weekday)}）安排與截止</div>
          <ul class="clean-list">${items.map((s) => `<li>${s}</li>`).join('')}</ul>
        </div>
      `;
    }
  });
  if (!upcomingHtml) {
    upcomingHtml = '<p class="muted">未來 6 日無額外截止或待辦。</p>';
  }

  const bibleOverdue = (ot.bibleOverdue || []).length > 0
    ? `積欠 ${ot.bibleOverdue.map((x) => escapeHtml(x.week)).join('、')}（${escapeHtml(ot.bibleOverdue[ot.bibleOverdue.length - 1].content)} 等）`
    : '目前無積欠';
  const bibleNext = ot.bibleNext
    ? `；下一週 ${escapeHtml(ot.bibleNext.week)}（${escapeHtml((ot.bibleNext.dateStr || '').slice(5).replace('-', '/'))}）為 ${escapeHtml(ot.bibleNext.content)}`
    : '';
  const tbNext = ot.textbookNext
    ? `下一篇為 ${escapeHtml(ot.textbookNext.week)} ${escapeHtml(ot.textbookNext.content)}`
    : '已讀完至最新進度';

  let hebrewDetails = '每週二 13:00–14:00 考前複習，14:00–17:00 上課與小考。';
  if (cal.hebrewCalendarEvent && cal.hebrewCalendarEvent.description) {
    hebrewDetails = escapeHtml(cal.hebrewCalendarEvent.description).replace(/\r?\n/g, '<br>');
  } else if (course.nextHebrewTodo) {
    hebrewDetails = escapeHtml(course.nextHebrewTodo.item) +
      (course.nextHebrewTodo.note ? `<br>${escapeHtml(course.nextHebrewTodo.note)}` : '');
  }

  const pomoRows = (pomo.recentDays || []).length > 0
    ? pomo.recentDays.map((d) => `
      <tr>
        <td>${escapeHtml(d.dateStr)}${d.weekday ? `（${escapeHtml(d.weekday)}）` : ''}</td>
        <td>${escapeHtml(d.hours)} hr</td>
        <td>${escapeHtml(d.rate)}</td>
        <td>完成 ${escapeHtml(d.tasks)} 項</td>
        <td>${escapeHtml(d.details)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" class="muted">尚無番茄鐘專注紀錄。</td></tr>';

  const vomRows = (vom.recentCompleted || []).length > 0
    ? vom.recentCompleted.map((c) => `
      <tr>
        <td>${escapeHtml(c.completed)}</td>
        <td>${escapeHtml(c.category)}</td>
        <td>${escapeHtml(c.title)}${c.due ? `（Due ${escapeHtml(c.due)}）` : ''}</td>
        <td>${escapeHtml((Number(c.hours) || 0).toFixed(1))} hr</td>
        <td>${escapeHtml(formatNumber(c.words))} 字</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" class="muted">本月尚無已完成案件。</td></tr>';

  const vomDueNote = (vom.dueTasks || []).length > 0
    ? `尚餘 ${vom.dueTasks.length} 件未完任務（${vom.dueTasks.map((t) => `${escapeHtml(t.title)}，Due ${escapeHtml(t.due)}`).join('；')}）。`
    : '本月表列任務目前皆已完成。';

  const saveSnapshotBtnHtml = (state.selectedDate === state.knownToday && !state.demoMode)
    ? `<button id="btn-save-archive-now" type="button" class="btn btn-secondary btn-sm">💾 手動存檔今日快照</button>`
    : '';

  contentEl.innerHTML = `
    <section class="card">
      <div class="kpi-grid">
        <div class="kpi-tile kpi-rose">
          <div class="kpi-label">今日行程</div>
          <div class="kpi-value">${todayEvents.length} 項</div>
          <div class="kpi-sub">${escapeHtml(todayShortSummary)}</div>
        </div>
        <div class="kpi-tile kpi-rose">
          <div class="kpi-label">VOM 字數</div>
          <div class="kpi-value">${escapeHtml(vomSum.wordsPct)}%</div>
          <div class="kpi-sub">${formatNumber(vomSum.wordsCurrent)} / ${formatNumber(vomSum.wordsGoal)} 字</div>
        </div>
        <div class="kpi-tile kpi-slate">
          <div class="kpi-label">VOM 工時</div>
          <div class="kpi-value">${escapeHtml(vomSum.hoursPct)}%</div>
          <div class="kpi-sub">${escapeHtml(vomSum.hoursCurrent)} / ${escapeHtml(vomSum.hoursGoal)} hr</div>
        </div>
        <div class="kpi-tile kpi-slate">
          <div class="kpi-label">番茄鐘日均</div>
          <div class="kpi-value">${escapeHtml(pomo.avgHours || '0')} hr</div>
          <div class="kpi-sub">共 ${escapeHtml(pomo.dayCount || 0)} 日・達標率 ${escapeHtml(pomo.avgRate || '0%')}</div>
        </div>
      </div>

      <div class="summary-callout">
        <strong style="color: var(--rose-deep);">一句話能量摘要：</strong><br>
        ${escapeHtml(m.summary || '')}
        <div class="cycle-row">
          <span class="cycle-pill ${cycle.isAlert ? 'is-alert' : ''}">生理週期 D${escapeHtml(cycle.day)}｜${escapeHtml(cycle.label)}</span>
          <span>${escapeHtml(cycle.tip)}</span>
        </div>
      </div>

      <div class="archive-action-row">
        <span>資料狀態：${state.briefingSource === 'live' ? '即時彙整' : 'DailyArchive 歷史快照'}${state.briefingUpdatedAt ? `（更新於 ${escapeHtml(state.briefingUpdatedAt)}）` : ''}</span>
        ${saveSnapshotBtnHtml}
      </div>
    </section>

    <div class="two-col-cards">
      <section class="card">
        <h2>今日行程與 24 小時回顧</h2>
        <div style="margin-bottom: 14px;">
          <div class="field-label" style="color: var(--slate-deep);">今日行程（${escapeHtml(m.todayStr)} 週${escapeHtml(m.weekdayName)}）</div>
          <ul class="clean-list">${todayEventsHtml}</ul>
        </div>
        <div class="note-box">
          <div class="field-label" style="color: var(--rose-deep);">過去 24 小時完成回顧（含每日口頭回報）</div>
          <ul class="clean-list">${reviewHtml}</ul>
        </div>
      </section>

      <section class="card">
        <h2>VOM 本月字數與工時進度</h2>
        <div class="progress-group">
          <div class="progress-meta">
            <strong>翻譯字數進度</strong>
            <span>${formatNumber(vomSum.wordsCurrent)} / ${formatNumber(vomSum.wordsGoal)} 字（${escapeHtml(vomSum.wordsPct)}%）</span>
          </div>
          <div class="progress-track"><div class="progress-fill-rose" style="width: ${wordsBar}%"></div></div>
        </div>
        <div class="progress-group">
          <div class="progress-meta">
            <strong>工時累計進度</strong>
            <span>${escapeHtml(vomSum.hoursCurrent)} / ${escapeHtml(vomSum.hoursGoal)} 小時（${escapeHtml(vomSum.hoursPct)}%）</span>
          </div>
          <div class="progress-track progress-track-slate"><div class="progress-fill-slate" style="width: ${hoursBar}%"></div></div>
        </div>
        <div class="note-box">
          <strong>精簡備註：</strong>累計產值參考 $${formatNumber(vomSum.revenueCurrent)}（目標 $${formatNumber(vomSum.revenueGoal)}，均效 ${escapeHtml(vomSum.avgHourlyRate)}/hr）；${vomDueNote}
        </div>
      </section>
    </div>

    <div class="two-col-cards">
      <section class="card">
        <h2>近期急迫待辦（未來 6 日）</h2>
        ${upcomingHtml}
      </section>

      <section class="card">
        <h2>課程主動提醒專區</h2>
        <div class="course-remind-box stack-sm">
          <div>
            <strong style="color: var(--rose-deep);">《舊約導論 II》閱讀追蹤（總佔 17%）</strong>
            <div style="margin-top: 8px;">
              <div class="progress-meta">
                <span>聖經閱讀（佔 9%）</span>
                <strong>${escapeHtml(ot.bibleProgress || '0%')}（${escapeHtml(ot.biblePct || 0)}%）</strong>
              </div>
              <div class="progress-track"><div class="progress-fill-rose" style="width: ${bibleBar}%"></div></div>
              <p class="muted small" style="margin-top: 4px;">${bibleOverdue}${bibleNext}</p>
            </div>
            <div style="margin-top: 10px;">
              <div class="progress-meta">
                <span>教科書閱讀（佔 8%）</span>
                <strong>${escapeHtml(ot.textbookProgress || '0%')}（${escapeHtml(ot.textbookPct || 0)}%）</strong>
              </div>
              <div class="progress-track progress-track-slate"><div class="progress-fill-slate" style="width: ${tbBar}%"></div></div>
              <p class="muted small" style="margin-top: 4px;">${tbNext}</p>
            </div>
          </div>
          <div>
            <strong style="color: var(--rose-deep);">《希伯來文 II》每週小考與作業</strong>
            <p class="muted small" style="margin-top: 4px;">${hebrewDetails}</p>
          </div>
        </div>
      </section>
    </div>

    <section class="card">
      <h2>近 5 日番茄鐘專注明細</h2>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>時數</th>
              <th>達標</th>
              <th>任務</th>
              <th>項目明細</th>
            </tr>
          </thead>
          <tbody>${pomoRows}</tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>VOM 本月近期完成案件</h2>
      <div class="table-wrap">
        <table class="data-table slate-head">
          <thead>
            <tr>
              <th>完成日</th>
              <th>類別</th>
              <th>案件名稱</th>
              <th>工時</th>
              <th>字數</th>
            </tr>
          </thead>
          <tbody>${vomRows}</tbody>
        </table>
      </div>
    </section>
  `;

  const saveBtn = document.getElementById('btn-save-archive-now');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleManualSaveArchive);
  }
}

async function handleManualSaveArchive() {
  const btn = document.getElementById('btn-save-archive-now');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '儲存中…';
  try {
    const res = await apiPost('saveTodayArchive', { date: state.knownToday });
    if (Array.isArray(res.archiveDates)) {
      state.archiveDates = res.archiveDates;
    }
    state.briefingUpdatedAt = res.updatedAt || '';
    showToast(`已成功封存 ${state.knownToday} 簡報快照至 DailyArchive`);
    renderBriefingView();
  } catch (err) {
    showToast(`封存失敗：${err.message}`, true);
    btn.disabled = false;
    btn.textContent = '💾 手動存檔今日快照';
  }
}

/* ============================================================================
 * 分頁二：Weekly Board（紅／黃／綠能量看板）
 * ========================================================================== */

function renderBoardView() {
  const weekStart = state.weekStart || getMondayOfWeek(state.selectedDate);
  const weekEnd = addDays(weekStart, 6);
  document.getElementById('week-range-label').textContent = `${weekStart} ~ ${weekEnd}`;

  const weekTasks = state.tasks.filter((t) => t.date >= weekStart && t.date <= weekEnd);
  renderEnergyQuota(weekTasks);

  const grid = document.getElementById('board-grid');
  let html = '';

  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(weekStart, i);
    const wd = getWeekdayZh(dayDate);
    const isSelected = dayDate === state.selectedDate;
    const isToday = dayDate === state.knownToday;

    const dayTasks = weekTasks.filter((t) => {
      if (t.date !== dayDate) return false;
      if (state.zoneFilter === 'pending') return !t.completed;
      if (state.zoneFilter !== 'all') return t.zone === state.zoneFilter;
      return true;
    });

    const badgeHtml = isToday
      ? '<span class="badge badge-live">今天</span>'
      : (isSelected ? '<span class="badge badge-archive">檢視中</span>' : '');

    const tasksHtml = dayTasks.length > 0
      ? dayTasks.map((t) => renderTaskItem(t)).join('')
      : '<div class="day-empty">此日尚無符合條件的任務</div>';

    html += `
      <article class="day-card ${isSelected ? 'is-selected' : ''}">
        <div class="day-card-head">
          <div class="day-card-title">
            <span>${escapeHtml(dayDate.slice(5).replace('-', '/'))}（週${escapeHtml(wd)}）</span>
            ${badgeHtml}
          </div>
          <button type="button" class="btn btn-ghost btn-sm" data-add-day="${escapeHtml(dayDate)}" title="新增這天的任務">＋</button>
        </div>
        <div class="day-tasks">${tasksHtml}</div>
      </article>
    `;
  }

  grid.innerHTML = html;
}

function renderTaskItem(task) {
  const zoneLabelMap = { red: '🔴 紅區', yellow: '🟡 黃區', green: '🟢 綠區' };
  const zoneLabel = zoneLabelMap[task.zone] || '🟡 黃區';
  return `
    <div class="task-item zone-${escapeHtml(task.zone)} ${task.completed ? 'is-done' : ''}" data-task-id="${escapeHtml(task.id)}">
      <div class="task-top">
        <input type="checkbox" class="task-check" data-toggle-id="${escapeHtml(task.id)}" ${task.completed ? 'checked' : ''} aria-label="切換完成狀態">
        <div class="task-main">
          <div class="task-meta">
            <span class="zone-tag zone-tag-${escapeHtml(task.zone)}">${zoneLabel}</span>
            ${task.time ? `<span class="task-time">${escapeHtml(task.time)}</span>` : ''}
          </div>
          <div class="task-title">${escapeHtml(task.title)}</div>
          ${task.note ? `<div class="task-note">${escapeHtml(task.note)}</div>` : ''}
        </div>
        <div class="task-actions">
          <button type="button" class="icon-btn" data-edit-id="${escapeHtml(task.id)}" title="編輯">✏️</button>
          <button type="button" class="icon-btn" data-delete-id="${escapeHtml(task.id)}" title="刪除">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

function renderEnergyQuota(weekTasks) {
  const total = weekTasks.length;
  let redCount = 0;
  let yellowCount = 0;
  let greenCount = 0;

  weekTasks.forEach((t) => {
    if (t.zone === 'red') redCount++;
    else if (t.zone === 'green') greenCount++;
    else yellowCount++;
  });

  const redPct = total > 0 ? Math.round((redCount / total) * 100) : 0;
  const yellowPct = total > 0 ? Math.round((yellowCount / total) * 100) : 0;
  const greenPct = total > 0 ? Math.max(0, 100 - redPct - yellowPct) : 0;

  document.getElementById('quota-total-label').textContent = `本週共 ${total} 項任務`;
  document.getElementById('quota-seg-red').style.width = `${redPct}%`;
  document.getElementById('quota-seg-yellow').style.width = `${yellowPct}%`;
  document.getElementById('quota-seg-green').style.width = `${greenPct}%`;

  document.getElementById('quota-red-txt').textContent = `${redCount} 項 (${redPct}%)`;
  document.getElementById('quota-yellow-txt').textContent = `${yellowCount} 項 (${yellowPct}%)`;
  document.getElementById('quota-green-txt').textContent = `${greenCount} 項 (${greenPct}%)`;

  const adviceEl = document.getElementById('quota-advice');
  if (total === 0) {
    adviceEl.textContent = '本週尚無任務，新增任務時記得為自己保留至少 25% 綠區空白修復時間。';
  } else if (redPct > 50 || yellowPct > 25 || greenPct < 25) {
    const warnings = [];
    if (redPct > 50) warnings.push(`紅區比例 ${redPct}% 高於 50% 上限`);
    if (yellowPct > 25) warnings.push(`黃區比例 ${yellowPct}% 高於 25% 上限`);
    if (greenPct < 25) warnings.push(`綠區僅 ${greenPct}%（低於 25% 下限）`);
    adviceEl.innerHTML = `<strong style="color: var(--rose-deep);">防過載提醒：</strong>${warnings.join('、')}，建議適度做減法或將非急迫項目平移至下週。`;
  } else {
    adviceEl.textContent = '三層級能量配額平衡良好！信用卡付款截止日提醒已統一歸類於綠區，不計入黃區負擔。';
  }
}

async function handleToggleTask(taskId) {
  const target = state.tasks.find((t) => t.id === taskId);
  if (!target) return;
  const nextVal = !target.completed;
  target.completed = nextVal;
  renderBoardView();

  if (state.demoMode || !state.apiUrl) {
    showToast(nextVal ? '已完成任務（示範）' : '已取消完成（示範）');
    return;
  }

  try {
    const res = await apiPost('toggleTask', { id: taskId, completed: nextVal });
    if (Array.isArray(res.tasks)) state.tasks = res.tasks;
    renderBoardView();
  } catch (err) {
    target.completed = !nextVal;
    renderBoardView();
    showToast(`更新狀態失敗：${err.message}`, true);
  }
}

function openTaskModal(taskId = '', presetDate = '') {
  const modalTitle = document.getElementById('modal-task-title');
  const existing = taskId ? state.tasks.find((t) => t.id === taskId) : null;

  document.getElementById('task-id').value = existing ? existing.id : '';
  document.getElementById('task-date').value = existing ? existing.date : (presetDate || state.selectedDate);
  document.getElementById('task-time').value = existing ? (existing.time || '') : '';
  document.getElementById('task-zone').value = existing ? (existing.zone || 'yellow') : 'red';
  document.getElementById('task-title').value = existing ? (existing.title || '') : '';
  document.getElementById('task-note').value = existing ? (existing.note || '') : '';
  document.getElementById('task-completed').checked = existing ? Boolean(existing.completed) : false;

  modalTitle.textContent = existing ? '編輯能量看板任務' : '新增能量看板任務';
  openModal('modal-task');
}

async function handleSaveTaskSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-task');
  const id = document.getElementById('task-id').value.trim();
  const date = document.getElementById('task-date').value.trim();
  const time = document.getElementById('task-time').value.trim();
  const zone = document.getElementById('task-zone').value;
  const title = document.getElementById('task-title').value.trim();
  const note = document.getElementById('task-note').value.trim();
  const completed = document.getElementById('task-completed').checked;

  if (!date || !title) {
    showToast('請填寫日期與任務標題', true);
    return;
  }

  const taskPayload = { id, date, time, zone, title, note, completed };

  if (state.demoMode || !state.apiUrl) {
    if (id) {
      const idx = state.tasks.findIndex((t) => t.id === id);
      if (idx !== -1) {
        state.tasks[idx] = Object.assign({}, state.tasks[idx], taskPayload, {
          day: '週' + getWeekdayZh(date),
          edited: true
        });
      }
    } else {
      state.tasks.push(Object.assign({}, taskPayload, {
        id: 'demo-' + Date.now(),
        day: '週' + getWeekdayZh(date),
        source: 'demo',
        edited: false
      }));
    }
    closeModal('modal-task');
    renderBoardView();
    showToast('任務已儲存（示範模式）');
    return;
  }

  btn.disabled = true;
  btn.textContent = '儲存中…';
  try {
    const res = await apiPost('saveTask', { task: taskPayload });
    if (Array.isArray(res.tasks)) state.tasks = res.tasks;
    closeModal('modal-task');
    renderBoardView();
    showToast('任務已同步至 Mirriam_Weekly_Board');
  } catch (err) {
    showToast(`儲存失敗：${err.message}`, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '儲存任務';
  }
}

async function handleDeleteTask(taskId) {
  const target = state.tasks.find((t) => t.id === taskId);
  if (!target) return;
  if (!window.confirm(`確定要刪除「${target.title}」嗎？`)) return;

  if (state.demoMode || !state.apiUrl) {
    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    if (demoMemory) demoMemory.tasks = state.tasks;
    renderBoardView();
    showToast('已刪除任務（示範模式）');
    return;
  }

  try {
    const res = await apiPost('deleteTask', { id: taskId });
    if (Array.isArray(res.tasks)) state.tasks = res.tasks;
    renderBoardView();
    showToast('已從試算表刪除任務');
  } catch (err) {
    showToast(`刪除失敗：${err.message}`, true);
  }
}

/* ============================================================================
 * 分頁三：🍅 番茄鐘 JSON 解析預覽與一鍵匯入
 * ========================================================================== */

function stripMarkdownFences(raw) {
  return String(raw || '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function handleParsePomodoroJson() {
  const rawInput = document.getElementById('pomo-json-input').value;
  const errEl = document.getElementById('pomo-parse-error');
  const resultEl = document.getElementById('pomo-import-result');
  errEl.classList.add('hidden');
  resultEl.classList.add('hidden');

  const cleaned = stripMarkdownFences(rawInput);
  if (!cleaned) {
    errEl.textContent = '請先貼上 Gemini 產出的 JSON 內容。';
    errEl.classList.remove('hidden');
    state.parsedPomoRecords = [];
    renderPomoPreview();
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    errEl.textContent = `JSON 格式解析失敗：${e.message}。請確認有完整複製大括號內容。`;
    errEl.classList.remove('hidden');
    state.parsedPomoRecords = [];
    renderPomoPreview();
    return;
  }

  let rawList = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && Array.isArray(parsed.records)) {
    rawList = parsed.records;
  } else if (parsed && typeof parsed === 'object' && parsed.date) {
    rawList = [parsed];
  }

  if (rawList.length === 0) {
    errEl.textContent = '找不到任何專注紀錄列（需包含 records 陣列或單筆紀錄物件）。';
    errEl.classList.remove('hidden');
    state.parsedPomoRecords = [];
    renderPomoPreview();
    return;
  }

  const normalized = [];
  const validationErrors = [];

  rawList.forEach((item, idx) => {
    const rec = item || {};
    const dateStr = normalizeDateInput(rec.date);
    if (!dateStr) {
      validationErrors.push(`第 ${idx + 1} 筆缺少有效日期（需為 YYYY-MM-DD）`);
      return;
    }
    const totalHours = Number(rec.total_hours);
    if (!Number.isFinite(totalHours) || totalHours < 0) {
      validationErrors.push(`第 ${idx + 1} 筆（${dateStr}）的 total_hours 無效`);
      return;
    }
    const goalHours = (Number(rec.daily_goal_hours) > 0) ? Number(rec.daily_goal_hours) : 3;
    let rate = Number(rec.achievement_rate);
    if (rec.achievement_rate === undefined || rec.achievement_rate === null || rec.achievement_rate === '' || !Number.isFinite(rate)) {
      rate = goalHours > 0 ? Math.min(1, totalHours / goalHours) : 1;
    } else if (rate > 1) {
      rate = rate / 100;
    } else if (rate < 0) {
      rate = 0;
    }

    normalized.push({
      date: dateStr,
      total_hours: Math.round(totalHours * 100) / 100,
      daily_goal_hours: goalHours,
      achievement_rate: rate,
      completed_tasks: Math.max(0, Math.round(Number(rec.completed_tasks) || 0)),
      details: String(rec.details || '').trim()
    });
  });

  if (validationErrors.length > 0) {
    errEl.textContent = validationErrors.join('；');
    errEl.classList.remove('hidden');
  }

  state.parsedPomoRecords = normalized;
  renderPomoPreview();
}

function renderPomoPreview() {
  const box = document.getElementById('pomo-preview-box');
  const tbody = document.getElementById('pomo-preview-tbody');
  const summaryEl = document.getElementById('pomo-preview-summary');
  const overwrite = document.getElementById('chk-pomo-overwrite').checked;

  if (!state.parsedPomoRecords || state.parsedPomoRecords.length === 0) {
    box.classList.add('hidden');
    tbody.innerHTML = '';
    return;
  }

  box.classList.remove('hidden');
  const existingSet = new Set((state.pomoData && state.pomoData.allDates) || []);
  let newCount = 0;
  let dupCount = 0;

  tbody.innerHTML = state.parsedPomoRecords.map((rec) => {
    const exists = existingSet.has(rec.date);
    if (exists) dupCount++;
    else newCount++;

    let statusHtml = '<span class="status-tag status-new">新日期（將新增）</span>';
    if (exists) {
      statusHtml = overwrite
        ? '<span class="status-tag status-overwrite">已存在（將覆蓋）</span>'
        : '<span class="status-tag status-skip">已存在（將略過）</span>';
    }

    const ratePct = Math.round(rec.achievement_rate * 100);
    return `
      <tr>
        <td>${escapeHtml(rec.date)}</td>
        <td>${escapeHtml(rec.total_hours.toFixed(2))} hr</td>
        <td>${escapeHtml(rec.daily_goal_hours)} hr</td>
        <td>${ratePct}%</td>
        <td>${escapeHtml(rec.completed_tasks)} 項</td>
        <td>${escapeHtml(rec.details || '—')}</td>
        <td>${statusHtml}</td>
      </tr>
    `;
  }).join('');

  summaryEl.textContent = `共解析 ${state.parsedPomoRecords.length} 筆｜新日期 ${newCount} 筆｜已存在日期 ${dupCount} 筆`;
}

async function handleImportPomodoro() {
  if (!state.parsedPomoRecords || state.parsedPomoRecords.length === 0) {
    showToast('沒有可匯入的紀錄，請先解析 JSON', true);
    return;
  }

  const btn = document.getElementById('btn-import-pomo');
  const overwrite = document.getElementById('chk-pomo-overwrite').checked;
  const resultEl = document.getElementById('pomo-import-result');

  if (state.demoMode || !state.apiUrl) {
    const existingSet = new Set(demoMemory.pomoData.allDates);
    const added = [];
    const overwritten = [];
    const skipped = [];
    state.parsedPomoRecords.forEach((rec) => {
      if (existingSet.has(rec.date)) {
        if (overwrite) overwritten.push(rec.date);
        else skipped.push({ date: rec.date });
      } else {
        added.push(rec.date);
        existingSet.add(rec.date);
        demoMemory.pomoData.allDates.push(rec.date);
        demoMemory.pomoData.recentDays.unshift({
          dateStr: rec.date,
          weekday: getWeekdayZh(rec.date),
          hours: rec.total_hours.toFixed(2),
          goalHours: String(rec.daily_goal_hours),
          rate: `${Math.round(rec.achievement_rate * 100)}%`,
          tasks: String(rec.completed_tasks),
          details: rec.details,
          source: 'Gemini JSON 匯入'
        });
      }
    });
    demoMemory.pomoData.dayCount = demoMemory.pomoData.allDates.length;
    state.pomoData = demoMemory.pomoData;
    renderPomoStats();
    renderPomoPreview();
    resultEl.className = 'alert alert-success';
    resultEl.textContent = `（示範模擬匯入）新增 ${added.length} 筆、覆蓋 ${overwritten.length} 筆、略過重複 ${skipped.length} 筆。`;
    resultEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = '寫入試算表中…';
  resultEl.classList.add('hidden');

  try {
    const res = await apiPost('importPomodoro', {
      records: state.parsedPomoRecords,
      overwrite: overwrite
    });
    if (res.pomoData) {
      state.pomoData = res.pomoData;
    }
    const added = res.added || [];
    const overwritten = res.overwritten || [];
    const skipped = res.skipped || [];
    const errors = res.errors || [];

    const parts = [
      `新增 ${added.length} 筆${added.length ? `（${added.join('、')}）` : ''}`,
      `覆蓋 ${overwritten.length} 筆${overwritten.length ? `（${overwritten.join('、')}）` : ''}`,
      `略過重複 ${skipped.length} 筆${skipped.length ? `（${skipped.map((s) => s.date).join('、')}）` : ''}`
    ];
    if (errors.length) {
      parts.push(`格式錯誤 ${errors.length} 筆`);
    }

    resultEl.className = errors.length > 0 && added.length === 0 && overwritten.length === 0
      ? 'alert alert-danger'
      : 'alert alert-success';
    resultEl.textContent = `匯入完成：${parts.join('｜')}。已寫入「總計／日均」上方並重算公式。`;
    resultEl.classList.remove('hidden');

    renderPomoStats();
    renderPomoPreview();
    showToast('番茄鐘專注總表已更新');
  } catch (err) {
    resultEl.className = 'alert alert-danger';
    resultEl.textContent = `匯入失敗：${err.message}`;
    resultEl.classList.remove('hidden');
    showToast(`匯入失敗：${err.message}`, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '一鍵匯入番茄鐘總表';
  }
}

function renderPomoStats() {
  const container = document.getElementById('pomo-stats-container');
  const p = state.pomoData;
  if (!p) {
    container.innerHTML = '<p class="muted">尚未載入番茄鐘專注總表資料。</p>';
    return;
  }

  const rowsHtml = (p.recentDays || []).length > 0
    ? p.recentDays.map((d) => `
      <tr>
        <td>${escapeHtml(d.dateStr)}${d.weekday ? `（${escapeHtml(d.weekday)}）` : ''}</td>
        <td>${escapeHtml(d.hours)} hr</td>
        <td>${escapeHtml(d.rate)}</td>
        <td>${escapeHtml(d.tasks)} 項</td>
        <td>${escapeHtml(d.details)}</td>
        <td>${escapeHtml(d.source || '—')}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="6" class="muted">尚無專注紀錄。</td></tr>';

  container.innerHTML = `
    <div class="kpi-grid" style="margin-bottom: 14px;">
      <div class="kpi-tile kpi-rose">
        <div class="kpi-label">累計專注時數</div>
        <div class="kpi-value">${escapeHtml(p.totalHours || '0')} hr</div>
        <div class="kpi-sub">共記錄 ${escapeHtml(p.dayCount || 0)} 日</div>
      </div>
      <div class="kpi-tile kpi-slate">
        <div class="kpi-label">日均專注時數</div>
        <div class="kpi-value">${escapeHtml(p.avgHours || '0')} hr</div>
        <div class="kpi-sub">每日目標 3 小時</div>
      </div>
      <div class="kpi-tile kpi-rose">
        <div class="kpi-label">平均目標達成率</div>
        <div class="kpi-value">${escapeHtml(p.avgRate || '0%')}</div>
        <div class="kpi-sub">${escapeHtml(p.fullAchievementDays || 0)}/${escapeHtml(p.dayCount || 0)} 天達 100%</div>
      </div>
      <div class="kpi-tile kpi-slate">
        <div class="kpi-label">累計完成任務</div>
        <div class="kpi-value">${escapeHtml(p.totalTasks || '0')} 項</div>
        <div class="kpi-sub">日均 ${escapeHtml(p.avgTasks || '0')} 項</div>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>專注時數</th>
            <th>目標達成</th>
            <th>完成任務</th>
            <th>項目明細</th>
            <th>來源</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
}

/* ============================================================================
 * 彈窗：日曆選擇與連線設定
 * ========================================================================== */

function openCalendarModal() {
  document.getElementById('calendar-date-input').value = state.selectedDate;
  const listEl = document.getElementById('archive-dates-list');

  if (!state.archiveDates || state.archiveDates.length === 0) {
    listEl.innerHTML = '<span class="muted small">目前尚無 DailyArchive 封存日期。每日 07:00 執行排程後會自動累積歷史紀錄。</span>';
  } else {
    listEl.innerHTML = state.archiveDates.map((dStr) => {
      const wd = getWeekdayZh(dStr);
      const activeClass = dStr === state.selectedDate ? 'active' : '';
      return `<button type="button" class="archive-chip ${activeClass}" data-archive-date="${escapeHtml(dStr)}">${escapeHtml(dStr)}（週${escapeHtml(wd)}）</button>`;
    }).join('');
  }
  openModal('modal-calendar');
}

function openSettingsModal() {
  document.getElementById('setting-api-url').value = state.apiUrl || '';
  document.getElementById('setting-api-token').value = state.apiToken || '';
  document.getElementById('settings-test-result').classList.add('hidden');
  openModal('modal-settings');
}

async function handleTestConnection() {
  const urlVal = document.getElementById('setting-api-url').value.trim();
  const tokenVal = document.getElementById('setting-api-token').value.trim();
  const resEl = document.getElementById('settings-test-result');
  resEl.classList.add('hidden');

  if (!urlVal) {
    resEl.className = 'alert alert-danger';
    resEl.textContent = '請先填入 GAS Web App URL。';
    resEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('btn-test-connection');
  btn.disabled = true;
  btn.textContent = '測試中…';

  try {
    const url = new URL(urlVal);
    url.searchParams.set('action', 'ping');
    if (tokenVal) url.searchParams.set('token', tokenVal);

    const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    const data = await response.json();
    if (!data || data.ok === false) {
      throw new Error((data && data.error) || '回傳驗證失敗');
    }
    resEl.className = 'alert alert-success';
    resEl.textContent = `連線成功！後端今日日期為 ${data.today}（${data.service || 'OK'}）。請點「儲存並同步」。`;
    resEl.classList.remove('hidden');
  } catch (err) {
    resEl.className = 'alert alert-danger';
    resEl.textContent = `連線失敗：${err.message}。請確認 Web App 部署權限為「所有人」。`;
    resEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = '測試連線';
  }
}

function handleSaveSettings(e) {
  e.preventDefault();
  const urlVal = document.getElementById('setting-api-url').value.trim();
  const tokenVal = document.getElementById('setting-api-token').value.trim();

  state.apiUrl = urlVal;
  state.apiToken = tokenVal;
  localStorage.setItem(STORAGE_KEYS.API_URL, urlVal);
  localStorage.setItem(STORAGE_KEYS.API_TOKEN, tokenVal);

  if (urlVal) {
    state.demoMode = false;
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, 'false');
    closeModal('modal-settings');
    loadBootstrap(state.selectedDate);
  } else {
    state.demoMode = true;
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, 'true');
    closeModal('modal-settings');
    loadDemoBootstrap(state.selectedDate);
  }
}

/* ============================================================================
 * 事件綁定與共用 UI 工具
 * ========================================================================== */

function bindEvents() {
  // 主分頁切換
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      state.activeTab = target;
      document.querySelectorAll('.tab-btn').forEach((b) => {
        const isActive = b.dataset.tab === target;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('.tab-view').forEach((v) => {
        v.classList.toggle('active', v.id === `view-${target}`);
      });
    });
  });

  // 頂部工具鈕
  document.getElementById('btn-calendar').addEventListener('click', openCalendarModal);
  document.getElementById('btn-empty-open-cal').addEventListener('click', openCalendarModal);
  document.getElementById('btn-refresh').addEventListener('click', () => reloadCurrentView());
  document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
  document.getElementById('btn-banner-settings').addEventListener('click', openSettingsModal);
  document.getElementById('btn-banner-demo').addEventListener('click', () => {
    state.demoMode = true;
    hideConnectionBanner();
    loadDemoBootstrap(state.selectedDate);
  });

  document.getElementById('btn-back-today').addEventListener('click', () => {
    switchSelectedDate(getTaipeiTodayStr());
  });

  // 日曆彈窗
  document.getElementById('btn-cal-go').addEventListener('click', () => {
    const val = document.getElementById('calendar-date-input').value;
    switchSelectedDate(val);
  });
  document.getElementById('btn-cal-today').addEventListener('click', () => {
    switchSelectedDate(getTaipeiTodayStr());
  });
  document.getElementById('archive-dates-list').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-archive-date]');
    if (chip) switchSelectedDate(chip.dataset.archiveDate);
  });

  // Weekly Board 週切換、篩選與任務操作
  document.getElementById('btn-prev-week').addEventListener('click', () => {
    state.weekStart = addDays(state.weekStart || getMondayOfWeek(state.selectedDate), -7);
    renderBoardView();
  });
  document.getElementById('btn-next-week').addEventListener('click', () => {
    state.weekStart = addDays(state.weekStart || getMondayOfWeek(state.selectedDate), 7);
    renderBoardView();
  });
  document.getElementById('btn-this-week').addEventListener('click', () => {
    state.weekStart = getMondayOfWeek(getTaipeiTodayStr());
    renderBoardView();
  });
  document.getElementById('btn-add-task').addEventListener('click', () => openTaskModal('', state.selectedDate));

  document.querySelectorAll('.pill[data-filter]').forEach((pill) => {
    pill.addEventListener('click', () => {
      state.zoneFilter = pill.dataset.filter;
      document.querySelectorAll('.pill[data-filter]').forEach((p) => {
        p.classList.toggle('active', p.dataset.filter === state.zoneFilter);
      });
      renderBoardView();
    });
  });

  document.getElementById('board-grid').addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add-day]');
    if (addBtn) {
      openTaskModal('', addBtn.dataset.addDay);
      return;
    }
    const editBtn = e.target.closest('[data-edit-id]');
    if (editBtn) {
      openTaskModal(editBtn.dataset.editId);
      return;
    }
    const delBtn = e.target.closest('[data-delete-id]');
    if (delBtn) {
      handleDeleteTask(delBtn.dataset.deleteId);
    }
  });

  document.getElementById('board-grid').addEventListener('change', (e) => {
    const chk = e.target.closest('[data-toggle-id]');
    if (chk) {
      handleToggleTask(chk.dataset.toggleId);
    }
  });

  document.getElementById('form-task').addEventListener('submit', handleSaveTaskSubmit);

  // 番茄鐘 JSON 匯入
  document.getElementById('btn-parse-pomo').addEventListener('click', handleParsePomodoroJson);
  document.getElementById('btn-import-pomo').addEventListener('click', handleImportPomodoro);
  document.getElementById('chk-pomo-overwrite').addEventListener('change', renderPomoPreview);
  document.getElementById('btn-clear-pomo').addEventListener('click', () => {
    document.getElementById('pomo-json-input').value = '';
    document.getElementById('pomo-parse-error').classList.add('hidden');
    document.getElementById('pomo-import-result').classList.add('hidden');
    state.parsedPomoRecords = [];
    renderPomoPreview();
  });
  document.getElementById('btn-sample-pomo').addEventListener('click', () => {
    const sampleDate = addDays(getTaipeiTodayStr(), -1);
    document.getElementById('pomo-json-input').value = JSON.stringify({
      records: [
        {
          date: sampleDate,
          total_hours: 4.25,
          daily_goal_hours: 3,
          achievement_rate: 1,
          completed_tasks: 5,
          details: 'VOM 翻譯 2小時45分鐘；希伯來文複習 1小時30分鐘'
        }
      ]
    }, null, 2);
    handleParsePomodoroJson();
  });

  // 連線設定彈窗
  document.getElementById('form-settings').addEventListener('submit', handleSaveSettings);
  document.getElementById('btn-test-connection').addEventListener('click', handleTestConnection);
  document.getElementById('btn-enter-demo').addEventListener('click', () => {
    state.demoMode = true;
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, 'true');
    closeModal('modal-settings');
    loadDemoBootstrap(state.selectedDate);
    showToast('已切換至示範模式');
  });

  // 通用彈窗關閉
  document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => closeModal(el.dataset.close));
  });
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function showConnectionBanner(msg) {
  const banner = document.getElementById('connection-banner');
  document.getElementById('connection-banner-text').textContent = msg;
  banner.classList.remove('hidden');
}

function hideConnectionBanner() {
  document.getElementById('connection-banner').classList.add('hidden');
}

function showToast(msg, isError = false) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' toast-error' : '');
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3600);
}
