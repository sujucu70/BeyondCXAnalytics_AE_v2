from __future__ import annotations

import json
import os
from typing import Any, Dict

import pandas as pd
from matplotlib.figure import Figure

from .base import DataSource, ResultsSink


class LocalDataSource(DataSource):
    """
    DataSource que lee CSV desde el sistema de ficheros local.

    - base_dir: se prefiere que todos los paths sean relativos a esta carpeta.
    """

    def __init__(self, base_dir: str = ".") -> None:
        self.base_dir = base_dir

    def _full_path(self, path: str) -> str:
        if os.path.isabs(path):
            return path
        return os.path.join(self.base_dir, path)

    def read_csv(self, path: str) -> pd.DataFrame:
        full = self._full_path(path)
        return pd.read_csv(full)
    

class LocalResultsSink(ResultsSink):
    """
    ResultsSink que escribe JSON e imágenes en el sistema de ficheros local.
    """

    def __init__(self, base_dir: str = ".") -> None:
        self.base_dir = base_dir

    def _full_path(self, path: str) -> str:
        if os.path.isabs(path):
            full = path
        else:
            full = os.path.join(self.base_dir, path)
        # Crear carpetas si no existen
        os.makedirs(os.path.dirname(full), exist_ok=True)
        return full

    def write_json(self, path: str, data: Dict[str, Any]) -> None:
        full = self._full_path(path)
        with open(full, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def write_figure(self, path: str, fig: Figure) -> None:
        full = self._full_path(path)
        fig.savefig(full, bbox_inches="tight")
