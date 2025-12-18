/**
 * Cliente para interactuar con Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

class SupabaseClient {
  constructor() {
    this.client = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
    logger.info('✅ Cliente de Supabase inicializado');
  }

  /**
   * Obtiene o crea un squad (equivalente a proyecto)
   */
  async getOrCreateSquad(squadKey, squadName, jiraDomain) {
    const { data: existing, error: fetchError } = await this.client
      .from('squads')
      .select('id')
      .eq('squad_key', squadKey)
      .single();

    if (existing) {
      logger.debug(`📦 Squad existente: ${squadKey}`);
      return existing.id;
    }

    const { data: newSquad, error: insertError } = await this.client
      .from('squads')
      .insert({
        squad_key: squadKey,
        squad_name: squadName,
        jira_domain: jiraDomain,
        jql_query: config.sync.jqlQuery,
      })
      .select('id')
      .single();

    if (insertError) {
      logger.error(`❌ Error creando squad:`, insertError);
      throw insertError;
    }

    logger.success(`✅ Squad creado: ${squadKey}`);
    return newSquad.id;
  }

  /**
   * Obtiene o crea un proyecto (alias para compatibilidad)
   * @deprecated Usar getOrCreateSquad en su lugar
   */
  async getOrCreateProject(projectKey, projectName, jiraDomain) {
    return this.getOrCreateSquad(projectKey, projectName, jiraDomain);
  }

  /**
   * Obtiene o crea un desarrollador
   */
  async getOrCreateDeveloper(displayName, email = null, jiraAccountId = null) {
    // Buscar por display_name primero
    let { data: existing } = await this.client
      .from('developers')
      .select('id')
      .eq('display_name', displayName)
      .single();

    if (existing) {
      return existing.id;
    }

    // Si no existe, crear
    const { data: newDev, error } = await this.client
      .from('developers')
      .insert({
        display_name: displayName,
        email: email,
        jira_account_id: jiraAccountId,
      })
      .select('id')
      .single();

    if (error) {
      logger.error(`❌ Error creando desarrollador:`, error);
      throw error;
    }

    logger.debug(`✅ Desarrollador creado: ${displayName}`);
    return newDev.id;
  }

  /**
   * Obtiene o crea un epic (initiative) con fechas del timeline
   */
  async getOrCreateEpic(squadId, epicKey, epicName, startDate = null, endDate = null) {
    if (!epicKey || epicKey === 'N/A') return null;

    const { data: existing } = await this.client
      .from('initiatives')
      .select('id, start_date, end_date, squad_id')
      .eq('initiative_key', epicKey)
      .single();

    if (existing) {
      // Actualizar fechas si se proporcionaron y son diferentes
      const updates = {};
      if (startDate && startDate !== existing.start_date) {
        updates.start_date = startDate;
      }
      if (endDate && endDate !== existing.end_date) {
        updates.end_date = endDate;
      }
      // Actualizar squad_id si no está asignado
      if (squadId && !existing.squad_id) {
        updates.squad_id = squadId;
      }
      
      if (Object.keys(updates).length > 0) {
        await this.client
          .from('initiatives')
          .update(updates)
          .eq('id', existing.id);
        
        logger.debug(`✅ Épica actualizada ${epicKey}:`, updates);
      }
      return existing.id;
    }

    // Crear nueva épica con fechas
    const { data: newEpic, error } = await this.client
      .from('initiatives')
      .insert({
        squad_id: squadId,
        initiative_key: epicKey,
        initiative_name: epicName,
        start_date: startDate,
        end_date: endDate,
      })
      .select('id')
      .single();

    if (error) {
      logger.error(`❌ Error creando epic:`, error);
      return null;
    }

    logger.debug(`✅ Épica creada: ${epicKey} con fechas start=${startDate || 'null'}, end=${endDate || 'null'}`);
    return newEpic.id;
  }

  /**
   * Obtiene o crea un sprint
   */
  async getOrCreateSprint(squadId, sprintData) {
    if (!sprintData || !sprintData.name) return null;

    const { data: existing } = await this.client
      .from('sprints')
      .select('id')
      .eq('squad_id', squadId)
      .eq('sprint_name', sprintData.name)
      .single();

    if (existing) {
      // Actualizar si hay cambios
      await this.client
        .from('sprints')
        .update({
          start_date: sprintData.startDate || null,
          end_date: sprintData.endDate || null,
          complete_date: sprintData.completeDate || null,
          state: sprintData.state || null,
          raw_data: sprintData,
        })
        .eq('id', existing.id);

      return existing.id;
    }

    const { data: newSprint, error } = await this.client
      .from('sprints')
      .insert({
        squad_id: squadId,
        sprint_name: sprintData.name,
        sprint_key: sprintData.id?.toString() || null,
        start_date: sprintData.startDate || null,
        end_date: sprintData.endDate || null,
        complete_date: sprintData.completeDate || null,
        state: sprintData.state || null,
        raw_data: sprintData,
      })
      .select('id')
      .single();

    if (error) {
      logger.error(`❌ Error creando sprint:`, error);
      return null;
    }

    return newSprint.id;
  }

  /**
   * Upsert de un issue
   */
  async upsertIssue(squadId, issueData) {
    const { data, error } = await this.client
      .from('issues')
      .upsert({
        squad_id: squadId,
        issue_key: issueData.key,
        issue_type: issueData.issueType,
        summary: issueData.summary,
        assignee_id: issueData.assigneeId,
        priority: issueData.priority,
        current_status: issueData.status,
        current_story_points: issueData.storyPoints || 0,
        resolution: issueData.resolution,
        created_date: issueData.createdDate,
        resolved_date: issueData.resolvedDate,
        updated_date: issueData.updatedDate,
        dev_start_date: issueData.devStartDate,
        dev_close_date: issueData.devCloseDate,
        epic_id: issueData.epicId,
        raw_data: issueData.rawData,
      }, {
        onConflict: 'issue_key',
      })
      .select('id')
      .single();

    if (error) {
      logger.error(`❌ Error upserting issue ${issueData.key}:`, error);
      throw error;
    }

    return data.id;
  }

  /**
   * Obtiene la última sincronización
   */
  async getLastSync(squadId) {
    const { data, error } = await this.client
      .from('data_sync_log')
      .select('sync_completed_at')
      .eq('squad_id', squadId)
      .eq('status', 'completed')
      .order('sync_completed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return new Date(data.sync_completed_at);
  }

  /**
   * Registra una sincronización
   */
  async logSync(squadId, syncType, status, issuesCount = 0, errorMessage = null) {
    const { error } = await this.client
      .from('data_sync_log')
      .insert({
        squad_id: squadId,
        sync_type: syncType,
        sync_started_at: new Date().toISOString(),
        sync_completed_at: status === 'completed' ? new Date().toISOString() : null,
        issues_imported: issuesCount,
        status: status,
        error_message: errorMessage,
      });

    if (error) {
      logger.error(`❌ Error registrando sync log:`, error);
    }
  }
}

export default new SupabaseClient();

