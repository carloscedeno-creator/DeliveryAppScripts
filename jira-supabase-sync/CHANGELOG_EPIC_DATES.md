# Changelog: Extracción de Fechas de Timeline de Épicas

## Cambios Realizados

### 1. Cliente de Jira (`src/clients/jira-client.js`)
- ✅ Agregado método `fetchIssueDetails()` para obtener detalles completos de un issue/épica
- ✅ Agregado método `extractTimelineDates()` para extraer fechas del timeline desde campos personalizados
- ✅ Soporte para campos configurados específicamente (`EPIC_START_DATE_FIELD_ID`, `EPIC_END_DATE_FIELD_ID`)
- ✅ Fallback automático para buscar fechas en todos los campos personalizados

### 2. Procesador de Issues (`src/processors/issue-processor.js`)
- ✅ Actualizado para obtener fechas del timeline cuando procesa épicas como parent
- ✅ Extrae fechas antes de crear/actualizar la épica en Supabase
- ✅ Procesa épicas directamente (no solo como parent de issues)

### 3. Cliente de Supabase (`src/clients/supabase-client.js`)
- ✅ Actualizado `getOrCreateEpic()` para aceptar y guardar `start_date` y `end_date`
- ✅ Actualiza fechas si la épica ya existe y hay cambios
- ✅ Cambiado de `projects` a `squads` (estructura actualizada)
- ✅ Asigna correctamente `squad_id` a las épicas

### 4. Sincronización (`src/sync/sync.js`)
- ✅ Procesa épicas directamente al inicio de la sincronización
- ✅ Extrae fechas del timeline para todas las épicas encontradas
- ✅ Actualizado para usar `squads` en lugar de `projects`

### 5. Configuración (`src/config.js`)
- ✅ Agregados campos para configurar IDs de campos personalizados de fecha:
  - `EPIC_START_DATE_FIELD_ID`
  - `EPIC_END_DATE_FIELD_ID`

## Cómo Funciona

1. **Durante la sincronización completa:**
   - Obtiene todos los issues de Jira
   - Filtra épicas (issues de tipo "Epic")
   - Para cada épica:
     - Obtiene detalles completos de la API de Jira
     - Extrae fechas del timeline desde campos personalizados
     - Crea/actualiza la épica en Supabase con las fechas

2. **Durante el procesamiento de issues:**
   - Si un issue tiene un parent de tipo "Epic":
     - Obtiene detalles completos de la épica
     - Extrae fechas del timeline
     - Crea/actualiza la épica con las fechas

3. **Extracción de fechas:**
   - Primero intenta usar campos configurados específicamente
   - Si no están configurados, busca en todos los campos personalizados
   - Identifica campos de fecha por formato (YYYY-MM-DD)
   - Asigna start_date y end_date basado en el orden de las fechas

## Configuración Opcional

Para mejorar la precisión, puedes configurar los IDs específicos de los campos de fecha en `.env`:

```env
EPIC_START_DATE_FIELD_ID=customfield_10010
EPIC_END_DATE_FIELD_ID=customfield_10011
```

Para encontrar estos IDs, ejecuta:
```bash
node scripts/find-epic-date-fields.js
```

## Próximos Pasos

1. Ejecutar el script `find-epic-date-fields.js` para identificar los campos correctos
2. Configurar los IDs de campos en `.env` si es necesario
3. Ejecutar una sincronización completa para actualizar todas las épicas
4. Verificar que las fechas se están guardando correctamente en Supabase
