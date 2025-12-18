# Configuración de Múltiples Proyectos por Dominio

## 🎯 Escenario Real

Tienes:
- **Múltiples proyectos en goavanto.atlassian.net** (ej: OBD, otro proyecto, etc.)
- **Múltiples proyectos en agiledreamteam.atlassian.net** (ej: ADT, otro proyecto, etc.)
- **Próximamente más proyectos** en ambos dominios

## 📋 Formato de Configuración

El formato JSON soporta **tantos proyectos como necesites**, cada uno con su propia configuración:

```json
[
  {
    "projectKey": "OBD",
    "projectName": "OBD Project",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TOKEN_GOAVANTO"
  },
  {
    "projectKey": "OTRO_PROYECTO_GOAVANTO",
    "projectName": "Otro Proyecto Goavanto",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TOKEN_GOAVANTO"
  },
  {
    "projectKey": "ADT",
    "projectName": "Agile Dream Team",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TOKEN_AGILEDREAMTEAM"
  },
  {
    "projectKey": "OTRO_PROYECTO_ADT",
    "projectName": "Otro Proyecto ADT",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TOKEN_AGILEDREAMTEAM"
  }
]
```

## 🔑 Importante sobre Tokens

**Un solo token por dominio funciona para todos los proyectos de ese dominio.**

Esto significa:
- ✅ **Un token de goavanto.atlassian.net** → sirve para TODOS los proyectos en ese dominio
- ✅ **Un token de agiledreamteam.atlassian.net** → sirve para TODOS los proyectos en ese dominio

**No necesitas un token diferente por proyecto**, solo uno por dominio.

## 📝 Ejemplo Completo

```json
[
  {
    "projectKey": "OBD",
    "projectName": "OBD Project",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0_GOAVANTO_TOKEN"
  },
  {
    "projectKey": "PROYECTO2",
    "projectName": "Segundo Proyecto Goavanto",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0_GOAVANTO_TOKEN"
  },
  {
    "projectKey": "ADT",
    "projectName": "Agile Dream Team",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0_ADT_TOKEN"
  },
  {
    "projectKey": "PROYECTO2_ADT",
    "projectName": "Segundo Proyecto ADT",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "ATATT3xFfGF0_ADT_TOKEN"
  }
]
```

## 🔍 Cómo Encontrar las Claves de Proyecto

### En Jira:

1. Ve a tu proyecto en Jira
2. Mira la URL o el código del proyecto
3. Ejemplos:
   - URL: `https://goavanto.atlassian.net/browse/OBD-123` → Clave: `OBD`
   - URL: `https://agiledreamteam.atlassian.net/browse/ADT-456` → Clave: `ADT`

### O usando la API de Jira:

```bash
# Listar todos los proyectos de un dominio
curl -u email:token https://goavanto.atlassian.net/rest/api/3/project
```

## ✅ Checklist para Agregar un Nuevo Proyecto

1. [ ] Identificar la `projectKey` del proyecto en Jira
2. [ ] Verificar que tengas el token del dominio (si ya lo tienes, reutilízalo)
3. [ ] Agregar el objeto al array JSON en `PROJECTS_CONFIG`
4. [ ] Actualizar el secret en GitHub
5. [ ] Ejecutar el workflow para probar

## 🚀 Agregar Proyectos en el Futuro

Cuando tengas nuevos proyectos:

1. **Obtén la clave del proyecto** (ej: `NUEVO_PROYECTO`)
2. **Identifica el dominio** (goavanto o agiledreamteam)
3. **Usa el token existente** de ese dominio
4. **Agrega al JSON:**

```json
{
  "projectKey": "NUEVO_PROYECTO",
  "projectName": "Nombre del Nuevo Proyecto",
  "jiraDomain": "goavanto.atlassian.net",
  "jiraEmail": "carlos.cedeno@agenticdream.com",
  "jiraApiToken": "TOKEN_EXISTENTE_DE_ESE_DOMINIO"
}
```

5. **Actualiza el secret `PROJECTS_CONFIG` en GitHub**
6. **El sincronizador automáticamente lo incluirá en la próxima ejecución**

## 📊 Resumen

- ✅ **Múltiples proyectos por dominio** → Soportado
- ✅ **Un token por dominio** → Reutilizable para todos los proyectos
- ✅ **Fácil agregar nuevos proyectos** → Solo agregar al JSON
- ✅ **Sin límite de proyectos** → Agrega tantos como necesites
