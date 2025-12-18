# Cómo Funciona el Sincronizador Jira → Supabase

## 📋 Resumen

El sincronizador es un **servicio Node.js independiente** que se ejecuta como un proceso continuo y sincroniza datos de Jira a Supabase automáticamente cada 30 minutos (configurable).

## 🏗️ Arquitectura

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Jira API  │ ◄────── │  Sincronizador │ ──────► │  Supabase   │
│             │         │   (Node.js)    │         │  PostgreSQL │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              │ Cron Job
                              │ cada 30 min
                              ▼
                        ┌──────────────┐
                        │  Ejecución   │
                        │  Automática   │
                        └──────────────┘
```

## 🔄 Flujo de Sincronización

### 1. **Inicio del Servicio** (`src/index.js`)

```javascript
// Al iniciar:
1. Ejecuta sincronización inmediata
2. Programa cron job cada 30 minutos
3. Mantiene el proceso vivo
```

### 2. **Tipo de Sincronización**

El servicio decide automáticamente qué tipo de sync ejecutar:

- **Primera vez** → `fullSync()` (sincronización completa)
- **Siguientes veces** → `incrementalSync()` (solo cambios)

### 3. **Proceso de Sincronización Completa** (`fullSync()`)

```
1. Obtener/Crear Squad en Supabase
   └─> getOrCreateSquad()

2. Registrar inicio de sync en data_sync_log
   └─> logSync(squadId, 'full', 'running', 0)

3. Obtener TODOS los issues de Jira
   └─> jiraClient.fetchAllIssues()

4. Procesar ÉPICAS directamente (con fechas del timeline)
   └─> Para cada épica:
       ├─> fetchIssueDetails(epicKey)
       ├─> extractTimelineDates(fields)
       └─> getOrCreateEpic(squadId, key, name, startDate, endDate)

5. Procesar ISSUES (no épicas)
   └─> processIssues(squadId, jiraIssues)
       ├─> Para cada issue:
       │   ├─> Extraer datos (key, summary, status, etc.)
       │   ├─> Si tiene parent Epic → procesar épica también
       │   ├─> Obtener changelog
       │   ├─> Obtener sprints asociados
       │   └─> upsertIssue() en Supabase
       └─> Retorna: { successCount, errorCount }

6. Registrar finalización
   └─> logSync(squadId, 'full', 'completed', successCount)
```

### 4. **Proceso de Sincronización Incremental** (`incrementalSync()`)

```
1. Obtener/Crear Squad
2. Obtener última sincronización
   └─> getLastSync(squadId)

3. Obtener issues actualizados desde última sync
   └─> jiraClient.fetchUpdatedIssues(sinceDate)

4. Procesar épicas actualizadas (con fechas)
5. Procesar issues actualizados
6. Registrar finalización
```

## 📦 Componentes Principales

### **Cliente de Jira** (`src/clients/jira-client.js`)

- `fetchAllIssues()` - Obtiene todos los issues del proyecto
- `fetchUpdatedIssues(sinceDate)` - Obtiene issues actualizados
- `fetchIssueDetails(issueKey)` - Obtiene detalles completos (incluyendo custom fields)
- `extractTimelineDates(fields)` - Extrae fechas del timeline de épicas
  - Busca en `customfield_10015` (Start date)
  - Busca en `duedate` (End date)
  - Fallback a `created` si no hay start_date

### **Cliente de Supabase** (`src/clients/supabase-client.js`)

- `getOrCreateSquad()` - Obtiene o crea un squad
- `getOrCreateEpic()` - Obtiene o crea una épica (initiative) con fechas
- `upsertIssue()` - Inserta o actualiza un issue
- `getOrCreateSprint()` - Obtiene o crea un sprint
- `logSync()` - Registra sincronización en `data_sync_log`

### **Procesador de Issues** (`src/processors/issue-processor.js`)

- `processIssue()` - Procesa un issue individual
  - Extrae datos del issue
  - Si tiene parent Epic → procesa épica con fechas
  - Obtiene changelog
  - Obtiene sprints
  - Guarda en Supabase

- `processIssues()` - Procesa múltiples issues en batch

## ⚙️ Configuración

### Variables de Entorno (`.env`)

```env
# Jira
JIRA_DOMAIN=goavanto.atlassian.net
JIRA_EMAIL=tu_email@ejemplo.com
JIRA_API_TOKEN=tu_token

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Configuración
SYNC_INTERVAL_MINUTES=30
PROJECT_KEY=obd

# Opcional: IDs de campos personalizados de fecha
EPIC_START_DATE_FIELD_ID=customfield_10015
EPIC_END_DATE_FIELD_ID=customfield_10016
```

## 🚀 Ejecución

### **Desarrollo Local**

```bash
cd jira-supabase-sync
npm install
npm run dev  # Ejecuta y se queda corriendo
```

### **Producción**

El servicio debe ejecutarse como un proceso continuo. Opciones:

#### **Opción 1: Vercel Cron Jobs** (Recomendado - Gratis)

1. Deploy a Vercel
2. Configurar cron job en `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/sync",
    "schedule": "*/30 * * * *"
  }]
}
```

#### **Opción 2: Railway** ($5/mes)

1. Conectar repositorio
2. Railway detecta automáticamente el cron job
3. Configurar variables de entorno

#### **Opción 3: Render** (Gratis con límites)

1. Crear "Cron Job"
2. Schedule: `*/30 * * * *`
3. Command: `npm start`

#### **Opción 4: Servidor propio**

```bash
# Con PM2 (recomendado)
npm install -g pm2
pm2 start src/index.js --name jira-sync
pm2 save
pm2 startup  # Para iniciar al arrancar el servidor
```

## 📊 Monitoreo

### **Logs de Sincronización**

Todas las sincronizaciones se registran en la tabla `data_sync_log`:

```sql
SELECT 
  sync_type,
  status,
  issues_processed,
  sync_started_at,
  sync_completed_at
FROM data_sync_log
ORDER BY sync_started_at DESC
LIMIT 10;
```

### **Logs en Consola**

El servicio muestra logs detallados:
- 🔴 **Error** - Errores críticos
- 🟡 **Warn** - Advertencias
- 🔵 **Info** - Información general
- 🟢 **Success** - Operaciones exitosas
- 🟣 **Debug** - Información detallada (si `DEBUG=true`)

## 🔄 Extracción de Fechas de Épicas

### **Proceso Actual**

1. **Busca campos configurados**:
   - `EPIC_START_DATE_FIELD_ID` → `start_date`
   - `EPIC_END_DATE_FIELD_ID` → `end_date`

2. **Busca campos conocidos**:
   - `customfield_10015` → `start_date` (si existe)
   - `duedate` → `end_date`

3. **Fallback**:
   - `created` → `start_date` (si no hay otro)

4. **Busca en todos los custom fields**:
   - Busca strings con formato `YYYY-MM-DD`
   - Ordena y asigna start/end basado en orden

### **Ejemplo de Extracción**

```javascript
// Épica OBD-1:
{
  customfield_10015: null,        // Start date (no tiene valor)
  duedate: "2025-11-06",          // End date ✅
  created: "2025-07-21T10:12:06"  // Start date (fallback) ✅
}

// Resultado:
{
  startDate: "2025-07-21",  // Desde created
  endDate: "2025-11-06"     // Desde duedate
}
```

## ⚠️ Notas Importantes

1. **El sincronizador NO corre "dentro" de Supabase**
   - Es un servicio Node.js independiente
   - Debe ejecutarse en un servidor/hosting externo
   - Se conecta a Supabase como cliente

2. **Edge Functions de Supabase**
   - La Edge Function `execute-sync-sql` es solo para ejecutar SQL
   - NO es el sincronizador principal
   - Se usa para scripts auxiliares

3. **Primera Ejecución**
   - Siempre ejecuta `fullSync()` la primera vez
   - Puede tardar varios minutos si hay muchos issues

4. **Sincronización Incremental**
   - Solo procesa issues actualizados desde la última sync
   - Más rápido y eficiente
   - Usa `updated` field de Jira para filtrar

## 🔧 Troubleshooting

### El sincronizador no se ejecuta automáticamente

- Verifica que el proceso esté corriendo
- Verifica el cron job en el hosting
- Revisa logs del servicio

### Fechas de épicas no se sincronizan

- Verifica que `fetchIssueDetails()` esté funcionando
- Revisa logs de extracción de fechas
- Ejecuta `node scripts/check-all-epic-dates.js` para diagnosticar

### Errores de conexión

- Verifica variables de entorno
- Verifica credenciales de Jira y Supabase
- Revisa logs de errores
