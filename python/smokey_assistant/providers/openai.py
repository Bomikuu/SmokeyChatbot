from .base import ProviderAdapter


class OpenAIProvider(ProviderAdapter):
    name = "openai"
    base_url = "https://api.openai.com/v1"
