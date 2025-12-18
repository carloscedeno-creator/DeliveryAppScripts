# Configuración de Múltiples Proyectos

## 🎯 Resumen

El sincronizador ahora soporta múltiples proyectos de diferentes dominios de Jira. Puedes sincronizar:
- Proyectos de `goavanto.atlassian.net` (ej: OBD)
- Proyectos de `agiledreamteam.atlassian.net` (ej: ADT)
- Cualquier otro dominio de Jira

## 📋 Configuración en GitHub Secrets

### Opción Recomendada: JSON Único

Agrega un secret llamado `PROJECTS_CONFIG` con este formato:

```json
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
```

### Secrets Necesarios

1. **PROJECTS_CONFIG** (JSON con todos los proyectos) ⭐ **RECOMENDADO**
2. **SUPABASE_URL** = `https://sywkskwkexwwdzrbwinp.supabase.co`
3. **SUPABASE_SERVICE_ROLE_KEY** = `tu_service_role_key`

## 🔑 Obtener Tokens de Jira

Para cada dominio de Jira, necesitas un token diferente:

### Para goavanto.atlassian.net:
1. Ve a https://id.atlassian.com/manage-profile/security/api-tokens
2. Crea un nuevo token
3. Copia el token (ej: `ATATT3xFfGF0...`)

### Para agiledreamteam.atlassian.net:
1. Inicia sesión en agiledreamteam.atlassian.net
2. Ve a https://id.atlassian.com/manage-profile/security/api-tokens
3. Crea un nuevo token
4. Copia el token

## 📝 Ejemplo Completo de PROJECTS_CONFIG

```json
[
  {
    "projectKey": "OBD",
    "projectName": "OBD Project",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0abc123..."
  },
  {
    "projectKey": "ADT",
    "projectName": "Agile Dream Team",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0xyz789..."
  }
]
```

## ✅ Verificación

Después de configurar, el sincronizador:

1. ✅ Validará que todos los proyectos tengan la configuración necesaria
2. ✅ Creará un cliente de Jira para cada dominio
3. ✅ Sincronizará cada proyecto secuencialmente
4. ✅ Mostrará un resumen al final

## 🚀 Próximos Pasos

1. Configura `PROJECTS_CONFIG` en GitHub Secrets
2. Configura `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
3. Haz commit y push del código
4. Ve a GitHub Actions y ejecuta el workflow manualmente para probar
5. Verifica que los datos se sincronizan correctamente en Supabase

## 🔍 Troubleshooting

### Error: "Faltan credenciales para Jira"
- Verifica que `jiraApiToken` esté configurado para cada proyecto
- Verifica que el token sea válido para ese dominio

### Error: "Proyecto X: falta jiraDomain"
- Verifica que el JSON esté bien formateado
- Verifica que todos los proyectos tengan `jiraDomain`

### Los datos no se sincronizan
- Revisa los logs en GitHub Actions
- Verifica que los tokens de Jira sean correctos
- Verifica que tengas acceso a los proyectos en Jira
