from __future__ import annotations

from pathlib import Path
import json
import math
from uuid import uuid4
from typing import Optional, Any, Literal

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse

from beyond_api.security import get_current_user
from beyond_api.services.analysis_service import run_analysis_collect_json

router = APIRouter(
    prefix="",
    tags=["analysis"],
)


def sanitize_for_json(obj: Any) -> Any:
    """
    Recorre un objeto (dict/list/escalares) y convierte:
    - NaN, +inf, -inf -> None
    para que sea JSON-compliant.
    """
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj

    if obj is None or isinstance(obj, (str, int, bool)):
        return obj

    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}

    if isinstance(obj, (list, tuple)):
        return [sanitize_for_json(v) for v in obj]

    return str(obj)


@router.post("/analysis")
async def analysis_endpoint(
    csv_file: UploadFile = File(...),
    economy_json: Optional[str] = Form(default=None),
    analysis: Literal["basic", "premium"] = Form(default="premium"),
    current_user: str = Depends(get_current_user),
):
    """
    Ejecuta el pipeline sobre un CSV subido (multipart/form-data) y devuelve
    ÚNICAMENTE un JSON con todos los resultados (incluyendo agentic_readiness).

    Parámetro `analysis`:
    - "basic":   usa una configuración reducida (p.ej. configs/basic.json)
    - "premium": usa la configuración completa por defecto
                 (p.ej. beyond_metrics_config.json), sin romper lo existente.
    """

    # Validar `analysis` (por si llega algo raro)
    if analysis not in {"basic", "premium"}:
        raise HTTPException(
            status_code=400,
            detail="analysis debe ser 'basic' o 'premium'.",
        )

    # 1) Parseo de economía (si viene)
    economy_data = None
    if economy_json:
        try:
            economy_data = json.loads(economy_json)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="economy_json no es un JSON válido.",
            )

    # 2) Guardar el CSV subido en una carpeta de trabajo
    base_input_dir = Path("data/input")
    base_input_dir.mkdir(parents=True, exist_ok=True)

    original_name = csv_file.filename or f"input_{uuid4().hex}.csv"
    safe_name = Path(original_name).name  # evita rutas con ../
    input_path = base_input_dir / safe_name

    with input_path.open("wb") as f:
        while True:
            chunk = await csv_file.read(1024 * 1024)  # 1 MB
            if not chunk:
                break
            f.write(chunk)

    try:
        # 3) Ejecutar el análisis y obtener el JSON en memoria
        results_json = run_analysis_collect_json(
            input_path=input_path,
            economy_data=economy_data,
            analysis=analysis,      # "basic" o "premium"
            company_folder=None,
        )
    finally:
        # 3b) Limpiar el CSV temporal
        try:
            input_path.unlink(missing_ok=True)
        except Exception:
            # No queremos romper la respuesta si falla el borrado
            pass

    # 4) Limpiar NaN/inf para que el JSON sea válido
    safe_results = sanitize_for_json(results_json)

    # 5) Devolver SOLO JSON
    return JSONResponse(
        content={
            "user": current_user,
            "results": safe_results,
        }
    )
