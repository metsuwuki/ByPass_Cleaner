from qt_app import create_app
from cleaner_core import hide_console_on_windows


if __name__ == "__main__":
    hide_console_on_windows()
    app, window = create_app()
    try:
        window.show()
        app.exec()
    except KeyboardInterrupt:
        pass
