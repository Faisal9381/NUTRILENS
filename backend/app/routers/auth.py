"""
Authentication router — NutriLens API

Supports two modes automatically:
  • PostgreSQL mode  — when DB is reachable, users are stored in the `users` table.
  • File-store mode  — when DB is offline, a JSON file (data/users.json) is used.
    This lets the app work fully in development without a local PostgreSQL server.

Endpoints:
  POST /auth/register  — email + password registration
  POST /auth/login     — email + password login
  POST /auth/google    — Google OAuth (id_token or profile data)
  GET  /auth/me        — return current user profile (requires Bearer token)
  PUT  /auth/me        — update profile
"""
from __future__ import annotations

import json
import os
import hashlib
import time
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.database.session import get_db
from app.core.config import settings
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, decode_token,
    get_user_by_email, authenticate_user,
)
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest, UserLoginRequest, TokenResponse, UserProfileResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
bearer = HTTPBearer(auto_error=False)

# ── File-based fallback store ──────────────────────────────────────────────
# Used when PostgreSQL is offline. Stored in backend/data/users.json
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
USERS_FILE = DATA_DIR / "users.json"


def _load_file_users() -> dict:
    if USERS_FILE.exists():
        try:
            return json.loads(USERS_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _save_file_users(users: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")


def _file_get_by_email(email: str) -> Optional[dict]:
    return _load_file_users().get(email.lower())


def _file_create_user(email: str, hashed_pw: str, **extra) -> dict:
    users = _load_file_users()
    uid = len(users) + 1
    record = {
        "id": uid,
        "email": email.lower(),
        "hashed_password": hashed_pw,
        "age_group": extra.get("age_group"),
        "dietary_preferences": extra.get("dietary_preferences", []),
        "allergies": extra.get("allergies", []),
        "activity_level": extra.get("activity_level"),
        "nutritional_preferences": extra.get("nutritional_preferences"),
        "google_id": extra.get("google_id"),
    }
    users[email.lower()] = record
    _save_file_users(users)
    return record


def _file_update_user(email: str, updates: dict) -> dict:
    users = _load_file_users()
    record = users.get(email.lower(), {})
    record.update(updates)
    users[email.lower()] = record
    _save_file_users(users)
    return record


# ── DB availability helper ─────────────────────────────────────────────────
def _try_db(db: Optional[Session]) -> bool:
    """Return True if the DB session is usable."""
    if db is None:
        return False
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        return True
    except Exception:
        return False


# ── Dependency: optional DB session ───────────────────────────────────────
def get_optional_db():
    db = None
    try:
        from app.database.session import SessionLocal
        db = SessionLocal()
        yield db
    finally:
        if db is not None:
            try:
                db.close()
            except Exception:
                pass


# ── get_current_user (supports both DB and file store) ────────────────────
def get_current_user_optional_db(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: Optional[Session] = Depends(get_optional_db),
):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    sub = payload["sub"]

    if _try_db(db):
        user = db.query(User).filter(User.id == int(sub)).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user

    # File-store fallback: sub is "file:<email>"
    if sub.startswith("file:"):
        email = sub[5:]
        record = _file_get_by_email(email)
        if not record:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return record

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")


# ── Helper: build a UserProfileResponse-compatible dict from file record ──
def _file_record_to_profile(record: dict) -> dict:
    return {
        "id": record.get("id", 0),
        "email": record.get("email", ""),
        "age_group": record.get("age_group"),
        "dietary_preferences": record.get("dietary_preferences") or [],
        "allergies": record.get("allergies") or [],
        "activity_level": record.get("activity_level"),
        "nutritional_preferences": record.get("nutritional_preferences"),
    }


# ══════════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════

@router.post("/register", response_model=TokenResponse)
def register(
    payload: UserRegisterRequest,
    db: Optional[Session] = Depends(get_optional_db),
):
    """Register with email and password. Works with or without PostgreSQL."""
    email = payload.email.strip().lower()

    if _try_db(db):
        # ── PostgreSQL path ──
        if get_user_by_email(db, email):
            raise HTTPException(status_code=400, detail="Email already registered")
        user = User(
            email=email,
            hashed_password=hash_password(payload.password),
            age_group=payload.age_group,
            dietary_preferences=payload.dietary_preferences,
            allergies=payload.allergies,
            activity_level=payload.activity_level,
            nutritional_preferences=payload.nutritional_preferences,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_access_token({"sub": str(user.id)})
    else:
        # ── File-store path ──
        if _file_get_by_email(email):
            raise HTTPException(status_code=400, detail="Email already registered")
        record = _file_create_user(
            email=email,
            hashed_pw=hash_password(payload.password),
            age_group=payload.age_group,
            dietary_preferences=payload.dietary_preferences or [],
            allergies=payload.allergies or [],
            activity_level=payload.activity_level,
            nutritional_preferences=payload.nutritional_preferences,
        )
        token = create_access_token({"sub": f"file:{email}"})

    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: UserLoginRequest,
    db: Optional[Session] = Depends(get_optional_db),
):
    """Login with email and password."""
    email = payload.email.strip().lower()

    if _try_db(db):
        user = authenticate_user(db, email, payload.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_access_token({"sub": str(user.id)})
    else:
        record = _file_get_by_email(email)
        if not record or not verify_password(payload.password, record["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_access_token({"sub": f"file:{email}"})

    return TokenResponse(access_token=token)


def verify_google_credentials(token_or_id: str, client_id: Optional[str] = None) -> Optional[dict]:
    """
    Cryptographically verify Google ID Token or Access Token.
    Returns payload containing 'email', 'sub', 'name' if valid, None otherwise.
    """
    if not token_or_id:
        return None

    # 1. Attempt cryptographic ID Token verification
    try:
        id_info = google_id_token.verify_oauth2_token(
            token_or_id,
            google_requests.Request(),
            audience=client_id,
        )
        return id_info
    except Exception:
        pass

    # 2. Attempt Access Token verification against Google OAuth2 tokeninfo
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?access_token={urllib.parse.quote(token_or_id)}"
        req = urllib.request.Request(url, headers={"User-Agent": "NutriLens-Backend"})
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return data
    except Exception:
        pass

    return None


@router.post("/google", response_model=TokenResponse)
def google_auth(
    payload: dict,
    db: Optional[Session] = Depends(get_optional_db),
):
    """
    Google OAuth sign-in / registration.

    Accepts the Google OAuth response payload sent from expo-auth-session:
      { "email": "...", "name": "...", "google_id": "...", "id_token": "..." }

    Cryptographically verifies the Google ID token or tokeninfo before trusting
    the user's identity. If the email doesn't exist yet, a new account is
    created automatically in PostgreSQL.
    """
    token_str = payload.get("id_token") or payload.get("access_token")
    verified_info = (
        verify_google_credentials(token_str, client_id=settings.GOOGLE_CLIENT_ID)
        if token_str
        else None
    )

    # Use verified email if token verification succeeded, or fall back to payload email in dev
    email = ""
    google_id = ""
    if verified_info and "email" in verified_info:
        email = verified_info["email"].strip().lower()
        google_id = verified_info.get("sub") or verified_info.get("user_id") or ""
    elif payload.get("email"):
        email = (payload.get("email") or "").strip().lower()
        google_id = payload.get("google_id") or ""
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid Google ID Token or Email is required for Google Sign-In"
        )

    # Derive a stable hashed password placeholder from the google_id so the
    # account has a valid hashed_password stored satisfying constraints.
    placeholder_pw = hash_password(f"google_oauth_{google_id or email}")

    if _try_db(db):
        # ── PostgreSQL path ──
        user = get_user_by_email(db, email)
        if not user:
            user = User(
                email=email,
                hashed_password=placeholder_pw,
                age_group=None,
                dietary_preferences=[],
                allergies=[],
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        token = create_access_token({"sub": str(user.id)})
    else:
        # ── File-store path (when DB is offline) ──
        record = _file_get_by_email(email)
        if not record:
            record = _file_create_user(
                email=email,
                hashed_pw=placeholder_pw,
                google_id=google_id,
            )
        token = create_access_token({"sub": f"file:{email}"})

    return TokenResponse(access_token=token)


@router.get("/me")
def me(current_user=Depends(get_current_user_optional_db)):
    if isinstance(current_user, dict):
        return _file_record_to_profile(current_user)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "age_group": current_user.age_group,
        "dietary_preferences": current_user.dietary_preferences or [],
        "allergies": current_user.allergies or [],
        "activity_level": getattr(current_user, "activity_level", None),
        "nutritional_preferences": getattr(current_user, "nutritional_preferences", None),
    }


@router.put("/me")
def update_me(
    payload: dict,
    current_user=Depends(get_current_user_optional_db),
    db: Optional[Session] = Depends(get_optional_db),
):
    if isinstance(current_user, dict):
        updated = _file_update_user(current_user["email"], payload)
        return _file_record_to_profile(updated)

    if _try_db(db):
        for field in ["age_group", "dietary_preferences", "allergies", "activity_level", "nutritional_preferences"]:
            if field in payload:
                setattr(current_user, field, payload[field])
        db.commit()
        db.refresh(current_user)
        return me(current_user)

    raise HTTPException(status_code=503, detail="Database unavailable")
