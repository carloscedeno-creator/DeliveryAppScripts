/**
 * Script para ejecutar una sincronización única
 * Útil para GitHub Actions, Vercel Cron, etc.
 * Soporta múltiples proyectos/squads
 */

import { fullSync, incrementalSync } from './sync/sync.js';
import supabaseClient from './clients/supabase-client.js';
import { projects, validateProjects } from './config/projects.js';
import { createJiraClients } from './clients/jira-client-factory.js';
import { logger } from './utils/logger.js';

async function syncProject(project, jiraClient) {
  try {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`📦 Sincronizando proyecto: ${project.projectKey} (${project.jiraDomain})`);
    logger.info(`${'='.repeat(60)}`);
    
    // Obtener o crear squad
    const squadId = await supabaseClient.getOrCreateSquad(
      project.projectKey.toUpperCase(),
      project.projectName || project.projectKey,
      project.jiraDomain
    );
    
    // Verificar última sincronización
    const lastSync = await supabaseClient.getLastSync(squadId);
    
    // Usar el cliente de Jira específico para este proyecto
    // Necesitamos pasar el cliente a las funciones de sync
    // Por ahora, usamos el método tradicional pero con el cliente correcto
    
    if (!lastSync) {
      logger.info(`🆕 Primera sincronización para ${project.projectKey}: ejecutando sync completa`);
      await fullSyncForProject(project, squadId, jiraClient);
    } else {
      logger.info(`🔄 Sincronización incremental para ${project.projectKey}`);
      await incrementalSyncForProject(project, squadId, jiraClient);
    }
    
    logger.success(`✅ Sincronización completada para ${project.projectKey}`);
    return { success: true, projectKey: project.projectKey };
  } catch (error) {
    logger.error(`❌ Error sincronizando ${project.projectKey}:`, error);
    return { success: false, projectKey: project.projectKey, error: error.message };
  }
}

// Funciones de sync específicas por proyecto
async function fullSyncForProject(project, squadId, jiraClient) {
  const { fullSyncForProject: syncFn } = await import('./sync/sync-multi.js');
  return await syncFn(project, squadId, jiraClient);
}

async function incrementalSyncForProject(project, squadId, jiraClient) {
  const { incrementalSyncForProject: syncFn } = await import('./sync/sync-multi.js');
  return await syncFn(project, squadId, jiraClient);
}

async function runSyncOnce() {
  try {
    logger.info('🚀 Iniciando sincronización para múltiples proyectos...');
    
    // Validar configuración
    validateProjects();
    
    logger.info(`📋 Proyectos a sincronizar: ${projects.length}`);
    projects.forEach(p => {
      logger.info(`   - ${p.projectKey} (${p.jiraDomain})`);
    });
    
    // Crear clientes de Jira para cada proyecto
    const jiraClients = createJiraClients(projects);
    
    // Sincronizar cada proyecto
    const results = [];
    for (const project of projects) {
      const jiraClient = jiraClients.get(project.projectKey);
      if (!jiraClient) {
        logger.error(`❌ No se pudo crear cliente para ${project.projectKey}`);
        results.push({ success: false, projectKey: project.projectKey, error: 'Cliente no disponible' });
        continue;
      }
      
      const result = await syncProject(project, jiraClient);
      results.push(result);
    }
    
    // Resumen
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 RESUMEN DE SINCRONIZACIÓN');
    logger.info('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    logger.success(`✅ Exitosos: ${successful.length}/${results.length}`);
    if (failed.length > 0) {
      logger.error(`❌ Fallidos: ${failed.length}/${results.length}`);
      failed.forEach(f => {
        logger.error(`   - ${f.projectKey}: ${f.error}`);
      });
    }
    
    if (failed.length === 0) {
      logger.success('✅ Todas las sincronizaciones completadas exitosamente');
      process.exit(0);
    } else {
      logger.warn('⚠️ Algunas sincronizaciones fallaron');
      process.exit(1);
    }
  } catch (error) {
    logger.error('❌ Error en sincronización:', error);
    process.exit(1);
  }
}

runSyncOnce();
