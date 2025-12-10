# 🔐 Configuración del Token API

## ⚠️ Importante

El token API **NO está en el código** por seguridad. Debes configurarlo manualmente la primera vez.

---

## 📋 Pasos para Configurar el Token

### Opción 1: Desde el Editor de Apps Script (Recomendado)

1. **Abre el proyecto en Google Apps Script:**
   ```bash
   clasp open
   ```

2. **Ejecuta la función de configuración:**
   - En el editor, selecciona la función `setupApiToken`
   - En la barra superior, escribe tu token entre comillas: `"tu_token_aqui"`
   - Click en "Ejecutar" o presiona `Ctrl+Enter`

3. **O ejecuta desde la consola:**
   ```javascript
   setupApiToken("tu_token_de_jira_aqui");
   ```

### Opción 2: Desde la Terminal (clasp run)

```bash
# Esto ejecutará setupApiToken con el token
clasp run setupApiToken --params '["tu_token_aqui"]'
```

---

## 🔑 Obtener tu Token de Jira

1. Ve a: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click en "Create API token"
3. Dale un nombre (ej: "Google Apps Script")
4. Copia el token generado
5. Úsalo en `setupApiToken()`

---

## ✅ Verificar que Funciona

Después de configurar el token, prueba ejecutando:

```javascript
// En el editor de Apps Script
getApiToken(); // Debería retornar tu token sin mostrarlo completo
```

O ejecuta el script completo:

```javascript
actualizarTodo_manual();
```

---

## 🔄 Cambiar el Token

Si necesitas cambiar el token:

```javascript
setupApiToken("nuevo_token_aqui");
```

---

## 🛡️ Seguridad

- ✅ El token se guarda en **PropertiesService** (seguro)
- ✅ El token **NO está en el código**
- ✅ El token **NO está en Git**
- ✅ Solo tú puedes acceder al token desde tu cuenta de Google

---

## ⚠️ Si Olvidaste el Token

Si olvidaste el token configurado:

1. Ve a: https://id.atlassian.com/manage-profile/security/api-tokens
2. Revoca el token antiguo
3. Crea uno nuevo
4. Configúralo con `setupApiToken()`

---

## 📝 Notas

- El token se guarda automáticamente en PropertiesService
- No necesitas configurarlo cada vez que ejecutas el script
- El token persiste entre ejecuciones
- Solo se necesita configurar una vez (o cuando lo cambies)

