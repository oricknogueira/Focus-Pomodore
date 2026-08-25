/* =========================================================
   FOCUS — Pomodoro Dashboard
   Vanilla JS, sem dependências. Progresso salvo no localStorage.
========================================================= */

const STORAGE_KEY = "focus-pomodoro-data-v1";
const RING_CIRCUMFERENCE = 2 * Math.PI * 108; // r=108 no SVG

const DEFAULT_SETTINGS = {
  pomodoro: 25,
  short: 5,
  long: 15,
  longInterval: 4,
  sound: true,
};

const DEFAULT_DATA = {
  settings: { ...DEFAULT_SETTINGS },
  theme: "light",
  xp: 0,
  stars: 0,
  totalPomodoros: 0,
  pomodorosSinceLongBreak: 0,
  streak: 0,
  lastActiveDate: null,
  dailyCounts: {},     // { "2026-08-25": 3 }
  totalFocusMinutes: 0,
  history: [],          // [{mode, minutes, timestamp}]
};

let data = loadData();

let state = {
  mode: "pomodoro",          // pomodoro | short | long
  secondsLeft: data.settings.pomodoro * 60,
  totalSeconds: data.settings.pomodoro * 60,
  isRunning: false,
  timerId: null,
};

/* ---------------------------
   PERSISTENCE
--------------------------- */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_DATA), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
  } catch (e) {
    console.error("Erro ao carregar progresso:", e);
    return structuredClone(DEFAULT_DATA);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---------------------------
   DOM REFERENCES
--------------------------- */
const el = {
  clock: document.getElementById("clock"),
  sessionLabel: document.getElementById("sessionLabel"),
  ringProgress: document.getElementById("ringProgress"),
  startPauseBtn: document.getElementById("startPauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  skipBtn: document.getElementById("skipBtn"),
  modeBtns: document.querySelectorAll(".mode-btn"),

  levelLabel: document.getElementById("levelLabel"),
  starsCount: document.getElementById("starsCount"),
  themeToggle: document.getElementById("themeToggle"),
  settingsBtn: document.getElementById("settingsBtn"),

  xpLevelLabel: document.getElementById("xpLevelLabel"),
  xpNumbers: document.getElementById("xpNumbers"),
  xpBarFill: document.getElementById("xpBarFill"),

  statToday: document.getElementById("statToday"),
  statTotal: document.getElementById("statTotal"),
  statHours: document.getElementById("statHours"),
  statStreak: document.getElementById("statStreak"),

  historyList: document.getElementById("historyList"),

  settingsModal: document.getElementById("settingsModal"),
  closeSettings: document.getElementById("closeSettings"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  resetProgressBtn: document.getElementById("resetProgressBtn"),
  inputPomodoro: document.getElementById("inputPomodoro"),
  inputShort: document.getElementById("inputShort"),
  inputLong: document.getElementById("inputLong"),
  inputLongInterval: document.getElementById("inputLongInterval"),
  inputSound: document.getElementById("inputSound"),

  levelUpToast: document.getElementById("levelUpToast"),
  toastText: document.getElementById("toastText"),
};

const MODE_LABELS = {
  pomodoro: "Sessão de foco",
  short: "Pausa curta",
  long: "Pausa longa",
};

/* ---------------------------
   INIT
--------------------------- */
function init() {
  applyTheme(data.theme);
  ringProgressSetup();
  setMode("pomodoro", { resetTimer: true });
  renderStats();
  renderHistory();
  bindEvents();
  syncStreakOnLoad();
}

function ringProgressSetup() {
  el.ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
  el.ringProgress.style.strokeDashoffset = 0;
}

/* ---------------------------
   TIMER CORE
--------------------------- */
function setMode(mode, { resetTimer = false } = {}) {
  state.mode = mode;
  el.modeBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === mode));

  const minutes = data.settings[mode];
  if (resetTimer || !state.isRunning) {
    pauseTimer();
    state.totalSeconds = minutes * 60;
    state.secondsLeft = minutes * 60;
  }

  el.sessionLabel.textContent = MODE_LABELS[mode];
  el.ringProgress.style.stroke = mode === "pomodoro" ? "var(--accent)" : "var(--accent-2)";
  updateClock();
}

function startTimer() {
  if (state.isRunning) return;
  state.isRunning = true;
  el.startPauseBtn.textContent = "Pausar";

  state.timerId = setInterval(() => {
    state.secondsLeft--;
    updateClock();

    if (state.secondsLeft <= 0) {
      completeSession();
    }
  }, 1000);
}

function pauseTimer() {
  state.isRunning = false;
  clearInterval(state.timerId);
  el.startPauseBtn.textContent = "Iniciar";
}

function toggleTimer() {
  state.isRunning ? pauseTimer() : startTimer();
}

function resetTimer() {
  pauseTimer();
  state.secondsLeft = data.settings[state.mode] * 60;
  state.totalSeconds = state.secondsLeft;
  updateClock();
}

function skipSession() {
  pauseTimer();
  goToNextMode();
}

function completeSession() {
  pauseTimer();
  playChime();

  const minutes = data.settings[state.mode];

  if (state.mode === "pomodoro") {
    awardPomodoro(minutes);
  }

  logHistory(state.mode, minutes);
  goToNextMode();
  renderStats();
  renderHistory();
  saveData();
}

function goToNextMode() {
  if (state.mode === "pomodoro") {
    data.pomodorosSinceLongBreak++;
    const nextMode = data.pomodorosSinceLongBreak >= data.settings.longInterval ? "long" : "short";
    if (nextMode === "long") data.pomodorosSinceLongBreak = 0;
    setMode(nextMode, { resetTimer: true });
  } else {
    setMode("pomodoro", { resetTimer: true });
  }
  saveData();
}

function updateClock() {
  const m = Math.floor(state.secondsLeft / 60).toString().padStart(2, "0");
  const s = (state.secondsLeft % 60).toString().padStart(2, "0");
  el.clock.textContent = `${m}:${s}`;
  document.title = `${m}:${s} — Focus`;

  const progressRatio = 1 - state.secondsLeft / state.totalSeconds;
  el.ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progressRatio);
}

/* ---------------------------
   XP / LEVEL / STARS
--------------------------- */
const XP_PER_LEVEL = 100;
const XP_PER_POMODORO = 25;

function awardPomodoro(minutes) {
  data.totalPomodoros++;
  data.stars++;
  data.totalFocusMinutes += minutes;

  const prevLevel = getLevel(data.xp);
  data.xp += XP_PER_POMODORO;
  const newLevel = getLevel(data.xp);

  const today = todayKey();
  data.dailyCounts[today] = (data.dailyCounts[today] || 0) + 1;
  updateStreak(today);

  if (newLevel > prevLevel) {
    showLevelUpToast(newLevel);
  }

  renderTopBar();
  renderXpBar();
}

function getLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function showLevelUpToast(level) {
  el.toastText.textContent = `Você subiu para o nível ${level}! ⚡`;
  el.levelUpToast.classList.remove("hidden");
  setTimeout(() => el.levelUpToast.classList.add("hidden"), 2800);
}

/* ---------------------------
   STREAK
--------------------------- */
function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function updateStreak(today) {
  if (data.lastActiveDate === today) return; // já contabilizado hoje

  const yesterday = todayKey(new Date(Date.now() - 86400000));

  if (data.lastActiveDate === yesterday) {
    data.streak++;
  } else {
    data.streak = 1;
  }
  data.lastActiveDate = today;
}

function syncStreakOnLoad() {
  // Se o último dia ativo não foi hoje nem ontem, a sequência quebrou (só reflete na UI)
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  if (data.lastActiveDate && data.lastActiveDate !== today && data.lastActiveDate !== yesterday) {
    data.streak = 0;
    saveData();
  }
  renderStats();
}

/* ---------------------------
   HISTORY
--------------------------- */
function logHistory(mode, minutes) {
  data.history.unshift({
    mode,
    minutes,
    timestamp: new Date().toISOString(),
  });
  data.history = data.history.slice(0, 15);
}

function renderHistory() {
  if (!data.history.length) {
    el.historyList.innerHTML = `<li class="history-empty">Nenhuma sessão concluída ainda. Vamos começar? 🍅</li>`;
    return;
  }

  const labelMap = { pomodoro: "Foco", short: "Pausa curta", long: "Pausa longa" };

  el.historyList.innerHTML = data.history
    .map((item) => {
      const date = new Date(item.timestamp);
      const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      return `
        <li class="history-item">
          <span class="tag">${labelMap[item.mode]} · ${item.minutes}min</span>
          <span class="time">${day} às ${time}</span>
        </li>`;
    })
    .join("");
}

/* ---------------------------
   RENDER: TOP BAR / XP / STATS
--------------------------- */
function renderTopBar() {
  const level = getLevel(data.xp);
  el.levelLabel.textContent = `Nível ${level}`;
  el.starsCount.textContent = data.stars;
}

function renderXpBar() {
  const level = getLevel(data.xp);
  const xpIntoLevel = data.xp % XP_PER_LEVEL;
  el.xpLevelLabel.textContent = `Nível ${level}`;
  el.xpNumbers.textContent = `${xpIntoLevel} / ${XP_PER_LEVEL} XP`;
  el.xpBarFill.style.width = `${(xpIntoLevel / XP_PER_LEVEL) * 100}%`;
}

function renderStats() {
  renderTopBar();
  renderXpBar();

  const today = todayKey();
  el.statToday.textContent = data.dailyCounts[today] || 0;
  el.statTotal.textContent = data.totalPomodoros;
  el.statHours.textContent = `${(data.totalFocusMinutes / 60).toFixed(1)}h`;
  el.statStreak.textContent = data.streak;
}

/* ---------------------------
   THEME
--------------------------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  el.themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  data.theme = theme;
}

function toggleTheme() {
  const next = data.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  saveData();
}

/* ---------------------------
   SOUND (beep simples via WebAudio, sem arquivos externos)
--------------------------- */
function playChime() {
  if (!data.settings.sound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.9);
  } catch (e) {
    // ambiente sem suporte a WebAudio — ignora silenciosamente
  }
}

/* ---------------------------
   SETTINGS MODAL
--------------------------- */
function openSettings() {
  el.inputPomodoro.value = data.settings.pomodoro;
  el.inputShort.value = data.settings.short;
  el.inputLong.value = data.settings.long;
  el.inputLongInterval.value = data.settings.longInterval;
  el.inputSound.checked = data.settings.sound;
  el.settingsModal.classList.remove("hidden");
}

function closeSettings() {
  el.settingsModal.classList.add("hidden");
}

function saveSettings() {
  data.settings.pomodoro = clampInt(el.inputPomodoro.value, 1, 180, 25);
  data.settings.short = clampInt(el.inputShort.value, 1, 60, 5);
  data.settings.long = clampInt(el.inputLong.value, 1, 120, 15);
  data.settings.longInterval = clampInt(el.inputLongInterval.value, 2, 12, 4);
  data.settings.sound = el.inputSound.checked;

  saveData();
  closeSettings();
  setMode(state.mode, { resetTimer: true });
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function resetProgress() {
  const confirmed = confirm("Tem certeza que deseja apagar todo o seu progresso? Essa ação não pode ser desfeita.");
  if (!confirmed) return;

  const keepSettings = data.settings;
  const keepTheme = data.theme;
  data = structuredClone(DEFAULT_DATA);
  data.settings = keepSettings;
  data.theme = keepTheme;
  saveData();

  renderStats();
  renderHistory();
  closeSettings();
}

/* ---------------------------
   EVENTS
--------------------------- */
function bindEvents() {
  el.startPauseBtn.addEventListener("click", toggleTimer);
  el.resetBtn.addEventListener("click", resetTimer);
  el.skipBtn.addEventListener("click", skipSession);

  el.modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode, { resetTimer: true }));
  });

  el.themeToggle.addEventListener("click", toggleTheme);

  el.settingsBtn.addEventListener("click", openSettings);
  el.closeSettings.addEventListener("click", closeSettings);
  el.saveSettingsBtn.addEventListener("click", saveSettings);
  el.resetProgressBtn.addEventListener("click", resetProgress);

  el.settingsModal.addEventListener("click", (e) => {
    if (e.target === el.settingsModal) closeSettings();
  });
}

/* ---------------------------
   BOOT
--------------------------- */
init();
