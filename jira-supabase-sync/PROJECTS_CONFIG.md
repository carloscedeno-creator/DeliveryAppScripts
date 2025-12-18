# Configuración de Proyectos Múltiples

## 📋 Formato de Configuración

El sincronizador ahora soporta múltiples proyectos de diferentes dominios de Jira.

### Opción 1: Variable de Entorno JSON (Recomendado para GitHub Actions)

En GitHub Secrets, agrega:

```
PROJECTS_CONFIG = [
  {
    "projectKey": "OBD",
    "projectName": "OBD Project",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "tu_token_goavanto"
  },
  {
    "projectKey": "ADT",
    "projectName": "Agile Dream Team",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "tu_token_agiledreamteam"
  }
]
```

### Opción 2: Variables de Entorno Individuales

Para cada proyecto, usa el formato:

```
PROJECT_1_KEY=OBD
PROJECT_1_NAME=OBD Project
PROJECT_1_JIRA_DOMAIN=goavanto.atlassian.net
PROJECT_1_JIRA_EMAIL=carlos.cedeno@agenticdream.com
PROJECT_1_JIRA_API_TOKEN=tu_token

PROJECT_2_KEY=ADT
PROJECT_2_NAME=Agile Dream Team
PROJECT_2_JIRA_DOMAIN=agiledreamteam.atlassian.net
PROJECT_2_JIRA_EMAIL=carlos.cedeno@agenticdream.com
PROJECT_2_JIRA_API_TOKEN=tu_token
```

## 🔧 Configuración en GitHub Actions

### Secrets Necesarios

1. **PROJECTS_CONFIG** (JSON con todos los proyectos) - **RECOMENDADO**

O individualmente:

2. **PROJECT_1_KEY**, **PROJECT_1_NAME**, **PROJECT_1_JIRA_DOMAIN**, **PROJECT_1_JIRA_EMAIL**, **PROJECT_1_JIRA_API_TOKEN**
3. **PROJECT_2_KEY**, **PROJECT_2_NAME**, **PROJECT_2_JIRA_DOMAIN**, **PROJECT_2_JIRA_EMAIL**, **PROJECT_2_JIRA_API_TOKEN**
4. ... (para cada proyecto adicional)

5. **SUPABASE_URL** = `https://sywkskwkexwwdzrbwinp.supabase.co`
6. **SUPABASE_SERVICE_ROLE_KEY** = `tu_service_role_key`

## 📝 Ejemplo Completo

### Para GitHub Secrets:

```json
PROJECTS_CONFIG:
[
  {
    "projectKey": "OBD",
    "projectName": "OBD Project",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0..."
  },
  {
    "projectKey": "ADT",
    "projectName": "Agile Dream Team",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0..."
  }
]

SUPABASE_URL:
https://sywkskwkexwwdzrbwinp.supabase.co

SUPABASE_SERVICE_ROLE_KEY:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔍 Verificación

El sincronizador validará que:
- ✅ Todos los proyectos tengan `projectKey`
- ✅ Todos los proyectos tengan `jiraDomain`
- ✅ Todos los proyectos tengan `jiraEmail`
- ✅ Todos los proyectos tengan `jiraApiToken`

Si falta alguno, mostrará un error claro indicando qué falta.

## 🚀 Uso

El sincronizador automáticamente:
1. Lee la configuración de proyectos
2. Crea un cliente de Jira para cada dominio
3. Sincroniza cada proyecto secuencialmente
4. Muestra un resumen al final
