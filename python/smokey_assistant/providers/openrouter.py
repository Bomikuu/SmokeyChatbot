from .base import ProviderAdapter


class OpenRouterProvider(ProviderAdapter):
    name = "openrouter"
    base_url = "https://openrouter.ai/api/v1"
