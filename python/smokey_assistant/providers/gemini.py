from .base import ProviderAdapter


class GeminiProvider(ProviderAdapter):
    name = "gemini"
    base_url = "https://generativelanguage.googleapis.com/v1beta"
