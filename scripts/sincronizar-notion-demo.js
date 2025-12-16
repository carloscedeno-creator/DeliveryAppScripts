/**
 * Script demo para sincronización de Notion
 * Muestra el comportamiento esperado y estadísticas
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sywkskwkexwwdzrbwinp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTk1OTksImV4cCI6MjA4MTAzNTU5OX0.bv147P9N53qjlt22SJKFMsI3R-Rce179Kev_V_UPMy0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg, err) => console.error(`❌ ${msg}`, err?.message || err),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
};

/**
 * Función principal - Análisis de datos disponibles
 */
async function main() {
  logger.info('🚀 Análisis de sincronización Notion → Supabase');
  logger.info('');
  
  try {
    // 1. Obtener estadísticas de issues
    logger.info('📊 Analizando datos disponibles...');
    logger.info('');
    
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select(`
        issue_key,
        summary,
        initiatives!inner(initiative_name, initiative_type),
        squads!inner(squad_name, squad_key)
      `)
      .limit(1000);
    
    if (issuesError) {
      throw issuesError;
    }
    
    logger.success(`✅ ${issues.length} issues obtenidos`);
    logger.info('');
    
    // 2. Agrupar por squad
    logger.info('📋 Issues por Squad:');
    const bySquad = {};
    issues.forEach(issue => {
      const squad = issue.squads?.squad_name || 'Unknown';
      if (!bySquad[squad]) {
        bySquad[squad] = [];
      }
      bySquad[squad].push(issue);
    });
    
    Object.entries(bySquad).forEach(([squad, squadIssues]) => {
      logger.info(`   ${squad}: ${squadIssues.length} issues`);
    });
    logger.info('');
    
    // 3. Agrupar por iniciativa
    logger.info('📋 Issues por Iniciativa:');
    const byInitiative = {};
    issues.forEach(issue => {
      const initiative = issue.initiatives?.initiative_name || 'Sin iniciativa';
      if (!byInitiative[initiative]) {
        byInitiative[initiative] = [];
      }
      byInitiative[initiative].push(issue);
    });
    
    const sortedInitiatives = Object.entries(byInitiative)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 15);
    
    sortedInitiatives.forEach(([initiative, initIssues]) => {
      logger.info(`   ${initiative}: ${initIssues.length} issues`);
    });
    logger.info('');
    
    // 4. Extraer issue keys únicos
    const issueKeys = [...new Set(issues.map(i => i.issue_key))];
    logger.info(`🔑 ${issueKeys.length} issue keys únicos disponibles`);
    logger.info('');
    
    // 5. Mostrar ejemplos de búsquedas que se harían
    logger.info('🔍 Búsquedas que se realizarían en Notion:');
    logger.info('');
    
    const searchTerms = [
      ...Object.keys(bySquad).slice(0, 5),
      ...sortedInitiatives.slice(0, 10).map(([name]) => name),
      ...issueKeys.slice(0, 20),
    ];
    
    logger.info(`   Total de términos a buscar: ${searchTerms.length}`);
    logger.info('');
    logger.info('   Ejemplos:');
    searchTerms.slice(0, 15).forEach(term => {
      logger.info(`   - "${term}"`);
    });
    logger.info('');
    
    // 6. Mostrar estado actual de sincronización
    logger.info('📊 Estado actual de sincronización:');
    
    const { data: currentMappings } = await supabase
      .from('notion_jira_mapping')
      .select('id');
    
    const { data: notionPages } = await supabase
      .from('notion_data')
      .select('id');
    
    const { data: notionConfig } = await supabase
      .from('notion_config')
      .select('id, is_active');
    
    logger.info(`   Mapeos existentes: ${currentMappings?.length || 0}`);
    logger.info(`   Páginas de Notion: ${notionPages?.length || 0}`);
    logger.info(`   Configuración de Notion: ${notionConfig?.length || 0} (${notionConfig?.[0]?.is_active ? 'activa' : 'inactiva'})`);
    logger.info('');
    
    // 7. Mostrar qué se sincronizaría
    logger.info('💡 Qué se sincronizaría:');
    logger.info('   1. Buscar páginas en Notion que mencionen issue keys');
    logger.info('   2. Guardar datos de páginas en tabla notion_data');
    logger.info('   3. Crear mapeos automáticos en notion_jira_mapping');
    logger.info('   4. Permitir análisis de cobertura (issues con/sin Notion)');
    logger.info('');
    
    // 8. Mostrar algunos issue keys de ejemplo
    logger.info('📋 Ejemplos de issue keys para búsqueda:');
    issueKeys.slice(0, 20).forEach(key => {
      const issue = issues.find(i => i.issue_key === key);
      const summary = issue?.summary?.substring(0, 50) || 'Sin resumen';
      logger.info(`   ${key}: ${summary}...`);
    });
    logger.info('');
    
    // 9. Resumen final
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📈 Resumen:');
    logger.info(`   Total issues: ${issues.length}`);
    logger.info(`   Issue keys únicos: ${issueKeys.length}`);
    logger.info(`   Squads: ${Object.keys(bySquad).length}`);
    logger.info(`   Iniciativas: ${Object.keys(byInitiative).length}`);
    logger.info(`   Mapeos actuales: ${currentMappings?.length || 0}`);
    logger.info('');
    
    logger.info('✅ Análisis completado');
    logger.info('');
    logger.info('📝 Para sincronizar realmente:');
    logger.info('   1. Configurar NOTION_API_TOKEN en Cloudflare Worker');
    logger.info('   2. Configurar NOTION_DATABASE_ID en Cloudflare Worker');
    logger.info('   3. Ejecutar sincronización con credenciales válidas');
    logger.info('');
    
  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
