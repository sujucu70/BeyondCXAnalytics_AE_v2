from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from importlib import import_module
from typing import Any, Dict, List, Mapping, Optional, cast, Callable
import logging
import os

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.axes import Axes
from matplotlib.figure import Figure

from .io import (
    DataSource,
    ResultsSink,
)

LOGGER = logging.getLogger(__name__)


def setup_basic_logging(level: str = "INFO") -> None:
    """
    Configuración básica de logging, por si se necesita desde scripts.
    """
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )


def _import_class(path: str) -> type:
    """
    Import dinámico de una clase a partir de un string tipo:
        "beyond_metrics.dimensions.VolumetriaMetrics"
    """
    LOGGER.debug("Importando clase %s", path)
    module_name, class_name = path.rsplit(".", 1)
    module = import_module(module_name)
    cls = getattr(module, class_name)
    return cls


def _serialize_for_json(obj: Any) -> Any:
    """
    Convierte objetos típicos de numpy/pandas en tipos JSON-friendly.
    """
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj

    if isinstance(obj, (np.integer, np.floating)):
        return float(obj)

    if isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient="records")
    if isinstance(obj, pd.Series):
        return obj.to_list()

    if isinstance(obj, (list, tuple)):
        return [_serialize_for_json(x) for x in obj]

    if isinstance(obj, dict):
        return {str(k): _serialize_for_json(v) for k, v in obj.items()}

    return str(obj)


PostRunCallback = Callable[[Dict[str, Any], str, ResultsSink], None]


@dataclass
class BeyondMetricsPipeline:
    """
    Pipeline principal de BeyondMetrics.

    - Lee un CSV desde un DataSource (local, S3, Google Drive, etc.).
    - Ejecuta dimensiones configuradas en un dict de configuración.
    - Serializa resultados numéricos/tabulares a JSON.
    - Guarda las imágenes de los métodos que comienzan por 'plot_'.
    """

    datasource: DataSource
    sink: ResultsSink
    dimensions_config: Mapping[str, Any]
    dimension_params: Optional[Mapping[str, Mapping[str, Any]]] = None
    post_run: Optional[List[PostRunCallback]] = None

    def run(
        self,
        input_path: str,
        run_dir: str,
        *,
        write_results_json: bool = True,
    ) -> Dict[str, Any]:
        
        LOGGER.info("Inicio de ejecución de BeyondMetricsPipeline")
        LOGGER.info("Leyendo CSV de entrada: %s", input_path)

        # 1) Leer datos
        df = self.datasource.read_csv(input_path)
        LOGGER.info("CSV leído con %d filas y %d columnas", df.shape[0], df.shape[1])

        # 2) Determinar carpeta/base de salida para esta ejecución
        run_base = run_dir.rstrip("/")
        LOGGER.info("Ruta base de esta ejecución: %s", run_base)

        # 3) Ejecutar dimensiones
        dimensions_cfg = self.dimensions_config
        if not isinstance(dimensions_cfg, dict):
            raise ValueError("El bloque 'dimensions' debe ser un dict.")

        all_results: Dict[str, Any] = {}

        for dim_name, dim_cfg in dimensions_cfg.items():
            if not isinstance(dim_cfg, dict):
                raise ValueError(f"Config inválida para dimensión '{dim_name}' (debe ser dict).")

            if not dim_cfg.get("enabled", True):
                LOGGER.info("Dimensión '%s' desactivada; se omite.", dim_name)
                continue

            class_path = dim_cfg.get("class")
            if not class_path:
                raise ValueError(f"Falta 'class' en la dimensión '{dim_name}'.")

            metrics: List[str] = dim_cfg.get("metrics", [])
            if not metrics:
                LOGGER.info("Dimensión '%s' sin métricas configuradas; se omite.", dim_name)
                continue

            cls = _import_class(class_path)

            extra_kwargs = {}
            if self.dimension_params is not None:
                extra_kwargs = self.dimension_params.get(dim_name, {}) or {}

            # Las dimensiones reciben df en el constructor
            instance = cls(df, **extra_kwargs)

            dim_results: Dict[str, Any] = {}

            for metric_name in metrics:
                LOGGER.info("  - Ejecutando métrica '%s.%s'", dim_name, metric_name)
                result = self._execute_metric(instance, metric_name, run_base, dim_name)
                dim_results[metric_name] = result

            all_results[dim_name] = dim_results

        # 4) Guardar JSON de resultados (opcional)
        if write_results_json:
            results_json_path = f"{run_base}/results.json"
            LOGGER.info("Guardando resultados en JSON: %s", results_json_path)
            self.sink.write_json(results_json_path, all_results)

        # 5) Ejecutar callbacks post-run (scorers, agentes, etc.)
        if self.post_run:
            LOGGER.info("Ejecutando %d callbacks post-run...", len(self.post_run))
            for cb in self.post_run:
                try:
                    LOGGER.info("Ejecutando post-run callback: %s", cb)
                    cb(all_results, run_base, self.sink)
                except Exception:
                    LOGGER.exception("Error ejecutando post-run callback %s", cb)

        LOGGER.info("Ejecución completada correctamente.")
        return all_results


    def _execute_metric(
        self,
        instance: Any,
        metric_name: str,
        run_base: str,
        dim_name: str,
    ) -> Any:
        """
        Ejecuta una métrica:

        - Si empieza por 'plot_' -> se asume que devuelve Axes:
            - se guarda la figura como PNG
            - se devuelve {"type": "image", "path": "..."}
        - Si no, se serializa el valor a JSON.

        Además, para métricas categóricas (por skill/canal) de la dimensión
        'volumetry', devolvemos explícitamente etiquetas y valores para que
        el frontend pueda saber a qué pertenece cada número.
        """
        method = getattr(instance, metric_name, None)
        if method is None or not callable(method):
            raise ValueError(
                f"La métrica '{metric_name}' no existe en {type(instance).__name__}"
            )

        # Caso plots
        if metric_name.startswith("plot_"):
            ax = method()
            if not isinstance(ax, Axes):
                raise TypeError(
                    f"La métrica '{metric_name}' de '{type(instance).__name__}' "
                    f"debería devolver un matplotlib.axes.Axes"
                )
            fig = ax.get_figure()
            if fig is None:
                raise RuntimeError(
                    "Axes.get_figure() devolvió None, lo cual no debería pasar."
                )
            fig = cast(Figure, fig)

            filename = f"{dim_name}_{metric_name}.png"
            img_path = f"{run_base}/{filename}"

            LOGGER.debug("Guardando figura en %s", img_path)
            self.sink.write_figure(img_path, fig)
            plt.close(fig)

            return {
                "type": "image",
                "path": img_path,
            }

        # Caso numérico/tabular
        value = method()

        # Caso especial: series categóricas de volumetría (por skill / canal)
        # Devolvemos {"labels": [...], "values": [...]} para mantener la
        # información de etiquetas en el JSON.
        if (
            dim_name == "volumetry"
            and isinstance(value, pd.Series)
            and metric_name
            in {
                "volume_by_channel",
                "volume_by_skill",
                "channel_distribution_pct",
                "skill_distribution_pct",
            }
        ):
            labels = [str(idx) for idx in value.index.tolist()]
            # Aseguramos que todos los valores sean numéricos JSON-friendly
            values = [float(v) for v in value.astype(float).tolist()]
            return {
                "labels": labels,
                "values": values,
            }

        return _serialize_for_json(value)



def load_dimensions_config(path: str) -> Dict[str, Any]:
    """
    Carga un JSON de configuración que contiene solo el bloque 'dimensions'.
    """
    import json
    from pathlib import Path

    with Path(path).open("r", encoding="utf-8") as f:
        cfg = json.load(f)

    dimensions = cfg.get("dimensions")
    if dimensions is None:
        raise ValueError("El fichero de configuración debe contener un bloque 'dimensions'.")

    return dimensions


def build_pipeline(
    dimensions_config_path: str,
    datasource: DataSource,
    sink: ResultsSink,
    dimension_params: Optional[Mapping[str, Mapping[str, Any]]] = None,
    post_run: Optional[List[PostRunCallback]] = None,
) -> BeyondMetricsPipeline:
    """
    Crea un BeyondMetricsPipeline a partir de:
    - ruta al JSON con dimensiones/métricas
    - un DataSource ya construido (local/S3/Drive)
    - un ResultsSink ya construido (local/S3/Drive)
    - una lista opcional de callbacks post_run que se ejecutan al final
      (útil para scorers, agentes de IA, etc.)
    """
    dims_cfg = load_dimensions_config(dimensions_config_path)
    return BeyondMetricsPipeline(
        datasource=datasource,
        sink=sink,
        dimensions_config=dims_cfg,
        dimension_params=dimension_params,
        post_run=post_run,
    )
