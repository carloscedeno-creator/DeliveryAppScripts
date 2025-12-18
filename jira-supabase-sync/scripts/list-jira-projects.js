/**
 * Script para listar todos los proyectos disponibles en Jira
 * Útil para identificar qué proyectos configurar
 */

import { JiraClient } from '../src/clients/jira-client.js';
import { logger } from '../src/utils/logger.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde el directorio raíz del proyecto
dotenv.config({ path: join(__dirname, '..', '.env') });

async function listProjects(domain, email, token) {
  console.log(`\n🔍 Listando proyectos en ${domain}...\n`);
  
  try {
    const client = new JiraClient(domain, email, token);
    
    // Obtener todos los proyectos
    const response = await client.client.get('/rest/api/3/project');
    const projects = response.data;
    
    if (projects.length === 0) {
      console.log('⚠️  No se encontraron proyectos');
      return;
    }
    
    console.log(`📦 Encontrados ${projects.length} proyectos:\n`);
    console.log('┌─────────────┬──────────────────────────────────────────────────────────┬──────────────┐');
    console.log('│ Key         │ Nombre                                                     │ Tipo         │');
    console.log('├─────────────┼──────────────────────────────────────────────────────────┼──────────────┤');
    
    projects.forEach(project => {
      const key = (project.key || '').padEnd(11);
      const name = (project.name || '').substring(0, 58).padEnd(58);
      const type = (project.projectTypeKey || 'unknown').padEnd(12);
      console.log(`│ ${key} │ ${name} │ ${type} │`);
    });
    
    console.log('└─────────────┴──────────────────────────────────────────────────────────┴──────────────┘');
    
    console.log('\n📋 Para usar en PROJECTS_CONFIG:\n');
    projects.forEach(project => {
      console.log(`  {
    "projectKey": "${project.key}",
    "projectName": "${project.name}",
    "jiraDomain": "${domain}",
    "jiraEmail": "${email}",
    "jiraApiToken": "TU_TOKEN_AQUI"
  },`);
    });
    
    console.log('\n');
    
  } catch (error) {
    logger.error(`❌ Error listando proyectos de ${domain}:`, error.message);
    if (error.response) {
      console.error('   Detalles:', error.response.data);
    }
  }
}

async function main() {
  console.log('🚀 Listando proyectos de Jira\n');
  console.log('='.repeat(80));
  
  // Listar proyectos de goavanto
  const goavantoDomain = process.env.JIRA_DOMAIN || 'goavanto.atlassian.net';
  const goavantoEmail = process.env.JIRA_EMAIL || 'carlos.cedeno@agenticdream.com';
  const goavantoToken = process.env.JIRA_API_TOKEN;
  
  if (goavantoToken) {
    await listProjects(goavantoDomain, goavantoEmail, goavantoToken);
  } else {
    console.log('⚠️  JIRA_API_TOKEN no configurado para goavanto');
  }
  
  // Listar proyectos de agiledreamteam
  const adtDomain = 'agiledreamteam.atlassian.net';
  const adtEmail = process.env.JIRA_EMAIL || 'carlos.cedeno@agenticdream.com';
  const adtToken = process.env.ADT_JIRA_API_TOKEN;
  
  if (adtToken) {
    await listProjects(adtDomain, adtEmail, adtToken);
  } else {
    console.log('\n⚠️  ADT_JIRA_API_TOKEN no configurado para agiledreamteam');
    console.log('   Configura ADT_JIRA_API_TOKEN en .env para listar proyectos de ADT\n');
  }
  
  console.log('='.repeat(80));
  console.log('\n💡 TIP: Usa estos projectKeys en tu PROJECTS_CONFIG\n');
}

main().catch(console.error);
