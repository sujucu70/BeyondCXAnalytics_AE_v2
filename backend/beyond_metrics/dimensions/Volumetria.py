from __future__ import annotations

from dataclasses import dataclass
from typing import List

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.axes import Axes


REQUIRED_COLUMNS_VOLUMETRIA: List[str] = [
    "interaction_id",
    "datetime_start",
    "queue_skill",
    "channel",
]


@dataclass
class VolumetriaMetrics:
    """
    Métricas de volumetría basadas en el nuevo esquema de datos.

    Columnas mínimas requeridas:
    - interaction_id
    - datetime_start
    - queue_skill
    - channel

    Otras columnas pueden existir pero no son necesarias para estas métricas.
    """

    df: pd.DataFrame

    def __post_init__(self) -> None:
        self._validate_columns()
        self._prepare_data()

    # ------------------------------------------------------------------ #
    # Helpers internos
    # ------------------------------------------------------------------ #
    def _validate_columns(self) -> None:
        missing = [c for c in REQUIRED_COLUMNS_VOLUMETRIA if c not in self.df.columns]
        if missing:
            raise ValueError(
                f"Faltan columnas obligatorias para VolumetriaMetrics: {missing}"
            )

    def _prepare_data(self) -> None:
        df = self.df.copy()

        # Asegurar tipo datetime
        df["datetime_start"] = pd.to_datetime(df["datetime_start"], errors="coerce")

        # Normalizar strings
        df["queue_skill"] = df["queue_skill"].astype(str).str.strip()
        df["channel"] = df["channel"].astype(str).str.strip()

        # Guardamos el df preparado
        self.df = df

    # ------------------------------------------------------------------ #
    # Propiedades útiles
    # ------------------------------------------------------------------ #
    @property
    def is_empty(self) -> bool:
        return self.df.empty

    # ------------------------------------------------------------------ #
    # Métricas numéricas / tabulares
    # ------------------------------------------------------------------ #
    def volume_by_channel(self) -> pd.Series:
        """
        Nº de interacciones por canal.
        """
        return self.df.groupby("channel")["interaction_id"].nunique().sort_values(
            ascending=False
        )

    def volume_by_skill(self) -> pd.Series:
        """
        Nº de interacciones por skill / cola.
        """
        return self.df.groupby("queue_skill")["interaction_id"].nunique().sort_values(
            ascending=False
        )

    def channel_distribution_pct(self) -> pd.Series:
        """
        Distribución porcentual del volumen por canal.
        """
        counts = self.volume_by_channel()
        total = counts.sum()
        if total == 0:
            return counts * 0.0
        return (counts / total * 100).round(2)

    def skill_distribution_pct(self) -> pd.Series:
        """
        Distribución porcentual del volumen por skill.
        """
        counts = self.volume_by_skill()
        total = counts.sum()
        if total == 0:
            return counts * 0.0
        return (counts / total * 100).round(2)

    def heatmap_24x7(self) -> pd.DataFrame:
        """
        Matriz [día_semana x hora] con nº de interacciones.
        dayofweek: 0=Lunes ... 6=Domingo
        """
        df = self.df.dropna(subset=["datetime_start"]).copy()
        if df.empty:
            # Devolvemos un df vacío pero con índice/columnas esperadas
            idx = range(7)
            cols = range(24)
            return pd.DataFrame(0, index=idx, columns=cols)

        df["dow"] = df["datetime_start"].dt.dayofweek
        df["hour"] = df["datetime_start"].dt.hour

        pivot = (
            df.pivot_table(
                index="dow",
                columns="hour",
                values="interaction_id",
                aggfunc="nunique",
                fill_value=0,
            )
            .reindex(index=range(7), fill_value=0)
            .reindex(columns=range(24), fill_value=0)
        )

        return pivot

    def monthly_seasonality_cv(self) -> float:
        """
        Coeficiente de variación del volumen mensual.
        CV = std / mean (en %).
        """
        df = self.df.dropna(subset=["datetime_start"]).copy()
        if df.empty:
            return float("nan")

        df["year_month"] = df["datetime_start"].dt.to_period("M")
        monthly_counts = (
            df.groupby("year_month")["interaction_id"].nunique().astype(float)
        )

        if len(monthly_counts) < 2:
            return float("nan")

        mean = monthly_counts.mean()
        std = monthly_counts.std(ddof=1)
        if mean == 0:
            return float("nan")

        return float(round(std / mean * 100, 2))

    def peak_offpeak_ratio(self) -> float:
        """
        Ratio de volumen entre horas pico y valle.

        Definimos pico como horas 10:00–19:59, resto valle.
        """
        df = self.df.dropna(subset=["datetime_start"]).copy()
        if df.empty:
            return float("nan")

        df["hour"] = df["datetime_start"].dt.hour

        peak_hours = list(range(10, 20))
        is_peak = df["hour"].isin(peak_hours)

        peak_vol = df.loc[is_peak, "interaction_id"].nunique()
        off_vol = df.loc[~is_peak, "interaction_id"].nunique()

        if off_vol == 0:
            return float("inf") if peak_vol > 0 else float("nan")

        return float(round(peak_vol / off_vol, 3))

    def concentration_top20_skills_pct(self) -> float:
        """
        % del volumen concentrado en el top 20% de skills (por nº de interacciones).
        """
        counts = (
            self.df.groupby("queue_skill")["interaction_id"].nunique().sort_values(
                ascending=False
            )
        )

        n_skills = len(counts)
        if n_skills == 0:
            return float("nan")

        top_n = max(1, int(np.ceil(0.2 * n_skills)))
        top_vol = counts.head(top_n).sum()
        total = counts.sum()

        if total == 0:
            return float("nan")

        return float(round(top_vol / total * 100, 2))

    # ------------------------------------------------------------------ #
    # Plots
    # ------------------------------------------------------------------ #
    def plot_heatmap_24x7(self) -> Axes:
        """
        Heatmap de volumen por día de la semana (0-6) y hora (0-23).
        Devuelve Axes para que el pipeline pueda guardar la figura.
        """
        data = self.heatmap_24x7()

        fig, ax = plt.subplots(figsize=(10, 4))
        im = ax.imshow(data.values, aspect="auto", origin="lower")

        ax.set_xticks(range(24))
        ax.set_xticklabels([str(h) for h in range(24)])

        ax.set_yticks(range(7))
        ax.set_yticklabels(["L", "M", "X", "J", "V", "S", "D"])


        ax.set_xlabel("Hora del día")
        ax.set_ylabel("Día de la semana")
        ax.set_title("Volumen por día de la semana y hora")

        plt.colorbar(im, ax=ax, label="Nº interacciones")

        return ax

    def plot_channel_distribution(self) -> Axes:
        """
        Distribución de volumen por canal.
        """
        series = self.volume_by_channel()

        fig, ax = plt.subplots(figsize=(6, 4))
        series.plot(kind="bar", ax=ax)

        ax.set_xlabel("Canal")
        ax.set_ylabel("Nº interacciones")
        ax.set_title("Volumen por canal")
        ax.grid(axis="y", alpha=0.3)

        return ax

    def plot_skill_pareto(self) -> Axes:
        """
        Pareto simple de volumen por skill (solo barras de volumen).
        """
        series = self.volume_by_skill()

        fig, ax = plt.subplots(figsize=(10, 4))
        series.plot(kind="bar", ax=ax)

        ax.set_xlabel("Skill / Cola")
        ax.set_ylabel("Nº interacciones")
        ax.set_title("Pareto de volumen por skill")
        ax.grid(axis="y", alpha=0.3)

        plt.xticks(rotation=45, ha="right")

        return ax
