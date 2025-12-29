# beyond_metrics/io/google_drive.py
from __future__ import annotations

import io
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Dict, Any

import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload

from .base import DataSource, ResultsSink


GDRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly",
                 "https://www.googleapis.com/auth/drive.file"]


def _extract_file_id(file_id_or_url: str) -> str:
    """
    Acepta:
      - un ID directo de Google Drive (ej: '1AbC...')
      - una URL de Google Drive compartida

    y devuelve siempre el file_id.
    """
    if "http://" not in file_id_or_url and "https://" not in file_id_or_url:
        return file_id_or_url.strip()

    patterns = [
        r"/d/([a-zA-Z0-9_-]{10,})",        # https://drive.google.com/file/d/<ID>/view
        r"id=([a-zA-Z0-9_-]{10,})",        # https://drive.google.com/open?id=<ID>
    ]

    for pattern in patterns:
        m = re.search(pattern, file_id_or_url)
        if m:
            return m.group(1)

    raise ValueError(f"No se pudo extraer un file_id de la URL de Google Drive: {file_id_or_url}")


# -------- DataSource --------

@dataclass
class GoogleDriveConfig:
    credentials_path: str            # ruta al JSON de service account
    impersonate_user: Optional[str] = None


class GoogleDriveDataSource(DataSource):
    """
    DataSource que lee CSVs desde Google Drive.
    """

    def __init__(self, config: GoogleDriveConfig) -> None:
        self._config = config
        self._service = self._build_service(readonly=True)

    def _build_service(self, readonly: bool = True):
        scopes = ["https://www.googleapis.com/auth/drive.readonly"] if readonly else GDRIVE_SCOPES
        creds = service_account.Credentials.from_service_account_file(
            self._config.credentials_path,
            scopes=scopes,
        )

        if self._config.impersonate_user:
            creds = creds.with_subject(self._config.impersonate_user)

        service = build("drive", "v3", credentials=creds)
        return service

    def read_csv(self, path: str) -> pd.DataFrame:
        file_id = _extract_file_id(path)

        request = self._service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)

        done = False
        while not done:
            _, done = downloader.next_chunk()

        fh.seek(0)
        df = pd.read_csv(fh)
        return df


# -------- ResultsSink --------

@dataclass
class GoogleDriveSinkConfig:
    credentials_path: str            # ruta al JSON de service account
    base_folder_id: str              # ID de la carpeta de Drive donde escribir
    impersonate_user: Optional[str] = None


class GoogleDriveResultsSink(ResultsSink):
    """
    ResultsSink que sube JSONs e imágenes a una carpeta de Google Drive.

    Nota: por simplicidad, usamos solo el nombre del fichero (basename de `path`).
    Es decir, si le pasas 'data/output/123/results.json', en Drive se guardará
    como 'results.json' dentro de base_folder_id.
    """

    def __init__(self, config: GoogleDriveSinkConfig) -> None:
        self._config = config
        self._service = self._build_service()

    def _build_service(self):
        creds = service_account.Credentials.from_service_account_file(
            self._config.credentials_path,
            scopes=GDRIVE_SCOPES,
        )

        if self._config.impersonate_user:
            creds = creds.with_subject(self._config.impersonate_user)

        service = build("drive", "v3", credentials=creds)
        return service

    def _upload_bytes(self, data: bytes, mime_type: str, target_path: str) -> str:
        """
        Sube un fichero en memoria a Drive y devuelve el file_id.
        """
        filename = Path(target_path).name

        media = MediaIoBaseUpload(io.BytesIO(data), mimetype=mime_type, resumable=False)
        file_metadata = {
            "name": filename,
            "parents": [self._config.base_folder_id],
        }

        created = self._service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id",
        ).execute()

        return created["id"]

    def write_json(self, path: str, data: Dict[str, Any]) -> None:
        payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self._upload_bytes(payload, "application/json", path)

    def write_figure(self, path: str, fig) -> None:
        from matplotlib.figure import Figure

        if not isinstance(fig, Figure):
            raise TypeError("write_figure espera un matplotlib.figure.Figure")

        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight")
        buf.seek(0)
        self._upload_bytes(buf.read(), "image/png", path)
