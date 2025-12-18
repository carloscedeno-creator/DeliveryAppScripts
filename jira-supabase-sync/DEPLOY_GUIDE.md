# Guía de Despliegue del Sincronizador

## 🎯 Objetivo

Hacer que el sincronizador corra automáticamente cada 30 minutos sin necesidad de mantener un servidor activo.

## ✅ Opción 1: GitHub Actions (RECOMENDADO - Gratis)

### Ventajas
- ✅ **100% Gratis** (hasta 2000 minutos/mes)
- ✅ Ya tienes Git configurado
- ✅ No necesitas servidor
- ✅ Fácil de configurar
- ✅ Logs visibles en GitHub

### Pasos

#### 1. Crear el workflow de GitHub Actions

Crea el archivo `.github/workflows/sync-jira.yml` en la raíz del repositorio:

```yaml
name: Jira → Supabase Sync

on:
  schedule:
    # Ejecuta cada 30 minutos
    - cron: '*/30 * * * *'
  workflow_dispatch: # Permite ejecución manual desde GitHub UI

jobs:
  sync:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run sync
        env:
          JIRA_DOMAIN: ${{ secrets.JIRA_DOMAIN }}
          JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          PROJECT_KEY: ${{ secrets.PROJECT_KEY }}
          SYNC_INTERVAL_MINUTES: '30'
        run: npm run sync
```

#### 2. Crear script de sincronización única

Modifica `package.json` para tener un script que ejecute solo una sincronización:

```json
{
  "scripts": {
    "sync": "node -e \"import('./src/sync/sync.js').then(m => { const lastSync = await supabaseClient.getLastSync(); if (!lastSync) { m.fullSync(); } else { m.incrementalSync(); } })\""
  }
}
```

O mejor, crea un script dedicado:

**Crea `src/run-sync-once.js`:**

```javascript
import { fullSync, incrementalSync } from './sync/sync.js';
import supabaseClient from './clients/supabase-client.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';

async function runSyncOnce() {
  try {
    // Obtener squad
    const squadId = await supabaseClient.getOrCreateSquad(
      config.sync.projectKey.toUpperCase(),
      config.sync.projectKey.toUpperCase(),
      config.jira.domain
    );
    
    // Verificar última sincronización
    const lastSync = await supabaseClient.getLastSync(squadId);
    
    if (!lastSync) {
      logger.info('🆕 Primera sincronización: ejecutando sync completa');
      await fullSync();
    } else {
      logger.info('🔄 Sincronización incremental');
      await incrementalSync();
    }
    
    logger.success('✅ Sincronización completada');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error en sincronización:', error);
    process.exit(1);
  }
}

runSyncOnce();
```

Y actualiza `package.json`:

```json
{
  "scripts": {
    "sync": "node src/run-sync-once.js"
  }
}
```

#### 3. Configurar Secrets en GitHub

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Agrega los siguientes secrets:
   - `JIRA_DOMAIN` = `goavanto.atlassian.net`
   - `JIRA_EMAIL` = `tu_email@ejemplo.com`
   - `JIRA_API_TOKEN` = `tu_token_de_jira`
   - `SUPABASE_URL` = `https://sywkskwkexwwdzrbwinp.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `tu_service_role_key`
   - `PROJECT_KEY` = `obd`

#### 4. Commit y Push

```bash
git add .github/workflows/sync-jira.yml
git add src/run-sync-once.js
git add package.json
git commit -m "Add GitHub Actions workflow for automatic sync"
git push
```

#### 5. Verificar

- Ve a tu repositorio → Actions
- Verás el workflow ejecutándose cada 30 minutos
- Puedes ejecutarlo manualmente con "Run workflow"

---

## ✅ Opción 2: Vercel Cron Jobs (Gratis)

### Ventajas
- ✅ Gratis
- ✅ Fácil deploy
- ✅ Buena integración con Git

### Pasos

#### 1. Crear API route

Crea `api/sync.js`:

```javascript
import { fullSync, incrementalSync } from '../src/sync/sync.js';
import supabaseClient from '../src/clients/supabase-client.js';
import { config } from '../src/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const squadId = await supabaseClient.getOrCreateSquad(
      config.sync.projectKey.toUpperCase(),
      config.sync.projectKey.toUpperCase(),
      config.jira.domain
    );
    
    const lastSync = await supabaseClient.getLastSync(squadId);
    
    if (!lastSync) {
      await fullSync();
    } else {
      await incrementalSync();
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

#### 2. Crear `vercel.json`

```json
{
  "crons": [{
    "path": "/api/sync",
    "schedule": "*/30 * * * *"
  }]
}
```

#### 3. Deploy en Vercel

```bash
npm i -g vercel
vercel
```

#### 4. Configurar variables de entorno en Vercel Dashboard

---

## ✅ Opción 3: Railway ($5/mes)

### Ventajas
- ✅ Muy fácil
- ✅ Detección automática
- ✅ Buena UI

### Pasos

1. Ve a [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Selecciona tu repositorio
4. Railway detecta automáticamente Node.js
5. Agrega variables de entorno
6. Railway mantiene el proceso corriendo

---

## ✅ Opción 4: Render (Gratis con límites)

### Pasos

1. Ve a [render.com](https://render.com)
2. New → Cron Job
3. Conecta tu repositorio
4. Configura:
   - **Command**: `npm run sync`
   - **Schedule**: `*/30 * * * *`
5. Agrega variables de entorno
6. Deploy

---

## 🔧 Preparación del Código

### Crear script de sincronización única

Ya lo mencionamos arriba, pero aquí está completo:

**`src/run-sync-once.js`:**

```javascript
import { fullSync, incrementalSync } from './sync/sync.js';
import supabaseClient from './clients/supabase-client.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';

async function runSyncOnce() {
  try {
    logger.info('🚀 Iniciando sincronización única...');
    
    // Obtener squad
    const squadId = await supabaseClient.getOrCreateSquad(
      config.sync.projectKey.toUpperCase(),
      config.sync.projectKey.toUpperCase(),
      config.jira.domain
    );
    
    // Verificar última sincronización
    const lastSync = await supabaseClient.getLastSync(squadId);
    
    if (!lastSync) {
      logger.info('🆕 Primera sincronización: ejecutando sync completa');
      await fullSync();
    } else {
      logger.info('🔄 Sincronización incremental');
      await incrementalSync();
    }
    
    logger.success('✅ Sincronización completada exitosamente');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error en sincronización:', error);
    process.exit(1);
  }
}

runSyncOnce();
```

### Actualizar `package.json`

```json
{
  "scripts": {
    "start": "node src/index.js",
    "sync": "node src/run-sync-once.js",
    "dev": "node --watch src/index.js"
  }
}
```

---

## 📋 Checklist de Despliegue

- [ ] Crear script `src/run-sync-once.js`
- [ ] Actualizar `package.json` con script `sync`
- [ ] Elegir opción de hosting (GitHub Actions recomendado)
- [ ] Configurar workflow/secrets según opción elegida
- [ ] Probar ejecución manual
- [ ] Verificar que los datos se actualizan en Supabase
- [ ] Monitorear logs

---

## 🎯 Recomendación Final

**Usa GitHub Actions** porque:
1. Ya tienes Git configurado
2. Es 100% gratis
3. No necesitas servidor
4. Logs visibles en GitHub
5. Fácil de mantener

¿Quieres que te ayude a configurar GitHub Actions ahora?
