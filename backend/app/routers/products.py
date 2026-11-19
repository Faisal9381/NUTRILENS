from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database.session import get_db
from app.schemas.product import ProductResponse, ProductNotFoundResponse
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


def get_optional_db():
    """
    Yields DB session if DB is accessible, or None if unavailable.
    Ensures barcode scans still work against Open Food Facts even when DB is offline.
    """
    db = None
    try:
        from app.database.session import SessionLocal
        db = SessionLocal()
        yield db
    finally:
        if db is not None:
            db.close()


@router.get(
    "/barcode/{barcode}",
    response_model=ProductResponse,
    responses={
        404: {"model": ProductNotFoundResponse, "description": "Product not found in database or Open Food Facts"}
    }
)
async def get_product_by_barcode(
    barcode: str,
    db: Optional[Session] = Depends(get_optional_db)
):
    """
    Lookup a product by barcode.
    1. Checks PostgreSQL cache first.
    2. On miss, queries Open Food Facts API v2.
    3. Normalizes and caches to PostgreSQL.
    4. Returns verified nutrition data.
    """
    clean_barcode = barcode.strip()
    if not clean_barcode:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barcode cannot be empty."
        )

    product = await ProductService.get_or_fetch_product(barcode=clean_barcode, db=db)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with barcode '{clean_barcode}' could not be found."
        )

    return product
