from __future__ import annotations

from pathlib import Path
from uuid import uuid4
from datetime import datetime
from typing import Optional, Literal
import json
import zipfile

from beyond_metrics.io import LocalDataSource, LocalResultsSink, ResultsSink
from beyond_metrics.pipeline import build_pipeline
from beyond_metrics.dimensions.EconomyCost import EconomyConfig
from beyond_flows.scorers import AgenticScorer

from typing import Any, Mapping, Optional, Dict


def _build_economy_config(economy_data: Optional[Mapping[str, Any]]) -> EconomyConfig:
    """
    Construye EconomyConfig validando tipos y evitando que el type checker
    mezcle floats y dicts en un solo diccionario.
    """

    # Valores por defecto
    default_customer_segments: Dict[str, str] = {
        "VIP": "high",
        "Premium": "high",
        "Soporte_General": "medium",
        "Ventas": "medium",
        "Basico": "low",
    }

    if economy_data is None:
        return EconomyConfig(
            labor_cost_per_hour=20.0,
            overhead_rate=0.10,
            tech_costs_annual=5000.0,
            automation_cpi=0.20,
            automation_volume_share=0.5,
            automation_success_rate=0.6,
            customer_segments=default_customer_segments,
        )

    def _get_float(field: str, default: float) -> float:
        value = economy_data.get(field, default)
        if isinstance(value, (int, float)):
            return float(value)
        raise ValueError(f"El campo '{field}' debe ser numérico (float). Valor recibido: {value!r}")

    # Campos escalares
    labor_cost_per_hour = _get_float("labor_cost_per_hour", 20.0)
    overhead_rate = _get_float("overhead_rate", 0.10)
    tech_costs_annual = _get_float("tech_costs_annual", 5000.0)
    automation_cpi = _get_float("automation_cpi", 0.20)
    automation_volume_share = _get_float("automation_volume_share", 0.5)
    automation_success_rate = _get_float("automation_success_rate", 0.6)

    # customer_segments puede venir o no; si viene, validarlo
    customer_segments: Dict[str, str] = dict(default_customer_segments)
    if "customer_segments" in economy_data and economy_data["customer_segments"] is not None:
        cs = economy_data["customer_segments"]
        if not isinstance(cs, Mapping):
            raise ValueError("customer_segments debe ser un diccionario {segment: level}")
        for k, v in cs.items():
            if not isinstance(v, str):
                raise ValueError(
                    f"El valor de customer_segments['{k}'] debe ser str. Valor recibido: {v!r}"
                )
            customer_segments[str(k)] = v

    return EconomyConfig(
        labor_cost_per_hour=labor_cost_per_hour,
        overhead_rate=overhead_rate,
        tech_costs_annual=tech_costs_annual,
        automation_cpi=automation_cpi,
        automation_volume_share=automation_volume_share,
        automation_success_rate=automation_success_rate,
        customer_segments=customer_segments,
    )


def run_analysis(
    input_path: Path,
    economy_data: Optional[dict] = None,
    return_type: Literal["path", "zip"] = "path",
    company_folder: Optional[str] = None,
) -> tuple[Path, Optional[Path]]:
    """
    Ejecuta el pipeline sobre un CSV y devuelve:
    - (results_dir, None) si return_type == "path"
    - (results_dir, zip_path) si return_type == "zip"

    input_path puede ser absoluto o relativo, pero los resultados
    se escribirán SIEMPRE en la carpeta del CSV, dentro de una
    subcarpeta con nombre = timestamp (y opcionalmente prefijada
    por company_folder).
    """

    input_path = input_path.resolve()

    if not input_path.exists():
        raise FileNotFoundError(f"El CSV no existe: {input_path}")
    if not input_path.is_file():
        raise ValueError(f"La ruta no apunta a un fichero CSV: {input_path}")

    # Carpeta donde está el CSV
    csv_dir = input_path.parent

    # DataSource y ResultsSink apuntan a ESA carpeta
    datasource = LocalDataSource(base_dir=str(csv_dir))
    sink = LocalResultsSink(base_dir=str(csv_dir))

    # Config de economía
    economy_cfg = _build_economy_config(economy_data)

    dimension_params: Dict[str, Mapping[str, Any]] = {
        "economy_costs": {
            "config": economy_cfg,
        }
    }

    # Callback de scoring
    def agentic_post_run(results: Dict[str, Any], run_base: str, sink_: ResultsSink) -> None:
        scorer = AgenticScorer()
        try:
            agentic = scorer.compute_and_return(results)
        except Exception as e:
            # No rompemos toda la ejecución si el scorer falla
            agentic = {
                "error": f"{type(e).__name__}: {e}",
            }
        sink_.write_json(f"{run_base}/agentic_readiness.json", agentic)

    pipeline = build_pipeline(
        dimensions_config_path="beyond_metrics/configs/beyond_metrics_config.json",
        datasource=datasource,
        sink=sink,
        dimension_params=dimension_params,
        post_run=[agentic_post_run],
    )

    # Timestamp de ejecución (nombre de la carpeta de resultados)
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")

    # Ruta lógica de resultados (RELATIVA al base_dir del sink)
    if company_folder:
        # Ej: "Cliente_X/20251208-153045"
        run_dir_rel = f"{company_folder.rstrip('/')}/{timestamp}"
    else:
        # Ej: "20251208-153045"
        run_dir_rel = timestamp

    # Ejecutar pipeline: el CSV se pasa relativo a csv_dir
    pipeline.run(
        input_path=input_path.name,
        run_dir=run_dir_rel,
    )

    # Carpeta real con los resultados
    results_dir = csv_dir / run_dir_rel

    if return_type == "path":
        return results_dir, None

    # --- ZIP de resultados -------------------------------------------------
    # Creamos el ZIP en la MISMA carpeta del CSV, con nombre basado en run_dir
    zip_name = f"{run_dir_rel.replace('/', '_')}.zip"
    zip_path = csv_dir / zip_name

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for file in results_dir.rglob("*"):
            if file.is_file():
                # Lo guardamos relativo a la carpeta de resultados
                arcname = file.relative_to(results_dir.parent)
                zipf.write(file, arcname)

    return results_dir, zip_path


from typing import Any, Mapping, Dict  # asegúrate de tener estos imports arriba


def run_analysis_collect_json(
    input_path: Path,
    economy_data: Optional[dict] = None,
    analysis: Literal["basic", "premium"] = "premium",
    company_folder: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Ejecuta el pipeline y devuelve un único JSON con todos los resultados.

    A diferencia de run_analysis:
    - NO escribe results.json
    - NO escribe agentic_readiness.json
    - agentic_readiness se incrusta en el dict de resultados

    El parámetro `analysis` permite elegir el nivel de análisis:
    - "basic" -> beyond_metrics/configs/basic.json
    - "premium"  -> beyond_metrics/configs/beyond_metrics_config.json
    """

    # Normalizamos y validamos la ruta del CSV
    input_path = input_path.resolve()
    if not input_path.exists():
        raise FileNotFoundError(f"El CSV no existe: {input_path}")
    if not input_path.is_file():
        raise ValueError(f"La ruta no apunta a un fichero CSV: {input_path}")

    # Carpeta donde está el CSV
    csv_dir = input_path.parent

    # DataSource y ResultsSink apuntan a ESA carpeta
    datasource = LocalDataSource(base_dir=str(csv_dir))
    sink = LocalResultsSink(base_dir=str(csv_dir))

    # Config de economía
    economy_cfg = _build_economy_config(economy_data)

    dimension_params: Dict[str, Mapping[str, Any]] = {
        "economy_costs": {
            "config": economy_cfg,
        }
    }

    # Elegimos el fichero de configuración de dimensiones según `analysis`
    if analysis == "basic":
        dimensions_config_path = "beyond_metrics/configs/basic.json"
    else: 
        dimensions_config_path = "beyond_metrics/configs/beyond_metrics_config.json"

    # Callback post-run: añadir agentic_readiness al JSON final (sin escribir ficheros)
    def agentic_post_run(results: Dict[str, Any], run_base: str, sink_: ResultsSink) -> None:
        scorer = AgenticScorer()
        try:
            agentic = scorer.compute_and_return(results)
        except Exception as e:
            agentic = {"error": f"{type(e).__name__}: {e}"}
        results["agentic_readiness"] = agentic

    pipeline = build_pipeline(
        dimensions_config_path=dimensions_config_path,
        datasource=datasource,
        sink=sink,
        dimension_params=dimension_params,
        post_run=[agentic_post_run],
    )

    # Timestamp de ejecución (para separar posibles artefactos como plots)
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    if company_folder:
        run_dir_rel = f"{company_folder.rstrip('/')}/{timestamp}"
    else:
        run_dir_rel = timestamp

    # Ejecutar pipeline sin escribir results.json
    results = pipeline.run(
        input_path=input_path.name,
        run_dir=run_dir_rel,
        write_results_json=False,
    )

    return results
