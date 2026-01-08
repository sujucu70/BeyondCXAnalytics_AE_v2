from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.axes import Axes
import math

REQUIRED_COLUMNS_OP: List[str] = [
    "interaction_id",
    "datetime_start",
    "queue_skill",
    "channel",
    "duration_talk",
    "hold_time",
    "wrap_up_time",
    "agent_id",
    "transfer_flag",
]


@dataclass
class OperationalPerformanceMetrics:
    """
    Dimensión: RENDIMIENTO OPERACIONAL Y DE SERVICIO

    Propósito: medir el balance entre rapidez (eficiencia) y calidad de resolución,
    más la variabilidad del servicio.

    Requiere como mínimo:
    - interaction_id
    - datetime_start
    - queue_skill
    - channel
    - duration_talk (segundos)
    - hold_time (segundos)
    - wrap_up_time (segundos)
    - agent_id
    - transfer_flag (bool/int)

    Columnas opcionales:
    - is_resolved (bool/int)      -> para FCR
    - abandoned_flag (bool/int)   -> para tasa de abandono
    - customer_id / caller_id     -> para reincidencia y repetición de canal
    - logged_time (segundos)      -> para occupancy_rate
    """

    df: pd.DataFrame

    # Benchmarks / parámetros de normalización (puedes ajustarlos)
    AHT_GOOD: float = 300.0     # 5 min
    AHT_BAD: float = 900.0      # 15 min
    VAR_RATIO_GOOD: float = 1.2 # P90/P50 ~1.2 muy estable
    VAR_RATIO_BAD: float = 3.0  # P90/P50 >=3 muy inestable

    def __post_init__(self) -> None:
        self._validate_columns()
        self._prepare_data()

    # ------------------------------------------------------------------ #
    # Helpers internos
    # ------------------------------------------------------------------ #
    def _validate_columns(self) -> None:
        missing = [c for c in REQUIRED_COLUMNS_OP if c not in self.df.columns]
        if missing:
            raise ValueError(
                f"Faltan columnas obligatorias para OperationalPerformanceMetrics: {missing}"
            )

    def _prepare_data(self) -> None:
        df = self.df.copy()

        # Tipos
        df["datetime_start"] = pd.to_datetime(df["datetime_start"], errors="coerce")

        for col in ["duration_talk", "hold_time", "wrap_up_time"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        # Handle Time
        df["handle_time"] = (
            df["duration_talk"].fillna(0)
            + df["hold_time"].fillna(0)
            + df["wrap_up_time"].fillna(0)
        )

        # Normalización básica
        df["queue_skill"] = df["queue_skill"].astype(str).str.strip()
        df["channel"] = df["channel"].astype(str).str.strip()
        df["agent_id"] = df["agent_id"].astype(str).str.strip()

        # Flags opcionales convertidos a bool cuando existan
        for flag_col in ["is_resolved", "abandoned_flag", "transfer_flag"]:
            if flag_col in df.columns:
                df[flag_col] = df[flag_col].astype(int).astype(bool)

        # customer_id: usamos customer_id si existe, si no caller_id
        if "customer_id" in df.columns:
            df["customer_id"] = df["customer_id"].astype(str)
        elif "caller_id" in df.columns:
            df["customer_id"] = df["caller_id"].astype(str)
        else:
            df["customer_id"] = None

        # logged_time opcional
        # Normalizamos logged_time: siempre será una serie float con NaN si no existe
        df["logged_time"] = pd.to_numeric(df.get("logged_time", np.nan), errors="coerce")


        self.df = df

    @property
    def is_empty(self) -> bool:
        return self.df.empty

    # ------------------------------------------------------------------ #
    # AHT y variabilidad
    # ------------------------------------------------------------------ #
    def aht_distribution(self) -> Dict[str, float]:
        """
        Devuelve P10, P50, P90 del AHT y el ratio P90/P50 como medida de variabilidad.
        """
        ht = self.df["handle_time"].dropna().astype(float)
        if ht.empty:
            return {}

        p10 = float(np.percentile(ht, 10))
        p50 = float(np.percentile(ht, 50))
        p90 = float(np.percentile(ht, 90))
        ratio = float(p90 / p50) if p50 > 0 else float("nan")

        return {
            "p10": round(p10, 2),
            "p50": round(p50, 2),
            "p90": round(p90, 2),
            "p90_p50_ratio": round(ratio, 3),
        }

    def talk_hold_acw_p50_by_skill(self) -> pd.DataFrame:
        """
        P50 de talk_time, hold_time y wrap_up_time por skill.
        """
        df = self.df

        def perc(s: pd.Series, q: float) -> float:
            s = s.dropna().astype(float)
            if s.empty:
                return float("nan")
            return float(np.percentile(s, q))

        grouped = df.groupby("queue_skill")
        result = pd.DataFrame(
            {
                "talk_p50": grouped["duration_talk"].apply(lambda s: perc(s, 50)),
                "hold_p50": grouped["hold_time"].apply(lambda s: perc(s, 50)),
                "acw_p50": grouped["wrap_up_time"].apply(lambda s: perc(s, 50)),
            }
        )
        return result.round(2).sort_index()

    # ------------------------------------------------------------------ #
    # FCR, escalación, abandono, reincidencia, repetición canal
    # ------------------------------------------------------------------ #
    def fcr_rate(self) -> float:
        """
        FCR proxy = 100 - escalation_rate.

        Usamos la métrica de escalación ya calculada a partir de transfer_flag.
        Si no se puede calcular escalation_rate, intentamos derivarlo
        directamente de la columna transfer_flag. Si todo falla, devolvemos NaN.
        """
        try:
            esc = self.escalation_rate()
        except Exception:
            esc = float("nan")

        # Si escalation_rate es válido, usamos el proxy simple
        if esc is not None and not math.isnan(esc):
            fcr = 100.0 - esc
            return float(max(0.0, min(100.0, round(fcr, 2))))

        # Fallback: calcular directamente desde transfer_flag
        df = self.df
        if "transfer_flag" not in df.columns or len(df) == 0:
            return float("nan")

        col = df["transfer_flag"]

        # Normalizar a booleano: TRUE/FALSE, 1/0, etc.
        if col.dtype == "O":
            col_norm = (
                col.astype(str)
                   .str.strip()
                   .str.lower()
                   .map({
                       "true": True,
                       "t": True,
                       "1": True,
                       "yes": True,
                       "y": True,
                   })
            ).fillna(False)
            transfer_mask = col_norm
        else:
            transfer_mask = pd.to_numeric(col, errors="coerce").fillna(0) > 0

        total = len(df)
        transfers = int(transfer_mask.sum())

        esc_rate = transfers / total if total > 0 else float("nan")
        if math.isnan(esc_rate):
            return float("nan")

        fcr = 100.0 - esc_rate * 100.0
        return float(max(0.0, min(100.0, round(fcr, 2))))


    def escalation_rate(self) -> float:
        """
        % de interacciones que requieren escalación (transfer_flag == True).
        """
        df = self.df
        total = len(df)
        if total == 0:
            return float("nan")

        escalated = df["transfer_flag"].sum()
        return float(round(escalated / total * 100, 2))

    def abandonment_rate(self) -> float:
        """
        % de interacciones abandonadas.

        Definido como % de filas con abandoned_flag == True.
        Si la columna no existe, devuelve NaN.
        """
        df = self.df
        if "abandoned_flag" not in df.columns:
            return float("nan")

        total = len(df)
        if total == 0:
            return float("nan")

        abandoned = df["abandoned_flag"].sum()
        return float(round(abandoned / total * 100, 2))

    def recurrence_rate_7d(self) -> float:
        """
        % de clientes que vuelven a contactar en < 7 días.

        Se basa en customer_id (o caller_id si no hay customer_id).
        Calcula:
        - Para cada cliente, ordena por datetime_start
        - Si hay dos contactos consecutivos separados < 7 días, cuenta como "recurrente"
        - Tasa = nº clientes recurrentes / nº total de clientes
        """

        df = self.df.dropna(subset=["datetime_start"]).copy()

        # Normalizar identificador de cliente
        if "customer_id" not in df.columns:
            if "caller_id" in df.columns:
                df["customer_id"] = df["caller_id"]
            else:
                # No hay identificador de cliente -> no se puede calcular
                return float("nan")

        df = df.dropna(subset=["customer_id"])
        if df.empty:
            return float("nan")

        # Ordenar por cliente + fecha
        df = df.sort_values(["customer_id", "datetime_start"])

        # Diferencia de tiempo entre contactos consecutivos por cliente
        df["delta"] = df.groupby("customer_id")["datetime_start"].diff()

        # Marcamos los contactos que ocurren a menos de 7 días del anterior
        recurrence_mask = df["delta"] < pd.Timedelta(days=7)

        # Nº de clientes que tienen al menos un contacto recurrente
        recurrent_customers = df.loc[recurrence_mask, "customer_id"].nunique()
        total_customers = df["customer_id"].nunique()

        if total_customers == 0:
            return float("nan")

        rate = recurrent_customers / total_customers * 100.0
        return float(round(rate, 2))


    def repeat_channel_rate(self) -> float:
        """
        % de reincidencias (<7 días) en las que el cliente usa el MISMO canal.

        Si no hay customer_id/caller_id o solo un contacto por cliente, devuelve NaN.
        """
        df = self.df.dropna(subset=["datetime_start"]).copy()
        if df["customer_id"].isna().all():
            return float("nan")

        df = df.sort_values(["customer_id", "datetime_start"])
        df["next_customer"] = df["customer_id"].shift(-1)
        df["next_datetime"] = df["datetime_start"].shift(-1)
        df["next_channel"] = df["channel"].shift(-1)

        same_customer = df["customer_id"] == df["next_customer"]
        within_7d = (df["next_datetime"] - df["datetime_start"]) < pd.Timedelta(days=7)

        recurrent_mask = same_customer & within_7d
        if not recurrent_mask.any():
            return float("nan")

        same_channel = df["channel"] == df["next_channel"]
        same_channel_recurrent = (recurrent_mask & same_channel).sum()
        total_recurrent = recurrent_mask.sum()

        return float(round(same_channel_recurrent / total_recurrent * 100, 2))

    # ------------------------------------------------------------------ #
    # Occupancy
    # ------------------------------------------------------------------ #
    def occupancy_rate(self) -> float:
        """
        Tasa de ocupación:

        occupancy = sum(handle_time) / sum(logged_time) * 100.

        Requiere columna 'logged_time'. Si no existe o es todo 0, devuelve NaN.
        """
        df = self.df
        if "logged_time" not in df.columns:
            return float("nan")

        logged = df["logged_time"].fillna(0)
        handle = df["handle_time"].fillna(0)

        total_logged = logged.sum()
        if total_logged == 0:
            return float("nan")

        occ = handle.sum() / total_logged
        return float(round(occ * 100, 2))

    # ------------------------------------------------------------------ #
    # Score de rendimiento 0-10
    # ------------------------------------------------------------------ #
    def performance_score(self) -> Dict[str, float]:
        """
        Calcula un score 0-10 combinando:
        - AHT (bajo es mejor)
        - FCR (alto es mejor)
        - Variabilidad (P90/P50, bajo es mejor)
        - Otros factores (ocupación / escalación)

        Fórmula:
        score = 0.4 * (10 - AHT_norm) +
                0.3 * FCR_norm +
                0.2 * (10 - Var_norm) +
                0.1 * Otros_score

        Donde *_norm son valores en escala 0-10.
        """
        dist = self.aht_distribution()
        if not dist:
            return {"score": float("nan")}

        p50 = dist["p50"]
        ratio = dist["p90_p50_ratio"]

        # AHT_normalized: 0 (mejor) a 10 (peor)
        aht_norm = self._scale_to_0_10(p50, self.AHT_GOOD, self.AHT_BAD)
        # FCR_normalized: 0-10 directamente desde % (0-100)
        fcr_pct = self.fcr_rate()
        fcr_norm = fcr_pct / 10.0 if not np.isnan(fcr_pct) else 0.0
        # Variabilidad_normalized: 0 (ratio bueno) a 10 (ratio malo)
        var_norm = self._scale_to_0_10(ratio, self.VAR_RATIO_GOOD, self.VAR_RATIO_BAD)

        # Otros factores: combinamos ocupación (ideal ~80%) y escalación (ideal baja)
        occ = self.occupancy_rate()
        esc = self.escalation_rate()

        other_score = self._compute_other_factors_score(occ, esc)

        score = (
            0.4 * (10.0 - aht_norm)
            + 0.3 * fcr_norm
            + 0.2 * (10.0 - var_norm)
            + 0.1 * other_score
        )

        # Clamp 0-10
        score = max(0.0, min(10.0, score))

        return {
            "score": round(score, 2),
            "aht_norm": round(aht_norm, 2),
            "fcr_norm": round(fcr_norm, 2),
            "var_norm": round(var_norm, 2),
            "other_score": round(other_score, 2),
        }

    def _scale_to_0_10(self, value: float, good: float, bad: float) -> float:
        """
        Escala linealmente un valor:
        - good -> 0
        - bad  -> 10
        Con saturación fuera de rango.
        """
        if np.isnan(value):
            return 5.0  # neutro

        if good == bad:
            return 5.0

        if good < bad:
            # Menor es mejor
            if value <= good:
                return 0.0
            if value >= bad:
                return 10.0
            return 10.0 * (value - good) / (bad - good)
        else:
            # Mayor es mejor
            if value >= good:
                return 0.0
            if value <= bad:
                return 10.0
            return 10.0 * (good - value) / (good - bad)

    def _compute_other_factors_score(self, occ_pct: float, esc_pct: float) -> float:
        """
        Otros factores (0-10) basados en:
        - ocupación ideal alrededor de 80%
        - tasa de escalación ideal baja (<10%)
        """
        # Ocupación: 0 penalización si está entre 75-85, se penaliza fuera
        if np.isnan(occ_pct):
            occ_penalty = 5.0
        else:
            deviation = abs(occ_pct - 80.0)
            occ_penalty = min(10.0, deviation / 5.0 * 2.0)  # cada 5 puntos se suman 2, máx 10
        occ_score = max(0.0, 10.0 - occ_penalty)

        # Escalación: 0-10 donde 0% -> 10 puntos, >=40% -> 0
        if np.isnan(esc_pct):
            esc_score = 5.0
        else:
            if esc_pct <= 0:
                esc_score = 10.0
            elif esc_pct >= 40:
                esc_score = 0.0
            else:
                esc_score = 10.0 * (1.0 - esc_pct / 40.0)

        # Media simple de ambos
        return (occ_score + esc_score) / 2.0

    # ------------------------------------------------------------------ #
    # Plots
    # ------------------------------------------------------------------ #
    def plot_aht_boxplot_by_skill(self) -> Axes:
        """
        Boxplot del AHT por skill (P10-P50-P90 visual).
        """
        df = self.df.copy()

        if df.empty or "handle_time" not in df.columns:
            fig, ax = plt.subplots()
            ax.text(0.5, 0.5, "Sin datos de AHT", ha="center", va="center")
            ax.set_axis_off()
            return ax

        df = df.dropna(subset=["handle_time"])
        if df.empty:
            fig, ax = plt.subplots()
            ax.text(0.5, 0.5, "AHT no disponible", ha="center", va="center")
            ax.set_axis_off()
            return ax

        fig, ax = plt.subplots(figsize=(8, 4))
        df.boxplot(column="handle_time", by="queue_skill", ax=ax, showfliers=False)

        ax.set_xlabel("Skill / Cola")
        ax.set_ylabel("AHT (segundos)")
        ax.set_title("Distribución de AHT por skill")
        plt.suptitle("")
        plt.xticks(rotation=45, ha="right")
        ax.grid(axis="y", alpha=0.3)

        return ax

    def plot_resolution_funnel_by_skill(self) -> Axes:
        """
        Funnel / barras apiladas de Talk + Hold + ACW por skill (P50).

        Permite ver el equilibrio de tiempos por skill.
        """
        p50 = self.talk_hold_acw_p50_by_skill()
        if p50.empty:
            fig, ax = plt.subplots()
            ax.text(0.5, 0.5, "Sin datos para funnel", ha="center", va="center")
            ax.set_axis_off()
            return ax

        fig, ax = plt.subplots(figsize=(10, 4))

        skills = p50.index
        talk = p50["talk_p50"]
        hold = p50["hold_p50"]
        acw = p50["acw_p50"]

        x = np.arange(len(skills))

        ax.bar(x, talk, label="Talk P50")
        ax.bar(x, hold, bottom=talk, label="Hold P50")
        ax.bar(x, acw, bottom=talk + hold, label="ACW P50")

        ax.set_xticks(x)
        ax.set_xticklabels(skills, rotation=45, ha="right")
        ax.set_ylabel("Segundos")
        ax.set_title("Funnel de resolución (P50) por skill")
        ax.legend()
        ax.grid(axis="y", alpha=0.3)

        return ax
