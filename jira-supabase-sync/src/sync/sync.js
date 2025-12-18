/**
 * Lógica principal de sincronización
 */

import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import jiraClient from '../clients/jira-client.js';
import supabaseClient from '../clients/supabase-client.js';
import { processIssues } from '../processors/issue-processor.js';

/**
 * Sincronización completa
 */
export async function fullSync() {
  const startTime = Date.now();
  logger.info('🚀 Iniciando sincronización completa...');

  try {
    // 1. Obtener o crear proyecto
    const projectId = await supabaseClient.getOrCreateProject(
      config.sync.projectKey.toUpperCase(),
      config.sync.projectKey.toUpperCase(),
      config.jira.domain
    );

    // 2. Registrar inicio de sincronización
    await supabaseClient.logSync(squadId, 'full', 'running', 0);

    // 3. Obtener todos los issues de Jira (incluyendo épicas)
    logger.info('📥 Obteniendo issues de Jira...');
    const jiraIssues = await jiraClient.fetchAllIssues();

    if (jiraIssues.length === 0) {
      logger.warn('⚠️ No se encontraron issues en Jira');
      await supabaseClient.logSync(squadId, 'full', 'completed', 0);
      return { success: true, issuesProcessed: 0 };
    }

    // 3.5. Procesar épicas directamente (issues de tipo Epic)
    logger.info('📦 Procesando épicas directamente...');
    const epics = jiraIssues.filter(issue => 
      issue.fields.issuetype?.name === 'Epic'
    );
    
    if (epics.length > 0) {
      logger.info(`   Encontradas ${epics.length} épicas para procesar`);
      for (const epic of epics) {
        try {
          // Obtener detalles completos de la épica para extraer fechas
          const epicDetails = await jiraClient.fetchIssueDetails(epic.key);
          let epicStartDate = null;
          let epicEndDate = null;
          
          if (epicDetails && epicDetails.fields) {
            const timelineDates = jiraClient.extractTimelineDates(epicDetails.fields);
            epicStartDate = timelineDates.startDate;
            epicEndDate = timelineDates.endDate;
          }
          
          await supabaseClient.getOrCreateEpic(
            squadId,
            epic.key,
            epic.fields.summary || 'N/A',
            epicStartDate,
            epicEndDate
          );
        } catch (error) {
          logger.warn(`⚠️ Error procesando épica ${epic.key}:`, error.message);
        }
      }
    }

    // 4. Procesar issues
    const { successCount, errorCount } = await processIssues(squadId, jiraIssues);

    // 5. Registrar finalización
    await supabaseClient.logSync(squadId, 'full', 'completed', successCount);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success(`✅ Sincronización completa finalizada en ${duration}s`);
    logger.success(`   📊 Issues procesados: ${successCount} exitosos, ${errorCount} errores`);

    return {
      success: true,
      issuesProcessed: successCount,
      errors: errorCount,
      duration: parseFloat(duration),
    };
  } catch (error) {
    logger.error('❌ Error durante sincronización completa:', error);
    
    // Registrar error
    try {
      const squadId = await supabaseClient.getOrCreateSquad(
        config.sync.projectKey.toUpperCase(),
        config.sync.projectKey.toUpperCase(),
        config.jira.domain
      );
      await supabaseClient.logSync(
        squadId,
        'full',
        'failed',
        0,
        error.message
      );
    } catch (logError) {
      logger.error('❌ Error registrando sync log:', logError);
    }

    throw error;
  }
}

/**
 * Sincronización incremental (solo cambios desde última sync)
 */
export async function incrementalSync() {
  const startTime = Date.now();
  logger.info('🔄 Iniciando sincronización incremental...');

  try {
    // 1. Obtener o crear squad
    const squadId = await supabaseClient.getOrCreateSquad(
      config.sync.projectKey.toUpperCase(),
      config.sync.projectKey.toUpperCase(),
      config.jira.domain
    );

    // 2. Obtener última sincronización
    const lastSync = await supabaseClient.getLastSync(squadId);
    const sinceDate = lastSync || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Últimos 7 días si no hay sync previa

    logger.info(`📅 Sincronizando cambios desde: ${sinceDate.toISOString()}`);

    // 3. Registrar inicio
    await supabaseClient.logSync(squadId, 'incremental', 'running', 0);

    // 4. Obtener issues actualizados
    const jiraIssues = await jiraClient.fetchUpdatedIssues(sinceDate);

    if (jiraIssues.length === 0) {
      logger.info('✅ No hay cambios desde la última sincronización');
      await supabaseClient.logSync(squadId, 'incremental', 'completed', 0);
      return { success: true, issuesProcessed: 0 };
    }

    // 4.5. Procesar épicas actualizadas
    const updatedEpics = jiraIssues.filter(issue => 
      issue.fields.issuetype?.name === 'Epic'
    );
    
    if (updatedEpics.length > 0) {
      logger.info(`   Procesando ${updatedEpics.length} épicas actualizadas...`);
      for (const epic of updatedEpics) {
        try {
          const epicDetails = await jiraClient.fetchIssueDetails(epic.key);
          let epicStartDate = null;
          let epicEndDate = null;
          
          if (epicDetails && epicDetails.fields) {
            const timelineDates = jiraClient.extractTimelineDates(epicDetails.fields);
            epicStartDate = timelineDates.startDate;
            epicEndDate = timelineDates.endDate;
          }
          
          await supabaseClient.getOrCreateEpic(
            squadId,
            epic.key,
            epic.fields.summary || 'N/A',
            epicStartDate,
            epicEndDate
          );
        } catch (error) {
          logger.warn(`⚠️ Error procesando épica ${epic.key}:`, error.message);
        }
      }
    }

    // 5. Procesar issues
    const { successCount, errorCount } = await processIssues(squadId, jiraIssues);

    // 6. Registrar finalización
    await supabaseClient.logSync(squadId, 'incremental', 'completed', successCount);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success(`✅ Sincronización incremental finalizada en ${duration}s`);
    logger.success(`   📊 Issues procesados: ${successCount} exitosos, ${errorCount} errores`);

    return {
      success: true,
      issuesProcessed: successCount,
      errors: errorCount,
      duration: parseFloat(duration),
    };
  } catch (error) {
    logger.error('❌ Error durante sincronización incremental:', error);
    throw error;
  }
}

