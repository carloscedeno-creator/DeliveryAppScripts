# Arquitectura Completa: Sincronizador vs Dashboard

## 🔄 Flujo Real del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA COMPLETO                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Jira API  │ ◄────── │  Sincronizador │ ──────► │  Supabase   │
│             │         │   (Node.js)    │         │  PostgreSQL │
│             │         │               │         │             │
│             │         │ ⏰ Cada 30 min │         │             │
│             │         │ (automático)  │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                                                         │
                                                         │
                                                         │ SELECT queries
                                                         │ (solo lectura)
                                                         ▼
                                                ┌──────────────┐
                                                │   Dashboard  │
                                                │   (React)    │
                                                │              │
                                                │ 📄 Al cargar │
                                                │   la página  │
                                                └──────────────┘
```

## 📊 Separación de Responsabilidades

### 1. **Sincronizador** (Backend - Servicio Independiente)

**¿Qué hace?**
- Se ejecuta **automáticamente cada 30 minutos** (o según configuración)
- Se conecta a Jira API
- Extrae datos (issues, épicas, sprints, developers)
- **Escribe** datos en Supabase
- Corre en un servidor/hosting externo (Vercel, Railway, etc.)

**¿Cuándo se ejecuta?**
- ✅ Automáticamente cada 30 minutos (cron job)
- ✅ Al iniciar el servicio
- ✅ Manualmente con `npm run sync`
- ❌ **NO** se ejecuta cuando recargas la página del dashboard
- ❌ **NO** depende de usuarios viendo el dashboard

**Ubicación:**
```
jira-supabase-sync/
├── src/
│   ├── index.js          # Entry point con cron job
│   ├── sync/sync.js     # Lógica de sincronización
│   └── ...
```

### 2. **Dashboard** (Frontend - React App)

**¿Qué hace?**
- Se ejecuta en el **navegador del usuario**
- Se conecta a Supabase (solo lectura)
- **Lee** datos de Supabase usando queries SELECT
- Muestra visualizaciones (Gantt, gráficos, tablas)
- **NO** ejecuta sincronizaciones
- **NO** escribe en la base de datos

**¿Cuándo se ejecuta?**
- ✅ Cuando el usuario carga/recarga la página
- ✅ Cuando el usuario cambia de vista
- ✅ Cuando el usuario interactúa con filtros
- ❌ **NO** ejecuta sincronizaciones con Jira
- ❌ **NO** actualiza datos en Supabase

**Ubicación:**
```
delivery-dashboard/
├── src/
│   ├── App.jsx              # Componente principal
│   ├── utils/supabaseApi.js # Solo SELECT queries
│   └── components/         # Vistas del dashboard
```

## 🔍 Flujo Detallado

### Escenario 1: Usuario Recarga la Página del Dashboard

```
1. Usuario abre/recarga dashboard en navegador
   └─> React App se carga

2. App.jsx ejecuta useEffect()
   └─> Llama a loadData()

3. loadData() verifica dataSource
   └─> Si es 'db' → llama a getDeliveryRoadmapData()

4. getDeliveryRoadmapData() (supabaseApi.js)
   └─> Ejecuta SELECT queries en Supabase
   └─> SELECT * FROM initiatives...
   └─> SELECT * FROM issues...
   └─> SELECT * FROM sprints...
   └─> (SOLO LECTURA, NO ESCRITURA)

5. Datos se muestran en el dashboard
   └─> Gantt Chart, tablas, gráficos

❌ NO se ejecuta sincronizador
❌ NO se conecta a Jira
❌ NO se actualizan datos
```

### Escenario 2: Sincronizador Ejecuta Automáticamente

```
1. Cron job se dispara (cada 30 minutos)
   └─> src/index.js detecta el schedule

2. Ejecuta runSync()
   └─> Decide: fullSync() o incrementalSync()

3. fullSync() o incrementalSync()
   └─> Se conecta a Jira API
   └─> Obtiene issues, épicas, sprints
   └─> Extrae fechas del timeline
   └─> INSERT/UPDATE en Supabase

4. Datos actualizados en Supabase
   └─> Tablas: initiatives, issues, sprints, etc.

✅ Sincronización completada
✅ Datos frescos en Supabase
✅ Próxima vez que usuario recargue, verá datos actualizados
```

## ⚠️ Puntos Clave

### ❌ **NO pasa esto:**

```
Usuario recarga página
  └─> Dashboard ejecuta sincronizador
  └─> Se conecta a Jira
  └─> Actualiza Supabase
```

### ✅ **Sí pasa esto:**

```
Usuario recarga página
  └─> Dashboard lee datos de Supabase
  └─> Muestra datos (pueden ser de hace 30 min)

Sincronizador (independiente)
  └─> Corre cada 30 min automáticamente
  └─> Actualiza Supabase
  └─> Próxima recarga del usuario verá datos frescos
```

## 📝 Código del Dashboard (Solo Lectura)

### `src/utils/supabaseApi.js`

```javascript
// ✅ SOLO SELECT queries
export const getDeliveryRoadmapData = async () => {
  // Lee de Supabase
  const { data: initiatives } = await supabase
    .from('initiatives')
    .select('*');
  
  const { data: issues } = await supabase
    .from('issues')
    .select('*');
  
  // NO escribe, NO sincroniza
  return { initiatives, issues };
};
```

### `src/App.jsx`

```javascript
// ✅ Solo lee datos al cargar
useEffect(() => {
  if (dataSource === 'db') {
    loadData(); // Solo llama a getDeliveryRoadmapData()
  }
}, [dataSource]);

// ❌ NO hay código que ejecute sincronizador
// ❌ NO hay código que escriba en Supabase
```

## 🔄 Actualización de Datos

### ¿Cómo se actualizan los datos que ve el usuario?

1. **Sincronizador corre automáticamente** (cada 30 min)
   - Actualiza Supabase con datos de Jira
   - Usuario **NO** necesita hacer nada

2. **Usuario recarga la página**
   - Dashboard lee datos actualizados de Supabase
   - Ve los cambios más recientes

### ¿Qué pasa si el usuario quiere datos más frescos?

**Opción 1: Esperar** (automático)
- El sincronizador actualizará en máximo 30 minutos

**Opción 2: Ejecutar sincronización manual**
```bash
cd jira-supabase-sync
npm run sync
```

**Opción 3: Recargar página después de sync**
- Después de ejecutar sync manual, recargar página
- Verá datos actualizados

## 🎯 Resumen

| Componente | ¿Dónde corre? | ¿Cuándo se ejecuta? | ¿Qué hace? |
|------------|---------------|---------------------|------------|
| **Sincronizador** | Servidor externo | Cada 30 min (automático) | Escribe en Supabase desde Jira |
| **Dashboard** | Navegador del usuario | Al cargar/recargar página | Lee de Supabase (solo lectura) |

**Respuesta directa a tu pregunta:**

> "¿Cada vez que se recarga la página se ejecuta una verificación de los cambios con este sincronizador?"

**NO.** El dashboard solo **lee** datos de Supabase. El sincronizador corre **independientemente** cada 30 minutos en un servidor externo, sin importar si alguien está viendo el dashboard o no.
