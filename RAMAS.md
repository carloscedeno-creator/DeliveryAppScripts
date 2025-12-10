# 🌿 Estructura de Ramas del Proyecto

## 📋 Ramas Disponibles

### 🌟 `main` (Rama Principal)
**Contiene:** Versión mejorada del script con todas las optimizaciones

**Características:**
- ✅ Token API en PropertiesService (seguro)
- ✅ Manejo de errores HTTP con reintentos
- ✅ Código optimizado (sin duplicación)
- ✅ Validaciones de datos
- ✅ Procesamiento optimizado de tickets
- ✅ Documentación completa

**Uso:**
```bash
git checkout main
```

---

### 📜 `original-script` (Rama Original)
**Contiene:** Versión original del script antes de las mejoras

**Características:**
- Código original tal como estaba en Google Apps Script
- Token API como placeholder (debes configurarlo)
- Sin las mejoras de seguridad y performance
- Útil para comparar cambios o hacer rollback

**Uso:**
```bash
git checkout original-script
```

---

## 🔄 Cambiar entre Ramas

### Ver rama actual
```bash
git branch
```

### Cambiar a rama original
```bash
git checkout original-script
```

### Cambiar a rama principal (mejorada)
```bash
git checkout main
```

---

## 📊 Comparar Ramas

### Ver diferencias entre ramas
```bash
git diff main original-script
```

### Ver archivos diferentes
```bash
git diff --name-only main original-script
```

### Ver estadísticas de cambios
```bash
git diff --stat main original-script
```

---

## 🔀 Trabajar con Ramas

### Crear nueva rama desde main
```bash
git checkout -b nueva-feature main
```

### Crear nueva rama desde original
```bash
git checkout -b basada-en-original original-script
```

### Fusionar cambios de original a main
```bash
git checkout main
git merge original-script
```

---

## 📝 Flujo de Trabajo Recomendado

1. **Desarrollo principal:** Trabaja en `main`
2. **Referencia:** Usa `original-script` para comparar o entender cambios
3. **Nuevas features:** Crea ramas desde `main`
4. **Rollback:** Si necesitas volver al original, usa `original-script`

---

## 🚀 Subir Ramas a GitHub

### Subir rama principal
```bash
git checkout main
git push
```

### Subir rama original
```bash
git checkout original-script
git push -u origin original-script
```

---

## 📈 Estado Actual

- ✅ `main` - Versión mejorada (actual)
- ✅ `original-script` - Versión original preservada
- ✅ Ambas ramas sincronizadas con GitHub

---

## ⚠️ Notas Importantes

1. **Token API:** 
   - En `main`: Configurado con PropertiesService
   - En `original-script`: Placeholder `TU_TOKEN_AQUI`

2. **No hacer merge directo:**
   - `original-script` es solo para referencia
   - No mezcles cambios de `original-script` a `main` sin revisar

3. **Backup:**
   - `original-script` sirve como backup del código original
   - Siempre puedes volver a esta versión si es necesario

