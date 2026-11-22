"""
Scan History router — no-op when DB is offline, works fully when DB is running.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from app.routers.auth import get_current_user_optional_db

router = APIRouter(prefix="/history", tags=["Scan History"])


class ScanHistoryCreate(BaseModel):
    barcode: str
    product_name: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    nutrition_score: Optional[float] = None
    nutrition_grade: Optional[str] = None
    nutrients_snapshot: Optional[dict] = None
    scan_source: str = "barcode"


class ScanHistoryResponse(BaseModel):
    id: int
    barcode: str
    product_name: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    nutrition_score: Optional[float] = None
    nutrition_grade: Optional[str] = None
    scanned_at: str

    class Config:
        from_attributes = True


def _get_optional_db():
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


@router.post("")
def add_scan(
    payload: ScanHistoryCreate,
    current_user=Depends(get_current_user_optional_db),
    db=Depends(_get_optional_db),
):
    if db is None:
        return {"message": "Scan history stored locally (DB offline)"}

    try:
        from app.models.scan_history import ScanHistory
        user_id = current_user.id if hasattr(current_user, "id") else current_user.get("id", 0)
        scan = ScanHistory(user_id=user_id, **payload.model_dump())
        db.add(scan)
        db.commit()
        db.refresh(scan)
        return scan
    except Exception:
        return {"message": "Scan history could not be saved (DB error)"}


@router.get("")
def list_scans(
    current_user=Depends(get_current_user_optional_db),
    db=Depends(_get_optional_db),
):
    if db is None:
        return []
    try:
        from app.models.scan_history import ScanHistory
        user_id = current_user.id if hasattr(current_user, "id") else current_user.get("id", 0)
        scans = db.query(ScanHistory).filter(
            ScanHistory.user_id == user_id
        ).order_by(ScanHistory.scanned_at.desc()).all()
        return scans
    except Exception:
        return []
