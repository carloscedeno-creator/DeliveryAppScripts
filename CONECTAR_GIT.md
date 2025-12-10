# 🔗 Conectar Repositorio Local con Git Remoto

## 📋 Información Actual

- **Usuario Git:** Carlos Cedeño
- **Email:** carlos.cedeno@agenticdream.com
- **Repositorio local:** ✅ Configurado
- **Repositorio remoto:** ⏳ Pendiente

---

## 🎯 Opción 1: Si YA tienes un repositorio

### Paso 1: Obtener la URL de tu repositorio

**GitHub:**
- Ve a tu repositorio en GitHub
- Click en el botón verde "Code"
- Copia la URL (HTTPS o SSH)

**GitLab:**
- Ve a tu repositorio en GitLab
- Click en "Clone"
- Copia la URL HTTPS

**Bitbucket:**
- Ve a tu repositorio en Bitbucket
- Click en "Clone"
- Copia la URL HTTPS

### Paso 2: Conectar (ejecutar estos comandos)

```bash
# Reemplaza con tu URL real
git remote add origin https://github.com/tu-usuario/tu-repo.git

# Cambiar nombre de rama a 'main' (si tu repo usa 'main' en lugar de 'master')
git branch -M main

# Subir código
git push -u origin main
```

---

## 🆕 Opción 2: Crear un NUEVO repositorio

### GitHub

1. **Crear repositorio:**
   - Ve a: https://github.com/new
   - Nombre: `googlescripts-delivery` (o el que prefieras)
   - Descripción: "Scripts de Google Apps Script para integración Jira-Google Sheets"
   - **NO marques:** "Add a README file", "Add .gitignore", "Choose a license"
   - Click en "Create repository"

2. **Conectar:**
   ```bash
   git remote add origin https://github.com/TU-USUARIO/googlescripts-delivery.git
   git branch -M main
   git push -u origin main
   ```

### GitLab

1. **Crear repositorio:**
   - Ve a: https://gitlab.com/projects/new
   - Nombre: `googlescripts-delivery`
   - Visibilidad: Privado o Público
   - **NO inicialices con README**
   - Click en "Create project"

2. **Conectar:**
   ```bash
   git remote add origin https://gitlab.com/TU-USUARIO/googlescripts-delivery.git
   git branch -M main
   git push -u origin main
   ```

### Bitbucket

1. **Crear repositorio:**
   - Ve a: https://bitbucket.org/repo/create
   - Nombre: `googlescripts-delivery`
   - **NO marques:** "Include a README?"
   - Click en "Create repository"

2. **Conectar:**
   ```bash
   git remote add origin https://bitbucket.org/TU-USUARIO/googlescripts-delivery.git
   git branch -M main
   git push -u origin main
   ```

---

## 🔐 Autenticación

### GitHub
- **HTTPS:** Te pedirá usuario y contraseña (o Personal Access Token)
- **SSH:** Necesitas configurar una clave SSH primero

### Personal Access Token (GitHub)
Si GitHub te pide autenticación:
1. Ve a: https://github.com/settings/tokens
2. Click en "Generate new token (classic)"
3. Selecciona permisos: `repo`
4. Copia el token y úsalo como contraseña

---

## ✅ Verificar Conexión

Después de conectar, verifica:

```bash
# Ver remotos configurados
git remote -v

# Ver estado
git status

# Ver ramas
git branch -a
```

---

## 🚀 Comandos Útiles Después

### Subir cambios
```bash
git add .
git commit -m "Descripción de cambios"
git push
```

### Bajar cambios
```bash
git pull
```

### Ver remotos
```bash
git remote -v
```

---

## ⚠️ Notas Importantes

1. **Primera vez:** GitHub/GitLab pueden pedirte autenticación
2. **Rama:** Algunos servicios usan `main`, otros `master` - ajusta según corresponda
3. **Privacidad:** Puedes crear el repo como privado si prefieres

---

## 🆘 Problemas Comunes

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin TU-URL
```

### Error: "authentication failed"
- Verifica tu usuario/contraseña
- Usa Personal Access Token en GitHub
- Verifica permisos del repositorio

### Error: "branch 'main' does not exist"
```bash
git branch -M master  # Si tu repo usa 'master'
```

