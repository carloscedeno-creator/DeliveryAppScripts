# 📦 Configuración de Git - Proyecto Orderbahn

## ✅ Repositorio Git Inicializado

El repositorio Git ha sido configurado correctamente. Todos los archivos están versionados.

---

## 📋 Archivos en el Repositorio

✅ **Código:**
- `Code.gs` - Script principal con todas las mejoras
- `appsscript.json` - Configuración del proyecto

✅ **Documentación:**
- `README.md` - Documentación principal
- `ANALISIS_CODIGO.md` - Análisis detallado del código
- `MEJORAS_APLICADAS.md` - Resumen de mejoras implementadas
- `CLONAR_PROYECTOS.md` - Guía para clonar proyectos
- `SINCRONIZAR_CAMBIOS.md` - Guía para sincronizar cambios
- `GIT_SETUP.md` - Esta guía

✅ **Scripts:**
- `clonar-proyecto.ps1` - Script helper para clonar proyectos

---

## 🚫 Archivos Excluidos (en .gitignore)

Los siguientes archivos **NO** se suben a Git por seguridad:

- `.clasp.json` - Contiene el Script ID (no crítico, pero mejor no compartirlo)
- `node_modules/` - Dependencias (si las agregas)
- `*.log` - Archivos de log
- Archivos temporales y de sistema

**Nota importante:** El token API ya está protegido en PropertiesService, así que no está en el código.

---

## 🔄 Comandos Git Básicos

### Ver estado del repositorio
```bash
git status
```

### Agregar cambios
```bash
git add .
# O archivos específicos:
git add Code.gs
```

### Hacer commit
```bash
git commit -m "Descripción de los cambios"
```

### Ver historial
```bash
git log
```

### Ver diferencias
```bash
git diff
```

---

## 🌐 Conectar con un Repositorio Remoto

### Opción 1: GitHub

1. **Crear un repositorio en GitHub:**
   - Ve a https://github.com/new
   - Crea un repositorio (público o privado)
   - **NO** inicialices con README, .gitignore o licencia

2. **Conectar tu repositorio local:**
   ```bash
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git branch -M main
   git push -u origin main
   ```

### Opción 2: GitLab

1. **Crear un repositorio en GitLab**
2. **Conectar:**
   ```bash
   git remote add origin https://gitlab.com/tu-usuario/tu-repo.git
   git push -u origin main
   ```

### Opción 3: Bitbucket

1. **Crear un repositorio en Bitbucket**
2. **Conectar:**
   ```bash
   git remote add origin https://bitbucket.org/tu-usuario/tu-repo.git
   git push -u origin main
   ```

---

## 📝 Flujo de Trabajo Recomendado

### 1. Hacer cambios localmente
```bash
# Editar archivos
# Probar cambios
```

### 2. Agregar y commitear
```bash
git add .
git commit -m "Descripción clara de los cambios"
```

### 3. Subir a Google Apps Script
```bash
clasp push
```

### 4. Subir a Git (si tienes remoto)
```bash
git push
```

---

## 🏷️ Buenas Prácticas para Commits

### Mensajes descriptivos:
✅ **Buenos:**
```
git commit -m "Agregar validación de respuestas de API"
git commit -m "Optimizar procesamiento de tickets"
git commit -m "Corregir cálculo de métricas por sprint"
```

❌ **Malos:**
```
git commit -m "cambios"
git commit -m "fix"
git commit -m "update"
```

### Estructura recomendada:
```
git commit -m "Tipo: Descripción breve

Descripción detallada de los cambios:
- Cambio 1
- Cambio 2
- Cambio 3"
```

**Tipos comunes:**
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `refactor:` Refactorización de código
- `docs:` Cambios en documentación
- `perf:` Mejoras de performance
- `security:` Mejoras de seguridad

---

## 🔍 Ver Cambios Específicos

### Ver cambios en un archivo
```bash
git diff Code.gs
```

### Ver cambios de un commit
```bash
git show <commit-hash>
```

### Ver historial de un archivo
```bash
git log Code.gs
```

---

## 🔄 Ramas (Branches)

### Crear una rama para nuevas features
```bash
git checkout -b feature/nueva-funcionalidad
```

### Volver a la rama principal
```bash
git checkout main
```

### Fusionar una rama
```bash
git merge feature/nueva-funcionalidad
```

---

## ⚠️ Importante

1. **Nunca subas el token API** - Ya está protegido en PropertiesService
2. **Revisa .gitignore** antes de hacer commit
3. **Haz commits frecuentes** con mensajes descriptivos
4. **Prueba antes de hacer push** a Google Apps Script

---

## 📊 Estado Actual

✅ Repositorio Git inicializado  
✅ Commit inicial realizado  
✅ .gitignore configurado correctamente  
✅ Listo para conectar con repositorio remoto  

---

## 🆘 Si Algo Sale Mal

### Deshacer cambios no commiteados
```bash
git checkout -- archivo.gs
```

### Deshacer último commit (mantener cambios)
```bash
git reset --soft HEAD~1
```

### Ver ayuda
```bash
git help
git help <comando>
```

