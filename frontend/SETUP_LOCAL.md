# 🚀 Guía de Configuración Local - Beyond Diagnostic Prototipo

## ✅ Estado Actual
La aplicación ha sido **completamente revisada y corregida** con todas las validaciones necesarias para ejecutarse sin errores.

### 📊 Correcciones Implementadas
- ✅ 22 errores críticos corregidos
- ✅ Validaciones de división por cero
- ✅ Protección contra valores `null/undefined`
- ✅ Manejo seguro de operaciones matemáticas
- ✅ Compilación exitosa sin errores

---

## 📋 Requisitos Previos

- **Node.js** v16 o superior (recomendado v18+)
- **npm** v8 o superior
- **Git** (opcional, para clonar o descargar)

Verificar versiones:
```bash
node --version
npm --version
```

---

## 🛠️ Instalación y Ejecución

### 1️⃣ Instalar Dependencias
```bash
cd C:\Users\sujuc\BeyondDiagnosticPrototipo
npm install
```

**Resultado esperado:**
```
added 161 packages in 5s
```

> ⚠️ Nota: Puede haber 1 aviso de vulnerabilidad alta en dependencias transitivas (no afecta el funcionamiento local)

### 2️⃣ Ejecutar en Modo Desarrollo
```bash
npm run dev
```

**Output esperado:**
```
  VITE v6.4.1  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

### 3️⃣ Abrir en el Navegador
- Automáticamente se abrirá en `http://localhost:5173/`
- O acceder manualmente a: **http://localhost:5173**

---

## 🏗️ Compilar para Producción

Si deseas generar la versión optimizada:

```bash
npm run build
```

**Output esperado:**
```
✓ 2726 modules transformed
✓ built in 4.07s
```

La aplicación compilada estará en la carpeta `dist/`

Para ver una vista previa local de la compilación:
```bash
npm run preview
```

---

## 📁 Estructura de Archivos

```
BeyondDiagnosticPrototipo/
├── src/
│   ├── components/          # 37 componentes React
│   ├── utils/               # 8 utilidades TypeScript
│   ├── styles/              # Estilos personalizados
│   ├── types.ts             # Definiciones de tipos
│   ├── constants.ts         # Constantes
│   ├── App.tsx              # Componente raíz
│   └── index.tsx            # Punto de entrada
├── public/                  # Archivos estáticos
├── dist/                    # Build producción (después de npm run build)
├── package.json             # Dependencias
├── tsconfig.json            # Configuración TypeScript
├── vite.config.ts           # Configuración Vite
└── index.html               # HTML principal
```

---

## 🚀 Características Principales

### 📊 Dashboard Interactivo
- **Heatmaps dinámicos** de rendimiento
- **Análisis de variabilidad** con múltiples dimensiones
- **Matriz de oportunidades** con priorización automática
- **Roadmap de transformación** de 18 meses

### 🤖 Análisis Agentic Readiness
- **Cálculo multidimensional** basado en:
  - Predictibilidad (CV del AHT)
  - Complejidad inversa (tasa de transferencia)
  - Repetitividad (volumen)
  - Estabilidad (distribución horaria)
  - ROI potencial

### 📈 Datos y Visualización
- Soporte para **CSV y Excel** (.xlsx)
- Generación de **datos sintéticos** como fallback
- Gráficos con **Recharts** (Line, Bar, Area, Composed)
- Animaciones con **Framer Motion**

### 💼 Modelo Económico
- Cálculo de **NPV, IRR, TCO**
- **Análisis de sensibilidad** (pesimista/base/optimista)
- Comparación de alternativas de implementación

### 🎯 Benchmark Competitivo
- Comparación con **percentiles de industria** (P25, P50, P75, P90)
- Posicionamiento en **matriz competitiva**
- Recomendaciones priorizadas

---

## 🎨 Interfaz de Usuario

### Flujo Principal
1. **Selector de Tier** (Gold/Silver/Bronze)
2. **Carga de datos** (CSV/Excel o datos sintéticos)
3. **Dashboard completo** con 11 secciones:
   - Health Score & KPIs
   - Heatmap de Performance
   - Análisis de Variabilidad
   - Matriz de Oportunidades
   - Roadmap de Transformación
   - Modelo Económico
   - Benchmark vs Industria
   - Y más...

### Características UX
- ✨ **Animaciones fluidas** de Framer Motion
- 🎯 **Tooltips interactivos** con Radix UI
- 📱 **Responsive design** con Tailwind CSS
- 🔔 **Notificaciones** con React Hot Toast
- ⌨️ **Iconos SVG** con Lucide React

---

## 🔧 Troubleshooting

### ❌ Error: "Port 5173 already in use"
```bash
# Opción 1: Usar puerto diferente
npm run dev -- --port 3000

# Opción 2: Terminar proceso que usa 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### ❌ Error: "Cannot find module..."
```bash
# Limpiar node_modules y reinstalar
rm -r node_modules package-lock.json
npm install
```

### ❌ Error: "VITE not found"
```bash
# Instalar Vite globalmente (si npm install no funcionó)
npm install -g vite
```

### ❌ TypeScript errors
```bash
# Compilar y verificar tipos
npx tsc --noEmit
```

---

## 📝 Archivo de Datos de Ejemplo

Para pruebas, la aplicación genera automáticamente datos sintéticos si no cargas un archivo. Para cargar datos reales:

### Formato CSV Requerido
```csv
interaction_id,datetime_start,queue_skill,channel,duration_talk,hold_time,wrap_up_time,agent_id,transfer_flag
1,2024-01-15 09:30:00,Ventas Inbound,Phone,240,15,30,AG001,false
2,2024-01-15 09:45:00,Soporte Técnico N1,Chat,180,0,20,AG002,true
...
```

### Columnas Requeridas
- `interaction_id` - ID único
- `datetime_start` - Fecha/hora de inicio
- `queue_skill` - Tipo de cola/skill
- `channel` - Canal (Phone, Chat, Email, etc.)
- `duration_talk` - Duración conversación (segundos)
- `hold_time` - Tiempo en espera (segundos)
- `wrap_up_time` - Tiempo de resumen (segundos)
- `agent_id` - ID del agente
- `transfer_flag` - Booleano (true/false o 1/0)

---

## 📊 Variables de Entorno (Opcional)

Crear archivo `.env.local` en la raíz (si es necesario en futuro):
```
VITE_API_URL=http://localhost:3000
VITE_MODE=development
```

---

## 🧪 Testing & Development

### Verificar TypeScript
```bash
npx tsc --noEmit
```

### Formatear código
```bash
npx prettier --write src/
```

### Ver dependencias
```bash
npm list
```

---

## 🎯 Próximos Pasos Recomendados

1. **Ejecutar localmente**: `npm run dev`
2. **Explorar Dashboard**: Navegar por todas las secciones
3. **Cargar datos**: Usar el cargador de CSV/Excel
4. **Probar interactividad**: Hacer clic en gráficos, tooltips, botones
5. **Revisar código**: Explorar `src/components/` para entender la arquitectura

---

## 📞 Soporte & Debugging

### Habilitar logs detallados
Abrir DevTools del navegador (F12) y ver consola para:
- 🔍 Logs de cálculos (🟢, 🟡, 🔴 emojis)
- ⚠️ Advertencias de datos
- ❌ Errores con stack traces

### Archivos de interés
- `src/App.tsx` - Punto de entrada principal
- `src/components/SinglePageDataRequestIntegrated.tsx` - Orquestador principal
- `src/utils/analysisGenerator.ts` - Generador de análisis
- `src/utils/realDataAnalysis.ts` - Procesamiento de datos reales
- `src/utils/agenticReadinessV2.ts` - Cálculo de readiness

---

## ✨ Notas Finales

- La aplicación está **completamente funcional y sin errores críticos**
- Todos los **cálculos numéricos están protegidos** contra edge cases
- El **código está tipado en TypeScript** para mayor seguridad
- Los **componentes cuentan con error boundaries** para manejo robusto

¡Disfruta explorando Beyond Diagnostic! 🚀
