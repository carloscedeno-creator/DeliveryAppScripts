# 📋 Resumen de Cambios para Commit

## 🎯 ¿De qué se trata este commit?

Este commit agrega **soporte para sincronizar múltiples proyectos de Jira** automáticamente usando **GitHub Actions**.

## ✨ Cambios Principales

### 1. **Soporte Multi-Proyecto** 
- ✅ Puedes sincronizar múltiples proyectos de diferentes dominios de Jira
- ✅ Un token por dominio sirve para todos los proyectos de ese dominio
- ✅ Configuración flexible mediante JSON

### 2. **GitHub Actions Workflow**
- ✅ Ejecución automática cada 30 minutos
- ✅ Ejecución manual desde GitHub UI
- ✅ Logs detallados para debugging

### 3. **Extracción de Fechas de Épicas**
- ✅ Extrae fechas del timeline de épicas desde Jira
- ✅ Usa `duedate` como `end_date`
- ✅ Usa `created` como fallback para `start_date`
- ✅ Busca en campos personalizados

### 4. **Scripts de Utilidad**
- ✅ `list-jira-projects.js` - Lista todos tus proyectos disponibles
- ✅ Scripts de diagnóstico para verificar fechas

## 📁 Archivos Nuevos/Modificados

### Nuevos:
- `.github/workflows/sync-jira.yml` - Workflow de GitHub Actions
- `src/config/projects.js` - Configuración de múltiples proyectos
- `src/clients/jira-client-factory.js` - Factory para crear clientes de Jira
- `src/sync/sync-multi.js` - Funciones de sync para múltiples proyectos
- `src/run-sync-once.js` - Script para ejecutar sync única vez
- `scripts/list-jira-projects.js` - Listar proyectos disponibles
- Documentación completa (GUIA_PASO_A_PASO.md, etc.)

### Modificados:
- `src/clients/jira-client.js` - Soporta parámetros de dominio/email/token
- `src/processors/issue-processor.js` - Acepta cliente de Jira como parámetro
- `package.json` - Nuevo script `list-projects`

## 🚀 ¿Por qué hacer commit?

Para que GitHub Actions pueda:
1. ✅ Usar el nuevo código que soporta múltiples proyectos
2. ✅ Ejecutar el workflow automáticamente
3. ✅ Sincronizar todos tus proyectos configurados

**Sin este commit, GitHub Actions seguirá usando el código viejo que solo soporta un proyecto.**

## 📝 Comando para Commit

```powershell
cd "d:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync"
git add .
git commit -m "Add multi-project sync with GitHub Actions and epic dates extraction"
git push
```

## ✅ Después del Commit

1. GitHub Actions detectará el nuevo workflow
2. Podrás ejecutarlo manualmente desde GitHub
3. Se ejecutará automáticamente cada 30 minutos
4. Sincronizará todos los proyectos configurados en `PROJECTS_CONFIG`
