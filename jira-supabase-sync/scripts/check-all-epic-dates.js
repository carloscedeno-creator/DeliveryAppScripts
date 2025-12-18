/**
 * Script para verificar qué épicas tienen fechas en customfield_10015 y duedate
 */

import jiraClient from '../src/clients/jira-client.js';
import { config } from '../src/config.js';
import { logger } from '../src/utils/logger.js';

async function checkAllEpicDates() {
  console.log('\n🔍 Verificando fechas en todas las épicas...\n');

  try {
    // Obtener todas las épicas
    const jqlQuery = `project = "${config.sync.projectKey.toUpperCase()}" AND issuetype = Epic ORDER BY updated DESC`;
    const issues = await jiraClient.fetchAllIssues(jqlQuery);

    if (issues.length === 0) {
      console.log('⚠️  No se encontraron épicas');
      return;
    }

    console.log(`📦 Analizando ${issues.length} épicas...\n`);

    const results = [];

    for (const epic of issues) {
      const details = await jiraClient.fetchIssueDetails(epic.key);
      
      if (details && details.fields) {
        const startDateField = details.fields.customfield_10015;
        const dueDate = details.fields.duedate;
        const created = details.fields.created;
        
        const timelineDates = jiraClient.extractTimelineDates(details.fields);
        
        results.push({
          key: epic.key,
          name: epic.fields.summary,
          customfield_10015: startDateField || 'null',
          duedate: dueDate || 'null',
          created: created ? created.split('T')[0] : 'null',
          extracted_start: timelineDates.startDate || 'null',
          extracted_end: timelineDates.endDate || 'null',
        });
      }
      
      // Pequeño delay
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Mostrar resultados
    console.log('='.repeat(120));
    console.log('📊 RESULTADOS DE EXTRACCIÓN DE FECHAS:');
    console.log('='.repeat(120));
    console.log('\n');

    const withCustomStart = results.filter(r => r.customfield_10015 !== 'null');
    const withDueDate = results.filter(r => r.duedate !== 'null');
    const withExtractedDates = results.filter(r => r.extracted_start !== 'null' || r.extracted_end !== 'null');

    console.log(`✅ Épicas con customfield_10015 (Start date): ${withCustomStart.length}`);
    console.log(`✅ Épicas con duedate: ${withDueDate.length}`);
    console.log(`✅ Épicas con fechas extraídas: ${withExtractedDates.length}\n`);

    // Mostrar tabla
    console.log('┌─────────────┬──────────────────────────────────────────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐');
    console.log('│ Key         │ Nombre                                                     │ customfield_10015    │ duedate              │ Extracted Start      │ Extracted End        │');
    console.log('├─────────────┼──────────────────────────────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤');

    results.slice(0, 20).forEach((r, index) => {
      const key = (r.key || '').padEnd(11);
      const name = (r.name || '').substring(0, 58).padEnd(58);
      const cf10015 = (r.customfield_10015 || 'null').substring(0, 20).padEnd(20);
      const due = (r.duedate || 'null').substring(0, 20).padEnd(20);
      const extStart = (r.extracted_start || 'null').substring(0, 20).padEnd(20);
      const extEnd = (r.extracted_end || 'null').substring(0, 20).padEnd(20);
      
      console.log(`│ ${key} │ ${name} │ ${cf10015} │ ${due} │ ${extStart} │ ${extEnd} │`);
      
      if ((index + 1) % 10 === 0 && index < results.length - 1) {
        console.log('├─────────────┼──────────────────────────────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤');
      }
    });

    console.log('└─────────────┴──────────────────────────────────────────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘');

    console.log('\n' + '='.repeat(120));
    console.log('📈 RESUMEN:');
    console.log('='.repeat(120));
    console.log(`\nTotal épicas analizadas: ${results.length}`);
    console.log(`Épicas con customfield_10015: ${withCustomStart.length} (${Math.round(withCustomStart.length/results.length*100)}%)`);
    console.log(`Épicas con duedate: ${withDueDate.length} (${Math.round(withDueDate.length/results.length*100)}%)`);
    console.log(`Épicas con al menos una fecha extraída: ${withExtractedDates.length} (${Math.round(withExtractedDates.length/results.length*100)}%)`);
    
    const withBothExtracted = results.filter(r => r.extracted_start !== 'null' && r.extracted_end !== 'null');
    console.log(`Épicas con ambas fechas extraídas: ${withBothExtracted.length} (${Math.round(withBothExtracted.length/results.length*100)}%)\n`);

  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllEpicDates().catch(console.error);
