from __future__ import annotations

import os
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

# auto_error=False para que no dispare el popup nativo del navegador automáticamente
security = HTTPBasic(auto_error=False)

# En producción: export BASIC_AUTH_USERNAME y BASIC_AUTH_PASSWORD.
BASIC_USER = os.getenv("BASIC_AUTH_USERNAME", "beyond")
BASIC_PASS = os.getenv("BASIC_AUTH_PASSWORD", "beyond2026")


def get_current_user(credentials: HTTPBasicCredentials | None = Depends(security)) -> str:
    """
    Valida el usuario/contraseña vía HTTP Basic.
    NO envía WWW-Authenticate para evitar el popup nativo del navegador
    (el frontend tiene su propio formulario de login).
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales requeridas",
        )

    correct_username = secrets.compare_digest(credentials.username, BASIC_USER)
    correct_password = secrets.compare_digest(credentials.password, BASIC_PASS)

    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    return credentials.username
