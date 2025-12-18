# Respuesta Rápida: Configuración de Secrets

## 🔑 Nombre de la Variable en GitHub

```
PROJECTS_CONFIG
```

**Exactamente así, en mayúsculas, sin espacios.**

## ✅ Sobre el Símbolo "=" en Tokens

**Los tokens de Jira SÍ pueden tener "=" y está perfectamente bien.**

Ejemplos de tokens válidos:
- `ATATT3xFfGF0abc123=def456`
- `ATATT3xFfGF0abc123=def456ghi789=`
- `ATATT3xFfGF0abc123=def456=ghi789=`

**No necesitas:**
- ❌ Escapar el "="
- ❌ Quitarlo
- ❌ Reemplazarlo

**Solo cópialo tal cual está** en el JSON.

## 📝 Ejemplo Completo

### En GitHub Secrets:

**Name:** `PROJECTS_CONFIG`

**Secret:**
```json
[
  {
    "projectKey": "OBD",
    "projectName": "OBD Project",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0abc123=def456ghi789="
  }
]
```

**Nota:** El token con "=" está bien, cópialo tal cual.

## 🔍 Verificación

Después de configurar, el workflow debería:
1. Parsear el JSON correctamente
2. Crear clientes de Jira para cada proyecto
3. Sincronizar todos los proyectos

Si hay errores, revisa los logs en GitHub Actions.
