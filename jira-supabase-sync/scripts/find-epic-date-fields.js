/**
 * Script para identificar los campos personalizados de fecha en Jira
 * Ayuda a encontrar qué campos contienen start_date y end_date de las épicas
 */

import jiraClient from '../src/clients/jira-client.js';
import { config } from '../src/config.js';
import { logger } from '../src/utils/logger.js';

async function findEpicDateFields() {
  console.log('\n🔍 Buscando campos de fecha en épicas de Jira...\n');

  try {
    // Obtener algunas épicas de ejemplo
    const jqlQuery = `project = "${config.sync.projectKey.toUpperCase()}" AND issuetype = Epic ORDER BY updated DESC`;
    const issues = await jiraClient.fetchAllIssues(jqlQuery);

    if (issues.length === 0) {
      console.log('⚠️  No se encontraron épicas');
      return;
    }

    console.log(`📦 Encontradas ${issues.length} épicas. Analizando campos...\n`);

    // Analizar las primeras 5 épicas
    const epicsToAnalyze = issues.slice(0, 5);
    
    for (const epic of epicsToAnalyze) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Épica: ${epic.key} - ${epic.fields.summary}`);
      console.log('='.repeat(80));
      
      // Obtener detalles completos
      const details = await jiraClient.fetchIssueDetails(epic.key);
      
      if (details && details.fields) {
        console.log('\n📋 Analizando TODOS los campos (no solo personalizados):');
        
        const dateFields = [];
        const allFields = [];
        const potentialDateFields = [];
        
        // Buscar en TODOS los campos
        for (const [key, value] of Object.entries(details.fields)) {
          allFields.push({ key, value, type: typeof value });
          
          // Verificar si es una fecha (string con formato YYYY-MM-DD)
          if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            dateFields.push({ key, value, source: 'string' });
          } 
          // Verificar si es un objeto con fecha
          else if (value && typeof value === 'object' && value !== null) {
            // Algunos campos de fecha vienen como objetos con propiedades
            if (value.toString && value.toString().match(/\d{4}-\d{2}-\d{2}/)) {
              dateFields.push({ key, value: value.toString(), source: 'object.toString' });
            }
            // Buscar propiedades dentro del objeto que puedan ser fechas
            else if (typeof value === 'object') {
              for (const [subKey, subValue] of Object.entries(value)) {
                if (subValue && typeof subValue === 'string' && subValue.match(/^\d{4}-\d{2}-\d{2}/)) {
                  potentialDateFields.push({ 
                    parentKey: key, 
                    subKey, 
                    value: subValue,
                    fullPath: `${key}.${subKey}`
                  });
                }
              }
            }
          }
        }
        
        // También buscar en campos comunes que pueden contener fechas
        const commonDateFields = ['duedate', 'startdate', 'enddate', 'created', 'updated', 'resolutiondate'];
        for (const fieldName of commonDateFields) {
          if (details.fields[fieldName]) {
            potentialDateFields.push({
              parentKey: fieldName,
              subKey: null,
              value: details.fields[fieldName],
              fullPath: fieldName
            });
          }
        }
        
        if (dateFields.length > 0) {
          console.log('\n✅ Campos de fecha encontrados (directos):');
          dateFields.forEach(field => {
            console.log(`  - ${field.key}: ${field.value} (${field.source})`);
          });
        }
        
        if (potentialDateFields.length > 0) {
          console.log('\n✅ Campos potenciales de fecha encontrados:');
          potentialDateFields.forEach(field => {
            console.log(`  - ${field.fullPath}: ${field.value}`);
          });
        }
        
        if (dateFields.length === 0 && potentialDateFields.length === 0) {
          console.log('\n⚠️  No se encontraron campos de fecha');
        }
        
        // Mostrar TODOS los campos para análisis
        console.log(`\n📝 Total de campos: ${allFields.length}`);
        console.log('   Campos relevantes (con valores no-null):');
        allFields
          .filter(f => f.value !== null && f.value !== undefined && f.value !== '')
          .slice(0, 15)
          .forEach(field => {
            const valueStr = typeof field.value === 'object' 
              ? JSON.stringify(field.value).substring(0, 80)
              : String(field.value).substring(0, 80);
            console.log(`     ${field.key}: ${valueStr}${valueStr.length >= 80 ? '...' : ''}`);
          });
      }
      
      // Pequeño delay entre requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMENDACIONES:');
    console.log('='.repeat(80));
    console.log('1. Identifica los campos personalizados que contienen las fechas del timeline');
    console.log('2. Agrega esos field IDs a la configuración (config.js)');
    console.log('3. Actualiza el código para usar esos campos específicos');
    console.log('\n');

  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

findEpicDateFields().catch(console.error);
