# 🚀 Guía Paso a Paso: Configurar Sincronizador Multi-Proyecto

## 📋 Paso 1: Identificar Proyectos y Obtener Tokens

### 1.1. Identificar tus Proyectos

Primero, identifica **TODOS** los proyectos que quieres sincronizar:

**En goavanto.atlassian.net:**
- ¿Cuáles son las claves de tus proyectos? (ej: OBD, PROYECTO2, etc.)

**En agiledreamteam.atlassian.net:**
- ¿Cuáles son las claves de tus proyectos? (ej: ADT, PROYECTO2, etc.)

**💡 TIP:** Puedes usar el script `scripts/list-jira-projects.js` para listar todos los proyectos disponibles.

### 1.2. Obtener Tokens de Jira

Necesitas un token de API para cada dominio de Jira (no por proyecto).

### Para goavanto.atlassian.net:

1. Ve a: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click en **"Create API token"**
3. Dale un nombre (ej: "Jira Sync - Goavanto")
4. Click en **"Create"**
5. **Copia el token inmediatamente** (solo se muestra una vez)
   - Ejemplo: `ATATT3xFfGF0abc123...`
6. **Guárdalo en un lugar seguro** (lo necesitarás en el Paso 3)

### Para agiledreamteam.atlassian.net:

1. Inicia sesión en: https://agiledreamteam.atlassian.net
2. Ve a: https://id.atlassian.com/manage-profile/security/api-tokens
3. Click en **"Create API token"**
4. Dale un nombre (ej: "Jira Sync - Agile Dream Team")
5. Click en **"Create"**
6. **Copia el token inmediatamente**
   - Ejemplo: `ATATT3xFfGF0xyz789...`
7. **Guárdalo en un lugar seguro**

**⚠️ RECUERDA:** Este token servirá para **TODOS** los proyectos en agiledreamteam.atlassian.net

---

## 📋 Paso 1.5 (Opcional): Listar Proyectos Disponibles

Si no estás seguro de qué proyectos tienes, puedes usar este script:

```powershell
cd "d:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync"
node scripts/list-jira-projects.js
```

Esto te mostrará todos los proyectos disponibles en ambos dominios y te dará el JSON listo para copiar.

**Nota:** Necesitas tener configurado `JIRA_API_TOKEN` y opcionalmente `ADT_JIRA_API_TOKEN` en tu `.env`.

---

## 📋 Paso 2: Preparar el JSON de Configuración

Crea el JSON con la configuración de **TODOS** tus proyectos. Puedes tener múltiples proyectos por dominio.

### 🔑 Importante sobre Tokens

**Un solo token por dominio funciona para TODOS los proyectos de ese dominio:**
- ✅ Un token de `goavanto.atlassian.net` → sirve para TODOS los proyectos en ese dominio
- ✅ Un token de `agiledreamteam.atlassian.net` → sirve para TODOS los proyectos en ese dominio

### 📝 Formato Base

```json
[
  {
    "projectKey": "OBD",
    "projectName": "OBD Project",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TU_TOKEN_DE_GOAVANTO_AQUI"
  },
  {
    "projectKey": "OTRO_PROYECTO_GOAVANTO",
    "projectName": "Segundo Proyecto Goavanto",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TU_TOKEN_DE_GOAVANTO_AQUI"
  },
  {
    "projectKey": "ADT",
    "projectName": "Agile Dream Team",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TU_TOKEN_DE_AGILEDREAMTEAM_AQUI"
  },
  {
    "projectKey": "OTRO_PROYECTO_ADT",
    "projectName": "Segundo Proyecto ADT",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TU_TOKEN_DE_AGILEDREAMTEAM_AQUI"
  }
]
```

**⚠️ IMPORTANTE:**
- Reemplaza `TU_TOKEN_DE_GOAVANTO_AQUI` con el token real (el mismo para todos los proyectos de goavanto)
- Reemplaza `TU_TOKEN_DE_AGILEDREAMTEAM_AQUI` con el token real (el mismo para todos los proyectos de agiledreamteam)
- **Agrega TODOS tus proyectos** - no solo uno por dominio
- Reemplaza `OTRO_PROYECTO_GOAVANTO` y `OTRO_PROYECTO_ADT` con las claves reales de tus proyectos
- Verifica que el JSON esté bien formateado (sin comas extra al final)

**Ejemplo completo (con tokens ficticios) - MÚLTIPLES PROYECTOS:**

```json
[
  {
    "projectKey": "OBD",
    "projectName": "OBD Project",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0abc123def456ghi789"
  },
  {
    "projectKey": "PROYECTO2_GOAVANTO",
    "projectName": "Segundo Proyecto Goavanto",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0abc123def456ghi789"
  },
  {
    "projectKey": "ADT",
    "projectName": "Agile Dream Team",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0xyz789uvw456rst123"
  },
  {
    "projectKey": "PROYECTO2_ADT",
    "projectName": "Segundo Proyecto ADT",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0xyz789uvw456rst123"
  }
]
```

**💡 TIP:** Usa el script `npm run list-projects` para ver todos tus proyectos disponibles y generar el JSON automáticamente.

---

## 📋 Paso 3: Configurar Secrets en GitHub

### 3.1. Ir a tu Repositorio en GitHub

1. Abre tu navegador
2. Ve a tu repositorio en GitHub (donde está el código del sincronizador)
3. Click en **"Settings"** (arriba, en el menú del repositorio)

### 3.2. Ir a Secrets

1. En el menú lateral izquierdo, busca **"Secrets and variables"**
2. Click en **"Actions"**

### 3.3. Agregar PROJECTS_CONFIG

1. Click en **"New repository secret"**
2. En **"Name"**, escribe: `PROJECTS_CONFIG`
3. En **"Secret"**, pega el JSON completo que preparaste en el Paso 2
   - **IMPORTANTE:** Pega TODO el JSON en una sola línea o múltiples líneas, GitHub lo acepta
4. Click en **"Add secret"**

### 3.4. Agregar SUPABASE_URL

1. Click en **"New repository secret"** (otra vez)
2. En **"Name"**, escribe: `SUPABASE_URL`
3. En **"Secret"**, escribe: `https://sywkskwkexwwdzrbwinp.supabase.co`
4. Click en **"Add secret"**

### 3.5. Agregar SUPABASE_SERVICE_ROLE_KEY

1. Click en **"New repository secret"** (otra vez)
2. En **"Name"**, escribe: `SUPABASE_SERVICE_ROLE_KEY`
3. En **"Secret"**, pega tu Service Role Key de Supabase
   - Si no la tienes:
     - Ve a tu proyecto en Supabase Dashboard
     - Settings → API
     - Copia el **"service_role" key** (⚠️ NO el anon key)
4. Click en **"Add secret"**

### 3.6. Verificar Secrets

Deberías tener estos 3 secrets configurados:
- ✅ `PROJECTS_CONFIG`
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

---

## 📋 Paso 4: Hacer Commit y Push

### 4.1. Verificar Cambios

Abre tu terminal y ve al directorio del sincronizador:

```powershell
cd "d:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync"
```

### 4.2. Ver Estado de Git

```powershell
git status
```

Deberías ver archivos modificados/agregados como:
- `.github/workflows/sync-jira.yml`
- `src/config/projects.js`
- `src/run-sync-once.js`
- etc.

### 4.3. Agregar Cambios

```powershell
git add .
```

### 4.4. Hacer Commit

```powershell
git commit -m "Add multi-project sync support with GitHub Actions"
```

### 4.5. Hacer Push

```powershell
git push
```

---

## 📋 Paso 5: Probar el Workflow

### 5.1. Ir a GitHub Actions

1. En tu repositorio de GitHub, click en la pestaña **"Actions"**
2. Deberías ver el workflow **"Jira → Supabase Sync"**

### 5.2. Ejecutar Manualmente

1. Click en **"Jira → Supabase Sync"** (en la lista de workflows)
2. Click en **"Run workflow"** (botón a la derecha)
3. Click en el botón verde **"Run workflow"** (en el dropdown)

### 5.3. Ver la Ejecución

1. Click en la ejecución que acabas de iniciar
2. Click en el job **"sync"**
3. Verás los logs en tiempo real

### 5.4. Verificar Resultados

Busca en los logs:
- ✅ `✅ Cliente Jira creado para OBD`
- ✅ `✅ Cliente Jira creado para ADT` (si lo configuraste)
- ✅ `🚀 Iniciando sincronización única...`
- ✅ `📦 Sincronizando proyecto: OBD`
- ✅ `✅ Sincronización completada para OBD`

Si ves errores:
- Revisa que los tokens sean correctos
- Revisa que el JSON esté bien formateado
- Revisa los logs para ver el error específico

---

## 📋 Paso 6: Verificar Datos en Supabase

### 6.1. Ir a Supabase Dashboard

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto

### 6.2. Verificar Squads

1. Ve a **"Table Editor"**
2. Selecciona la tabla **"squads"**
3. Deberías ver:
   - `OBD` (squad_key)
   - `ADT` (si lo configuraste)

### 6.3. Verificar Initiatives (Épicas)

1. Selecciona la tabla **"initiatives"**
2. Deberías ver épicas con:
   - `squad_id` asignado
   - `start_date` y `end_date` (si están disponibles en Jira)

### 6.4. Verificar Issues

1. Selecciona la tabla **"issues"**
2. Deberías ver issues con:
   - `squad_id` asignado
   - Datos sincronizados de Jira

---

## 📋 Paso 7: Configurar Ejecución Automática

El workflow ya está configurado para ejecutarse cada 30 minutos automáticamente.

### Verificar Schedule

1. Ve a `.github/workflows/sync-jira.yml`
2. Verifica que tenga:
   ```yaml
   schedule:
     - cron: '*/30 * * * *'
   ```

Esto significa que se ejecutará:
- Cada 30 minutos
- Automáticamente
- Sin necesidad de hacer nada

---

## ✅ Checklist Final

Antes de considerar que todo está listo, verifica:

- [ ] Tokens de Jira obtenidos para ambos dominios
- [ ] JSON de configuración preparado y validado
- [ ] `PROJECTS_CONFIG` secret agregado en GitHub
- [ ] `SUPABASE_URL` secret agregado en GitHub
- [ ] `SUPABASE_SERVICE_ROLE_KEY` secret agregado en GitHub
- [ ] Código commiteado y pusheado
- [ ] Workflow ejecutado manualmente y funcionó
- [ ] Datos verificados en Supabase
- [ ] Schedule configurado (ya está por defecto)

---

## 🔍 Troubleshooting

### Error: "Faltan credenciales para Jira"

**Causa:** El token no está configurado o es incorrecto.

**Solución:**
1. Verifica que `jiraApiToken` esté en el JSON
2. Verifica que el token sea correcto
3. Verifica que el token sea válido para ese dominio

### Error: "Error parseando PROJECTS_CONFIG"

**Causa:** El JSON está mal formateado.

**Solución:**
1. Valida el JSON en: https://jsonlint.com/
2. Verifica que no haya comas extra
3. Verifica que todas las comillas estén cerradas

### Error: "Unauthorized" de Jira

**Causa:** El token o email son incorrectos.

**Solución:**
1. Verifica que el email sea correcto
2. Verifica que el token sea válido
3. Crea un nuevo token si es necesario

### Los datos no aparecen en Supabase

**Causa:** La sincronización falló o no se ejecutó.

**Solución:**
1. Revisa los logs en GitHub Actions
2. Verifica que el workflow se haya ejecutado
3. Ejecuta manualmente para ver errores

---

## 🎉 ¡Listo!

Si completaste todos los pasos y el workflow se ejecuta correctamente, el sincronizador:

- ✅ Se ejecutará automáticamente cada 30 minutos
- ✅ Sincronizará todos los proyectos configurados
- ✅ Actualizará Supabase con datos frescos de Jira
- ✅ El dashboard mostrará datos actualizados al recargar

---

## 📞 ¿Necesitas Ayuda?

Si encuentras algún problema:
1. Revisa los logs en GitHub Actions
2. Verifica que todos los secrets estén configurados
3. Verifica que los tokens sean válidos
4. Revisa la sección de Troubleshooting arriba
