/**
 * Script para probar la extracción de fechas de una épica específica
 * Útil para debuggear qué campos contienen las fechas del timeline
 */

import jiraClient from '../src/clients/jira-client.js';
import { config } from '../src/config.js';
import { logger } from '../src/utils/logger.js';

async function testEpicDates() {
  console.log('\n🔍 Probando extracción de fechas de épicas...\n');

  try {
    // Obtener una épica que sabemos que tiene fechas (según la tabla anterior)
    const epicKey = 'OBD-1'; // Add Data types - tiene start_date y end_date según la tabla
    
    console.log(`📦 Probando épica: ${epicKey}\n`);
    
    // Obtener detalles completos
    const details = await jiraClient.fetchIssueDetails(epicKey);
    
    if (!details || !details.fields) {
      console.log('❌ No se pudieron obtener detalles de la épica');
      return;
    }

    console.log('📋 Todos los campos de la épica:');
    console.log('='.repeat(80));
    
    // Mostrar todos los campos con valores
    const fieldsWithValues = Object.entries(details.fields)
      .filter(([key, value]) => value !== null && value !== undefined && value !== '')
      .sort(([a], [b]) => a.localeCompare(b));
    
    fieldsWithValues.forEach(([key, value]) => {
      const valueStr = typeof value === 'object' 
        ? JSON.stringify(value).substring(0, 100)
        : String(value).substring(0, 100);
      console.log(`${key.padEnd(40)}: ${valueStr}${valueStr.length >= 100 ? '...' : ''}`);
    });

    // Intentar extraer fechas
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Intentando extraer fechas del timeline:');
    console.log('='.repeat(80));
    
    const timelineDates = jiraClient.extractTimelineDates(details.fields);
    console.log('\nResultado:');
    console.log(`  startDate: ${timelineDates.startDate || 'null'}`);
    console.log(`  endDate: ${timelineDates.endDate || 'null'}`);
    
    // Buscar específicamente campos que puedan ser del timeline
    console.log('\n📅 Campos que podrían ser del timeline:');
    const timelineCandidates = [
      'duedate',
      'startdate', 
      'enddate',
      'customfield_10010',
      'customfield_10011',
      'customfield_10015',
      'customfield_10016',
    ];
    
    timelineCandidates.forEach(fieldName => {
      if (details.fields[fieldName]) {
        console.log(`  ${fieldName}: ${details.fields[fieldName]}`);
      }
    });

    // Mostrar nombres de campos personalizados si están disponibles
    if (details.names) {
      console.log('\n📝 Nombres de campos personalizados:');
      Object.entries(details.names)
        .filter(([key]) => key.startsWith('customfield_'))
        .slice(0, 10)
        .forEach(([key, name]) => {
          console.log(`  ${key}: ${name}`);
        });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Análisis completado');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

testEpicDates().catch(console.error);
