# Guía para Clonar tus Proyectos Existentes

## Cómo obtener el Script ID

1. Ve a [script.google.com](https://script.google.com)
2. Abre el proyecto que quieres clonar
3. En la URL verás: `https://script.google.com/home/projects/[SCRIPT_ID]/edit`
4. Copia el `SCRIPT_ID` (es una cadena larga de letras y números)

## Clonar un proyecto

Una vez que tengas el Script ID, ejecuta:

```bash
clasp clone <SCRIPT_ID>
```

Esto creará una carpeta con el nombre del proyecto y descargará todos los archivos.

## Estructura recomendada

Si tienes múltiples proyectos, puedes organizarlos así:

```
GooglescriptsDelivery/
├── proyecto-1/
│   ├── Code.gs
│   └── appsscript.json
├── proyecto-2/
│   ├── Code.gs
│   └── appsscript.json
└── ...
```

## Comandos útiles después de clonar

```bash
# Entrar a la carpeta del proyecto
cd nombre-del-proyecto

# Subir cambios
clasp push

# Descargar cambios desde Google
clasp pull

# Abrir en el editor web
clasp open
```

