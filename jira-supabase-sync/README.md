# Jira → Supabase Sync Service

Servicio Node.js que sincroniza datos de Jira a Supabase cada 30 minutos.

## 🚀 Características

- ✅ Sincronización automática cada 30 minutos
- ✅ Conexión directa Jira API → Supabase (sin Google Sheets)
- ✅ Sincronización incremental (solo cambios)
- ✅ Procesamiento completo de datos (issues, sprints, developers, epics)
- ✅ Historial completo (changelog)
- ✅ Métricas calculadas
- ✅ Logging detallado
- ✅ Manejo de errores y reintentos

## 📋 Prerequisitos

- Node.js 18+
- Cuenta de Jira con API Token
- Proyecto de Supabase configurado
- Base de datos con esquema aplicado (ver `docs/supabase/`)

## ⚙️ Instalación

```bash
cd jira-supabase-sync
npm install
```

## 🔐 Configuración

1. Copia `.env.example` a `.env`:
```bash
cp .env.example .env
```

2. Edita `.env` con tus credenciales:

```env
# Jira
JIRA_DOMAIN=goavanto.atlassian.net
JIRA_EMAIL=tu_email@ejemplo.com
JIRA_API_TOKEN=tu_token_de_jira

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Configuración
SYNC_INTERVAL_MINUTES=30
PROJECT_KEY=obd
```

### Obtener Credenciales

**Jira API Token:**
1. Ve a https://id.atlassian.com/manage-profile/security/api-tokens
2. Click en "Create API token"
3. Copia el token generado

**Supabase Service Role Key:**
1. Ve a tu proyecto en Supabase Dashboard
2. Settings → API
3. Copia el "service_role" key (⚠️ **NUNCA** lo compartas públicamente)

## 🏃 Ejecución

### Desarrollo Local

```bash
npm run dev
```

### Producción

```bash
npm start
```

### Sincronización Manual

```bash
npm run sync
```

## 🚢 Deploy

### Opción 1: Vercel (Recomendado - Gratis)

1. Instala Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Configura variables de entorno en Vercel Dashboard

4. Configura cron job en `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/sync",
    "schedule": "*/30 * * * *"
  }]
}
```

### Opción 2: Railway (Recomendado - $5/mes)

1. Conecta tu repositorio a Railway
2. Configura variables de entorno
3. Railway detecta automáticamente el cron job

### Opción 3: Render (Gratis con límites)

1. Crea un nuevo "Cron Job" en Render
2. Conecta tu repositorio
3. Configura: `npm start`
4. Schedule: `*/30 * * * *`

## 📊 Monitoreo

El servicio registra todas las sincronizaciones en la tabla `data_sync_log`:

```sql
SELECT * FROM data_sync_log 
ORDER BY sync_started_at DESC 
LIMIT 10;
```

## 🔧 Estructura del Proyecto

```
jira-supabase-sync/
├── src/
│   ├── clients/
│   │   ├── jira-client.js      # Cliente de Jira API
│   │   └── supabase-client.js   # Cliente de Supabase
│   ├── processors/
│   │   ├── issues.js            # Procesar issues
│   │   ├── sprints.js           # Procesar sprints
│   │   └── metrics.js           # Calcular métricas
│   ├── sync/
│   │   └── sync.js              # Lógica principal
│   ├── utils/
│   │   └── logger.js            # Logger
│   ├── config.js                # Configuración
│   └── index.js                 # Entry point
├── .env.example
├── package.json
└── README.md
```

## 🐛 Troubleshooting

### Error: "JIRA_API_TOKEN no está configurado"
- Verifica que el archivo `.env` existe y tiene el token correcto

### Error: "Unauthorized" de Jira
- Verifica que el email y token son correctos
- Verifica que tienes permisos en el proyecto de Jira

### Error: "Supabase connection failed"
- Verifica que el SUPABASE_URL y SERVICE_ROLE_KEY son correctos
- Verifica que el esquema de base de datos está aplicado

### Sincronización muy lenta
- Reduce el número de issues por página
- Aumenta el delay entre requests
- Considera sincronización incremental

## 📝 Logs

Los logs se muestran en consola con colores:
- 🔴 **Error** - Errores críticos
- 🟡 **Warn** - Advertencias
- 🔵 **Info** - Información general
- 🟢 **Success** - Operaciones exitosas
- 🟣 **Debug** - Información detallada (solo si DEBUG=true)

## 🔄 Próximos Pasos

1. ✅ Servicio básico funcionando
2. ⏳ Procesamiento completo de datos
3. ⏳ Cálculo de métricas
4. ⏳ Sincronización incremental
5. ⏳ Dashboard de monitoreo

