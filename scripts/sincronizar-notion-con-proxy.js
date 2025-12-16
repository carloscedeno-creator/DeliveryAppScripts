/**
 * Script para sincronizar Notion usando el proxy de Cloudflare Worker
 * Busca páginas que mencionen issue keys de Jira
 */

import { createClient } from '@supabase/supabase-js';
import { extractJiraKeys, processNotionSearchResults, saveNotionDataToSupabase, createMappingsInSupabase } from './notion-sync-helper.js';

const SUPABASE_URL = 'https://sywkskwkexwwdzrbwinp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTk1OTksImV4cCI6MjA4MTAzNTU5OX0.bv147P9N53qjlt22SJKFMsI3R-Rce179Kev_V_UPMy0';

// Proxy de Cloudflare Worker (si está disponible)
const NOTION_PROXY_URL = 'https://sheets-proxy.carlos-cedeno.workers.dev/notion';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg, err) => console.error(`❌ ${msg}`, err?.message || err),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
};

/**
 * Busca en Notion usando el proxy de Cloudflare Worker
 */
async function searchNotionViaProxy(query) {
  try {
    logger.info(`   🔍 Buscando: "${query}"`);
    
    // Intentar buscar usando el proxy
    const response = await fetch(`${NOTION_PROXY_URL}?action=searchPages&initiativeName=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      logger.warn(`   ⚠️  Error en proxy: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    
    // Convertir resultados a formato esperado
    if (data.results && Array.isArray(data.results)) {
      return data.results.map(page => ({
        id: page.id,
        url: page.url || `https://notion.so/${page.id.replace(/-/g, '')}`,
        title: page.properties?.Initiative?.title?.[0]?.plain_text || 
               page.properties?.Name?.title?.[0]?.plain_text || 
               'Sin título',
        content: JSON.stringify(page.properties || {}),
        highlight: query,
        raw: page,
      }));
    }
    
    return [];
  } catch (error) {
    logger.warn(`   ⚠️  Error buscando "${query}": ${error.message}`);
    return [];
  }
}

/**
 * Función principal de sincronización
 */
async function main() {
  logger.info('🚀 Iniciando sincronización Notion → Supabase (usando proxy)');
  logger.info('');
  
  try {
    // 1. Obtener issue keys de Jira
    logger.info('📋 Obteniendo issue keys de Jira...');
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('issue_key')
      .limit(1000);
    
    if (issuesError) {
      throw issuesError;
    }
    
    const issueKeys = issues.map(i => i.issue_key);
    logger.success(`✅ ${issueKeys.length} issue keys obtenidos`);
    logger.info('');
    
    // 2. Buscar en Notion usando términos clave y algunos issue keys de ejemplo
    logger.info('🔍 Buscando en Notion usando proxy...');
    logger.info('');
    
    const searchTerms = [
      'OBD',
      'ODSO',
      'APM',
      'IN',
      'Product Roadmap',
      'Core Infrastructure',
      'Orderbahn',
    ];
    
    // Agregar algunos issue keys de ejemplo para buscar
    const sampleIssueKeys = issueKeys.slice(0, 20); // Primeros 20 para prueba
    const allSearchTerms = [...searchTerms, ...sampleIssueKeys];
    
    const allResults = [];
    let searchCount = 0;
    
    // Buscar por cada término
    for (const term of allSearchTerms) {
      searchCount++;
      if (searchCount > 30) {
        logger.warn(`   ⚠️  Limité la búsqueda a 30 términos para evitar rate limits`);
        break;
      }
      
      const results = await searchNotionViaProxy(term);
      allResults.push(...results);
      
      // Rate limiting: esperar un poco entre búsquedas
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (results.length > 0) {
        logger.success(`   ✅ Encontradas ${results.length} páginas para "${term}"`);
      }
    }
    
    // Eliminar duplicados por ID
    const uniqueResults = Array.from(
      new Map(allResults.map(r => [r.id, r])).values()
    );
    
    logger.info('');
    logger.info(`   Total de resultados únicos: ${uniqueResults.length}`);
    logger.info('');
    
    if (uniqueResults.length === 0) {
      logger.warn('⚠️  No se encontraron resultados en Notion');
      logger.info('');
      logger.info('💡 Posibles causas:');
      logger.info('   1. El proxy de Notion no está configurado');
      logger.info('   2. No hay páginas que coincidan con los términos de búsqueda');
      logger.info('   3. Las credenciales de Notion no están configuradas en el Worker');
      logger.info('');
      
      // Mostrar estadísticas actuales
      const { data: currentMappings } = await supabase
        .from('notion_jira_mapping')
        .select('id');
      
      const { data: notionPages } = await supabase
        .from('notion_data')
        .select('id');
      
      logger.info('📊 Estado actual:');
      logger.info(`   Mapeos existentes: ${currentMappings?.length || 0}`);
      logger.info(`   Páginas de Notion: ${notionPages?.length || 0}`);
      logger.info(`   Issue keys disponibles: ${issueKeys.length}`);
      logger.info('');
      
      return;
    }
    
    // 3. Procesar resultados y extraer mapeos
    logger.info('🔄 Procesando resultados...');
    const mappings = await processNotionSearchResults(uniqueResults, issueKeys);
    logger.info(`   ${mappings.length} mapeos potenciales encontrados`);
    logger.info('');
    
    if (mappings.length === 0) {
      logger.warn('⚠️  No se encontraron mapeos. Las páginas no mencionan issue keys.');
      logger.info('');
      logger.info('📋 Ejemplos de páginas encontradas:');
      uniqueResults.slice(0, 5).forEach(page => {
        logger.info(`   - ${page.title} (${page.id})`);
      });
      return;
    }
    
    // 4. Guardar datos de Notion
    logger.info('💾 Guardando datos de Notion...');
    const notionPagesToSave = uniqueResults.map(result => ({
      id: result.id,
      url: result.url,
      title: result.title,
      content: result.content || '',
      properties: {},
      raw: result.raw || result,
    }));
    
    const savedPages = await saveNotionDataToSupabase(notionPagesToSave);
    logger.info('');
    
    // 5. Crear mapeos
    logger.info('🔗 Creando mapeos automáticos...');
    const mappingResult = await createMappingsInSupabase(mappings);
    logger.info('');
    
    // 6. Resumen final
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.success('✅ Sincronización completada');
    logger.info(`   📄 Páginas encontradas: ${uniqueResults.length}`);
    logger.info(`   💾 Páginas guardadas: ${savedPages.length}`);
    logger.info(`   🔗 Mapeos creados: ${mappingResult.created}`);
    logger.info(`   ⏭️  Mapeos omitidos: ${mappingResult.skipped}`);
    logger.info('');
    
    // 7. Mostrar algunos mapeos creados
    if (mappingResult.created > 0) {
      logger.info('📋 Ejemplos de mapeos creados:');
      mappings.slice(0, 10).forEach(m => {
        logger.info(`   ${m.issueKey} ↔ ${m.notionTitle.substring(0, 60)}...`);
      });
      if (mappings.length > 10) {
        logger.info(`   ... y ${mappings.length - 10} más`);
      }
      logger.info('');
    }
    
    // 8. Mostrar estadísticas finales
    const { data: finalMappings } = await supabase
      .from('notion_jira_mapping')
      .select('id');
    
    const { data: finalPages } = await supabase
      .from('notion_data')
      .select('id');
    
    logger.info('📊 Estado final:');
    logger.info(`   Total mapeos: ${finalMappings?.length || 0}`);
    logger.info(`   Total páginas: ${finalPages?.length || 0}`);
    logger.info('');
    
  } catch (error) {
    logger.error('❌ Error durante sincronización:', error);
    process.exit(1);
  }
}

main();
