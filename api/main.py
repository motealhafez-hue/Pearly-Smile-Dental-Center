"""
Pearly Smile CMS API — serves site static files and JSON-backed content.
Run from repo HTML folder:  uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
Or from api folder:         uvicorn main:app --reload --host 127.0.0.1 --port 8000

Windows (ZKBioTime / PYTHONHOME): use repo `start-api.ps1` or `start-api.bat` so your
`pythoncore-*` install runs, not the biometric software Python.
"""

from __future__ import annotations

import copy
import json
import logging
import os
import secrets
import time
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field
from starlette.staticfiles import StaticFiles

API_DIR = Path(__file__).resolve().parent
ROOT_DIR = API_DIR.parent


def _canonical_openai_env_key(name: str) -> str:
    """
    Normalize common .env typos to the one name the code reads: OPENAI_API_KEY.
    """
    k = (name or "").strip().lstrip("\ufeff").rstrip("\r")
    if not k:
        return k
    u = k.upper().replace(" ", "")
    if u in (
        "OPENAI_API_KEY",
        "OPENAI_KEY",
        "OPEN_AI_API_KEY",
        "OPENAI_SECRET_KEY",
        "OPENAI_SECRET",
    ):
        return "OPENAI_API_KEY"
    return k


def _coalesce_openai_api_key_env() -> None:
    """If only alternate names are set (e.g. after Windows env / dotenv), copy into OPENAI_API_KEY."""
    if (os.environ.get("OPENAI_API_KEY") or "").strip():
        return
    for alt in ("OPENAI_KEY", "OPEN_AI_API_KEY", "OPENAI_SECRET_KEY", "OPENAI_SECRET"):
        v = (os.environ.get(alt) or "").strip()
        if v:
            os.environ["OPENAI_API_KEY"] = v
            return


def _load_env_file(path: Path) -> None:
    """
    Minimal KEY=VALUE reader for api/.env if python-dotenv is missing or fails.
    Fills missing keys and replaces *blank* values (empty string) so a stale Windows
    env var OPENAI_API_KEY= does not block the real key from api/.env.
    """
    if not path.is_file():
        return
    try:
        raw = path.read_text(encoding="utf-8-sig")
    except OSError:
        return
    for line in raw.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if s.lower().startswith("export "):
            s = s[7:].strip()
        if "=" not in s:
            continue
        key, _, val = s.partition("=")
        key = _canonical_openai_env_key(key)
        if not key:
            continue
        existing = os.environ.get(key)
        if existing is not None and str(existing).strip() != "":
            continue
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
            val = val[1:-1]
        if val or existing is not None:
            os.environ[key] = val


def _atomic_write_utf8(target: Path, text: str) -> None:
    """
    Write UTF-8 text via os.replace (same-volume atomic rename).
    Uses a unique temp name + retries to reduce Windows WinError 32 (file in use),
    e.g. when antivirus, editor, or another request briefly locks events.json.
    """
    target = target.resolve()
    parent = target.parent
    parent.mkdir(parents=True, exist_ok=True)
    last_err: Exception | None = None
    for attempt in range(16):
        tmp = parent / f".{target.name}.{secrets.token_hex(6)}.tmp"
        try:
            with tmp.open("w", encoding="utf-8", newline="\n") as fh:
                fh.write(text)
                fh.flush()
                os.fsync(fh.fileno())
        except Exception as e:
            try:
                tmp.unlink(missing_ok=True)
            except Exception:
                pass
            raise e
        try:
            os.replace(str(tmp), str(target))
            return
        except (OSError, PermissionError) as e:
            last_err = e
            try:
                tmp.unlink(missing_ok=True)
            except Exception:
                pass
            win = getattr(e, "winerror", None)
            errno = getattr(e, "errno", None)
            if attempt < 15 and (win == 32 or errno == 13):
                time.sleep(0.045 * (attempt + 1))
                continue
            raise
    if last_err:
        raise last_err
    raise OSError("atomic write failed")


DATA_PATH = API_DIR / "data.json"
BOOKINGS_PATH = API_DIR / "bookings.json"
SCHEDULE_PATH = API_DIR / "schedule.json"
EVENTS_PATH = API_DIR / "events.json"
BLOG_PATH = API_DIR / "blog.json"
UPLOADS_DIR = ROOT_DIR / "uploads"

# Load backend-only secrets from api/.env (never exposed to frontend)
_env_log = logging.getLogger("pearly")
_env_path = API_DIR / ".env"
try:
    from dotenv import load_dotenv  # type: ignore

    # override=False: real deployment env wins; blank inherited vars are fixed in _load_env_file below
    load_dotenv(_env_path, override=False)
except ImportError:
    _env_log.warning('python-dotenv not installed — using built-in parser for api/.env (run: pip install "python-dotenv")')
except Exception as e:
    _env_log.warning("dotenv load failed (%s); using built-in parser for api/.env", e)
_load_env_file(_env_path)
_coalesce_openai_api_key_env()

if not _env_path.is_file():
    _env_log.warning("api/.env not found at %s — add OPENAI_API_KEY here for AI blog.", _env_path.resolve())
elif not (os.environ.get("OPENAI_API_KEY") or "").strip():
    _env_log.warning(
        "api/.env exists but no OpenAI key found — use OPENAI_API_KEY=sk-... (or OPENAI_KEY / OPEN_AI_API_KEY): %s",
        _env_path.resolve(),
    )

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "pearly-admin")
SITE_BASE_URL = os.environ.get("SITE_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
AUTO_TRANSLATE = os.environ.get("AUTO_TRANSLATE", "1").strip() not in ("0", "false", "False", "no", "NO")


def _blog_ai_target_word_count() -> int:
    """Target words per language in content_html (visible text); override with BLOG_AI_TARGET_WORDS in api/.env."""
    try:
        n = int((os.environ.get("BLOG_AI_TARGET_WORDS") or "750").strip())
    except ValueError:
        n = 750
    return max(350, min(n, 2400))


app = FastAPI(title="Pearly Smile CMS API")
log = logging.getLogger("pearly")
if not log.handlers:
    logging.basicConfig(level=logging.INFO)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded media
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

_tokens: set[str] = set()
security = HTTPBearer(auto_error=False)


def _read_data() -> dict:
    if not DATA_PATH.is_file():
        raise HTTPException(status_code=500, detail="data.json missing")
    with DATA_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def _write_data(payload: dict) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    _atomic_write_utf8(DATA_PATH, text)


def require_admin(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
) -> None:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token")
    if creds.credentials not in _tokens:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


class LoginBody(BaseModel):
    username: str
    password: str


class Booking(BaseModel):
    id: str
    patient_id: str | None = None
    patient_name: str
    phone: str = ""
    doctor: str
    doctor_id: str | None = None
    branch_id: str | None = None
    service: str
    date: str  # YYYY-MM-DD (kept string for simplicity)
    time: str = ""
    timestamp: str | None = None  # ISO timestamp
    status: str = "new"  # "new" | "viewed"
    notes: str | None = None


class BookingSubmitIn(BaseModel):
    """Public site booking form (no auth)."""

    patient_name: str
    phone: str
    doctor: str
    doctor_id: str | None = None
    service: str = "Consultation"
    date: str
    time: str
    notes: str | None = None
    branch: str | None = None
    branch_id: str | None = None


class Event(BaseModel):
    """Incoming event payload (public + admin). Unknown fields ignored; session/page default if omitted."""

    model_config = ConfigDict(extra="ignore")

    type: str
    session_id: str = ""
    page: str = ""
    timestamp: str | None = None
    patient_id: str | None = None
    doctor: str | None = None
    service: str | None = None
    offer_id: str | None = None
    booking_id: str | None = None


class EventRow(BaseModel):
    # Stored event row (includes generated id).
    id: str
    type: str
    timestamp: str
    session_id: str
    page: str
    patient_id: str | None = None
    doctor: str | None = None
    service: str | None = None
    offer_id: str | None = None
    booking_id: str | None = None


def _blog_row_is_published(row: dict) -> bool:
    """Normalize blog.json `published` (bool or legacy string) for public routes."""
    if not isinstance(row, dict):
        return False
    if "published" not in row:
        return True
    v = row["published"]
    if v is True:
        return True
    if v is False:
        return False
    if isinstance(v, str):
        s = v.strip().lower()
        if s in ("0", "false", "no", "off", "draft", ""):
            return False
        if s in ("1", "true", "yes", "on", "published"):
            return True
    return bool(v)


class BlogPost(BaseModel):
    """Stored in blog.json; admin Blog tab edits these fields. Public site: GET /api/blog, GET /api/blog/{slug}."""

    slug: str
    title: str | dict[str, str]
    excerpt: str | dict[str, str]
    tag: str | dict[str, str] | None = None
    read_time: int | None = None  # minutes
    hero_image: str | None = None  # featured image on article + cards (also accepts uploads under /uploads/)
    hero_focal_x: float | None = Field(
        default=None,
        ge=0,
        le=100,
        description="Object-position X % for hero/cards (default 50).",
    )
    hero_focal_y: float | None = Field(
        default=None,
        ge=0,
        le=100,
        description="Object-position Y % for hero/cards (default 50).",
    )
    meta_title: str | dict[str, str] | None = None
    meta_description: str | dict[str, str] | None = None
    content_html: str | dict[str, str]  # article body HTML (ar/en); rendered in #blog-content
    related_slugs: list[str] | None = None
    published: bool = True
    published_at: str | None = None  # ISO UTC
    updated_at: str | None = None  # ISO UTC


def _read_blog() -> list[dict]:
    if not BLOG_PATH.exists():
        _write_blog([])
        return []
    with BLOG_PATH.open(encoding="utf-8") as f:
        payload = json.load(f)
        if not isinstance(payload, list):
            raise HTTPException(status_code=500, detail="blog.json must be an array")
        return payload


def _write_blog(payload: list[dict]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    _atomic_write_utf8(BLOG_PATH, text)


def _slugify(s: str) -> str:
    s = (s or "").strip().lower()
    out = []
    last_dash = False
    for ch in s:
        ok = "a" <= ch <= "z" or "0" <= ch <= "9"
        if ok:
            out.append(ch)
            last_dash = False
        else:
            if not last_dash:
                out.append("-")
                last_dash = True
    slug = "".join(out).strip("-")
    return slug or ("post-" + secrets.token_hex(4))


def _pick_lang(val: object, lang: str = "en") -> str:
    if val is None:
        return ""
    if isinstance(val, str):
        return val
    if isinstance(val, dict):
        v = val.get(lang) or val.get("en") or val.get("ar")
        return str(v) if v is not None else ""
    return str(val)


def _public_url(path: str) -> str:
    # Ensure absolute URL for sitemap + AI index.
    if not path:
        return SITE_BASE_URL + "/"
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if not path.startswith("/"):
        path = "/" + path
    return SITE_BASE_URL + path


class GenerateBlogRequest(BaseModel):
    topic: str | None = None
    draft: bool = Field(
        default=False,
        description="If true, save as draft (hidden from public /api/blog until you publish in admin).",
    )


class OpenAIKeyIn(BaseModel):
    """Admin dashboard: save OpenAI key into api/.env (server-side only)."""

    api_key: str


class TranslateIn(BaseModel):
    """Admin dashboard: AI translation helper."""

    text: str
    source_lang: str | None = None
    target_lang: str


def _openai_key_preview(key: str) -> str:
    k = (key or "").strip()
    if not k:
        return ""
    if len(k) <= 12:
        return k[:2] + "…" + k[-2:]
    return k[:7] + "…" + k[-4:]


def _line_stores_openai_api_key(line: str) -> bool:
    s = (line or "").strip()
    if not s or s.startswith("#") or "=" not in s:
        return False
    if s.lower().startswith("export "):
        s = s[7:].strip()
    head, _, _ = s.partition("=")
    return _canonical_openai_env_key(head) == "OPENAI_API_KEY"


def _current_openai_key_from_sources() -> str:
    _load_env_file(_env_path)
    _coalesce_openai_api_key_env()
    return (os.environ.get("OPENAI_API_KEY") or "").strip()


def _upsert_openai_key_in_dotenv(api_key: str) -> None:
    """Replace or append OPENAI_API_KEY in api/.env; updates process env."""
    key_clean = (api_key or "").strip()
    if len(key_clean) < 20 or not key_clean.startswith("sk-"):
        raise HTTPException(status_code=400, detail="Invalid API key format (expected sk-…, length ≥ 20).")
    env_path = _env_path
    lines_out: list[str] = []
    if env_path.is_file():
        raw = env_path.read_text(encoding="utf-8-sig")
        for line in raw.splitlines():
            if _line_stores_openai_api_key(line):
                continue
            lines_out.append(line.rstrip("\r"))
    while lines_out and lines_out[-1] == "":
        lines_out.pop()
    lines_out.append("OPENAI_API_KEY=" + key_clean)
    text = "\n".join(lines_out) + "\n"
    _atomic_write_utf8(env_path, text)
    os.environ["OPENAI_API_KEY"] = key_clean


def _openai_api_key() -> str:
    # Re-read api/.env so a key added while the server runs is picked up without restart.
    _load_env_file(_env_path)
    _coalesce_openai_api_key_env()
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not key:
        p = _env_path.resolve()
        exists = p.is_file()
        raise HTTPException(
            status_code=503,
            detail=(
                "Missing OPENAI_API_KEY. Use exactly: OPENAI_API_KEY=sk-... in "
                + str(p)
                + f" (file_exists={exists}). One line, no spaces around '='. "
                "Allowed names: OPENAI_API_KEY (preferred) or OPENAI_KEY / OPEN_AI_API_KEY."
            ),
        )
    return key


def _strip_json_code_fence(s: str) -> str:
    """If the model wrapped JSON in ``` fences, strip them before json.loads."""
    s = (s or "").strip()
    if not s.startswith("```"):
        return s
    lines = s.split("\n")
    if lines and lines[0].strip().startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _responses_extract_text(resp: dict) -> str:
    """
    Extract assistant text from POST /v1/responses JSON.
    Raw HTTP bodies usually do NOT include top-level `output_text` (that is an SDK helper),
    so we walk `output[]` / nested `content` blocks.
    """
    if not isinstance(resp, dict):
        return ""
    top = str(resp.get("output_text") or "").strip()
    if top:
        return top
    out = resp.get("output")
    if not isinstance(out, list):
        return ""
    chunks: list[str] = []
    for item in out:
        if not isinstance(item, dict):
            continue
        itype = str(item.get("type") or "")
        if itype == "message":
            for c in item.get("content") or []:
                if not isinstance(c, dict):
                    continue
                ctype = str(c.get("type") or "")
                if ctype in ("output_text", "text"):
                    t = str(c.get("text") or "").strip()
                    if t:
                        chunks.append(t)
        elif itype in ("output_text", "text") and item.get("text"):
            t = str(item.get("text") or "").strip()
            if t:
                chunks.append(t)
    return "\n".join(chunks).strip()


def _openai_http_error_detail(raw: str) -> str:
    """Prefer OpenAI's JSON error.message over a raw blob."""
    raw = (raw or "").strip()
    if not raw:
        return ""
    try:
        j = json.loads(raw)
        err = j.get("error") if isinstance(j, dict) else None
        if isinstance(err, dict):
            msg = str(err.get("message") or err.get("code") or "").strip()
            if msg:
                return msg
    except Exception:
        pass
    return raw[:800]


def _openai_post_json(url: str, payload: dict) -> dict:
    key = _openai_api_key()
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return json.loads(raw)
    except urllib.error.HTTPError as e:  # type: ignore[attr-defined]
        status = int(getattr(e, "code", 0) or 0)
        raw = ""
        try:
            raw = e.read().decode("utf-8", errors="replace")
        except Exception:
            raw = ""
        detail = _openai_http_error_detail(raw) or (raw[:500] if raw else str(e))
        err_code = ""
        try:
            j = json.loads(raw) if raw else {}
            err = j.get("error") if isinstance(j, dict) else None
            if isinstance(err, dict):
                err_code = str(err.get("code") or err.get("type") or "").strip()
        except Exception:
            err_code = ""
        blob = (detail + " " + err_code).lower()
        # Distinct statuses so the admin UI can show billing vs key vs generic (not 401: that is admin session).
        if err_code == "insufficient_quota" or "insufficient_quota" in blob or "billing_hard_limit" in blob:
            raise HTTPException(
                status_code=402,
                detail="OpenAI credits / billing (insufficient_quota): " + detail,
            )
        if "incorrect api key" in blob or err_code == "invalid_api_key" or (
            status == 401 and "api key" in blob
        ):
            raise HTTPException(status_code=502, detail="OpenAI API key rejected: " + detail)
        if status == 429 or "rate_limit" in err_code.lower() or "rate limit" in blob:
            raise HTTPException(status_code=429, detail="OpenAI rate limit: " + detail)
        raise HTTPException(status_code=502, detail="OpenAI API error: " + detail)
    except Exception as e:
        raise HTTPException(status_code=502, detail="OpenAI API error: " + str(e))


def translate_text(text: str, target_language: str) -> str:
    """
    AI translation helper (server-side only).
    Returns a natural, professional translation (not overly literal).
    """
    if not AUTO_TRANSLATE:
        return ""
    src = (text or "").strip()
    if not src:
        return ""
    target = (target_language or "").strip().lower()
    if target not in ("ar", "en", "arabic", "english"):
        raise HTTPException(status_code=400, detail="Invalid target_language")
    target_name = "Arabic" if target in ("ar", "arabic") else "English"

    system = (
        "You are a professional medical/dental content translator. "
        "Translate accurately, naturally, and concisely. "
        "Do not add new claims, pricing, phone numbers, or extra sections. "
        "Output MUST be valid JSON only."
    )
    user = (
        "Translate the following text into " + target_name + ".\n"
        "Keep meaning, keep tone professional, and preserve any simple HTML tags if present.\n\n"
        "Return JSON exactly in this shape:\n"
        '{ "translation": "..." }\n\n'
        "TEXT:\n"
        + src
    )
    payload = {
        "model": OPENAI_MODEL,
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": system}]},
            {"role": "user", "content": [{"type": "input_text", "text": user}]},
        ],
        "text": {"format": {"type": "json_object"}},
    }
    resp = _openai_post_json("https://api.openai.com/v1/responses", payload)
    out = _strip_json_code_fence(_responses_extract_text(resp))
    if not out:
        return ""
    try:
        obj = json.loads(out)
    except Exception:
        return ""
    tr = obj.get("translation") if isinstance(obj, dict) else ""
    return str(tr or "").strip()


def _auto_translate_lang_field(obj: dict, key: str) -> None:
    """
    If obj[key] is a bilingual dict, fill missing side (ar/en) only when empty.
    Never overwrites existing values.
    """
    if not AUTO_TRANSLATE:
        return
    if not isinstance(obj, dict):
        return
    val = obj.get(key)
    if not isinstance(val, dict):
        return
    ar = str(val.get("ar") or "").strip()
    en = str(val.get("en") or "").strip()
    if ar and not en:
        val["en"] = translate_text(ar, "en")
    elif en and not ar:
        val["ar"] = translate_text(en, "ar")


def _auto_translate_blog_row(row: dict) -> None:
    for k in ("title", "excerpt", "tag", "meta_title", "meta_description", "content_html"):
        _auto_translate_lang_field(row, k)


def _auto_translate_cms_payload(payload: dict) -> None:
    if not AUTO_TRANSLATE:
        return
    if not isinstance(payload, dict):
        return

    # Services: title/text/more (+ optional fields if added later)
    services = payload.get("services")
    if isinstance(services, list):
        for s in services:
            if not isinstance(s, dict):
                continue
            for k in ("title", "text", "more"):
                _auto_translate_lang_field(s, k)

    # Doctors: name/role (+ optional bio if present)
    doctors = payload.get("doctors")
    if isinstance(doctors, list):
        for d in doctors:
            if not isinstance(d, dict):
                continue
            for k in ("name", "role", "bio"):
                _auto_translate_lang_field(d, k)

    # Offers: title/text (+ optional tag/cta fields later)
    offers = payload.get("offers")
    if isinstance(offers, list):
        for o in offers:
            if not isinstance(o, dict):
                continue
            for k in ("title", "text"):
                _auto_translate_lang_field(o, k)

    # Offers page copy (already bilingual)
    offers_page = payload.get("offersPage")
    if isinstance(offers_page, dict):
        for k in ("heroEyebrow", "heroTitle", "sectionEyebrow", "sectionTitle"):
            _auto_translate_lang_field(offers_page, k)

    # Careers jobs
    jobs = payload.get("careersJobs")
    if isinstance(jobs, list):
        for j in jobs:
            if not isinstance(j, dict):
                continue
            for k in ("title", "department", "employment_type", "location", "short", "description", "requirements", "benefits"):
                _auto_translate_lang_field(j, k)

    # Insurance providers
    providers = payload.get("insuranceProviders")
    if isinstance(providers, list):
        for p in providers:
            if not isinstance(p, dict):
                continue
            for k in ("name", "short", "coverage"):
                _auto_translate_lang_field(p, k)

    # Homepage About section
    home_about = payload.get("homeAbout")
    if isinstance(home_about, dict):
        for k in ("eyebrow", "title", "description", "highlightsLabel"):
            _auto_translate_lang_field(home_about, k)
        vis = home_about.get("visual")
        if isinstance(vis, dict):
            for k in ("kicker", "sub", "chip"):
                _auto_translate_lang_field(vis, k)
        cta = home_about.get("cta")
        if isinstance(cta, dict):
            for k in ("primaryLabel", "secondaryLabel", "tertiaryLabel"):
                _auto_translate_lang_field(cta, k)
        pills = home_about.get("pills")
        if isinstance(pills, list):
            for pill in pills:
                if isinstance(pill, dict):
                    _auto_translate_lang_field(pill, "title")
        cards = home_about.get("cards")
        if isinstance(cards, list):
            for card in cards:
                if isinstance(card, dict):
                    for k in ("title", "text"):
                        _auto_translate_lang_field(card, k)
        tags = home_about.get("tags")
        if isinstance(tags, list):
            for tag in tags:
                if isinstance(tag, dict):
                    _auto_translate_lang_field(tag, "title")


def generate_blog_with_ai(topic: str | None = None, *, published: bool = True) -> dict:
    """
    Server-side AI blog generator.
    Returns a BlogPost-compatible dict. `published` comes from the admin request (draft checkbox), not from env vars.
    """
    now = datetime.now(timezone.utc).isoformat()
    t = (topic or "").strip()
    seed = t if t else "a high-intent dental topic for patients in Abu Dhabi, UAE"
    target_w = _blog_ai_target_word_count()
    low = int(target_w * 0.95)
    high = int(target_w * 1.05)

    system = (
        "You are a professional SEO content writer specializing in dental marketing in the UAE. "
        "You write high-quality, SEO-optimized bilingual blog content for a dental clinic. "
        "Clinic (use exactly these names when required): "
        'English: "Pearly Smile Dental Center"; Arabic: "مركز بسمة اللؤلؤ للأسنان". '
        "Location: Abu Dhabi, United Arab Emirates. "
        "Tone: professional, engaging, marketing-focused; accurate and non-alarmist; avoid unsupported medical claims. "
        "SEO: natural keyword integration only—never keyword stuffing. "
        "Do NOT include pricing, phone numbers, or invented credentials. "
        "Output MUST be a single valid JSON object only—no markdown fences, no explanations, no text before or after JSON."
    )

    user = (
        "Generate ONE blog post as structured JSON for the clinic website.\n"
        f"Topic / focus: {seed}\n\n"
        f"WORD COUNT (strict): For EACH of content_html.ar and content_html.en, the visible prose "
        f"(word count if you strip HTML tags) must be between {low} and {high} words (target ≈{target_w}, ±5% only).\n\n"
        "Mandatory mentions (natural placement, not forced lists):\n"
        '- English body (content_html.en): include the exact phrase "Pearly Smile Dental Center" at least 2 times.\n'
        "- Both languages: mention Abu Dhabi at least once each, naturally.\n"
        '- Arabic body (content_html.ar): optionally include "مركز بسمة اللؤلؤ للأسنان" once if it reads naturally; '
        "otherwise keep clinic references natural in Arabic.\n\n"
        "Structure inside BOTH content_html versions:\n"
        "- Opening introduction (plain paragraphs before first H2).\n"
        "- 3 to 5 section headings using <h2> (and <h3> only if helpful).\n"
        "- Short paragraphs; scannable layout.\n"
        "- Conclusion with a strong call-to-action plus a short CTA encouraging booking or consultation.\n"
        "- Near the end, include one CTA block with links exactly: "
        '<a href="/#booking">Book</a> and <a href="/team.html">Doctors</a> '
        "(use equivalent Arabic link text for the ar version if you translate anchor text, but keep the same href values).\n\n"
        "Return EXACTLY this JSON shape (all string values populated; read_time integer minutes, realistic for length):\n"
        "{\n"
        '  "title": {"ar": "...", "en": "..."},\n'
        '  "excerpt": {"ar": "...", "en": "..."},\n'
        '  "tag": {"ar": "...", "en": "..."},\n'
        '  "keywords": ["..."],\n'
        '  "slug": "seo-friendly-slug-in-english-latin",\n'
        '  "read_time": 6,\n'
        '  "meta_title": {"ar": "...", "en": "..."},\n'
        '  "meta_description": {"ar": "...", "en": "..."},\n'
        '  "content_html": {"ar": "<h2>...</h2><p>...</p>", "en": "<h2>...</h2><p>...</p>"}\n'
        "}\n\n"
        "Also:\n"
        "- title, meta_title, meta_description: SEO-friendly, unique per language.\n"
        "- keywords: 6–12 relevant dental SEO terms for the topic (no stuffing).\n"
        "- slug: 3–7 English words, lowercase, hyphenated.\n"
        "- read_time: estimate reading minutes consistent with article length.\n"
    )

    payload = {
        "model": OPENAI_MODEL,
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": system}]},
            {"role": "user", "content": [{"type": "input_text", "text": user}]},
        ],
        "text": {"format": {"type": "json_object"}},
    }

    resp = _openai_post_json("https://api.openai.com/v1/responses", payload)

    text = _responses_extract_text(resp)
    text = _strip_json_code_fence(text)

    if not text:
        log.warning(
            "generate_blog: empty model text; response keys=%s",
            list(resp.keys())[:20] if isinstance(resp, dict) else type(resp),
        )
        raise HTTPException(
            status_code=502,
            detail="OpenAI returned no text in the response. Check OPENAI_MODEL and API access, or try again.",
        )

    try:
        obj = json.loads(text)
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="OpenAI returned text that is not valid JSON. First chars: " + text[:180].replace("\n", " "),
        )

    if not isinstance(obj, dict):
        raise HTTPException(status_code=502, detail="OpenAI returned unexpected payload.")

    slug = _slugify(str(obj.get("slug") or obj.get("title", "") or ""))
    post = {
        "slug": slug,
        "title": obj.get("title") or {"ar": "", "en": ""},
        "excerpt": obj.get("excerpt") or {"ar": "", "en": ""},
        "tag": obj.get("tag") or {"ar": "", "en": ""},
        "read_time": int(obj.get("read_time") or 4),
        "hero_image": None,
        "hero_focal_x": None,
        "hero_focal_y": None,
        "meta_title": obj.get("meta_title") or {"ar": "", "en": ""},
        "meta_description": obj.get("meta_description") or {"ar": "", "en": ""},
        "content_html": obj.get("content_html") or {"ar": "", "en": ""},
        "related_slugs": [],
        "published": bool(published),
        "published_at": now,
        "updated_at": now,
        "ai_keywords": obj.get("keywords") if isinstance(obj.get("keywords"), list) else [],
        "ai_generated": True,
    }

    return post


def _guess_ext(content_type: str | None, filename: str | None) -> str:
    ct = (content_type or "").lower().strip()
    fn = (filename or "").lower().strip()
    if ct in ("image/webp",):
        return "webp"
    if ct in ("image/png",):
        return "png"
    if ct in ("image/jpeg", "image/jpg"):
        return "jpg"
    for ext in (".webp", ".png", ".jpg", ".jpeg"):
        if fn.endswith(ext):
            return ext.lstrip(".").replace("jpeg", "jpg")
    return "jpg"


try:
    import multipart  # type: ignore  # noqa: F401
    from fastapi import UploadFile, File  # type: ignore

    @app.post("/api/upload")
    async def upload_image(file: UploadFile = File(...), _: None = Depends(require_admin)):
        """
        Admin-only image upload.
        Saves optimized images into /uploads and returns public URL.
        """
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="Missing file")
        if not (file.content_type or "").lower().startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        ext = _guess_ext(file.content_type, file.filename)
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty file")

        log.info(
            "upload: name=%s type=%s size=%sB ext=%s",
            file.filename,
            file.content_type,
            len(raw),
            ext,
        )

        # Best-effort optimization with Pillow (if installed). Fallback: save as-is.
        out_name = "img_" + secrets.token_hex(10)
        out_ext = "webp"  # preferred
        out_path = UPLOADS_DIR / f"{out_name}.{out_ext}"

        optimized_bytes: bytes | None = None
        out_w: int | None = None
        out_h: int | None = None
        try:
            from PIL import Image  # type: ignore
            import io

            img = Image.open(io.BytesIO(raw))
            img = img.convert("RGB")
            # Cap both dimensions (hero + mobile); never upscale; preserve aspect ratio.
            max_w, max_h = 1920, 1920
            w0, h0 = img.size
            scale = min(1.0, max_w / float(w0), max_h / float(h0))
            if scale < 1.0:
                nw, nh = int(w0 * scale), int(h0 * scale)
                try:
                    resample = Image.Resampling.LANCZOS  # Pillow ≥10
                except AttributeError:
                    resample = Image.LANCZOS  # type: ignore[attr-defined]
                img = img.resize((nw, nh), resample)
            out_w, out_h = int(img.width), int(img.height)
            buf = io.BytesIO()
            img.save(buf, format="WEBP", quality=82, method=6)
            optimized_bytes = buf.getvalue()
        except Exception:
            optimized_bytes = None

        if optimized_bytes:
            out_path.write_bytes(optimized_bytes)
        else:
            # keep original extension if Pillow isn't available
            out_ext = ext
            out_path = UPLOADS_DIR / f"{out_name}.{out_ext}"
            out_path.write_bytes(raw)

        log.info("upload: saved=%s", str(out_path))
        payload: dict = {"ok": True, "url": f"/uploads/{out_path.name}"}
        if out_w is not None and out_h is not None:
            payload["width"] = out_w
            payload["height"] = out_h
        return payload

except Exception:

    @app.post("/api/upload")
    async def upload_image_disabled(_: None = Depends(require_admin)):
        raise HTTPException(
            status_code=503,
            detail='Uploads are disabled: install "python-multipart" (pip install python-multipart)',
        )


@app.get("/data")
def get_data_legacy():
    """Backward-compatible alias."""
    return _read_data()


@app.get("/api/data")
def get_data():
    return _read_data()


@app.get("/api/ai-index")
def ai_index() -> dict:
    """
    AI/search-friendly discovery endpoint.
    Returns a clean, structured summary of the clinic + CMS content.
    """
    data = _read_data()
    services = data.get("services") if isinstance(data, dict) else []
    doctors = data.get("doctors") if isinstance(data, dict) else []
    offers = data.get("offers") if isinstance(data, dict) else []

    posts = _read_blog()
    blogs = [p for p in posts if isinstance(p, dict) and _blog_row_is_published(p)]

    # Clinic info (keep consistent across site)
    clinic = {
        "name": "Pearly Smile Dental Center",
        "url": _public_url("/"),
        "telephone": "+966500000000",
        "location": {"country": "SA", "city": "Riyadh"},
        "description": "Modern dental clinic offering comprehensive care: implants, orthodontics, whitening, surgery, and family dentistry.",
        "image": _public_url("/Images/logo.png") if (ROOT_DIR / "Images" / "logo.png").exists() else "",
    }

    def service_to_row(s: dict) -> dict:
        href = str(s.get("href") or "")
        return {
            "id": str(s.get("id") or ""),
            "name": {"ar": _pick_lang(s.get("title"), "ar"), "en": _pick_lang(s.get("title"), "en")},
            "description": {"ar": _pick_lang(s.get("text"), "ar"), "en": _pick_lang(s.get("text"), "en")},
            "url": _public_url("/" + href.lstrip("/")) if href else "",
            "image": str(s.get("image") or ""),
            "keywords": list(
                {
                    str(s.get("id") or ""),
                    _pick_lang(s.get("title"), "en"),
                    _pick_lang(s.get("title"), "ar"),
                }
                - {""}
            ),
        }

    def doctor_to_row(d: dict) -> dict:
        return {
            "id": str(d.get("id") or ""),
            "name": {"ar": _pick_lang(d.get("name"), "ar"), "en": _pick_lang(d.get("name"), "en")},
            "description": {"ar": _pick_lang(d.get("role"), "ar"), "en": _pick_lang(d.get("role"), "en")},
            "url": _public_url("/team.html"),
            "image": str(d.get("image") or ""),
            "keywords": list(
                {
                    _pick_lang(d.get("name"), "en"),
                    _pick_lang(d.get("name"), "ar"),
                    _pick_lang(d.get("role"), "en"),
                    _pick_lang(d.get("role"), "ar"),
                }
                - {""}
            ),
        }

    def offer_to_row(o: dict) -> dict:
        return {
            "id": str(o.get("id") or ""),
            "name": {"ar": _pick_lang(o.get("title"), "ar"), "en": _pick_lang(o.get("title"), "en")},
            "description": {"ar": _pick_lang(o.get("text"), "ar"), "en": _pick_lang(o.get("text"), "en")},
            "url": _public_url("/offers.html"),
            "image": str(o.get("image") or ""),
            "keywords": list({_pick_lang(o.get("title"), "en"), _pick_lang(o.get("title"), "ar")} - {""}),
        }

    def blog_to_row(p: dict) -> dict:
        slug = _slugify(p.get("slug", ""))
        return {
            "slug": slug,
            "name": {"ar": _pick_lang(p.get("title"), "ar"), "en": _pick_lang(p.get("title"), "en")},
            "description": {
                "ar": _pick_lang(p.get("meta_description") or p.get("excerpt"), "ar"),
                "en": _pick_lang(p.get("meta_description") or p.get("excerpt"), "en"),
            },
            "url": _public_url("/blog/" + slug),
            "image": str(p.get("hero_image") or ""),
            "tags": {"ar": _pick_lang(p.get("tag"), "ar"), "en": _pick_lang(p.get("tag"), "en")},
            "keywords": list(
                {
                    _pick_lang(p.get("tag"), "en"),
                    _pick_lang(p.get("tag"), "ar"),
                    _pick_lang(p.get("title"), "en"),
                    _pick_lang(p.get("title"), "ar"),
                }
                - {""}
            ),
        }

    safe_services = [service_to_row(s) for s in services if isinstance(s, dict)]
    safe_doctors = [doctor_to_row(d) for d in doctors if isinstance(d, dict)]
    safe_offers = [offer_to_row(o) for o in offers if isinstance(o, dict)]
    safe_blogs = [blog_to_row(p) for p in blogs if isinstance(p, dict)]

    keyword_set: set[str] = set(
        [
            "dental clinic",
            "dentist",
            "dental implants",
            "teeth whitening",
            "orthodontics",
            "root canal",
            "veneers",
            "gum treatment",
            "oral surgery",
            "pediatric dentistry",
        ]
    )
    for row in safe_services + safe_doctors + safe_offers + safe_blogs:
        for k in row.get("keywords") or []:
            if isinstance(k, str) and k.strip():
                keyword_set.add(k.strip())

    return {
        "clinic": clinic,
        "services": safe_services,
        "doctors": safe_doctors,
        "blogs": safe_blogs,
        "offers": safe_offers,
        "keywords": sorted(keyword_set),
    }


@app.post("/api/login", response_model=None)
def login(body: LoginBody):
    ok_user = secrets.compare_digest(body.username, ADMIN_USERNAME)
    ok_pass = secrets.compare_digest(body.password, ADMIN_PASSWORD)
    if not (ok_user and ok_pass):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = secrets.token_urlsafe(32)
    _tokens.add(token)
    return {"token": token, "token_type": "bearer"}


@app.post("/data")
def post_data_legacy(payload: dict, _: None = Depends(require_admin)):
    return _save_payload(payload)


@app.post("/api/data")
def post_data(payload: dict, _: None = Depends(require_admin)):
    return _save_payload(payload)


def _save_payload(payload: dict) -> JSONResponse:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")
    for key in ("stats", "services", "doctors", "offers"):
        if key not in payload:
            raise HTTPException(status_code=400, detail=f"Missing key: {key}")
    if not isinstance(payload["stats"], dict):
        raise HTTPException(status_code=400, detail="stats must be an object")
    for arr in ("services", "doctors", "offers"):
        if not isinstance(payload[arr], list):
            raise HTTPException(status_code=400, detail=f"{arr} must be an array")
    # Preserve optional CMS keys (offers page copy, featured ids, home doctors, etc.)
    _auto_translate_cms_payload(payload)
    _write_data(payload)
    return JSONResponse({"ok": True})


def _read_bookings() -> list[dict]:
    if not BOOKINGS_PATH.exists():
        _write_bookings([])
        return []
    with BOOKINGS_PATH.open(encoding="utf-8") as f:
        payload = json.load(f)
        if not isinstance(payload, list):
            raise HTTPException(status_code=500, detail="bookings.json must be an array")
        # Migration: ensure required keys for dashboard + public flow.
        changed = False
        for row in payload:
            if not isinstance(row, dict):
                continue
            if not row.get("patient_id"):
                row["patient_id"] = secrets.token_urlsafe(10)
                changed = True
            if "phone" not in row:
                row["phone"] = ""
                changed = True
            if "time" not in row:
                row["time"] = ""
                changed = True
            if "status" not in row:
                # Legacy rows: treat as already seen so they don't flood the "new" badge
                row["status"] = "viewed"
                changed = True
            if "notes" not in row:
                row["notes"] = None
                changed = True
        if changed:
            _write_bookings(payload)
        return payload


def _write_bookings(payload: list[dict]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    _atomic_write_utf8(BOOKINGS_PATH, text)


_DEFAULT_TIME_SLOTS = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
]

BRANCH_IDS = ("main", "khalidiya")

_PRESET_REASON_EN_AR: dict[str, tuple[str, str]] = {
    "maintenance": (
        "This branch is closed for maintenance today.",
        "هذا الفرع مغلق للصيانة اليوم.",
    ),
    "holiday": ("This branch is closed (holiday).", "هذا الفرع مغلق (عطلة)."),
    "doctor_unavailable": (
        "This branch has no online booking availability today.",
        "لا يتوفر حجز إلكتروني في هذا الفرع اليوم.",
    ),
    "custom": ("This branch is closed on this day.", "هذا الفرع مغلق في هذا اليوم."),
}


def _default_schedule() -> dict:
    """Legacy flat schema (v1) — used when migrating old schedule.json."""
    return {
        "version": 1,
        "global_paused": False,
        "time_slots": list(_DEFAULT_TIME_SLOTS),
        "weekly_open_weekdays": [6, 0, 1, 2, 3],
        "closed_dates": [],
        "open_date_overrides": [],
        "doctors": [],
    }


def _normalize_time_slot(t: str) -> str | None:
    t = (t or "").strip()
    if not t:
        return None
    parts = t.replace(".", ":").split(":")
    if len(parts) < 2:
        return None
    try:
        h = int(parts[0])
        m = int(parts[1])
    except ValueError:
        return None
    if not (0 <= h <= 23 and 0 <= m <= 59):
        return None
    return f"{h:02d}:{m:02d}"


def _coerce_schedule_dict(raw: dict) -> dict:
    out = _default_schedule()
    for k in out:
        if k in raw:
            out[k] = raw[k]
    if not isinstance(out.get("time_slots"), list):
        out["time_slots"] = _default_schedule()["time_slots"]
    else:
        slots: list[str] = []
        for x in out["time_slots"]:
            n = _normalize_time_slot(str(x))
            if n and n not in slots:
                slots.append(n)
        out["time_slots"] = slots or _default_schedule()["time_slots"]
    for key in ("weekly_open_weekdays", "closed_dates", "open_date_overrides", "doctors"):
        if not isinstance(out.get(key), list):
            out[key] = []
    # doctor rows: keep only dicts with doctor_id
    clean_docs: list[dict] = []
    for row in out.get("doctors") or []:
        if isinstance(row, dict) and str(row.get("doctor_id") or "").strip():
            clean_docs.append(row)
    out["doctors"] = clean_docs
    return out


def _normalize_branch_id(bid: str | None) -> str:
    b = (str(bid or "main")).strip().lower()
    if b in ("one", "khalidiya", "khalidia"):
        return "khalidiya"
    return "main"


def _default_branch_block() -> dict:
    return {
        "label_en": "Branch",
        "label_ar": "فرع",
        "time_slots": list(_DEFAULT_TIME_SLOTS),
        "weekly_open_weekdays": [6, 0, 1, 2, 3],
        "closed_dates": [],
        "closed_days": [],
        "open_date_overrides": [],
        "doctors": [],
    }


def _coerce_branch_schedule_dict(raw: dict) -> dict:
    base = _default_branch_block()
    if not isinstance(raw, dict):
        return base
    if raw.get("label_en"):
        base["label_en"] = str(raw["label_en"])[:120]
    if raw.get("label_ar"):
        base["label_ar"] = str(raw["label_ar"])[:120]
    ts = raw.get("time_slots")
    if not isinstance(ts, list):
        base["time_slots"] = list(_DEFAULT_TIME_SLOTS)
    else:
        slots: list[str] = []
        for x in ts:
            n = _normalize_time_slot(str(x))
            if n and n not in slots:
                slots.append(n)
        base["time_slots"] = slots or list(_DEFAULT_TIME_SLOTS)
    for key in ("weekly_open_weekdays", "closed_dates", "open_date_overrides"):
        if isinstance(raw.get(key), list):
            base[key] = list(raw[key])
    cdays: list[dict] = []
    if isinstance(raw.get("closed_days"), list):
        for item in raw["closed_days"]:
            if not isinstance(item, dict):
                continue
            ds = str(item.get("date") or "").strip()
            if len(ds) < 8:
                continue
            rt = str(item.get("reason_type") or "holiday").strip() or "holiday"
            cdays.append(
                {
                    "date": ds,
                    "reason_type": rt[:40],
                    "message_en": str(item.get("message_en") or "")[:500],
                    "message_ar": str(item.get("message_ar") or "")[:500],
                    "show_message": bool(item.get("show_message", True)),
                    "custom_detail": str(item.get("custom_detail") or "")[:500],
                }
            )
    have_dates = {str(x.get("date") or "") for x in cdays}
    for item in raw.get("closed_dates") or []:
        ds = str(item).strip()
        if ds and ds not in have_dates:
            have_dates.add(ds)
            cdays.append(
                {
                    "date": ds,
                    "reason_type": "holiday",
                    "message_en": "",
                    "message_ar": "",
                    "show_message": True,
                    "custom_detail": "",
                }
            )
    base["closed_days"] = cdays
    base["closed_dates"] = []
    clean_docs: list[dict] = []
    for row in raw.get("doctors") or []:
        if isinstance(row, dict) and str(row.get("doctor_id") or "").strip():
            clean_docs.append(row)
    base["doctors"] = clean_docs
    return base


def _default_full_schedule() -> dict:
    main = _default_branch_block()
    main["label_en"] = "Khalidiyah Branch"
    main["label_ar"] = "فرع الخالدية"
    kh = _default_branch_block()
    kh["label_en"] = "Khalifa City A Branch"
    kh["label_ar"] = "فرع مدينة خليفة أ"
    return {"version": 2, "global_paused": False, "branches": {"main": main, "khalidiya": kh}}


def _coerce_full_schedule(raw: dict) -> dict:
    out = _default_full_schedule()
    if not isinstance(raw, dict):
        return out
    out["global_paused"] = bool(raw.get("global_paused"))
    branches_in = raw.get("branches")
    if isinstance(branches_in, dict):
        for bid in BRANCH_IDS:
            b = branches_in.get(bid)
            if isinstance(b, dict):
                out["branches"][bid] = _coerce_branch_schedule_dict(b)
    return out


def _get_branch_schedule(full: dict, branch_id: str) -> dict:
    branches = full.get("branches")
    if isinstance(branches, dict):
        b = branches.get(branch_id)
        if isinstance(b, dict):
            return _coerce_branch_schedule_dict(b)
    return _coerce_branch_schedule_dict({})


def _find_closed_day_for_branch(bsched: dict, ds: str) -> dict | None:
    for row in bsched.get("closed_days") or []:
        if isinstance(row, dict) and str(row.get("date") or "").strip() == ds:
            return row
    for item in bsched.get("closed_dates") or []:
        if str(item).strip() == ds:
            return {
                "date": ds,
                "reason_type": "holiday",
                "message_en": "",
                "message_ar": "",
                "show_message": True,
                "custom_detail": "",
            }
    return None


def _patient_closure_from_closed_row(row: dict) -> dict:
    rt = str(row.get("reason_type") or "holiday").strip() or "holiday"
    if rt not in _PRESET_REASON_EN_AR:
        rt = "custom"
    pen, par = _PRESET_REASON_EN_AR[rt]
    msg_en = (row.get("message_en") or "").strip() or pen
    msg_ar = (row.get("message_ar") or "").strip() or par
    if rt == "custom":
        cd = (row.get("custom_detail") or "").strip()
        if cd:
            msg_en = f"{msg_en} ({cd})" if msg_en else cd
            msg_ar = f"{msg_ar} ({cd})" if msg_ar else cd
    show = row.get("show_message", True)
    if show is False:
        msg_en = _PRESET_REASON_EN_AR["custom"][0]
        msg_ar = _PRESET_REASON_EN_AR["custom"][1]
    return {
        "kind": "closed_day",
        "reason_type": rt,
        "message_en": msg_en,
        "message_ar": msg_ar,
        "show_to_patients": bool(show),
    }


def _patient_closure_weekly() -> dict:
    en, ar = _PRESET_REASON_EN_AR["custom"]
    return {
        "kind": "weekly_closed",
        "reason_type": "weekly_off",
        "message_en": en,
        "message_ar": ar,
        "show_to_patients": True,
    }


def _branch_open_for_booking(bsched: dict, d: date, ds: str) -> tuple[bool, dict | None]:
    row = _find_closed_day_for_branch(bsched, ds)
    if row:
        return False, _patient_closure_from_closed_row(row)
    open_ov = {str(x) for x in (bsched.get("open_date_overrides") or []) if x}
    if ds in open_ov:
        return True, None
    weekly = bsched.get("weekly_open_weekdays")
    if isinstance(weekly, list) and weekly:
        wd = d.weekday()
        if wd not in set(int(x) for x in weekly if str(x).lstrip("-").isdigit()):
            return False, _patient_closure_weekly()
    return True, None


def _read_schedule() -> dict:
    if not SCHEDULE_PATH.exists():
        s = _default_full_schedule()
        _write_schedule(s)
        return s
    with SCHEDULE_PATH.open(encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, dict):
        raise HTTPException(status_code=500, detail="schedule.json must be an object")
    if isinstance(raw.get("branches"), dict) and raw["branches"]:
        return _coerce_full_schedule(raw)
    legacy = _coerce_schedule_dict(raw)
    full = _default_full_schedule()
    full["global_paused"] = bool(legacy.get("global_paused"))
    nb = {k: legacy[k] for k in legacy if k not in ("version", "global_paused")}
    for bid in BRANCH_IDS:
        full["branches"][bid] = _coerce_branch_schedule_dict(copy.deepcopy(nb))
    full["branches"]["main"]["label_en"] = "Khalidiyah Branch"
    full["branches"]["main"]["label_ar"] = "فرع الخالدية"
    full["branches"]["khalidiya"]["label_en"] = "Khalifa City A Branch"
    full["branches"]["khalidiya"]["label_ar"] = "فرع مدينة خليفة أ"
    _write_schedule(full)
    return full


def _write_schedule(payload: dict) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    _atomic_write_utf8(SCHEDULE_PATH, text)


def _parse_iso_date(s: str) -> date | None:
    s = (s or "").strip()
    if len(s) < 8:
        return None
    try:
        y, m, d = (int(s[0:4]), int(s[5:7]), int(s[8:10]))
        return date(y, m, d)
    except ValueError:
        return None


def _doctor_row_from_schedule(schedule: dict, doctor_id: str) -> dict:
    did = (doctor_id or "").strip()
    for row in schedule.get("doctors") or []:
        if isinstance(row, dict) and str(row.get("doctor_id") or "").strip() == did:
            return row
    return {
        "doctor_id": did,
        "accepts_bookings": True,
        "allowed_slots": None,
        "allowed_weekdays": None,
        "blocked_dates": [],
        "blocked_ranges": [],
    }


def _date_in_ranges(d: date, ranges: list) -> bool:
    for r in ranges or []:
        if not isinstance(r, dict):
            continue
        a = _parse_iso_date(str(r.get("start") or ""))
        b = _parse_iso_date(str(r.get("end") or ""))
        if a and b and a <= d <= b:
            return True
    return False


def _doctor_id_from_display_name(data: dict, name: str) -> str | None:
    target = (name or "").strip().lower()
    if not target:
        return None
    for doc in data.get("doctors") or []:
        if not isinstance(doc, dict):
            continue
        did = str(doc.get("id") or "").strip()
        for lang in ("ar", "en"):
            v = _pick_lang(doc.get("name"), lang)
            if v.strip().lower() == target:
                return did or None
    return None


def _booking_row_branch_id(b: dict) -> str:
    raw = str(b.get("branch_id") or "").strip()
    if not raw:
        return "main"
    return _normalize_branch_id(raw)


def _doctor_data_by_id(data: dict, doctor_id: str) -> dict | None:
    did = (doctor_id or "").strip()
    for doc in data.get("doctors") or []:
        if isinstance(doc, dict) and str(doc.get("id") or "").strip() == did:
            return doc
    return None


def _doctor_serves_branch(doc: dict | None, branch_id: str) -> bool:
    """
    CMS doctors may list branch_ids: ["main","khalidiya"].
    Missing branch_ids = serve all branches (backward compatible).
    Empty branch_ids = serve no branch (hidden from booking everywhere).
    """
    if not isinstance(doc, dict):
        return False
    bid = _normalize_branch_id(branch_id)
    raw = doc.get("branch_ids")
    if raw is None:
        return True
    if not isinstance(raw, list):
        return True
    if len(raw) == 0:
        return False
    allowed = {_normalize_branch_id(str(x)) for x in raw if str(x).strip()}
    return bid in allowed


def _booked_times_for(
    bookings: list[dict],
    date_str: str,
    doctor_id: str | None,
    doctor_name: str,
    branch_id: str | None = None,
) -> set[str]:
    branch_id = _normalize_branch_id(branch_id)
    out: set[str] = set()
    dn = (doctor_name or "").strip()
    did = (doctor_id or "").strip()
    for b in bookings:
        if not isinstance(b, dict):
            continue
        if _booking_row_branch_id(b) != branch_id:
            continue
        if str(b.get("date") or "").strip() != date_str:
            continue
        t = str(b.get("time") or "").strip()
        if not t:
            continue
        bid = str(b.get("doctor_id") or "").strip()
        if did and bid and bid == did:
            out.add(t)
        elif did and (b.get("doctor") or "").strip() == dn:
            out.add(t)
        elif not did and dn and (b.get("doctor") or "").strip() == dn:
            out.add(t)
    return out


def compute_available_slots(
    full_schedule: dict,
    data: dict,
    bookings: list[dict],
    date_str: str,
    doctor_id: str | None,
    branch_id: str | None = None,
) -> tuple[list[str], str | None, dict | None]:
    """
    Returns (slots, error_reason, closure_detail).
    closure_detail is set when reason == clinic_closed (patient-facing messages).
    """
    branch_id = _normalize_branch_id(branch_id)
    if full_schedule.get("global_paused"):
        return [], "booking_paused", None

    d = _parse_iso_date(date_str)
    if not d:
        return [], "invalid_date", None

    bsched = _get_branch_schedule(full_schedule, branch_id)
    open_ok, closure = _branch_open_for_booking(bsched, d, date_str)
    if not open_ok:
        return [], "clinic_closed", closure

    data_docs = [x for x in (data.get("doctors") or []) if isinstance(x, dict)]
    did = (doctor_id or "").strip()
    if not did:
        return [], "missing_doctor", None

    found = any(str(x.get("id") or "").strip() == did for x in data_docs)
    if not found:
        return [], "unknown_doctor", None

    doc_row = _doctor_data_by_id(data, did)
    if not _doctor_serves_branch(doc_row, branch_id):
        return [], "doctor_not_at_branch", None

    drow = _doctor_row_from_schedule(bsched, did)
    if not drow.get("accepts_bookings", True):
        return [], "doctor_disabled", None

    for bd in drow.get("blocked_dates") or []:
        if str(bd).strip() == date_str:
            return [], "doctor_blocked", None

    if _date_in_ranges(d, drow.get("blocked_ranges") or []):
        return [], "doctor_range_blocked", None

    aw = drow.get("allowed_weekdays")
    if isinstance(aw, list) and aw:
        if d.weekday() not in set(int(x) for x in aw if str(x).lstrip("-").isdigit()):
            return [], "doctor_day_off", None

    global_slots = [_normalize_time_slot(str(x)) for x in (bsched.get("time_slots") or [])]
    global_slots = [x for x in global_slots if x]

    allowed = drow.get("allowed_slots")
    if isinstance(allowed, list) and allowed:
        allow_set = {_normalize_time_slot(str(x)) for x in allowed}
        allow_set.discard(None)
        slots = [s for s in global_slots if s in allow_set]
    else:
        slots = list(global_slots)

    doc_name = ""
    for x in data_docs:
        if str(x.get("id") or "").strip() == did:
            doc_name = (_pick_lang(x.get("name"), "en") or _pick_lang(x.get("name"), "ar") or "").strip()
            break
    taken = _booked_times_for(bookings, date_str, did, doc_name, branch_id)
    slots = [s for s in slots if s not in taken]
    return slots, None, None


@app.get("/api/bookings")
def get_bookings(_: None = Depends(require_admin)):
    return _read_bookings()


@app.get("/api/booking/branches")
def public_booking_branches():
    """Public branch list for booking UI (labels from schedule per branch)."""
    full = _read_schedule()
    out: list[dict] = []
    for bid in BRANCH_IDS:
        b = _get_branch_schedule(full, bid)
        out.append(
            {
                "id": bid,
                "name": {
                    "en": str(
                        b.get("label_en") or ("Khalidiyah Branch" if bid == "main" else "Khalifa City A Branch")
                    ),
                    "ar": str(
                        b.get("label_ar") or ("فرع الخالدية" if bid == "main" else "فرع مدينة خليفة أ")
                    ),
                },
            }
        )
    return out


@app.get("/api/booking/doctors")
def public_booking_doctors(branch_id: str | None = Query(default=None)):
    """Doctors available for public booking (respects schedule.accepts_bookings for that branch)."""
    data = _read_data()
    schedule = _read_schedule()
    bid = _normalize_branch_id(branch_id)
    bsched = _get_branch_schedule(schedule, bid)
    out: list[dict] = []
    for doc in data.get("doctors") or []:
        if not isinstance(doc, dict):
            continue
        did = str(doc.get("id") or "").strip()
        if not did:
            continue
        if not _doctor_serves_branch(doc, bid):
            continue
        drow = _doctor_row_from_schedule(bsched, did)
        if not drow.get("accepts_bookings", True):
            continue
        out.append(
            {
                "id": did,
                "name": {
                    "ar": _pick_lang(doc.get("name"), "ar"),
                    "en": _pick_lang(doc.get("name"), "en"),
                },
                "role": {
                    "ar": _pick_lang(doc.get("role"), "ar"),
                    "en": _pick_lang(doc.get("role"), "en"),
                },
                "image": doc.get("image"),
            }
        )
    return out


@app.get("/api/booking/availability")
def public_booking_availability(
    date: str,
    doctor_id: str,
    branch_id: str | None = Query(default=None),
):
    """Slots still bookable for a doctor on a date (clinic + doctor rules + existing bookings)."""
    schedule = _read_schedule()
    data = _read_data()
    bookings = _read_bookings()
    bid = _normalize_branch_id(branch_id)
    slots, reason, closure = compute_available_slots(schedule, data, bookings, date, doctor_id, bid)
    day_unavailable = bool(schedule.get("global_paused")) or reason == "clinic_closed"
    return {
        "slots": slots,
        "reason": reason,
        "global_paused": bool(schedule.get("global_paused")),
        "branch_closed": reason == "clinic_closed",
        "day_unavailable": day_unavailable,
        "doctor_at_branch": reason != "doctor_not_at_branch",
        "closure": closure,
    }


@app.get("/api/admin/schedule")
def admin_get_schedule(_: None = Depends(require_admin)):
    return _read_schedule()


@app.put("/api/admin/schedule")
def admin_put_schedule(payload: dict, _: None = Depends(require_admin)):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="JSON object required")
    merged = _coerce_full_schedule(payload)
    _write_schedule(merged)
    return {"ok": True, "schedule": merged}


@app.post("/api/bookings/submit")
def submit_booking_public(body: BookingSubmitIn):
    """
    Public booking form — no auth. Creates a row with status=new.
    """
    name = (body.patient_name or "").strip()
    if len(name) < 2 or len(name) > 200:
        raise HTTPException(status_code=400, detail="Invalid patient name")
    phone = (body.phone or "").strip()
    if len(phone) < 5 or len(phone) > 40:
        raise HTTPException(status_code=400, detail="Invalid phone")
    doctor = (body.doctor or "").strip()
    if len(doctor) < 1 or len(doctor) > 200:
        raise HTTPException(status_code=400, detail="Invalid doctor")
    service = (body.service or "Consultation").strip()[:120] or "Consultation"
    d = (body.date or "").strip()
    if len(d) < 8 or len(d) > 32:
        raise HTTPException(status_code=400, detail="Invalid date")
    t_raw = (body.time or "").strip()[:20]
    if not t_raw:
        raise HTTPException(status_code=400, detail="Invalid time")
    notes = (body.notes or "").strip()[:2000] or None
    branch = (body.branch or "").strip()[:80] or None
    branch_id = _normalize_branch_id(body.branch_id)
    if branch:
        extra = "Branch: " + branch
        notes = (notes + "\n" + extra) if notes else extra
    bid_line = "Branch ID: " + branch_id
    notes = (notes + "\n" + bid_line) if notes else bid_line

    data = _read_data()
    schedule = _read_schedule()
    bookings = _read_bookings()
    if schedule.get("global_paused"):
        raise HTTPException(
            status_code=400,
            detail="Online booking is paused. Please call the clinic.",
        )
    did = (body.doctor_id or "").strip() or (_doctor_id_from_display_name(data, doctor) or "")
    if not did:
        raise HTTPException(status_code=400, detail="Unknown doctor — refresh the page and try again")
    doc_row = _doctor_data_by_id(data, did)
    if not doc_row:
        raise HTTPException(status_code=400, detail="Unknown doctor — refresh the page and try again")
    if not _doctor_serves_branch(doc_row, branch_id):
        raise HTTPException(
            status_code=400,
            detail="Selected doctor is not available at this branch.",
        )
    t = _normalize_time_slot(t_raw)
    if not t:
        raise HTTPException(status_code=400, detail="Invalid time format")
    slots, reason, _closure = compute_available_slots(schedule, data, bookings, d, did, branch_id)
    if reason == "clinic_closed":
        raise HTTPException(
            status_code=400,
            detail="This day is not available for booking at this branch.",
        )
    if reason == "booking_paused":
        raise HTTPException(status_code=400, detail="Online booking is paused. Please call the clinic.")
    if reason == "doctor_not_at_branch":
        raise HTTPException(
            status_code=400,
            detail="Selected doctor is not available at this branch.",
        )
    if t not in slots:
        raise HTTPException(
            status_code=400,
            detail="Selected slot is no longer available. Please choose another time."
            if not reason
            else f"Slot not available ({reason})",
        )

    now = datetime.now(timezone.utc).isoformat()
    bid = "bk_" + secrets.token_urlsafe(12)
    row = {
        "id": bid,
        "patient_id": secrets.token_urlsafe(10),
        "patient_name": name,
        "phone": phone,
        "doctor": doctor,
        "doctor_id": did,
        "branch_id": branch_id,
        "service": service,
        "date": d,
        "time": t,
        "timestamp": now,
        "status": "new",
        "notes": notes,
    }
    bookings.insert(0, row)
    _write_bookings(bookings)
    return {"ok": True, "id": bid}


@app.post("/api/bookings")
def upsert_booking(body: Booking, _: None = Depends(require_admin)):
    row = body.model_dump()
    if not row.get("patient_id"):
        row["patient_id"] = secrets.token_urlsafe(10)
    if not row.get("timestamp"):
        row["timestamp"] = datetime.now(timezone.utc).isoformat()
    if row.get("status") not in ("new", "viewed"):
        row["status"] = "viewed"

    bookings = _read_bookings()
    # Upsert by id
    for i, existing in enumerate(bookings):
        if isinstance(existing, dict) and existing.get("id") == row["id"]:
            bookings[i] = row
            _write_bookings(bookings)
            return {"ok": True, "booking": row}

    bookings.insert(0, row)
    _write_bookings(bookings)
    return {"ok": True, "booking": row}


@app.post("/api/bookings/mark-viewed")
def mark_bookings_viewed(_: None = Depends(require_admin)):
    """Set status from 'new' → 'viewed' for all bookings (admin opened Bookings tab)."""
    bookings = _read_bookings()
    changed = False
    for b in bookings:
        if isinstance(b, dict) and b.get("status") == "new":
            b["status"] = "viewed"
            changed = True
    if changed:
        _write_bookings(bookings)
    return {"ok": True, "changed": changed}


@app.delete("/api/bookings/{booking_id}")
def delete_booking(booking_id: str, _: None = Depends(require_admin)):
    bookings = _read_bookings()
    before = len(bookings)
    bookings = [b for b in bookings if not (isinstance(b, dict) and b.get("id") == booking_id)]
    if len(bookings) == before:
        raise HTTPException(status_code=404, detail="Booking not found")
    _write_bookings(bookings)
    return {"ok": True}


def _read_events() -> list[dict]:
    if not EVENTS_PATH.exists():
        _write_events([])
        return []
    with EVENTS_PATH.open(encoding="utf-8") as f:
        payload = json.load(f)
        if not isinstance(payload, list):
            raise HTTPException(status_code=500, detail="events.json must be an array")
        return payload


def _write_events(payload: list[dict]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    _atomic_write_utf8(EVENTS_PATH, text)


@app.get("/api/events")
def get_events(_: None = Depends(require_admin)):
    return _read_events()


@app.post("/api/events")
def post_event(body: Event):
    """
    Public event ingestion endpoint.

    - Stores to events.json (array of objects)
    - Auto-generates id
    - Auto-generates ISO UTC timestamp if missing
    """

    incoming = body.model_dump()

    ts = (incoming.get("timestamp") or "").strip()
    if not ts:
        ts = datetime.now(timezone.utc).isoformat()

    row = EventRow(
        id="evt_" + secrets.token_urlsafe(12),
        type=str(incoming.get("type") or ""),
        timestamp=ts,
        session_id=str(incoming.get("session_id") or "") or "unknown",
        page=str(incoming.get("page") or "") or "/",
        patient_id=incoming.get("patient_id"),
        doctor=incoming.get("doctor"),
        service=incoming.get("service"),
        offer_id=incoming.get("offer_id"),
        booking_id=incoming.get("booking_id"),
    ).model_dump()

    payload = _read_events()
    payload.insert(0, row)
    _write_events(payload)
    return {"ok": True, "event": row}


# -----------------------------
# Blog (JSON-backed)
# -----------------------------


@app.get("/api/blog")
def list_blog_posts():
    posts = _read_blog()
    # Public listing: only published posts.
    out = [p for p in posts if isinstance(p, dict) and _blog_row_is_published(p)]
    return out


@app.get("/api/blog/{slug}")
def get_blog_post(slug: str):
    slug = _slugify(slug)
    posts = _read_blog()
    for p in posts:
        if isinstance(p, dict) and _slugify(p.get("slug", "")) == slug and _blog_row_is_published(p):
            return p
    raise HTTPException(status_code=404, detail="Post not found")


@app.get("/api/admin/blog")
def admin_list_blog(_: None = Depends(require_admin)):
    return _read_blog()


@app.post("/api/admin/blog")
def admin_create_blog_post(body: BlogPost, _: None = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    row = body.model_dump()
    row["slug"] = _slugify(row.get("slug") or row.get("title") or "")
    row["updated_at"] = now
    if not row.get("published_at"):
        row["published_at"] = now
    _auto_translate_blog_row(row)

    posts = _read_blog()
    if any(isinstance(p, dict) and _slugify(p.get("slug", "")) == row["slug"] for p in posts):
        raise HTTPException(status_code=409, detail="Slug already exists")
    posts.insert(0, row)
    _write_blog(posts)
    return {"ok": True, "post": row}


@app.get("/api/admin/openai-key")
def admin_get_openai_key_status(_: None = Depends(require_admin)):
    """Returns whether a key is configured + masked preview only (never the full secret)."""
    k = _current_openai_key_from_sources()
    if not k:
        return {"configured": False, "preview": None}
    return {"configured": True, "preview": _openai_key_preview(k)}


@app.post("/api/admin/openai-key")
def admin_set_openai_key(body: OpenAIKeyIn, _: None = Depends(require_admin)):
    """Persist OpenAI key to api/.env and activate it in this process (no restart)."""
    _upsert_openai_key_in_dotenv(body.api_key)
    k = _current_openai_key_from_sources()
    return {"ok": True, "preview": _openai_key_preview(k)}


@app.post("/api/admin/translate")
def admin_translate(body: TranslateIn, _: None = Depends(require_admin)):
    """
    Translate a single text into target language.
    Returns both sides in a stable JSON shape: { ar, en }.
    """
    src = (body.text or "").strip()
    target = (body.target_lang or "").strip().lower()
    if target not in ("ar", "en", "arabic", "english"):
        raise HTTPException(status_code=400, detail="Invalid target_lang")
    out = translate_text(src, target)

    s = (body.source_lang or "").strip().lower()
    if s not in ("ar", "en", "arabic", "english"):
        s = ""

    if target in ("en", "english"):
        return {"ar": src if s in ("ar", "arabic") else "", "en": out}
    return {"ar": out, "en": src if s in ("en", "english") else ""}


@app.post("/api/generate-blog")
def generate_blog(body: GenerateBlogRequest | None = None, _: None = Depends(require_admin)):
    """
    Admin-only manual trigger for AI blog generation.
    Saves to blog.json. Published on the public blog unless the request sets draft=true (admin checkbox).
    """
    req = body if isinstance(body, GenerateBlogRequest) else GenerateBlogRequest()
    topic = req.topic
    post = generate_blog_with_ai(topic=topic, published=not bool(req.draft))

    posts = _read_blog()
    existing = {(_slugify(p.get("slug", "")) if isinstance(p, dict) else "") for p in posts}
    if post["slug"] in existing:
        post["slug"] = post["slug"] + "-" + secrets.token_hex(2)

    posts.insert(0, post)
    _write_blog(posts)
    return {"ok": True, "post": post}


@app.put("/api/admin/blog/{slug}")
def admin_update_blog_post(slug: str, body: BlogPost, _: None = Depends(require_admin)):
    slug = _slugify(slug)
    now = datetime.now(timezone.utc).isoformat()
    row = body.model_dump()
    row["slug"] = _slugify(row.get("slug") or row.get("title") or slug)
    row["updated_at"] = now
    if not row.get("published_at"):
        row["published_at"] = now
    _auto_translate_blog_row(row)

    posts = _read_blog()
    for i, p in enumerate(posts):
        if isinstance(p, dict) and _slugify(p.get("slug", "")) == slug:
            # Avoid collisions if slug changed
            if row["slug"] != slug and any(
                isinstance(x, dict) and _slugify(x.get("slug", "")) == row["slug"] for x in posts
            ):
                raise HTTPException(status_code=409, detail="Slug already exists")
            posts[i] = row
            _write_blog(posts)
            return {"ok": True, "post": row}
    raise HTTPException(status_code=404, detail="Post not found")


@app.delete("/api/admin/blog/{slug}")
def admin_delete_blog_post(slug: str, _: None = Depends(require_admin)):
    slug = _slugify(slug)
    posts = _read_blog()
    before = len(posts)
    posts = [p for p in posts if not (isinstance(p, dict) and _slugify(p.get("slug", "")) == slug)]
    if len(posts) == before:
        raise HTTPException(status_code=404, detail="Post not found")
    _write_blog(posts)
    return {"ok": True}


@app.get("/admin")
@app.get("/admin/")
def admin_page():
    path = ROOT_DIR / "admin.html"
    if not path.is_file():
        raise HTTPException(status_code=404)
    return FileResponse(path)


@app.get("/blog")
@app.get("/blog/")
def blog_listing_page():
    path = ROOT_DIR / "blog.html"
    if not path.is_file():
        raise HTTPException(status_code=404)
    return FileResponse(path)


@app.get("/blog/{slug:path}")
def blog_post_page(slug: str):
    # SPA-like: always serve the same article shell; JS loads by slug.
    path = ROOT_DIR / "blog-post.html"
    if not path.is_file():
        raise HTTPException(status_code=404)
    return FileResponse(path)


@app.get("/robots.txt")
def robots_txt() -> PlainTextResponse:
    body = "\n".join(
        [
            "User-agent: *",
            "Allow: /",
            f"Sitemap: {_public_url('/sitemap.xml')}",
            "",
        ]
    )
    return PlainTextResponse(body, media_type="text/plain; charset=utf-8")


@app.get("/sitemap.xml")
def sitemap_xml() -> Response:
    data = _read_data()
    services = data.get("services") if isinstance(data, dict) else []
    posts = [p for p in _read_blog() if isinstance(p, dict) and _blog_row_is_published(p)]

    urls: list[str] = [
        _public_url("/"),
        _public_url("/services.html"),
        _public_url("/team.html"),
        _public_url("/about.html"),
        _public_url("/offers.html"),
        _public_url("/blog"),
    ]

    for s in services:
        if not isinstance(s, dict):
            continue
        href = str(s.get("href") or "").strip()
        if href:
            urls.append(_public_url("/" + href.lstrip("/")))

    for p in posts:
        slug = _slugify(p.get("slug", ""))
        if slug:
            urls.append(_public_url("/blog/" + slug))

    urls = sorted(set(urls))

    def esc(x: str) -> str:
        return (
            x.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
        )

    xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for u in urls:
        xml.append("  <url><loc>" + esc(u) + "</loc></url>")
    xml.append("</urlset>")
    return Response("\n".join(xml) + "\n", media_type="application/xml; charset=utf-8")


@app.get("/health")
def health():
    return {"status": "ok"}


app.mount("/", StaticFiles(directory=str(ROOT_DIR), html=True), name="site")
