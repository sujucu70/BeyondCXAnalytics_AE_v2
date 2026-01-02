from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Any

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.axes import Axes


# Solo columnas del dataset “core”
REQUIRED_COLUMNS_SAT: List[str] = [
    "interaction_id",
    "datetime_start",
    "queue_skill",
    "channel",
    "duration_talk",
    "hold_time",
    "wrap_up_time",
]


@dataclass
class SatisfactionExperienceMetrics:
    """
    Dimensión 3: SATISFACCIÓN y EXPERIENCIA

    Todas las columnas de satisfacción (csat/nps/ces/aht) son OPCIONALES.
    Si no están, las métricas que las usan devuelven vacío/NaN pero
    nunca rompen el pipeline.
    """

    df: pd.DataFrame

    def __post_init__(self) -> None:
        self._validate_columns()
        self._prepare_data()

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _validate_columns(self) -> None:
        missing = [c for c in REQUIRED_COLUMNS_SAT if c not in self.df.columns]
        if missing:
            raise ValueError(
                f"Faltan columnas obligatorias para SatisfactionExperienceMetrics: {missing}"
            )

    def _prepare_data(self) -> None:
        df = self.df.copy()

        df["datetime_start"] = pd.to_datetime(df["datetime_start"], errors="coerce")

        # Duraciones base siempre existen
        for col in ["duration_talk", "hold_time", "wrap_up_time"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        # Handle time
        df["handle_time"] = (
            df["duration_talk"].fillna(0)
            + df["hold_time"].fillna(0)
            + df["wrap_up_time"].fillna(0)
        )

        # csat_score opcional
        df["csat_score"] = pd.to_numeric(df.get("csat_score", np.nan), errors="coerce")

        # aht opcional: si existe columna explícita la usamos, si no usamos handle_time
        if "aht" in df.columns:
            df["aht"] = pd.to_numeric(df["aht"], errors="coerce")
        else:
            df["aht"] = df["handle_time"]

        # NPS / CES opcionales
        df["nps_score"] = pd.to_numeric(df.get("nps_score", np.nan), errors="coerce")
        df["ces_score"] = pd.to_numeric(df.get("ces_score", np.nan), errors="coerce")

        df["queue_skill"] = df["queue_skill"].astype(str).str.strip()
        df["channel"] = df["channel"].astype(str).str.strip()

        self.df = df

    @property
    def is_empty(self) -> bool:
        return self.df.empty

    # ------------------------------------------------------------------ #
    # KPIs
    # ------------------------------------------------------------------ #
    def csat_avg_by_skill_channel(self) -> pd.DataFrame:
        """
        CSAT promedio por skill/canal.
        Si no hay csat_score, devuelve DataFrame vacío.
        """
        df = self.df
        if "csat_score" not in df.columns or df["csat_score"].notna().sum() == 0:
            return pd.DataFrame()

        df = df.dropna(subset=["csat_score"])
        if df.empty:
            return pd.DataFrame()

        pivot = (
            df.pivot_table(
                index="queue_skill",
                columns="channel",
                values="csat_score",
                aggfunc="mean",
            )
            .sort_index()
            .round(2)
        )
        return pivot

    def nps_avg_by_skill_channel(self) -> pd.DataFrame:
        """
        NPS medio por skill/canal, si existe nps_score.
        """
        df = self.df
        if "nps_score" not in df.columns or df["nps_score"].notna().sum() == 0:
            return pd.DataFrame()

        df = df.dropna(subset=["nps_score"])
        if df.empty:
            return pd.DataFrame()

        pivot = (
            df.pivot_table(
                index="queue_skill",
                columns="channel",
                values="nps_score",
                aggfunc="mean",
            )
            .sort_index()
            .round(2)
        )
        return pivot

    def ces_avg_by_skill_channel(self) -> pd.DataFrame:
        """
        CES medio por skill/canal, si existe ces_score.
        """
        df = self.df
        if "ces_score" not in df.columns or df["ces_score"].notna().sum() == 0:
            return pd.DataFrame()

        df = df.dropna(subset=["ces_score"])
        if df.empty:
            return pd.DataFrame()

        pivot = (
            df.pivot_table(
                index="queue_skill",
                columns="channel",
                values="ces_score",
                aggfunc="mean",
            )
            .sort_index()
            .round(2)
        )
        return pivot
    
    def csat_global(self) -> float:
        """
        CSAT medio global (todas las interacciones).

        Usa la columna opcional `csat_score`:
        - Si no existe, devuelve NaN.
        - Si todos los valores son NaN / vacíos, devuelve NaN.
        """
        df = self.df
        if "csat_score" not in df.columns:
            return float("nan")

        series = pd.to_numeric(df["csat_score"], errors="coerce").dropna()
        if series.empty:
            return float("nan")

        mean = series.mean()
        return float(round(mean, 2))


    def csat_aht_correlation(self) -> Dict[str, Any]:
        """
        Correlación Pearson CSAT vs AHT.
        Si falta csat o aht, o no hay varianza, devuelve NaN y código adecuado.
        """
        df = self.df
        if "csat_score" not in df.columns or df["csat_score"].notna().sum() == 0:
            return {"r": float("nan"), "n": 0.0, "interpretation_code": "sin_datos"}
        if "aht" not in df.columns or df["aht"].notna().sum() == 0:
            return {"r": float("nan"), "n": 0.0, "interpretation_code": "sin_datos"}

        df = df.dropna(subset=["csat_score", "aht"]).copy()
        n = len(df)
        if n < 2:
            return {"r": float("nan"), "n": float(n), "interpretation_code": "insuficiente"}

        x = df["aht"].astype(float)
        y = df["csat_score"].astype(float)

        if x.std(ddof=1) == 0 or y.std(ddof=1) == 0:
            return {"r": float("nan"), "n": float(n), "interpretation_code": "sin_varianza"}

        r = float(np.corrcoef(x, y)[0, 1])

        if r < -0.3:
            interpretation = "negativo"
        elif r > 0.3:
            interpretation = "positivo"
        else:
            interpretation = "neutral"

        return {"r": round(r, 3), "n": float(n), "interpretation_code": interpretation}

    def csat_aht_skill_summary(self) -> pd.DataFrame:
        """
        Resumen por skill con clasificación del "sweet spot".
        Si falta csat o aht, devuelve DataFrame vacío.
        """
        df = self.df
        if df["csat_score"].notna().sum() == 0 or df["aht"].notna().sum() == 0:
            return pd.DataFrame(columns=["csat_avg", "aht_avg", "classification"])

        df = df.dropna(subset=["csat_score", "aht"]).copy()
        if df.empty:
            return pd.DataFrame(columns=["csat_avg", "aht_avg", "classification"])

        grouped = df.groupby("queue_skill").agg(
            csat_avg=("csat_score", "mean"),
            aht_avg=("aht", "mean"),
        )

        aht_all = df["aht"].astype(float)
        csat_all = df["csat_score"].astype(float)

        aht_p40 = float(np.percentile(aht_all, 40))
        aht_p60 = float(np.percentile(aht_all, 60))
        csat_p40 = float(np.percentile(csat_all, 40))
        csat_p60 = float(np.percentile(csat_all, 60))

        def classify(row) -> str:
            csat = row["csat_avg"]
            aht = row["aht_avg"]

            if aht <= aht_p40 and csat >= csat_p60:
                return "ideal_automatizar"
            if aht >= aht_p60 and csat >= csat_p40:
                return "requiere_humano"
            return "neutral"

        grouped["classification"] = grouped.apply(classify, axis=1)
        return grouped.round({"csat_avg": 2, "aht_avg": 2})

    # ------------------------------------------------------------------ #
    # Plots
    # ------------------------------------------------------------------ #
    def plot_csat_vs_aht_scatter(self) -> Axes:
        """
        Scatter CSAT vs AHT por skill.
        Si no hay datos suficientes, devuelve un Axes con mensaje.
        """
        df = self.df
        if df["csat_score"].notna().sum() == 0 or df["aht"].notna().sum() == 0:
            fig, ax = plt.subplots()
            ax.text(0.5, 0.5, "Sin datos de CSAT/AHT", ha="center", va="center")
            ax.set_axis_off()
            return ax

        df = df.dropna(subset=["csat_score", "aht"]).copy()
        if df.empty:
            fig, ax = plt.subplots()
            ax.text(0.5, 0.5, "Sin datos de CSAT/AHT", ha="center", va="center")
            ax.set_axis_off()
            return ax

        fig, ax = plt.subplots(figsize=(8, 5))

        for skill, sub in df.groupby("queue_skill"):
            ax.scatter(sub["aht"], sub["csat_score"], label=skill, alpha=0.7)

        ax.set_xlabel("AHT (segundos)")
        ax.set_ylabel("CSAT")
        ax.set_title("CSAT vs AHT por skill")
        ax.grid(alpha=0.3)
        ax.legend(title="Skill", bbox_to_anchor=(1.05, 1), loc="upper left")

        plt.tight_layout()
        return ax

    def plot_csat_distribution(self) -> Axes:
        """
        Histograma de CSAT.
        Si no hay csat_score, devuelve un Axes con mensaje.
        """
        df = self.df
        if "csat_score" not in df.columns or df["csat_score"].notna().sum() == 0:
            fig, ax = plt.subplots()
            ax.text(0.5, 0.5, "Sin datos de CSAT", ha="center", va="center")
            ax.set_axis_off()
            return ax

        df = df.dropna(subset=["csat_score"]).copy()
        if df.empty:
            fig, ax = plt.subplots()
            ax.text(0.5, 0.5, "Sin datos de CSAT", ha="center", va="center")
            ax.set_axis_off()
            return ax

        fig, ax = plt.subplots(figsize=(6, 4))
        ax.hist(df["csat_score"], bins=10, alpha=0.7)
        ax.set_xlabel("CSAT")
        ax.set_ylabel("Frecuencia")
        ax.set_title("Distribución de CSAT")
        ax.grid(axis="y", alpha=0.3)

        return ax
