# Configuración de Secrets en GitHub

## 🔑 Nombre de la Variable

La variable en GitHub Secrets se llama:

```
PROJECTS_CONFIG
```

**Exactamente así, en mayúsculas.**

## 📋 Formato del JSON

El JSON debe ser un array con todos tus proyectos. Ejemplo:

```json
[
  {
    "projectKey": "OBD",
    "projectName": "OBD Project",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0abc123=def456"
  },
  {
    "projectKey": "PROYECTO2",
    "projectName": "Segundo Proyecto",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0abc123=def456"
  }
]
```

## ✅ Sobre el Símbolo "=" en los Tokens

**Los tokens de Jira SÍ pueden tener el símbolo "=" y está bien.**

Los tokens de Jira suelen tener este formato:
- `ATATT3xFfGF0abc123=def456ghi789=`
- `ATATT3xFfGF0abc123=def456=ghi789`

**Esto es normal y no causa problemas** porque:
1. El JSON maneja correctamente el símbolo "=" dentro de strings
2. GitHub Secrets también lo maneja correctamente
3. El código parsea el JSON sin problemas

## 📝 Cómo Agregar en GitHub Secrets

### Paso 1: Preparar el JSON

Crea tu JSON con todos los proyectos. Ejemplo:

```json
[
  {
    "projectKey": "OBD",
    "projectName": "OBD Project",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0abc123=def456ghi789="
  },
  {
    "projectKey": "PROYECTO2",
    "projectName": "Segundo Proyecto Goavanto",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0abc123=def456ghi789="
  }
]
```

**Nota:** El token con "=" está bien, no necesitas escaparlo.

### Paso 2: Agregar en GitHub

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click en **"New repository secret"**
4. **Name:** `PROJECTS_CONFIG` (exactamente así)
5. **Secret:** Pega TODO el JSON (puede ser en múltiples líneas o una sola línea)
6. Click en **"Add secret"**

## 🔍 Verificar que Funciona

Después de agregar el secret, puedes verificar en GitHub Actions:

1. Ve a Actions → Jira → Supabase Sync
2. Ejecuta manualmente
3. En los logs deberías ver:
   ```
   ✅ Cliente Jira creado para OBD
   ✅ Cliente Jira creado para PROYECTO2
   ```

Si ves errores de parsing, verifica:
- Que el JSON esté bien formateado
- Que no haya comas extra al final
- Que todas las comillas estén cerradas

## ⚠️ Errores Comunes

### Error: "Error parseando PROJECTS_CONFIG"

**Causa:** JSON mal formateado

**Solución:**
1. Valida tu JSON en: https://jsonlint.com/
2. Verifica que no haya comas extra después del último objeto
3. Verifica que todas las comillas sean dobles (`"` no `'`)

### Error: "Faltan credenciales para Jira"

**Causa:** El token no está en el JSON o está vacío

**Solución:**
1. Verifica que `jiraApiToken` tenga un valor
2. Verifica que copiaste el token completo (incluyendo los "=")
3. Verifica que no haya espacios extra al inicio/fin del token

## 💡 Tips

1. **Puedes pegar el JSON en múltiples líneas** en GitHub Secrets - funciona bien
2. **El símbolo "=" en tokens es normal** - no necesitas escaparlo
3. **Un token por dominio** - reutiliza el mismo token para todos los proyectos del mismo dominio
4. **Valida el JSON antes** - usa https://jsonlint.com/ para asegurarte de que está bien
