# 🔄 Cómo Sincronizar Cambios con Google Apps Script

## ⚠️ Estado Actual

**Los cambios están solo en tu archivo local** (`Code.gs`).  
**NO están sincronizados** con Google Apps Script todavía.

---

## 📋 Pasos para Sincronizar

### Paso 1: Habilitar la API de Apps Script

1. Ve a: https://script.google.com/home/usersettings
2. Activa el toggle **"Google Apps Script API"**
3. Espera 2-3 minutos para que se propague

### Paso 2: Subir los Cambios

Una vez habilitada la API, ejecuta:

```bash
clasp push
```

Esto subirá todos los cambios a tu proyecto de Google Apps Script.

---

## ✅ Verificación

Después de hacer `clasp push`, puedes verificar:

1. **Abrir el proyecto en el editor web:**
   ```bash
   clasp open
   ```

2. **Ver los archivos sincronizados:**
   ```bash
   clasp status
   ```

---

## 📝 Resumen de Cambios que se Subirán

Los siguientes cambios se subirán a Google Apps Script:

✅ **Token API** - Movido a PropertiesService (más seguro)  
✅ **Manejo de errores HTTP** - Con reintentos automáticos  
✅ **Código duplicado** - Eliminado (mapToTargetStatus centralizada)  
✅ **Optimización** - Procesamiento de tickets optimizado  
✅ **Validaciones** - Validación de respuestas y datos  

---

## 🚨 Importante

- **NO ejecutes el script** en Google Apps Script hasta que hayas hecho `clasp push`
- El token se guardará automáticamente la primera vez que ejecutes el script mejorado
- Todos los cambios son retrocompatibles - el código funciona igual pero mejor

---

## 🔄 Flujo de Trabajo Recomendado

1. **Habilitar API** (una sola vez)
2. **Hacer cambios localmente** (como ahora)
3. **Subir cambios:** `clasp push`
4. **Probar en Google Apps Script**
5. **Si hay errores:** Corregir localmente y volver a `clasp push`

---

## 📞 Si Tienes Problemas

Si después de habilitar la API sigue dando error:

1. Espera 5-10 minutos (puede tardar en propagarse)
2. Cierra y vuelve a abrir la terminal
3. Verifica que estés autenticado: `clasp login`
4. Intenta de nuevo: `clasp push`

