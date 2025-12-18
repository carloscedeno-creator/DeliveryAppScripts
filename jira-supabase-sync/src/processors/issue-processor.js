/**
 * Procesador de issues de Jira
 * Convierte datos de Jira API a formato para Supabase
 */

import { logger } from '../utils/logger.js';
import supabaseClient from '../clients/supabase-client.js';
import jiraClientDefault from '../clients/jira-client.js';
import { config } from '../config.js';

/**
 * Procesa un issue de Jira y lo guarda en Supabase
 */
export async function processIssue(squadId, jiraIssue, jiraClient = null) {
  // Usar el cliente pasado o el por defecto
  const client = jiraClient || jiraClientDefault;
  try {
    const fields = jiraIssue.fields;
    
    // Obtener o crear desarrollador
    let assigneeId = null;
    if (fields.assignee) {
      assigneeId = await supabaseClient.getOrCreateDeveloper(
        fields.assignee.displayName || 'Unassigned',
        fields.assignee.emailAddress || null,
        fields.assignee.accountId || null
      );
    }

    // Obtener o crear epic con fechas del timeline
    let epicId = null;
    if (fields.parent && fields.parent.fields?.issuetype?.name === 'Epic') {
      // Obtener detalles completos de la épica para extraer fechas del timeline
      let epicStartDate = null;
      let epicEndDate = null;
      
      try {
        const epicDetails = await client.fetchIssueDetails(fields.parent.key);
        if (epicDetails && epicDetails.fields) {
          // Intentar extraer fechas del timeline
            const timelineDates = client.extractTimelineDates(epicDetails.fields);
          epicStartDate = timelineDates.startDate;
          epicEndDate = timelineDates.endDate;
          
          logger.debug(`📅 Épica ${fields.parent.key}: start=${epicStartDate || 'null'}, end=${epicEndDate || 'null'}`);
        }
      } catch (error) {
        logger.warn(`⚠️ Error obteniendo fechas de timeline para épica ${fields.parent.key}:`, error.message);
      }
      
      epicId = await supabaseClient.getOrCreateEpic(
        squadId,
        fields.parent.key,
        fields.parent.fields.summary || 'N/A',
        epicStartDate,
        epicEndDate
      );
    }

    // Procesar sprints
    const sprintData = fields[config.jira.sprintFieldId] || [];
    const sprintIds = [];
    
    if (Array.isArray(sprintData) && sprintData.length > 0) {
      for (const sprint of sprintData) {
        const sprintId = await supabaseClient.getOrCreateSprint(squadId, {
          name: sprint.name,
          id: sprint.id,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          completeDate: sprint.completeDate,
          state: sprint.state,
        });
        if (sprintId) sprintIds.push({ sprintId, sprint });
      }
    }

    // Procesar changelog para obtener fechas de desarrollo
    let devStartDate = null;
    let devCloseDate = null;
    const statusHistory = [];

    if (jiraIssue.changelog && jiraIssue.changelog.histories) {
      for (const history of jiraIssue.changelog.histories) {
        for (const item of history.items || []) {
          if (item.field === 'status') {
            statusHistory.push({
              from: item.fromString,
              to: item.toString,
              date: new Date(history.created),
            });

            // Primera transición a "In Progress"
            if (!devStartDate && 
                (item.toString?.toLowerCase().includes('in progress') ||
                 item.toString?.toLowerCase().includes('en progreso'))) {
              devStartDate = new Date(history.created);
            }

            // Primera transición a "Done"
            if (!devCloseDate && 
                (item.toString?.toLowerCase() === 'done' ||
                 item.toString?.toLowerCase() === 'development done')) {
              devCloseDate = new Date(history.created);
            }
          }
        }
      }
    }

    // Preparar datos del issue
    const issueData = {
      key: jiraIssue.key,
      issueType: fields.issuetype?.name || 'Unknown',
      summary: fields.summary || '',
      assigneeId,
      priority: fields.priority?.name || null,
      status: fields.status?.name || 'Unknown',
      storyPoints: fields[config.jira.storyPointsFieldId] || 0,
      resolution: fields.resolution?.name || null,
      createdDate: fields.created ? new Date(fields.created) : null,
      resolvedDate: fields.resolutiondate ? new Date(fields.resolutiondate) : null,
      updatedDate: fields.updated ? new Date(fields.updated) : null,
      devStartDate,
      devCloseDate,
      epicId,
      rawData: jiraIssue,
    };

    // Upsert issue
    const issueId = await supabaseClient.upsertIssue(squadId, issueData);

    // Guardar relación issue-sprints
    if (sprintIds.length > 0) {
      for (const { sprintId, sprint } of sprintIds) {
        // Determinar estado al cierre del sprint
        let statusAtSprintClose = null;
        const sprintCloseDate = sprint.completeDate || sprint.endDate;
        
        if (sprintCloseDate && statusHistory.length > 0) {
          const closeDate = new Date(sprintCloseDate);
          // Buscar el estado más cercano antes del cierre
          for (const status of statusHistory.reverse()) {
            if (status.date <= closeDate) {
              statusAtSprintClose = status.to;
              break;
            }
          }
        }

        // Upsert issue_sprints
        await supabaseClient.client
          .from('issue_sprints')
          .upsert({
            issue_id: issueId,
            sprint_id: sprintId,
            status_at_sprint_close: statusAtSprintClose || fields.status?.name,
            story_points_at_start: issueData.storyPoints, // TODO: calcular SP inicial del sprint
            story_points_at_close: issueData.storyPoints,
          }, {
            onConflict: 'issue_id,sprint_id',
          });
      }
    }

    // Guardar historial de cambios
    if (statusHistory.length > 0) {
      const historyRecords = statusHistory.map(status => ({
        issue_id: issueId,
        field_name: 'status',
        field_type: 'status',
        from_value: status.from,
        to_value: status.to,
        changed_at: status.date.toISOString(),
      }));

      if (historyRecords.length > 0) {
        await supabaseClient.client
          .from('issue_history')
          .upsert(historyRecords, {
            onConflict: 'issue_id,field_name,changed_at',
          });
      }
    }

    return issueId;
  } catch (error) {
    logger.error(`❌ Error procesando issue ${jiraIssue.key}:`, error);
    throw error;
  }
}

/**
 * Procesa múltiples issues en batch
 */
export async function processIssues(squadId, jiraIssues) {
  // Usar el cliente por defecto (backward compatibility)
  const jiraClient = (await import('../clients/jira-client.js')).default;
  return processIssuesWithClient(squadId, jiraIssues, jiraClient);
}

export async function processIssuesWithClient(squadId, jiraIssues, jiraClient) {
  logger.info(`🔄 Procesando ${jiraIssues.length} issues...`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const issue of jiraIssues) {
    try {
      await processIssue(squadId, issue, jiraClient);
      successCount++;
      
      if (successCount % 10 === 0) {
        logger.info(`   ✅ Procesados: ${successCount}/${jiraIssues.length}`);
      }
    } catch (error) {
      errorCount++;
      logger.error(`   ❌ Error en issue ${issue.key}:`, error.message);
    }
  }

  logger.success(`✅ Procesamiento completo: ${successCount} exitosos, ${errorCount} errores`);
  return { successCount, errorCount };
}

