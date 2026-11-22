"""
ScanHistory model — stores every product a user has viewed.

Since authentication is not yet implemented, we use a `device_id` string
(UUID generated on the mobile device) to identify users. This can be
upgraded to a proper user_id foreign key when auth is added later.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Index
from sqlalchemy.sql import func
from app.database.session import Base


class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)

    # Authenticated user (nullable for legacy device-based scans)
    user_id = Column(Integer, nullable=True, index=True)

    # Anonymous device identifier (replaced by user_id when auth is added)
    device_id = Column(String(128), nullable=True, index=True)

    # Core product reference
    barcode = Column(String(64), nullable=False)
    product_name = Column(String(255), nullable=True)
    brand = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=True)

    # Score snapshot at the time of scan (may differ if scoring rules are updated)
    nutrition_score = Column(Float, nullable=True)
    nutrition_grade = Column(String(10), nullable=True)

    # Snapshot of key nutrients per 100g (stored as JSON for flexibility)
    nutrients_snapshot = Column(JSON, nullable=True)

    # Source of the scan: "barcode" | "ocr"
    scan_source = Column(String(20), default="barcode", nullable=False)

    # Timestamp
    scanned_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    # Composite index for efficient history queries per device
    __table_args__ = (
        Index("ix_scan_history_device_time", "device_id", "scanned_at"),
    )
