/**
 * Configuración de proyectos/squads a sincronizar
 * Soporta múltiples proyectos de diferentes dominios de Jira
 */

/**
 * Formato de configuración de proyecto:
 * {
 *   projectKey: 'OBD',           // Clave del proyecto en Jira
 *   projectName: 'OBD Project',  // Nombre del proyecto
 *   jiraDomain: 'goavanto.atlassian.net',  // Dominio de Jira
 *   jiraEmail: 'email@ejemplo.com',  // Email para autenticación
 *   jiraApiToken: 'token',  // Token de API (o usar variable de entorno)
 * }
 */

// Obtener proyectos desde variables de entorno o usar configuración por defecto
function getProjectsFromEnv() {
  const projectsEnv = process.env.PROJECTS_CONFIG;
  
  if (projectsEnv) {
    try {
      return JSON.parse(projectsEnv);
    } catch (error) {
      console.error('❌ Error parseando PROJECTS_CONFIG:', error);
      return null;
    }
  }
  
  return null;
}

// Configuración por defecto (si no se usa PROJECTS_CONFIG)
const defaultProjects = [
  {
    projectKey: 'OBD',
    projectName: 'OBD Project',
    jiraDomain: 'goavanto.atlassian.net',
    jiraEmail: process.env.JIRA_EMAIL || 'carlos.cedeno@agenticdream.com',
    jiraApiToken: process.env.JIRA_API_TOKEN,
  },
  // Agregar más proyectos aquí si es necesario
];

// Exportar proyectos configurados
export const projects = getProjectsFromEnv() || defaultProjects;

// Validar que todos los proyectos tengan la configuración necesaria
export function validateProjects() {
  const errors = [];
  
  projects.forEach((project, index) => {
    if (!project.projectKey) {
      errors.push(`Proyecto ${index}: falta projectKey`);
    }
    if (!project.jiraDomain) {
      errors.push(`Proyecto ${index}: falta jiraDomain`);
    }
    if (!project.jiraEmail) {
      errors.push(`Proyecto ${index}: falta jiraEmail`);
    }
    if (!project.jiraApiToken) {
      errors.push(`Proyecto ${index}: falta jiraApiToken`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error(`❌ Errores en configuración de proyectos:\n${errors.join('\n')}`);
  }
  
  return true;
}

export default projects;
