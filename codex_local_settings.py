from pathlib import Path

from azoemart.settings import *  # noqa: F403


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": Path(r"C:\Users\JAY\AppData\Local\Temp\azoemart_validation.sqlite3"),
    }
}

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://lvh.me:3000",
]
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = 0
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
