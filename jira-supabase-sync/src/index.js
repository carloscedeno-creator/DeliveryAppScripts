/**
 * Entry point del servicio de sincronización
 * Ejecuta sincronización cada 30 minutos
 */

import cron from 'node-cron';
import { logger } from './utils/logger.js';
import { config } from './config.js';
import { fullSync, incrementalSync } from './sync/sync.js';

// Función principal de sincronización
async function runSync() {
  try {
    // Primera vez: sync completa
    // Después: sync incremental
    const supabaseClient = (await import('./clients/supabase-client.js')).default;
    const projectId = await supabaseClient.getOrCreateProject(
      config.sync.projectKey.toUpperCase(),
      config.sync.projectKey.toUpperCase(),
      config.jira.domain
    );
    
    const lastSync = await supabaseClient.getLastSync(projectId);

    if (!lastSync) {
      logger.info('🆕 Primera sincronización: ejecutando sync completa');
      await fullSync();
    } else {
      logger.info('🔄 Sincronización incremental');
      await incrementalSync();
    }
  } catch (error) {
    logger.error('❌ Error en sincronización:', error);
  }
}

// Ejecutar inmediatamente al iniciar
logger.info('🚀 Iniciando servicio de sincronización Jira → Supabase');
logger.info(`⏰ Intervalo: cada ${config.sync.intervalMinutes} minutos`);

runSync();

// Programar ejecución cada X minutos
const cronExpression = `*/${config.sync.intervalMinutes} * * * *`;
logger.info(`📅 Cron configurado: ${cronExpression}`);

cron.schedule(cronExpression, async () => {
  logger.info('⏰ Ejecutando sincronización programada...');
  await runSync();
});

// Mantener el proceso vivo
logger.info('✅ Servicio iniciado. Presiona Ctrl+C para detener.');
process.on('SIGINT', () => {
  logger.info('👋 Deteniendo servicio...');
  process.exit(0);
});

