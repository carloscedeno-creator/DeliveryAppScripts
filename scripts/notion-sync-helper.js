/**
 * Helper para sincronizar Notion usando MCP
 * Este script usa las herramientas MCP de Notion para buscar y sincronizar datos
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
 * Extrae issue keys de Jira desde texto
 */
function extractJiraKeys(text) {
  if (!text) return [];
  const pattern = /\b([A-Z]{2,10}-\d+)\b/g;
  const matches = text.match(pattern);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Procesa resultados de búsqueda de Notion y crea mapeos
 */
async function processNotionSearchResults(searchResults, issueKeys) {
  logger.info(`📝 Procesando ${searchResults.length} resultados de Notion...`);
  
  const mappings = [];
  
  for (const result of searchResults) {
    try {
      // Obtener contenido completo de la página
      const pageId = result.id || result.url?.match(/[a-f0-9]{32}/)?.[0];
      if (!pageId) continue;
      
      // Extraer issue keys del contenido
      const content = result.content || '';
      const foundKeys = extractJiraKeys(content);
      
      // También buscar en el título
      const title = result.title || '';
      const titleKeys = extractJiraKeys(title);
      const allKeys = [...new Set([...foundKeys, ...titleKeys])];
      
      if (allKeys.length === 0) continue;
      
      // Crear mapeo para cada key encontrada
      for (const key of allKeys) {
        if (issueKeys.includes(key)) {
          mappings.push({
            issueKey: key,
            notionPageId: pageId,
            notionPageUrl: result.href || result.url,
            notionTitle: title,
            matchType: titleKeys.includes(key) ? 'title' : 'content',
          });
        }
      }
      
    } catch (error) {
      logger.warn(`⚠️  Error procesando resultado: ${error.message}`);
    }
  }
  
  return mappings;
}

/**
 * Guarda datos de Notion en Supabase
 */
async function saveNotionDataToSupabase(notionPages) {
  logger.info(`💾 Guardando ${notionPages.length} páginas de Notion...`);
  
  const inserts = [];
  
  for (const page of notionPages) {
    try {
      const { data, error } = await supabase
        .from('notion_data')
        .insert({
          notion_page_id: page.id,
          notion_database_id: page.database_id || null,
          page_title: page.title || 'Sin título',
          page_type: page.type || 'page',
          raw_data: page.raw || {},
          properties: page.properties || {},
          content: page.content || '',
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error && error.code !== '23505') { // Ignorar duplicados
        logger.warn(`⚠️  Error guardando página ${page.id}: ${error.message}`);
      } else if (data) {
        inserts.push(data);
      }
      
    } catch (error) {
      logger.warn(`⚠️  Error procesando página: ${error.message}`);
    }
  }
  
  logger.success(`✅ ${inserts.length} páginas guardadas`);
  return inserts;
}

/**
 * Crea mapeos automáticos en Supabase
 */
async function createMappingsInSupabase(mappings) {
  logger.info(`🔗 Creando ${mappings.length} mapeos...`);
  
  let created = 0;
  let skipped = 0;
  
  for (const mapping of mappings) {
    try {
      // Buscar issue
      const { data: issue, error: issueError } = await supabase
        .from('issues')
        .select('id')
        .eq('issue_key', mapping.issueKey)
        .single();
      
      if (issueError || !issue) {
        skipped++;
        continue;
      }
      
      // Crear mapeo
      const { error: mappingError } = await supabase
        .from('notion_jira_mapping')
        .insert({
          issue_id: issue.id,
          notion_page_id: mapping.notionPageId,
          notion_page_url: mapping.notionPageUrl,
          mapping_type: 'auto',
          sync_enabled: true,
        });
      
      if (mappingError && mappingError.code !== '23505') {
        logger.warn(`⚠️  Error creando mapeo: ${mappingError.message}`);
      } else {
        created++;
      }
      
    } catch (error) {
      logger.warn(`⚠️  Error procesando mapeo: ${error.message}`);
    }
  }
  
  logger.success(`✅ ${created} mapeos creados, ${skipped} omitidos`);
  return { created, skipped };
}

export { 
  extractJiraKeys, 
  processNotionSearchResults, 
  saveNotionDataToSupabase, 
  createMappingsInSupabase 
};

