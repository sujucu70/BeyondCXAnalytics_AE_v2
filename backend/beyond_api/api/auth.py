# beyond_api/api/auth.py
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from beyond_api.security import get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


@router.get("/check")
def check_auth(current_user: str = Depends(get_current_user)):
    """
    Endpoint muy simple: si las credenciales Basic son correctas,
    devuelve 200 con el usuario. Si no, get_current_user lanza 401.
    """
    return JSONResponse(
        content={
            "user": current_user,
            "status": "ok",
        }
    )
