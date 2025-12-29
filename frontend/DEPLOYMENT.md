# Guía de Deployment en Render

## ✅ Estado Actual

Los cambios ya están subidos a GitHub en el repositorio: `sujucu70/BeyondDiagnosticPrototipo`

## 🚀 Cómo Desplegar en Render

### Opción 1: Desde la Interfaz Web de Render (Recomendado)

1. **Accede a Render**
   - Ve a https://render.com
   - Inicia sesión con tu cuenta

2. **Crear Nuevo Static Site**
   - Click en "New +" → "Static Site"
   - Conecta tu repositorio de GitHub: `sujucu70/BeyondDiagnosticPrototipo`
   - Autoriza el acceso si es necesario

3. **Configurar el Deployment**
   ```
   Name: beyond-diagnostic-prototipo
   Branch: main
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```

4. **Variables de Entorno** (si necesitas)
   - No son necesarias para este proyecto

5. **Deploy**
   - Click en "Create Static Site"
   - Render automáticamente construirá y desplegará tu aplicación
   - Espera 2-3 minutos

6. **Acceder a tu App**
   - Render te dará una URL como: `https://beyond-diagnostic-prototipo.onrender.com`
   - ¡Listo! Ya puedes ver tus mejoras en vivo

### Opción 2: Auto-Deploy desde GitHub

Si ya tienes un sitio en Render conectado:

1. **Render detectará automáticamente** el nuevo commit
2. **Iniciará el build** automáticamente
3. **Desplegará** la nueva versión en 2-3 minutos

### Opción 3: Manual Deploy

Si prefieres control manual:

1. En tu Static Site en Render
2. Ve a "Settings" → "Build & Deploy"
3. Desactiva "Auto-Deploy"
4. Usa el botón "Manual Deploy" cuando quieras actualizar

## 📋 Configuración Detallada para Render

### Build Settings
```yaml
Build Command: npm install && npm run build
Publish Directory: dist
```

### Advanced Settings (Opcional)
```yaml
Node Version: 18
Auto-Deploy: Yes
Branch: main
```

## 🔧 Verificar que Todo Funciona

Después del deployment, verifica:

1. ✅ La página carga correctamente
2. ✅ Puedes generar datos sintéticos
3. ✅ El dashboard muestra las mejoras:
   - Navegación superior funciona
   - Health Score se anima
   - Heatmap tiene tooltips al hover
   - Opportunity Matrix abre panel al click
   - Economic Model muestra gráficos

## 🐛 Troubleshooting

### Error: "Build failed"
- Verifica que `npm install` funciona localmente
- Asegúrate de que todas las dependencias están en `package.json`

### Error: "Page not found"
- Verifica que el "Publish Directory" sea `dist`
- Asegúrate de que el build genera la carpeta `dist`

### Error: "Blank page"
- Abre la consola del navegador (F12)
- Busca errores de JavaScript
- Verifica que las rutas de assets sean correctas

## 📱 Alternativas a Render

Si prefieres otras plataformas:

### Vercel (Muy fácil)
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Netlify (También fácil)
1. Arrastra la carpeta `dist` a https://app.netlify.com/drop
2. O conecta tu repo de GitHub

### GitHub Pages (Gratis)
```bash
npm run build
# Sube la carpeta dist a la rama gh-pages
```

## 🎯 Próximos Pasos

Una vez desplegado:

1. **Comparte la URL** con tu equipo
2. **Prueba en diferentes dispositivos** (móvil, tablet, desktop)
3. **Recopila feedback** sobre las mejoras
4. **Itera** basándote en el feedback

## 📝 Notas

- **Render Free Tier**: Puede tardar ~30 segundos en "despertar" si no se usa por un tiempo
- **Auto-Deploy**: Cada push a `main` desplegará automáticamente
- **Custom Domain**: Puedes añadir tu propio dominio en Settings

## ✅ Checklist de Deployment

- [ ] Código subido a GitHub
- [ ] Cuenta de Render creada
- [ ] Static Site configurado
- [ ] Build exitoso
- [ ] URL funcionando
- [ ] Mejoras visibles
- [ ] Compartir URL con equipo

---

**¡Tu prototipo mejorado estará en vivo en minutos!** 🚀
