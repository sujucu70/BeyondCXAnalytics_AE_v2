import math
from datetime import datetime

import matplotlib
import pandas as pd

from beyond_metrics.dimensions.Volumetria import VolumetriaMetrics

# Usamos backend "Agg" para que matplotlib no intente abrir ventanas
matplotlib.use("Agg")


def _sample_df() -> pd.DataFrame:
    """
    DataFrame de prueba con el nuevo esquema de columnas:

    Campos usados por VolumetriaMetrics:
    - interaction_id
    - datetime_start
    - queue_skill
    - channel

    5 interacciones:
    - 3 por canal "voz", 2 por canal "chat"
    - 3 en skill "ventas", 2 en skill "soporte"
    - 3 en enero, 2 en febrero
    """
    data = [
        {
            "interaction_id": "id1",
            "datetime_start": datetime(2024, 1, 1, 9, 0),
            "queue_skill": "ventas",
            "channel": "voz",
        },
        {
            "interaction_id": "id2",
            "datetime_start": datetime(2024, 1, 1, 9, 30),
            "queue_skill": "ventas",
            "channel": "voz",
        },
        {
            "interaction_id": "id3",
            "datetime_start": datetime(2024, 1, 1, 10, 0),
            "queue_skill": "soporte",
            "channel": "voz",
        },
        {
            "interaction_id": "id4",
            "datetime_start": datetime(2024, 2, 1, 10, 0),
            "queue_skill": "ventas",
            "channel": "chat",
        },
        {
            "interaction_id": "id5",
            "datetime_start": datetime(2024, 2, 2, 11, 0),
            "queue_skill": "soporte",
            "channel": "chat",
        },
    ]
    return pd.DataFrame(data)


# ----------------------------------------------------------------------
# VALIDACIÓN BÁSICA
# ----------------------------------------------------------------------


def test_init_validates_required_columns():
    df = _sample_df()

    # No debe lanzar error con las columnas por defecto
    vm = VolumetriaMetrics(df)
    assert not vm.is_empty

    # Si falta alguna columna requerida, debe lanzar ValueError
    for col in ["interaction_id", "datetime_start", "queue_skill", "channel"]:
        df_missing = df.drop(columns=[col])
        try:
            VolumetriaMetrics(df_missing)
            assert False, f"Debería fallar al faltar la columna: {col}"
        except ValueError:
            pass


# ----------------------------------------------------------------------
# VOLUMEN Y DISTRIBUCIONES
# ----------------------------------------------------------------------


def test_volume_by_channel_and_skill():
    df = _sample_df()
    vm = VolumetriaMetrics(df)

    vol_channel = vm.volume_by_channel()
    vol_skill = vm.volume_by_skill()

    # Canales
    assert vol_channel.sum() == len(df)
    assert vol_channel["voz"] == 3
    assert vol_channel["chat"] == 2

    # Skills
    assert vol_skill.sum() == len(df)
    assert vol_skill["ventas"] == 3
    assert vol_skill["soporte"] == 2


def test_channel_and_skill_distribution_pct():
    df = _sample_df()
    vm = VolumetriaMetrics(df)

    dist_channel = vm.channel_distribution_pct()
    dist_skill = vm.skill_distribution_pct()

    # 3/5 = 60%, 2/5 = 40%
    assert math.isclose(dist_channel["voz"], 60.0, rel_tol=1e-6)
    assert math.isclose(dist_channel["chat"], 40.0, rel_tol=1e-6)

    assert math.isclose(dist_skill["ventas"], 60.0, rel_tol=1e-6)
    assert math.isclose(dist_skill["soporte"], 40.0, rel_tol=1e-6)


# ----------------------------------------------------------------------
# HEATMAP Y SAZONALIDAD
# ----------------------------------------------------------------------


def test_heatmap_24x7_shape_and_values():
    df = _sample_df()
    vm = VolumetriaMetrics(df)

    heatmap = vm.heatmap_24x7()

    # 7 días x 24 horas
    assert heatmap.shape == (7, 24)

    # Comprobamos algunas celdas concretas
    # 2024-01-01 es lunes (dayofweek=0), llamadas a las 9h (2) y 10h (1)
    assert heatmap.loc[0, 9] == 2
    assert heatmap.loc[0, 10] == 1

    # 2024-02-01 es jueves (dayofweek=3), 10h
    assert heatmap.loc[3, 10] == 1

    # 2024-02-02 es viernes (dayofweek=4), 11h
    assert heatmap.loc[4, 11] == 1


def test_monthly_seasonality_cv():
    df = _sample_df()
    vm = VolumetriaMetrics(df)

    cv = vm.monthly_seasonality_cv()

    # Volumen mensual: [3, 2]
    # mean = 2.5, std (ddof=1) ≈ 0.7071 -> CV ≈ 28.28%
    assert math.isclose(cv, 28.28, rel_tol=1e-2)


def test_peak_offpeak_ratio():
    df = _sample_df()
    vm = VolumetriaMetrics(df)

    ratio = vm.peak_offpeak_ratio()

    # Horas pico definidas en la clase: 10-19
    # Pico: 10h,10h,11h -> 3 interacciones
    # Valle: 9h,9h      -> 2 interacciones
    # Ratio = 3/2 = 1.5
    assert math.isclose(ratio, 1.5, rel_tol=1e-6)


def test_concentration_top20_skills_pct():
    df = _sample_df()
    vm = VolumetriaMetrics(df)

    conc = vm.concentration_top20_skills_pct()

    # Skills: ventas=3, soporte=2, total=5
    # Top 20% de skills (ceil(0.2 * 2) = 1 skill) -> ventas=3
    # 3/5 = 60%
    assert math.isclose(conc, 60.0, rel_tol=1e-6)


# ----------------------------------------------------------------------
# CASO DATAFRAME VACÍO
# ----------------------------------------------------------------------


def test_empty_dataframe_behaviour():
    df_empty = pd.DataFrame(
        columns=["interaction_id", "datetime_start", "queue_skill", "channel"]
    )
    vm = VolumetriaMetrics(df_empty)

    assert vm.is_empty
    assert vm.volume_by_channel().empty
    assert vm.volume_by_skill().empty
    assert math.isnan(vm.monthly_seasonality_cv())
    assert math.isnan(vm.peak_offpeak_ratio())
    assert math.isnan(vm.concentration_top20_skills_pct())


# ----------------------------------------------------------------------
# PLOTS
# ----------------------------------------------------------------------


def test_plot_methods_return_axes():
    df = _sample_df()
    vm = VolumetriaMetrics(df)

    ax1 = vm.plot_heatmap_24x7()
    ax2 = vm.plot_channel_distribution()
    ax3 = vm.plot_skill_pareto()

    from matplotlib.axes import Axes

    assert isinstance(ax1, Axes)
    assert isinstance(ax2, Axes)
    assert isinstance(ax3, Axes)
