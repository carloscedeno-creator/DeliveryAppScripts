# DeliveryAppScripts - Proyecto Google Apps Script con Clasp

Este proyecto usa [clasp](https://github.com/google/clasp) para desarrollar Google Apps Script localmente.

## Configuración Inicial

### ✅ 1. Autenticarse con Google (YA COMPLETADO)
```bash
clasp login
```
Ya estás autenticado como: carlos.cedeno@agenticdream.com

### 2. Clonar tus proyectos existentes

Tienes scripts en diversas hojas. Para trabajar con ellos localmente:

**Obtener el Script ID:**
1. Ve a [script.google.com](https://script.google.com)
2. Abre el proyecto que quieres clonar
3. En la URL verás: `https://script.google.com/home/projects/[SCRIPT_ID]/edit`
4. Copia el `SCRIPT_ID`

**Clonar el proyecto:**
```bash
clasp clone <SCRIPT_ID>
```

O usa el script helper:
```powershell
.\clonar-proyecto.ps1 <SCRIPT_ID>
```

**Nota:** Cada proyecto se clonará en su propia carpeta. Puedes trabajar con múltiples proyectos.

### 3. Crear un nuevo proyecto (opcional)
```bash
clasp create --type standalone --title "Mi Proyecto Apps Script"
```

## Comandos Útiles

### Subir código a Google Apps Script
```bash
clasp push
```

### Descargar código desde Google Apps Script
```bash
clasp pull
```

### Abrir el proyecto en el editor web
```bash
clasp open
```

### Ver los logs
```bash
clasp logs
```

### Ejecutar una función
```bash
clasp run <functionName>
```

## Estructura del Proyecto

- `Code.gs` - Archivo principal de código
- `appsscript.json` - Configuración del proyecto Apps Script
- `.clasp.json` - Configuración de clasp (no se sube a Git)

## Desarrollo

1. Edita los archivos `.gs` localmente
2. Usa `clasp push` para subir los cambios
3. Usa `clasp open` para abrir el editor web y probar

