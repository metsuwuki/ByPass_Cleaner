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
        force_actions_require_helper: true
      },
      settings: null,
      report: null,
      themeMode: "AUTO",
      accent: "AMETHYST",
      view: "home",
      lang: "en"
    };

    const ACCENT_OPTIONS = ["AMETHYST", "CHERRY", "LAVA", "GOLD", "EMERALD", "SEA", "SAPPHIRE", "QUARTZ", "ASH"];
    const THEME_MODE_OPTIONS = ["AUTO", "DARK", "LIGHT"];
    const systemThemeMedia = window.matchMedia("(prefers-color-scheme: light)");
    const tauriCore = window.__TAURI__ && window.__TAURI__.core ? window.__TAURI__.core : null;
    const tauriEvent = window.__TAURI__ && window.__TAURI__.event ? window.__TAURI__.event : null;

    const i18n = {
      en: {
        home: "Home",
        processes: "Processes",
        reports: "Reports",
        settings: "Settings",
        support: "Support",
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
        targetFolder: "Target Folder",
        chooseFolder: "Choose Folder",
        reportsDir: "Reports Dir",
        olderDays: "Older Than Days",
        minSize: "Min Size MB",
        ext: "Extensions (csv, no dot)",
        scanSub: "Scan subfolders",
        delEmpty: "Delete empty dirs",
        skipHidden: "Skip hidden",
        ageFilter: "Use age filter",
        previewOnly: "Preview only",
        run: "Run Cleanup",
        stop: "Stop",
        load: "Load Settings",
        save: "Save Settings",
        openReportsDir: "Open Reports Dir",
        liveLog: "Live Log",
        latestSnapshot: "Latest Report Snapshot",
        refreshList: "Refresh List",
        reportPreview: "Report Preview",
        refreshProcesses: "Refresh Processes",
        refreshQuarantine: "Refresh Quarantine",
        refreshAudit: "Refresh Audit",
        auditLog: "Audit Log",
        quarantine: "Quarantine",
        themeMode: "Theme Mode",
        accent: "Accent",
        language: "Language"
      },
      ru: {
        home: "Главная",
        processes: "Процессы",
        reports: "Отчеты",
        settings: "Настройки",
        support: "Поддержка",
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
        targetFolder: "Целевая папка",
        chooseFolder: "Выбрать папку",
        reportsDir: "Папка отчетов",
        olderDays: "Старше (дней)",
        minSize: "Мин. размер (МБ)",
        ext: "Расширения (csv, без точки)",
        scanSub: "Сканировать подпапки",
        delEmpty: "Удалять пустые папки",
        skipHidden: "Пропускать скрытые",
        ageFilter: "Фильтр по возрасту",
        previewOnly: "Только предпросмотр",
        run: "Запустить очистку",
        stop: "Остановить",
        load: "Загрузить настройки",
        save: "Сохранить настройки",
        openReportsDir: "Открыть папку отчетов",
        liveLog: "Живой лог",
        latestSnapshot: "Сводка последнего отчета",
        refreshList: "Обновить список",
        reportPreview: "Предпросмотр отчета",
        refreshProcesses: "Обновить процессы",
        refreshQuarantine: "Обновить карантин",
        refreshAudit: "Обновить аудит",
        auditLog: "Журнал аудита",
        quarantine: "Карантин",
        themeMode: "Тема",
        accent: "Акцент",
        language: "Язык"
      }
    };

    function id() {
      return "r-" + Math.random().toString(16).slice(2);
    }

    function t(key) {
      const langPack = i18n[state.lang] || i18n.en;
      return langPack[key] || i18n.en[key] || key;
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
      const labelMinSize = document.querySelector('label[for="minSizeInput"]');
      const labelExt = document.querySelector('label[for="extInput"]');
      const labelThemeMode = document.querySelector('label[for="themeModeSelect"]');
      const labelAccent = document.querySelector('label[for="accentSelect"]');
      const labelLang = document.querySelector('label[for="langSelect"]');
      if (labelTarget) labelTarget.textContent = t("targetFolder");
      if (labelOutDir) labelOutDir.textContent = t("reportsDir");
      if (labelDays) labelDays.textContent = t("olderDays");
      if (labelMinSize) labelMinSize.textContent = t("minSize");
      if (labelExt) labelExt.textContent = t("ext");
      if (labelThemeMode) labelThemeMode.textContent = t("themeMode");
      if (labelAccent) labelAccent.textContent = t("accent");
      if (labelLang) labelLang.textContent = t("language");

      setCheckText("scanSubfolders", t("scanSub"));
      setCheckText("deleteEmpty", t("delEmpty"));
      setCheckText("skipHidden", t("skipHidden"));
      setCheckText("useAgeFilter", t("ageFilter"));
      setCheckText("dryRun", t("previewOnly"));

      document.getElementById("btnPickTarget").textContent = t("chooseFolder");
      document.getElementById("btnRun").textContent = t("run");
      document.getElementById("btnStop").textContent = t("stop");
      document.getElementById("btnLoadSettings").textContent = t("load");
      document.getElementById("btnSaveSettings").textContent = t("save");
      document.getElementById("btnOpenReportsDir").textContent = t("openReportsDir");
      document.getElementById("btnListReports").textContent = t("refreshList");
      document.getElementById("btnRefreshProcesses").textContent = t("refreshProcesses");
      document.getElementById("btnRefreshQuarantine").textContent = t("refreshQuarantine");
      document.getElementById("btnRefreshAudit").textContent = t("refreshAudit");

      const cardTitles = document.querySelectorAll('.card-title');
      if (cardTitles[0]) cardTitles[0].textContent = t("liveLog");
      if (cardTitles[1]) cardTitles[1].textContent = t("latestSnapshot");
      if (cardTitles[2]) cardTitles[2].textContent = t("processes");
      if (cardTitles[3]) cardTitles[3].textContent = t("auditLog");
      if (cardTitles[4]) cardTitles[4].textContent = t("quarantine");
      if (cardTitles[5]) cardTitles[5].textContent = t("reports");
      if (cardTitles[6]) cardTitles[6].textContent = t("reportPreview");

      const viewTitle = document.getElementById("viewTitle");
      if (state.view === "home") viewTitle.textContent = t("home");
      if (state.view === "processes") viewTitle.textContent = t("processes");
      if (state.view === "reports") viewTitle.textContent = t("reports");
      if (state.view === "settings") viewTitle.textContent = t("settings");

      const langSelect = document.getElementById("langSelect");
      if (langSelect && langSelect.options.length >= 5) {
        langSelect.options[0].textContent = state.lang === "ru" ? "Авто" : "Auto";
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

    function syncEnhancedSelects() {
      document.querySelectorAll("select[data-ux-enhanced='1']").forEach((select) => {
        if (typeof select.__uxSync === "function") select.__uxSync();
      });
    }

    function showSelectDialog(select, titleText) {
      const old = document.getElementById("selectDialog");
      if (old) old.remove();

      const isAccentPicker = select.id === "accentSelect";
      const accentPreview = {
        CHERRY: "linear-gradient(120deg, #d53a47, #f06a7a)",
        LAVA: "linear-gradient(120deg, #ff6b2e, #ff9d2e)",
        GOLD: "linear-gradient(120deg, #d6a83d, #f0cb73)",
        EMERALD: "linear-gradient(120deg, #2db873, #49d68d)",
        SEA: "linear-gradient(120deg, #29bfb0, #63e5d8)",
        SAPPHIRE: "linear-gradient(120deg, #2f74de, #58a1ff)",
        AMETHYST: "linear-gradient(120deg, #8f4dff, #c96eff)",
        QUARTZ: "linear-gradient(120deg, #d16eb3, #f38bcf)",
        ASH: "linear-gradient(120deg, #8f97a4, #bdc5d2)"
      };

      const options = Array.from(select.options).filter((opt) => !opt.disabled);
      let pendingValue = select.value;

      const wrap = document.createElement("div");
      wrap.id = "selectDialog";
      wrap.className = "picker-backdrop";
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
        previewBox.style.background = accentPreview[pendingValue] || accentPreview.AMETHYST;
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
              previewBox.style.background = accentPreview[pendingValue] || accentPreview.AMETHYST;
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

    function initHeroMatrix() {
      const canvas = document.getElementById("heroMatrix");
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const chars = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%*+-<>";
      let cols = 0;
      let drops = [];
      let raf = 0;
      let dpr = 1;
      let cell = 14;

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        cols = Math.max(1, Math.floor(w / cell));
        drops = Array.from({ length: cols }, () => Math.random() * (h / cell));
      };

      const randChar = () => chars[(Math.random() * chars.length) | 0];

      const tick = () => {
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.fillStyle = "rgba(0, 0, 0, 0.085)";
        ctx.fillRect(0, 0, w, h);

        const c1 = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8f4dff";
        const c2 = getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim() || "#c96eff";
        ctx.font = "12px Cascadia Code, monospace";

        for (let i = 0; i < cols; i++) {
          const x = i * cell;
          const y = drops[i] * cell;
          ctx.fillStyle = (i % 3 === 0) ? c2 : c1;
          ctx.globalAlpha = 0.75;
          ctx.fillText(randChar(), x, y);
          ctx.globalAlpha = 1;

          if (y > h && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i] += 0.55 + Math.random() * 0.65;
        }

        raf = requestAnimationFrame(tick);
      };

      resize();

      if (typeof ResizeObserver === "function") {
        const ro = new ResizeObserver(() => resize());
        ro.observe(canvas);
      } else {
        window.addEventListener("resize", resize);
      }

      if (reduceMotion) {
        tick();
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(tick);
      }
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

    function currentOperator() {
      const user = (state.settings && state.settings.operator) || "unknown";
      return String(user || "unknown");
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

      for (const [index, row] of state.processes.entries()) {
        const scheduleSupported = !!(state.capabilities && state.capabilities.schedule_delete_on_reboot);
        const scheduleButton = scheduleSupported
          ? "<button class=\"btn mini\" data-action=\"schedule\" data-index=\"" + index + "\">Schedule Delete</button>"
          : "<button class=\"btn mini\" disabled title=\"Available on Windows only\">Schedule Delete</button>";
        const tr = document.createElement("tr");
        tr.innerHTML = "<td class=\"mono\">" + row.pid + "</td>" +
          "<td>" + escapeHtml(row.name || "-") + "</td>" +
          "<td class=\"mono\">" + escapeHtml(row.exe || "-") + "</td>" +
          "<td>" + escapeHtml(formatDateTime(row.start_ts_unix)) + "</td>" +
          "<td>" + escapeHtml(Number(row.cpu_pct || 0).toFixed(1)) + "</td>" +
          "<td>" + escapeHtml(formatBytes(row.mem_bytes || 0)) + "</td>" +
          "<td><span class=\"badge\">" + escapeHtml(row.suspicion_score || 0) + "</span></td>" +
          "<td><div class=\"action-row\">" +
          "<button class=\"btn mini\" data-action=\"info\" data-index=\"" + index + "\">Info</button>" +
          "<button class=\"btn mini\" data-action=\"open\" data-index=\"" + index + "\">Open Folder</button>" +
          "<button class=\"btn mini\" data-action=\"close\" data-index=\"" + index + "\">Request Close</button>" +
          "<button class=\"btn mini\" data-action=\"quarantine\" data-index=\"" + index + "\">Quarantine</button>" +
          scheduleButton +
          "<button class=\"btn mini warn\" data-action=\"force\" data-index=\"" + index + "\">Request Force</button>" +
          "</div></td>";
        tbody.appendChild(tr);
      }
    }

    async function loadPlatformCapabilities() {
      try {
        const caps = await post("get_platform_capabilities", {});
        if (caps && typeof caps === "object") {
          state.capabilities = {
            is_windows: !!caps.is_windows,
            schedule_delete_on_reboot: !!caps.schedule_delete_on_reboot,
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
        force_actions_require_helper: true
      };
    }

    function renderQuarantineTable() {
      const tbody = document.querySelector("#quarantineTable tbody");
      if (!tbody) return;
      tbody.innerHTML = "";

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
      box.textContent = (state.audit || []).map((row) => {
        return "[" + (row.ts_iso || "-") + "] " +
          (row.action || "unknown") + " | " +
          (row.result || "-") + " | " +
          (row.target || "-") + "\n" +
          (row.message || "");
      }).join("\n\n");
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
      body.innerHTML = "<div class=\"modal-note\">Read-only process inspection. No destructive action is executed from this dialog.</div>" +
        "<div class=\"kv-grid\">" +
        "<div class=\"kv-card\"><div class=\"k\">PID</div><div class=\"v\">" + escapeHtml(detail.pid) + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Name</div><div class=\"v\">" + escapeHtml(detail.name || "-") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Executable</div><div class=\"v\">" + escapeHtml(detail.exe || "-") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">SHA256</div><div class=\"v\">" + escapeHtml(detail.sha256 || "unavailable") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Command Line</div><div class=\"v\">" + escapeHtml(detail.cmdline || "-") + "</div></div>" +
        "<div class=\"kv-card\"><div class=\"k\">Parent PID</div><div class=\"v\">" + escapeHtml(detail.parent_pid == null ? "-" : detail.parent_pid) + "</div></div>" +
        "</div>";
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

        if (envelope.event === "analysis-finished") {
          setStatus("done");
          document.getElementById("stRun").textContent = "analysis=idle";
          document.getElementById("runProgress").style.width = "100%";
          setTimeout(() => {
            document.getElementById("runProgress").style.width = "0%";
          }, 600);

          const path = envelope.payload && envelope.payload.reportPath ? envelope.payload.reportPath : "";
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
      return {
        target_path: document.getElementById("targetPath").value.trim(),
        out_dir: document.getElementById("outDirInput").value.trim() || "logs",
        days_limit: Number(document.getElementById("daysInput").value || 0),
        min_size_mb: Number(document.getElementById("minSizeInput").value || 0),
        extensions: document.getElementById("extInput").value.trim(),
        scan_subfolders: document.getElementById("scanSubfolders").checked,
        delete_empty_dirs: document.getElementById("deleteEmpty").checked,
        skip_hidden: document.getElementById("skipHidden").checked,
        use_age_filter: document.getElementById("useAgeFilter").checked,
        dry_run: document.getElementById("dryRun").checked,
        mode: "STANDARD",
        theme: state.themeMode,
        accent: state.accent,
        language: document.getElementById("langSelect").value
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

      applyThemeMode(mode);
      applyAccent(accent);
      state.lang = detectLanguage(s.language || "auto");
      state.settings = s;
      applyTexts();
      syncEnhancedSelects();
    }

    async function loadSettings() {
      const s = await post("load_settings", {});
      applySettingsToUi(s);
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

      const scanned = Number(c.scanned || 0);
      const matched = Number(c.matched || 0);
      const deleted = Number(c.deleted || 0);
      const errors = Number(c.errors || 0);

      document.getElementById("kScanned").textContent = String(scanned);
      document.getElementById("kMatched").textContent = String(matched);
      document.getElementById("kDeleted").textContent = String(deleted);
      document.getElementById("kFreed").textContent = formatBytes(c.freed_bytes || 0);
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

      const summary = {
        generated_at: report.generated_at,
        target_path: report.target_path,
        final_status: report.final_status,
        dry_run: report.dry_run,
        cleanup: c
      };
      document.getElementById("detailsBox").textContent = JSON.stringify(summary, null, 2);
      document.getElementById("reportPreview").textContent = JSON.stringify(report, null, 2);
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
        const d = new Date((row.modified_unix || 0) * 1000).toLocaleString();
        tr.innerHTML = "<td>" + d + "</td>" +
          "<td>" + formatBytes(row.size_bytes || 0) + "</td>" +
          "<td class=\"mono\">" + row.path + "</td>" +
          "<td><button class=\"btn\" data-open=\"" + row.path + "\">Open</button></td>";
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
      document.getElementById("btnLoadSettings").addEventListener("click", () => loadSettings().catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnSaveSettings").addEventListener("click", () => saveSettings().catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnOpenReportsDir").addEventListener("click", () => post("open_path", { path: document.getElementById("outDirInput").value || "logs" }).catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnListReports").addEventListener("click", () => listReports().catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnRefreshProcesses").addEventListener("click", () => refreshProcesses().catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnRefreshQuarantine").addEventListener("click", () => refreshQuarantine().catch(e => addLog("[error] " + e.message)));
      document.getElementById("btnRefreshAudit").addEventListener("click", () => refreshAudit().catch(e => addLog("[error] " + e.message)));

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

    function bootstrap() {
      enhanceSelects();
      initHeroMatrix();
      bind();
      state.lang = detectLanguage("auto");
      applyTexts();
      switchView("home");
      document.getElementById("appRoot").classList.add("ready");
      const splash = document.getElementById("splash");
      if (splash) {
        setTimeout(() => {
          splash.classList.add("hide");
          setTimeout(() => splash.remove(), 430);
        }, 220);
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

      if (!window.qt || !window.qt.webChannelTransport || typeof QWebChannel !== "function") {
        document.getElementById("liveLog").textContent = "Host bridge is unavailable";
        return;
      }

      state.hostMode = "qt";
      new QWebChannel(window.qt.webChannelTransport, (channel) => {
        state.ipc = channel.objects.ipc || null;
        if (!state.ipc) {
          document.getElementById("liveLog").textContent = "Host bridge is unavailable";
          return;
        }

        loadPlatformCapabilities()
          .then(() => refreshSecurityViews())
          .catch(e => addLog("[error] " + e.message));
        loadSettings().catch(e => addLog("[error] " + e.message));
        listReports().catch(e => addLog("[error] " + e.message));
      });
    }

    bootstrap();
