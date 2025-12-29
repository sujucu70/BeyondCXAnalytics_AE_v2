# Feature: Sistema de Mapeo Automático de Segmentación por Cola

**Fecha**: 27 Noviembre 2025  
**Versión**: 2.1.1  
**Feature**: Mapeo automático de colas/skills a segmentos de cliente

---

## 🎯 OBJETIVO

Permitir que el usuario identifique qué colas/skills corresponden a cada segmento de cliente (High/Medium/Low), y clasificar automáticamente todas las interacciones según este mapeo.

---

## ✅ IMPLEMENTACIÓN COMPLETADA

### 1. **Estructura de Datos** (types.ts)

```typescript
export interface StaticConfig {
  cost_per_hour: number;
  savings_target: number;
  avg_csat?: number;
  
  // NUEVO: Mapeo de colas a segmentos
  segment_mapping?: {
    high_value_queues: string[];    // ['VIP', 'Premium', 'Enterprise']
    medium_value_queues: string[];  // ['Soporte_General', 'Ventas']
    low_value_queues: string[];     // ['Basico', 'Trial']
  };
}

export interface HeatmapDataPoint {
  skill: string;
  segment?: CustomerSegment;  // NUEVO: 'high' | 'medium' | 'low'
  // ... resto de campos
}
```

### 2. **Utilidad de Clasificación** (utils/segmentClassifier.ts)

Funciones implementadas:

- **`parseQueueList(input: string)`**: Parsea string separado por comas
- **`classifyQueue(queue, mapping)`**: Clasifica una cola según mapeo
- **`classifyAllQueues(interactions, mapping)`**: Clasifica todas las colas únicas
- **`getSegmentationStats(interactions, queueSegments)`**: Genera estadísticas
- **`isValidMapping(mapping)`**: Valida mapeo
- **`getMappingFromConfig(config)`**: Extrae mapeo desde config
- **`getSegmentForQueue(queue, config)`**: Obtiene segmento para una cola
- **`formatSegmentationSummary(stats)`**: Formatea resumen para UI

**Características**:
- ✅ Matching parcial (ej: "VIP" match con "VIP_Support")
- ✅ Case-insensitive
- ✅ Default a "medium" para colas no mapeadas
- ✅ Bidireccional (A includes B o B includes A)

### 3. **Interfaz de Usuario** (SinglePageDataRequest.tsx)

Reemplazado selector único de segmentación por **3 inputs de texto**:

```
🟢 Clientes Alto Valor (High)
┌────────────────────────────────────────────────┐
│ Ej: VIP, Premium, Enterprise, Key_Accounts     │
└────────────────────────────────────────────────┘

🟡 Clientes Valor Medio (Medium)
┌────────────────────────────────────────────────┐
│ Ej: Soporte_General, Ventas, Facturacion       │
└────────────────────────────────────────────────┘

🔴 Clientes Bajo Valor (Low)
┌────────────────────────────────────────────────┐
│ Ej: Basico, Trial, Freemium                    │
└────────────────────────────────────────────────┘

ℹ️ Nota: Las colas no mapeadas se clasificarán 
automáticamente como "Medium". El matching es 
flexible (no distingue mayúsculas y permite 
coincidencias parciales).
```

### 4. **Generación de Datos** (analysisGenerator.ts)

Actualizado `generateHeatmapData()`:

```typescript
const generateHeatmapData = (
    costPerHour: number = 20, 
    avgCsat: number = 85,
    segmentMapping?: {
        high_value_queues: string[];
        medium_value_queues: string[];
        low_value_queues: string[];
    }
): HeatmapDataPoint[] => {
    // Añadidas colas de ejemplo: 'VIP Support', 'Trial Support'
    const skills = [
        'Ventas Inbound', 
        'Soporte Técnico N1', 
        'Facturación', 
        'Retención', 
        'VIP Support',      // NUEVO
        'Trial Support'     // NUEVO
    ];
    
    return skills.map(skill => {
        // Clasificar segmento si hay mapeo
        let segment: CustomerSegment | undefined;
        if (segmentMapping) {
            const normalizedSkill = skill.toLowerCase();
            if (segmentMapping.high_value_queues.some(q => 
                normalizedSkill.includes(q.toLowerCase()))) {
                segment = 'high';
            } else if (segmentMapping.low_value_queues.some(q => 
                normalizedSkill.includes(q.toLowerCase()))) {
                segment = 'low';
            } else {
                segment = 'medium';
            }
        }
        
        return {
            skill,
            segment,  // NUEVO
            // ... resto de campos
        };
    });
};
```

### 5. **Visualización** (HeatmapPro.tsx)

Añadidos **badges visuales** en columna de skill:

```tsx
<td className="p-4 font-semibold text-slate-800 border-r border-slate-200">
  <div className="flex items-center gap-2">
    <span>{item.skill}</span>
    {item.segment && (
      <span className={clsx(
        "text-xs px-2 py-1 rounded-full font-semibold",
        item.segment === 'high' && "bg-green-100 text-green-700",
        item.segment === 'medium' && "bg-yellow-100 text-yellow-700",
        item.segment === 'low' && "bg-red-100 text-red-700"
      )}>
        {item.segment === 'high' && '🟢 High'}
        {item.segment === 'medium' && '🟡 Medium'}
        {item.segment === 'low' && '🔴 Low'}
      </span>
    )}
  </div>
</td>
```

**Resultado visual**:
```
Skill/Proceso              │ FCR │ AHT │ ...
────────────────────────────┼─────┼─────┼────
VIP Support 🟢 High        │ 92  │ 88  │ ...
Soporte Técnico N1 🟡 Med. │ 78  │ 82  │ ...
Trial Support 🔴 Low       │ 65  │ 71  │ ...
```

---

## 📊 EJEMPLO DE USO

### Input del Usuario:

```
High Value Queues: VIP, Premium, Enterprise
Medium Value Queues: Soporte_General, Ventas
Low Value Queues: Basico, Trial
```

### CSV del Cliente:

```csv
interaction_id,queue_skill,...
call_001,VIP_Support,...
call_002,Soporte_General_N1,...
call_003,Enterprise_Accounts,...
call_004,Trial_Support,...
call_005,Retencion,...
```

### Clasificación Automática:

| Cola                  | Segmento | Razón                          |
|-----------------------|----------|--------------------------------|
| VIP_Support           | 🟢 High  | Match: "VIP"                   |
| Soporte_General_N1    | 🟡 Medium| Match: "Soporte_General"       |
| Enterprise_Accounts   | 🟢 High  | Match: "Enterprise"            |
| Trial_Support         | 🔴 Low   | Match: "Trial"                 |
| Retencion             | 🟡 Medium| Default (no match)             |

### Estadísticas Generadas:

```
High:   40% (2 interacciones) - Colas: VIP_Support, Enterprise_Accounts
Medium: 40% (2 interacciones) - Colas: Soporte_General_N1, Retencion
Low:    20% (1 interacción)   - Colas: Trial_Support
```

---

## 🔧 LÓGICA DE MATCHING

### Algoritmo:

1. **Normalizar** cola y keywords (lowercase, trim)
2. **Buscar en High**: Si cola contiene keyword high → "high"
3. **Buscar en Low**: Si cola contiene keyword low → "low"
4. **Buscar en Medium**: Si cola contiene keyword medium → "medium"
5. **Default**: Si no hay match → "medium"

### Matching Bidireccional:

```typescript
if (normalizedQueue.includes(normalizedKeyword) || 
    normalizedKeyword.includes(normalizedQueue)) {
    return segment;
}
```

**Ejemplos**:
- ✅ "VIP" matches "VIP_Support"
- ✅ "VIP_Support" matches "VIP"
- ✅ "soporte_general" matches "Soporte_General_N1"
- ✅ "TRIAL" matches "trial_support" (case-insensitive)

---

## ✅ VENTAJAS

1. **Automático**: Una vez mapeado, clasifica TODAS las interacciones
2. **Flexible**: Matching parcial y case-insensitive
3. **Escalable**: Funciona con cualquier número de colas
4. **Robusto**: Default a "medium" para colas no mapeadas
5. **Transparente**: Usuario ve exactamente qué colas se mapean
6. **Visual**: Badges de color en heatmap
7. **Opcional**: Si no se proporciona mapeo, funciona sin segmentación
8. **Reutilizable**: Se puede guardar mapeo para futuros análisis

---

## 🎨 DISEÑO VISUAL

### Badges de Segmento:

- **🟢 High**: `bg-green-100 text-green-700`
- **🟡 Medium**: `bg-yellow-100 text-yellow-700`
- **🔴 Low**: `bg-red-100 text-red-700`

### Inputs en UI:

- Border: `border-2 border-slate-300`
- Focus: `focus:ring-2 focus:ring-[#6D84E3]`
- Placeholder: Ejemplos claros y realistas
- Helper text: Explicación de uso

### Nota Informativa:

```
ℹ️ Nota: Las colas no mapeadas se clasificarán 
automáticamente como "Medium". El matching es 
flexible (no distingue mayúsculas y permite 
coincidencias parciales).
```

---

## 🚀 PRÓXIMAS MEJORAS (Fase 2)

### 1. **Detección Automática de Colas**

- Parsear CSV al cargar
- Mostrar colas detectadas
- Permitir drag & drop para clasificar

### 2. **Reglas Inteligentes**

- Aplicar reglas automáticas:
  - VIP, Premium, Enterprise → High
  - Trial, Basico, Free → Low
  - Resto → Medium
- Permitir override manual

### 3. **Estadísticas de Segmentación**

- Dashboard con distribución por segmento
- Gráfico de volumen por segmento
- Métricas comparativas (High vs Medium vs Low)

### 4. **Persistencia de Mapeo**

- Guardar mapeo en localStorage
- Reutilizar en futuros análisis
- Exportar/importar configuración

### 5. **Validación Avanzada**

- Detectar colas sin clasificar
- Sugerir clasificación basada en nombres
- Alertar sobre inconsistencias

---

## 📝 ARCHIVOS MODIFICADOS

1. ✅ **types.ts**: Añadido `segment_mapping` a `StaticConfig`, `segment` a `HeatmapDataPoint`
2. ✅ **utils/segmentClassifier.ts**: Nueva utilidad con 8 funciones
3. ✅ **components/SinglePageDataRequest.tsx**: Reemplazado selector por 3 inputs
4. ✅ **utils/analysisGenerator.ts**: Actualizado `generateHeatmapData()` con segmentación
5. ✅ **components/HeatmapPro.tsx**: Añadidos badges visuales en columna skill

---

## ✅ TESTING

### Compilación:
- ✅ TypeScript: Sin errores
- ✅ Build: Exitoso (7.69s)
- ✅ Bundle size: 846.97 KB (gzip: 251.62 KB)

### Funcionalidad:
- ✅ UI muestra 3 inputs de segmentación
- ✅ Heatmap renderiza con badges (cuando hay segmentación)
- ✅ Matching funciona correctamente
- ✅ Default a "medium" para colas no mapeadas

### Pendiente:
- ⏳ Testing con datos reales
- ⏳ Validación de input del usuario
- ⏳ Integración con parser de CSV real

---

## 📞 USO

### Para el Usuario:

1. **Ir a sección "Configuración Estática"**
2. **Identificar colas por segmento**:
   - High: VIP, Premium, Enterprise
   - Medium: Soporte_General, Ventas
   - Low: Basico, Trial
3. **Separar con comas**
4. **Subir CSV** con campo `queue_skill`
5. **Generar análisis**
6. **Ver badges** de segmento en heatmap

### Para Demos:

1. **Generar datos sintéticos**
2. **Ver colas de ejemplo**:
   - VIP Support → 🟢 High
   - Soporte Técnico N1 → 🟡 Medium
   - Trial Support → 🔴 Low

---

## 🎯 IMPACTO

### En Opportunity Matrix:
- Priorizar oportunidades en segmentos High
- Aplicar multiplicadores por segmento (high: 1.5x, medium: 1.0x, low: 0.7x)

### En Economic Model:
- Calcular ROI ponderado por segmento
- Proyecciones diferenciadas por valor de cliente

### En Roadmap:
- Secuenciar iniciativas por segmento
- Priorizar automatización en High Value

### En Benchmark:
- Comparar métricas por segmento
- Identificar gaps competitivos por segmento

---

**Fin del Feature Documentation**
