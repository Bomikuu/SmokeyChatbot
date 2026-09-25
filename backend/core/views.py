import json
import logging
import re
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db.models import Sum
from django.http import FileResponse, Http404, JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from PIL import Image, UnidentifiedImageError

from .models import KnowledgeSource, Site, UsageDaily
from .services import (
    OpenAIUnavailable, answer_question, client_ip, delete_source_remote,
    index_source, record_usage, refresh_source, reserve_chat_quota,
    openai_request,
)
from django.core.cache import cache


def owner_required(view):
    def wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return error("Sign in to continue.", 401)
        return view(request, *args, **kwargs)
    return wrapped


HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
FRAME_NAMES = {"idle", "walk1", "walk2", "speak", "sleep"}
ALLOWED_SUFFIXES = {".pdf", ".txt", ".md"}
logger = logging.getLogger(__name__)


def error(message, status=400):
    return JsonResponse({"error": message}, status=status)


def json_body(request):
    if not request.content_type.startswith("application/json") or len(request.body) > 100_000:
        raise ValueError("Send a JSON body under 100 KB.")
    try:
        value = json.loads(request.body)
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError("Invalid JSON body.") from exc
    if not isinstance(value, dict):
        raise ValueError("JSON body must be an object.")
    return value


def site_data(site):
    return {
        "id": str(site.public_id),
        "name": site.name,
        "mode": site.mode,
        "mascotMode": site.mascot_mode,
        "customAssetType": site.custom_asset_type,
        "hasCustomAsset": bool(site.custom_asset),
        "spriteColumns": site.sprite_columns,
        "spriteRows": site.sprite_rows,
        "spriteFrames": site.sprite_frames,
        "accentColor": site.accent_color,
        "roaming": site.roaming,
        "allowedOrigins": site.allowed_origins,
        "createdAt": site.created_at.isoformat(),
    }


def source_data(source):
    return {"id": source.id, "title": source.title, "kind": source.kind, "status": source.status, "error": source.error_message, "createdAt": source.created_at.isoformat()}


def owned_site(request, site_id):
    return get_object_or_404(Site, owner=request.user, public_id=site_id)


def clean_origins(value):
    if not isinstance(value, list) or len(value) > 20:
        raise ValueError("Provide up to 20 website origins.")
    origins = []
    for raw in value:
        if not isinstance(raw, str):
            raise ValueError("Origins must be URLs.")
        parsed = urlparse(raw.strip())
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
            raise ValueError("Use full website origins such as https://example.com, without paths or wildcards.")
        if parsed.scheme != "https" and parsed.hostname not in ("localhost", "127.0.0.1"):
            raise ValueError("Public website origins must use HTTPS.")
        origin = f"{parsed.scheme}://{parsed.netloc.lower()}"
        if origin not in origins:
            origins.append(origin)
    return origins


def update_site(site, data):
    fields = []
    if "name" in data:
        name = str(data["name"]).strip()
        if not 1 <= len(name) <= 100:
            raise ValueError("Site name must be 1–100 characters.")
        site.name = name
        fields.append("name")
    for json_key, field, choices in [
        ("mode", "mode", Site.Mode.values),
        ("mascotMode", "mascot_mode", Site.MascotMode.values),
        ("customAssetType", "custom_asset_type", ["static", "sprite"]),
    ]:
        if json_key in data:
            if data[json_key] not in choices:
                raise ValueError(f"Invalid {json_key} value.")
            setattr(site, field, data[json_key])
            fields.append(field)
    if "accentColor" in data:
        if not isinstance(data["accentColor"], str) or not HEX_COLOR.fullmatch(data["accentColor"]):
            raise ValueError("Accent color must be a six-digit hex color.")
        site.accent_color = data["accentColor"]
        fields.append("accent_color")
    if "roaming" in data:
        if not isinstance(data["roaming"], bool):
            raise ValueError("Roaming must be true or false.")
        site.roaming = data["roaming"]
        fields.append("roaming")
    if "allowedOrigins" in data:
        site.allowed_origins = clean_origins(data["allowedOrigins"])
        fields.append("allowed_origins")
    for json_key, field in [("spriteColumns", "sprite_columns"), ("spriteRows", "sprite_rows")]:
        if json_key in data:
            value = data[json_key]
            if type(value) is not int or not 1 <= value <= 16:
                raise ValueError("Sprite grid size must be between 1 and 16.")
            setattr(site, field, value)
            fields.append(field)
    if "spriteFrames" in data:
        frames = data["spriteFrames"]
        if not isinstance(frames, dict) or set(frames) - FRAME_NAMES:
            raise ValueError("Sprite frames must use idle, walk1, walk2, speak, or sleep.")
        site.sprite_frames = frames
        fields.append("sprite_frames")
    for name, frame in site.sprite_frames.items():
        if not isinstance(frame, list) or len(frame) != 2 or any(type(n) is not int for n in frame) or not 0 <= frame[0] < site.sprite_columns or not 0 <= frame[1] < site.sprite_rows:
            raise ValueError(f"Frame {name} must be [column, row] inside the sprite grid.")
    if fields:
        site.save(update_fields=fields)


@ensure_csrf_cookie
@require_http_methods(["GET"])
def csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_http_methods(["POST"])
def signup(request):
    try:
        data = json_body(request)
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))
        if not email or len(email) > 254:
            raise ValueError("Enter a valid email address.")
        validate_email(email)
        if User.objects.filter(username__iexact=email).exists():
            raise ValueError("An account with this email already exists.")
        validate_password(password)
        ip = client_ip(request)
        key = f"smokey:signup:{ip}:{timezone.now().strftime('%Y%m%d%H')}"
        cache.add(key, 0, 3700)
        if cache.incr(key) > 5:
            return error("Too many sign-up attempts. Please try again later.", 429)
        user = User.objects.create_user(username=email, email=email, password=password, is_active=False)
        token = signing.dumps({"user": user.pk, "email": email}, salt="smokey-verify")
        link = request.build_absolute_uri(f"/api/auth/verify?token={token}")
        try:
            send_mail("Verify your SmokeyChatBot account", f"Open this link within 24 hours to verify your account:\n{link}", settings.DEFAULT_FROM_EMAIL, [email])
        except Exception:
            logger.exception("Verification email could not be sent")
            user.delete()
            return error("Verification email could not be sent. Please try again later.", 503)
        return JsonResponse({"message": "Check your email for the verification link."}, status=201)
    except ValidationError as exc:
        return error(" ".join(exc.messages))
    except ValueError as exc:
        return error(str(exc))


@require_http_methods(["GET"])
def verify(request):
    try:
        data = signing.loads(request.GET.get("token", ""), salt="smokey-verify", max_age=86400)
        user = User.objects.get(pk=data["user"], email=data["email"])
        user.is_active = True
        user.save(update_fields=["is_active"])
        response = redirect(f"{settings.FRONTEND_URL}/?verified=1")
        response["Referrer-Policy"] = "no-referrer"
        return response
    except (signing.BadSignature, User.DoesNotExist, KeyError):
        return redirect(f"{settings.FRONTEND_URL}/?verified=0")


@require_http_methods(["POST"])
def login_view(request):
    try:
        data = json_body(request)
        email = str(data.get("email", "")).strip().lower()
        key = f"smokey:login:{client_ip(request)}:{timezone.now().strftime('%Y%m%d%H')}"
        cache.add(key, 0, 3700)
        if cache.incr(key) > 20:
            return error("Too many sign-in attempts. Please try again later.", 429)
        user = authenticate(request, username=email, password=str(data.get("password", "")))
        if not user:
            return error("Invalid email or password, or email is not verified.", 401)
        login(request, user)
        return JsonResponse({"email": user.email})
    except ValueError as exc:
        return error(str(exc))


@owner_required
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({"message": "Signed out."})


@owner_required
@require_http_methods(["GET"])
def me(request):
    return JsonResponse({"email": request.user.email})


@owner_required
@require_http_methods(["GET", "POST"])
def sites(request):
    if request.method == "GET":
        return JsonResponse({"sites": [site_data(site) for site in Site.objects.filter(owner=request.user).order_by("-created_at")]})
    try:
        data = json_body(request)
        name = str(data.get("name", "")).strip()
        if not 1 <= len(name) <= 100:
            raise ValueError("Site name must be 1–100 characters.")
        if Site.objects.filter(owner=request.user).count() >= 5:
            return error("The free beta allows up to five sites per owner.", 429)
        site = Site.objects.create(owner=request.user, name=name)
        return JsonResponse({"site": site_data(site)}, status=201)
    except ValueError as exc:
        return error(str(exc))


@owner_required
@require_http_methods(["GET", "PATCH", "DELETE"])
def site_detail(request, site_id):
    site = owned_site(request, site_id)
    if request.method == "GET":
        return JsonResponse({"site": site_data(site)})
    if request.method == "PATCH":
        try:
            update_site(site, json_body(request))
            return JsonResponse({"site": site_data(site)})
        except ValueError as exc:
            return error(str(exc))
    try:
        for source in site.sources.all():
            delete_source_remote(source)
        if site.vector_store_id:
            openai_request("DELETE", f"/vector_stores/{site.vector_store_id}", ignore_not_found=True)
    except OpenAIUnavailable as exc:
        return error(str(exc), 503)
    for source in site.sources.all():
        if source.file:
            source.file.delete(save=False)
    if site.custom_asset:
        site.custom_asset.delete(save=False)
    site.delete()
    return JsonResponse({"message": "Site deleted."})


@owner_required
@require_http_methods(["POST", "DELETE", "GET"])
def site_asset(request, site_id):
    site = owned_site(request, site_id)
    if request.method == "GET":
        if not site.custom_asset:
            raise Http404
        return FileResponse(site.custom_asset.open("rb"), content_type="image/webp" if site.custom_asset.name.lower().endswith(".webp") else "image/png")
    if request.method == "DELETE":
        if site.custom_asset:
            site.custom_asset.delete(save=True)
        return JsonResponse({"site": site_data(site)})
    upload = request.FILES.get("file")
    if not upload or upload.size > 5 * 1024 * 1024:
        return error("Upload a PNG or WebP image under 5 MB.")
    try:
        image = Image.open(upload)
        if image.format not in ("PNG", "WEBP") or image.width > 4096 or image.height > 4096 or image.width < 32 or image.height < 32:
            raise ValueError("Upload a PNG or WebP image between 32 and 4096 pixels per side.")
        image.verify()
        upload.seek(0)
        old_name = site.custom_asset.name
        ext = ".webp" if image.format == "WEBP" else ".png"
        site.custom_asset.save(f"mascot-{site.public_id}{ext}", upload, save=True)
        if old_name and old_name != site.custom_asset.name:
            site.custom_asset.storage.delete(old_name)
        return JsonResponse({"site": site_data(site)})
    except (UnidentifiedImageError, ValueError, OSError, Image.DecompressionBombError) as exc:
        return error(str(exc) or "Invalid image.")


@owner_required
@require_http_methods(["GET", "POST"])
def sources(request, site_id):
    site = owned_site(request, site_id)
    if request.method == "GET":
        for source in site.sources.filter(status="processing"):
            try:
                refresh_source(source)
            except OpenAIUnavailable:
                pass
        return JsonResponse({"sources": [source_data(source) for source in site.sources.order_by("-created_at")]})
    if site.sources.count() >= 25:
        return error("The free beta allows up to 25 sources per site.", 429)
    title = str(request.POST.get("title", "")).strip() if request.content_type.startswith("multipart/") else ""
    if request.content_type.startswith("application/json"):
        try:
            data = json_body(request)
        except ValueError as exc:
            return error(str(exc))
        title = str(data.get("title", "")).strip()
        body = str(data.get("body", "")).strip()
        if not body or len(body) > 50_000:
            return error("Pasted content must contain 1–50,000 characters.")
        kind = "text"
        upload = None
    else:
        upload = request.FILES.get("file")
        if not upload or upload.size > 10 * 1024 * 1024 or Path(upload.name).suffix.lower() not in ALLOWED_SUFFIXES:
            return error("Upload a PDF, TXT, or Markdown file under 10 MB.")
        if Path(upload.name).suffix.lower() == ".pdf" and upload.read(5) != b"%PDF-":
            return error("That PDF file is invalid.")
        if Path(upload.name).suffix.lower() in (".txt", ".md"):
            try:
                upload.read().decode("utf-8")
            except UnicodeDecodeError:
                return error("Text and Markdown files must use UTF-8 encoding.")
        upload.seek(0)
        body = ""
        kind = "file"
        if not title:
            title = Path(upload.name).stem
    if not 1 <= len(title) <= 160:
        return error("Source title must be 1–160 characters.")
    source = KnowledgeSource.objects.create(site=site, title=title, kind=kind, body=body, file=upload)
    try:
        index_source(source)
    except OpenAIUnavailable as exc:
        source.status = "error"
        source.error_message = str(exc)
        source.save(update_fields=["status", "error_message"])
    return JsonResponse({"source": source_data(source)}, status=201)


@owner_required
@require_http_methods(["DELETE", "POST"])
def source_detail(request, site_id, source_id):
    site = owned_site(request, site_id)
    source = get_object_or_404(KnowledgeSource, site=site, pk=source_id)
    if request.method == "POST":
        if source.status != "error":
            return error("Only failed sources can be retried.")
        try:
            delete_source_remote(source)
            source.openai_file_id = ""
            source.status = "processing"
            source.error_message = ""
            source.save(update_fields=["openai_file_id", "status", "error_message"])
            index_source(source)
        except OpenAIUnavailable as exc:
            source.status = "error"
            source.error_message = str(exc)
            source.save(update_fields=["status", "error_message"])
        return JsonResponse({"source": source_data(source)})
    try:
        delete_source_remote(source)
    except OpenAIUnavailable as exc:
        return error(str(exc), 503)
    if source.file:
        source.file.delete(save=False)
    source.delete()
    return JsonResponse({"message": "Source deleted."})


@owner_required
@require_http_methods(["GET"])
def usage(request, site_id):
    site = owned_site(request, site_id)
    today = timezone.localdate()
    totals = UsageDaily.objects.filter(site=site, date__gte=today - timedelta(days=29)).aggregate(requests=Sum("requests"), input_tokens=Sum("input_tokens"), output_tokens=Sum("output_tokens"))
    today_row = UsageDaily.objects.filter(site=site, date=today).first()
    owner_today = UsageDaily.objects.filter(site__owner=request.user, date=today).aggregate(requests=Sum("requests"))["requests"] or 0
    return JsonResponse({"today": today_row.requests if today_row else 0, "ownerToday": owner_today, "last30Days": {key: value or 0 for key, value in totals.items()}, "dailyLimit": settings.SITE_DAILY_LIMIT, "ownerDailyLimit": settings.OWNER_DAILY_LIMIT})


def request_origin(request):
    origin = request.headers.get("Origin", "").rstrip("/")
    if origin:
        return origin
    return f"{'https' if request.is_secure() else 'http'}://{request.get_host()}"


def cors_response(response, origin, methods):
    response["Access-Control-Allow-Origin"] = origin
    response["Vary"] = "Origin"
    response["Access-Control-Allow-Methods"] = methods
    response["Access-Control-Allow-Headers"] = "Content-Type"
    response["Access-Control-Max-Age"] = "600"
    return response


def public_site(request, site_id):
    site = get_object_or_404(Site, public_id=site_id)
    origin = request_origin(request)
    if origin not in site.allowed_origins:
        return site, origin, error("This website is not allowed to use this chatbot.", 403)
    return site, origin, None


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def widget_config(request, site_id):
    site, origin, denied = public_site(request, site_id)
    if denied:
        return denied
    if request.method == "OPTIONS":
        return cors_response(JsonResponse({}), origin, "GET, OPTIONS")
    base = request.build_absolute_uri("/api/widget")
    asset_url = (f"{base}/{site.public_id}/asset" if site.custom_asset else None) if site.mascot_mode == "custom" else request.build_absolute_uri("/api/widget/default-asset")
    return cors_response(JsonResponse({
        "name": site.name,
        "mode": site.mode,
        "mascotMode": site.mascot_mode,
        "assetType": site.custom_asset_type if site.mascot_mode == "custom" else "sprite",
        "assetUrl": asset_url,
        "spriteColumns": site.sprite_columns if site.mascot_mode == "custom" else 4,
        "spriteRows": site.sprite_rows if site.mascot_mode == "custom" else 2,
        "spriteFrames": site.sprite_frames if site.mascot_mode == "custom" else {"idle": [0, 0], "walk1": [0, 1], "walk2": [1, 1], "speak": [3, 1], "sleep": [2, 1]},
        "accentColor": site.accent_color,
        "roaming": site.roaming,
    }), origin, "GET, OPTIONS")


@require_http_methods(["GET"])
def widget_asset(request, site_id):
    site = get_object_or_404(Site, public_id=site_id)
    if not site.custom_asset:
        raise Http404
    response = FileResponse(site.custom_asset.open("rb"), content_type="image/webp" if site.custom_asset.name.lower().endswith(".webp") else "image/png")
    response["Cache-Control"] = "public, max-age=300"
    return response


@require_http_methods(["GET"])
def default_asset(request):
    path = Path(__file__).resolve().parent / "assets" / "office-cat-sprite.webp"
    response = FileResponse(path.open("rb"), content_type="image/webp")
    response["Cache-Control"] = "public, max-age=86400"
    return response


@require_http_methods(["GET"])
def widget_script(request):
    path = Path(__file__).resolve().parents[2] / "widget" / "smokeychatbot.js"
    response = FileResponse(path.open("rb"), content_type="text/javascript; charset=utf-8")
    response["Cache-Control"] = "public, max-age=300"
    return response


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def widget_chat(request, site_id):
    site, origin, denied = public_site(request, site_id)
    if denied:
        return denied
    if request.method == "OPTIONS":
        return cors_response(JsonResponse({}), origin, "POST, OPTIONS")
    try:
        data = json_body(request)
        question = data.get("message", "")
        history = data.get("history", [])
        if not isinstance(question, str) or not 1 <= len(question.strip()) <= 2000:
            raise ValueError("Message must be 1–2,000 characters.")
        if not isinstance(history, list) or len(history) > 10 or any(not isinstance(item, dict) or item.get("role") not in ("user", "assistant") or not isinstance(item.get("content"), str) or len(item["content"]) > 2000 for item in history):
            raise ValueError("Invalid chat history.")
        if not reserve_chat_quota(site, request):
            return cors_response(error("This chatbot has reached its usage limit. Please try again later.", 429), origin, "POST, OPTIONS")
        result = answer_question(site, question.strip(), history)
        record_usage(site, result["usage"])
        return cors_response(JsonResponse({"answer": result["answer"], "sources": result["sources"]}), origin, "POST, OPTIONS")
    except ValueError as exc:
        return cors_response(error(str(exc)), origin, "POST, OPTIONS")
    except OpenAIUnavailable as exc:
        return cors_response(error(str(exc), 503), origin, "POST, OPTIONS")
