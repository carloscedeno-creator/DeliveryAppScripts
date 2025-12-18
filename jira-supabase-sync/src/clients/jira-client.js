/**
 * Cliente para interactuar con Jira API
 */

import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

class JiraClient {
  constructor(domain = null, email = null, apiToken = null) {
    // Permitir pasar parámetros o usar config por defecto
    this.domain = domain || config.jira.domain;
    this.email = email || config.jira.email;
    this.apiToken = apiToken || config.jira.apiToken;
    
    this.baseUrl = `https://${this.domain}`;
    this.auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Accept': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Obtiene todos los issues de Jira usando paginación
   */
  async fetchAllIssues(jqlQuery = null) {
    const query = jqlQuery || config.sync.jqlQuery;
    const fieldsToFetch = [
      'summary',
      'issuetype',
      'status',
      'priority',
      'assignee',
      'resolution',
      'resolutiondate',
      'updated',
      config.jira.storyPointsFieldId,
      config.jira.sprintFieldId,
      'created',
      'parent',
      'changelog',
    ].join(',');

    let allIssues = [];
    let nextPageToken = null;
    let pageCount = 0;

    do {
      try {
        pageCount++;
        logger.info(`📥 Obteniendo página ${pageCount} de issues...`);

        let url = `/rest/api/3/search/jql?jql=${encodeURIComponent(query)}&maxResults=100&fields=${fieldsToFetch}&expand=changelog`;
        
        if (nextPageToken) {
          url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
        }

        const response = await this.client.get(url);
        
        if (response.data.issues && Array.isArray(response.data.issues)) {
          allIssues = allIssues.concat(response.data.issues);
          logger.success(`✅ Página ${pageCount}: ${response.data.issues.length} issues obtenidos (Total: ${allIssues.length})`);
        }

        nextPageToken = response.data.nextPageToken || null;

        // Pequeño delay para evitar rate limits
        if (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        logger.error(`❌ Error obteniendo issues de Jira:`, {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    } while (nextPageToken);

    logger.success(`✅ Total de issues obtenidos: ${allIssues.length}`);
    return allIssues;
  }

  /**
   * Obtiene issues actualizados desde una fecha específica
   */
  async fetchUpdatedIssues(sinceDate) {
    const dateStr = sinceDate.toISOString().split('T')[0];
    const query = `${config.sync.jqlQuery} AND updated >= "${dateStr}"`;
    return this.fetchAllIssues(query);
  }

  /**
   * Obtiene el changelog completo de un issue
   */
  async fetchIssueChangelog(issueKey) {
    try {
      const response = await this.client.get(`/rest/api/3/issue/${issueKey}/changelog?maxResults=100`);
      return response.data;
    } catch (error) {
      logger.warn(`⚠️ Error obteniendo changelog para ${issueKey}:`, error.message);
      return null;
    }
  }

  /**
   * Obtiene los detalles completos de un issue (incluyendo campos personalizados)
   * Útil para obtener fechas del timeline de épicas
   */
  async fetchIssueDetails(issueKey) {
    try {
      // Obtener TODOS los campos usando fields=*all para asegurar que obtenemos todos los campos personalizados
      // expand=names nos da los nombres de los campos personalizados para referencia
      const response = await this.client.get(`/rest/api/3/issue/${issueKey}?fields=*all&expand=names`);
      return response.data;
    } catch (error) {
      logger.warn(`⚠️ Error obteniendo detalles de ${issueKey}:`, error.message);
      return null;
    }
  }

  /**
   * Obtiene datos del timeline/roadmap para una épica
   * Jira puede tener un endpoint específico para el timeline
   */
  async fetchEpicTimeline(epicKey) {
    try {
      // Intentar obtener datos del timeline usando el endpoint de roadmap
      // Nota: Este endpoint puede variar según la versión de Jira
      const response = await this.client.get(`/rest/api/3/issue/${epicKey}?fields=*all`);
      return response.data;
    } catch (error) {
      logger.debug(`⚠️ No se pudo obtener timeline para ${epicKey}:`, error.message);
      return null;
    }
  }

  /**
   * Busca campos de fecha en los campos personalizados de un issue
   * Retorna { startDate, endDate } si se encuentran
   */
  extractTimelineDates(issueFields) {
    if (!issueFields) return { startDate: null, endDate: null };

    let startDate = null;
    let endDate = null;

    // Primero, intentar usar los campos configurados específicamente
    if (config.jira.epicStartDateFieldId && issueFields[config.jira.epicStartDateFieldId]) {
      const value = issueFields[config.jira.epicStartDateFieldId];
      if (typeof value === 'string') {
        startDate = value.split('T')[0]; // Solo la fecha, sin hora
      }
    }

    if (config.jira.epicEndDateFieldId && issueFields[config.jira.epicEndDateFieldId]) {
      const value = issueFields[config.jira.epicEndDateFieldId];
      if (typeof value === 'string') {
        endDate = value.split('T')[0];
      }
    }

    // Si no están configurados, usar campos comunes conocidos
    // customfield_10015 es comúnmente "Start date" en Jira
    if (!startDate && issueFields.customfield_10015) {
      const value = issueFields.customfield_10015;
      if (typeof value === 'string') {
        startDate = value.split('T')[0];
      }
    }

    // Buscar en campos estándar que pueden contener fechas del timeline
    // duedate es comúnmente usado como end_date en épicas
    if (!endDate && issueFields.duedate) {
      const dueDate = issueFields.duedate;
      if (typeof dueDate === 'string') {
        endDate = dueDate.split('T')[0];
      }
    }
    
    // Buscar start_date en campos estándar (puede existir en algunas configuraciones)
    if (!startDate && issueFields.startdate) {
      const value = issueFields.startdate;
      if (typeof value === 'string') {
        startDate = value.split('T')[0];
      }
    }
    
    // Buscar end_date en campos estándar
    if (!endDate && issueFields.enddate) {
      const value = issueFields.enddate;
      if (typeof value === 'string') {
        endDate = value.split('T')[0];
      }
    }
    
    // Fallback: usar created como start_date si no hay otro
    // Esto es útil para épicas que no tienen start_date configurado
    if (!startDate && issueFields.created) {
      const created = issueFields.created;
      if (typeof created === 'string') {
        startDate = created.split('T')[0];
      }
    }

    // Si no se encontraron con los campos configurados, buscar en todos los campos personalizados
    if (!startDate || !endDate) {
      const dateFields = [];
      
      for (const [key, value] of Object.entries(issueFields)) {
        if (key.startsWith('customfield_') && value) {
          let dateValue = null;
          
          // Verificar si es un campo de fecha
          if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            dateValue = value.split('T')[0];
          } else if (value && typeof value === 'object') {
            // Algunos campos de fecha vienen como objetos con propiedades
            if (value.toString && value.toString().match(/\d{4}-\d{2}-\d{2}/)) {
              dateValue = value.toString().split('T')[0];
            }
          }
          
          if (dateValue) {
            dateFields.push({ key, date: dateValue });
          }
        }
      }

      // Ordenar fechas y asignar start/end
      if (dateFields.length > 0) {
        dateFields.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (!startDate && dateFields.length > 0) {
          startDate = dateFields[0].date;
        }
        if (!endDate && dateFields.length > 1) {
          endDate = dateFields[dateFields.length - 1].date;
        } else if (!endDate && dateFields.length === 1) {
          // Si solo hay una fecha, podría ser start o end
          // Por ahora, asumimos que es start
          if (!startDate) {
            startDate = dateFields[0].date;
          }
        }
      }
    }

    return { startDate, endDate };
  }
}

// Exportar tanto la clase como una instancia por defecto
export { JiraClient };
export default new JiraClient();

