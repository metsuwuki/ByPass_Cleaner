const state = {
      ipc: null,
      hostMode: "none",
      pending: new Map(),
      logs: [],
      processes: [],
      quarantine: [],
      audit: [],
      capabilities: {
        is_windows: false,
        schedule_delete_on_reboot: false,
        aggressive_delete: false,
        force_actions_require_helper: true
      },
      settings: null,
      report: null,
      matchedItems: [],
      processSearch: "",
      processFilter: "active",
      processLimit: 30,
      themeMode: "AUTO",
      accent: "AMETHYST",
      view: "home",
      lang: "en",
      welcomeOpen: false,
      welcomeDraft: null,
      welcomePreviewRaf: 0,
      welcomePreviewUnmount: null,
      powerProfile: "BASIC",
      sandboxProfile: "limited",
      maxRetries: "auto"
    };

    const ACCENT_OPTIONS = ["AMETHYST", "RUBY", "FIRE_OPAL", "GOLD", "EMERALD", "DIAMOND", "SAPPHIRE", "QUARTZ", "VOLCANO_ASH"];
    const THEME_MODE_OPTIONS = ["AUTO", "DARK", "LIGHT"];
    const POWER_PROFILE_OPTIONS = ["BASIC", "AUDIT", "PENTEST"];
    const SANDBOX_PROFILE_OPTIONS = ["limited", "isolated", "none"];
    const systemThemeMedia = window.matchMedia("(prefers-color-scheme: light)");
    const tauriCore = window.__TAURI__ && window.__TAURI__.core ? window.__TAURI__.core : null;
    const tauriEvent = window.__TAURI__ && window.__TAURI__.event ? window.__TAURI__.event : null;

    const i18n = {
      en: {
        navHome: "Home",
        navProcesses: "Processes",
        navReports: "Reports",
        navSettings: "Settings",
        navSupport: "Support",
        navAbout: "About",
        home: "Home",
        reports: "Reports",
        settings: "Settings",
        support: "Support",
        viewHome: "Home",
        viewProcesses: "Processes",
        viewReports: "Reports",
        viewSettings: "Settings",
        topTitle: "ByPass Cleaner",
        topSub: "File cleanup dashboard, no extra noise",
        subtitle: "Cleaner dashboard, no extra noise",
        ready: "ready",
        noReport: "No report loaded",
        heroLabel: "File Cleaner",
        heroLead: "Smart",
        heroAccent: "Cleanup Workspace",
        heroSub: "Configure filters, run preview or delete mode, and track cleanup results in real time.",
        tagPreview: "Preview",
        tagDelete: "Delete",
        tagReports: "Reports",
        lblTarget: "Target Folder",
        btnPickTarget: "Choose Folder",
        lblReportsDir: "Reports Dir",
        lblOlderDays: "Older Than Days",
        lblMinSize: "Min Size MB",
        lblExtensions: "Extensions (csv, no dot)",
        lblPowerProfile: "Power Profile",
        lblSandboxProfile: "Sandbox Profile",
        lblMaxRetries: "Max Retries",
        lblScanSubfolders: "Scan subfolders",
        lblDeleteEmpty: "Delete empty dirs",
        lblSkipHidden: "Skip hidden",
        lblUseAgeFilter: "Use age filter",
        lblPreviewOnly: "Preview only",
        btnRun: "Run Cleanup",
        btnStop: "Stop",
        btnLoadSettings: "Load Settings",
        btnSaveSettings: "Save Settings",
        btnOpenReportsDir: "Open Reports Dir",
        btnListReports: "Refresh List",
        btnRefreshProcesses: "Refresh Processes",
        btnRefreshQuarantine: "Refresh Quarantine",
        btnRefreshAudit: "Refresh Audit",
        openReportsDir: "Open Reports Dir",
        refreshList: "Refresh List",
        refreshProcesses: "Refresh Processes",
        refreshQuarantine: "Refresh Quarantine",
        refreshAudit: "Refresh Audit",
        liveLog: "Live Log",
        latestSnapshot: "Latest Report Snapshot",
        matchedFiles: "Matched Files",
        processes: "Processes",
        auditLog: "Audit Log",
        quarantine: "Quarantine",
        reportPreview: "Report Preview",
        lblProcessSearch: "Process Search",
        lblThreatFilter: "Threat Filter",
        lblVisibleRows: "Visible Rows",
        lblOperator: "Operator",
        lblThemeMode: "Theme Mode",
        lblAccent: "Accent",
        lblLanguage: "Language",
        powerProfileBasic: "BASIC",
        powerProfileAudit: "AUDIT",
        powerProfilePentest: "PENTEST",
        sandboxLimited: "LIMITED",
        sandboxIsolated: "ISOLATED",
        sandboxNone: "NONE"
      },
      ru: {
        navHome: "Главная",
        navProcesses: "Процессы",
        navReports: "Отчеты",
        navSettings: "Настройки",
        navSupport: "Поддержка",
        navAbout: "О проекте",
        home: "Главная",
        reports: "Отчеты",
        settings: "Настройки",
        support: "Поддержка",
        viewHome: "Главная",
        viewProcesses: "Процессы",
        viewReports: "Отчеты",
        viewSettings: "Настройки",
        topTitle: "ByPass Cleaner",
        topSub: "Панель очистки файлов, без лишних возможностей",
        subtitle: "Панель очистки без лишнего шума",
        ready: "готово",
        noReport: "Отчет не загружен",
        heroLabel: "Очистка файлов",
        heroLead: "Умная",
        heroAccent: "рабочая зона очистки",
        heroSub: "Настройте фильтры, запустите предпросмотр или удаление и отслеживайте результат в реальном времени.",
        tagPreview: "Предпросмотр",
        tagDelete: "Удаление",
        tagReports: "Отчеты",
        lblTarget: "Целевая папка",
        btnPickTarget: "Выбрать папку",
        lblReportsDir: "Папка отчетов",
        lblOlderDays: "Старше (дней)",
        lblMinSize: "Мин. размер (МБ)",
        lblExtensions: "Расширения (csv, без точки)",
        lblPowerProfile: "Профиль мощности",
        lblSandboxProfile: "Профиль изоляции",
        lblMaxRetries: "Макс. число попыток",
        lblScanSubfolders: "Сканировать подпапки",
        lblDeleteEmpty: "Удалять пустые папки",
        lblSkipHidden: "Пропускать скрытые",
        lblUseAgeFilter: "Фильтр по возрасту",
        lblPreviewOnly: "Только предпросмотр",
        btnRun: "Запустить очистку",
        btnStop: "Остановить",
        btnLoadSettings: "Загрузить настройки",
        btnSaveSettings: "Сохранить настройки",
        btnOpenReportsDir: "Открыть папку отчетов",
        btnListReports: "Обновить список",
        btnRefreshProcesses: "Обновить процессы",
        btnRefreshQuarantine: "Обновить карантин",
        btnRefreshAudit: "Обновить аудит",
        openReportsDir: "Открыть папку отчетов",
        refreshList: "Обновить список",
        refreshProcesses: "Обновить процессы",
        refreshQuarantine: "Обновить карантин",
        refreshAudit: "Обновить аудит",

        liveLog: "Живой лог",
        latestSnapshot: "Сводка последнего отчета",
        matchedFiles: "Совпавшие файлы",
        processes: "Процессы",
        auditLog: "Журнал аудита",
        quarantine: "Карантин",
        reportPreview: "Предпросмотр отчета",
        lblProcessSearch: "Поиск процесса",
        lblThreatFilter: "Фильтр угроз",
        lblVisibleRows: "Видимые строки",
        lblOperator: "Оператор",
        lblThemeMode: "Тема",
        lblAccent: "Акцент",
        lblLanguage: "Язык",
        powerProfileBasic: "БАЗОВЫЙ",
        powerProfileAudit: "АУДИТ",
        powerProfilePentest: "PENTEST",
        sandboxLimited: "ОГРАНИЧЕННЫЙ",
        sandboxIsolated: "ИЗОЛИРОВАННЫЙ",
        sandboxNone: "БЕЗ ИЗОЛЯЦИИ"
      }
    };

    function id() {
      return "r-" + Math.random().toString(16).slice(2);
    }

    function t(key) {
      const langPack = i18n[state.lang] || i18n.en;
      return langPack[key] || i18n.en[key] || key;
    }

    function langText(en, ru) {
      return state.lang === "ru" ? ru : en;
    }

    function detectLanguage(raw) {
      const val = String(raw || "auto").toLowerCase();
      if (val === "en" || val === "ru") return val;
      const nav = (navigator.language || "en").toLowerCase();
      return nav.startsWith("ru") ? "ru" : "en";
    }

    function setCheckText(inputId, text) {
      const input = document.getElementById(inputId);
      if (!input || !input.parentNode) return;
      const label = input.parentNode;
      const txtNode = Array.from(label.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
      if (txtNode) txtNode.nodeValue = " " + text;
    }

    function applyTexts() {
      document.documentElement.lang = state.lang;
      const homeBtn = document.querySelector('.nav-btn[data-view="home"] .nav-label');
      const processesBtn = document.querySelector('.nav-btn[data-view="processes"] .nav-label');
      const reportsBtn = document.querySelector('.nav-btn[data-view="reports"] .nav-label');
      const settingsBtn = document.querySelector('.nav-btn[data-view="settings"] .nav-label');
      const supportBtnLbl = document.querySelector('#btnSupport .nav-label');
      if (homeBtn) homeBtn.textContent = t("home");
      if (processesBtn) processesBtn.textContent = t("processes");
      if (reportsBtn) reportsBtn.textContent = t("reports");
      if (settingsBtn) settingsBtn.textContent = t("settings");
      if (supportBtnLbl) supportBtnLbl.textContent = t("support");

      const topSub = document.querySelector('.top-sub');
      if (topSub) topSub.textContent = t("subtitle");
      if (document.getElementById("statusText").textContent === "ready" || document.getElementById("statusText").textContent === "готово") {
        document.getElementById("statusText").textContent = t("ready");
      }
      if (!state.report) document.getElementById("reportHint").textContent = t("noReport");

      const heroLabel = document.querySelector('.hero-label');
      const heroSub = document.querySelector('.hero-sub');
      const heroTitle = document.querySelector('.hero-title');
      const heroAccent = document.querySelector('.hero-title-accent');
      if (heroLabel) heroLabel.textContent = t("heroLabel");
      if (heroSub) heroSub.textContent = t("heroSub");
      if (heroTitle && heroAccent) {
        heroTitle.childNodes[0].nodeValue = t("heroLead") + " ";
        heroAccent.textContent = t("heroAccent");
      }

      const tags = document.querySelectorAll('.hero-tag');
      if (tags[0]) tags[0].textContent = t("tagPreview");
      if (tags[1]) tags[1].textContent = t("tagDelete");
      if (tags[2]) tags[2].textContent = t("tagReports");

      const labelTarget = document.querySelector('label[for="targetPath"]');
      const labelOutDir = document.querySelector('label[for="outDirInput"]');
      const labelDays = document.querySelector('label[for="daysInput"]');
      const labelPowerProfile = document.querySelector('label[for="powerProfileSelect"]');
      const labelSandboxProfile = document.querySelector('label[for="sandboxProfileSelect"]');
      const labelMaxRetries = document.querySelector('label[for="maxRetriesSelect"]');
      const labelMinSize = document.querySelector('label[for="minSizeInput"]');
      const labelExt = document.querySelector('label[for="extInput"]');
      const labelThemeMode = document.querySelector('label[for="themeModeSelect"]');
      const labelAccent = document.querySelector('label[for="accentSelect"]');
      const labelLang = document.querySelector('label[for="langSelect"]');
      const labelOperator = document.querySelector('label[for="operatorInput"]');
      const labelProcessSearch = document.querySelector('label[for="processSearchInput"]');
      const labelProcessFilter = document.querySelector('label[for="processFilterSelect"]');
      const labelProcessLimit = document.querySelector('label[for="processLimitSelect"]');
      if (labelTarget) labelTarget.textContent = t("lblTarget");
      if (labelOutDir) labelOutDir.textContent = t("lblReportsDir");
      if (labelDays) labelDays.textContent = t("lblOlderDays");
      if (labelMinSize) labelMinSize.textContent = t("lblMinSize");
      if (labelExt) labelExt.textContent = t("lblExtensions");
      if (labelPowerProfile) labelPowerProfile.textContent = t("lblPowerProfile");
      if (labelSandboxProfile) labelSandboxProfile.textContent = t("lblSandboxProfile");
      if (labelMaxRetries) labelMaxRetries.textContent = t("lblMaxRetries");
      if (labelOperator) labelOperator.textContent = t("lblOperator");
      if (labelProcessSearch) labelProcessSearch.textContent = t("lblProcessSearch");
      if (labelProcessFilter) labelProcessFilter.textContent = t("lblThreatFilter");
      if (labelProcessLimit) labelProcessLimit.textContent = t("lblVisibleRows");
      if (labelThemeMode) labelThemeMode.textContent = t("lblThemeMode");
      if (labelAccent) labelAccent.textContent = t("lblAccent");
      if (labelLang) labelLang.textContent = t("lblLanguage");

      setCheckText("scanSubfolders", t("lblScanSubfolders"));
      setCheckText("deleteEmpty", t("lblDeleteEmpty"));
      setCheckText("skipHidden", t("lblSkipHidden"));
      setCheckText("useAgeFilter", t("lblUseAgeFilter"));
      setCheckText("dryRun", t("lblPreviewOnly"));
      document.getElementById("btnPickTarget").textContent = t("btnPickTarget");
      document.getElementById("btnRun").textContent = t("btnRun");
      document.getElementById("btnStop").textContent = t("btnStop");
      const btnOpenReportsDir = document.getElementById("btnOpenReportsDir");
      const btnListReports = document.getElementById("btnListReports");
      const btnRefreshProcesses = document.getElementById("btnRefreshProcesses");
      const btnRefreshQuarantine = document.getElementById("btnRefreshQuarantine");
      const btnRefreshAudit = document.getElementById("btnRefreshAudit");
      if (btnOpenReportsDir) btnOpenReportsDir.textContent = t("openReportsDir");
      if (btnListReports) btnListReports.textContent = t("refreshList");
      if (btnRefreshProcesses) btnRefreshProcesses.textContent = t("refreshProcesses");
      if (btnRefreshQuarantine) btnRefreshQuarantine.textContent = t("refreshQuarantine");
      if (btnRefreshAudit) btnRefreshAudit.textContent = t("refreshAudit");
      const btnSaveSettings = document.getElementById("btnSaveSettings");
      if (btnSaveSettings) btnSaveSettings.textContent = t("btnSaveSettings");

      const processFilterSelect = document.getElementById("processFilterSelect");
      if (processFilterSelect && processFilterSelect.options.length >= 9) {
        processFilterSelect.options[0].textContent = state.lang === "ru" ? "Риск: сначала опасные" : "High Risk First";
        processFilterSelect.options[1].textContent = state.lang === "ru" ? "Все процессы" : "All Processes";
        processFilterSelect.options[2].textContent = state.lang === "ru" ? "Только Critical" : "Critical Only";
        processFilterSelect.options[3].textContent = state.lang === "ru" ? "Только High" : "High Only";
        processFilterSelect.options[4].textContent = state.lang === "ru" ? "Watchlist" : "Watchlist";
        processFilterSelect.options[5].textContent = state.lang === "ru" ? "Похожие на майнер" : "Likely Miner";
        processFilterSelect.options[6].textContent = state.lang === "ru" ? "Похожие на RAT" : "Likely RAT";
        processFilterSelect.options[7].textContent = state.lang === "ru" ? "Похожие на троян" : "Likely Trojan";
        processFilterSelect.options[8].textContent = state.lang === "ru" ? "Подозрительные общие" : "Suspicious Generic";
      }

      const cardTitles = document.querySelectorAll('.card-title');
      if (cardTitles[0]) cardTitles[0].textContent = t("liveLog");
      if (cardTitles[1]) cardTitles[1].textContent = t("latestSnapshot");
      if (cardTitles[2]) cardTitles[2].textContent = t("matchedFiles");
      if (cardTitles[3]) cardTitles[3].textContent = t("processes");
      if (cardTitles[4]) cardTitles[4].textContent = t("auditLog");
      if (cardTitles[5]) cardTitles[5].textContent = t("quarantine");
      if (cardTitles[6]) cardTitles[6].textContent = t("reports");
      if (cardTitles[7]) cardTitles[7].textContent = t("reportPreview");

      const viewTitle = document.getElementById("viewTitle");
      if (state.view === "home") viewTitle.textContent = t("home");
      if (state.view === "processes") viewTitle.textContent = t("processes");
      if (state.view === "reports") viewTitle.textContent = t("reports");
      if (state.view === "settings") viewTitle.textContent = t("settings");

      const themeModeSelect = document.getElementById("themeModeSelect");
      if (themeModeSelect && themeModeSelect.options.length >= 3) {
        themeModeSelect.options[0].textContent = state.lang === "ru" ? "Система (авто)" : "System (Auto)";
        themeModeSelect.options[1].textContent = state.lang === "ru" ? "Тёмная" : "Dark";
        themeModeSelect.options[2].textContent = state.lang === "ru" ? "Светлая" : "Light";
      }

      const langSelect = document.getElementById("langSelect");
      if (langSelect && langSelect.options.length >= 3) {
        langSelect.options[0].textContent = state.lang === "ru" ? "Авто" : "Auto";
        langSelect.options[1].textContent = state.lang === "ru" ? "Английский" : "English";
        langSelect.options[2].textContent = state.lang === "ru" ? "Русский" : "Russian";
      }

      const powerProfileSelect = document.getElementById("powerProfileSelect");
      if (powerProfileSelect && powerProfileSelect.options.length >= 3) {
        powerProfileSelect.options[0].textContent = t("powerProfileBasic");
        powerProfileSelect.options[1].textContent = t("powerProfileAudit");
        powerProfileSelect.options[2].textContent = t("powerProfilePentest");
      }

      const sandboxProfileSelect = document.getElementById("sandboxProfileSelect");
      if (sandboxProfileSelect && sandboxProfileSelect.options.length >= 3) {
        sandboxProfileSelect.options[0].textContent = t("sandboxLimited");
        sandboxProfileSelect.options[1].textContent = t("sandboxIsolated");
        sandboxProfileSelect.options[2].textContent = t("sandboxNone");
      }
    }

    function normalizeAccent(accent) {
      const raw = String(accent || "AMETHYST").toUpperCase();
      return ACCENT_OPTIONS.includes(raw) ? raw : "AMETHYST";
    }

    function normalizeThemeMode(mode) {
      const raw = String(mode || "AUTO").toUpperCase();
      return THEME_MODE_OPTIONS.includes(raw) ? raw : "AUTO";
    }

    function resolvedThemeMode(mode) {
      const normalized = normalizeThemeMode(mode);
      if (normalized === "AUTO") return systemThemeMedia.matches ? "LIGHT" : "DARK";
      return normalized;
    }

    function applyAccent(accent) {
      const root = document.documentElement;
      const prev = root.getAttribute("data-accent") || "AMETHYST";
      const next = normalizeAccent(accent);
      root.setAttribute("data-accent", next);
      state.accent = next;
      if (prev !== next) {
        root.classList.add("accent-morph");
        setTimeout(() => root.classList.remove("accent-morph"), 220);
      }
    }

    function applyThemeMode(mode) {
      const normalized = normalizeThemeMode(mode);
      document.documentElement.setAttribute("data-theme", resolvedThemeMode(normalized));
      state.themeMode = normalized;
    }

    function formatWelcomeLanguageLabel(value, uiLang = state.lang) {
      const raw = String(value || "auto").toLowerCase();
      if (raw === "ru") return uiLang === "ru" ? "Русский" : "Russian";
      if (raw === "en") return uiLang === "ru" ? "Английский" : "English";
      return uiLang === "ru" ? "Авто" : "Auto";
    }

    function formatWelcomeThemeLabel(value, uiLang = state.lang) {
      const raw = String(value || "AUTO").toUpperCase();
      if (raw === "DARK") return uiLang === "ru" ? "Темная" : "Dark";
      if (raw === "LIGHT") return uiLang === "ru" ? "Светлая" : "Light";
      return uiLang === "ru" ? "Авто" : "Auto";
    }

    function formatWelcomeAccentLabel(value) {
      const map = {
        AMETHYST: "Amethyst",
        RUBY: "Ruby",
        FIRE_OPAL: "Fire Opal",
        GOLD: "Gold",
        EMERALD: "Emerald",
        DIAMOND: "Diamond",
        SAPPHIRE: "Sapphire",
        QUARTZ: "Quartz",
        VOLCANO_ASH: "Volcano Ash"
      };
      return map[String(value || "AMETHYST").toUpperCase()] || "Amethyst";
    }

    function applyWelcomePreviewAppearance() {
      if (!state.welcomeDraft) return;
      const hero = document.getElementById("welcomePreviewHero");
      const dialog = document.querySelector("#welcomeBackdrop .welcome-dialog");
      const backdrop = document.getElementById("welcomeBackdrop");
      if (!hero && !dialog) return;

      const accent = normalizeAccent(state.welcomeDraft.accent || "AMETHYST");
      const theme = normalizeThemeMode(state.welcomeDraft.theme || "AUTO");

      // Accent colours — kept in sync with CSS html[data-accent] rules
      const accentMap = {
        AMETHYST:    ["#8f4dff", "#c96eff", "#b080ff"],
        RUBY:        ["#c4304d", "#f15a78", "#ff9eb0"],
        FIRE_OPAL:   ["#ff6b2e", "#ff9d2e", "#ff8a57"],
        GOLD:        ["#c9921f", "#f1c45b", "#f7d98b"],
        EMERALD:     ["#0fa36d", "#38d39a", "#7ff0c3"],
        DIAMOND:     ["#29bfb0", "#63e5d8", "#8ef0e6"],
        SAPPHIRE:    ["#2f74de", "#58a1ff", "#87bcff"],
        QUARTZ:      ["#d16eb3", "#f38bcf", "#f9addd"],
        VOLCANO_ASH: ["#8f97a4", "#bdc5d2", "#e6edf7"]
      };

      // Background/text tokens — kept in sync with CSS :root and html[data-theme=LIGHT]
      const bgMap = {
        DARK:  { bgElev: "#1d1d1d", bgElev2: "#222222", bgPanel: "#20202b", text: "#e7e7e7", muted: "#a3a3a3", line: "#303030", lineSoft: "#2a2a2a" },
        LIGHT: { bgElev: "#eef2f6", bgElev2: "#e5ebf1", bgPanel: "#f3f7fc", text: "#18222d", muted: "#526173", line: "#bcc7d3", lineSoft: "#d0d8e1" }
      };

      const [accentA, accentB, accentSoft] = accentMap[accent] || accentMap.AMETHYST;

      let bg;
      if (theme === "AUTO") {
        // Mirror whatever theme the page currently uses
        const cs = getComputedStyle(document.documentElement);
        bg = {
          bgElev:   cs.getPropertyValue("--bg-elev").trim()   || "#1d1d1d",
          bgElev2:  cs.getPropertyValue("--bg-elev-2").trim() || "#222222",
          bgPanel:  cs.getPropertyValue("--bg-panel").trim()  || cs.getPropertyValue("--bg-elev-2").trim() || "#222222",
          text:     cs.getPropertyValue("--text").trim()      || "#e7e7e7",
          muted:    cs.getPropertyValue("--muted").trim()     || "#a3a3a3",
          line:     cs.getPropertyValue("--line").trim()      || "#303030",
          lineSoft: cs.getPropertyValue("--line-soft").trim() || "#2a2a2a"
        };
      } else {
        bg = bgMap[theme] || bgMap.DARK;
      }

      [hero, dialog].forEach((el) => {
        if (!el) return;
        // Set source variables only — CSS computes derived glow/surface values.
        el.style.removeProperty("--hero-glow-a");
        el.style.removeProperty("--hero-glow-b");
        el.style.removeProperty("--hero-surface-top");
        el.style.removeProperty("--hero-surface-bottom");

        el.style.setProperty("--accent", accentA);
        el.style.setProperty("--accent-2", accentB);
        el.style.setProperty("--accent-soft", accentSoft);
        el.style.setProperty("--bg-panel", bg.bgPanel || bg.bgElev2);
        el.style.setProperty("--bg-elev", bg.bgElev);
        el.style.setProperty("--bg-elev-2", bg.bgElev2);
        el.style.setProperty("--text", bg.text);
        el.style.setProperty("--muted", bg.muted);
        el.style.setProperty("--line", bg.line);
        el.style.setProperty("--line-soft", bg.lineSoft);
      });

      if (hero) hero.setAttribute("data-preview-theme", theme);
      if (dialog) dialog.setAttribute("data-preview-theme", theme);
      if (backdrop) {
        const overlayBase = theme === "LIGHT" ? "rgba(8, 12, 20, 0.76)" : "rgba(3, 5, 12, 0.88)";
        backdrop.style.setProperty("--welcome-overlay", overlayBase);
        backdrop.style.setProperty("--welcome-overlay-accent", `color-mix(in oklab, ${accentA} 24%, transparent)`);
      }
    }

    function syncEnhancedSelects() {
      document.querySelectorAll("select[data-ux-enhanced='1']").forEach((select) => {
        if (typeof select.__uxSync === "function") select.__uxSync();
      });
    }

    function showSelectDialog(select, titleText) {
      const old = document.getElementById("selectDialog");
      if (old) old.remove();

      const isAccentPicker = select.id === "accentSelect" || select.id === "welcomeAccentSelect";
      const accentPreview = {
        RUBY: "linear-gradient(120deg, #c4304d, #f15a78)",
        FIRE_OPAL: "linear-gradient(120deg, #ff6b2e, #ff9d2e)",
        GOLD: "linear-gradient(120deg, #d6a83d, #f0cb73)",
        EMERALD: "linear-gradient(120deg, #2db873, #49d68d)",
        DIAMOND: "linear-gradient(120deg, #29bfb0, #63e5d8)",
        SAPPHIRE: "linear-gradient(120deg, #2f74de, #58a1ff)",
        AMETHYST: "linear-gradient(120deg, #8f4dff, #c96eff)",
        QUARTZ: "linear-gradient(120deg, #d16eb3, #f38bcf)",
        VOLCANO_ASH: "linear-gradient(120deg, #8f97a4, #bdc5d2)",
        // Backward-compatible aliases for older ids.
        CHERRY: "linear-gradient(120deg, #c4304d, #f15a78)",
        LAVA: "linear-gradient(120deg, #ff6b2e, #ff9d2e)",
        SEA: "linear-gradient(120deg, #29bfb0, #63e5d8)",
        ASH: "linear-gradient(120deg, #8f97a4, #bdc5d2)"
      };

      const normalizePreviewAccentKey = (value) => {
        const raw = String(value || "")
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, "_");
        if (raw === "FIREOPAL") return "FIRE_OPAL";
        if (raw === "VOLCANOASH") return "VOLCANO_ASH";
        return raw;
      };

      const options = Array.from(select.options).filter((opt) => !opt.disabled);
      let pendingValue = select.value;

      const wrap = document.createElement("div");
      wrap.id = "selectDialog";
      wrap.className = "picker-backdrop";

      // Picker is mounted at document.body level, so it won't inherit CSS vars from
      // the originating dialog automatically. Copy current visual tokens explicitly.
      const sourceScope =
        select.closest("#welcomeBackdrop .welcome-dialog") ||
        select.closest(".panel-body") ||
        document.documentElement;
      const scopeStyles = getComputedStyle(sourceScope);
      const tokens = ["--accent", "--accent-2", "--accent-soft", "--bg", "--bg-ink", "--bg-elev", "--bg-elev-2", "--line", "--line-soft", "--text", "--muted"];
      tokens.forEach((token) => {
        const value = scopeStyles.getPropertyValue(token).trim();
        if (value) wrap.style.setProperty(token, value);
      });

      wrap.innerHTML = `
        <div class="picker-dialog" role="dialog" aria-modal="true" aria-label="Select value">
          <div class="picker-head">
            <div>
              <div class="picker-title">${titleText || "Select value"}</div>
              <div class="picker-sub">Pick a value and press Apply</div>
            </div>
          </div>
          <div class="picker-body">
            <div class="picker-list" id="pickerList"></div>
            <div class="picker-side">
              <div>
                <div class="picker-k">Current</div>
                <div class="picker-v" id="pickerCurrent">-</div>
              </div>
              <div>
                <div class="picker-k">Pending</div>
                <div class="picker-v" id="pickerPending">-</div>
              </div>
              <div id="pickerPreviewWrap" class="${isAccentPicker ? "" : "hidden"}">
                <div class="picker-k">Preview</div>
                <div class="picker-preview" id="pickerPreview"></div>
              </div>
            </div>
          </div>
          <div class="picker-foot">
            <button class="btn" id="pickerCancel" type="button">Cancel</button>
            <button class="btn primary" id="pickerApply" type="button">Apply</button>
          </div>
        </div>
      `;
      document.body.appendChild(wrap);

      const list = document.getElementById("pickerList");
      const currentBox = document.getElementById("pickerCurrent");
      const pendingBox = document.getElementById("pickerPending");
      const previewBox = document.getElementById("pickerPreview");

      const selectedLabel = () => {
        const selected = options.find((opt) => opt.value === pendingValue);
        return selected ? selected.textContent.trim() : "-";
      };

      currentBox.textContent = select.options[select.selectedIndex] ? select.options[select.selectedIndex].textContent.trim() : "-";
      pendingBox.textContent = selectedLabel();
      if (isAccentPicker && previewBox) {
        const previewKey = normalizePreviewAccentKey(pendingValue);
        previewBox.style.background = accentPreview[previewKey] || accentPreview.AMETHYST;
      }

      const render = () => {
        list.innerHTML = "";
        options.forEach((opt) => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "picker-item" + (opt.value === pendingValue ? " is-active" : "");
          item.textContent = (opt.textContent || opt.value || "").trim();
          item.addEventListener("click", () => {
            pendingValue = opt.value;
            pendingBox.textContent = selectedLabel();
            if (isAccentPicker && previewBox) {
              const previewKey = normalizePreviewAccentKey(pendingValue);
              previewBox.style.background = accentPreview[previewKey] || accentPreview.AMETHYST;
            }
            render();
          });
          item.addEventListener("dblclick", () => {
            pendingValue = opt.value;
            applyAndClose();
          });
          list.appendChild(item);
        });
      };

      const close = () => {
        document.removeEventListener("keydown", onKey);
        if (wrap && wrap.parentNode) wrap.remove();
      };

      const applyAndClose = () => {
        if (select.value !== pendingValue) {
          select.value = pendingValue;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (typeof select.__uxSync === "function") select.__uxSync();
        close();
      };

      const onKey = (e) => {
        if (e.key === "Escape") {
          close();
          return;
        }
        if (e.key === "Enter") {
          applyAndClose();
        }
      };

      wrap.addEventListener("click", (e) => {
        if (e.target === wrap) close();
      });

      document.getElementById("pickerCancel").addEventListener("click", close);
      document.getElementById("pickerApply").addEventListener("click", applyAndClose);
      document.addEventListener("keydown", onKey);
      render();
    }

    function enhanceSelects() {
      document.querySelectorAll("select").forEach((select) => {
        if (select.dataset.uxEnhanced === "1") return;
        select.dataset.uxEnhanced = "1";
        select.classList.add("ux-native");

        const shell = document.createElement("div");
        shell.className = "select-shell";
        select.parentNode.insertBefore(shell, select);
        shell.appendChild(select);

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "select-trigger";
        shell.appendChild(trigger);

        const syncFromNative = () => {
          const current = select.options[select.selectedIndex];
          trigger.textContent = current ? (current.textContent || "").trim() : "-";
        };

        syncFromNative();
        select.__uxSync = syncFromNative;

        trigger.addEventListener("click", (e) => {
          e.stopPropagation();
          const field = shell.closest(".field");
          const title = field ? field.querySelector("label") : null;
          showSelectDialog(select, title ? title.textContent.trim() : "Select value");
        });

        select.addEventListener("change", syncFromNative);
        shell.addEventListener("click", (e) => e.stopPropagation());
      });
    }

    function mountHeroParticles(canvas) {
      if (typeof canvas === "string") canvas = document.getElementById(canvas);
      if (!canvas) return () => {};
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return () => {};

      const COUNT   = 36;
      const LINK    = 120;
      const SPEED   = 0.4;

      const nodes = Array.from({ length: COUNT }, () => ({
        x:  Math.random(),
        y:  Math.random(),
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
        r:  1.5 + Math.random() * 1.4
      }));

      let w = 1, h = 1, dpr = 1, accent = "#8f4dff", raf = 0;
      let ro = null;

      const readAccent = () => {
        const hero = canvas.closest(".ten-hero");
        const source = hero || document.documentElement;
        accent = getComputedStyle(source).getPropertyValue("--accent").trim() || "#8f4dff";
      };

      const resize = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = canvas.getBoundingClientRect();
        w = Math.max(rect.width,  1);
        h = Math.max(rect.height, 1);
        canvas.width  = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        readAccent();
      };

      const tick = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        for (const n of nodes) {
          n.x += n.vx / w;
          n.y += n.vy / h;
          if (n.x < 0 || n.x > 1) { n.vx *= -1; n.x = Math.max(0, Math.min(1, n.x)); }
          if (n.y < 0 || n.y > 1) { n.vy *= -1; n.y = Math.max(0, Math.min(1, n.y)); }
        }

        ctx.strokeStyle = accent;
        ctx.lineWidth   = 1.2;
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            const dx = (a.x - b.x) * w;
            const dy = (a.y - b.y) * h;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < LINK) {
              ctx.globalAlpha = (1 - d / LINK) * 0.55;
              ctx.beginPath();
              ctx.moveTo(a.x * w, a.y * h);
              ctx.lineTo(b.x * w, b.y * h);
              ctx.stroke();
            }
          }
        }

        ctx.fillStyle = accent;
        for (const n of nodes) {
          ctx.globalAlpha = 1.0;
          ctx.beginPath();
          ctx.arc(n.x * w, n.y * h, n.r * 1.3, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.arc(n.x * w, n.y * h, n.r * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(tick);
      };

      resize();
      if (typeof ResizeObserver === "function") {
        ro = new ResizeObserver(() => resize());
        ro.observe(canvas.parentElement || canvas);
      } else {
        window.addEventListener("resize", resize);
      }
      raf = requestAnimationFrame(tick);

      const cleanup = () => {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        window.removeEventListener("resize", resize);
      };
      cleanup.updateAccent = () => {
        readAccent();
        tick();
      };
      return cleanup;
    }

    function mountHeroParticlesIn(container) {
      if (!container) return;
      container.querySelectorAll(".hero-particles").forEach((canvas) => {
        if (canvas.dataset.heroMounted === "1") return;
        canvas.dataset.heroMounted = "1";
        mountHeroParticles(canvas);
      });
    }

    function formatBytes(v) {
      const n = Number(v || 0);
      if (n < 1024) return n + " B";
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
      if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + " MB";
      return (n / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }

    function setStatus(text) {
      document.getElementById("statusText").textContent = text;
    }

    function addLog(line) {
      if (!line) return;
      state.logs.push(String(line));
      if (state.logs.length > 1600) state.logs.splice(0, state.logs.length - 1600);
      const live = document.getElementById("liveLog");
      live.textContent = state.logs.join("\n");
      live.scrollTop = live.scrollHeight;
    }

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function formatDateTime(value) {
      if (!value) return "-";
      if (typeof value === "string" && Number.isNaN(Number(value))) {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
      }
      const num = Number(value || 0);
      if (!num) return "-";
      const ms = num > 9999999999 ? num : num * 1000;
      return new Date(ms).toLocaleString();
    }

    function dirname(path) {
      const raw = String(path || "").trim();
      if (!raw) return "";
      const idx = Math.max(raw.lastIndexOf("\\"), raw.lastIndexOf("/"));
      return idx >= 0 ? raw.slice(0, idx) : raw;
    }

    function basename(path) {
      const raw = String(path || "").trim();
      if (!raw) return "-";
      const idx = Math.max(raw.lastIndexOf("\\"), raw.lastIndexOf("/"));
      return idx >= 0 ? raw.slice(idx + 1) : raw;
    }

    function processRoleLabel(cmdline) {
      const raw = String(cmdline || "").toLowerCase();
      const match = raw.match(/--type=([a-z0-9_-]+)/);
      if (match && match[1]) return match[1];
      if (raw.includes("powershell")) return "powershell";
      if (raw.includes("cmd.exe")) return "cmd";
      return "process";
    }

    function compactText(value, max = 180) {
      const raw = String(value || "").replace(/\s+/g, " ").trim();
      if (!raw) return "";
      if (raw.length <= max) return raw;
      return raw.slice(0, max - 1) + "...";
    }

    function currentOperator() {
      const operatorInput = document.getElementById("operatorInput");
      const typed = operatorInput ? operatorInput.value.trim() : "";
      const user = typed || (state.settings && state.settings.operator) || "unknown";
      return String(user || "unknown");
    }

    function severityClass(value) {
      const raw = String(value || "").toLowerCase();
      if (raw === "pass" || raw === "done" || raw === "deleted") return "pass";
      if (raw === "warn" || raw === "stopped" || raw === "matched") return "warn";
      if (raw === "fail" || raw === "error") return "fail";
      return "";
    }

    function processSuspicionClass(score) {
      const value = Number(score || 0);
      if (value >= 70) return "suspicion-high";
      if (value >= 35) return "suspicion-mid";
      return "suspicion-low";
    }

    function renderStatusChip(label, extraClass = "") {
      return "<span class=\"status-chip " + escapeHtml(extraClass) + "\">" + escapeHtml(label || "-") + "</span>";
    }

    function summarizeAuditDetails(details) {
      if (!details || typeof details !== "object") return "";
      const parts = [];
      if (details.strategy) parts.push("strategy=" + details.strategy);
      if (details.deleted_now === true) parts.push("deleted_now=yes");
      if (details.scheduled_on_reboot === true) parts.push("reboot=yes");
      if (details.reason) parts.push("reason=" + details.reason);
      if (details.id) parts.push("id=" + details.id);
      return parts.join(" | ");
    }

    function renderMetricChip(label, value, extraClass = "") {
      return "<div class=\"metric-chip " + escapeHtml(extraClass) + "\"><span class=\"k\">" + escapeHtml(label) + "</span><span class=\"v\">" + escapeHtml(value) + "</span></div>";
    }

    function renderReportPreviewEmpty() {
      const reportPreview = document.getElementById("reportPreview");
      if (!reportPreview) return;
      reportPreview.innerHTML = "<div class=\"report-empty\">" + escapeHtml(langText(
        "Pick a report on the left to view a visual summary with metrics, findings, and recent log lines.",
        "Выберите отчёт слева, и здесь появится сводный просмотр с метриками, находками и хвостом логов."
      )) + "</div>";
    }

    function renderMiniSnapshot(report) {
      const box = document.getElementById("detailsBox");
      if (!box) return;
      if (!report) {
        box.classList.remove("rich-preview");
        box.textContent = "";
        return;
      }

      const cleanup = report.cleanup || {};
      box.classList.add("rich-preview");
      box.innerHTML =
        "<div class=\"report-section\">" +
          "<div class=\"report-section-title\">Session Snapshot</div>" +
          "<div class=\"report-chip-row\">" +
            renderStatusChip(report.final_status || "-", severityClass(report.final_status)) +
            "<span class=\"report-meta-chip\">" + escapeHtml(report.generated_at || "-") + "</span>" +
            "<span class=\"report-meta-chip\">" + escapeHtml(report.dry_run ? "Preview" : "Delete") + "</span>" +
          "</div>" +
          "<div class=\"report-grid\">" +
            "<div class=\"report-stat\"><div class=\"k\">Scanned</div><div class=\"v\">" + escapeHtml(cleanup.scanned || 0) + "</div></div>" +
            "<div class=\"report-stat\"><div class=\"k\">Matched</div><div class=\"v\">" + escapeHtml(cleanup.matched || 0) + "</div></div>" +
            "<div class=\"report-stat\"><div class=\"k\">Freed</div><div class=\"v\">" + escapeHtml(formatBytes(cleanup.freed_bytes || cleanup.potential_freed_bytes || 0)) + "</div></div>" +
            "<div class=\"report-stat\"><div class=\"k\">Errors</div><div class=\"v\">" + escapeHtml(cleanup.errors || 0) + "</div></div>" +
          "</div>" +
        "</div>";
    }

    function renderReportPreview(report) {
      const reportPreview = document.getElementById("reportPreview");
      if (!reportPreview) return;
      if (!report) {
        renderReportPreviewEmpty();
        return;
      }

      const cleanup = report.cleanup || {};
      const findings = Array.isArray(report.findings) ? report.findings : [];
      const items = Array.isArray(report.items) ? report.items.slice(0, 8) : [];
      const logsTail = Array.isArray(report.logs_tail) ? report.logs_tail.slice(-8) : [];
      const optionChips = [];
      const options = report.options || {};
      if (options.scan_subfolders) optionChips.push("Recursive");
      if (options.delete_empty_dirs) optionChips.push("Empty dirs");
      if (options.skip_hidden) optionChips.push("Skip hidden");
      if (options.use_age_filter) optionChips.push("Age " + (options.days_limit || 0) + "d");
      if (Number(options.min_size_bytes || 0) > 0) optionChips.push("Min " + formatBytes(options.min_size_bytes));
      if (Array.isArray(options.extensions) && options.extensions.length) optionChips.push(options.extensions.join(", "));

      reportPreview.innerHTML =
        "<section class=\"report-hero\">" +
          "<div class=\"report-hero-top\">" +
            "<div>" +
              "<div class=\"report-kicker\">Cleanup Report</div>" +
              "<div class=\"report-title\">" + escapeHtml(report.dry_run ? "Preview Analysis" : "Execution Summary") + "</div>" +
              "<div class=\"report-subtitle\">" + escapeHtml(report.target_path || "-") + "</div>" +
            "</div>" +
            "<div class=\"report-score\">" +
              "<div class=\"k\">Score</div>" +
              "<div class=\"v\">" + escapeHtml(report.score == null ? "-" : report.score) + "</div>" +
            "</div>" +
          "</div>" +
          "<div class=\"report-chip-row\">" +
            renderStatusChip(report.final_status || "-", severityClass(report.final_status)) +
            "<span class=\"report-meta-chip\">" + escapeHtml(report.generated_at || "-") + "</span>" +
            "<span class=\"report-meta-chip\">" + escapeHtml(report.mode || "STANDARD") + "</span>" +
            "<span class=\"report-meta-chip\">" + escapeHtml(report.dry_run ? "Dry-run" : "Delete mode") + "</span>" +
          "</div>" +
        "</section>" +

        "<section class=\"report-section\">" +
          "<div class=\"report-section-title\">Cleanup Metrics</div>" +
          "<div class=\"report-grid\">" +
            "<div class=\"report-stat\"><div class=\"k\">Scanned</div><div class=\"v\">" + escapeHtml(cleanup.scanned || 0) + "</div></div>" +
            "<div class=\"report-stat\"><div class=\"k\">Matched</div><div class=\"v\">" + escapeHtml(cleanup.matched || 0) + "</div></div>" +
            "<div class=\"report-stat\"><div class=\"k\">Deleted</div><div class=\"v\">" + escapeHtml(cleanup.deleted || 0) + "</div></div>" +
            "<div class=\"report-stat\"><div class=\"k\">Freed</div><div class=\"v\">" + escapeHtml(formatBytes(cleanup.freed_bytes || cleanup.potential_freed_bytes || 0)) + "</div></div>" +
          "</div>" +
        "</section>" +

        (optionChips.length ? "<section class=\"report-section\"><div class=\"report-section-title\">Applied Filters</div><div class=\"report-options\">" + optionChips.map((chip) => "<span class=\"report-meta-chip\">" + escapeHtml(chip) + "</span>").join("") + "</div></section>" : "") +

        "<section class=\"report-section\">" +
          "<div class=\"report-section-title\">Findings</div>" +
          "<div class=\"report-findings\">" +
            (findings.length ? findings.map((finding) => {
              const sevClass = severityClass(finding.severity);
              return "<article class=\"finding-card " + escapeHtml(sevClass) + "\">" +
                "<div class=\"finding-top\">" +
                  renderStatusChip(finding.severity || "-", sevClass) +
                  "<div class=\"finding-title\">" + escapeHtml(finding.code || "finding") + "</div>" +
                "</div>" +
                "<div class=\"finding-body\">" + escapeHtml(finding.message || "-") + "</div>" +
                "<div class=\"finding-meta\">" +
                  "<span class=\"report-meta-chip\">" + escapeHtml(finding.category || "general") + "</span>" +
                  "<span class=\"report-meta-chip\">Points: " + escapeHtml(finding.points == null ? 0 : finding.points) + "</span>" +
                "</div>" +
              "</article>";
            }).join("") : "<div class=\"report-empty\">No findings in this report.</div>") +
          "</div>" +
        "</section>" +

        (items.length ? "<section class=\"report-section\"><div class=\"report-section-title\">Matched Items</div><div class=\"report-listing\">" + items.map((item) => {
          const itemClass = severityClass(item.status || item.action);
          return "<div class=\"report-list-item\">" +
            "<div class=\"top\">" +
              renderStatusChip(item.status || item.action || "-", itemClass) +
              "<span class=\"report-meta-chip\">" + escapeHtml(item.kind || "file") + "</span>" +
              "<span class=\"report-meta-chip\">" + escapeHtml(formatBytes(item.size_bytes || 0)) + "</span>" +
            "</div>" +
            "<div class=\"path\">" + escapeHtml(item.path || "-") + "</div>" +
          "</div>";
        }).join("") + "</div></section>" : "") +

        (logsTail.length ? "<section class=\"report-section\"><div class=\"report-section-title\">Recent Log Lines</div><div class=\"report-logs\">" + logsTail.map((line) => "<div class=\"report-log-line\">" + escapeHtml(line) + "</div>").join("") + "</div></section>" : "");
    }

    function renderMatchesTable() {
      const tbody = document.querySelector("#matchesTable tbody");
      if (!tbody) return;
      tbody.innerHTML = "";

      for (const row of state.matchedItems || []) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><span class=\"badge\">" + escapeHtml(row.status || row.action || "-") + "</span></td>" +
          "<td>" + escapeHtml(row.kind || "-") + "</td>" +
          "<td>" + escapeHtml(formatBytes(row.size_bytes || 0)) + "</td>" +
          "<td>" + escapeHtml(formatDateTime(row.modified_unix || 0)) + "</td>" +
          "<td class=\"mono\">" + escapeHtml(row.path || "-") + "</td>";
        tbody.appendChild(tr);
      }
    }

    function showModal({ title, body, actions = [] }) {
      const existing = document.getElementById("appModal");
      if (existing) existing.remove();

      const wrap = document.createElement("div");
      wrap.id = "appModal";
      wrap.className = "modal-backdrop";
      const dialog = document.createElement("div");
      dialog.className = "modal-dialog";

      const head = document.createElement("div");
      head.className = "modal-head";
      head.innerHTML = "<div class=\"modal-title\">" + escapeHtml(title || "Dialog") + "</div>";

      const bodyWrap = document.createElement("div");
      bodyWrap.className = "modal-body";
      if (typeof body === "string") bodyWrap.innerHTML = body;
      else if (body instanceof Node) bodyWrap.appendChild(body);

      const foot = document.createElement("div");
      foot.className = "modal-foot";

      const close = () => {
        document.removeEventListener("keydown", onKey);
        wrap.remove();
      };

      const onKey = (event) => {
        if (event.key === "Escape") close();
      };

      actions.forEach((action) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn" + (action.className ? " " + action.className : "");
        btn.textContent = action.label;
        btn.addEventListener("click", async () => {
          try {
            if (action.onClick) {
              const shouldClose = await action.onClick({ close, dialog, body: bodyWrap });
              if (shouldClose !== false) close();
              return;
            }
            close();
          } catch (err) {
            addLog("[error] " + err.message);
          }
        });
        foot.appendChild(btn);
      });

      if (!actions.length) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn";
        btn.textContent = "Close";
        btn.addEventListener("click", close);
        foot.appendChild(btn);
      }

      wrap.addEventListener("click", (event) => {
        if (event.target === wrap) close();
      });
      document.addEventListener("keydown", onKey);

      dialog.appendChild(head);
      dialog.appendChild(bodyWrap);
      dialog.appendChild(foot);
      wrap.appendChild(dialog);
      document.body.appendChild(wrap);
      return close;
    }

    function renderProcessTable() {
      const tbody = document.querySelector("#processesTable tbody");
      if (!tbody) return;
      tbody.innerHTML = "";
      const query = String(state.processSearch || "").trim().toLowerCase();
      const filter = state.processFilter || "active";
      const visible = (state.processes || []).filter((row) => {
        const haystack = [
          row.name || "",
          row.exe || "",
          row.cmdline || "",
          row.threat_family || "",
          ...(row.threat_reasons || [])
        ].join(" ").toLowerCase();
        if (query && !haystack.includes(query)) return false;

        if (filter === "all") return true;
        if (filter === "active") return row.threat_risk === "critical" || row.threat_risk === "high" || row.threat_risk === "watch";
        if (filter === "critical") return row.threat_risk === "critical";
        if (filter === "high") return row.threat_risk === "high";
        if (filter === "watch") return row.threat_risk === "watch";
        if (filter === "miner" || filter === "rat" || filter === "trojan" || filter === "suspicious") {
          return row.threat_family === filter;
        }
        return true;
      }).slice(0, Number(state.processLimit || 30));

      renderProcessSummary(visible);

      if (!visible.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td colspan=\"3\"><div class=\"report-empty\">" + escapeHtml(langText(
          "No processes match the current filters.",
          "Под текущие фильтры процессы не попали."
        )) + "</div></td>";
        tbody.appendChild(tr);
        return;
      }

      for (const row of visible) {
        const index = state.processes.indexOf(row);
        const scheduleSupported = !!(state.capabilities && state.capabilities.schedule_delete_on_reboot);
        const aggressiveSupported = !!(state.capabilities && state.capabilities.aggressive_delete);
        const scheduleButton = scheduleSupported
          ? "<button class=\"btn mini\" data-action=\"schedule\" data-index=\"" + index + "\">Schedule Delete</button>"
          : "<button class=\"btn mini\" disabled title=\"Available on Windows only\">Schedule Delete</button>";
        const aggressiveButton = aggressiveSupported
          ? "<button class=\"btn mini warn\" data-action=\"aggressive\" data-index=\"" + index + "\">Aggressive Delete</button>"
          : "<button class=\"btn mini\" disabled title=\"Available on Windows only\">Aggressive Delete</button>";
        const tr = document.createElement("tr");
        tr.className = "process-row";
        const threatClass = severityClass(row.threat_risk);
        const role = processRoleLabel(row.cmdline);
        const reasons = Array.isArray(row.threat_reasons) && row.threat_reasons.length
          ? row.threat_reasons.slice(0, 3).map((reason) => "<span class=\"report-meta-chip\">" + escapeHtml(reason) + "</span>").join("")
          : "<span class=\"report-meta-chip\">No strong malware indicators</span>";
        tr.innerHTML =
          "<td>" +
            "<div class=\"process-main\">" +
              "<div class=\"process-topline\">" +
                "<div class=\"process-name\">" + escapeHtml(row.name || basename(row.exe)) + "</div>" +
                "<span class=\"process-pid\">PID " + escapeHtml(row.pid) + "</span>" +
                "<span class=\"report-meta-chip\">" + escapeHtml(role) + "</span>" +
                renderStatusChip(row.threat_family || "clean", threatClass) +
              "</div>" +
              "<div class=\"process-path\" title=\"" + escapeHtml(row.exe || "-") + "\">" + escapeHtml(row.exe || "-") + "</div>" +
              "<div class=\"process-subline\" title=\"" + escapeHtml(row.cmdline || "Command line unavailable") + "\">" + escapeHtml(compactText(row.cmdline || "Command line unavailable", 220)) + "</div>" +
              "<div class=\"process-why\">" + reasons + "</div>" +
            "</div>" +
          "</td>" +
          "<td>" +
            "<div class=\"process-metrics\">" +
              renderMetricChip("Started", formatDateTime(row.start_ts_unix)) +
              renderMetricChip("CPU", Number(row.cpu_pct || 0).toFixed(1) + "%") +
              renderMetricChip("Memory", formatBytes(row.mem_bytes || 0)) +
              renderMetricChip("Suspicion", String(row.suspicion_score || 0), processSuspicionClass(row.suspicion_score)) +
              renderMetricChip("Confidence", String(row.threat_confidence || 0) + "%", threatClass) +
            "</div>" +
          "</td>" +
          "<td>" +
            "<div class=\"process-actions\">" +
              "<div class=\"action-row\">" +
                "<button class=\"btn mini\" data-action=\"info\" data-index=\"" + index + "\">Info</button>" +
                "<button class=\"btn mini\" data-action=\"open\" data-index=\"" + index + "\">Open Folder</button>" +
                "<button class=\"btn mini\" data-action=\"close\" data-index=\"" + index + "\">Request Close</button>" +
                "<button class=\"btn mini\" data-action=\"quarantine\" data-index=\"" + index + "\">Quarantine</button>" +
                scheduleButton +
                aggressiveButton +
                "<button class=\"btn mini\" data-action=\"force\" data-index=\"" + index + "\">Helper Info</button>" +
              "</div>" +
            "</div>" +
          "</td>";
        tbody.appendChild(tr);
      }
    }

    function renderProcessSummary(visibleRows) {
      const box = document.getElementById("processSummary");
      if (!box) return;

      const all = Array.isArray(state.processes) ? state.processes : [];
      const visible = Array.isArray(visibleRows) ? visibleRows : [];
      const countRisk = (risk) => all.filter((row) => row.threat_risk === risk).length;
      const suspiciousFamilies = visible.filter((row) => row.threat_family && row.threat_family !== "clean").length;

      box.innerHTML =
        "<div class=\"process-summary-card\">" +
          "<div class=\"k\">" + escapeHtml(langText("View", "Срез")) + "</div>" +
          "<div class=\"v\">" + escapeHtml(String(visible.length)) + "</div>" +
          "<div class=\"sub\">" + escapeHtml(langText(
            "visible now, from " + all.length + " loaded processes",
            "видно сейчас, из " + all.length + " загруженных процессов"
          )) + "</div>" +
        "</div>" +
        "<div class=\"process-summary-card fail\">" +
          "<div class=\"k\">Critical</div>" +
          "<div class=\"v\">" + escapeHtml(String(countRisk("critical"))) + "</div>" +
          "<div class=\"sub\">" + escapeHtml(langText("highest risk", "максимальный риск")) + "</div>" +
        "</div>" +
        "<div class=\"process-summary-card warn\">" +
          "<div class=\"k\">High</div>" +
          "<div class=\"v\">" + escapeHtml(String(countRisk("high"))) + "</div>" +
          "<div class=\"sub\">" + escapeHtml(langText("need review", "нужна проверка")) + "</div>" +
        "</div>" +
        "<div class=\"process-summary-card warn\">" +
          "<div class=\"k\">Watch</div>" +
          "<div class=\"v\">" + escapeHtml(String(countRisk("watch"))) + "</div>" +
          "<div class=\"sub\">" + escapeHtml(langText("watch list", "список наблюдения")) + "</div>" +
        "</div>" +
        "<div class=\"process-summary-card pass\">" +
          "<div class=\"k\">" + escapeHtml(langText("Clean", "Чистые")) + "</div>" +
          "<div class=\"v\">" + escapeHtml(String(countRisk("clean"))) + "</div>" +
          "<div class=\"sub\">" + escapeHtml(langText("low concern", "низкий риск")) + "</div>" +
        "</div>" +
        "<div class=\"process-summary-card\">" +
          "<div class=\"k\">" + escapeHtml(langText("Visible Alerts", "Видимые алерты")) + "</div>" +
          "<div class=\"v\">" + escapeHtml(String(suspiciousFamilies)) + "</div>" +
          "<div class=\"sub\">" + escapeHtml(langText("flagged families in view", "метки угроз в текущем списке")) + "</div>" +
        "</div>";
    }

    async function loadPlatformCapabilities() {
      try {
        const caps = await post("get_platform_capabilities", {});
        if (caps && typeof caps === "object") {
          state.capabilities = {
            is_windows: !!caps.is_windows,
            schedule_delete_on_reboot: !!caps.schedule_delete_on_reboot,
            aggressive_delete: !!caps.aggressive_delete,
            force_actions_require_helper: caps.force_actions_require_helper !== false
          };
          return;
        }
      } catch (err) {
        addLog("[warn] capabilities unavailable: " + err.message);
      }
      state.capabilities = {
        is_windows: navigator.platform.toLowerCase().includes("win"),
        schedule_delete_on_reboot: navigator.platform.toLowerCase().includes("win"),
        aggressive_delete: navigator.platform.toLowerCase().includes("win"),
        force_actions_require_helper: true
      };
    }

    function renderQuarantineTable() {
      const tbody = document.querySelector("#quarantineTable tbody");
      if (!tbody) return;
      tbody.innerHTML = "";

      if (!state.quarantine.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td colspan=\"4\"><div class=\"report-empty\">" + escapeHtml(langText(
          "Quarantine is empty.",
          "Карантин пуст."
        )) + "</div></td>";
        tbody.appendChild(tr);
        return;
      }

      for (const row of state.quarantine) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + escapeHtml(formatDateTime(row.timestamp_iso)) + "</td>" +
          "<td class=\"mono\">" + escapeHtml(row.original_path || "-") + "</td>" +
          "<td>" + escapeHtml(row.reason || "-") + "</td>" +
          "<td><div class=\"action-row\"><button class=\"btn mini\" data-restore=\"" + escapeHtml(row.id) + "\">Restore</button></div></td>";
        tbody.appendChild(tr);
      }
    }

    function renderAuditLog() {
      const box = document.getElementById("auditLogBox");
      if (!box) return;
      const rows = Array.isArray(state.audit) ? state.audit : [];
      box.classList.add("audit-feed");
      if (!rows.length) {
        box.innerHTML = "<div class=\"report-empty\">" + escapeHtml(langText(
          "Audit log is empty.",
          "Журнал аудита пуст."
        )) + "</div>";
        return;
      }

      box.innerHTML = rows.map((row) => {
        const details = summarizeAuditDetails(row.details);
        const sev = severityClass(row.result);
        const action = String(row.action || "unknown").replace(/_/g, " ");
        return "<article class=\"audit-entry " + escapeHtml(sev) + "\">" +
          "<div class=\"audit-entry-top\">" +
            "<div class=\"audit-entry-title\">" + escapeHtml(action) + "</div>" +
            renderStatusChip(row.result || "-", sev) +
            "<span class=\"report-meta-chip\">" + escapeHtml(formatDateTime(row.ts_iso || 0)) + "</span>" +
          "</div>" +
          "<div class=\"audit-target\">" + escapeHtml(row.target || "-") + "</div>" +
          "<div class=\"audit-message\">" + escapeHtml(row.message || langText("No message", "Без сообщения")) + "</div>" +
          "<div class=\"audit-entry-meta\">" +
            (details ? "<span class=\"report-meta-chip\">" + escapeHtml(details) + "</span>" : "") +
            (row.operator ? "<span class=\"report-meta-chip\">" + escapeHtml(langText("operator", "оператор") + ": " + row.operator) + "</span>" : "") +
          "</div>" +
        "</article>";
      }).join("");
    }

    function showAggressiveDeleteResult(result) {
      const body = document.createElement("div");
      body.className = "stack";
      const steps = Array.isArray(result.steps) && result.steps.length
        ? result.steps.map((step) => "<div class=\"report-log-line\">" + escapeHtml(step) + "</div>").join("")
        : "<div class=\"report-log-line\">No detailed steps were returned.</div>";
      body.innerHTML =
        "<div class=\"modal-note\">Aggressive delete finished. If the file could not be removed immediately, the app scheduled deletion on reboot.</div>" +
        "<div class=\"kv-grid\">" +
          "<div class=\"kv-card\"><div class=\"k\">Strategy</div><div class=\"v\">" + escapeHtml(result.strategy || "-") + "</div></div>" +
          "<div class=\"kv-card\"><div class=\"k\">Deleted Now</div><div class=\"v\">" + escapeHtml(result.deleted_now ? "yes" : "no") + "</div></div>" +
          "<div class=\"kv-card\"><div class=\"k\">Scheduled On Reboot</div><div class=\"v\">" + escapeHtml(result.scheduled_on_reboot ? "yes" : "no") + "</div></div>" +
          "<div class=\"kv-card\"><div class=\"k\">Final Path</div><div class=\"v\">" + escapeHtml(result.final_path || result.path || "-") + "</div></div>" +
        "</div>" +
        "<div class=\"report-section\"><div class=\"report-section-title\">Delete Steps</div><div class=\"stack\">" + steps + "</div></div>";
      showModal({ title: "Aggressive Delete Result", body, actions: [{ label: "Close" }] });
    }

    function updateLiveMetrics(stats) {
      const c = stats || {};
      const scanned = Number(c.scanned || 0);
      const matched = Number(c.matched || 0);
      const deleted = Number(c.deleted || 0);
      const errors = Number(c.errors || 0);
      const freed = Number(c.freed_bytes || c.potential_freed_bytes || c.matched_bytes || 0);

      document.getElementById("kScanned").textContent = String(scanned);
      document.getElementById("kMatched").textContent = String(matched);
      document.getElementById("kDeleted").textContent = String(deleted);
      document.getElementById("kFreed").textContent = formatBytes(freed);
      document.getElementById("kErrors").textContent = String(errors);

      const safeScanned = Math.max(1, scanned);
      const matchPct = Math.min(100, Math.round((matched / safeScanned) * 100));
      const deletePct = Math.min(100, Math.round((deleted / safeScanned) * 100));
      const errorPct = Math.min(100, Math.round((errors / safeScanned) * 100));

      document.getElementById("mMatch").textContent = matchPct + "%";
      document.getElementById("mDelete").textContent = deletePct + "%";
      document.getElementById("mError").textContent = errorPct + "%";
      document.getElementById("mMatchBar").style.width = matchPct + "%";
      document.getElementById("mDeleteBar").style.width = deletePct + "%";
      document.getElementById("mErrorBar").style.width = errorPct + "%";
    }

    function resetLiveMetrics() {
      updateLiveMetrics({});
      state.report = null;
      state.matchedItems = [];
      renderMatchesTable();
      renderMiniSnapshot(null);
      renderReportPreviewEmpty();
    }

    async function refreshProcesses() {
      const rows = await post("list_processes", {});
      state.processes = Array.isArray(rows) ? rows : [];
      renderProcessTable();
    }

    async function refreshQuarantine() {
      const rows = await post("list_quarantine", {});
      state.quarantine = Array.isArray(rows) ? rows : [];
      renderQuarantineTable();
    }

    async function refreshAudit() {
      const rows = await post("list_audit_log", { limit: 120 });
      state.audit = Array.isArray(rows) ? rows : [];
      renderAuditLog();
    }

    async function refreshSecurityViews() {
      await Promise.all([refreshProcesses(), refreshQuarantine(), refreshAudit()]);
    }

    async function showProcessInfo(proc) {
      const detail = await post("get_process_info", { pid: proc.pid });
      const body = document.createElement("div");
      body.className = "stack";
      const reasons = Array.isArray(detail.threat_reasons) && detail.threat_reasons.length
        ? detail.threat_reasons.map((reason) => "<span class=\"report-meta-chip\">" + escapeHtml(reason) + "</span>").join("")
        : "<span class=\"report-meta-chip\">No strong malware indicators</span>";
      body.innerHTML = "<div class=\"modal-note\">Read-only process inspection. Malware family labels here are heuristic triage signals, not a guaranteed antivirus verdict.</div>" +
        "<div class=\"kv-grid\">" +
        "<div class=\"kv-card\"><div class=\"k\">PID</div><div class=\"v\">" + escapeHtml(detail.pid) + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Name</div><div class=\"v\">" + escapeHtml(detail.name || "-") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Executable</div><div class=\"v\">" + escapeHtml(detail.exe || "-") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">SHA256</div><div class=\"v\">" + escapeHtml(detail.sha256 || "unavailable") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Command Line</div><div class=\"v\">" + escapeHtml(detail.cmdline || "-") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Parent PID</div><div class=\"v\">" + escapeHtml(detail.parent_pid == null ? "-" : detail.parent_pid) + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Threat Family</div><div class=\"v\">" + escapeHtml(detail.threat_family || "clean") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Risk / Confidence</div><div class=\"v\">" + escapeHtml((detail.threat_risk || "clean") + " / " + (detail.threat_confidence || 0) + "%") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Signature</div><div class=\"v\">" + escapeHtml(detail.digital_signature === true ? "Valid" : detail.digital_signature === false ? "Not valid / unsigned" : "Unavailable") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Suspicion Score</div><div class=\"v\">" + escapeHtml(detail.suspicion_score == null ? 0 : detail.suspicion_score) + "</div></div>" +
        "</div>" +
        "<div class=\"report-section\"><div class=\"report-section-title\">Why It Was Flagged</div><div class=\"report-chip-row\">" + reasons + "</div></div>";
      showModal({
        title: "Process Info",
        body,
        actions: [
          {
            label: "Open Containing Folder",
            className: "primary",
            onClick: async () => {
              if (!detail.exe) throw new Error("Executable path is unavailable");
              await post("open_path", { path: dirname(detail.exe) });
            }
          },
          { label: "Close" }
        ]
      });
    }

    async function showForceInfo(proc) {
      let backendInfo = null;
      try {
        backendInfo = await post("request_force_action", {
          action: "force_kill",
          target: "pid:" + proc.pid
        });
      } catch (err) {
        addLog("[warn] unable to query helper hint: " + err.message);
      }
      const body = document.createElement("div");
      body.className = "stack";
      body.innerHTML = "<div class=\"modal-note\">Force operations are intentionally not executed in the main app. They require a dedicated elevation-only helper with explicit UAC confirmation and a separate signed binary.</div>" +
        "<div class=\"kv-card\"><div class=\"k\">Target</div><div class=\"v\">" + escapeHtml(proc.name + " (PID " + proc.pid + ")") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Helper Command (stub)</div><div class=\"v\">" + escapeHtml(backendInfo && backendInfo.helper_cmd ? backendInfo.helper_cmd : "ByPassCleaner.Helper.exe --action=<force_action> --target=<target>") + "</div></div>";
      showModal({ title: "Elevation Required", body, actions: [{ label: "Close" }] });
    }

    function buildConfirmBody({ note, requireText = "DELETE", showOperator = true, showReason = true }) {
      const wrap = document.createElement("div");
      wrap.className = "stack";
      wrap.innerHTML =
        "<div class=\"modal-note\">" + escapeHtml(note) + "</div>" +
        (showOperator ? "<div class=\"field\"><label for=\"modalOperator\">Operator</label><input id=\"modalOperator\" type=\"text\" value=\"" + escapeHtml(currentOperator()) + "\" /></div>" : "") +
        (showReason ? "<div class=\"field\"><label for=\"modalReason\">Reason</label><input id=\"modalReason\" type=\"text\" value=\"user_action\" /></div>" : "") +
        "<label class=\"check-card\"><input id=\"modalAcknowledge\" type=\"checkbox\" />I understand</label>" +
        "<div class=\"field\"><label for=\"modalTextConfirm\">Type " + escapeHtml(requireText) + " to continue</label><input id=\"modalTextConfirm\" type=\"text\" value=\"\" /></div>";
      return wrap;
    }

    function assertConfirmed(body, requireText) {
      const ack = body.querySelector("#modalAcknowledge");
      const txt = body.querySelector("#modalTextConfirm");
      if (!ack || !ack.checked) throw new Error("Confirmation checkbox is required");
      if (!txt || txt.value.trim() !== requireText) throw new Error("Confirmation text does not match");
      return {
        operator: body.querySelector("#modalOperator") ? body.querySelector("#modalOperator").value.trim() || "unknown" : "unknown",
        reason: body.querySelector("#modalReason") ? body.querySelector("#modalReason").value.trim() || "user_action" : "user_action"
      };
    }

    function showQuarantineDialog(proc) {
      if (!proc.exe) {
        addLog("[warn] executable path is unavailable for this process");
        return;
      }
      const body = buildConfirmBody({
        note: "The file will be moved into quarantine and can later be restored. This action is recorded in the audit log.",
        requireText: "QUARANTINE"
      });
      showModal({
        title: "Quarantine File",
        body,
        actions: [
          { label: "Cancel" },
          {
            label: "Quarantine",
            className: "primary",
            onClick: async ({ body }) => {
              const form = assertConfirmed(body, "QUARANTINE");
              const entry = await post("quarantine_path", {
                path: proc.exe,
                reason: form.reason,
                operator: form.operator
              });
              addLog("[host] quarantined: " + entry.quarantine_path);
              await refreshSecurityViews();
            }
          }
        ]
      });
    }

    function showScheduleDeleteDialog(proc) {
      if (!(state.capabilities && state.capabilities.schedule_delete_on_reboot)) {
        addLog("[warn] schedule delete on reboot is available on Windows only");
        return;
      }
      if (!proc.exe) {
        addLog("[warn] executable path is unavailable for this process");
        return;
      }
      const body = buildConfirmBody({
        note: "Immediate force deletion is not performed. This only schedules deletion on reboot and records the request in the audit log.",
        requireText: "REBOOT"
      });
      showModal({
        title: "Schedule Delete On Reboot",
        body,
        actions: [
          { label: "Cancel" },
          {
            label: "Schedule",
            className: "primary",
            onClick: async ({ body }) => {
              assertConfirmed(body, "REBOOT");
              await post("schedule_delete_on_reboot", { path: proc.exe });
              addLog("[host] scheduled for reboot delete: " + proc.exe);
              await refreshAudit();
            }
          }
        ]
      });
    }

    function showAggressiveDeleteDialog(proc) {
      if (!(state.capabilities && state.capabilities.aggressive_delete)) {
        addLog("[warn] aggressive delete is available on Windows only");
        return;
      }
      if (!proc.exe) {
        addLog("[warn] executable path is unavailable for this process");
        return;
      }
      const body = buildConfirmBody({
        note: "Aggressive delete tries standard deletion, resets file attributes, attempts a staged rename, and if the file is still locked it schedules deletion on reboot. This is stronger than the normal path, but it is not a magical kernel-level bypass.",
        requireText: "AGGRESSIVE"
      });
      showModal({
        title: "Aggressive Delete",
        body,
        actions: [
          { label: "Cancel" },
          {
            label: "Delete",
            className: "warn",
            onClick: async ({ body }) => {
              assertConfirmed(body, "AGGRESSIVE");
              const result = await post("aggressive_delete_path", { path: proc.exe });
              addLog("[host] aggressive delete | strategy=" + (result.strategy || "unknown") + " | final=" + (result.final_path || proc.exe));
              showAggressiveDeleteResult(result);
              await refreshAudit();
              await refreshProcesses();
            }
          }
        ]
      });
    }

    function showRequestCloseDialog(proc) {
      const body = document.createElement("div");
      body.className = "stack";
      body.innerHTML =
        "<div class=\"modal-note\">This only records and requests a polite close. No force termination is performed from the main application.</div>" +
        "<div class=\"field\"><label for=\"closeReason\">Reason</label><input id=\"closeReason\" type=\"text\" value=\"user_requested\" /></div>" +
        "<div class=\"field\"><label for=\"closeTimeout\">Timeout ms</label><input id=\"closeTimeout\" type=\"number\" min=\"1000\" value=\"5000\" /></div>";
      showModal({
        title: "Request Close",
        body,
        actions: [
          { label: "Cancel" },
          {
            label: "Request",
            className: "primary",
            onClick: async ({ body }) => {
              const reason = body.querySelector("#closeReason").value.trim() || "user_requested";
              const timeout = Number(body.querySelector("#closeTimeout").value || 5000);
              const result = await post("request_terminate", { pid: proc.pid, reason, timeout_ms: timeout });
              addLog("[host] polite close recorded for pid=" + proc.pid + " | " + (result.message || "ok"));
              await refreshAudit();
            }
          }
        ]
      });
    }

    async function restoreQuarantine(id) {
      await post("restore_quarantine", { id });
      addLog("[host] restored quarantine entry: " + id);
      await refreshSecurityViews();
    }

    async function handleProcessAction(action, index) {
      const proc = state.processes[index];
      if (!proc) return;
      if (action === "info") return showProcessInfo(proc);
      if (action === "open") {
        if (!proc.exe) throw new Error("Executable path is unavailable");
        return post("open_path", { path: dirname(proc.exe) });
      }
      if (action === "close") return showRequestCloseDialog(proc);
      if (action === "quarantine") return showQuarantineDialog(proc);
      if (action === "schedule") return showScheduleDeleteDialog(proc);
      if (action === "aggressive") return showAggressiveDeleteDialog(proc);
      if (action === "force") return showForceInfo(proc);
    }

    function postViaQt(cmd, payload = {}) {
      if (!state.ipc || typeof state.ipc.postMessage !== "function") {
        return Promise.reject(new Error("IPC bridge is unavailable"));
      }

      const reqId = id();
      const p = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          state.pending.delete(reqId);
          reject(new Error("IPC timeout"));
        }, 30000);
        state.pending.set(reqId, { resolve, reject, timeout });
      });

      state.ipc.postMessage(JSON.stringify({ id: reqId, cmd, payload }));
      return p;
    }

    async function postViaTauri(cmd, payload = {}) {
      if (!tauriCore || typeof tauriCore.invoke !== "function") {
        throw new Error("Tauri invoke API is unavailable");
      }
      const reqId = id();
      const raw = JSON.stringify({ id: reqId, cmd, payload });
      const responseRaw = await tauriCore.invoke("post_message", { raw });
      const envelope = typeof responseRaw === "string" ? JSON.parse(responseRaw) : responseRaw;
      if (!envelope || envelope.type !== "response") {
        throw new Error("Invalid response envelope from host");
      }
      if (!envelope.ok) {
        throw new Error(envelope.error || "Unknown host error");
      }
      return envelope.payload;
    }

    function post(cmd, payload = {}) {
      if (state.hostMode === "tauri") {
        return postViaTauri(cmd, payload);
      }
      return postViaQt(cmd, payload);
    }

    function onHostMessage(envelope) {
      if (!envelope || typeof envelope !== "object") return;

      if (envelope.type === "response") {
        const wait = state.pending.get(envelope.id);
        if (!wait) return;
        clearTimeout(wait.timeout);
        state.pending.delete(envelope.id);
        if (envelope.ok) wait.resolve(envelope.payload);
        else wait.reject(new Error(envelope.error || "Unknown host error"));
        return;
      }

      if (envelope.type === "event") {
        if (envelope.event === "analysis-log") {
          addLog(envelope.payload || "");
        }

        if (envelope.event === "analysis-progress") {
          const payload = envelope.payload || {};
          if (payload.stats) updateLiveMetrics(payload.stats);
          const progress = document.getElementById("runProgress");
          const scanned = Number(payload.stats && payload.stats.scanned || 0);
          const phase = payload.phase || "scanning";
          let width = Math.min(92, 14 + Math.log10(scanned + 1) * 24);
          if (phase === "finished" || phase === "stopped") width = 100;
          progress.style.width = width + "%";
        }

        if (envelope.event === "analysis-finished") {
          const finished = envelope.payload || {};
          setStatus(finished.stopped ? "stopped" : "done");
          document.getElementById("stRun").textContent = "analysis=idle";
          document.getElementById("runProgress").style.width = "100%";
          setTimeout(() => {
            document.getElementById("runProgress").style.width = "0%";
          }, 600);
          if (finished.stats) updateLiveMetrics(finished.stats);

          const path = finished.reportPath ? finished.reportPath : "";
          if (path) {
            document.getElementById("reportHint").textContent = path;
            loadReport(path).catch(err => addLog("[error] " + err.message));
          }
          listReports().catch(err => addLog("[error] " + err.message));
        }
      }
    }

    window.__BYPASS_HOST_DISPATCH = onHostMessage;

    function collectPayload() {
      const cleanupOptions = getCleanupOptions();
      const requestedDryRun = document.getElementById("dryRun").checked;
      const maxRetriesValue = state.maxRetries === "auto"
        ? getMaxRetries()
        : Number(state.maxRetries || getMaxRetries());

      return {
        target_path: document.getElementById("targetPath").value.trim(),
        out_dir: document.getElementById("outDirInput").value.trim() || "logs",
        operator: currentOperator(),
        days_limit: Number(document.getElementById("daysInput").value || 0),
        min_size_mb: Number(document.getElementById("minSizeInput").value || 0),
        extensions: document.getElementById("extInput").value.trim(),
        scan_subfolders: document.getElementById("scanSubfolders").checked,
        delete_empty_dirs: document.getElementById("deleteEmpty").checked,
        skip_hidden: document.getElementById("skipHidden").checked,
        use_age_filter: document.getElementById("useAgeFilter").checked,
        dry_run: cleanupOptions.dryRun ? requestedDryRun : false,
        mode: "STANDARD",
        theme: state.themeMode,
        accent: state.accent,
        language: document.getElementById("langSelect").value,
        power_profile: state.powerProfile,
        sandbox_profile: state.sandboxProfile,
        max_retries: maxRetriesValue,
        isolation_required: shouldIsolate(),
        max_runtime: cleanupOptions.maxRuntime,
        check_interval_ms: cleanupOptions.checkInterval,
        welcome_completed: true
      };
    }

    function applySettingsToUi(s) {
      document.getElementById("outDirInput").value = s.out_dir || "logs";
      document.getElementById("daysInput").value = String(s.days_limit ?? 14);
      document.getElementById("minSizeInput").value = String(s.min_size_mb ?? 0);
      document.getElementById("extInput").value = s.extensions || "";
      document.getElementById("scanSubfolders").checked = !!s.scan_subfolders;
      document.getElementById("deleteEmpty").checked = !!s.delete_empty_dirs;
      document.getElementById("skipHidden").checked = !!s.skip_hidden;
      document.getElementById("useAgeFilter").checked = !!s.use_age_filter;
      document.getElementById("dryRun").checked = !!s.dry_run;

      const mode = normalizeThemeMode(s.theme || "AUTO");
      const accent = normalizeAccent(s.accent || "AMETHYST");
      document.getElementById("themeModeSelect").value = mode;
      document.getElementById("accentSelect").value = accent;
      document.getElementById("langSelect").value = s.language || "auto";
      document.getElementById("powerProfileSelect").value = s.power_profile || "BASIC";
      document.getElementById("sandboxProfileSelect").value = s.sandbox_profile || "limited";
      document.getElementById("maxRetriesSelect").value = String(s.max_retries || "auto");
      document.getElementById("operatorInput").value = s.operator || currentOperator();

      applyThemeMode(mode);
      applyAccent(accent);
      applyPowerProfile(s.power_profile || "BASIC");
      applySandboxProfile(s.sandbox_profile || "limited");
      state.maxRetries = String(s.max_retries || "auto");
      state.lang = detectLanguage(s.language || "auto");
      state.settings = s;
      applyTexts();
      syncEnhancedSelects();
    }

    async function loadSettings() {
      const s = await post("load_settings", {});
      applySettingsToUi(s);
      const localSettings = JSON.parse(localStorage.getItem("bp_settings") || "{}");
      localStorage.setItem("bp_settings", JSON.stringify({
        ...localSettings,
        welcome_completed: !!s.welcome_completed
      }));
      addLog("[ui] settings loaded");
    }

    async function saveSettings() {
      const payload = collectPayload();
      const saved = await post("save_settings", payload);
      applySettingsToUi(saved);
      addLog("[ui] settings saved");
    }

    function persistSettings() {
      saveSettings().catch(err => addLog("[error] " + err.message));
    }

    function updateMetricsFromReport(report) {
      state.report = report;
      const c = report && report.cleanup ? report.cleanup : {};
      updateLiveMetrics(c);
      state.matchedItems = Array.isArray(report.items) ? report.items : [];
      renderMatchesTable();
      renderMiniSnapshot(report);
      renderReportPreview(report);
      document.getElementById("stVersion").textContent = "schema=" + (report.schema_version || "cleanup-v1");
    }

    async function loadReport(path) {
      const data = await post("open_report", { path });
      updateMetricsFromReport(data);
    }

    async function listReports() {
      const outDir = document.getElementById("outDirInput").value || "logs";
      const rows = await post("list_reports", { out_dir: outDir });
      const tbody = document.querySelector("#reportsTable tbody");
      tbody.innerHTML = "";

      for (const row of rows || []) {
        const tr = document.createElement("tr");
        tr.className = "report-row";
        tr.innerHTML =
          "<td>" +
            "<div class=\"report-entry\">" +
              "<div class=\"report-file\">" + escapeHtml(basename(row.path || "")) + "</div>" +
              "<div class=\"report-meta\">" +
                "<span class=\"report-meta-chip\">" + escapeHtml(formatDateTime(row.modified_unix || 0)) + "</span>" +
                "<span class=\"report-meta-chip\">" + escapeHtml(formatBytes(row.size_bytes || 0)) + "</span>" +
              "</div>" +
              "<div class=\"report-path\">" + escapeHtml(row.path || "-") + "</div>" +
            "</div>" +
          "</td>" +
          "<td><button class=\"btn\" data-open=\"" + escapeHtml(row.path || "") + "\">Open</button></td>";
        tbody.appendChild(tr);
      }

      tbody.querySelectorAll("button[data-open]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const path = btn.getAttribute("data-open");
          document.getElementById("reportHint").textContent = path;
          await loadReport(path);
        });
      });
    }

    async function runCleanup() {
      const payload = collectPayload();
      if (!payload.target_path) {
        addLog("[error] select target folder first");
        return;
      }

      state.logs = [];
      document.getElementById("liveLog").textContent = "";
      resetLiveMetrics();
      setStatus("running");
      document.getElementById("stRun").textContent = "analysis=running";
      document.getElementById("runProgress").style.width = "15%";
      addLog("[ui] cleanup started");
      await post("run_analysis", payload);
    }

    async function stopCleanup() {
      await post("stop_analysis", {});
      setStatus("stop requested");
      document.getElementById("stRun").textContent = "analysis=stop-requested";
      addLog("[ui] stop requested");
    }

    function switchView(view) {
      state.view = view;
      document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
      const target = document.getElementById("view-" + view);
      if (target) {
        target.classList.remove("hidden");
        mountHeroParticlesIn(target);
        target.classList.remove("view-enter");
        requestAnimationFrame(() => target.classList.add("view-enter"));
      }

      document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.view === view);
      });
      const active = document.querySelector(".nav-btn.active");
      if (active) {
        document.getElementById("sidebar").style.setProperty("--nav-y", active.offsetTop + "px");
      }
      applyTexts();
    }

    function bind() {
      document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
        btn.addEventListener("click", () => switchView(btn.dataset.view));
      });

      const processesTable = document.getElementById("processesTable");
      if (processesTable) {
        processesTable.addEventListener("click", (event) => {
          const btn = event.target.closest("button[data-action]");
          if (!btn) return;
          handleProcessAction(btn.getAttribute("data-action"), Number(btn.getAttribute("data-index")))
            .catch((e) => addLog("[error] " + e.message));
        });
      }

      const quarantineTable = document.getElementById("quarantineTable");
      if (quarantineTable) {
        quarantineTable.addEventListener("click", (event) => {
          const btn = event.target.closest("button[data-restore]");
          if (!btn) return;
          restoreQuarantine(btn.getAttribute("data-restore"))
            .catch((e) => addLog("[error] " + e.message));
        });
      }

      document.getElementById("btnPickTarget").addEventListener("click", async () => {
        try {
          const payload = await post("pick_target", {});
          if (payload && payload.path) {
            document.getElementById("targetPath").value = payload.path;
          }
        } catch (e) {
          addLog("[error] " + e.message);
        }
      });

      document.getElementById("btnRun").addEventListener("click", () => runCleanup().catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnStop").addEventListener("click", () => stopCleanup().catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnOpenReportsDir").addEventListener("click", () => post("open_path", { path: document.getElementById("outDirInput").value || "logs" }).catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnListReports").addEventListener("click", () => listReports().catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnRefreshProcesses").addEventListener("click", () => refreshProcesses().catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnRefreshQuarantine").addEventListener("click", () => refreshQuarantine().catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnRefreshAudit").addEventListener("click", () => refreshAudit().catch(e => addLog("[error] " + e.message)));
      document.getElementById("processSearchInput").addEventListener("input", (e) => {
        state.processSearch = e.target.value || "";
        renderProcessTable();
      });
      document.getElementById("processFilterSelect").addEventListener("change", (e) => {
        state.processFilter = e.target.value || "active";
        renderProcessTable();
      });
      document.getElementById("processLimitSelect").addEventListener("change", (e) => {
        state.processLimit = Number(e.target.value || 30);
        renderProcessTable();
      });

      document.getElementById("themeModeSelect").addEventListener("change", (e) => {
        applyThemeMode(e.target.value);
        persistSettings();
      });
      document.getElementById("accentSelect").addEventListener("change", (e) => {
        applyAccent(e.target.value);
        persistSettings();
      });
      document.getElementById("langSelect").addEventListener("change", (e) => {
        state.lang = detectLanguage(e.target.value);
        applyTexts();
        syncEnhancedSelects();
        persistSettings();
      });
      document.getElementById("powerProfileSelect").addEventListener("change", (e) => {
        applyPowerProfile(e.target.value);
        persistSettings();
      });
      document.getElementById("sandboxProfileSelect").addEventListener("change", (e) => {
        applySandboxProfile(e.target.value);
        persistSettings();
      });
      document.getElementById("maxRetriesSelect").addEventListener("change", (e) => {
        state.maxRetries = String(e.target.value || "auto");
        persistSettings();
      });
      document.getElementById("operatorInput").addEventListener("change", () => {
        persistSettings();
      });
      document.getElementById("btnSaveSettings").addEventListener("click", () => saveSettings().catch(e => addLog("[error] " + e.message)));

      systemThemeMedia.addEventListener("change", () => {
        if (state.themeMode === "AUTO") applyThemeMode("AUTO");
      });

      const supportBtn = document.getElementById("btnSupport");
      supportBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          const tauriShellOpen =
            window.__TAURI__ &&
            window.__TAURI__.shell &&
            typeof window.__TAURI__.shell.open === "function";

          if (tauriShellOpen) {
            // Prefer native Tauri shell API when available.
            await window.__TAURI__.shell.open(supportBtn.href);
            return;
          }

          // Fallback to host command (works for both Tauri invoke and Qt bridge).
          await post("open_path", { path: supportBtn.href });
        } catch (err) {
          addLog("[error] Failed to open support link: " + err.message);
        }
      });
    }

    function initNumSpinners() {
      document.querySelectorAll(".num-shell").forEach((shell) => {
        const input = shell.querySelector("input[type='number']");
        const upBtn = shell.querySelector(".num-up");
        const dnBtn = shell.querySelector(".num-dn");
        if (!input || !upBtn || !dnBtn) return;
        const step = Number(input.step) || 1;
        const min = input.min !== "" ? Number(input.min) : -Infinity;
        const max = input.max !== "" ? Number(input.max) : Infinity;
        upBtn.addEventListener("click", () => {
          input.value = Math.min(Number(input.value || 0) + step, max);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        dnBtn.addEventListener("click", () => {
          input.value = Math.max(Number(input.value || 0) - step, min);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
    }

    function bootstrap() {
      try {
        enhanceSelects();
        initNumSpinners();
        mountHeroParticlesIn(document.getElementById("view-home"));
        bind();
        renderMiniSnapshot(null);
        renderReportPreviewEmpty();
        renderMatchesTable();
        renderProcessSummary([]);
        renderAuditLog();
        renderQuarantineTable();
        state.lang = detectLanguage("auto");
        applyTexts();
        switchView("home");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("bootstrap failed", err);
        addLog("[error] bootstrap failed: " + message);
      } finally {
        const appRoot = document.getElementById("appRoot");
        if (appRoot) appRoot.classList.add("ready");
        const splash = document.getElementById("splash");
        if (splash) {
          setTimeout(() => {
            splash.classList.add("hide");
            setTimeout(() => splash.remove(), 430);
          }, 220);
        }
      }

      if (tauriCore && typeof tauriCore.invoke === "function" && tauriEvent && typeof tauriEvent.listen === "function") {
        state.hostMode = "tauri";
        tauriEvent.listen("host-dispatch", (event) => {
          try {
            const payload = typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload;
            onHostMessage(payload);
          } catch (err) {
            addLog("[error] event parse failed: " + err.message);
          }
        });
        loadPlatformCapabilities()
          .then(() => refreshSecurityViews())
          .catch(e => addLog("[error] " + e.message));
        loadSettings().catch(e => addLog("[error] " + e.message));
        listReports().catch(e => addLog("[error] " + e.message));
        return;
      }

      document.getElementById("liveLog").textContent = "Host bridge is unavailable - Tauri API not initialized";
    }

    function initWelcomeDraft() {
      const outDir = document.getElementById("outDirInput")?.value || "logs";
      state.welcomeDraft = {
        language: state.lang || "en",
        languageRaw: state.lang || "en",
        theme: state.themeMode || "AUTO",
        accent: state.accent || "AMETHYST",
        out_dir: outDir
      };
    }

    function mountWelcomePreviewCanvas() {
      if (typeof state.welcomePreviewUnmount === "function") {
        state.welcomePreviewUnmount();
      }
      state.welcomePreviewUnmount = mountHeroParticles("welcomePreviewCanvas");
    }

    function applyWelcomeDraftPreview() {
      if (!state.welcomeDraft) return;
      const { languageRaw, theme, accent, out_dir } = state.welcomeDraft;
      const langTag = document.getElementById("welcomePreviewLang");
      const themeTag = document.getElementById("welcomePreviewTheme");
      const accentTag = document.getElementById("welcomePreviewAccent");
      const reportTag = document.getElementById("welcomePreviewReports");
      const statLang = document.getElementById("welcomeStatLang");
      const statTheme = document.getElementById("welcomeStatTheme");
      const statAccent = document.getElementById("welcomeStatAccent");
      const statOut = document.getElementById("welcomeStatOut");

      const uiLang = detectLanguage(languageRaw || "auto");
      const langLabel = formatWelcomeLanguageLabel(languageRaw, uiLang);
      const themeLabel = formatWelcomeThemeLabel(theme, uiLang);
      const accentLabel = formatWelcomeAccentLabel(accent);
      const previewLabels = uiLang === "ru"
        ? { lang: "Язык", theme: "Оформление", accent: "Акцент", reports: "Отчеты" }
        : { lang: "Language", theme: "Appearance", accent: "Accent", reports: "Reports" };

      if (langTag) langTag.textContent = `${previewLabels.lang}: ${langLabel}`;
      if (themeTag) themeTag.textContent = `${previewLabels.theme}: ${themeLabel}`;
      if (accentTag) accentTag.textContent = `${previewLabels.accent}: ${accentLabel}`;
      if (reportTag) reportTag.textContent = `${previewLabels.reports}: ${out_dir || "logs"}`;

      if (statLang) statLang.textContent = rawLabelShort(langLabel);
      if (statTheme) statTheme.textContent = rawLabelShort(themeLabel);
      if (statAccent) statAccent.textContent = rawLabelShort(accentLabel);
      if (statOut) statOut.textContent = String(out_dir || "logs").toUpperCase();

      applyWelcomePreviewAppearance();
      
      if (typeof state.welcomePreviewUnmount === "function" && state.welcomePreviewUnmount.updateAccent) {
        state.welcomePreviewUnmount.updateAccent();
      }
    }

    function rawLabelShort(value) {
      return String(value || "")
        .replace(/\s*\(.+?\)/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    }

    function renderWelcomeDialog() {
      if (!state.welcomeDraft) initWelcomeDraft();
      const body = document.getElementById("welcomeDialogBody");
      if (!body) return;
      const draft = state.welcomeDraft;
      const languageRaw = draft.languageRaw || "auto";
      const uiLang = draft.language || detectLanguage(languageRaw);
      const welcomeText = uiLang === "ru"
        ? {
            kicker: "Welcome Setup",
            title: "Добро пожаловать",
            sub: "Это первый запуск. Настройте рабочее пространство под себя.",
            cardTitle: "Initial Preferences",
            cardSub: "Задайте язык, тему, акцент и папку отчетов для этого компьютера.",
            lblLang: "Язык",
            lblTheme: "Тема",
            lblAccent: "Акцент",
            lblReports: "Папка отчетов",
            note: "Если поле папки оставить пустым, будет использована стандартная папка logs.",
            previewKicker: "Живое превью",
            previewTitleLead: "EXE",
            previewTitleAccent: "Analysis Console",
            previewSub: "Параметры справа обновляются сразу, как в EXE Analyser.",
            chipLang: "Язык",
            chipTheme: "Оформление",
            chipReports: "Отчеты",
            foot: "Параметры сохраняются локально и доступны для изменения в Настройках.",
            start: "Оставить как есть",
            apply: "Применить"
          }
        : {
            kicker: "Welcome Setup",
            title: "Welcome aboard",
            sub: "This is the first launch. Tune the workspace once so it opens exactly how you like.",
            cardTitle: "Initial Preferences",
            cardSub: "Set language, theme, accent and reports folder for this machine.",
            lblLang: "Language",
            lblTheme: "Theme",
            lblAccent: "Accent",
            lblReports: "Reports folder",
            note: "If reports folder is empty, the default logs folder will be used.",
            previewKicker: "Live Preview",
            previewTitleLead: "EXE",
            previewTitleAccent: "Analysis Console",
            previewSub: "Settings on the right update immediately, similar to EXE Analyser first-run.",
            chipLang: "Language",
            chipTheme: "Appearance",
            chipReports: "Reports",
            foot: "Preferences are saved locally and can be changed any time in Settings.",
            start: "Keep as is",
            apply: "Apply setup"
          };
      body.innerHTML = `
        <div class="about-hero">
          <div class="welcome-kicker"><span class="welcome-kicker-dot"></span>${welcomeText.kicker}</div>
          <h2 class="welcome-title" id="welcomeDialogTitle">${welcomeText.title}</h2>
          <p class="welcome-sub">${welcomeText.sub}</p>
        </div>
        <div class="welcome-body">
          <div class="welcome-grid">
            <section class="welcome-card welcome-stack">
              <div>
                <div class="about-card-title">${welcomeText.cardTitle}</div>
                <div class="about-card-sub">${welcomeText.cardSub}</div>
              </div>
              <div class="field">
                <label for="welcomeLangSelect">${welcomeText.lblLang}</label>
                <select id="welcomeLangSelect">
                  <option value="auto" ${languageRaw === "auto" ? "selected" : ""}>${uiLang === "ru" ? "Авто (System)" : "Auto (System)"}</option>
                  <option value="en" ${languageRaw === "en" ? "selected" : ""}>${uiLang === "ru" ? "Английский" : "English"}</option>
                  <option value="ru" ${languageRaw === "ru" ? "selected" : ""}>${uiLang === "ru" ? "Русский" : "Russian"}</option>
                </select>
              </div>
              <div class="field">
                <label for="welcomeThemeSelect">${welcomeText.lblTheme}</label>
                <select id="welcomeThemeSelect">
                  ${THEME_MODE_OPTIONS.map((o) => `<option value="${o}" ${draft.theme === o ? "selected" : ""}>${o === "AUTO" ? (uiLang === "ru" ? "Системная (Авто)" : "System (Auto)") : o === "DARK" ? (uiLang === "ru" ? "Темная" : "Dark") : (uiLang === "ru" ? "Светлая" : "Light")}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label for="welcomeAccentSelect">${welcomeText.lblAccent}</label>
                <select id="welcomeAccentSelect">
                  ${ACCENT_OPTIONS.map((o) => `<option value="${o}" ${draft.accent === o ? "selected" : ""}>${formatWelcomeAccentLabel(o)}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label for="welcomeReportsDirInput">${welcomeText.lblReports}</label>
                <input id="welcomeReportsDirInput" type="text" value="${String(draft.out_dir || "logs").replace(/"/g, "&quot;")}" placeholder="logs (or custom path)" />
              </div>
              <div class="welcome-note">${welcomeText.note}</div>
            </section>
            <section class="welcome-card welcome-preview">
              <div id="welcomePreviewHero" class="ten-hero welcome-preview-hero">
                <canvas id="welcomePreviewCanvas" class="hero-particles welcome-preview-canvas"></canvas>
                <div class="hero-content welcome-preview-content">
                  <div class="welcome-preview-copy">
                    <div class="hero-label">${welcomeText.previewKicker}</div>
                    <h3 class="hero-title">${welcomeText.previewTitleLead} <span class="hero-title-accent">${welcomeText.previewTitleAccent}</span></h3>
                    <p class="hero-sub">${welcomeText.previewSub}</p>
                    <div class="hero-tags">
                      <span id="welcomePreviewLang" class="hero-tag"></span>
                      <span id="welcomePreviewTheme" class="hero-tag"></span>
                      <span id="welcomePreviewAccent" class="hero-tag"></span>
                      <span id="welcomePreviewReports" class="hero-tag"></span>
                    </div>
                  </div>
                  <div class="hero-stats welcome-preview-stats">
                    <div class="hero-stat"><div id="welcomeStatLang" class="hero-stat-k"></div><div class="hero-stat-l">${welcomeText.chipLang}</div></div>
                    <div class="hero-stat"><div id="welcomeStatTheme" class="hero-stat-k"></div><div class="hero-stat-l">${welcomeText.chipTheme}</div></div>
                    <div class="hero-stat"><div id="welcomeStatAccent" class="hero-stat-k"></div><div class="hero-stat-l">${welcomeText.lblAccent}</div></div>
                    <div class="hero-stat"><div id="welcomeStatOut" class="hero-stat-k"></div><div class="hero-stat-l">${welcomeText.chipReports}</div></div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
        <div class="welcome-actions">
          <div class="welcome-footnote">${welcomeText.foot}</div>
          <div class="about-action-row">
            <button id="btnWelcomeSkip" class="btn" type="button">${welcomeText.start}</button>
            <button id="btnWelcomeApply" class="btn primary" type="button">${welcomeText.apply}</button>
          </div>
        </div>
      `;

      applyWelcomeDraftPreview();
      enhanceSelects(body);
      syncEnhancedSelects();
      mountWelcomePreviewCanvas();
    }

    function openWelcomeDialog() {
      if (!state.welcomeDraft) initWelcomeDraft();
      renderWelcomeDialog();
      state.welcomeOpen = true;
      const backdrop = document.getElementById("welcomeBackdrop");
      if (backdrop) {
        backdrop.classList.remove("hidden");
        backdrop.setAttribute("aria-hidden", "false");
      }
    }

    function closeWelcomeDialog() {
      state.welcomeOpen = false;
      if (typeof state.welcomePreviewUnmount === "function") {
        state.welcomePreviewUnmount();
        state.welcomePreviewUnmount = null;
      }
      const dialog = document.getElementById("selectDialog");
      if (dialog) dialog.remove();
      const backdrop = document.getElementById("welcomeBackdrop");
      if (backdrop) {
        backdrop.classList.add("hidden");
        backdrop.setAttribute("aria-hidden", "true");
      }
    }

    function skipWelcomeSetup() {
      const currentLang = document.getElementById("langSelect")?.value || "auto";
      const currentTheme = document.getElementById("themeModeSelect")?.value || "AUTO";
      const currentAccent = document.getElementById("accentSelect")?.value || "AMETHYST";
      const currentOutDir = document.getElementById("outDirInput")?.value || "logs";

      const settings = {
        language: currentLang,
        theme: currentTheme,
        accent: currentAccent,
        out_dir: currentOutDir,
        welcome_completed: true
      };

      localStorage.setItem("bp_settings", JSON.stringify(settings));
      persistSettings();
      closeWelcomeDialog();
    }

    function finishWelcomeSetup() {
      const lang = state.welcomeDraft?.languageRaw || document.getElementById("welcomeLangSelect")?.value || "auto";
      const theme = state.welcomeDraft?.theme || document.getElementById("welcomeThemeSelect")?.value || "AUTO";
      const accent = state.welcomeDraft?.accent || document.getElementById("welcomeAccentSelect")?.value || "AMETHYST";
      const outDir = state.welcomeDraft?.out_dir || document.getElementById("welcomeReportsDirInput")?.value || "logs";

      state.lang = detectLanguage(lang);
      state.themeMode = theme;
      state.accent = accent;

      applyThemeMode(theme);
      applyAccent(accent);
      applyTexts();

      document.getElementById("outDirInput").value = outDir;
      document.getElementById("langSelect").value = lang;
      document.getElementById("themeModeSelect").value = theme;
      document.getElementById("accentSelect").value = accent;
      syncEnhancedSelects();

      const settings = {
        language: lang,
        theme: theme,
        accent: accent,
        out_dir: outDir,
        welcome_completed: true
      };

      localStorage.setItem("bp_settings", JSON.stringify(settings));
      persistSettings();
      closeWelcomeDialog();
    }

    function showQuickInfoDialog(title, content) {
      const backdrop = document.getElementById("quickInfoBackdrop");
      const titleEl = document.getElementById("quickInfoTitle");
      const contentEl = document.getElementById("quickInfoContent");
      
      if (titleEl) titleEl.textContent = title;
      if (contentEl) contentEl.innerHTML = content;
      
      if (backdrop) {
        backdrop.style.display = "grid";
        setTimeout(() => backdrop.classList.add("active"), 10);
      }
    }

    function closeQuickInfoDialog() {
      const backdrop = document.getElementById("quickInfoBackdrop");
      if (backdrop) {
        backdrop.classList.remove("active");
        setTimeout(() => { backdrop.style.display = "none"; }, 260);
      }
    }

    function applyPowerProfile(profile) {
      state.powerProfile = profile;
      const dryRunInput = document.getElementById("dryRun");
      const retriesSelect = document.getElementById("maxRetriesSelect");
      if (profile === "PENTEST") {
        document.documentElement.classList.add("pentest-theme");
        if (dryRunInput) {
          dryRunInput.checked = false;
          dryRunInput.disabled = true;
        }
      } else {
        document.documentElement.classList.remove("pentest-theme");
        if (dryRunInput) {
          dryRunInput.disabled = false;
        }
      }
      if (retriesSelect && state.maxRetries === "auto") {
        retriesSelect.value = "auto";
      }
    }

    function applySandboxProfile(profile) {
      state.sandboxProfile = profile;
    }

    function getCleanupOptions() {
      const options = {
        profile: state.powerProfile,
        sandbox: state.sandboxProfile,
        dryRun: state.powerProfile !== "PENTEST"
      };
      
      if (state.powerProfile === "BASIC") {
        options.maxRuntime = 60;
        options.checkInterval = 500;
      } else if (state.powerProfile === "AUDIT") {
        options.maxRuntime = 180;
        options.checkInterval = 300;
      } else if (state.powerProfile === "PENTEST") {
        options.maxRuntime = 300;
        options.checkInterval = 100;
        options.dryRun = false;
      }
      
      return options;
    }

    function shouldIsolate() {
      return state.sandboxProfile === "isolated" || state.powerProfile === "PENTEST";
    }

    function getMaxRetries() {
      switch(state.powerProfile) {
        case "BASIC": return 1;
        case "AUDIT": return 3;
        case "PENTEST": return 5;
        default: return 1;
      }
    }

    function setupWelcomeDialogBindings() {
      const welcomeBody = document.getElementById("welcomeDialogBody");
      if (welcomeBody) {
        welcomeBody.addEventListener("click", (e) => {
          const target = e.target;
          if (!(target instanceof HTMLElement)) return;
          const button = target.closest("button");
          if (!button) return;
          if (button.id === "btnWelcomeSkip") skipWelcomeSetup();
          if (button.id === "btnWelcomeApply") finishWelcomeSetup();
        });

        welcomeBody.addEventListener("input", (e) => {
          const target = e.target;
          if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
          if (!state.welcomeDraft) initWelcomeDraft();
          if (target.id === "welcomeLangSelect") {
            state.welcomeDraft.languageRaw = target.value || "auto";
            state.welcomeDraft.language = detectLanguage(state.welcomeDraft.languageRaw);
            renderWelcomeDialog();
            return;
          }
          if (target.id === "welcomeThemeSelect") state.welcomeDraft.theme = target.value || "AUTO";
          if (target.id === "welcomeAccentSelect") state.welcomeDraft.accent = target.value || "AMETHYST";
          if (target.id === "welcomeReportsDirInput") state.welcomeDraft.out_dir = target.value || "logs";
          applyWelcomeDraftPreview();
        });

        welcomeBody.addEventListener("change", (e) => {
          const target = e.target;
          if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
          if (!state.welcomeDraft) initWelcomeDraft();
          if (target.id === "welcomeLangSelect") {
            state.welcomeDraft.languageRaw = target.value || "auto";
            state.welcomeDraft.language = detectLanguage(state.welcomeDraft.languageRaw);
            renderWelcomeDialog();
            return;
          }
          if (target.id === "welcomeThemeSelect") state.welcomeDraft.theme = target.value || "AUTO";
          if (target.id === "welcomeAccentSelect") state.welcomeDraft.accent = target.value || "AMETHYST";
          if (target.id === "welcomeReportsDirInput") state.welcomeDraft.out_dir = target.value || "logs";
          applyWelcomeDraftPreview();
        });
      }

      document.getElementById("btnQuickInfoClose").addEventListener("click", () => closeQuickInfoDialog());
      document.getElementById("btnQuickInfoOk").addEventListener("click", () => closeQuickInfoDialog());

      document.getElementById("btnInfo").addEventListener("click", () => openInfoDeck());
      document.getElementById("btnInfoDeckClose").addEventListener("click", () => closeInfoDeck());
      document.getElementById("btnInfoDeckOk").addEventListener("click", () => closeInfoDeck());
      document.getElementById("infoDeckBackdrop").addEventListener("click", (e) => {
        if (e.target.id === "infoDeckBackdrop") closeInfoDeck();
      });
      
      document.getElementById("welcomeBackdrop").addEventListener("click", (e) => {
        if (e.target.id === "welcomeBackdrop") closeWelcomeDialog();
      });
      
      document.getElementById("quickInfoBackdrop").addEventListener("click", (e) => {
        if (e.target.id === "quickInfoBackdrop") closeQuickInfoDialog();
      });

      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (state.welcomeOpen) skipWelcomeSetup();
          const infoDeck = document.getElementById("infoDeckBackdrop");
          if (infoDeck && infoDeck.style.display === "grid") closeInfoDeck();
          const quickInfo = document.getElementById("quickInfoBackdrop");
          if (quickInfo && quickInfo.style.display === "grid") closeQuickInfoDialog();
        }
      });
    }

    function openInfoDeck() {
      const backdrop = document.getElementById("infoDeckBackdrop");
      if (backdrop) {
        backdrop.style.display = "grid";
        setTimeout(() => backdrop.classList.add("active"), 10);
      }
    }

    function closeInfoDeck() {
      const backdrop = document.getElementById("infoDeckBackdrop");
      if (backdrop) {
        backdrop.classList.remove("active");
        setTimeout(() => { backdrop.style.display = "none"; }, 220);
      }
    }

    setupWelcomeDialogBindings();

    function checkFirstRun() {
      const settings = JSON.parse(localStorage.getItem("bp_settings") || "{}");
      if (!settings.welcome_completed) {
        openWelcomeDialog();
      }
    }

    bootstrap();
    checkFirstRun();
