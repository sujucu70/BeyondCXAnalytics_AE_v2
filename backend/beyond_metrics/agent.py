from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Sequence

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

from openai import OpenAI


DEFAULT_SYSTEM_PROMPT = (
    "Eres un consultor experto en contact centers. "
    "Vas a recibir resultados analíticos de un sistema de métricas "
    "(BeyondMetrics) en formato JSON. Tu tarea es generar un informe claro, "
    "accionable y orientado a negocio, destacando los principales hallazgos, "
    "riesgos y oportunidades de mejora."
)


@dataclass
class ReportAgentConfig:
    """
    Configuración básica del agente de informes.

    openai_api_key:
      Se puede pasar explícitamente o leer de la variable de entorno OPENAI_API_KEY.
    model:
      Modelo de ChatGPT a utilizar, p.ej. 'gpt-4.1-mini' o similar.
    system_prompt:
      Prompt de sistema para controlar el estilo del informe.
    """

    openai_api_key: Optional[str] = None
    model: str = "gpt-4.1-mini"
    system_prompt: str = DEFAULT_SYSTEM_PROMPT


class BeyondMetricsReportAgent:
    """
    Agente muy sencillo que:

    1) Lee el JSON de resultados de una ejecución de BeyondMetrics.
    2) Construye un prompt con esos resultados.
    3) Llama a ChatGPT para generar un informe en texto.
    4) Guarda el informe en un PDF en disco, EMBEBIENDO las imágenes PNG
       generadas por el pipeline como anexos.

    MVP: centrado en texto + figuras incrustadas.
    """

    def __init__(self, config: Optional[ReportAgentConfig] = None) -> None:
        self.config = config or ReportAgentConfig()

        api_key = self.config.openai_api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "Falta la API key de OpenAI. "
                "Pásala en ReportAgentConfig(openai_api_key=...) o "
                "define la variable de entorno OPENAI_API_KEY."
            )

        # Cliente de la nueva API de OpenAI
        self._client = OpenAI(api_key=api_key)

    # ------------------------------------------------------------------
    # API pública principal
    # ------------------------------------------------------------------
    def generate_pdf_report(
        self,
        run_base: str,
        output_pdf_path: Optional[str] = None,
        extra_user_prompt: str = "",
    ) -> str:
        """
        Genera un informe en PDF a partir de una carpeta de resultados.

        Parámetros:
        - run_base:
            Carpeta base de la ejecución. Debe contener al menos 'results.json'
            y, opcionalmente, imágenes PNG generadas por el pipeline.
        - output_pdf_path:
            Ruta completa del PDF de salida. Si es None, se crea
            'beyondmetrics_report.pdf' dentro de run_base.
        - extra_user_prompt:
            Texto adicional para afinar la petición al agente
            (p.ej. "enfatiza eficiencia y SLA", etc.)

        Devuelve:
        - La ruta del PDF generado.
        """
        run_dir = Path(run_base)
        results_json = run_dir / "results.json"
        if not results_json.exists():
            raise FileNotFoundError(
                f"No se ha encontrado {results_json}. "
                "Asegúrate de ejecutar primero el pipeline."
            )

        # 1) Leer JSON de resultados
        with results_json.open("r", encoding="utf-8") as f:
            results_data: Dict[str, Any] = json.load(f)

        # 2) Buscar imágenes generadas
        image_files = sorted(p for p in run_dir.glob("*.png"))

        # 3) Construir prompt de usuario
        user_prompt = self._build_user_prompt(
            results=results_data,
            image_files=[p.name for p in image_files],
            extra_user_prompt=extra_user_prompt,
        )

        # 4) Llamar a ChatGPT para obtener el texto del informe
        report_text = self._call_chatgpt(user_prompt)

        # 5) Crear PDF con texto + imágenes embebidas
        if output_pdf_path is None:
            output_pdf_path = str(run_dir / "beyondmetrics_report.pdf")

        self._write_pdf(output_pdf_path, report_text, image_files)

        return output_pdf_path

    # ------------------------------------------------------------------
    # Construcción del prompt
    # ------------------------------------------------------------------
    def _build_user_prompt(
        self,
        results: Dict[str, Any],
        image_files: Sequence[str],
        extra_user_prompt: str = "",
    ) -> str:
        """
        Construye el mensaje de usuario que se enviará al modelo.
        Para un MVP, serializamos el JSON de resultados entero.
        Más adelante se puede resumir si el JSON crece demasiado.
        """
        results_str = json.dumps(results, indent=2, ensure_ascii=False)

        images_section = (
            "Imágenes generadas en la ejecución:\n"
            + "\n".join(f"- {name}" for name in image_files)
            if image_files
            else "No se han generado imágenes en esta ejecución."
        )

        extra = (
            f"\n\nInstrucciones adicionales del usuario:\n{extra_user_prompt}"
            if extra_user_prompt
            else ""
        )

        prompt = (
            "A continuación te proporciono los resultados de una ejecución de BeyondMetrics "
            "en formato JSON. Debes elaborar un INFORME EJECUTIVO para un cliente de "
            "contact center. El informe debe incluir:\n"
            "- Resumen ejecutivo en lenguaje de negocio.\n"
            "- Principales hallazgos por dimensión.\n"
            "- Riesgos o problemas detectados.\n"
            "- Recomendaciones accionables.\n\n"
            "Resultados (JSON):\n"
            f"{results_str}\n\n"
            f"{images_section}"
            f"{extra}"
        )

        return prompt

    # ------------------------------------------------------------------
    # Llamada a ChatGPT (nueva API)
    # ------------------------------------------------------------------
    def _call_chatgpt(self, user_prompt: str) -> str:
        """
        Llama al modelo de ChatGPT y devuelve el contenido del mensaje de respuesta.
        Implementado con la nueva API de OpenAI.
        """
        resp = self._client.chat.completions.create(
            model=self.config.model,
            messages=[
                {"role": "system", "content": self.config.system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )

        content = resp.choices[0].message.content
        if not isinstance(content, str):
            raise RuntimeError("La respuesta del modelo no contiene texto.")
        return content

    # ------------------------------------------------------------------
    # Escritura de PDF (texto + imágenes)
    # ------------------------------------------------------------------
    def _write_pdf(
        self,
        output_path: str,
        text: str,
        image_paths: Sequence[Path],
    ) -> None:
        """
        Crea un PDF A4 con:

        1) Texto del informe (páginas iniciales).
        2) Una sección de anexos donde se incrustan las imágenes PNG
           generadas por el pipeline, escaladas para encajar en la página.
        """
        output_path = str(output_path)
        c = canvas.Canvas(output_path, pagesize=A4)
        width, height = A4

        margin_x = 50
        margin_y = 50
        max_width = width - 2 * margin_x
        line_height = 14

        c.setFont("Helvetica", 11)

        # --- Escribir texto principal ---
        def _wrap_line(line: str, max_chars: int = 100) -> list[str]:
            parts: list[str] = []
            current: list[str] = []
            count = 0
            for word in line.split():
                if count + len(word) + 1 > max_chars:
                    parts.append(" ".join(current))
                    current = [word]
                    count = len(word) + 1
                else:
                    current.append(word)
                    count += len(word) + 1
            if current:
                parts.append(" ".join(current))
            return parts

        y = height - margin_y
        for raw_line in text.splitlines():
            wrapped_lines = _wrap_line(raw_line)
            for line in wrapped_lines:
                if y < margin_y:
                    c.showPage()
                    c.setFont("Helvetica", 11)
                    y = height - margin_y
                c.drawString(margin_x, y, line)
                y -= line_height

        # --- Anexar imágenes como figuras ---
        if image_paths:
            # Nueva página para las figuras
            c.showPage()
            c.setFont("Helvetica-Bold", 14)
            c.drawString(margin_x, height - margin_y, "Anexo: Figuras")
            c.setFont("Helvetica", 11)

            current_y = height - margin_y - 2 * line_height

            for img_path in image_paths:
                # Si no cabe la imagen en la página, pasamos a la siguiente
                available_height = current_y - margin_y
                if available_height < 100:  # espacio mínimo
                    c.showPage()
                    c.setFont("Helvetica-Bold", 14)
                    c.drawString(margin_x, height - margin_y, "Anexo: Figuras (cont.)")
                    c.setFont("Helvetica", 11)
                    current_y = height - margin_y - 2 * line_height
                    available_height = current_y - margin_y

                # Título de la figura
                title = f"Figura: {img_path.name}"
                c.drawString(margin_x, current_y, title)
                current_y -= line_height

                # Cargar imagen y escalarla
                try:
                    img = ImageReader(str(img_path))
                    iw, ih = img.getSize()
                    # Escala para encajar en ancho y alto disponibles
                    max_img_height = available_height - 2 * line_height
                    scale = min(max_width / iw, max_img_height / ih)
                    if scale <= 0:
                        scale = 1.0  # fallback

                    draw_w = iw * scale
                    draw_h = ih * scale

                    x = margin_x
                    y_img = current_y - draw_h

                    c.drawImage(
                        img,
                        x,
                        y_img,
                        width=draw_w,
                        height=draw_h,
                        preserveAspectRatio=True,
                        mask="auto",
                    )

                    current_y = y_img - 2 * line_height
                except Exception as e:
                    # Si falla la carga, lo indicamos en el PDF
                    err_msg = f"No se pudo cargar la imagen {img_path.name}: {e}"
                    c.drawString(margin_x, current_y, err_msg)
                    current_y -= 2 * line_height

        c.save()
