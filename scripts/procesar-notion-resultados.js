/**
 * Script para procesar resultados de búsqueda de Notion
 * Extrae issue keys y crea mapeos automáticos
 */

import { createClient } from '@supabase/supabase-js';
import { extractJiraKeys, processNotionSearchResults, saveNotionDataToSupabase, createMappingsInSupabase } from './notion-sync-helper.js';

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
 * Procesa resultados de búsqueda de Notion y sincroniza
 */
async function processNotionResults(notionSearchResults) {
  logger.info('🔄 Procesando resultados de Notion...');
  logger.info('');
  
  try {
    // 1. Obtener issue keys de Supabase
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('issue_key')
      .limit(2000);
    
    if (issuesError) {
      throw issuesError;
    }
    
    const issueKeys = issues.map(i => i.issue_key);
    logger.info(`📋 ${issueKeys.length} issue keys disponibles para mapeo`);
    logger.info('');
    
    // 2. Procesar resultados y extraer mapeos
    const mappings = await processNotionSearchResults(notionSearchResults, issueKeys);
    logger.info(`🔗 ${mappings.length} mapeos potenciales encontrados`);
    logger.info('');
    
    if (mappings.length === 0) {
      logger.warn('⚠️  No se encontraron mapeos. Verifica que las páginas mencionen issue keys.');
      return;
    }
    
    // 3. Preparar datos de Notion para guardar
    const notionPagesToSave = notionSearchResults.map(result => ({
      id: result.id || result.url?.match(/[a-f0-9]{32}/)?.[0],
      url: result.url || result.href,
      title: result.title || 'Sin título',
      content: result.highlight || result.content || '',
      properties: {},
      raw: result,
    }));
    
    // 4. Guardar datos de Notion
    logger.info('💾 Guardando datos de Notion...');
    const savedPages = await saveNotionDataToSupabase(notionPagesToSave);
    logger.info('');
    
    // 5. Crear mapeos
    logger.info('🔗 Creando mapeos automáticos...');
    const mappingResult = await createMappingsInSupabase(mappings);
    logger.info('');
    
    // 6. Resumen
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.success('✅ Sincronización completada');
    logger.info(`   📄 Páginas procesadas: ${notionSearchResults.length}`);
    logger.info(`   💾 Páginas guardadas: ${savedPages.length}`);
    logger.info(`   🔗 Mapeos creados: ${mappingResult.created}`);
    logger.info(`   ⏭️  Mapeos omitidos: ${mappingResult.skipped}`);
    logger.info('');
    
    // 7. Mostrar algunos mapeos creados
    if (mappingResult.created > 0) {
      logger.info('📋 Ejemplos de mapeos creados:');
      mappings.slice(0, 5).forEach(m => {
        logger.info(`   ${m.issueKey} ↔ ${m.notionTitle.substring(0, 50)}...`);
      });
      if (mappings.length > 5) {
        logger.info(`   ... y ${mappings.length - 5} más`);
      }
      logger.info('');
    }
    
  } catch (error) {
    logger.error('❌ Error procesando resultados:', error);
    throw error;
  }
}

/**
 * Analiza cobertura después de sincronización
 */
async function analyzeCoverage() {
  logger.info('📊 Analizando cobertura Notion...');
  logger.info('');
  
  try {
    const { data: coverage, error } = await supabase.rpc('get_notion_coverage');
    
    if (error) {
      throw error;
    }
    
    if (coverage && coverage.length > 0) {
      logger.info('📈 Cobertura por Squad:');
      coverage.forEach(row => {
        const status = row.coverage_percentage >= 50 ? '✅' : '⚠️';
        logger.info(`   ${status} ${row.squad_name}: ${row.issues_with_notion}/${row.total_issues} (${row.coverage_percentage}%)`);
      });
    } else {
      logger.info('   Aún no hay datos de cobertura');
    }
    
    logger.info('');
    
  } catch (error) {
    logger.warn(`⚠️  Error en análisis: ${error.message}`);
  }
}

export { processNotionResults, analyzeCoverage };

// Si se ejecuta directamente, mostrar instrucciones
if (import.meta.url === `file://${process.argv[1]}`) {
  logger.info('📘 Script de procesamiento de resultados de Notion');
  logger.info('');
  logger.info('💡 Uso:');
  logger.info('   1. Busca en Notion usando MCP: notion-search');
  logger.info('   2. Pasa los resultados a processNotionResults()');
  logger.info('   3. Los mapeos se crearán automáticamente');
  logger.info('');
  logger.info('📝 Ejemplo:');
  logger.info('   const results = await notionSearch("OBD-123");');
  logger.info('   await processNotionResults(results);');
  logger.info('   await analyzeCoverage();');
}

