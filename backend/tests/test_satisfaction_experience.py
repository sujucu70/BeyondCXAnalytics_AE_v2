import math
from datetime import datetime, timedelta
import pytest

import matplotlib
import numpy as np
import pandas as pd

from beyond_metrics.dimensions.SatisfactionExperience import SatisfactionExperienceMetrics

matplotlib.use("Agg")


def _sample_df_negative_corr() -> pd.DataFrame:
    """
    Dataset sintético donde CSAT decrece claramente cuando AHT aumenta,
    para que la correlación sea negativa (< -0.3).
    """
    base = datetime(2024, 1, 1, 10, 0, 0)

    rows = []
    # AHT crece, CSAT baja
    aht_values = [200, 300, 400, 500, 600, 700, 800, 900]
    csat_values = [5.0, 4.7, 4.3, 3.8, 3.3, 2.8, 2.3, 2.0]

    skills = ["ventas", "retencion"]
    channels = ["voz", "chat"]

    for i, (aht, csat) in enumerate(zip(aht_values, csat_values), start=1):
        rows.append(
            {
                "interaction_id": f"id{i}",
                "datetime_start": base + timedelta(minutes=5 * i),
                "queue_skill": skills[i % len(skills)],
                "channel": channels[i % len(channels)],
                "csat_score": csat,
                "duration_talk": aht * 0.7,
                "hold_time": aht * 0.2,
                "wrap_up_time": aht * 0.1,
            }
        )

    return pd.DataFrame(rows)


def _sample_df_full() -> pd.DataFrame:
    """
    Dataset más completo con NPS y CES para otras pruebas.
    """
    base = datetime(2024, 1, 1, 10, 0, 0)
    rows = []

    for i in range(1, 11):
        aht = 300 + 30 * i
        csat = 3.0 + 0.1 * i  # ligero incremento
        nps = -20 + 5 * i
        ces = 4.0 - 0.05 * i

        rows.append(
            {
                "interaction_id": f"id{i}",
                "datetime_start": base + timedelta(minutes=10 * i),
                "queue_skill": "ventas" if i <= 5 else "retencion",
                "channel": "voz" if i % 2 == 0 else "chat",
                "csat_score": csat,
                "duration_talk": aht * 0.7,
                "hold_time": aht * 0.2,
                "wrap_up_time": aht * 0.1,
                "nps_score": nps,
                "ces_score": ces,
            }
        )

    return pd.DataFrame(rows)


# ----------------------------------------------------------------------
# Inicialización y validación
# ----------------------------------------------------------------------


def test_init_and_required_columns():
    df = _sample_df_negative_corr()
    sm = SatisfactionExperienceMetrics(df)
    assert not sm.is_empty

    # Quitar una columna REALMENTE obligatoria -> debe lanzar ValueError
    df_missing = df.drop(columns=["duration_talk"])
    with pytest.raises(ValueError):
        SatisfactionExperienceMetrics(df_missing)

    # Quitar csat_score ya NO debe romper: es opcional
    df_no_csat = df.drop(columns=["csat_score"])
    sm2 = SatisfactionExperienceMetrics(df_no_csat)
    # simplemente no tendrá métricas de csat
    assert sm2.is_empty is False


# ----------------------------------------------------------------------
# CSAT promedio y tablas
# ----------------------------------------------------------------------


def test_csat_avg_by_skill_channel():
    df = _sample_df_full()
    sm = SatisfactionExperienceMetrics(df)

    table = sm.csat_avg_by_skill_channel()
    # Debe tener al menos 2 skills y 2 canales
    assert "ventas" in table.index
    assert "retencion" in table.index
    # Algún canal
    assert any(col in table.columns for col in ["voz", "chat"])


def test_nps_and_ces_tables():
    df = _sample_df_full()
    sm = SatisfactionExperienceMetrics(df)

    nps = sm.nps_avg_by_skill_channel()
    ces = sm.ces_avg_by_skill_channel()

    # Deben devolver DataFrame no vacío
    assert not nps.empty
    assert not ces.empty
    assert "ventas" in nps.index
    assert "ventas" in ces.index


# ----------------------------------------------------------------------
# Correlación CSAT vs AHT
# ----------------------------------------------------------------------


def test_csat_aht_correlation_negative():
    df = _sample_df_negative_corr()
    sm = SatisfactionExperienceMetrics(df)

    corr = sm.csat_aht_correlation()
    r = corr["r"]
    code = corr["interpretation_code"]

    assert r < -0.3
    assert code == "negativo"


# ----------------------------------------------------------------------
# Clasificación por skill (sweet spot)
# ----------------------------------------------------------------------


def test_csat_aht_skill_summary_structure():
    df = _sample_df_full()
    sm = SatisfactionExperienceMetrics(df)

    summary = sm.csat_aht_skill_summary()
    assert "csat_avg" in summary.columns
    assert "aht_avg" in summary.columns
    assert "classification" in summary.columns
    assert set(summary.index) == {"ventas", "retencion"}


# ----------------------------------------------------------------------
# Plots
# ----------------------------------------------------------------------


def test_plot_methods_return_axes():
    df = _sample_df_full()
    sm = SatisfactionExperienceMetrics(df)

    ax1 = sm.plot_csat_vs_aht_scatter()
    ax2 = sm.plot_csat_distribution()

    from matplotlib.axes import Axes

    assert isinstance(ax1, Axes)
    assert isinstance(ax2, Axes)


def test_dataset_without_csat_does_not_break():
    # Dataset “core” sin csat/nps/ces
    df = pd.DataFrame(
        {
            "interaction_id": ["id1", "id2"],
            "datetime_start": [datetime(2024, 1, 1, 10), datetime(2024, 1, 1, 11)],
            "queue_skill": ["ventas", "soporte"],
            "channel": ["voz", "chat"],
            "duration_talk": [300, 400],
            "hold_time": [30, 20],
            "wrap_up_time": [20, 30],
        }
    )

    sm = SatisfactionExperienceMetrics(df)

    # No debe petar, simplemente devolver vacío/NaN
    assert sm.csat_avg_by_skill_channel().empty
    corr = sm.csat_aht_correlation()
    assert math.isnan(corr["r"])
