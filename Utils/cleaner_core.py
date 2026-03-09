import concurrent.futures
import ctypes
import os
import time
from dataclasses import dataclass



def hide_console_on_windows():
    if os.name != "nt":
        return
    if ctypes.windll.kernel32.GetConsoleWindow():
        ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)


@dataclass
class CleanupOptions:
    days_limit: int
    min_size_bytes: int
    extensions: set
    scan_subfolders: bool
    delete_empty_dirs: bool
    skip_hidden: bool
    use_age_filter: bool
    dry_run: bool


@dataclass
class CleanupStats:
    scanned: int = 0
    matched: int = 0
    deleted: int = 0
    freed_bytes: int = 0
    deleted_dirs: int = 0
    errors: int = 0


@dataclass
class PreviewCandidate:
    path: str
    extension: str
    type_name: str
    created_at: float
    size_bytes: int


class CleanerEngine:
    def __init__(self, stop_event, progress_callback):
        self.stop_event = stop_event
        self.progress_callback = progress_callback

    def run(self, folders, options):
        total = CleanupStats()
        logs = []

        workers = min(8, max(1, len(folders)))
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [executor.submit(self._process_folder, folder, options) for folder in folders]
            for future in concurrent.futures.as_completed(futures):
                if self.stop_event.is_set():
                    break
                stats, folder_logs = future.result()
                total.scanned += stats.scanned
                total.matched += stats.matched
                total.deleted += stats.deleted
                total.freed_bytes += stats.freed_bytes
                total.deleted_dirs += stats.deleted_dirs
                total.errors += stats.errors
                logs.extend(folder_logs)
                self.progress_callback(total.scanned, total.deleted)

        return total, logs

    def _process_folder(self, folder, options):
        threshold_time = time.time() - (options.days_limit * 86400) if options.use_age_filter else 0
        stats = CleanupStats()
        logs = []

        for file_path in self._iter_files(folder, options.scan_subfolders, options.skip_hidden):
            if self.stop_event.is_set():
                break

            stats.scanned += 1
            if options.extensions and not self._matches_extension(file_path, options.extensions):
                continue

            try:
                file_stat = os.stat(file_path)
                if options.use_age_filter and file_stat.st_mtime > threshold_time:
                    continue
                if file_stat.st_size < options.min_size_bytes:
                    continue

                stats.matched += 1
                if options.dry_run:
                    logs.append(f"Preview: {file_path}")
                    continue

                os.remove(file_path)
                stats.deleted += 1
                stats.freed_bytes += file_stat.st_size
                logs.append(f"Deleted: {file_path}")
            except PermissionError as error:
                stats.errors += 1
                logs.append(f"Permission error: {file_path} | {error}")
            except FileNotFoundError:
                continue
            except Exception as error:
                stats.errors += 1
                logs.append(f"Error: {file_path} | {error}")

            if stats.scanned % 300 == 0:
                self.progress_callback(stats.scanned, stats.deleted)

        if options.delete_empty_dirs and not options.dry_run and not self.stop_event.is_set():
            deleted_dirs, dir_logs, dir_errors = self._delete_empty_dirs(folder, options.skip_hidden)
            stats.deleted_dirs += deleted_dirs
            stats.errors += dir_errors
            logs.extend(dir_logs)

        return stats, logs

    def _iter_files(self, root_folder, recursive, skip_hidden):
        stack = [root_folder]
        while stack:
            current = stack.pop()
            try:
                with os.scandir(current) as entries:
                    for entry in entries:
                        if self.stop_event.is_set():
                            return
                        if skip_hidden and entry.name.startswith("."):
                            continue
                        if entry.is_dir(follow_symlinks=False):
                            if recursive:
                                stack.append(entry.path)
                            continue
                        if entry.is_file(follow_symlinks=False):
                            yield entry.path
            except (PermissionError, FileNotFoundError):
                continue

    def _delete_empty_dirs(self, root_folder, skip_hidden):
        deleted = 0
        errors = 0
        logs = []

        for current_root, dirs, _ in os.walk(root_folder, topdown=False):
            if self.stop_event.is_set():
                break
            for folder_name in dirs:
                if skip_hidden and folder_name.startswith("."):
                    continue
                folder_path = os.path.join(current_root, folder_name)
                try:
                    if not os.listdir(folder_path):
                        os.rmdir(folder_path)
                        deleted += 1
                        logs.append(f"Deleted empty folder: {folder_path}")
                except PermissionError as error:
                    errors += 1
                    logs.append(f"Permission error: {folder_path} | {error}")
                except Exception as error:
                    errors += 1
                    logs.append(f"Error deleting folder: {folder_path} | {error}")

        return deleted, logs, errors

    @staticmethod
    def _matches_extension(file_path, extensions):
        extension = os.path.splitext(file_path)[1].lower().lstrip(".")
        return extension in extensions
