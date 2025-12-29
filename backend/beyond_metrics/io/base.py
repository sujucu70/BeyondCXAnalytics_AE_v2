from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict

import pandas as pd
from matplotlib.figure import Figure


class DataSource(ABC):
    """Interfaz de lectura de datos (CSV)."""

    @abstractmethod
    def read_csv(self, path: str) -> pd.DataFrame:
        """
        Lee un CSV y devuelve un DataFrame.

        El significado de 'path' depende de la implementación:
        - LocalDataSource: ruta en el sistema de ficheros
        - S3DataSource: 's3://bucket/key'
        """
        raise NotImplementedError


class ResultsSink(ABC):
    """Interfaz de escritura de resultados (JSON e imágenes)."""

    @abstractmethod
    def write_json(self, path: str, data: Dict[str, Any]) -> None:
        """Escribe un dict como JSON en 'path'."""
        raise NotImplementedError

    @abstractmethod
    def write_figure(self, path: str, fig: Figure) -> None:
        """Guarda una figura matplotlib en 'path'."""
        raise NotImplementedError
