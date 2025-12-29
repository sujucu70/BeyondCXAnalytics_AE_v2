import math
from datetime import datetime, timedelta

import matplotlib
import numpy as np
import pandas as pd

from beyond_metrics.dimensions.OperationalPerformance import OperationalPerformanceMetrics

matplotlib.use("Agg")


def _sample_df() -> pd.DataFrame:
    """
    Dataset sintético pequeño para probar la dimensión de rendimiento operacional.

    Incluye:
    - varios skills
    - FCR, abandonos, transferencias
    - reincidencia <7 días
    - logged_time para occupancy
    """
    base = datetime(2024, 1, 1, 10, 0, 0)

    rows = [
        # cliente C1, resolved, no abandon, voz, ventas
        {
            "interaction_id": "id1",
            "datetime_start": base,
            "queue_skill": "ventas",
            "channel": "voz",
            "duration_talk": 600,
            "hold_time": 60,
            "wrap_up_time": 30,
            "agent_id": "A1",
            "transfer_flag": 0,
            "is_resolved": 1,
            "abandoned_flag": 0,
            "customer_id": "C1",
            "logged_time": 900,
        },
        # C1 vuelve en 3 días mismo canal/skill
        {
            "interaction_id": "id2",
            "datetime_start": base + timedelta(days=3),
            "queue_skill": "ventas",
            "channel": "voz",
            "duration_talk": 700,
            "hold_time": 30,
            "wrap_up_time": 40,
            "agent_id": "A1",
            "transfer_flag": 1,
            "is_resolved": 1,
            "abandoned_flag": 0,
            "customer_id": "C1",
            "logged_time": 900,
        },
        # cliente C2, soporte, chat, no resuelto, transferido
        {
            "interaction_id": "id3",
            "datetime_start": base + timedelta(hours=1),
            "queue_skill": "soporte",
            "channel": "chat",
            "duration_talk": 400,
            "hold_time": 20,
            "wrap_up_time": 30,
            "agent_id": "A2",
            "transfer_flag": 1,
            "is_resolved": 0,
            "abandoned_flag": 0,
            "customer_id": "C2",
            "logged_time": 800,
        },
        # cliente C3, abandonado
        {
            "interaction_id": "id4",
            "datetime_start": base + timedelta(hours=2),
            "queue_skill": "soporte",
            "channel": "voz",
            "duration_talk": 100,
            "hold_time": 50,
            "wrap_up_time": 10,
            "agent_id": "A2",
            "transfer_flag": 0,
            "is_resolved": 0,
            "abandoned_flag": 1,
            "customer_id": "C3",
            "logged_time": 600,
        },
        # cliente C4, una sola interacción, email
        {
            "interaction_id": "id5",
            "datetime_start": base + timedelta(days=10),
            "queue_skill": "ventas",
            "channel": "email",
            "duration_talk": 300,
            "hold_time": 0,
            "wrap_up_time": 20,
            "agent_id": "A1",
            "transfer_flag": 0,
            "is_resolved": 1,
            "abandoned_flag": 0,
            "customer_id": "C4",
            "logged_time": 700,
        },
    ]

    return pd.DataFrame(rows)


# ----------------------------------------------------------------------
# Inicialización y validación básica
# ----------------------------------------------------------------------


def test_init_and_required_columns():
    df = _sample_df()
    op = OperationalPerformanceMetrics(df)
    assert not op.is_empty

    # Falta columna obligatoria -> ValueError
    df_missing = df.drop(columns=["duration_talk"])
    try:
        OperationalPerformanceMetrics(df_missing)
        assert False, "Debería lanzar ValueError si falta duration_talk"
    except ValueError:
        pass


# ----------------------------------------------------------------------
# AHT y distribución
# ----------------------------------------------------------------------


def test_aht_distribution_basic():
    df = _sample_df()
    op = OperationalPerformanceMetrics(df)

    dist = op.aht_distribution()
    assert "p10" in dist and "p50" in dist and "p90" in dist and "p90_p50_ratio" in dist

    # Comprobamos que el ratio P90/P50 es razonable (>1)
    assert dist["p90_p50_ratio"] >= 1.0


# ----------------------------------------------------------------------
# FCR, escalación, abandono
# ----------------------------------------------------------------------


def test_fcr_escalation_abandonment_rates():
    df = _sample_df()
    op = OperationalPerformanceMetrics(df)

    fcr = op.fcr_rate()
    esc = op.escalation_rate()
    aband = op.abandonment_rate()

    # FCR: interacciones resueltas / total
    # is_resolved=1 en id1, id2, id5 -> 3 de 5
    assert math.isclose(fcr, 60.0, rel_tol=1e-6)

    # Escalación: transfer_flag=1 en id2, id3 -> 2 de 5
    assert math.isclose(esc, 40.0, rel_tol=1e-6)

    # Abandono: abandoned_flag=1 en id4 -> 1 de 5
    assert math.isclose(aband, 20.0, rel_tol=1e-6)


# ----------------------------------------------------------------------
# Reincidencia y repetición de canal
# ----------------------------------------------------------------------


def test_recurrence_and_repeat_channel():
    df = _sample_df()
    op = OperationalPerformanceMetrics(df)

    rec = op.recurrence_rate_7d()
    rep = op.repeat_channel_rate()

    # Clientes: C1, C2, C3, C4 -> 4 clientes
    # Recurrente: C1 (tiene 2 contactos en 3 días). Solo 1 de 4 -> 25%
    assert math.isclose(rec, 25.0, rel_tol=1e-6)

    # Reincidencias (<7d):
    # Solo el par de C1: voz -> voz, mismo canal => 100%
    assert math.isclose(rep, 100.0, rel_tol=1e-6)


# ----------------------------------------------------------------------
# Occupancy
# ----------------------------------------------------------------------


def test_occupancy_rate():
    df = _sample_df()
    op = OperationalPerformanceMetrics(df)

    occ = op.occupancy_rate()

    # handle_time = (600+60+30) + (700+30+40) + (400+20+30) + (100+50+10) + (300+0+20)
    #             = 690 + 770 + 450 + 160 + 320 = 2390
    # logged_time total = 900 + 900 + 800 + 600 + 700 = 3900
    expected_occ = 2390 / 3900 * 100
    assert math.isclose(occ, round(expected_occ, 2), rel_tol=1e-6)


# ----------------------------------------------------------------------
# Performance Score
# ----------------------------------------------------------------------


def test_performance_score_structure_and_range():
    df = _sample_df()
    op = OperationalPerformanceMetrics(df)

    score_info = op.performance_score()
    assert "score" in score_info
    assert 0.0 <= score_info["score"] <= 10.0


# ----------------------------------------------------------------------
# Plots
# ----------------------------------------------------------------------


def test_plot_methods_return_axes():
    df = _sample_df()
    op = OperationalPerformanceMetrics(df)

    ax1 = op.plot_aht_boxplot_by_skill()
    ax2 = op.plot_resolution_funnel_by_skill()

    from matplotlib.axes import Axes

    assert isinstance(ax1, Axes)
    assert isinstance(ax2, Axes)
