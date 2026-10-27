from cryptography.fernet import Fernet, MultiFernet, InvalidToken
from django.conf import settings

from .contracts import AssistantError


def cipher():
    keys = getattr(settings, "SMOKEY_ENCRYPTION_KEYS", [])
    try:
        if not keys:
            raise ValueError()
        return MultiFernet(
            [Fernet(key.encode() if isinstance(key, str) else key) for key in keys]
        )
    except (ValueError, TypeError):
        raise AssistantError(
            "Configure the server's Smokey encryption key before saving credentials.",
            "ENCRYPTION_UNAVAILABLE",
            503,
        ) from None


def encrypt_secret(value: str) -> str:
    return cipher().encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str:
    try:
        return cipher().decrypt(value.encode()).decode()
    except InvalidToken:
        raise AssistantError(
            "This credential cannot be decrypted. Check encryption key rotation.",
            "ENCRYPTION_UNAVAILABLE",
            503,
        ) from None
