"""
beyond_metrics package
======================

Capa pública del sistema BeyondMetrics.

Expone:
- Dimensiones (Volumetría, Eficiencia, ...)
- Pipeline principal
- Conectores de IO (local, S3, ...)
"""

from .dimensions import (
    VolumetriaMetrics,
    OperationalPerformanceMetrics,
    SatisfactionExperienceMetrics,
    EconomyCostMetrics,  
)
from .pipeline import (
    BeyondMetricsPipeline,
    build_pipeline,
    load_dimensions_config,   # opcional, pero útil
)
from .io import (
    DataSource,
    ResultsSink,
    LocalDataSource,
    LocalResultsSink,
    S3DataSource,
    S3ResultsSink,
    # si has añadido GoogleDrive, puedes exponerlo aquí también:
    # GoogleDriveDataSource,
    # GoogleDriveResultsSink,
)

__all__ = [
    # Dimensiones
    "VolumetriaMetrics",
    "OperationalPerformanceMetrics",
    "SatisfactionExperienceMetrics",
    "EconomyCostMetrics",
    # Pipeline
    "BeyondMetricsPipeline",
    "build_pipeline",
    "load_dimensions_config",
    # IO
    "DataSource",
    "ResultsSink",
    "LocalDataSource",
    "LocalResultsSink",
    "S3DataSource",
    "S3ResultsSink",
    # "GoogleDriveDataSource",
    # "GoogleDriveResultsSink",
]
