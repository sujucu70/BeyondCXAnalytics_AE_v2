from __future__ import annotations

import io
import json
from typing import Any, Dict, Tuple

import boto3
import pandas as pd
from matplotlib.figure import Figure

from .base import DataSource, ResultsSink


def _split_s3_path(path: str) -> Tuple[str, str]:
    """
    Convierte 's3://bucket/key' en (bucket, key).
    """
    if not path.startswith("s3://"):
        raise ValueError(f"Ruta S3 inválida: {path}")

    without_scheme = path[len("s3://") :]
    parts = without_scheme.split("/", 1)
    if len(parts) != 2:
        raise ValueError(f"Ruta S3 inválida: {path}")
    return parts[0], parts[1]


class S3DataSource(DataSource):
    """
    DataSource que lee CSV desde S3 usando boto3.
    """

    def __init__(self, boto3_client: Any | None = None) -> None:
        self.s3 = boto3_client or boto3.client("s3")

    def read_csv(self, path: str) -> pd.DataFrame:
        bucket, key = _split_s3_path(path)
        obj = self.s3.get_object(Bucket=bucket, Key=key)
        body = obj["Body"].read()
        buffer = io.BytesIO(body)
        return pd.read_csv(buffer)


class S3ResultsSink(ResultsSink):
    """
    ResultsSink que escribe JSON e imágenes en S3.
    """

    def __init__(self, boto3_client: Any | None = None) -> None:
        self.s3 = boto3_client or boto3.client("s3")

    def write_json(self, path: str, data: Dict[str, Any]) -> None:
        bucket, key = _split_s3_path(path)
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.s3.put_object(Bucket=bucket, Key=key, Body=body)

    def write_figure(self, path: str, fig: Figure) -> None:
        bucket, key = _split_s3_path(path)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight")
        buf.seek(0)
        self.s3.put_object(Bucket=bucket, Key=key, Body=buf.getvalue(), ContentType="image/png")
