from __future__ import annotations

from typing import Any, Dict

from beyond_metrics.io import LocalDataSource, LocalResultsSink, ResultsSink
from beyond_metrics.pipeline import build_pipeline
from beyond_flows.scorers import AgenticScorer


def agentic_post_run(results: Dict[str, Any], run_base: str, sink: ResultsSink) -> None:
    """
    Callback post-run que calcula el Agentic Readiness y lo añade al diccionario final
    como la clave "agentic_readiness".
    """
    scorer = AgenticScorer()
    agentic = scorer.compute_and_return(results)

    # Enriquecemos el JSON final (sin escribir un segundo fichero)
    results["agentic_readiness"] = agentic


def run_pipeline_with_agentic(
    input_csv,
    base_results_dir,
    dimensions_config_path="beyond_metrics/configs/beyond_metrics_config.json",
):
    datasource = LocalDataSource(base_dir=".")
    sink = LocalResultsSink(base_dir=".")

    pipeline = build_pipeline(
        dimensions_config_path=dimensions_config_path,
        datasource=datasource,
        sink=sink,
        post_run=[agentic_post_run],
    )

    results = pipeline.run(
        input_path=input_csv,
        run_dir=base_results_dir,
    )

    return results

