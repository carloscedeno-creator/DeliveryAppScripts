/**
 * Funciones de sincronización para múltiples proyectos
 * Versión que acepta proyecto y cliente de Jira como parámetros
 */

import { logger } from '../utils/logger.js';
import supabaseClient from '../clients/supabase-client.js';
import { processIssuesWithClient } from '../processors/issue-processor.js';

/**
 * Sincronización completa para un proyecto específico
 */
export async function fullSyncForProject(project, squadId, jiraClient) {
  const startTime = Date.now();
  logger.info(`🚀 Iniciando sincronización completa para ${project.projectKey}...`);

  try {
    // 1. Registrar inicio de sincronización
    await supabaseClient.logSync(squadId, 'full', 'running', 0);

    // 2. Obtener todos los issues de Jira (incluyendo épicas)
    logger.info(`📥 Obteniendo issues de Jira para ${project.projectKey}...`);
    const jqlQuery = `project = "${project.projectKey.toUpperCase()}" AND issuetype != "Sub-task" ORDER BY created DESC`;
    const jiraIssues = await jiraClient.fetchAllIssues(jqlQuery);

    if (jiraIssues.length === 0) {
      logger.warn(`⚠️ No se encontraron issues en Jira para ${project.projectKey}`);
      await supabaseClient.logSync(squadId, 'full', 'completed', 0);
      return { success: true, issuesProcessed: 0 };
    }

    // 3. Procesar épicas directamente (issues de tipo Epic)
    logger.info(`📦 Procesando épicas directamente para ${project.projectKey}...`);
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
    const { successCount, errorCount } = await processIssuesWithClient(squadId, jiraIssues, jiraClient);

    // 5. Registrar finalización
    await supabaseClient.logSync(squadId, 'full', 'completed', successCount);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success(`✅ Sincronización completa finalizada para ${project.projectKey} en ${duration}s`);
    logger.success(`   📊 Issues procesados: ${successCount} exitosos, ${errorCount} errores`);

    return {
      success: true,
      issuesProcessed: successCount,
      errors: errorCount,
      duration: parseFloat(duration),
    };
  } catch (error) {
    logger.error(`❌ Error durante sincronización completa para ${project.projectKey}:`, error);
    
    // Registrar error
    try {
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
 * Sincronización incremental para un proyecto específico
 */
export async function incrementalSyncForProject(project, squadId, jiraClient) {
  const startTime = Date.now();
  logger.info(`🔄 Iniciando sincronización incremental para ${project.projectKey}...`);

  try {
    // 1. Obtener última sincronización
    const lastSync = await supabaseClient.getLastSync(squadId);
    const sinceDate = lastSync || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Últimos 7 días si no hay sync previa

    logger.info(`📅 Sincronizando cambios desde: ${sinceDate.toISOString()}`);

    // 2. Registrar inicio
    await supabaseClient.logSync(squadId, 'incremental', 'running', 0);

    // 3. Obtener issues actualizados
    const jqlQuery = `project = "${project.projectKey.toUpperCase()}" AND updated >= "${sinceDate.toISOString().split('T')[0]}" AND issuetype != "Sub-task" ORDER BY updated DESC`;
    const jiraIssues = await jiraClient.fetchAllIssues(jqlQuery);

    if (jiraIssues.length === 0) {
      logger.info(`✅ No hay cambios desde la última sincronización para ${project.projectKey}`);
      await supabaseClient.logSync(squadId, 'incremental', 'completed', 0);
      return { success: true, issuesProcessed: 0 };
    }

    // 4. Procesar épicas actualizadas
    const updatedEpics = jiraIssues.filter(issue => 
      issue.fields.issuetype?.name === 'Epic'
    );
    
    if (updatedEpics.length > 0) {
      logger.info(`   Procesando ${updatedEpics.length} épicas actualizadas para ${project.projectKey}...`);
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
    const { successCount, errorCount } = await processIssuesWithClient(squadId, jiraIssues, jiraClient);

    // 6. Registrar finalización
    await supabaseClient.logSync(squadId, 'incremental', 'completed', successCount);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success(`✅ Sincronización incremental finalizada para ${project.projectKey} en ${duration}s`);
    logger.success(`   📊 Issues procesados: ${successCount} exitosos, ${errorCount} errores`);

    return {
      success: true,
      issuesProcessed: successCount,
      errors: errorCount,
      duration: parseFloat(duration),
    };
  } catch (error) {
    logger.error(`❌ Error durante sincronización incremental para ${project.projectKey}:`, error);
    throw error;
  }
}
