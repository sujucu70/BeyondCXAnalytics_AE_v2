from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Any

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.axes import Axes


REQUIRED_COLUMNS_ECON: List[str] = [
    "interaction_id",
    "datetime_start",
    "queue_skill",
    "channel",
    "duration_talk",
    "hold_time",
    "wrap_up_time",
]


@dataclass
class EconomyConfig:
    """
    Parámetros manuales para la dimensión de Economía y Costes.

    - labor_cost_per_hour: coste total/hora de un agente (fully loaded).
    - overhead_rate: % overhead variable (ej. 0.1 = 10% sobre labor).
    - tech_costs_annual: coste anual de tecnología (licencias, infra, ...).
    - automation_cpi: coste por interacción automatizada (ej. 0.15€).
    - automation_volume_share: % del volumen automatizable (0-1).
    - automation_success_rate: % éxito de la automatización (0-1).

    - customer_segments: mapping opcional skill -> segmento ("high"/"medium"/"low")
      para futuros insights de ROI por segmento.
    """

    labor_cost_per_hour: float
    overhead_rate: float = 0.0
    tech_costs_annual: float = 0.0
    automation_cpi: Optional[float] = None
    automation_volume_share: float = 0.0
    automation_success_rate: float = 0.0
    customer_segments: Optional[Dict[str, str]] = None


@dataclass
class EconomyCostMetrics:
    """
    DIMENSIÓN 4: ECONOMÍA y COSTES

    Propósito:
      - Cuantificar el COSTE actual (CPI, coste anual).
      - Estimar el impacto de overhead y tecnología.
      - Calcular un primer estimado de "coste de ineficiencia" y ahorro potencial.

    Requiere:
      - Columnas del dataset transaccional (ver REQUIRED_COLUMNS_ECON).

    Inputs opcionales vía EconomyConfig:
      - labor_cost_per_hour (obligatorio para cualquier cálculo de €).
      - overhead_rate, tech_costs_annual, automation_*.
      - customer_segments (para insights de ROI por segmento).
    """

    df: pd.DataFrame
    config: Optional[EconomyConfig] = None

    def __post_init__(self) -> None:
        self._validate_columns()
        self._prepare_data()

    # ------------------------------------------------------------------ #
    # Helpers internos
    # ------------------------------------------------------------------ #
    def _validate_columns(self) -> None:
        missing = [c for c in REQUIRED_COLUMNS_ECON if c not in self.df.columns]
        if missing:
            raise ValueError(
                f"Faltan columnas obligatorias para EconomyCostMetrics: {missing}"
            )

    def _prepare_data(self) -> None:
        df = self.df.copy()

        df["datetime_start"] = pd.to_datetime(df["datetime_start"], errors="coerce")

        for col in ["duration_talk", "hold_time", "wrap_up_time"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        df["queue_skill"] = df["queue_skill"].astype(str).str.strip()
        df["channel"] = df["channel"].astype(str).str.strip()

        # Handle time = talk + hold + wrap
        df["handle_time"] = (
            df["duration_talk"].fillna(0)
            + df["hold_time"].fillna(0)
            + df["wrap_up_time"].fillna(0)
        )  # segundos

        self.df = df

    @property
    def is_empty(self) -> bool:
        return self.df.empty

    def _has_cost_config(self) -> bool:
        return self.config is not None and self.config.labor_cost_per_hour is not None

    # ------------------------------------------------------------------ #
    # KPI 1: CPI por canal/skill
    # ------------------------------------------------------------------ #
    def cpi_by_skill_channel(self) -> pd.DataFrame:
        """
        CPI (Coste Por Interacción) por skill/canal.

        CPI = Labor_cost_per_interaction + Overhead_variable

        - Labor_cost_per_interaction = (labor_cost_per_hour * AHT_hours)
        - Overhead_variable = overhead_rate * Labor_cost_per_interaction

        Si no hay config de costes -> devuelve DataFrame vacío.
        """
        if not self._has_cost_config():
            return pd.DataFrame()

        cfg = self.config
        assert cfg is not None  # para el type checker

        df = self.df.copy()
        if df.empty:
            return pd.DataFrame()

        # AHT por skill/canal (en segundos)
        grouped = df.groupby(["queue_skill", "channel"])["handle_time"].mean()

        if grouped.empty:
            return pd.DataFrame()

        aht_sec = grouped
        aht_hours = aht_sec / 3600.0

        labor_cost = cfg.labor_cost_per_hour * aht_hours
        overhead = labor_cost * cfg.overhead_rate
        cpi = labor_cost + overhead

        out = pd.DataFrame(
            {
                "aht_seconds": aht_sec.round(2),
                "labor_cost": labor_cost.round(4),
                "overhead_cost": overhead.round(4),
                "cpi_total": cpi.round(4),
            }
        )

        return out.sort_index()

    # ------------------------------------------------------------------ #
    # KPI 2: coste anual por skill/canal
    # ------------------------------------------------------------------ #
    def annual_cost_by_skill_channel(self) -> pd.DataFrame:
        """
        Coste anual por skill/canal.

        cost_annual = CPI * volumen (cantidad de interacciones de la muestra).

        Nota: por simplicidad asumimos que el dataset refleja un periodo anual.
        Si en el futuro quieres anualizar (ej. dataset = 1 mes) se puede añadir
        un factor de escalado en EconomyConfig.
        """
        cpi_table = self.cpi_by_skill_channel()
        if cpi_table.empty:
            return pd.DataFrame()

        df = self.df.copy()
        volume = (
            df.groupby(["queue_skill", "channel"])["interaction_id"]
            .nunique()
            .rename("volume")
        )

        joined = cpi_table.join(volume, how="left").fillna({"volume": 0})
        joined["annual_cost"] = (joined["cpi_total"] * joined["volume"]).round(2)

        return joined

    # ------------------------------------------------------------------ #
    # KPI 3: desglose de costes (labor / tech / overhead)
    # ------------------------------------------------------------------ #
    def cost_breakdown(self) -> Dict[str, float]:
        """
        Desglose % de costes: labor, overhead, tech.

        labor_total = sum(labor_cost_per_interaction)
        overhead_total = labor_total * overhead_rate
        tech_total = tech_costs_annual (si se ha proporcionado)

        Devuelve porcentajes sobre el total.
        Si falta configuración de coste -> devuelve {}.
        """
        if not self._has_cost_config():
            return {}

        cfg = self.config
        assert cfg is not None

        cpi_table = self.cpi_by_skill_channel()
        if cpi_table.empty:
            return {}

        df = self.df.copy()
        volume = (
            df.groupby(["queue_skill", "channel"])["interaction_id"]
            .nunique()
            .rename("volume")
        )

        joined = cpi_table.join(volume, how="left").fillna({"volume": 0})

        # Costes anuales de labor y overhead
        annual_labor = (joined["labor_cost"] * joined["volume"]).sum()
        annual_overhead = (joined["overhead_cost"] * joined["volume"]).sum()
        annual_tech = cfg.tech_costs_annual

        total = annual_labor + annual_overhead + annual_tech
        if total <= 0:
            return {}

        return {
            "labor_pct": round(annual_labor / total * 100, 2),
            "overhead_pct": round(annual_overhead / total * 100, 2),
            "tech_pct": round(annual_tech / total * 100, 2),
            "labor_annual": round(annual_labor, 2),
            "overhead_annual": round(annual_overhead, 2),
            "tech_annual": round(annual_tech, 2),
            "total_annual": round(total, 2),
        }

    # ------------------------------------------------------------------ #
    # KPI 4: coste de ineficiencia (€ por variabilidad/escalación)
    # ------------------------------------------------------------------ #
    def inefficiency_cost_by_skill_channel(self) -> pd.DataFrame:
        """
        Estimación muy simplificada de coste de ineficiencia:

        Para cada skill/canal:

          - AHT_p50, AHT_p90 (segundos).
          - Delta = max(0, AHT_p90 - AHT_p50).
          - Se asume que ~40% de las interacciones están por encima de la mediana.
          - Ineff_seconds = Delta * volume * 0.4
          - Ineff_cost = LaborCPI_per_second * Ineff_seconds

        ⚠️ Es un modelo aproximado para cuantificar "orden de magnitud".
        """
        if not self._has_cost_config():
            return pd.DataFrame()

        cfg = self.config
        assert cfg is not None

        df = self.df.copy()
        grouped = df.groupby(["queue_skill", "channel"])

        stats = grouped["handle_time"].agg(
            aht_p50=lambda s: float(np.percentile(s.dropna(), 50)),
            aht_p90=lambda s: float(np.percentile(s.dropna(), 90)),
            volume="count",
        )

        if stats.empty:
            return pd.DataFrame()

        # CPI para obtener coste/segundo de labor
        cpi_table = self.cpi_by_skill_channel()
        if cpi_table.empty:
            return pd.DataFrame()

        merged = stats.join(cpi_table[["labor_cost"]], how="left")
        merged = merged.fillna(0.0)

        delta = (merged["aht_p90"] - merged["aht_p50"]).clip(lower=0.0)
        affected_fraction = 0.4  # aproximación
        ineff_seconds = delta * merged["volume"] * affected_fraction

        # labor_cost = coste por interacción con AHT medio;
        # aproximamos coste/segundo como labor_cost / AHT_medio
        aht_mean = grouped["handle_time"].mean()
        merged["aht_mean"] = aht_mean

        cost_per_second = merged["labor_cost"] / merged["aht_mean"].replace(0, np.nan)
        cost_per_second = cost_per_second.fillna(0.0)

        ineff_cost = (ineff_seconds * cost_per_second).round(2)

        merged["ineff_seconds"] = ineff_seconds.round(2)
        merged["ineff_cost"] = ineff_cost

        return merged[["aht_p50", "aht_p90", "volume", "ineff_seconds", "ineff_cost"]]

    # ------------------------------------------------------------------ #
    # KPI 5: ahorro potencial anual por automatización
    # ------------------------------------------------------------------ #
    def potential_savings(self) -> Dict[str, Any]:
        """
        Ahorro potencial anual basado en:

        Ahorro = (CPI_humano - CPI_automatizado) * Volumen_automatizable * Tasa_éxito

        Donde:
        - CPI_humano = media ponderada de cpi_total.
        - CPI_automatizado = config.automation_cpi
        - Volumen_automatizable = volume_total * automation_volume_share
        - Tasa_éxito = automation_success_rate

        Si faltan parámetros en config -> devuelve {}.
        """
        if not self._has_cost_config():
            return {}

        cfg = self.config
        assert cfg is not None

        if cfg.automation_cpi is None or cfg.automation_volume_share <= 0 or cfg.automation_success_rate <= 0:
            return {}

        cpi_table = self.annual_cost_by_skill_channel()
        if cpi_table.empty:
            return {}

        total_volume = cpi_table["volume"].sum()
        if total_volume <= 0:
            return {}

        # CPI humano medio ponderado
        weighted_cpi = (
            (cpi_table["cpi_total"] * cpi_table["volume"]).sum() / total_volume
        )

        volume_automatizable = total_volume * cfg.automation_volume_share
        effective_volume = volume_automatizable * cfg.automation_success_rate

        delta_cpi = max(0.0, weighted_cpi - cfg.automation_cpi)
        annual_savings = delta_cpi * effective_volume

        return {
            "cpi_humano": round(weighted_cpi, 4),
            "cpi_automatizado": round(cfg.automation_cpi, 4),
            "volume_total": float(total_volume),
            "volume_automatizable": float(volume_automatizable),
            "effective_volume": float(effective_volume),
            "annual_savings": round(annual_savings, 2),
        }

    # ------------------------------------------------------------------ #
    # PLOTS
    # ------------------------------------------------------------------ #
    def plot_cost_waterfall(self) -> Axes:
        """
        Waterfall de costes anuales (labor + tech + overhead).
        """
        breakdown = self.cost_breakdown()
        if not breakdown:
            fig, ax = plt.subplots()
            ax.text(0.5, 0.5, "Sin configuración de costes", ha="center", va="center")
            ax.set_axis_off()
            return ax

        labels = ["Labor", "Overhead", "Tech"]
        values = [
            breakdown["labor_annual"],
            breakdown["overhead_annual"],
            breakdown["tech_annual"],
        ]

        fig, ax = plt.subplots(figsize=(8, 4))

        running = 0.0
        positions = []
        bottoms = []

        for v in values:
            positions.append(running)
            bottoms.append(running)
            running += v

        # barras estilo waterfall
        x = np.arange(len(labels))
        ax.bar(x, values)

        ax.set_xticks(x)
        ax.set_xticklabels(labels)
        ax.set_ylabel("€ anuales")
        ax.set_title("Desglose anual de costes")

        for idx, v in enumerate(values):
            ax.text(idx, v, f"{v:,.0f}", ha="center", va="bottom")

        ax.grid(axis="y", alpha=0.3)

        return ax

    def plot_cpi_by_channel(self) -> Axes:
        """
        Gráfico de barras de CPI medio por canal.
        """
        cpi_table = self.cpi_by_skill_channel()
        if cpi_table.empty:
            fig, ax = plt.subplots()
            ax.text(0.5, 0.5, "Sin configuración de costes", ha="center", va="center")
            ax.set_axis_off()
            return ax

        df = self.df.copy()
        volume = (
            df.groupby(["queue_skill", "channel"])["interaction_id"]
            .nunique()
            .rename("volume")
        )

        joined = cpi_table.join(volume, how="left").fillna({"volume": 0})

        # CPI medio ponderado por canal
        per_channel = (
            joined.reset_index()
            .groupby("channel")
            .apply(lambda g: (g["cpi_total"] * g["volume"]).sum() / max(g["volume"].sum(), 1))
            .rename("cpi_mean")
            .round(4)
        )

        fig, ax = plt.subplots(figsize=(6, 4))
        per_channel.plot(kind="bar", ax=ax)

        ax.set_xlabel("Canal")
        ax.set_ylabel("CPI medio (€)")
        ax.set_title("Coste por interacción (CPI) por canal")
        ax.grid(axis="y", alpha=0.3)

        return ax
