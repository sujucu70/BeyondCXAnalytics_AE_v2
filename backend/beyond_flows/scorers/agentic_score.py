"""
agentic_score.py

Calcula el Agentic Readiness Score de un contact center a partir
de un JSON con KPIs agregados (misma estructura que results.json).

Diseñado como clase para integrarse fácilmente en pipelines.

Características:
- Tolerante a datos faltantes: si una dimensión no se puede calcular
  (porque faltan KPIs), se marca como `computed = False` y no se
  incluye en el cálculo del score global.
- La llamada típica en un pipeline será:
    from agentic_score import AgenticScorer
    scorer = AgenticScorer()
    result = scorer.run_on_folder("/ruta/a/carpeta")

Esa carpeta debe contener un `results.json` de entrada.
El módulo generará un `agentic_readiness.json` en la misma carpeta.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Union

Number = Union[int, float]


# =========================
# Helpers
# =========================

def _is_nan(x: Any) -> bool:
    """Devuelve True si x es NaN, None o el string 'NaN'."""
    try:
        if x is None:
            return True
        if isinstance(x, str) and x.lower() == "nan":
            return True
        return math.isnan(float(x))
    except (TypeError, ValueError):
        return False


def _safe_mean(values: Sequence[Optional[Number]]) -> Optional[float]:
    nums: List[float] = []
    for v in values:
        if v is None:
            continue
        if _is_nan(v):
            continue
        nums.append(float(v))
    if not nums:
        return None
    return sum(nums) / len(nums)


def _get_nested(d: Dict[str, Any], *keys: str, default: Any = None) -> Any:
    """Acceso seguro a diccionarios anidados."""
    cur: Any = d
    for k in keys:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur


def _clamp(value: float, lo: float = 0.0, hi: float = 10.0) -> float:
    return max(lo, min(hi, value))


def _normalize_numeric_sequence(field: Any) -> Optional[List[Number]]:
    """
    Normaliza un campo que representa una secuencia numérica.

    Soporta:
    - Formato antiguo del pipeline: [10, 20, 30]
    - Formato nuevo del pipeline: {"labels": [...], "values": [10, 20, 30]}

    Devuelve:
    - lista de números, si hay datos numéricos válidos
    - None, si el campo no tiene una secuencia numérica interpretable
    """
    if field is None:
        return None

    # Formato nuevo: {"labels": [...], "values": [...]}
    if isinstance(field, dict) and "values" in field:
        seq = field.get("values")
    else:
        seq = field

    if not isinstance(seq, Sequence):
        return None

    out: List[Number] = []
    for v in seq:
        if isinstance(v, (int, float)):
            out.append(v)
        else:
            # Intentamos conversión suave por si viene como string numérico
            try:
                out.append(float(v))
            except (TypeError, ValueError):
                continue

    return out or None


# =========================
# Scoring functions
# =========================

def score_repetitividad(volume_by_skill: Optional[List[Number]]) -> Dict[str, Any]:
    """
    Repetitividad basada en volumen medio por skill.

    Regla (pensada por proceso/skill):
      - 10 si volumen > 80
      - 5 si 40–80
      - 0 si < 40

    Si no hay datos (lista vacía o no numérica), la dimensión
    se marca como no calculada (computed = False).
    """
    if not volume_by_skill:
        return {
            "score": None,
            "computed": False,
            "reason": "sin_datos_volumen",
            "details": {
                "avg_volume_per_skill": None,
                "volume_by_skill": volume_by_skill,
            },
        }

    avg_volume = _safe_mean(volume_by_skill)
    if avg_volume is None:
        return {
            "score": None,
            "computed": False,
            "reason": "volumen_no_numerico",
            "details": {
                "avg_volume_per_skill": None,
                "volume_by_skill": volume_by_skill,
            },
        }

    if avg_volume > 80:
        score = 10.0
        reason = "alto_volumen"
    elif avg_volume >= 40:
        score = 5.0
        reason = "volumen_medio"
    else:
        score = 0.0
        reason = "volumen_bajo"

    return {
        "score": score,
        "computed": True,
        "reason": reason,
        "details": {
            "avg_volume_per_skill": avg_volume,
            "volume_by_skill": volume_by_skill,
            "thresholds": {
                "high": 80,
                "medium": 40,
            },
        },
    }


def score_predictibilidad(aht_ratio: Any,
                          escalation_rate: Any) -> Dict[str, Any]:
    """
    Predictibilidad basada en:
      - Variabilidad AHT: ratio P90/P50
      - Tasa de escalación (%)

    Regla:
      - 10 si ratio < 1.5 y escalación < 10%
      - 5 si ratio 1.5–2.0 o escalación 10–20%
      - 0 si ratio > 2.0 y escalación > 20%
      - 3 fallback si datos parciales

    Si no hay ni ratio ni escalación, la dimensión no se calcula.
    """
    if aht_ratio is None and escalation_rate is None:
        return {
            "score": None,
            "computed": False,
            "reason": "sin_datos",
            "details": {
                "aht_p90_p50_ratio": None,
                "escalation_rate_pct": None,
            },
        }

    # Normalizamos ratio
    if aht_ratio is None or _is_nan(aht_ratio):
        ratio: Optional[float] = None
    else:
        ratio = float(aht_ratio)

    # Normalizamos escalación
    if escalation_rate is None or _is_nan(escalation_rate):
        esc: Optional[float] = None
    else:
        esc = float(escalation_rate)

    if ratio is None and esc is None:
        return {
            "score": None,
            "computed": False,
            "reason": "sin_datos",
            "details": {
                "aht_p90_p50_ratio": None,
                "escalation_rate_pct": None,
            },
        }

    score: float
    reason: str

    if ratio is not None and esc is not None:
        if ratio < 1.5 and esc < 10.0:
            score = 10.0
            reason = "alta_predictibilidad"
        elif (1.5 <= ratio <= 2.0) or (10.0 <= esc <= 20.0):
            score = 5.0
            reason = "predictibilidad_media"
        elif ratio > 2.0 and esc > 20.0:
            score = 0.0
            reason = "baja_predictibilidad"
        else:
            score = 3.0
            reason = "caso_intermedio"
    else:
        # Datos parciales: penalizamos pero no ponemos a 0
        score = 3.0
        reason = "datos_parciales"

    return {
        "score": score,
        "computed": True,
        "reason": reason,
        "details": {
            "aht_p90_p50_ratio": ratio,
            "escalation_rate_pct": esc,
            "rules": {
                "high": {"max_ratio": 1.5, "max_esc_pct": 10},
                "medium": {"ratio_range": [1.5, 2.0], "esc_range_pct": [10, 20]},
                "low": {"min_ratio": 2.0, "min_esc_pct": 20},
            },
        },
    }


def score_estructuracion(channel_distribution_pct: Any) -> Dict[str, Any]:
    """
    Estructuración de datos usando proxy de canal.

    Asumimos que el canal con mayor % es texto (en proyectos reales se puede
    parametrizar esta asignación).

    Regla:
      - 10 si texto > 60%
      - 5 si 30–60%
      - 0 si < 30%

    Si no hay datos de canales, la dimensión no se calcula.
    """
    if not channel_distribution_pct:
        return {
            "score": None,
            "computed": False,
            "reason": "sin_datos_canal",
            "details": {
                "estimated_text_share_pct": None,
                "channel_distribution_pct": channel_distribution_pct,
            },
        }

    try:
        values: List[float] = []
        for x in channel_distribution_pct:
            if _is_nan(x):
                continue
            values.append(float(x))
        if not values:
            raise ValueError("sin valores numéricos")
        max_share = max(values)
    except Exception:
        return {
            "score": None,
            "computed": False,
            "reason": "canales_no_numericos",
            "details": {
                "estimated_text_share_pct": None,
                "channel_distribution_pct": channel_distribution_pct,
            },
        }

    if max_share > 60.0:
        score = 10.0
        reason = "alta_proporcion_texto"
    elif max_share >= 30.0:
        score = 5.0
        reason = "proporcion_texto_media"
    else:
        score = 0.0
        reason = "baja_proporcion_texto"

    return {
        "score": score,
        "computed": True,
        "reason": reason,
        "details": {
            "estimated_text_share_pct": max_share,
            "channel_distribution_pct": channel_distribution_pct,
            "thresholds_pct": {
                "high": 60,
                "medium": 30,
            },
        },
    }


def score_complejidad(aht_ratio: Any,
                      escalation_rate: Any) -> Dict[str, Any]:
    """
    Complejidad inversa del proceso (0–10).

    1) Base: inversa lineal de la variabilidad AHT (ratio P90/P50):
       - ratio = 1.0 -> 10
       - ratio = 1.5 -> ~7.5
       - ratio = 2.0 -> 5
       - ratio = 2.5 -> 2.5
       - ratio >= 3.0 -> 0

       formula_base = (3 - ratio) / (3 - 1) * 10, acotado a [0,10]

    2) Ajuste por escalación:
       - restamos (escalation_rate / 5) puntos.

    Nota: más score = proceso más "simple / automatizable".

    Si no hay ni ratio ni escalación, la dimensión no se calcula.
    """
    if aht_ratio is None or _is_nan(aht_ratio):
        ratio: Optional[float] = None
    else:
        ratio = float(aht_ratio)

    if escalation_rate is None or _is_nan(escalation_rate):
        esc: Optional[float] = None
    else:
        esc = float(escalation_rate)

    if ratio is None and esc is None:
        return {
            "score": None,
            "computed": False,
            "reason": "sin_datos",
            "details": {
                "aht_p90_p50_ratio": None,
                "escalation_rate_pct": None,
            },
        }

    # Base por variabilidad
    if ratio is None:
        base = 5.0  # fallback neutro
        base_reason = "sin_ratio_usamos_valor_neutro"
    else:
        base_raw = (3.0 - ratio) / (3.0 - 1.0) * 10.0
        base = _clamp(base_raw)
        base_reason = "calculado_desde_ratio"

    # Ajuste por escalación
    if esc is None:
        adj = 0.0
        adj_reason = "sin_escalacion_sin_ajuste"
    else:
        adj = - (esc / 5.0)  # cada 5 puntos de escalación resta 1
        adj_reason = "ajuste_por_escalacion"

    final_score = _clamp(base + adj)

    return {
        "score": final_score,
        "computed": True,
        "reason": "complejidad_inversa",
        "details": {
            "aht_p90_p50_ratio": ratio,
            "escalation_rate_pct": esc,
            "base_score": base,
            "base_reason": base_reason,
            "adjustment": adj,
            "adjustment_reason": adj_reason,
        },
    }


def score_estabilidad(peak_offpeak_ratio: Any) -> Dict[str, Any]:
    """
    Estabilidad del proceso basada en relación pico/off-peak.

    Regla:
      - 10 si ratio < 3
      - 7 si 3–5
      - 3 si 5–7
      - 0 si > 7

    Si no hay dato de ratio, la dimensión no se calcula.
    """
    if peak_offpeak_ratio is None or _is_nan(peak_offpeak_ratio):
        return {
            "score": None,
            "computed": False,
            "reason": "sin_datos_peak_offpeak",
            "details": {
                "peak_offpeak_ratio": None,
            },
        }

    r = float(peak_offpeak_ratio)
    if r < 3.0:
        score = 10.0
        reason = "muy_estable"
    elif r < 5.0:
        score = 7.0
        reason = "estable_moderado"
    elif r < 7.0:
        score = 3.0
        reason = "pico_pronunciado"
    else:
        score = 0.0
        reason = "muy_inestable"

    return {
        "score": score,
        "computed": True,
        "reason": reason,
        "details": {
            "peak_offpeak_ratio": r,
            "thresholds": {
                "very_stable": 3.0,
                "stable": 5.0,
                "unstable": 7.0,
            },
        },
    }


def score_roi(annual_savings: Any) -> Dict[str, Any]:
    """
    ROI potencial anual.

    Regla:
      - 10 si ahorro > 100k €/año
      - 5 si 10k–100k €/año
      - 0 si < 10k €/año

    Si no hay dato de ahorro, la dimensión no se calcula.
    """
    if annual_savings is None or _is_nan(annual_savings):
        return {
            "score": None,
            "computed": False,
            "reason": "sin_datos_ahorro",
            "details": {
                "annual_savings_eur": None,
            },
        }

    savings = float(annual_savings)
    if savings > 100_000:
        score = 10.0
        reason = "roi_alto"
    elif savings >= 10_000:
        score = 5.0
        reason = "roi_medio"
    else:
        score = 0.0
        reason = "roi_bajo"

    return {
        "score": score,
        "computed": True,
        "reason": reason,
        "details": {
            "annual_savings_eur": savings,
            "thresholds_eur": {
                "high": 100_000,
                "medium": 10_000,
            },
        },
    }


def classify_agentic_score(score: Optional[float]) -> Dict[str, Any]:
    """
    Clasificación final:
      - 8–10: AUTOMATE 🤖
      - 5–7.99: ASSIST 🤝
      - 3–4.99: AUGMENT 🧠
      - 0–2.99: HUMAN_ONLY 👤

    Si score es None (ninguna dimensión disponible), devuelve NO_DATA.
    """
    if score is None:
        return {
            "label": "NO_DATA",
            "emoji": "❓",
            "description": (
                "No se ha podido calcular el Agentic Readiness Score porque "
                "ninguna de las dimensiones tenía datos suficientes."
            ),
        }

    if score >= 8.0:
        label = "AUTOMATE"
        emoji = "🤖"
        description = (
            "Alta repetitividad, alta predictibilidad y ROI elevado. "
            "Candidato a automatización completa (chatbot/IVR inteligente)."
        )
    elif score >= 5.0:
        label = "ASSIST"
        emoji = "🤝"
        description = (
            "Complejidad media o ROI limitado. Recomendado enfoque de copilot "
            "para agentes (sugerencias en tiempo real, autocompletado, etc.)."
        )
    elif score >= 3.0:
        label = "AUGMENT"
        emoji = "🧠"
        description = (
            "Alta complejidad o bajo volumen. Mejor usar herramientas de apoyo "
            "(knowledge base, guías dinámicas, scripts)."
        )
    else:
        label = "HUMAN_ONLY"
        emoji = "👤"
        description = (
            "Procesos de muy bajo volumen o extremadamente complejos. Mejor "
            "mantener operación 100% humana de momento."
        )

    return {
        "label": label,
        "emoji": emoji,
        "description": description,
    }


# =========================
# Clase principal
# =========================

class AgenticScorer:
    """
    Clase para calcular el Agentic Readiness Score a partir de resultados
    agregados (results.json) y dejar la salida en agentic_readiness.json
    en la misma carpeta.
    """

    def __init__(
        self,
        input_filename: str = "results.json",
        output_filename: str = "agentic_readiness.json",
    ) -> None:
        self.input_filename = input_filename
        self.output_filename = output_filename

        self.base_weights: Dict[str, float] = {
            "repetitividad": 0.25,
            "predictibilidad": 0.20,
            "estructuracion": 0.15,
            "complejidad": 0.15,
            "estabilidad": 0.10,
            "roi": 0.15,
        }

    # --------- IO helpers ---------

    def load_results(self, folder_path: Union[str, Path]) -> Dict[str, Any]:
        folder = Path(folder_path)
        input_path = folder / self.input_filename
        if not input_path.exists():
            raise FileNotFoundError(
                f"No se ha encontrado el archivo de entrada '{self.input_filename}' "
                f"en la carpeta: {folder}"
            )
        with input_path.open("r", encoding="utf-8") as f:
            return json.load(f)

    def save_agentic_readiness(self, folder_path: Union[str, Path], result: Dict[str, Any]) -> Path:
        folder = Path(folder_path)
        output_path = folder / self.output_filename
        with output_path.open("w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        return output_path

    # --------- Core computation ---------

    def compute_from_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcula el Agentic Readiness Score a partir de un dict de datos.

        Tolerante a datos faltantes: renormaliza pesos usando solo
        dimensiones con `computed = True`.

        Compatibilidad con pipeline:
        - Soporta tanto el formato antiguo:
            "volume_by_skill": [10, 20, 30]
        - como el nuevo:
            "volume_by_skill": {"labels": [...], "values": [10, 20, 30]}
        """
        volumetry = data.get("volumetry", {})
        op = data.get("operational_performance", {})
        econ = data.get("economy_costs", {})

        # Normalizamos aquí los posibles formatos para contentar al type checker
        volume_by_skill = _normalize_numeric_sequence(
            volumetry.get("volume_by_skill")
        )
        channel_distribution_pct = _normalize_numeric_sequence(
            volumetry.get("channel_distribution_pct")
        )
        peak_offpeak_ratio = volumetry.get("peak_offpeak_ratio")

        aht_ratio = _get_nested(op, "aht_distribution", "p90_p50_ratio")
        escalation_rate = op.get("escalation_rate")

        annual_savings = _get_nested(econ, "potential_savings", "annual_savings")

        # --- Calculamos sub-scores (cada uno decide si está 'computed' o no) ---
        repet = score_repetitividad(volume_by_skill)
        pred = score_predictibilidad(aht_ratio, escalation_rate)
        estr = score_estructuracion(channel_distribution_pct)
        comp = score_complejidad(aht_ratio, escalation_rate)
        estab = score_estabilidad(peak_offpeak_ratio)
        roi = score_roi(annual_savings)

        sub_scores = {
            "repetitividad": repet,
            "predictibilidad": pred,
            "estructuracion": estr,
            "complejidad": comp,
            "estabilidad": estab,
            "roi": roi,
        }

        # --- Renormalización de pesos sólo con dimensiones disponibles ---
        effective_weights: Dict[str, float] = {}
        for name, base_w in self.base_weights.items():
            dim = sub_scores.get(name, {})
            if dim.get("computed"):
                effective_weights[name] = base_w

        total_effective_weight = sum(effective_weights.values())
        if total_effective_weight > 0:
            normalized_weights = {
                name: w / total_effective_weight for name, w in effective_weights.items()
            }
        else:
            normalized_weights = {}

        # --- Score final ---
        if not normalized_weights:
            final_score: Optional[float] = None
        else:
            acc = 0.0
            for name, dim in sub_scores.items():
                if not dim.get("computed"):
                    continue
                w = normalized_weights.get(name, 0.0)
                acc += (dim.get("score") or 0.0) * w
            final_score = round(acc, 2)

        classification = classify_agentic_score(final_score)

        result = {
            "agentic_readiness": {
                "version": "1.0",
                "final_score": final_score,
                "classification": classification,
                "weights": {
                    "base_weights": self.base_weights,
                    "normalized_weights": normalized_weights,
                },
                "sub_scores": sub_scores,
                "metadata": {
                    "source_module": "agentic_score.py",
                    "notes": (
                        "Modelo simplificado basado en KPIs agregados. "
                        "Renormaliza los pesos cuando faltan dimensiones."
                    ),
                },
            }
        }

        return result

    def compute_and_return(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Permite calcular el Agentic Readiness directamente desde
        un objeto Python (dict), sin necesidad de carpetas ni archivos.
        """
        return self.compute_from_data(data)

    def run_on_folder(self, folder_path: Union[str, Path]) -> Dict[str, Any]:
        """
        Punto de entrada típico para el pipeline:
        - Lee <folder>/results.json
        - Calcula Agentic Readiness
        - Escribe <folder>/agentic_readiness.json
        - Devuelve el dict con el resultado
        """
        data = self.load_results(folder_path)
        result = self.compute_from_data(data)
        self.save_agentic_readiness(folder_path, result)
        return result


# =========================
# CLI opcional
# =========================

def main(argv: List[str]) -> None:
    if len(argv) < 2:
        print(
            "Uso: python agentic_score.py <carpeta_resultados>\n"
            "La carpeta debe contener un 'results.json'. Se generará un "
            "'agentic_readiness.json' en la misma carpeta.",
            file=sys.stderr,
        )
        sys.exit(1)

    folder = argv[1]
    scorer = AgenticScorer()

    try:
        result = scorer.run_on_folder(folder)
    except Exception as e:
        print(f"Error al procesar la carpeta '{folder}': {e}", file=sys.stderr)
        sys.exit(1)

    # Por comodidad, también mostramos el score final por consola
    ar = result.get("agentic_readiness", {})
    print(json.dumps(result, ensure_ascii=False, indent=2))
    final_score = ar.get("final_score")
    classification = ar.get("classification", {})
    label = classification.get("label")
    emoji = classification.get("emoji")
    if final_score is not None and label:
        print(f"\nAgentic Readiness Score: {final_score} {emoji} ({label})")


if __name__ == "__main__":
    main(sys.argv)
