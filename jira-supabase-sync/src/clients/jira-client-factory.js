/**
 * Factory para crear clientes de Jira para diferentes dominios
 */

import { JiraClient } from './jira-client.js';
import { logger } from '../utils/logger.js';

/**
 * Crea un cliente de Jira para un dominio específico
 * @param {string} domain - Dominio de Jira (ej: 'goavanto.atlassian.net')
 * @param {string} email - Email para autenticación
 * @param {string} apiToken - Token de API
 * @returns {JiraClient} Instancia del cliente
 */
export function createJiraClient(domain, email, apiToken) {
  if (!domain || !email || !apiToken) {
    throw new Error(`❌ Faltan credenciales para Jira: domain=${domain}, email=${email}, token=${apiToken ? '***' : 'missing'}`);
  }
  
  return new JiraClient(domain, email, apiToken);
}

/**
 * Crea clientes de Jira para múltiples proyectos
 * @param {Array} projects - Array de configuraciones de proyectos
 * @returns {Map<string, JiraClient>} Map de projectKey -> JiraClient
 */
export function createJiraClients(projects) {
  const clients = new Map();
  
  projects.forEach(project => {
    try {
      const client = createJiraClient(
        project.jiraDomain,
        project.jiraEmail,
        project.jiraApiToken
      );
      clients.set(project.projectKey, client);
      logger.info(`✅ Cliente Jira creado para ${project.projectKey} (${project.jiraDomain})`);
    } catch (error) {
      logger.error(`❌ Error creando cliente para ${project.projectKey}:`, error.message);
    }
  });
  
  return clients;
}

export default { createJiraClient, createJiraClients };
