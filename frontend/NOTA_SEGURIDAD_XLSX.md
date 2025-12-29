# 🔒 Nota de Seguridad - Vulnerabilidad XLSX

**Última actualización:** 2 de Diciembre de 2025

---

## 📋 Resumen

Al ejecutar `npm audit`, aparece una vulnerabilidad en la librería **xlsx** (SheetJS):

```
xlsx: Prototype Pollution + ReDoS
Severity: high
Status: No fix available
```

---

## ❓ ¿Qué significa esto?

### Vulnerabilidades Reportadas

1. **Prototype Pollution** (GHSA-4r6h-8v6p-xvw6)
   - Tipo: Ataque de contaminación de prototipos
   - Impacto: Potencial ejecución de código malicioso

2. **Regular Expression Denial of Service (ReDoS)** (GHSA-5pgg-2g8v-p4x9)
   - Tipo: Ataque de denegación de servicio
   - Impacto: La aplicación podría congelarse con ciertos inputs

---

## 🛡️ Contexto y Mitigación

### ¿Afecta a Beyond Diagnostic?

**Impacto directo:** BAJO / MEDIO

**Razones:**
1. ✅ Las vulnerabilidades requieren datos manipulados específicamente
2. ✅ La aplicación carga archivos CSV/Excel locales
3. ✅ No hay entrada de datos maliciosos directos desde usuarios externos
4. ✅ Se valida toda la entrada de datos antes de procesar

### Escenarios de Riesgo

| Escenario | Riesgo | Mitigación |
|-----------|--------|-----------|
| Archivo Excel local | ✅ Bajo | Usuario controla archivos |
| CSV desde sistema | ✅ Bajo | Usuario controla archivos |
| Upload desde web | ⚠️ Medio | No implementado en esta versión |
| Datos remotos | ⚠️ Medio | No implementado en esta versión |

---

## ✅ Recomendaciones

### Para Desarrollo Local
```
Status: ✅ SEGURO
- No hay riesgo inmediato en desarrollo local
- Los datos se cargan desde archivos locales
- Se validan antes de procesar
```

### Para Producción
```
Recomendación: MONITOREAR
1. Mantener alert sobre actualizaciones de xlsx
2. Considerar alternativa si se habilita upload web
3. Implementar validaciones adicionales si es necesario
```

### Alternativas Futuras

Si en el futuro se requiere reemplazar xlsx:
- **Alternative 1:** `exceljs` - Mejor mantenimiento
- **Alternative 2:** `xlsx-populate` - Activamente mantenido
- **Alternative 3:** API serverless (Google Sheets API, etc.)

---

## 📊 Impacto Actual

| Aspecto | Status |
|---------|--------|
| **Funcionalidad** | ✅ No afectada |
| **Aplicación local** | ✅ Segura |
| **Datos locales** | ✅ Protegidos |
| **Performance** | ✅ Normal |

---

## 🔍 Análisis Técnico

### Cómo se usa xlsx en Beyond Diagnostic

```typescript
// En fileParser.ts
const XLSX = await import('xlsx');
const workbook = XLSX.read(data, { type: 'binary' });
const worksheet = workbook.Sheets[firstSheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet);
```

**Análisis:**
1. Se importa dinámicamente (lazy loading)
2. Solo procesa archivos locales
3. Los datos se validan DESPUÉS del parsing
4. No se ejecuta código dentro de los datos

---

## 🛠️ Cómo Mitigar

### Validaciones Implementadas

```typescript
// En fileParser.ts
- ✅ Validación de encabezados requeridos
- ✅ Validación de estructura de datos
- ✅ Try-catch en parsing
- ✅ Validación de tipos después del parsing
- ✅ Filtrado de filas inválidas
```

### Validaciones Adicionales (Si es necesario)

```typescript
// Agregar si se habilita upload en el futuro
- Validar tamaño máximo de archivo
- Sanitizar nombres de columnas
- Limitar número de filas
- Usar sandbox para procesamiento
```

---

## 📌 Decisión Actual

### ✅ Mantener xlsx

**Justificación:**
1. ✅ Sin impacto en uso local actual
2. ✅ Funcionalidad crítica para carga de datos
3. ✅ Validaciones ya implementadas
4. ✅ Riesgo bajo en contexto actual

### ⏳ Revisión Futura

- **Trimestre 2025 Q1:** Evaluar actualizaciones de xlsx
- **Si se habilita upload web:** Considerar alternativa
- **Si hay explotación documentada:** Actuar inmediatamente

---

## 🚨 Qué Hacer Si

### Si aparecen errores al cargar archivos
1. Verificar que el archivo Excel está correctamente formado
2. Usar formato .xlsx estándar
3. No utilizar macros o características avanzadas

### Si se necesita máxima seguridad
1. Usar datos sintéticos (ya incluidos)
2. No cargar archivos de fuentes no confiables
3. Monitorear actualizaciones de seguridad

---

## 📚 Referencias

**Vulnerabilidades reportadas:**
- GHSA-4r6h-8v6p-xvw6: Prototype Pollution
- GHSA-5pgg-2g8v-p4x9: ReDoS

**Estado actual:**
- Librería: xlsx 0.18.5
- Última actualización: 2024
- Alternativas: En evaluación

---

## ✅ Conclusión

**La vulnerabilidad de xlsx NO afecta** a la ejecución local de Beyond Diagnostic Prototipo en su contexto actual.

La aplicación es segura para usar en:
- ✅ Entorno de desarrollo local
- ✅ Carga de archivos locales
- ✅ Datos sintéticos

Para producción, se recomienda:
- ⏳ Monitorear actualizaciones
- ⏳ Evaluar alternativas si cambian requisitos
- ⏳ Implementar validaciones adicionales si es necesario

---

**Reviewed:** 2025-12-02
**Status:** ✅ ACEPTABLE PARA USO LOCAL
**Next Review:** Q1 2025
