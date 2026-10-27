from ..contracts import AssistantError
from .openai import OpenAIProvider
from .anthropic import AnthropicProvider
from .gemini import GeminiProvider
from .openrouter import OpenRouterProvider

PROVIDERS = {
    provider.name: provider
    for provider in (
        OpenAIProvider,
        AnthropicProvider,
        GeminiProvider,
        OpenRouterProvider,
    )
}


def get_provider(name):
    if not isinstance(name, str) or name not in PROVIDERS:
        raise AssistantError("Choose OpenAI, Anthropic, Gemini or OpenRouter.")
    return PROVIDERS[name]()
