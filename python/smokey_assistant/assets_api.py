import io
import warnings
from PIL import Image
from .contracts import AssistantError


def validated_asset(upload):
    if upload.size > 5 * 1024 * 1024:
        raise AssistantError("Choose a PNG or WebP image up to 5 MB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(upload) as source:
                if (
                    source.format not in {"PNG", "WEBP"}
                    or max(source.size) > 4096
                    or min(source.size) < 1
                ):
                    raise ValueError()
                source.load()
                output = io.BytesIO()
                source.convert("RGBA").save(output, "WEBP", lossless=True)
                data = output.getvalue()
                if len(data) > 5 * 1024 * 1024:
                    raise ValueError()
                return data
    except (
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        raise AssistantError(
            "Choose a valid PNG or WebP image up to 4096 pixels and 5 MB."
        ) from None
