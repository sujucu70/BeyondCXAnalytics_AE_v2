import math
from datetime import datetime

import matplotlib
import pandas as pd

from beyond_metrics.dimensions.EconomyCost import EconomyCostMetrics, EconomyConfig

matplotlib.use("Agg")


def _sample_df() -> pd.DataFrame:
    data = [
        {
            "interaction_id": "id1",
            "datetime_start": datetime(2024, 1, 1, 10, 0),
            "queue_skill": "ventas",
            "channel": "voz",
            "duration_talk": 600,
            "hold_time": 60,
            "wrap_up_time": 30,
        },
        {
            "interaction_id": "id2",
            "datetime_start": datetime(2024, 1, 1, 10, 5),
            "queue_skill": "ventas",
            "channel": "voz",
            "duration_talk": 300,
            "hold_time": 30,
            "wrap_up_time": 20,
        },
        {
            "interaction_id": "id3",
            "datetime_start": datetime(2024, 1, 1, 11, 0),
            "queue_skill": "soporte",
            "channel": "chat",
            "duration_talk": 400,
            "hold_time": 20,
            "wrap_up_time": 30,
        },
    ]
    return pd.DataFrame(data)


def test_init_and_required_columns():
    df = _sample_df()
    cfg = EconomyConfig(labor_cost_per_hour=20.0, overhead_rate=0.1, tech_costs_annual=10000.0)
    em = EconomyCostMetrics(df, cfg)
    assert not em.is_empty

    # Falta de columna obligatoria -> ValueError
    df_missing = df.drop(columns=["duration_talk"])
    import pytest
    with pytest.raises(ValueError):
        EconomyCostMetrics(df_missing, cfg)


def test_metrics_without_config_do_not_crash():
    df = _sample_df()
    em = EconomyCostMetrics(df, None)

    assert em.cpi_by_skill_channel().empty
    assert em.annual_cost_by_skill_channel().empty
    assert em.cost_breakdown() == {}
    assert em.inefficiency_cost_by_skill_channel().empty
    assert em.potential_savings() == {}


def test_basic_cpi_and_annual_cost():
    df = _sample_df()
    cfg = EconomyConfig(labor_cost_per_hour=20.0, overhead_rate=0.1)
    em = EconomyCostMetrics(df, cfg)

    cpi = em.cpi_by_skill_channel()
    assert not cpi.empty
    # Debe haber filas para ventas/voz y soporte/chat
    assert ("ventas", "voz") in cpi.index
    assert ("soporte", "chat") in cpi.index

    annual = em.annual_cost_by_skill_channel()
    assert "annual_cost" in annual.columns
    # costes positivos
    assert (annual["annual_cost"] > 0).any()


def test_cost_breakdown_and_potential_savings():
    df = _sample_df()
    cfg = EconomyConfig(
        labor_cost_per_hour=20.0,
        overhead_rate=0.1,
        tech_costs_annual=5000.0,
        automation_cpi=0.2,
        automation_volume_share=0.5,
        automation_success_rate=0.8,
    )
    em = EconomyCostMetrics(df, cfg)

    breakdown = em.cost_breakdown()
    assert "labor_pct" in breakdown
    assert "overhead_pct" in breakdown
    assert "tech_pct" in breakdown

    total_pct = (
        breakdown["labor_pct"]
        + breakdown["overhead_pct"]
        + breakdown["tech_pct"]
    )

    # Permitimos pequeño error por redondeo a 2 decimales
    assert abs(total_pct - 100.0) < 0.2

    savings = em.potential_savings()
    assert "annual_savings" in savings
    assert savings["annual_savings"] >= 0.0


def test_plot_methods_return_axes():
    from matplotlib.axes import Axes

    df = _sample_df()
    cfg = EconomyConfig(labor_cost_per_hour=20.0, overhead_rate=0.1)
    em = EconomyCostMetrics(df, cfg)

    ax1 = em.plot_cost_waterfall()
    ax2 = em.plot_cpi_by_channel()

    assert isinstance(ax1, Axes)
    assert isinstance(ax2, Axes)
