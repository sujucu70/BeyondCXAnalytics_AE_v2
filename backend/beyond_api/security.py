from __future__ import annotations

import os
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

security = HTTPBasic()

# En producción: export BASIC_AUTH_USERNAME y BASIC_AUTH_PASSWORD.
BASIC_USER = os.getenv("BASIC_AUTH_USERNAME", "beyond")
BASIC_PASS = os.getenv("BASIC_AUTH_PASSWORD", "beyond2026")


def get_current_user(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    """
    Valida el usuario/contraseña vía HTTP Basic.
    """
    correct_username = secrets.compare_digest(credentials.username, BASIC_USER)
    correct_password = secrets.compare_digest(credentials.password, BASIC_PASS)

    if not (correct_username and correct_password):
        # Importante devolver el header WWW-Authenticate para que el navegador saque el prompt
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Basic"},
        )

    return credentials.username
