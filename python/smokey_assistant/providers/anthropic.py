from .base import ProviderAdapter


class AnthropicProvider(ProviderAdapter):
    name = "anthropic"
    base_url = "https://api.anthropic.com/v1"
