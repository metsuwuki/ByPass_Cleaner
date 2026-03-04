import os
import queue
import threading
import time
import json
import math
import random
import re
import webbrowser
from dataclasses import dataclass

from PySide6.QtCore import QEasingCurve, QPropertyAnimation, QTimer, Qt
from PySide6.QtGui import QColor, QFont, QIcon, QKeySequence, QPainter, QPainterPath, QPen, QPixmap, QShortcut
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
    QComboBox,
    QDialog,
    QFileDialog,
    QFormLayout,
    QFrame,
    QGraphicsDropShadowEffect,
    QGraphicsOpacityEffect,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMenu,
    QMessageBox,
    QPushButton,
    QProgressBar,
    QSlider,
    QSplashScreen,
    QSplitter,
    QStyle,
    QTextEdit,
    QToolButton,
    QVBoxLayout,
    QWidget,
)

from cleaner_core import CleanupOptions, CleanerEngine


@dataclass
class PreviewResult:
    count: int
    total_size: int
    date_min: float | None
    date_max: float | None
    top_types: list[tuple[str, int]]


class FolderListWidget(QListWidget):
    def __init__(self, drop_callback=None):
        super().__init__()
        self.drop_callback = drop_callback
        self.setAcceptDrops(True)

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            return
        super().dragEnterEvent(event)

    def dragMoveEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            return
        super().dragMoveEvent(event)

    def dropEvent(self, event):
        added_paths = []
        if event.mimeData().hasUrls():
            existing = {
                self.item(i).text()
                for i in range(self.count())
            }
            for url in event.mimeData().urls():
                local_path = url.toLocalFile()
                if local_path and os.path.isdir(local_path) and local_path not in existing:
                    self.addItem(QListWidgetItem(local_path))
                    existing.add(local_path)
                    added_paths.append(local_path)
            event.acceptProposedAction()

            if added_paths and self.drop_callback:
                self.drop_callback(added_paths)
            return
        super().dropEvent(event)


class AnimatedBackgroundWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        self.setAttribute(Qt.WidgetAttribute.WA_NoSystemBackground, True)
        self._tick = 0
        self._theme_key = "neon"
        self._speed_factor = 1.0
        self._matrix_drops = []
        self._matrix_charset = "アイウエオカキクケコサシスセソ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._on_tick)
        self._timer.start(33)

    def set_theme(self, theme_key):
        self._theme_key = theme_key
        if self._theme_key == "matrix":
            self._init_matrix_drops(force=True)
        self.update()

    def set_speed_factor(self, speed_factor):
        self._speed_factor = max(0.35, min(2.2, float(speed_factor)))

    def _on_tick(self):
        self._tick += self._speed_factor
        self.update()

    def _init_matrix_drops(self, force=False):
        width = max(1, self.width())
        columns = max(12, width // 16)
        if not force and len(self._matrix_drops) == columns:
            return

        self._matrix_drops = []
        for index in range(columns):
            self._matrix_drops.append(
                {
                    "x": index * 16,
                    "y": random.randint(-800, 0),
                    "speed": random.randint(8, 20),
                    "length": random.randint(8, 24),
                }
            )

    def _paint_matrix(self, painter, width, height):
        self._init_matrix_drops()

        painter.fillRect(self.rect(), QColor("#020703"))
        painter.setPen(QColor(0, 255, 120, 40))
        matrix_font = QFont("Consolas")
        matrix_font.setPointSize(11)
        matrix_font.setWeight(QFont.Weight.Medium)
        painter.setFont(matrix_font)

        for drop in self._matrix_drops:
            drop["y"] += drop["speed"] * self._speed_factor
            if drop["y"] - (drop["length"] * 18) > height:
                drop["y"] = random.randint(-500, -40)
                drop["speed"] = random.randint(8, 20)
                drop["length"] = random.randint(8, 24)

            for tail_index in range(drop["length"]):
                char_y = drop["y"] - (tail_index * 18)
                if char_y < -20 or char_y > height + 20:
                    continue

                fade = max(0.05, 1.0 - (tail_index / drop["length"]))
                if tail_index == 0:
                    color = QColor(190, 255, 210, 220)
                else:
                    color = QColor(20, 220, 90, int(180 * fade))
                painter.setPen(color)
                char = random.choice(self._matrix_charset)
                painter.drawText(int(drop["x"]), int(char_y), char)

    def _paint_retrowave(self, painter, width, height):
        if self._theme_key == "minimal":
            bg_color = QColor("#101215")
            grid_color = QColor(90, 120, 160, 22)
            orb_primary = QColor(60, 125, 255, 48)
            orb_secondary = QColor(120, 160, 255, 34)
        elif self._theme_key == "chrome":
            bg_color = QColor("#0F1114")
            grid_color = QColor(185, 192, 202, 24)
            orb_primary = QColor(224, 229, 236, 40)
            orb_secondary = QColor(154, 164, 176, 28)
        else:
            bg_color = QColor("#0b0626")
            grid_color = QColor(255, 45, 149, 22)
            orb_primary = QColor(255, 45, 149, 54)
            orb_secondary = QColor(141, 121, 166, 34)

        painter.fillRect(self.rect(), bg_color)

        step = 56
        offset = int((self._tick * 0.8) % step)
        pen = QPen(grid_color)
        pen.setWidth(1)
        painter.setPen(pen)

        x = -offset
        while x < width:
            painter.drawLine(x, 0, x, height)
            x += step

        y = -offset
        while y < height:
            painter.drawLine(0, y, width, y)
            y += step

        painter.setPen(Qt.PenStyle.NoPen)

        t = self._tick / 20.0
        orb1_x = width * 0.18 + math.sin(t * 0.7) * 40
        orb1_y = height * 0.22 + math.cos(t * 0.9) * 30
        orb2_x = width * 0.78 + math.cos(t * 0.55) * 50
        orb2_y = height * 0.68 + math.sin(t * 0.65) * 35
        orb3_x = width * 0.46 + math.sin(t * 0.85) * 45
        orb3_y = height * 0.82 + math.cos(t * 0.75) * 28

        painter.setBrush(orb_primary)
        painter.drawEllipse(int(orb1_x - 170), int(orb1_y - 170), 340, 340)

        painter.setBrush(orb_secondary)
        painter.drawEllipse(int(orb2_x - 140), int(orb2_y - 140), 280, 280)

        painter.setBrush(orb_secondary)
        painter.drawEllipse(int(orb3_x - 110), int(orb3_y - 110), 220, 220)

    def paintEvent(self, _event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        width = self.width()
        height = self.height()
        if width <= 0 or height <= 0:
            return

        if self._theme_key == "matrix":
            self._paint_matrix(painter, width, height)
        else:
            self._paint_retrowave(painter, width, height)


class CleanerQtApp(QMainWindow):
    SUPPORT_URL = "https://t.me/me_tsu_ki"
    LOCALES = {
        "ru": {
            "window_title": "Metsuki Cleaner • Desktop",
            "title": "Metsuki Cleaner",
            "theme_neon": "Neon",
            "theme_minimal": "Dark Minimal",
            "theme_matrix": "Matrix",
            "theme_chrome": "Chrome",
            "folders": "Папки",
            "settings": "Настройки",
            "older_days": "Старше (дней)",
            "min_size": "Мин. размер (MB)",
            "extensions": "Расширения",
            "placeholder_ext": ".log,.tmp,.bak",
            "scan_subfolders": "Сканировать подпапки",
            "delete_empty": "Удалять пустые папки",
            "skip_hidden": "Пропускать скрытые",
            "dry_run": "Только предпросмотр",
            "add": "Добавить",
            "folder_actions": "Действия",
            "open": "Открыть",
            "remove": "Удалить",
            "clear": "Очистить",
            "run": "Запустить",
            "stop": "Стоп",
            "refresh_preview": "Обновить предпросмотр",
            "details_preview": "Показать детали",
            "status_ready": "Готово",
            "dashboard": "Панель",
            "metric_scanned": "Проверено",
            "metric_matched": "Подходит",
            "metric_deleted": "Удалено",
            "metric_freed": "Освобождено",
            "preview_summary": "Сводка предпросмотра",
            "preview_no_folder": "Добавьте папку для предпросмотра",
            "activity": "Активность",
            "activity_ready": "• UI готов. Добавьте папку и запустите очистку.",
            "save_log": "Сохранить лог",
            "help": "Помощь",
            "developer_contact": "Поддержка",
            "design_settings": "Дизайн",
            "design_title": "Настройки дизайна",
            "design_theme": "Тема",
            "design_language": "Язык",
            "design_glass": "Стеклянность",
            "design_apply": "Применить",
            "design_cancel": "Отмена",
            "design_saved": "Настройки дизайна сохранены",
            "preset_logs": "Логи",
            "preset_temp": "Временные",
            "preset_media": "Медиа",
            "preset_clear": "Сброс",
            "tip_drop": "Можно перетаскивать папки сюда из проводника",
            "select_folder": "Выберите папку",
            "msg_folder": "Папка",
            "msg_select_folder": "Выберите папку в списке",
            "msg_folder_unavailable": "Папка недоступна",
            "msg_open_failed": "Не удалось открыть: {error}",
            "msg_list_cleared": "Список папок очищен",
            "msg_added_dd": "Добавлено через drag-and-drop: {count}",
            "msg_preset_logs": "Применён пресет: Логи",
            "msg_preset_temp": "Применён пресет: Временные",
            "msg_preset_media": "Применён пресет: Медиа",
            "msg_preset_clear": "Пресет сброшен",
            "msg_added_folder": "Добавлена папка: {folder}",
            "msg_removed_folder": "Удалена папка: {folder}",
            "error": "Ошибка",
            "error_days": "Поле 'Старше (дней)' должно быть положительным целым",
            "error_size": "Поле 'Мин. размер' должно быть неотрицательным числом",
            "preview_analyzing": "Анализируем папки...",
            "preview_started": "Запущен предпросмотр",
            "preview_empty": "Нет файлов под текущие правила",
            "preview_done_empty": "Предпросмотр завершён: совпадений нет",
            "preview_done": "Предпросмотр завершён: найдено {count} файлов",
            "preview_to_delete": "К удалению",
            "preview_period": "Период",
            "preview_types": "Типы",
            "preview_title": "Предпросмотр",
            "preview_no_data": "Пока нет данных предпросмотра",
            "preview_details_title": "Детали предпросмотра",
            "preview_first_records": "Показаны первые записи:",
            "warn_add_folder": "Добавьте хотя бы одну папку",
            "cleanup_running": "Очистка выполняется...",
            "cleanup_start": "Запуск очистки для {count} папок",
            "cleanup_stopping": "Останавливаем...",
            "cleanup_stop_requested": "Запрошена остановка",
            "status_scanned_deleted": "Проверено: {scanned} | Удалено: {deleted}",
            "done": "Готово",
            "done_message": "Удалено: {deleted} | Освобождено: {freed}",
            "msg_cleanup_done": "Очистка завершена",
            "summary_app": "Metsuki Cleaner Desktop",
            "summary_scanned": "Проверено",
            "summary_matched": "Подходит",
            "summary_deleted": "Удалено",
            "summary_freed": "Освобождено",
            "summary_deleted_dirs": "Удалено папок",
            "summary_errors": "Ошибки",
            "summary_mode_preview": "Режим: ПРЕДПРОСМОТР",
            "summary_mode_delete": "Режим: УДАЛЕНИЕ",
            "log_title": "Лог",
            "log_empty": "В этой сессии пока нет лога",
            "save_log_title": "Сохранить лог",
            "log_saved": "Лог успешно сохранён",
            "log_saved_path": "Лог сохранён: {path}",
            "log_save_failed": "Не удалось сохранить лог: {error}",
            "help_title": "Помощь",
            "help_text": "1) Добавьте папки или перетащите их в список\n2) Настройте правила или выберите пресет\n3) Обновите предпросмотр\n4) Нажмите Запустить",
            "settings_restored": "Настройки восстановлены",
            "language_switched": "Язык интерфейса: RU",
            "welcome_title": "Добро пожаловать в Metsuki Cleaner",
            "welcome_text": "Выберите тему по умолчанию для первого запуска.",
            "welcome_theme": "Тема интерфейса",
            "welcome_language": "Язык интерфейса",
            "welcome_confirm": "Подтвердить",
            "welcome_preview": "Предпросмотр темы",
            "welcome_card_neon": "Neon • Яркий",
            "welcome_card_minimal": "Minimal • Спокойный",
            "welcome_card_matrix": "Matrix • Кибер",
            "welcome_card_chrome": "Chrome • Металл",
            "loading": "Загрузка интерфейса...",
        },
        "en": {
            "window_title": "Metsuki Cleaner • Desktop",
            "title": "Metsuki Cleaner",
            "theme_neon": "Neon",
            "theme_minimal": "Dark Minimal",
            "theme_matrix": "Matrix",
            "theme_chrome": "Chrome",
            "folders": "Folders",
            "settings": "Settings",
            "older_days": "Older than (days)",
            "min_size": "Min size (MB)",
            "extensions": "Extensions",
            "placeholder_ext": ".log,.tmp,.bak",
            "scan_subfolders": "Scan subfolders",
            "delete_empty": "Delete empty folders",
            "skip_hidden": "Skip hidden",
            "dry_run": "Preview only",
            "add": "Add",
            "folder_actions": "Actions",
            "open": "Open",
            "remove": "Remove",
            "clear": "Clear",
            "run": "Run",
            "stop": "Stop",
            "refresh_preview": "Refresh preview",
            "details_preview": "Show details",
            "status_ready": "Ready",
            "dashboard": "Dashboard",
            "metric_scanned": "Scanned",
            "metric_matched": "Matched",
            "metric_deleted": "Deleted",
            "metric_freed": "Freed",
            "preview_summary": "Preview summary",
            "preview_no_folder": "Add a folder to preview",
            "activity": "Activity",
            "activity_ready": "• UI is ready. Add folders and start cleanup.",
            "save_log": "Save log",
            "help": "Help",
            "developer_contact": "Support",
            "design_settings": "Design",
            "design_title": "Design Settings",
            "design_theme": "Theme",
            "design_language": "Language",
            "design_glass": "Glass Intensity",
            "design_apply": "Apply",
            "design_cancel": "Cancel",
            "design_saved": "Design settings saved",
            "preset_logs": "Logs",
            "preset_temp": "Temp",
            "preset_media": "Media",
            "preset_clear": "Reset",
            "tip_drop": "You can drag and drop folders here from Explorer",
            "select_folder": "Select folder",
            "msg_folder": "Folder",
            "msg_select_folder": "Select a folder in the list",
            "msg_folder_unavailable": "Folder is unavailable",
            "msg_open_failed": "Failed to open: {error}",
            "msg_list_cleared": "Folder list cleared",
            "msg_added_dd": "Added via drag-and-drop: {count}",
            "msg_preset_logs": "Preset applied: Logs",
            "msg_preset_temp": "Preset applied: Temp",
            "msg_preset_media": "Preset applied: Media",
            "msg_preset_clear": "Preset reset",
            "msg_added_folder": "Folder added: {folder}",
            "msg_removed_folder": "Folder removed: {folder}",
            "error": "Error",
            "error_days": "'Older than (days)' must be a positive integer",
            "error_size": "'Min size' must be a non-negative number",
            "preview_analyzing": "Analyzing folders...",
            "preview_started": "Preview started",
            "preview_empty": "No files match current rules",
            "preview_done_empty": "Preview complete: no matches",
            "preview_done": "Preview complete: {count} files matched",
            "preview_to_delete": "To delete",
            "preview_period": "Period",
            "preview_types": "Types",
            "preview_title": "Preview",
            "preview_no_data": "No preview data yet",
            "preview_details_title": "Preview details",
            "preview_first_records": "Showing first records:",
            "warn_add_folder": "Add at least one folder",
            "cleanup_running": "Cleanup in progress...",
            "cleanup_start": "Cleanup started for {count} folders",
            "cleanup_stopping": "Stopping...",
            "cleanup_stop_requested": "Stop requested",
            "status_scanned_deleted": "Scanned: {scanned} | Deleted: {deleted}",
            "done": "Done",
            "done_message": "Deleted: {deleted} | Freed: {freed}",
            "msg_cleanup_done": "Cleanup complete",
            "summary_app": "Metsuki Cleaner Desktop",
            "summary_scanned": "Scanned",
            "summary_matched": "Matched",
            "summary_deleted": "Deleted",
            "summary_freed": "Freed",
            "summary_deleted_dirs": "Deleted folders",
            "summary_errors": "Errors",
            "summary_mode_preview": "Mode: PREVIEW",
            "summary_mode_delete": "Mode: DELETE",
            "log_title": "Log",
            "log_empty": "No logs in this session yet",
            "save_log_title": "Save log",
            "log_saved": "Log saved successfully",
            "log_saved_path": "Log saved: {path}",
            "log_save_failed": "Could not save log: {error}",
            "help_title": "Help",
            "help_text": "1) Add folders or drag and drop them\n2) Configure rules or use a preset\n3) Refresh preview\n4) Press Run",
            "settings_restored": "Settings restored",
            "language_switched": "UI language: EN",
            "welcome_title": "Welcome to Metsuki Cleaner",
            "welcome_text": "Choose your default theme for first launch.",
            "welcome_theme": "Interface theme",
            "welcome_language": "Interface language",
            "welcome_confirm": "Confirm",
            "welcome_preview": "Theme preview",
            "welcome_card_neon": "Neon • Vibrant",
            "welcome_card_minimal": "Minimal • Clean",
            "welcome_card_matrix": "Matrix • Cyber",
            "welcome_card_chrome": "Chrome • Metallic",
            "loading": "Loading interface...",
        },
        "uk": {
            "window_title": "Metsuki Cleaner • Desktop",
            "title": "Metsuki Cleaner",
            "theme_neon": "Neon",
            "theme_minimal": "Dark Minimal",
            "theme_matrix": "Matrix",
            "theme_chrome": "Chrome",
            "folders": "Папки",
            "settings": "Налаштування",
            "older_days": "Старше (днів)",
            "min_size": "Мін. розмір (MB)",
            "extensions": "Розширення",
            "placeholder_ext": ".log,.tmp,.bak",
            "scan_subfolders": "Сканувати підпапки",
            "delete_empty": "Видаляти порожні папки",
            "skip_hidden": "Пропускати приховані",
            "dry_run": "Лише попередній перегляд",
            "add": "Додати",
            "folder_actions": "Дії",
            "open": "Відкрити",
            "remove": "Видалити",
            "clear": "Очистити",
            "run": "Запустити",
            "stop": "Стоп",
            "refresh_preview": "Оновити попередній перегляд",
            "details_preview": "Показати деталі",
            "status_ready": "Готово",
            "dashboard": "Панель",
            "metric_scanned": "Перевірено",
            "metric_matched": "Збігів",
            "metric_deleted": "Видалено",
            "metric_freed": "Звільнено",
            "preview_summary": "Підсумок перегляду",
            "preview_no_folder": "Додайте папку для попереднього перегляду",
            "activity": "Активність",
            "activity_ready": "• UI готовий. Додайте папку і запустіть очищення.",
            "save_log": "Зберегти лог",
            "help": "Допомога",
            "developer_contact": "Підтримка",
            "design_settings": "Дизайн",
            "design_title": "Налаштування дизайну",
            "design_theme": "Тема",
            "design_language": "Мова",
            "design_glass": "Скляність",
            "design_apply": "Застосувати",
            "design_cancel": "Скасувати",
            "design_saved": "Налаштування дизайну збережено",
            "preset_logs": "Логи",
            "preset_temp": "Тимчасові",
            "preset_media": "Медіа",
            "preset_clear": "Скинути",
            "tip_drop": "Можна перетягувати папки сюди з Провідника",
            "select_folder": "Виберіть папку",
            "msg_folder": "Папка",
            "msg_select_folder": "Виберіть папку у списку",
            "msg_folder_unavailable": "Папка недоступна",
            "msg_open_failed": "Не вдалося відкрити: {error}",
            "msg_list_cleared": "Список папок очищено",
            "msg_added_dd": "Додано через drag-and-drop: {count}",
            "msg_preset_logs": "Застосовано пресет: Логи",
            "msg_preset_temp": "Застосовано пресет: Тимчасові",
            "msg_preset_media": "Застосовано пресет: Медіа",
            "msg_preset_clear": "Пресет скинуто",
            "msg_added_folder": "Додано папку: {folder}",
            "msg_removed_folder": "Видалено папку: {folder}",
            "error": "Помилка",
            "error_days": "Поле 'Старше (днів)' має бути додатним цілим",
            "error_size": "Поле 'Мін. розмір' має бути невід'ємним числом",
            "preview_analyzing": "Аналізуємо папки...",
            "preview_started": "Попередній перегляд запущено",
            "preview_empty": "Немає файлів за поточними правилами",
            "preview_done_empty": "Перегляд завершено: збігів немає",
            "preview_done": "Перегляд завершено: знайдено {count} файлів",
            "preview_to_delete": "До видалення",
            "preview_period": "Період",
            "preview_types": "Типи",
            "preview_title": "Попередній перегляд",
            "preview_no_data": "Поки немає даних перегляду",
            "preview_details_title": "Деталі перегляду",
            "preview_first_records": "Показано перші записи:",
            "warn_add_folder": "Додайте хоча б одну папку",
            "cleanup_running": "Очищення виконується...",
            "cleanup_start": "Очищення запущено для {count} папок",
            "cleanup_stopping": "Зупиняємо...",
            "cleanup_stop_requested": "Запитано зупинку",
            "status_scanned_deleted": "Перевірено: {scanned} | Видалено: {deleted}",
            "done": "Готово",
            "done_message": "Видалено: {deleted} | Звільнено: {freed}",
            "msg_cleanup_done": "Очищення завершено",
            "summary_app": "Metsuki Cleaner Desktop",
            "summary_scanned": "Перевірено",
            "summary_matched": "Збігів",
            "summary_deleted": "Видалено",
            "summary_freed": "Звільнено",
            "summary_deleted_dirs": "Видалено папок",
            "summary_errors": "Помилки",
            "summary_mode_preview": "Режим: ПЕРЕГЛЯД",
            "summary_mode_delete": "Режим: ВИДАЛЕННЯ",
            "log_title": "Лог",
            "log_empty": "У цій сесії поки немає логу",
            "save_log_title": "Зберегти лог",
            "log_saved": "Лог успішно збережено",
            "log_saved_path": "Лог збережено: {path}",
            "log_save_failed": "Не вдалося зберегти лог: {error}",
            "help_title": "Допомога",
            "help_text": "1) Додайте папки або перетягніть їх\n2) Налаштуйте правила або виберіть пресет\n3) Оновіть перегляд\n4) Натисніть Запустити",
            "settings_restored": "Налаштування відновлено",
            "language_switched": "Мова інтерфейсу: UK",
            "welcome_title": "Ласкаво просимо до Metsuki Cleaner",
            "welcome_text": "Виберіть тему за замовчуванням для першого запуску.",
            "welcome_theme": "Тема інтерфейсу",
            "welcome_language": "Мова інтерфейсу",
            "welcome_confirm": "Підтвердити",
            "welcome_preview": "Попередній перегляд теми",
            "welcome_card_neon": "Neon • Яскравий",
            "welcome_card_minimal": "Minimal • Стриманий",
            "welcome_card_matrix": "Matrix • Кібер",
            "welcome_card_chrome": "Chrome • Метал",
            "loading": "Завантаження інтерфейсу...",
        },
        "de": {
            "window_title": "Metsuki Cleaner • Desktop",
            "title": "Metsuki Cleaner",
            "theme_neon": "Neon",
            "theme_minimal": "Dark Minimal",
            "theme_matrix": "Matrix",
            "theme_chrome": "Chrome",
            "folders": "Ordner",
            "settings": "Einstellungen",
            "older_days": "Älter als (Tage)",
            "min_size": "Min. Größe (MB)",
            "extensions": "Erweiterungen",
            "placeholder_ext": ".log,.tmp,.bak",
            "scan_subfolders": "Unterordner scannen",
            "delete_empty": "Leere Ordner löschen",
            "skip_hidden": "Versteckte überspringen",
            "dry_run": "Nur Vorschau",
            "add": "Hinzufügen",
            "folder_actions": "Aktionen",
            "open": "Öffnen",
            "remove": "Entfernen",
            "clear": "Leeren",
            "run": "Start",
            "stop": "Stopp",
            "refresh_preview": "Vorschau aktualisieren",
            "details_preview": "Details anzeigen",
            "status_ready": "Bereit",
            "dashboard": "Dashboard",
            "metric_scanned": "Gescannt",
            "metric_matched": "Treffer",
            "metric_deleted": "Gelöscht",
            "metric_freed": "Freigegeben",
            "preview_summary": "Vorschau-Zusammenfassung",
            "preview_no_folder": "Fügen Sie einen Ordner für die Vorschau hinzu",
            "activity": "Aktivität",
            "activity_ready": "• UI ist bereit. Fügen Sie Ordner hinzu und starten Sie die Bereinigung.",
            "save_log": "Log speichern",
            "help": "Hilfe",
            "developer_contact": "Support",
            "design_settings": "Design",
            "design_title": "Design-Einstellungen",
            "design_theme": "Thema",
            "design_language": "Sprache",
            "design_glass": "Glas-Intensität",
            "design_apply": "Anwenden",
            "design_cancel": "Abbrechen",
            "design_saved": "Design-Einstellungen gespeichert",
            "preset_logs": "Logs",
            "preset_temp": "Temporär",
            "preset_media": "Medien",
            "preset_clear": "Zurücksetzen",
            "tip_drop": "Ordner können per Drag-and-Drop hierher gezogen werden",
            "select_folder": "Ordner auswählen",
            "msg_folder": "Ordner",
            "msg_select_folder": "Wählen Sie einen Ordner in der Liste",
            "msg_folder_unavailable": "Ordner ist nicht verfügbar",
            "msg_open_failed": "Konnte nicht geöffnet werden: {error}",
            "msg_list_cleared": "Ordnerliste geleert",
            "msg_added_dd": "Per Drag-and-Drop hinzugefügt: {count}",
            "msg_preset_logs": "Preset angewendet: Logs",
            "msg_preset_temp": "Preset angewendet: Temporär",
            "msg_preset_media": "Preset angewendet: Medien",
            "msg_preset_clear": "Preset zurückgesetzt",
            "msg_added_folder": "Ordner hinzugefügt: {folder}",
            "msg_removed_folder": "Ordner entfernt: {folder}",
            "error": "Fehler",
            "error_days": "'Älter als (Tage)' muss eine positive ganze Zahl sein",
            "error_size": "'Min. Größe' muss eine nicht-negative Zahl sein",
            "preview_analyzing": "Ordner werden analysiert...",
            "preview_started": "Vorschau gestartet",
            "preview_empty": "Keine Dateien entsprechen den Regeln",
            "preview_done_empty": "Vorschau abgeschlossen: keine Treffer",
            "preview_done": "Vorschau abgeschlossen: {count} Dateien gefunden",
            "preview_to_delete": "Zu löschen",
            "preview_period": "Zeitraum",
            "preview_types": "Typen",
            "preview_title": "Vorschau",
            "preview_no_data": "Noch keine Vorschau-Daten",
            "preview_details_title": "Vorschau-Details",
            "preview_first_records": "Erste Einträge werden angezeigt:",
            "warn_add_folder": "Fügen Sie mindestens einen Ordner hinzu",
            "cleanup_running": "Bereinigung läuft...",
            "cleanup_start": "Bereinigung für {count} Ordner gestartet",
            "cleanup_stopping": "Wird gestoppt...",
            "cleanup_stop_requested": "Stopp angefordert",
            "status_scanned_deleted": "Gescannt: {scanned} | Gelöscht: {deleted}",
            "done": "Fertig",
            "done_message": "Gelöscht: {deleted} | Freigegeben: {freed}",
            "msg_cleanup_done": "Bereinigung abgeschlossen",
            "summary_app": "Metsuki Cleaner Desktop",
            "summary_scanned": "Gescannt",
            "summary_matched": "Treffer",
            "summary_deleted": "Gelöscht",
            "summary_freed": "Freigegeben",
            "summary_deleted_dirs": "Gelöschte Ordner",
            "summary_errors": "Fehler",
            "summary_mode_preview": "Modus: VORSCHAU",
            "summary_mode_delete": "Modus: LÖSCHEN",
            "log_title": "Log",
            "log_empty": "In dieser Sitzung gibt es noch keine Logs",
            "save_log_title": "Log speichern",
            "log_saved": "Log erfolgreich gespeichert",
            "log_saved_path": "Log gespeichert: {path}",
            "log_save_failed": "Log konnte nicht gespeichert werden: {error}",
            "help_title": "Hilfe",
            "help_text": "1) Ordner hinzufügen oder per Drag-and-Drop\n2) Regeln einstellen oder Preset wählen\n3) Vorschau aktualisieren\n4) Start drücken",
            "settings_restored": "Einstellungen wiederhergestellt",
            "language_switched": "UI-Sprache: DE",
            "welcome_title": "Willkommen bei Metsuki Cleaner",
            "welcome_text": "Wählen Sie Ihr Standard-Theme für den ersten Start.",
            "welcome_theme": "Oberflächen-Theme",
            "welcome_language": "Oberflächensprache",
            "welcome_confirm": "Bestätigen",
            "welcome_preview": "Theme-Vorschau",
            "welcome_card_neon": "Neon • Lebendig",
            "welcome_card_minimal": "Minimal • Klar",
            "welcome_card_matrix": "Matrix • Cyber",
            "welcome_card_chrome": "Chrome • Metallisch",
            "loading": "Oberfläche wird geladen...",
        },
    }
    THEMES = {
        "neon": {
            "bg": "#0b0626",
            "panel": "#120427",
            "panel_glass": "rgba(18, 4, 39, 0.52)",
            "panel_border": "#2b0d3a",
            "header": "#1b0f3a",
            "header_glass": "rgba(27, 15, 58, 0.62)",
            "header_border": "#3b1b5a",
            "metric": "#1b0f3a",
            "metric_glass": "rgba(27, 15, 58, 0.46)",
            "metric_border": "#3b1b5a",
            "text": "#f8f3ff",
            "muted": "#c9bff4",
            "section": "#FF82D5",
            "button": "#2b0d3a",
            "button_border": "#3b1b5a",
            "button_hover": "#3b1b5a",
            "accent": "#ff2d95",
            "accent_border": "#ff5ba6",
            "accent_hover": "#ff5ba6",
            "danger": "#C04889",
            "danger_border": "#DB5AA0",
            "danger_hover": "#DB5AA0",
            "field": "rgba(11, 6, 38, 0.55)",
            "field_border": "#2b0d3a",
            "selection": "#ff2d95",
            "checkbox": "#3b1b5a",
            "checkbox_checked": "#ff2d95",
            "progress": "#ff2d95",
            "glow": "#ff2d95",
        },
        "minimal": {
            "bg": "#101215",
            "panel": "#161A1E",
            "panel_glass": "rgba(22, 26, 30, 0.56)",
            "panel_border": "#2D333B",
            "header": "#1B2026",
            "header_glass": "rgba(27, 32, 38, 0.66)",
            "header_border": "#3A444F",
            "metric": "#14181D",
            "metric_glass": "rgba(20, 24, 29, 0.48)",
            "metric_border": "#343D47",
            "text": "#F0F2F5",
            "muted": "#A7B1BC",
            "section": "#8DB8FF",
            "button": "#2B394A",
            "button_border": "#42556B",
            "button_hover": "#34475F",
            "accent": "#3C7DFF",
            "accent_border": "#5E95FF",
            "accent_hover": "#5590FF",
            "danger": "#A25566",
            "danger_border": "#BF6C7E",
            "danger_hover": "#B96375",
            "field": "rgba(15, 18, 22, 0.58)",
            "field_border": "#303944",
            "selection": "#3C7DFF",
            "checkbox": "#5A6B7C",
            "checkbox_checked": "#3C7DFF",
            "progress": "#3C7DFF",
            "glow": "#3C7DFF",
        },
        "matrix": {
            "bg": "#030603",
            "panel": "rgba(5, 20, 8, 0.72)",
            "panel_glass": "rgba(5, 20, 8, 0.52)",
            "panel_border": "#0f5a24",
            "header": "rgba(8, 28, 12, 0.82)",
            "header_glass": "rgba(8, 28, 12, 0.62)",
            "header_border": "#1f7a38",
            "metric": "rgba(7, 24, 10, 0.72)",
            "metric_glass": "rgba(7, 24, 10, 0.46)",
            "metric_border": "#14642b",
            "text": "#dbffe5",
            "muted": "#7ac68e",
            "section": "#3cff78",
            "button": "rgba(8, 30, 12, 0.78)",
            "button_border": "#1f7a38",
            "button_hover": "rgba(14, 45, 18, 0.88)",
            "accent": "#19d24d",
            "accent_border": "#52ff82",
            "accent_hover": "#39ef68",
            "danger": "#376d46",
            "danger_border": "#53a368",
            "danger_hover": "#4d8f5d",
            "field": "rgba(5, 18, 8, 0.52)",
            "field_border": "#0f5a24",
            "selection": "#19d24d",
            "checkbox": "#1f7a38",
            "checkbox_checked": "#39ef68",
            "progress": "#1ee65a",
            "glow": "#39ef68",
        },
        "chrome": {
            "bg": "#0F1114",
            "panel": "#1A1D22",
            "panel_glass": "rgba(26, 29, 34, 0.64)",
            "panel_border": "#4C535D",
            "header": "#22262D",
            "header_glass": "rgba(34, 38, 45, 0.74)",
            "header_border": "#666E79",
            "metric": "#171A1F",
            "metric_glass": "rgba(23, 26, 31, 0.58)",
            "metric_border": "#565D66",
            "text": "#EEF1F5",
            "muted": "#AEB5BE",
            "section": "#D7DBE2",
            "button": "#2B3038",
            "button_border": "#616975",
            "button_hover": "#3A414A",
            "accent": "#8D949E",
            "accent_border": "#B9C0C9",
            "accent_hover": "#A7AFB8",
            "danger": "#5B6068",
            "danger_border": "#7A828C",
            "danger_hover": "#6B727B",
            "field": "rgba(20, 23, 28, 0.66)",
            "field_border": "#555D68",
            "selection": "#9FA6AF",
            "checkbox": "#727A85",
            "checkbox_checked": "#C4CAD2",
            "progress": "#BDC3CC",
            "glow": "#C9D0D8",
        },
    }

    TYPE_GROUPS = {
        "Image": {"jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tif", "tiff", "heic", "raw"},
        "Video": {"mp4", "mkv", "avi", "mov", "wmv", "webm", "flv", "m4v", "3gp"},
        "Audio": {"mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"},
        "Document": {"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "odt", "csv", "md"},
        "Archive": {"zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso"},
        "Executable": {"exe", "msi", "bat", "cmd", "dll", "sys", "com", "ps1", "apk"},
        "Script": {"py", "js", "ts", "sh", "vbs", "php", "pl", "rb", "lua"},
        "Database": {"db", "sqlite", "sqlite3", "mdb", "accdb", "sql"},
        "Log": {"log"},
        "Temporary": {"tmp", "temp", "bak", "old", "cache"},
        "Config": {"ini", "cfg", "conf", "yaml", "yml", "json", "xml", "toml"},
    }

    def __init__(self):
        super().__init__()
        self.base_path = os.path.dirname(os.path.abspath(__file__))
        self.settings_path = os.path.join(self.base_path, "qt_settings.json")
        self.current_theme_key = "neon"
        self.current_language = "ru"
        self.glass_intensity = 1.0
        self.onboarding_completed = False
        self.setWindowTitle("Metsuki Cleaner • Desktop")
        self.resize(1220, 800)
        self.setMinimumSize(1000, 680)

        self.result_queue = queue.Queue()
        self.preview_queue = queue.Queue()
        self.stop_event = threading.Event()
        self.cleaning_thread = None
        self.preview_thread = None
        self.preview_token = 0
        self._preview_loading_tick = 0
        self._preview_loading_base_text = ""
        self.log_messages = []
        self.preview_lines = []

        self._set_window_branding()

        self._build_ui()
        self._apply_language()
        self._apply_styles()
        self._load_settings()

        self.queue_timer = QTimer(self)
        self.queue_timer.timeout.connect(self._poll_queues)
        self.queue_timer.start(130)

    def _set_window_branding(self):
        icon_candidates = [
            os.path.join(self.base_path, "icon.ico"),
            os.path.join(self.base_path, "icon.png"),
        ]
        for icon_path in icon_candidates:
            if os.path.exists(icon_path):
                self.setWindowIcon(QIcon(icon_path))
                break

    def _build_ui(self):
        grid = 8
        root = QWidget(self)
        self.setCentralWidget(root)

        self.animated_bg = AnimatedBackgroundWidget(root)
        self.animated_bg.setGeometry(root.rect())
        self.animated_bg.lower()

        outer = QVBoxLayout(root)
        outer.setContentsMargins(grid * 2, grid * 2, grid * 2, grid * 2)
        outer.setSpacing(grid)

        header = QFrame()
        header.setObjectName("Header")
        self.header_frame = header
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(grid * 2, grid * 2, grid * 2, grid * 2)

        self.left_icon_label = QLabel()
        self.left_icon_label.setObjectName("Logo")
        icon_png_path = os.path.join(self.base_path, "icon.png")
        if os.path.exists(icon_png_path):
            icon_pixmap = QPixmap(icon_png_path)
            if not icon_pixmap.isNull():
                self.left_icon_label.setPixmap(
                    icon_pixmap.scaled(56, 56, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
                )
        header_layout.addWidget(self.left_icon_label, 0, Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)

        title_wrap = QVBoxLayout()
        title_wrap.setSpacing(grid // 2)

        self.title_label = QLabel("Metsuki Cleaner")
        self.title_label.setObjectName("Title")
        title_wrap.addWidget(self.title_label)
        header_layout.addLayout(title_wrap, 1)

        self.theme_combo = QComboBox()
        self.theme_combo.addItem("Neon", "neon")
        self.theme_combo.addItem("Dark Minimal", "minimal")
        self.theme_combo.addItem("Matrix", "matrix")
        self.theme_combo.addItem("Chrome", "chrome")
        self.theme_combo.currentIndexChanged.connect(self._on_theme_changed)

        self.language_combo = QComboBox()
        self.language_combo.addItem("RU", "ru")
        self.language_combo.addItem("UKR", "uk")
        self.language_combo.addItem("DE", "de")
        self.language_combo.addItem("EN", "en")
        self.language_combo.currentIndexChanged.connect(self._on_language_changed)

        logo_path = os.path.join(self.base_path, "logo.png")
        self.logo_label = QLabel()
        self.logo_label.setObjectName("Logo")
        if os.path.exists(logo_path):
            logo_pixmap = QPixmap(logo_path)
            if not logo_pixmap.isNull():
                self.logo_label.setPixmap(logo_pixmap.scaled(70, 70, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))

            right_controls = QVBoxLayout()
            right_controls.setSpacing(grid)
            right_controls.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            right_controls.addWidget(self.logo_label, 0, Qt.AlignmentFlag.AlignRight)

            header_layout.addLayout(right_controls)
        outer.addWidget(header)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        outer.addWidget(splitter, 1)

        left = QFrame()
        self.left_panel = left
        left.setMinimumWidth(420)
        left.setMaximumWidth(580)
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(grid * 2, grid * 2, grid * 2, grid * 2)
        left_layout.setSpacing(grid)

        self.folders_title = QLabel("Папки")
        self.folders_title.setObjectName("Section")
        left_layout.addWidget(self.folders_title)

        self.action_toolbar = QFrame()
        self.action_toolbar.setObjectName("Toolbar")
        toolbar_layout = QHBoxLayout(self.action_toolbar)
        toolbar_layout.setContentsMargins(grid, grid, grid, grid)
        toolbar_layout.setSpacing(grid)

        self.run_btn = QPushButton("Запустить")
        self.run_btn.setObjectName("Accent")
        self.preview_btn = QPushButton("Обновить предпросмотр")
        self.preview_btn.setObjectName("Quiet")
        self.stop_btn = QPushButton("Стоп")
        self.stop_btn.setObjectName("Danger")
        self.stop_btn.setEnabled(False)

        toolbar_layout.addWidget(self.run_btn)
        toolbar_layout.addWidget(self.preview_btn)
        toolbar_layout.addWidget(self.stop_btn)
        left_layout.addWidget(self.action_toolbar)

        self.folders_list = FolderListWidget(drop_callback=self._on_folders_dropped)
        self.folders_list.setToolTip("Можно перетаскивать папки сюда из проводника")
        left_layout.addWidget(self.folders_list, 1)

        folder_buttons = QHBoxLayout()
        folder_buttons.setSpacing(grid)
        self.add_folder_btn = QPushButton("Добавить")
        self.folder_actions_btn = QToolButton()
        self.folder_actions_btn.setObjectName("GhostTool")
        self.folder_actions_btn.setPopupMode(QToolButton.ToolButtonPopupMode.InstantPopup)
        self.folder_actions_menu = QMenu(self.folder_actions_btn)
        self.open_folder_action = self.folder_actions_menu.addAction("")
        self.remove_folder_action = self.folder_actions_menu.addAction("")
        self.clear_folders_action = self.folder_actions_menu.addAction("")
        self.folder_actions_btn.setMenu(self.folder_actions_menu)
        folder_buttons.addWidget(self.add_folder_btn)
        folder_buttons.addWidget(self.folder_actions_btn)
        left_layout.addLayout(folder_buttons)

        self.settings_title = QLabel("Настройки")
        self.settings_title.setObjectName("Section")
        left_layout.addWidget(self.settings_title)

        form = QFormLayout()
        form.setLabelAlignment(Qt.AlignmentFlag.AlignLeft)
        form.setHorizontalSpacing(grid)
        form.setVerticalSpacing(grid)
        self.days_edit = QLineEdit("5")
        self.size_edit = QLineEdit("0")
        self.ext_edit = QLineEdit("")
        self.ext_edit.setPlaceholderText(".log,.tmp,.bak")
        self.form_labels = [QLabel(""), QLabel(""), QLabel("")]
        for label in self.form_labels:
            label.setMinimumWidth(136)
        form.addRow(self.form_labels[0], self.days_edit)
        form.addRow(self.form_labels[1], self.size_edit)
        form.addRow(self.form_labels[2], self.ext_edit)
        left_layout.addLayout(form)

        preset_row = QHBoxLayout()
        preset_row.setSpacing(grid)
        self.preset_logs_btn = QPushButton("Логи")
        self.preset_temp_btn = QPushButton("Временные")
        self.preset_media_btn = QPushButton("Медиа")
        self.preset_clear_btn = QPushButton("Сброс")
        preset_row.addWidget(self.preset_logs_btn)
        preset_row.addWidget(self.preset_temp_btn)
        preset_row.addWidget(self.preset_media_btn)
        preset_row.addWidget(self.preset_clear_btn)
        left_layout.addLayout(preset_row)

        self.scan_subfolders = QCheckBox("Сканировать подпапки")
        self.scan_subfolders.setChecked(True)
        self.delete_empty = QCheckBox("Удалять пустые папки")
        self.skip_hidden = QCheckBox("Пропускать скрытые")
        self.skip_hidden.setChecked(True)
        self.dry_run = QCheckBox("Только предпросмотр")
        left_layout.addWidget(self.scan_subfolders)
        left_layout.addWidget(self.delete_empty)
        left_layout.addWidget(self.skip_hidden)
        left_layout.addWidget(self.dry_run)

        secondary_row = QHBoxLayout()
        secondary_row.setSpacing(grid)
        self.preview_details_btn = QPushButton("Показать детали")
        self.preview_details_btn.setObjectName("Quiet")
        secondary_row.addWidget(self.preview_details_btn)
        secondary_row.addStretch(1)
        left_layout.addLayout(secondary_row)

        self.progress = QProgressBar()
        self.progress.setRange(0, 1)
        self.progress.setValue(0)
        left_layout.addWidget(self.progress)

        self.status_label = QLabel("Готово")
        self.status_label.setObjectName("Muted")
        left_layout.addWidget(self.status_label)

        right = QFrame()
        self.right_panel = right
        right_layout = QVBoxLayout(right)
        right_layout.setContentsMargins(grid * 2, grid * 2, grid * 2, grid * 2)
        right_layout.setSpacing(grid)

        self.dashboard_title = QLabel("Панель")
        self.dashboard_title.setObjectName("Section")
        right_layout.addWidget(self.dashboard_title)

        metrics = QGridLayout()
        metrics.setHorizontalSpacing(grid)
        metrics.setVerticalSpacing(grid)
        self.metric_scanned = self._metric_card("Проверено")
        self.metric_matched = self._metric_card("Подходит")
        self.metric_deleted = self._metric_card("Удалено")
        self.metric_freed = self._metric_card("Освобождено")
        self.metric_frames = [
            self.metric_scanned["frame"],
            self.metric_matched["frame"],
            self.metric_deleted["frame"],
            self.metric_freed["frame"],
        ]
        metrics.addWidget(self.metric_scanned["frame"], 0, 0)
        metrics.addWidget(self.metric_matched["frame"], 0, 1)
        metrics.addWidget(self.metric_deleted["frame"], 1, 0)
        metrics.addWidget(self.metric_freed["frame"], 1, 1)
        right_layout.addLayout(metrics)

        self.preview_title = QLabel("Сводка предпросмотра")
        self.preview_title.setObjectName("Section")
        right_layout.addWidget(self.preview_title)

        self.preview_summary = QLabel("Добавьте папку для предпросмотра")
        self.preview_summary.setWordWrap(True)
        self.preview_summary.setObjectName("Muted")
        right_layout.addWidget(self.preview_summary)

        self.logs_title = QLabel("Активность")
        self.logs_title.setObjectName("Section")
        right_layout.addWidget(self.logs_title)

        self.activity = QTextEdit()
        self.activity.setReadOnly(True)
        self.activity.setText("")
        right_layout.addWidget(self.activity, 1)

        foot = QHBoxLayout()
        foot.setSpacing(grid)
        self.save_log_btn = QPushButton("Сохранить лог")
        self.help_btn = QPushButton("Помощь")
        self.help_btn.setObjectName("Quiet")
        self.design_btn = QPushButton("Дизайн")
        self.language_footer_combo = QComboBox()
        self.language_footer_combo.setObjectName("CompactCombo")
        self.language_footer_combo.addItem("RU", "ru")
        self.language_footer_combo.addItem("UKR", "uk")
        self.language_footer_combo.addItem("DE", "de")
        self.language_footer_combo.addItem("EN", "en")
        self.language_footer_combo.setCurrentIndex(max(0, self.language_footer_combo.findData(self.current_language)))
        self.dev_contact_btn = QPushButton("Me tsu ki • Developer")
        self.dev_contact_btn.setObjectName("LinkButton")
        foot.addWidget(self.save_log_btn)
        foot.addWidget(self.help_btn)
        foot.addWidget(self.design_btn)
        foot.addStretch(1)
        foot.addWidget(self.language_footer_combo)
        foot.addWidget(self.dev_contact_btn)
        right_layout.addLayout(foot)

        splitter.addWidget(left)
        splitter.addWidget(right)
        splitter.setHandleWidth(grid)
        splitter.setStretchFactor(0, 6)
        splitter.setStretchFactor(1, 7)
        splitter.setSizes([500, 780])

        self.add_folder_btn.clicked.connect(self.add_folder)
        self.open_folder_action.triggered.connect(self.open_selected_folder)
        self.remove_folder_action.triggered.connect(self.remove_folder)
        self.clear_folders_action.triggered.connect(self.clear_folders)
        self.preset_logs_btn.clicked.connect(lambda: self._set_extension_preset("logs"))
        self.preset_temp_btn.clicked.connect(lambda: self._set_extension_preset("temp"))
        self.preset_media_btn.clicked.connect(lambda: self._set_extension_preset("media"))
        self.preset_clear_btn.clicked.connect(lambda: self._set_extension_preset("clear"))
        self.preview_btn.clicked.connect(self.refresh_preview)
        self.preview_details_btn.clicked.connect(self.show_preview_details)
        self.run_btn.clicked.connect(self.start_cleanup)
        self.stop_btn.clicked.connect(self.stop_cleanup)
        self.save_log_btn.clicked.connect(self.save_log)
        self.help_btn.clicked.connect(self.show_help)
        self.design_btn.clicked.connect(self.open_design_settings)
        self.language_footer_combo.currentIndexChanged.connect(self._on_language_changed)
        self.dev_contact_btn.clicked.connect(self.open_support)

        self.run_btn.setToolTip("Ctrl+R")
        self.preview_btn.setToolTip("Ctrl+P")
        self.stop_btn.setToolTip("Esc")
        self.preview_details_btn.setToolTip("Ctrl+D")

        self._setup_shortcuts()

    def resizeEvent(self, event):
        super().resizeEvent(event)
        if hasattr(self, "animated_bg") and self.centralWidget() is not None:
            self.animated_bg.setGeometry(self.centralWidget().rect())

    def _apply_button_icons(self):
        style = self.style()
        self.run_btn.setIcon(style.standardIcon(QStyle.StandardPixmap.SP_MediaPlay))
        self.stop_btn.setIcon(style.standardIcon(QStyle.StandardPixmap.SP_MediaStop))
        self.preview_btn.setIcon(style.standardIcon(QStyle.StandardPixmap.SP_BrowserReload))
        self.preview_details_btn.setIcon(style.standardIcon(QStyle.StandardPixmap.SP_FileDialogDetailedView))
        self.add_folder_btn.setIcon(style.standardIcon(QStyle.StandardPixmap.SP_FileDialogNewFolder))
        self.folder_actions_btn.setIcon(style.standardIcon(QStyle.StandardPixmap.SP_TitleBarUnshadeButton))
        self.save_log_btn.setIcon(style.standardIcon(QStyle.StandardPixmap.SP_DialogSaveButton))
        self.help_btn.setIcon(style.standardIcon(QStyle.StandardPixmap.SP_DialogHelpButton))
        self.design_btn.setIcon(style.standardIcon(QStyle.StandardPixmap.SP_FileDialogContentsView))
        self.dev_contact_btn.setIcon(style.standardIcon(QStyle.StandardPixmap.SP_CommandLink))

    def _setup_shortcuts(self):
        self.shortcut_run = QShortcut(QKeySequence("Ctrl+R"), self)
        self.shortcut_run.activated.connect(self.start_cleanup)

        self.shortcut_preview = QShortcut(QKeySequence("Ctrl+P"), self)
        self.shortcut_preview.activated.connect(self.refresh_preview)

        self.shortcut_details = QShortcut(QKeySequence("Ctrl+D"), self)
        self.shortcut_details.activated.connect(self.show_preview_details)

        self.shortcut_stop = QShortcut(QKeySequence("Esc"), self)
        self.shortcut_stop.activated.connect(self.stop_cleanup)

    def _start_preview_loading(self):
        self._preview_loading_base_text = self.tr("preview_analyzing")
        self._preview_loading_tick = 0
        self.preview_summary.setText(self._preview_loading_base_text)
        if not hasattr(self, "preview_loading_timer"):
            self.preview_loading_timer = QTimer(self)
            self.preview_loading_timer.timeout.connect(self._animate_preview_loading)
        self.preview_loading_timer.start(240)

    def _animate_preview_loading(self):
        self._preview_loading_tick = (self._preview_loading_tick + 1) % 4
        dots = "." * self._preview_loading_tick
        self.preview_summary.setText(f"{self._preview_loading_base_text}{dots}")

    def _stop_preview_loading(self):
        if hasattr(self, "preview_loading_timer"):
            self.preview_loading_timer.stop()

    def _metric_card(self, title_text):
        frame = QFrame()
        frame.setObjectName("Metric")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(8)
        title = QLabel(title_text)
        title.setObjectName("Muted")
        value = QLabel("0")
        value.setObjectName("MetricValue")
        layout.addWidget(title)
        layout.addWidget(value)
        return {"frame": frame, "title": title, "value": value}

    def tr(self, key, **kwargs):
        text = self.LOCALES.get(self.current_language, self.LOCALES["ru"]).get(key, key)
        if kwargs:
            try:
                return text.format(**kwargs)
            except Exception:
                return text
        return text

    def _apply_language(self):
        self.setWindowTitle(self.tr("window_title"))
        self.title_label.setText(self.tr("title"))
        self.theme_combo.setItemText(0, self.tr("theme_neon"))
        self.theme_combo.setItemText(1, self.tr("theme_minimal"))
        self.theme_combo.setItemText(2, self.tr("theme_matrix"))
        self.theme_combo.setItemText(3, self.tr("theme_chrome"))
        if hasattr(self, "language_footer_combo"):
            self.language_footer_combo.blockSignals(True)
            self.language_footer_combo.setCurrentIndex(max(0, self.language_footer_combo.findData(self.current_language)))
            self.language_footer_combo.blockSignals(False)
        if hasattr(self, "language_combo"):
            self.language_combo.blockSignals(True)
            self.language_combo.setCurrentIndex(max(0, self.language_combo.findData(self.current_language)))
            self.language_combo.blockSignals(False)

        self.folders_title.setText(self.tr("folders"))
        self.settings_title.setText(self.tr("settings"))
        self.form_labels[0].setText(self.tr("older_days"))
        self.form_labels[1].setText(self.tr("min_size"))
        self.form_labels[2].setText(self.tr("extensions"))
        self.ext_edit.setPlaceholderText(self.tr("placeholder_ext"))

        self.add_folder_btn.setText(self.tr("add"))
        self.folder_actions_btn.setText(self.tr("folder_actions"))
        self.open_folder_action.setText(self.tr("open"))
        self.remove_folder_action.setText(self.tr("remove"))
        self.clear_folders_action.setText(self.tr("clear"))
        self.preset_logs_btn.setText(self.tr("preset_logs"))
        self.preset_temp_btn.setText(self.tr("preset_temp"))
        self.preset_media_btn.setText(self.tr("preset_media"))
        self.preset_clear_btn.setText(self.tr("preset_clear"))

        self.scan_subfolders.setText(self.tr("scan_subfolders"))
        self.delete_empty.setText(self.tr("delete_empty"))
        self.skip_hidden.setText(self.tr("skip_hidden"))
        self.dry_run.setText(self.tr("dry_run"))
        self.run_btn.setText(self.tr("run"))
        self.stop_btn.setText(self.tr("stop"))
        self.preview_btn.setText(self.tr("refresh_preview"))
        self.preview_details_btn.setText(self.tr("details_preview"))
        self.status_label.setText(self.tr("status_ready"))

        self.dashboard_title.setText(self.tr("dashboard"))
        self.metric_scanned["title"].setText(self.tr("metric_scanned"))
        self.metric_matched["title"].setText(self.tr("metric_matched"))
        self.metric_deleted["title"].setText(self.tr("metric_deleted"))
        self.metric_freed["title"].setText(self.tr("metric_freed"))

        self.preview_title.setText(self.tr("preview_summary"))
        if not self.preview_lines:
            self.preview_summary.setText(self.tr("preview_no_folder"))
        self.logs_title.setText(self.tr("activity"))
        self.save_log_btn.setText(self.tr("save_log"))
        self.help_btn.setText(self.tr("help"))
        self.design_btn.setText(self.tr("design_settings"))
        self.dev_contact_btn.setText(self.tr("developer_contact"))
        self.folders_list.setToolTip(self.tr("tip_drop"))
        self._apply_button_icons()

        ready_variants = {locale["activity_ready"] for locale in self.LOCALES.values()}
        current_activity = self.activity.toPlainText().strip()
        if current_activity in ready_variants or current_activity == "":
            self.activity.setText(self.tr("activity_ready"))

    def _on_language_changed(self, _index):
        sender = self.sender()
        if sender is self.language_footer_combo:
            selected = self.language_footer_combo.currentData()
        else:
            selected = self.language_combo.currentData()
        if not selected or selected == self.current_language:
            return
        self.current_language = selected
        if hasattr(self, "language_footer_combo"):
            footer_index = self.language_footer_combo.findData(selected)
            if footer_index >= 0 and footer_index != self.language_footer_combo.currentIndex():
                self.language_footer_combo.blockSignals(True)
                self.language_footer_combo.setCurrentIndex(footer_index)
                self.language_footer_combo.blockSignals(False)
        if hasattr(self, "language_combo"):
            internal_index = self.language_combo.findData(selected)
            if internal_index >= 0 and internal_index != self.language_combo.currentIndex():
                self.language_combo.blockSignals(True)
                self.language_combo.setCurrentIndex(internal_index)
                self.language_combo.blockSignals(False)
        self._apply_language()
        self._append_activity(self.tr("language_switched"))

    def _show_first_run_dialog_if_needed(self):
        if self.onboarding_completed:
            return

        dialog = QDialog(self)
        dialog.setWindowTitle(self.tr("welcome_title"))
        dialog.setModal(True)
        dialog.setMinimumSize(560, 520)

        layout = QVBoxLayout(dialog)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        dialog.setStyleSheet(
            """
            QDialog {
                background: #120A22;
            }
            QLabel#WelcomeTitle {
                color: #F5EEFF;
                font-size: 20px;
                font-weight: 700;
            }
            QLabel#WelcomeMuted {
                color: #B7A8D8;
            }
            QFrame#ThemePreview {
                border: 1px solid #46306E;
                border-radius: 12px;
                background: #1A1031;
            }
            QPushButton#ThemeCard {
                border: 1px solid #5D3EE8;
                border-radius: 10px;
                background: #1B1036;
                color: #F3EEFF;
                min-height: 42px;
                font-weight: 600;
            }
            QPushButton#ThemeCard:hover {
                background: #28174A;
                border: 1px solid #7A5CFF;
            }
            QPushButton#ThemeCard[active="true"] {
                border: 2px solid #EC4BB8;
                background: #2D1650;
            }
            """
        )

        logo_path = os.path.join(self.base_path, "logo.png")
        logo_label = QLabel()
        logo_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        if os.path.exists(logo_path):
            logo_pix = QPixmap(logo_path)
            if not logo_pix.isNull():
                logo_label.setPixmap(logo_pix.scaled(110, 110, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        layout.addWidget(logo_label)

        title_label = QLabel(self.tr("welcome_title"))
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title_label.setObjectName("WelcomeTitle")
        layout.addWidget(title_label)

        text_label = QLabel(self.tr("welcome_text"))
        text_label.setWordWrap(True)
        text_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        text_label.setObjectName("WelcomeMuted")
        layout.addWidget(text_label)

        theme_caption = QLabel(self.tr("welcome_theme"))
        theme_caption.setObjectName("WelcomeMuted")
        layout.addWidget(theme_caption)

        language_row = QHBoxLayout()
        language_caption = QLabel(self.tr("welcome_language"))
        language_caption.setObjectName("WelcomeMuted")
        language_combo = QComboBox()
        language_combo.addItem("RU", "ru")
        language_combo.addItem("UKR", "uk")
        language_combo.addItem("DE", "de")
        language_combo.addItem("EN", "en")
        language_combo.setCurrentIndex(max(0, language_combo.findData(self.current_language)))
        language_row.addWidget(language_caption)
        language_row.addWidget(language_combo)
        layout.addLayout(language_row)

        preview_caption = QLabel(self.tr("welcome_preview"))
        preview_caption.setObjectName("WelcomeMuted")
        layout.addWidget(preview_caption)

        cards_row = QHBoxLayout()
        neon_card = QPushButton(self.tr("welcome_card_neon"))
        neon_card.setObjectName("ThemeCard")
        minimal_card = QPushButton(self.tr("welcome_card_minimal"))
        minimal_card.setObjectName("ThemeCard")
        matrix_card = QPushButton(self.tr("welcome_card_matrix"))
        matrix_card.setObjectName("ThemeCard")
        chrome_card = QPushButton(self.tr("welcome_card_chrome"))
        chrome_card.setObjectName("ThemeCard")
        cards_row.addWidget(neon_card)
        cards_row.addWidget(minimal_card)
        cards_row.addWidget(matrix_card)
        cards_row.addWidget(chrome_card)
        layout.addLayout(cards_row)

        selected_theme = self.current_theme_key if self.current_theme_key in self.THEMES else "neon"

        preview_frame = QFrame()
        preview_frame.setObjectName("ThemePreview")
        preview_layout = QVBoxLayout(preview_frame)
        preview_layout.setContentsMargins(12, 12, 12, 12)
        preview_title = QLabel("Metsuki Cleaner")
        preview_title.setStyleSheet("font-size: 18px; font-weight: 700;")
        preview_text = QLabel("Sample preview card and accent")
        preview_text.setObjectName("WelcomeMuted")
        preview_button = QPushButton("Action")
        preview_button.setObjectName("Accent")
        preview_layout.addWidget(preview_title)
        preview_layout.addWidget(preview_text)
        preview_layout.addWidget(preview_button, 0, Qt.AlignmentFlag.AlignLeft)
        layout.addWidget(preview_frame)

        def set_active_card(theme_key):
            neon_card.setProperty("active", "true" if theme_key == "neon" else "false")
            minimal_card.setProperty("active", "true" if theme_key == "minimal" else "false")
            matrix_card.setProperty("active", "true" if theme_key == "matrix" else "false")
            chrome_card.setProperty("active", "true" if theme_key == "chrome" else "false")

            for button in (neon_card, minimal_card, matrix_card, chrome_card):
                button.style().unpolish(button)
                button.style().polish(button)
                button.update()

            palette = self.THEMES.get(theme_key, self.THEMES["neon"])
            preview_frame.setStyleSheet(
                f"QFrame#ThemePreview {{ border: 1px solid {palette['panel_border']}; border-radius: 12px; background: {palette['panel']}; }}"
            )
            preview_title.setStyleSheet(f"font-size: 18px; font-weight: 700; color: {palette['text']};")
            preview_text.setStyleSheet(f"color: {palette['muted']};")
            preview_button.setStyleSheet(
                f"QPushButton {{ background: {palette['accent']}; border: 1px solid {palette['accent_border']}; border-radius: 8px; min-height: 30px; padding: 0 12px; }}"
                f"QPushButton:hover {{ background: {palette['accent_hover']}; }}"
            )

        def on_theme_changed_ui(theme_key):
            nonlocal selected_theme
            if theme_key not in self.THEMES:
                return
            selected_theme = theme_key
            set_active_card(theme_key)

        neon_card.clicked.connect(lambda: on_theme_changed_ui("neon"))
        minimal_card.clicked.connect(lambda: on_theme_changed_ui("minimal"))
        matrix_card.clicked.connect(lambda: on_theme_changed_ui("matrix"))
        chrome_card.clicked.connect(lambda: on_theme_changed_ui("chrome"))
        set_active_card(selected_theme)

        confirm_btn = QPushButton(self.tr("welcome_confirm"))
        confirm_btn.setObjectName("Accent")
        confirm_btn.clicked.connect(dialog.accept)
        layout.addWidget(confirm_btn, 0, Qt.AlignmentFlag.AlignCenter)

        if dialog.exec() == QDialog.DialogCode.Accepted:
            if selected_theme in self.THEMES:
                self.current_theme_key = selected_theme
                index = self.theme_combo.findData(selected_theme)
                if index >= 0:
                    self.theme_combo.blockSignals(True)
                    self.theme_combo.setCurrentIndex(index)
                    self.theme_combo.blockSignals(False)

            selected_language = language_combo.currentData()
            if selected_language in self.LOCALES:
                self.current_language = selected_language
                footer_index = self.language_footer_combo.findData(selected_language)
                if footer_index >= 0:
                    self.language_footer_combo.blockSignals(True)
                    self.language_footer_combo.setCurrentIndex(footer_index)
                    self.language_footer_combo.blockSignals(False)
                internal_index = self.language_combo.findData(selected_language)
                if internal_index >= 0:
                    self.language_combo.blockSignals(True)
                    self.language_combo.setCurrentIndex(internal_index)
                    self.language_combo.blockSignals(False)
                self._apply_language()

                self._apply_styles()

            self.onboarding_completed = True
            self._save_settings()

    def _apply_styles(self):
        palette = dict(self.THEMES.get(self.current_theme_key, self.THEMES["neon"]))
        glass_factor = max(0.4, min(1.4, float(self.glass_intensity)))
        radius_panel = 10
        radius_button = 8
        radius_field = 8
        button_height = 30
        font_size = 13
        control_padding = "4px 10px"
        palette["panel_glass"] = self._scaled_alpha(palette.get("panel_glass", "rgba(0,0,0,0.65)"), glass_factor)
        palette["header_glass"] = self._scaled_alpha(palette.get("header_glass", "rgba(0,0,0,0.75)"), glass_factor)
        palette["metric_glass"] = self._scaled_alpha(palette.get("metric_glass", "rgba(0,0,0,0.55)"), glass_factor)
        palette["field"] = self._scaled_alpha(palette.get("field", "rgba(0,0,0,0.45)"), glass_factor)
        palette.update(
            {
                "radius_panel": radius_panel,
                "radius_button": radius_button,
                "radius_field": radius_field,
                "button_height": button_height,
                "font_size": font_size,
                "control_padding": control_padding,
            }
        )
        self.setStyleSheet(
            """
            QMainWindow {{
                background: {bg};
            }}
            QWidget {{
                background: transparent;
                color: {text};
                font-size: {font_size}px;
                font-family: Segoe UI;
            }}
            QFrame {{
                background: {panel_glass};
                border: 1px solid {panel_border};
                border-radius: {radius_panel}px;
            }}
            QFrame#Header {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 {header_glass}, stop:1 {panel_glass});
                border: 1px solid {header_border};
                border-radius: {radius_panel}px;
            }}
            QFrame#Toolbar {{
                background: {field};
                border: 1px solid {field_border};
                border-radius: {radius_field}px;
            }}
            QFrame#Metric {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 {metric_glass}, stop:1 {panel_glass});
                border: 1px solid {metric_border};
                border-radius: {radius_panel}px;
            }}
            QLabel#Title {{
                font-size: 30px;
                font-weight: 700;
                color: {text};
            }}
            QLabel#Subtitle, QLabel#Muted {{
                color: {muted};
            }}
            QLabel#Logo {{
                border: none;
                background: transparent;
            }}
            QLabel#Section {{
                color: {section};
                font-size: 15px;
                font-weight: 600;
            }}
            QLabel#MetricValue {{
                font-size: 26px;
                font-weight: 700;
                color: {text};
            }}
            QPushButton {{
                background: {button};
                border: 1px solid {button_border};
                border-radius: {radius_button}px;
                min-height: {button_height}px;
                padding: 0 10px;
                font-weight: 600;
            }}
            QPushButton:hover {{
                background: {button_hover};
                border: 1px solid {accent_border};
            }}
            QPushButton:pressed {{
                padding-top: 2px;
                padding-left: 13px;
            }}
            QPushButton#Accent {{
                background: {accent};
                border: 1px solid {accent_border};
            }}
            QPushButton#Accent:hover {{
                background: {accent_hover};
                border: 1px solid {accent_hover};
            }}
            QPushButton#Danger {{
                background: {danger};
                border: 1px solid {danger_border};
            }}
            QPushButton#Danger:hover {{
                background: {danger_hover};
            }}
            QPushButton#Quiet {{
                background: transparent;
                border: 1px solid {field_border};
                color: {muted};
            }}
            QPushButton#Quiet:hover {{
                background: {field};
                color: {text};
                border: 1px solid {button_border};
            }}
            QPushButton#LinkButton {{
                background: transparent;
                border: 1px solid transparent;
                color: {muted};
                padding: 0 8px;
                font-weight: 600;
            }}
            QPushButton#LinkButton:hover {{
                color: {text};
                border-bottom: 1px solid {accent_border};
            }}
            QToolButton#GhostTool {{
                background: {field};
                border: 1px solid {field_border};
                border-radius: {radius_button}px;
                min-height: {button_height}px;
                padding: 0 10px;
                font-weight: 600;
            }}
            QToolButton#GhostTool:hover {{
                border: 1px solid {accent_border};
            }}
            QListWidget, QTextEdit, QLineEdit {{
                background: {field};
                border: 1px solid {field_border};
                border-radius: {radius_field}px;
                padding: 6px;
                selection-background-color: {selection};
            }}
            QTextEdit {{
                font-family: Consolas;
                line-height: 1.35;
            }}
            QListWidget::item {{
                border-radius: 6px;
                padding: 4px;
            }}
            QListWidget::item:selected {{
                background: {selection};
                color: {text};
            }}
            QComboBox {{
                background: {field};
                border: 1px solid {field_border};
                border-radius: 7px;
                padding: {control_padding};
                min-width: 104px;
            }}
            QComboBox#CompactCombo {{
                min-width: 84px;
                max-width: 84px;
                padding: 3px 6px;
            }}
            QComboBox QAbstractItemView {{
                background: {field};
                border: 1px solid {field_border};
                selection-background-color: {selection};
            }}
            QCheckBox::indicator {{
                width: 16px;
                height: 16px;
                border: 1px solid {checkbox};
                border-radius: 4px;
                background: {field};
            }}
            QCheckBox::indicator:checked {{
                background: {checkbox_checked};
                border: 1px solid {checkbox_checked};
            }}
            QProgressBar {{
                border: 1px solid {field_border};
                border-radius: 8px;
                background: {field};
                min-height: 16px;
                text-align: center;
            }}
            QProgressBar::chunk {{
                background: {progress};
                border-radius: 7px;
            }}
            """
            .format(**palette)
        )

        if hasattr(self, "animated_bg"):
            self.animated_bg.set_theme(self.current_theme_key)
            self.animated_bg.set_speed_factor(1.0)
        self._apply_glow_effects()

    def _apply_glow_effects(self):
        palette = self.THEMES.get(self.current_theme_key, self.THEMES["neon"])
        glow_color = QColor(palette.get("glow", palette.get("accent", "#ff2d95")))

        targets = []
        if hasattr(self, "header_frame"):
            targets.append((self.header_frame, 22, 0, 0))
        if hasattr(self, "left_panel"):
            targets.append((self.left_panel, 10, 0, 0))
        if hasattr(self, "right_panel"):
            targets.append((self.right_panel, 10, 0, 0))
        if hasattr(self, "action_toolbar"):
            targets.append((self.action_toolbar, 12, 0, 0))
        if hasattr(self, "metric_frames"):
            for metric_frame in self.metric_frames:
                targets.append((metric_frame, 14, 0, 0))

        for widget, blur, dx, dy in targets:
            effect = QGraphicsDropShadowEffect(widget)
            color = QColor(glow_color)
            alpha = 120 if widget is getattr(self, "header_frame", None) else 65
            color.setAlpha(alpha)
            effect.setColor(color)
            effect.setBlurRadius(blur)
            effect.setOffset(dx, dy)
            widget.setGraphicsEffect(effect)



    def _on_theme_changed(self, _index):
        selected = self.theme_combo.currentData()
        if not selected:
            return
        if selected == self.current_theme_key:
            return
        self.current_theme_key = selected
        self._apply_styles()
        self._animate_theme_transition()

    @staticmethod
    def _scaled_alpha(color_value, alpha_factor):
        rgba_match = re.fullmatch(
            r"\s*rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([0-9]*\.?[0-9]+)\s*\)\s*",
            str(color_value),
            flags=re.IGNORECASE,
        )
        if rgba_match:
            red = max(0, min(255, int(rgba_match.group(1))))
            green = max(0, min(255, int(rgba_match.group(2))))
            blue = max(0, min(255, int(rgba_match.group(3))))
            alpha_raw = float(rgba_match.group(4))
            base_alpha = alpha_raw if alpha_raw <= 1 else alpha_raw / 255.0
            new_alpha = max(0.08, min(1.0, base_alpha * alpha_factor))
            return f"rgba({red}, {green}, {blue}, {new_alpha:.3f})"

        color = QColor(str(color_value))
        if color.isValid():
            new_alpha = int(max(20, min(255, int(color.alpha() * alpha_factor))))
            return f"rgba({color.red()}, {color.green()}, {color.blue()}, {new_alpha})"
        return color_value

    def open_design_settings(self):
        dialog = QDialog(self)
        dialog.setWindowTitle(self.tr("design_title"))
        dialog.setModal(True)
        dialog.setMinimumWidth(420)

        grid = 8
        layout = QVBoxLayout(dialog)
        layout.setContentsMargins(grid * 2, grid * 2, grid * 2, grid * 2)
        layout.setSpacing(grid)

        form = QFormLayout()
        form.setHorizontalSpacing(grid)
        form.setVerticalSpacing(grid)

        theme_combo = QComboBox()
        theme_combo.addItem(self.tr("theme_neon"), "neon")
        theme_combo.addItem(self.tr("theme_minimal"), "minimal")
        theme_combo.addItem(self.tr("theme_matrix"), "matrix")
        theme_combo.addItem(self.tr("theme_chrome"), "chrome")
        theme_combo.setCurrentIndex(max(0, theme_combo.findData(self.current_theme_key)))

        language_combo = QComboBox()
        language_combo.addItem("RU", "ru")
        language_combo.addItem("UKR", "uk")
        language_combo.addItem("DE", "de")
        language_combo.addItem("EN", "en")
        language_combo.setCurrentIndex(max(0, language_combo.findData(self.current_language)))

        glass_slider = QSlider(Qt.Orientation.Horizontal)
        glass_slider.setRange(40, 140)
        glass_slider.setValue(int(self.glass_intensity * 100))

        glass_value = QLabel(f"{glass_slider.value()}%")

        glass_row = QHBoxLayout()
        glass_row.setSpacing(grid)
        glass_row.addWidget(glass_slider)
        glass_row.addWidget(glass_value)

        form.addRow(self.tr("design_theme"), theme_combo)
        form.addRow(self.tr("design_language"), language_combo)
        form.addRow(self.tr("design_glass"), glass_row)
        layout.addLayout(form)

        buttons = QHBoxLayout()
        buttons.setSpacing(grid)
        apply_btn = QPushButton(self.tr("design_apply"))
        apply_btn.setObjectName("Accent")
        cancel_btn = QPushButton(self.tr("design_cancel"))
        buttons.addStretch(1)
        buttons.addWidget(cancel_btn)
        buttons.addWidget(apply_btn)
        layout.addLayout(buttons)

        previous_state = {
            "theme": self.current_theme_key,
            "lang": self.current_language,
            "glass": self.glass_intensity,
        }

        def apply_live():
            old_theme = self.current_theme_key
            self.current_theme_key = theme_combo.currentData() or self.current_theme_key
            self.current_language = language_combo.currentData() or self.current_language
            self.glass_intensity = glass_slider.value() / 100.0

            theme_index = self.theme_combo.findData(self.current_theme_key)
            if theme_index >= 0 and theme_index != self.theme_combo.currentIndex():
                self.theme_combo.blockSignals(True)
                self.theme_combo.setCurrentIndex(theme_index)
                self.theme_combo.blockSignals(False)

            language_index = self.language_combo.findData(self.current_language)
            if language_index >= 0 and language_index != self.language_combo.currentIndex():
                self.language_combo.blockSignals(True)
                self.language_combo.setCurrentIndex(language_index)
                self.language_combo.blockSignals(False)

            self._apply_language()
            self._apply_styles()
            if old_theme != self.current_theme_key:
                self._animate_theme_transition(duration_ms=340)

        theme_combo.currentIndexChanged.connect(lambda _i: apply_live())
        language_combo.currentIndexChanged.connect(lambda _i: apply_live())
        glass_slider.valueChanged.connect(lambda val: (glass_value.setText(f"{val}%"), apply_live()))

        apply_btn.clicked.connect(dialog.accept)
        cancel_btn.clicked.connect(dialog.reject)

        if dialog.exec() == QDialog.DialogCode.Accepted:
            self._save_settings()
            self._append_activity(self.tr("design_saved"))
        else:
            self.current_theme_key = previous_state["theme"]
            self.current_language = previous_state["lang"]
            self.glass_intensity = previous_state["glass"]

            theme_index = self.theme_combo.findData(self.current_theme_key)
            if theme_index >= 0:
                self.theme_combo.blockSignals(True)
                self.theme_combo.setCurrentIndex(theme_index)
                self.theme_combo.blockSignals(False)

            language_index = self.language_combo.findData(self.current_language)
            if language_index >= 0:
                self.language_combo.blockSignals(True)
                self.language_combo.setCurrentIndex(language_index)
                self.language_combo.blockSignals(False)

            self._apply_language()
            self._apply_styles()

    def _animate_theme_transition(self, duration_ms=300):
        target = self.centralWidget()
        if target is None:
            return

        effect = QGraphicsOpacityEffect(target)
        target.setGraphicsEffect(effect)
        effect.setOpacity(0.86)

        animation = QPropertyAnimation(effect, b"opacity", self)
        animation.setDuration(duration_ms)
        animation.setStartValue(0.86)
        animation.setEndValue(1.0)
        animation.setEasingCurve(QEasingCurve.Type.InOutCubic)

        def cleanup():
            target.setGraphicsEffect(None)

        animation.finished.connect(cleanup)
        self._theme_animation = animation
        animation.start()

    def _append_activity(self, text, level="info"):
        stamp = time.strftime("%H:%M:%S")
        tag = {
            "info": "INFO",
            "warn": "WARN",
            "error": "ERR",
            "done": "DONE",
        }.get(level, "INFO")
        self.activity.append(f"[{stamp}] {tag:<4}  {text}")

    def _set_metric(self, widget_pair, text):
        widget_pair["value"].setText(text)

    def _folders(self):
        return [self.folders_list.item(i).text() for i in range(self.folders_list.count())]

    def _on_folders_dropped(self, paths):
        self._append_activity(self.tr("msg_added_dd", count=len(paths)))
        self.refresh_preview()

    def _set_extension_preset(self, preset):
        if preset == "logs":
            self.ext_edit.setText(".log,.txt,.old")
            self._append_activity(self.tr("msg_preset_logs"))
        elif preset == "temp":
            self.ext_edit.setText(".tmp,.temp,.bak,.cache")
            self._append_activity(self.tr("msg_preset_temp"))
        elif preset == "media":
            self.ext_edit.setText(".jpg,.jpeg,.png,.gif,.webp,.mp4,.mkv,.mov,.mp3,.wav")
            self._append_activity(self.tr("msg_preset_media"))
        else:
            self.ext_edit.setText("")
            self._append_activity(self.tr("msg_preset_clear"))
        self.refresh_preview()

    def open_selected_folder(self):
        current_item = self.folders_list.currentItem()
        if not current_item:
            QMessageBox.information(self, self.tr("msg_folder"), self.tr("msg_select_folder"))
            return
        folder = current_item.text()
        if not os.path.isdir(folder):
            QMessageBox.warning(self, self.tr("msg_folder"), self.tr("msg_folder_unavailable"))
            return
        try:
            os.startfile(folder)
        except Exception as error:
            QMessageBox.warning(self, self.tr("msg_folder"), self.tr("msg_open_failed", error=error))

    def add_folder(self):
        folder = QFileDialog.getExistingDirectory(self, self.tr("select_folder"))
        if not folder:
            return
        existing = self._folders()
        if folder not in existing:
            self.folders_list.addItem(QListWidgetItem(folder))
            self._append_activity(self.tr("msg_added_folder", folder=folder))
            self.refresh_preview()

    def remove_folder(self):
        rows = sorted({item.row() for item in self.folders_list.selectedIndexes()}, reverse=True)
        for row in rows:
            item = self.folders_list.takeItem(row)
            if item:
                self._append_activity(self.tr("msg_removed_folder", folder=item.text()))
        self.refresh_preview()

    def clear_folders(self):
        self.folders_list.clear()
        self._append_activity(self.tr("msg_list_cleared"))
        self.refresh_preview()

    def _validated_options(self, dry_run_value=None):
        try:
            days_limit = int(self.days_edit.text().strip())
            if days_limit < 1:
                raise ValueError
        except ValueError:
            QMessageBox.critical(self, self.tr("error"), self.tr("error_days"))
            return None

        try:
            min_size_mb = float(self.size_edit.text().replace(",", ".").strip() or "0")
            if min_size_mb < 0:
                raise ValueError
        except ValueError:
            QMessageBox.critical(self, self.tr("error"), self.tr("error_size"))
            return None

        extensions = {
            item.strip().lower().lstrip(".")
            for item in self.ext_edit.text().split(",")
            if item.strip()
        }

        if dry_run_value is None:
            dry_run_value = self.dry_run.isChecked()

        return CleanupOptions(
            days_limit=days_limit,
            min_size_bytes=int(min_size_mb * 1024 * 1024),
            extensions=extensions,
            scan_subfolders=self.scan_subfolders.isChecked(),
            delete_empty_dirs=self.delete_empty.isChecked(),
            skip_hidden=self.skip_hidden.isChecked(),
            dry_run=dry_run_value,
        )

    def refresh_preview(self):
        folders = [os.path.abspath(path) for path in self._folders()]
        if not folders:
            self._stop_preview_loading()
            self.preview_lines = []
            self.preview_summary.setText(self.tr("preview_no_folder"))
            self._set_metric(self.metric_matched, "0")
            self._set_metric(self.metric_freed, "0 B")
            return

        options = self._validated_options(dry_run_value=True)
        if not options:
            self._stop_preview_loading()
            return

        self.preview_token += 1
        token = self.preview_token
        self._start_preview_loading()
        self._append_activity(self.tr("preview_started"))

        self.preview_thread = threading.Thread(target=self._preview_worker, args=(token, folders, options), daemon=True)
        self.preview_thread.start()

    def _preview_worker(self, token, folders, options):
        threshold_time = time.time() - (options.days_limit * 86400)
        engine = CleanerEngine(stop_event=threading.Event(), progress_callback=lambda *_: None)

        type_counts = {}
        total_size = 0
        created_min = None
        created_max = None
        lines = []
        count = 0

        for folder in folders:
            for file_path in engine._iter_files(folder, options.scan_subfolders, options.skip_hidden):
                extension = os.path.splitext(file_path)[1].lower().lstrip(".")
                if options.extensions and extension not in options.extensions:
                    continue

                try:
                    st = os.stat(file_path)
                except (PermissionError, FileNotFoundError, OSError):
                    continue

                if st.st_mtime > threshold_time:
                    continue
                if st.st_size < options.min_size_bytes:
                    continue

                count += 1
                total_size += st.st_size
                created_at = st.st_ctime
                type_name = self._file_type_name(extension)
                type_counts[type_name] = type_counts.get(type_name, 0) + 1
                lines.append(f"{self._format_datetime(created_at)} | {self._format_bytes(st.st_size)} | {file_path}")

                if created_min is None or created_at < created_min:
                    created_min = created_at
                if created_max is None or created_at > created_max:
                    created_max = created_at

        top_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
        self.preview_queue.put(("preview_done", token, PreviewResult(count, total_size, created_min, created_max, top_types), lines))

    def show_preview_details(self):
        if not self.preview_lines:
            QMessageBox.information(self, self.tr("preview_title"), self.tr("preview_no_data"))
            return
        text = "\n".join(self.preview_lines[:1200])
        msg = QMessageBox(self)
        msg.setWindowTitle(self.tr("preview_details_title"))
        msg.setText(self.tr("preview_first_records"))
        msg.setDetailedText(text)
        msg.setIcon(QMessageBox.Icon.Information)
        msg.exec()

    def start_cleanup(self):
        folders = [os.path.abspath(path) for path in self._folders()]
        if not folders:
            QMessageBox.warning(self, self.tr("error"), self.tr("warn_add_folder"))
            self._append_activity(self.tr("warn_add_folder"), level="warn")
            return

        options = self._validated_options(dry_run_value=self.dry_run.isChecked())
        if not options:
            return

        self.stop_event.clear()
        self.run_btn.setEnabled(False)
        self.stop_btn.setEnabled(True)
        self.status_label.setText(self.tr("cleanup_running"))
        self.progress.setRange(0, 0)
        self._append_activity(self.tr("cleanup_start", count=len(folders)))

        self.cleaning_thread = threading.Thread(target=self._cleanup_worker, args=(folders, options), daemon=True)
        self.cleaning_thread.start()

    def stop_cleanup(self):
        self.stop_event.set()
        self.status_label.setText(self.tr("cleanup_stopping"))
        self._append_activity(self.tr("cleanup_stop_requested"), level="warn")

    def _cleanup_worker(self, folders, options):
        try:
            engine = CleanerEngine(
                stop_event=self.stop_event,
                progress_callback=lambda scanned, deleted: self.result_queue.put(("progress", scanned, deleted)),
            )
            stats, logs = engine.run(folders, options)
            self.result_queue.put(("done", stats, logs, options.dry_run))
        except Exception as error:
            self.result_queue.put(("error", str(error)))

    def _poll_queues(self):
        while True:
            try:
                event = self.preview_queue.get_nowait()
            except queue.Empty:
                break

            kind = event[0]
            if kind != "preview_done":
                continue
            token = event[1]
            if token != self.preview_token:
                continue

            result = event[2]
            self.preview_lines = event[3]
            self._stop_preview_loading()
            self._set_metric(self.metric_matched, str(result.count))
            self._set_metric(self.metric_freed, self._format_bytes(result.total_size))

            if result.count == 0:
                self.preview_summary.setText(self.tr("preview_empty"))
                self._append_activity(self.tr("preview_done_empty"))
            else:
                types = ", ".join(f"{name}={cnt}" for name, cnt in result.top_types[:4])
                summary = (
                    f"{self.tr('preview_to_delete')}: {result.count} | "
                    f"{self.tr('preview_period')}: {self._format_datetime(result.date_min)} → {self._format_datetime(result.date_max)} | "
                    f"{self.tr('preview_types')}: {types}"
                )
                self.preview_summary.setText(summary)
                self._append_activity(self.tr("preview_done", count=result.count))

        while True:
            try:
                event = self.result_queue.get_nowait()
            except queue.Empty:
                break

            kind = event[0]
            if kind == "progress":
                scanned = event[1]
                deleted = event[2]
                self.status_label.setText(self.tr("status_scanned_deleted", scanned=scanned, deleted=deleted))
                self._set_metric(self.metric_scanned, str(scanned))
                self._set_metric(self.metric_deleted, str(deleted))
            elif kind == "done":
                stats, logs, dry_run = event[1], event[2], event[3]
                self.progress.setRange(0, 1)
                self.progress.setValue(0)
                self.run_btn.setEnabled(True)
                self.stop_btn.setEnabled(False)
                self.status_label.setText(self.tr("status_ready"))
                self._set_metric(self.metric_scanned, str(stats.scanned))
                self._set_metric(self.metric_matched, str(stats.matched))
                self._set_metric(self.metric_deleted, str(stats.deleted))
                self._set_metric(self.metric_freed, self._format_bytes(stats.freed_bytes))

                summary = [
                    "=" * 56,
                    f"{time.strftime('%Y-%m-%d %H:%M:%S')} | {self.tr('summary_app')}",
                    f"{self.tr('summary_scanned')}: {stats.scanned}",
                    f"{self.tr('summary_matched')}: {stats.matched}",
                    f"{self.tr('summary_deleted')}: {stats.deleted}",
                    f"{self.tr('summary_freed')}: {self._format_bytes(stats.freed_bytes)}",
                    f"{self.tr('summary_deleted_dirs')}: {stats.deleted_dirs}",
                    f"{self.tr('summary_errors')}: {stats.errors}",
                    self.tr("summary_mode_preview") if dry_run else self.tr("summary_mode_delete"),
                    "-" * 56,
                ]
                summary.extend(logs)
                self.log_messages.append("\n".join(summary))
                self._append_activity(self.tr("msg_cleanup_done"), level="done")
                QMessageBox.information(
                    self,
                    self.tr("done"),
                    self.tr("done_message", deleted=stats.deleted, freed=self._format_bytes(stats.freed_bytes)),
                )
            elif kind == "error":
                self.progress.setRange(0, 1)
                self.progress.setValue(0)
                self.run_btn.setEnabled(True)
                self.stop_btn.setEnabled(False)
                self.status_label.setText(self.tr("error"))
                self._append_activity(event[1], level="error")
                QMessageBox.critical(self, self.tr("error"), event[1])

    def save_log(self):
        if not self.log_messages:
            QMessageBox.information(self, self.tr("log_title"), self.tr("log_empty"))
            return

        target, _ = QFileDialog.getSaveFileName(
            self,
            self.tr("save_log_title"),
            f"metsuki_session_{time.strftime('%Y%m%d_%H%M%S')}.txt",
            "Text files (*.txt);;All files (*.*)",
        )
        if not target:
            return

        try:
            with open(target, "w", encoding="utf-8") as f:
                f.write("\n\n".join(self.log_messages) + "\n")
            self._append_activity(self.tr("log_saved_path", path=target))
            QMessageBox.information(self, self.tr("log_title"), self.tr("log_saved"))
        except OSError as error:
            QMessageBox.critical(self, self.tr("error"), self.tr("log_save_failed", error=error))

    def show_help(self):
        QMessageBox.information(
            self,
            self.tr("help_title"),
            self.tr("help_text"),
        )

    def open_support(self):
        webbrowser.open_new_tab(self.SUPPORT_URL)

    def _load_settings(self):
        if not os.path.exists(self.settings_path):
            self.onboarding_completed = False
            return
        try:
            with open(self.settings_path, "r", encoding="utf-8") as file:
                data = json.load(file)

            for folder in data.get("folders", []):
                if os.path.isdir(folder):
                    self.folders_list.addItem(QListWidgetItem(folder))

            self.days_edit.setText(str(data.get("days_limit", "5")))
            self.size_edit.setText(str(data.get("min_size_mb", "0")))
            self.ext_edit.setText(str(data.get("extensions", "")))
            self.scan_subfolders.setChecked(bool(data.get("scan_subfolders", True)))
            self.delete_empty.setChecked(bool(data.get("delete_empty", False)))
            self.skip_hidden.setChecked(bool(data.get("skip_hidden", True)))
            self.dry_run.setChecked(bool(data.get("dry_run", False)))

            theme_key = data.get("theme", "neon")
            if theme_key in self.THEMES:
                index = self.theme_combo.findData(theme_key)
                if index >= 0:
                    self.theme_combo.blockSignals(True)
                    self.theme_combo.setCurrentIndex(index)
                    self.theme_combo.blockSignals(False)
                    self.current_theme_key = theme_key
                    self._apply_styles()

            language_key = data.get("language", "ru")
            if language_key in self.LOCALES:
                index = self.language_combo.findData(language_key)
                if index >= 0:
                    self.language_combo.blockSignals(True)
                    self.language_combo.setCurrentIndex(index)
                    self.language_combo.blockSignals(False)
                    self.current_language = language_key
                    self._apply_language()
            self.onboarding_completed = bool(data.get("onboarding_completed", False))
            self.glass_intensity = float(data.get("glass_intensity", 1.0))
            self.glass_intensity = max(0.4, min(1.4, self.glass_intensity))
            self._apply_styles()
            self._append_activity(self.tr("settings_restored"))
        except Exception:
            pass

    def _save_settings(self):
        data = {
            "folders": self._folders(),
            "days_limit": self.days_edit.text().strip() or "5",
            "min_size_mb": self.size_edit.text().strip() or "0",
            "extensions": self.ext_edit.text().strip(),
            "scan_subfolders": self.scan_subfolders.isChecked(),
            "delete_empty": self.delete_empty.isChecked(),
            "skip_hidden": self.skip_hidden.isChecked(),
            "dry_run": self.dry_run.isChecked(),
            "theme": self.current_theme_key,
            "language": self.current_language,
            "onboarding_completed": self.onboarding_completed,
            "glass_intensity": self.glass_intensity,
        }
        try:
            with open(self.settings_path, "w", encoding="utf-8") as file:
                json.dump(data, file, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def closeEvent(self, event):
        self._save_settings()
        super().closeEvent(event)

    @classmethod
    def _file_type_name(cls, extension):
        if not extension:
            return "Unknown"
        for type_name, extensions in cls.TYPE_GROUPS.items():
            if extension in extensions:
                return type_name
        return "Other"

    @staticmethod
    def _format_datetime(timestamp):
        if timestamp is None:
            return "-"
        return time.strftime("%Y-%m-%d %H:%M", time.localtime(timestamp))

    @staticmethod
    def _format_bytes(size):
        units = ["B", "KB", "MB", "GB", "TB"]
        value = float(size)
        for unit in units:
            if value < 1024 or unit == units[-1]:
                return f"{value:.2f} {unit}"
            value /= 1024
        return f"{size} B"


def create_app():
    app = QApplication.instance()
    if app is None:
        app = QApplication([])

    default_font = app.font()
    if default_font.pointSize() <= 0:
        default_font = QFont("Segoe UI")
        default_font.setPointSize(10)
        app.setFont(default_font)

    splash_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon.png")
    splash_width = 360
    splash_height = 252
    corner_radius = 18

    splash_canvas = QPixmap(splash_width, splash_height)
    splash_canvas.fill(Qt.GlobalColor.transparent)

    painter = QPainter(splash_canvas)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)

    card_rect = splash_canvas.rect().adjusted(1, 1, -1, -1)
    card_path = QPainterPath()
    card_path.addRoundedRect(card_rect, corner_radius, corner_radius)
    painter.fillPath(card_path, QColor("#0D1117"))

    painter.setPen(QColor("#1F2937"))
    painter.drawPath(card_path)

    text_zone = card_rect.adjusted(18, 184, -18, -18)
    text_zone_path = QPainterPath()
    text_zone_path.addRoundedRect(text_zone, 12, 12)
    painter.fillPath(text_zone_path, QColor("#111827"))

    if os.path.exists(splash_path):
        icon_source = QPixmap(splash_path)
        if not icon_source.isNull():
            icon_pixmap = icon_source.scaled(148, 148, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
            icon_x = (splash_canvas.width() - icon_pixmap.width()) // 2
            painter.drawPixmap(icon_x, 22, icon_pixmap)

    painter.setPen(Qt.GlobalColor.white)
    splash_font = QFont("Segoe UI")
    splash_font.setPointSize(11)
    splash_font.setWeight(QFont.Weight.Medium)
    painter.setFont(splash_font)
    painter.drawText(text_zone, Qt.AlignmentFlag.AlignCenter, "Metsuki Cleaner • Loading interface...")
    painter.end()

    if os.path.exists(splash_path):
        splash_pixmap = splash_canvas
    else:
        splash_pixmap = splash_canvas

    splash = QSplashScreen(splash_pixmap)
    splash.setMask(splash_pixmap.mask())
    splash.show()
    app.processEvents()

    window = CleanerQtApp()
    splash.finish(window)
    window._show_first_run_dialog_if_needed()
    return app, window
