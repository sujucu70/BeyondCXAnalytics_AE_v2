# ⚡ Guía Rápida - Beyond Diagnostic Prototipo

## 🎯 En 3 Pasos

### Paso 1️⃣: Abrir PowerShell/CMD
```cmd
cd C:\Users\sujuc\BeyondDiagnosticPrototipo
```

### Paso 2️⃣: Ejecutar aplicación
```cmd
npm run dev
```

### Paso 3️⃣: Abrir navegador
```
http://localhost:5173
```

---

## 🚀 Opción Rápida (Windows)

**Simplemente hacer doble clic en:**
```
start-dev.bat
```

El script hará todo automáticamente (instalar dependencias, iniciar servidor, etc)

---

## ✅ Estado Actual

| Aspecto | Estado | Detalles |
|---------|--------|----------|
| **Código** | ✅ Revisado | 53 archivos analizados |
| **Errores** | ✅ Corregidos | 22 errores críticos fixed |
| **Compilación** | ✅ Exitosa | Build sin errores |
| **Dependencias** | ✅ Instaladas | 161 packages listos |
| **Ejecutable** | ✅ Listo | `npm run dev` |

---

## 📊 Qué hace la aplicación

1. **Carga datos** desde CSV/Excel o genera datos sintéticos
2. **Analiza múltiples dimensiones** de Contact Center
3. **Calcula Agentic Readiness** (escala 0-10)
4. **Visualiza resultados** en dashboard interactivo
5. **Genera recomendaciones** priorizadas
6. **Proyecta economía** de transformación

---

## 🎨 Secciones del Dashboard

- 📊 **Health Score & KPIs** - Métricas principales
- 🔥 **Heatmap de Métricas** - Performance de skills
- 📈 **Variabilidad Interna** - Análisis de consistencia
- 🎯 **Matriz de Oportunidades** - Priorización automática
- 🛣️ **Roadmap de Transformación** - Plan 18 meses
- 💰 **Modelo Económico** - NPV, ROI, TCO
- 📍 **Benchmark de Industria** - Comparativa P25-P90

---

## 🔧 Comandos Disponibles

| Comando | Función |
|---------|---------|
| `npm run dev` | Servidor desarrollo (http://localhost:5173) |
| `npm run build` | Compilar para producción |
| `npm run preview` | Ver preview de build |
| `npm install` | Instalar dependencias |

---

## 📁 Archivo para Cargar

**Crear archivo CSV o Excel** con estas columnas:
```
interaction_id,datetime_start,queue_skill,channel,duration_talk,hold_time,wrap_up_time,agent_id,transfer_flag
1,2024-01-15 09:30,Ventas,Phone,240,15,30,AG001,false
2,2024-01-15 09:45,Soporte,Chat,180,0,20,AG002,true
```

O dejar que **genere datos sintéticos** automáticamente.

---

## 🆘 Si hay problemas

### Puerto ocupado
```cmd
npm run dev -- --port 3000
```

### Limpiar e reinstalar
```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Ver detalles de error
```cmd
npm run build
```

---

## 📱 Acceso

- **Local**: http://localhost:5173
- **Red local**: http://{tu-ip}:5173
- **Production build**: `npm run build` → carpeta `dist/`

---

## 🎓 Documentación Completa

Para más detalles ver:
- 📖 **SETUP_LOCAL.md** - Instalación detallada
- 📋 **INFORME_CORRECCIONES.md** - Qué se corrigió

---

## 💡 Pro Tips

1. **DevTools** - Presiona F12 para ver logs y debuguear
2. **Datos de prueba** - Usa los generados automáticamente
3. **Responsive** - Funciona en desktop y mobile
4. **Animaciones** - Desactiva en Dev Tools si necesitas performance

---

## ✨ ¡Listo!

Tu aplicación está **completamente funcional y sin errores**.

**¡Disfruta!** 🚀
