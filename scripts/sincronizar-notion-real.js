/**
 * Script real para sincronizar Notion con Jira
 * Usa credenciales de Supabase y sincroniza datos
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
 * Obtiene credenciales de Notion desde Supabase
 */
async function getNotionCredentials() {
  const { data, error } = await supabase
    .from('notion_config')
    .select('notion_api_key, notion_workspace_id, is_active')
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    throw new Error('Notion credentials not found in Supabase. Please configure notion_config table.');
  }
  
  return data;
}

/**
 * Busca en Notion usando la API directamente
 */
async function searchNotionAPI(query, apiToken) {
  try {
    // Usar la API de búsqueda de Notion
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        filter: {
          property: 'object',
          value: 'page'
        },
        page_size: 10
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`   ⚠️  Error en API: ${response.status} - ${errorText.substring(0, 100)}`);
      return [];
    }
    
    const data = await response.json();
    
    // Convertir resultados a formato esperado
    if (data.results && Array.isArray(data.results)) {
      return data.results.map(page => {
        // Extraer título de la página
        let title = 'Sin título';
        if (page.properties) {
          // Buscar propiedad de título (puede variar)
          for (const [key, prop] of Object.entries(page.properties)) {
            if (prop.type === 'title' && prop.title && prop.title.length > 0) {
              title = prop.title.map(t => t.plain_text).join('');
              break;
            }
          }
        }
        
        // Extraer contenido/descripción si está disponible
        let content = '';
        if (page.properties) {
          for (const [key, prop] of Object.entries(page.properties)) {
            if (prop.type === 'rich_text' && prop.rich_text && prop.rich_text.length > 0) {
              content += prop.rich_text.map(t => t.plain_text).join(' ') + ' ';
            }
          }
        }
        
        return {
          id: page.id,
          url: page.url || `https://notion.so/${page.id.replace(/-/g, '')}`,
          title: title,
          content: content.trim(),
          highlight: query,
          raw: page,
        };
      });
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
  logger.info('🚀 Iniciando sincronización Notion → Supabase');
  logger.info('');
  
  try {
    // 1. Obtener credenciales de Notion
    logger.info('🔑 Obteniendo credenciales de Notion...');
    const notionCreds = await getNotionCredentials();
    logger.success('✅ Credenciales obtenidas');
    logger.info('');
    
    // 2. Obtener issue keys de Jira
    logger.info('📋 Obteniendo issue keys de Jira...');
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('issue_key, summary, initiatives!inner(initiative_name), squads!inner(squad_name)')
      .limit(1000);
    
    if (issuesError) {
      throw issuesError;
    }
    
    const issueKeys = issues.map(i => i.issue_key);
    logger.success(`✅ ${issueKeys.length} issue keys obtenidos`);
    logger.info('');
    
    // 3. Buscar en Notion usando términos clave
    logger.info('🔍 Buscando en Notion...');
    logger.info('');
    
    // Obtener términos únicos de iniciativas y squads
    const initiatives = [...new Set(issues.map(i => i.initiatives?.initiative_name).filter(Boolean))];
    const squads = [...new Set(issues.map(i => i.squads?.squad_name).filter(Boolean))];
    
    const searchTerms = [
      ...squads.slice(0, 5),
      ...initiatives.slice(0, 10),
      ...issueKeys.slice(0, 30), // Primeros 30 issue keys
    ];
    
    const allResults = [];
    let searchCount = 0;
    let foundCount = 0;
    
    // Buscar por cada término
    for (const term of searchTerms) {
      searchCount++;
      if (searchCount > 50) {
        logger.warn(`   ⚠️  Limité la búsqueda a 50 términos para evitar rate limits`);
        break;
      }
      
      const results = await searchNotionAPI(term, notionCreds.notion_api_key);
      allResults.push(...results);
      
      if (results.length > 0) {
        foundCount++;
        logger.success(`   ✅ "${term}": ${results.length} páginas encontradas`);
      }
      
      // Rate limiting: Notion permite 3 requests/segundo
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    // Eliminar duplicados por ID
    const uniqueResults = Array.from(
      new Map(allResults.map(r => [r.id, r])).values()
    );
    
    logger.info('');
    logger.info(`   Total de búsquedas: ${searchCount}`);
    logger.info(`   Búsquedas con resultados: ${foundCount}`);
    logger.info(`   Total de páginas únicas: ${uniqueResults.length}`);
    logger.info('');
    
    if (uniqueResults.length === 0) {
      logger.warn('⚠️  No se encontraron resultados en Notion');
      logger.info('');
      logger.info('💡 Posibles causas:');
      logger.info('   1. Las páginas no están compartidas con la integración de Notion');
      logger.info('   2. Los términos de búsqueda no coinciden con el contenido');
      logger.info('   3. La integración no tiene permisos para acceder a las páginas');
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
    
    // 4. Procesar resultados y extraer mapeos
    logger.info('🔄 Procesando resultados...');
    const mappings = await processNotionSearchResults(uniqueResults, issueKeys);
    logger.info(`   ${mappings.length} mapeos potenciales encontrados`);
    logger.info('');
    
    if (mappings.length === 0) {
      logger.warn('⚠️  No se encontraron mapeos. Las páginas no mencionan issue keys.');
      logger.info('');
      logger.info('📋 Ejemplos de páginas encontradas:');
      uniqueResults.slice(0, 10).forEach(page => {
        logger.info(`   - ${page.title} (${page.url})`);
      });
      logger.info('');
      logger.info('💡 Las páginas se guardarán en notion_data pero sin mapeos automáticos.');
      logger.info('');
    }
    
    // 5. Guardar datos de Notion
    logger.info('💾 Guardando datos de Notion...');
    const notionPagesToSave = uniqueResults.map(result => ({
      id: result.id,
      url: result.url,
      title: result.title,
      content: result.content || '',
      properties: result.raw?.properties || {},
      raw: result.raw || result,
    }));
    
    const savedPages = await saveNotionDataToSupabase(notionPagesToSave);
    logger.success(`✅ ${savedPages.length} páginas guardadas`);
    logger.info('');
    
    // 6. Crear mapeos si hay alguno
    if (mappings.length > 0) {
      logger.info('🔗 Creando mapeos automáticos...');
      const mappingResult = await createMappingsInSupabase(mappings);
      logger.success(`✅ ${mappingResult.created} mapeos creados, ${mappingResult.skipped} omitidos`);
      logger.info('');
      
      // Mostrar algunos mapeos creados
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
    }
    
    // 7. Resumen final
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.success('✅ Sincronización completada');
    logger.info(`   📄 Páginas encontradas: ${uniqueResults.length}`);
    logger.info(`   💾 Páginas guardadas: ${savedPages.length}`);
    logger.info(`   🔗 Mapeos creados: ${mappings.length > 0 ? mappings.filter((m, i) => i < 10).length : 0}`);
    logger.info('');
    
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
