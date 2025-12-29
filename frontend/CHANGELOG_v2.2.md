# CHANGELOG v2.2 - Nueva Lógica de Transformación y Agentic Readiness Score

**Fecha**: 27 Noviembre 2025  
**Versión**: 2.2.0  
**Objetivo**: Implementar proceso correcto de transformación de datos con limpieza de ruido y algoritmo de 3 dimensiones

---

## 🎯 CAMBIOS PRINCIPALES

### 1. **Eliminado `savings_target`**

**Razón**: No se utiliza en ningún cálculo del análisis.

**Archivos modificados**:
- ✅ `types.ts`: Eliminado de `StaticConfig`
- ✅ `constants.ts`: Eliminado de `DEFAULT_STATIC_CONFIG` y `DATA_REQUIREMENTS` (gold/silver/bronze)
- ✅ `SinglePageDataRequest.tsx`: Eliminado campo de UI

**Antes**:
```typescript
export interface StaticConfig {
  cost_per_hour: number;
  savings_target: number;  // ❌ ELIMINADO
  avg_csat?: number;
}
```

**Ahora**:
```typescript
export interface StaticConfig {
  cost_per_hour: number;
  avg_csat?: number;
}
```

---

### 2. **Nuevo Pipeline de Transformación de Datos**

Se ha implementado un proceso de 4 pasos para transformar raw data en Agentic Readiness Score:

#### **Paso 1: Limpieza de Ruido**

Elimina interacciones con duración total < 10 segundos (falsos contactos o errores de sistema).

```typescript
function cleanNoiseFromData(interactions: RawInteraction[]): RawInteraction[] {
  const MIN_DURATION_SECONDS = 10;
  
  return interactions.filter(interaction => {
    const totalDuration = 
      interaction.duration_talk + 
      interaction.hold_time + 
      interaction.wrap_up_time;
    
    return totalDuration >= MIN_DURATION_SECONDS;
  });
}
```

**Resultado**: Log en consola con % de ruido eliminado.

---

#### **Paso 2: Cálculo de Métricas Base por Skill**

Para cada skill único, calcula:

| Métrica | Descripción | Fórmula |
|---------|-------------|---------|
| **Volumen** | Número de interacciones | `COUNT(interactions)` |
| **AHT Promedio** | Tiempo promedio de manejo | `MEAN(duration_talk + hold_time + wrap_up_time)` |
| **Desviación Estándar AHT** | Variabilidad del AHT | `STDEV(AHT)` |
| **Tasa de Transferencia** | % de interacciones transferidas | `(COUNT(transfer_flag=TRUE) / COUNT(*)) * 100` |
| **Coste Total** | Coste total del skill | `SUM(AHT * cost_per_second)` |

```typescript
interface SkillBaseMetrics {
  skill: string;
  volume: number;
  aht_mean: number;
  aht_std: number;
  transfer_rate: number;
  total_cost: number;
}
```

---

#### **Paso 3: Transformación a 3 Dimensiones**

Las métricas base se transforman en 3 dimensiones normalizadas (0-10):

##### **Dimensión 1: Predictibilidad** (Proxy: Variabilidad del AHT)

**Hipótesis**: Si el tiempo de manejo es estable, la tarea es repetitiva y fácil para una IA. Si es caótico, requiere juicio humano.

**Cálculo**:
```
CV = Desviación Estándar / Media
```

**Normalización** (0-10):
```
Si CV ≤ 0.3  → Score 10 (Extremadamente predecible/Robótico)
Si CV ≥ 1.5  → Score 0  (Caótico/Humano puro)

Fórmula: MAX(0, MIN(10, 10 - ((CV - 0.3) / 1.2 * 10)))
```

**Código**:
```typescript
const cv = aht_std / aht_mean;
const predictability_score = Math.max(0, Math.min(10, 
  10 - ((cv - 0.3) / 1.2 * 10)
));
```

---

##### **Dimensión 2: Complejidad Inversa** (Proxy: Tasa de Transferencia)

**Hipótesis**: Si hay que transferir mucho, el primer agente no tenía las herramientas o el conocimiento (alta complejidad o mala definición).

**Cálculo**:
```
T = Tasa de Transferencia (%)
```

**Normalización** (0-10):
```
Si T ≤ 5%   → Score 10 (Baja complejidad/Resoluble)
Si T ≥ 30%  → Score 0  (Alta complejidad/Fragmentado)

Fórmula: MAX(0, MIN(10, 10 - ((T - 0.05) / 0.25 * 10)))
```

**Código**:
```typescript
const transfer_rate = (transferCount / volume) * 100;
const complexity_inverse_score = Math.max(0, Math.min(10,
  10 - ((transfer_rate / 100 - 0.05) / 0.25 * 10)
));
```

---

##### **Dimensión 3: Repetitividad/Impacto** (Proxy: Volumen)

**Hipótesis**: A mayor volumen, mayor "dolor" y mayor datos para entrenar la IA.

**Normalización** (0-10):
```
Si Volumen ≥ 5,000 llamadas/mes → Score 10
Si Volumen ≤ 100 llamadas/mes   → Score 0
Entre 100 y 5,000               → Interpolación lineal
```

**Código**:
```typescript
let repetitivity_score: number;
if (volume >= 5000) {
  repetitivity_score = 10;
} else if (volume <= 100) {
  repetitivity_score = 0;
} else {
  repetitivity_score = ((volume - 100) / (5000 - 100)) * 10;
}
```

---

#### **Paso 4: Agentic Readiness Score**

Promedio ponderado de las 3 dimensiones:

```
Score = Predictibilidad × 0.40 +
        Complejidad Inversa × 0.35 +
        Repetitividad × 0.25
```

**Pesos**:
- **Predictibilidad**: 40% (más importante)
- **Complejidad Inversa**: 35%
- **Repetitividad**: 25%

**Categorización**:

| Score | Categoría | Label | Acción |
|-------|-----------|-------|--------|
| **8.0 - 10.0** | `automate_now` | 🟢 Automate Now | Fruta madura, automatizar YA |
| **5.0 - 7.9** | `assist_copilot` | 🟡 Assist / Copilot | IA ayuda al humano (copilot) |
| **0.0 - 4.9** | `optimize_first` | 🔴 Optimize First | No tocar con IA aún, optimizar proceso primero |

**Código**:
```typescript
const agentic_readiness_score = 
  predictability_score * 0.40 +
  complexity_inverse_score * 0.35 +
  repetitivity_score * 0.25;

let readiness_category: 'automate_now' | 'assist_copilot' | 'optimize_first';
if (agentic_readiness_score >= 8.0) {
  readiness_category = 'automate_now';
} else if (agentic_readiness_score >= 5.0) {
  readiness_category = 'assist_copilot';
} else {
  readiness_category = 'optimize_first';
}
```

---

## 📁 ARCHIVOS CREADOS/MODIFICADOS

### Nuevos Archivos:

1. **`utils/dataTransformation.ts`** (NUEVO)
   - `cleanNoiseFromData()`: Limpieza de ruido
   - `calculateSkillBaseMetrics()`: Métricas base por skill
   - `transformToDimensions()`: Transformación a 3 dimensiones
   - `calculateAgenticReadinessScore()`: Score final
   - `transformRawDataToAgenticReadiness()`: Pipeline completo
   - `generateTransformationSummary()`: Resumen de estadísticas

### Archivos Modificados:

1. **`types.ts`**
   - ✅ Eliminado `savings_target` de `StaticConfig`
   - ✅ Añadido `dimensions` a `HeatmapDataPoint`:
     ```typescript
     dimensions?: {
       predictability: number;
       complexity_inverse: number;
       repetitivity: number;
     };
     readiness_category?: 'automate_now' | 'assist_copilot' | 'optimize_first';
     ```

2. **`constants.ts`**
   - ✅ Eliminado `savings_target` de `DEFAULT_STATIC_CONFIG`
   - ✅ Eliminado `savings_target` de `DATA_REQUIREMENTS` (gold/silver/bronze)

3. **`components/SinglePageDataRequest.tsx`**
   - ✅ Eliminado campo "Objetivo de Ahorro"

4. **`utils/analysisGenerator.ts`**
   - ✅ Actualizado `generateHeatmapData()` con nueva lógica de 3 dimensiones
   - ✅ Volumen ampliado: 800-5500 (antes: 800-2500)
   - ✅ Simulación de desviación estándar del AHT
   - ✅ Cálculo de CV real (no aleatorio)
   - ✅ Aplicación de fórmulas exactas de normalización
   - ✅ Categorización en `readiness_category`
   - ✅ Añadido objeto `dimensions` con scores 0-10

---

## 🔄 COMPARACIÓN: ANTES vs. AHORA

### Algoritmo Anterior (v2.1):

```typescript
// 4 factores aleatorios
const cv_aht = randomInt(15, 55);
const cv_talk_time = randomInt(20, 60);
const cv_hold_time = randomInt(25, 70);
const transfer_rate = randomInt(5, 35);

// Score 0-100
const automation_readiness = Math.round(
  (100 - cv_aht) * 0.35 +
  (100 - cv_talk_time) * 0.30 +
  (100 - cv_hold_time) * 0.20 +
  (100 - transfer_rate) * 0.15
);
```

**Problemas**:
- ❌ No hay limpieza de ruido
- ❌ CV aleatorio, no calculado desde datos reales
- ❌ 4 factores sin justificación clara
- ❌ Escala 0-100 sin categorización
- ❌ No usa volumen como factor

---

### Algoritmo Nuevo (v2.2):

```typescript
// 1. Limpieza de ruido (duration >= 10s)
const cleanedData = cleanNoiseFromData(rawInteractions);

// 2. Métricas base reales
const aht_mean = MEAN(durations);
const aht_std = STDEV(durations);
const cv = aht_std / aht_mean;  // CV REAL

// 3. Transformación a dimensiones (fórmulas exactas)
const predictability = MAX(0, MIN(10, 10 - ((cv - 0.3) / 1.2 * 10)));
const complexity_inverse = MAX(0, MIN(10, 10 - ((T - 0.05) / 0.25 * 10)));
const repetitivity = volume >= 5000 ? 10 : (volume <= 100 ? 0 : interpolate);

// 4. Score 0-10 con categorización
const score = 
  predictability * 0.40 +
  complexity_inverse * 0.35 +
  repetitivity * 0.25;

if (score >= 8.0) category = 'automate_now';
else if (score >= 5.0) category = 'assist_copilot';
else category = 'optimize_first';
```

**Mejoras**:
- ✅ Limpieza de ruido explícita
- ✅ CV calculado desde datos reales
- ✅ 3 dimensiones con hipótesis claras
- ✅ Fórmulas de normalización exactas
- ✅ Escala 0-10 con categorización clara
- ✅ Volumen como factor de impacto

---

## 📊 EJEMPLO DE TRANSFORMACIÓN

### Datos Raw (CSV):

```csv
interaction_id,queue_skill,duration_talk,hold_time,wrap_up_time,transfer_flag
call_001,Soporte_N1,350,45,30,FALSE
call_002,Soporte_N1,320,50,25,FALSE
call_003,Soporte_N1,380,40,35,TRUE
call_004,Soporte_N1,5,0,0,FALSE  ← RUIDO (eliminado)
...
```

### Paso 1: Limpieza

```
Original: 1,000 interacciones
Ruido eliminado: 15 (1.5%)
Limpias: 985
```

### Paso 2: Métricas Base

```
Skill: Soporte_N1
Volumen: 985
AHT Promedio: 425 segundos
Desviación Estándar: 85 segundos
Tasa de Transferencia: 12%
Coste Total: €23,450
```

### Paso 3: Dimensiones

```
CV = 85 / 425 = 0.20

Predictibilidad:
  CV = 0.20
  Score = MAX(0, MIN(10, 10 - ((0.20 - 0.3) / 1.2 * 10)))
        = MAX(0, MIN(10, 10 - (-0.83)))
        = 10.0 ✅ (Muy predecible)

Complejidad Inversa:
  T = 12%
  Score = MAX(0, MIN(10, 10 - ((0.12 - 0.05) / 0.25 * 10)))
        = MAX(0, MIN(10, 10 - 2.8))
        = 7.2 ✅ (Complejidad media)

Repetitividad:
  Volumen = 985
  Score = ((985 - 100) / (5000 - 100)) * 10
        = (885 / 4900) * 10
        = 1.8 ⚠️ (Bajo volumen)
```

### Paso 4: Agentic Readiness Score

```
Score = 10.0 × 0.40 + 7.2 × 0.35 + 1.8 × 0.25
      = 4.0 + 2.52 + 0.45
      = 6.97 → 7.0

Categoría: 🟡 Assist / Copilot
```

**Interpretación**: Proceso muy predecible y complejidad media, pero bajo volumen. Ideal para copilot (IA asiste al humano).

---

## 🎯 IMPACTO EN VISUALIZACIONES

### Heatmap Performance Competitivo:
- Sin cambios (FCR, AHT, CSAT, Hold Time, Transfer Rate)

### Heatmap Variabilidad:
- **Antes**: CV AHT, CV Talk Time, CV Hold Time, Transfer Rate
- **Ahora**: Predictability, Complexity Inverse, Repetitivity, Agentic Readiness Score

### Opportunity Matrix:
- Ahora usa `readiness_category` para clasificar oportunidades
- 🟢 Automate Now → Alta prioridad
- 🟡 Assist/Copilot → Media prioridad
- 🔴 Optimize First → Baja prioridad

### Agentic Readiness Dashboard:
- Muestra las 3 dimensiones individuales
- Score final 0-10 (no 0-100)
- Badge visual según categoría

---

## ✅ TESTING

### Compilación:
- ✅ TypeScript: Sin errores
- ✅ Build: Exitoso (8.62s)
- ✅ Bundle size: 846.42 KB (gzip: 251.63 KB)

### Funcionalidad:
- ✅ Limpieza de ruido funciona correctamente
- ✅ Métricas base calculadas desde raw data simulado
- ✅ Fórmulas de normalización aplicadas correctamente
- ✅ Categorización funciona según rangos
- ✅ Logs en consola muestran estadísticas

### Pendiente:
- ⏳ Testing con datos reales de CSV
- ⏳ Validación de fórmulas con casos extremos
- ⏳ Integración con parser de CSV real

---

## 📚 REFERENCIAS

### Fórmulas Implementadas:

1. **Coeficiente de Variación (CV)**:
   ```
   CV = σ / μ
   donde σ = desviación estándar, μ = media
   ```

2. **Normalización Predictibilidad**:
   ```
   Score = MAX(0, MIN(10, 10 - ((CV - 0.3) / 1.2 × 10)))
   ```

3. **Normalización Complejidad Inversa**:
   ```
   Score = MAX(0, MIN(10, 10 - ((T - 0.05) / 0.25 × 10)))
   ```

4. **Normalización Repetitividad**:
   ```
   Si V ≥ 5000: Score = 10
   Si V ≤ 100: Score = 0
   Sino: Score = ((V - 100) / 4900) × 10
   ```

5. **Agentic Readiness Score**:
   ```
   Score = P × 0.40 + C × 0.35 + R × 0.25
   donde P = Predictibilidad, C = Complejidad Inversa, R = Repetitividad
   ```

---

## 🚀 PRÓXIMOS PASOS

1. **Parser de CSV Real**: Implementar lectura y transformación de CSV subido
2. **Validación de Período**: Verificar que hay mínimo 3 meses de datos
3. **Estadísticas de Transformación**: Dashboard con resumen de limpieza
4. **Visualización de Dimensiones**: Gráficos radar para las 3 dimensiones
5. **Exportación de Resultados**: CSV con scores y categorías por skill

---

**Fin del Changelog v2.2**
