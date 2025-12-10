/**
 * @OnlyCurrentDoc
 *
 * SCRIPT UNIFICADO JIRA - GOOGLE SHEETS (v5 - FULL RESTORE)
 * - Importa datos y procesa historiales.
 * - CORRECCIÓN CRÍTICA 1 (Scope Creep): Tickets nuevos valen 0 SP iniciales.
 * - CORRECCIÓN CRÍTICA 2 (Sprint Activo): Guarda el estatus actual para el sprint activo.
 * - RESTAURACIÓN: Se incluyen todas las funciones de métricas globales y looker studio completas.
 */

// --- MODO DE DEPURACIÓN ---
const DEBUG_MODE = true;

// --- CONFIGURACIÓN REQUERIDA ---
const SHEET_NAME = 'JiraData';
const YOUR_JIRA_DOMAIN = 'goavanto.atlassian.net';
const YOUR_EMAIL = 'carlos.cedeno@agenticdream.com';
// TOKEN - Se almacena en PropertiesService para mayor seguridad
// Para configurar el token por primera vez, ejecuta: setupApiToken()
const JQL_QUERY = 'Project = "obd" AND issuetype != "Sub-task" ORDER BY created DESC';

// --- CONFIGURACIÓN DE PERFORMANCE ---
const CHUNK_SIZE = 500;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// --- CONFIGURACIÓN DE HOJAS ---
const METRICS_SHEET_NAME = 'MetricasSprint';
const DEVELOPER_METRICS_SHEET_NAME = 'MetricasDesarrollador';
const GLOBAL_METRICS_SHEET_NAME = 'MetricasGlobales';
const LOOKER_SPRINTS_SHEET_NAME = 'Data_Looker_Sprints';
const LOOKER_DEVS_SHEET_NAME = 'Data_Looker_Devs';
const LOOKER_EPICS_SHEET_NAME = 'Data_Looker_Epics';
const CAPACITY_SHEET_NAME = 'Data_Capacity_Planning';


// ----------------------------------------------------------------------------
// CONFIGURACIÓN Y SEGURIDAD
// ----------------------------------------------------------------------------

/**
 * Obtiene el token API de Jira desde PropertiesService
 * Si no existe, usa el token por defecto y lo guarda
 * @returns {string} Token API de Jira
 */
function getApiToken() {
  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty('JIRA_API_TOKEN');
  
  if (!token) {
    throw new Error('Token API no configurado. Por favor ejecuta setupApiToken("tu_token_aqui") primero.');
  }
  
  return token;
}

/**
 * Configura el token API manualmente
 * @param {string} token - Nuevo token API
 */
function setupApiToken(token) {
  if (!token) {
    throw new Error('Token no proporcionado');
  }
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('JIRA_API_TOKEN', token);
  Logger.log('Token API actualizado exitosamente');
}

// ----------------------------------------------------------------------------
// VALIDACIONES
// ----------------------------------------------------------------------------

/**
 * Valida la respuesta de la API de Jira
 * @param {Object} data - Datos de respuesta de la API
 * @returns {boolean} True si la respuesta es válida
 * @throws {Error} Si la respuesta es inválida
 */
function validateJiraResponse(data) {
  if (!data) {
    throw new Error('Respuesta de API vacía o nula');
  }
  
  if (typeof data !== 'object') {
    throw new Error('Respuesta de API no es un objeto válido');
  }
  
  // Para respuestas de búsqueda
  if (data.issues !== undefined) {
    if (!Array.isArray(data.issues)) {
      throw new Error('Campo "issues" no es un array válido');
    }
    return true;
  }
  
  return true;
}

/**
 * Valida que un ticket tenga la estructura esperada
 * @param {Object} issue - Ticket de Jira
 * @returns {boolean} True si el ticket es válido
 */
function validateIssue(issue) {
  if (!issue || !issue.key) {
    return false;
  }
  if (!issue.fields) {
    return false;
  }
  return true;
}

// ----------------------------------------------------------------------------
// MANEJO DE ERRORES HTTP
// ----------------------------------------------------------------------------

/**
 * Realiza una petición HTTP con reintentos automáticos
 * @param {string} url - URL a consultar
 * @param {Object} options - Opciones de la petición
 * @param {number} retries - Número de reintentos restantes
 * @returns {Object} Respuesta de UrlFetchApp
 * @throws {Error} Si todos los reintentos fallan
 */
function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  let lastError = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      
      if (statusCode === 200) {
        return response;
      }
      
      // Log del error
      const errorText = response.getContentText();
      Logger.log(`Intento ${attempt + 1}/${retries + 1} - HTTP ${statusCode}: ${errorText.substring(0, 200)}`);
      
      // Errores que no deben reintentarse
      if (statusCode === 401 || statusCode === 403) {
        throw new Error(`Error de autenticación (${statusCode}): Verifica tu token API`);
      }
      
      if (statusCode === 404) {
        throw new Error(`Recurso no encontrado (${statusCode}): Verifica la URL`);
      }
      
      // Para otros errores, reintentar
      if (attempt < retries) {
        Utilities.sleep(RETRY_DELAY_MS * (attempt + 1)); // Backoff exponencial
        continue;
      }
      
      lastError = new Error(`HTTP ${statusCode}: ${errorText.substring(0, 200)}`);
      
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        Logger.log(`Error en intento ${attempt + 1}, reintentando en ${RETRY_DELAY_MS * (attempt + 1)}ms...`);
        Utilities.sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  
  throw lastError || new Error('Error desconocido en petición HTTP');
}

// ----------------------------------------------------------------------------
// FUNCIONES HELPER CENTRALIZADAS
// ----------------------------------------------------------------------------

/**
 * Mapea un estatus de Jira a un estatus objetivo estandarizado
 * @param {string} jiraStatus - Estatus de Jira
 * @returns {string} Estatus objetivo
 */
function mapToTargetStatus(jiraStatus) {
  if (!jiraStatus || jiraStatus === 'N/A (Sin Foto)') return 'QA';
  
  const normStatus = jiraStatus.trim().toLowerCase();
  
  if (normStatus === 'done' || normStatus === 'development done' || 
      normStatus === 'resolved' || normStatus === 'closed' || 
      normStatus === 'finished') return 'Done';
  
  if (normStatus === 'blocked' || normStatus === 'impediment') return 'Blocked';
  
  if (normStatus.includes('in progress') || normStatus === 'in development' || 
      normStatus === 'doing' || normStatus === 'desarrollo') return 'In Progress';
  
  if (normStatus.includes('reopen')) return 'Reopen';
  
  if (normStatus.includes('qa') || normStatus.includes('test') || 
      normStatus.includes('review') || normStatus.includes('staging')) return 'QA';
  
  if (normStatus === 'to do' || normStatus === 'backlog' || 
      normStatus.includes('pendiente')) return 'To Do';
  
  return 'QA'; // Default
}

/**
 * Estatus objetivo estándar
 */
const TARGET_STATUSES = ['To Do', 'Reopen', 'In Progress', 'QA', 'Blocked', 'Done'];

// ----------------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------------

function findFirstChangeToStatus(changelog, targetStatuses) {
  if (!changelog || !changelog.histories || !targetStatuses || targetStatuses.length === 0) return null;
  const normalizedTargetStatuses = targetStatuses.map(s => s.trim().toLowerCase());
  let allMatchingChanges = [];
  changelog.histories.forEach(history => {
    history.items.forEach(item => {
      const itemField = (item.field || '').trim().toLowerCase();
      const itemValue = (item['toString'] || '').trim().toLowerCase();
      if (itemField === 'status' && normalizedTargetStatuses.includes(itemValue)) {
        allMatchingChanges.push(new Date(history.created));
      }
    });
  });
  if (allMatchingChanges.length === 0) return null;
  allMatchingChanges.sort((a, b) => a - b);
  return allMatchingChanges[0];
}

function findHistoryValueAtDate(changelog, fieldNames, targetDate, fallbackValue) {
    if (!changelog || !changelog.histories || !targetDate) return fallbackValue;
    
    const normalizedFields = fieldNames.map(n => n.toLowerCase());
    const targetTime = new Date(targetDate).getTime();
    
    const changes = changelog.histories
        .flatMap(history => history.items.map(item => ({ 
            ...item, 
            created: new Date(history.created).getTime() 
        })))
        .filter(item => item.field && normalizedFields.includes(item.field.toLowerCase()))
        .sort((a, b) => a.created - b.created);

    if (changes.length === 0) return fallbackValue;

    let lastChangeBefore = null;
    for (const change of changes) {
        if (change.created <= targetTime) {
            lastChangeBefore = change;
        } else {
            break;
        }
    }

    if (lastChangeBefore) return lastChangeBefore.toString;

    const firstChange = changes[0];
    if (firstChange.created > targetTime) return firstChange.fromString;

    return fallbackValue;
}

function formatDate(dateInput) {
  if (!dateInput || dateInput === 'N/A') return 'N/A';
  try {
    const date = (typeof dateInput === 'string') ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return 'N/A';
    const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
    const day = ('0' + date.getUTCDate()).slice(-2);
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
  } catch (e) { return 'N/A'; }
}

function calculateTimeInStatus(changelog, createdDateISO, resolvedDateISO, currentStatus) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const now = new Date();
  const createdDate = new Date(createdDateISO);
  if (isNaN(createdDate.getTime())) return 'N/A';

  const statusTimes = {};
  function addStatusTime(statusName, days) {
    if (!statusName || days <= 0) return;
    const normalizedStatus = statusName.trim().toLowerCase();
    if (!statusTimes[normalizedStatus]) {
      statusTimes[normalizedStatus] = { totalDays: 0, displayName: statusName.trim() };
    }
    statusTimes[normalizedStatus].totalDays += days;
  }

  let statusChanges = [];
  if (changelog && changelog.histories && changelog.histories.length > 0) {
    statusChanges = changelog.histories
      .flatMap(history => history.items.map(item => ({ ...item, created: new Date(history.created) })))
      .filter(item => (item.field || '').trim().toLowerCase() === 'status' && item.fromString)
      .sort((a, b) => a.created - b.created);
  }

  let lastStatusDate = createdDate;
  if (statusChanges.length > 0) {
    for (const change of statusChanges) {
      const statusName = change.fromString;
      const changeDate = change.created;
      if (isNaN(changeDate.getTime())) continue;
      const daysInStatus = (changeDate - lastStatusDate) / MS_PER_DAY;
      addStatusTime(statusName, daysInStatus);
      lastStatusDate = changeDate;
    }
  }

  const terminalStatuses = ['closed', 'done', 'resolved', 'canceled'];
  const normalizedCurrentStatus = (currentStatus || '').trim().toLowerCase();
  let endDate;
  if (terminalStatuses.includes(normalizedCurrentStatus)) {
    endDate = new Date(resolvedDateISO);
    if (isNaN(endDate.getTime())) endDate = lastStatusDate;
  } else {
    endDate = now;
  }

  const daysInCurrentStatus = (endDate - lastStatusDate) / MS_PER_DAY;
  if (daysInCurrentStatus > 0) addStatusTime(currentStatus, daysInCurrentStatus);

  return Object.keys(statusTimes)
    .map(key => `${statusTimes[key].displayName}: ${statusTimes[key].totalDays.toFixed(1)}d`)
    .join('; ');
}

function writeDataInChunks(sheet, data) {
  if (!data || data.length === 0) return;
  const totalRows = data.length;
  const numCols = data[0].length;
  
  sheet.getRange(1, 1, 1, numCols).setValues([data[0]]);
  sheet.getRange(1, 1, 1, numCols).setFontWeight('bold');

    if (totalRows > 1) {
    const bodyData = data.slice(1);
    for (let i = 0; i < bodyData.length; i += CHUNK_SIZE) {
      const chunk = bodyData.slice(i, i + CHUNK_SIZE);
      const normalizedChunk = chunk.map(row => {
          while (row.length < numCols) row.push('');
          return row;
      });
      sheet.getRange(2 + i, 1, chunk.length, numCols).setValues(normalizedChunk);
      SpreadsheetApp.flush();
    }
  }
}

// ----------------------------------------------------------------------------
// PROCESAMIENTO DE TICKETS (OPTIMIZACIÓN)
// ----------------------------------------------------------------------------

/**
 * Lee y procesa tickets de la hoja de datos una vez
 * Esta función centraliza el procesamiento para evitar duplicación
 * @returns {Array} Array de tickets procesados
 */
function getProcessedTickets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getSheetByName(SHEET_NAME);
  if (!dataSheet || dataSheet.getLastRow() < 2) return [];
  
  const fullDataRange = dataSheet.getRange(1, 1, dataSheet.getLastRow(), dataSheet.getLastColumn());
  const fullData = fullDataRange.getValues();
  const visibleHeaders = fullData.shift();
  
  const visibleCount = 24;
  const allHeaders = [
    ...visibleHeaders.slice(0, visibleCount),
    'Sprint Raw Data', 'Historical Statuses (JSON)', 'Fecha Inicio Dev ISO',
    'Fecha Cierre Dev ISO', 'Created ISO', 'Resolved ISO', 'Issue Key',
    'Historical SPs (JSON)'
  ];
  
  const tickets = fullData.map(row => {
    let ticket = {};
    allHeaders.forEach((header, i) => { ticket[header] = row[i]; });
    return ticket;
  });
  
  return tickets;
}

// ----------------------------------------------------------------------------
// MENÚ Y TRIGGERS
// ----------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Jira')
    .addItem('Update All (Data and Metrics)', 'actualizarTodo_manual')
    .addToUi();
}

function actualizarTodo_manual() {
  Logger.log('--- STARTING FULL UPDATE (MANUAL) ---');
  runImportAndMetrics();
  Logger.log('--- END OF FULL UPDATE (MANUAL) ---');
}

// ----------------------------------------------------------------------------
// FUNCIÓN PRINCIPAL DE IMPORTACIÓN
// ----------------------------------------------------------------------------

function runImportAndMetrics() {
  Logger.log('--- RUNNING IMPORT AND METRICS ---');
  
  const projectKeyMatch = JQL_QUERY.match(/project\s*=\s*"([^"]+)"/i);
  const projectKey = projectKeyMatch ? projectKeyMatch[1].toUpperCase() : 'Project';

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dataSheet = ss.getSheetByName(SHEET_NAME);
    if (!dataSheet) dataSheet = ss.insertSheet(SHEET_NAME);
    
    const dataFilter = dataSheet.getFilter();
    if (dataFilter) dataFilter.remove();
    dataSheet.clear();

    const STORY_POINTS_FIELD_ID = 'customfield_10016';
    const SPRINT_FIELD_ID = 'customfield_10020';
    
    const headers = [
      'Project', 'Issue Type', 'Key', 'Assignee', 'Priority', 'Status', 'Story point estimate',
      'Sprint History', 'Sprint', 'Summary', 'Epic Name', 'Resolved', 'Resolution',
      'Created', 'Last Update', 'Sprint.startDate', 'Sprint.completeDate', 'Sprint.endDate',
      'Status at Sprint Close',
      'Estatus por Sprint (JSON)',
      'Story Points por Sprint (Inicio) (JSON)',
      'Fecha Inicio Dev', 'Fecha Cierre Dev', 'Historial de Estatus (Días)'
    ];
    dataSheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');

    const fieldsToFetch = ['summary', 'issuetype', 'status', 'priority', 'assignee', 'resolution', 'resolutiondate', 'updated', STORY_POINTS_FIELD_ID, SPRINT_FIELD_ID, 'created', 'parent', 'changelog'].join(',');
    const apiToken = getApiToken(); // Obtener token de forma segura
    const authHeader = 'Basic ' + Utilities.base64Encode(`${YOUR_EMAIL}:${apiToken}`);
    const baseUrl = `https://${YOUR_JIRA_DOMAIN}`;
    const options = {
      'method': 'get',
      'headers': { 'Authorization': authHeader, 'Accept': 'application/json' },
      'muteHttpExceptions': true
    };

    let allIssues = [];
    let nextPageToken = null;

    // Importar datos con manejo de errores mejorado
    do {
      try {
        let queryString = `jql=${encodeURIComponent(JQL_QUERY)}&maxResults=100&fields=${fieldsToFetch}&expand=changelog`;
        if (nextPageToken) {
          queryString += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
        }
        const url = `${baseUrl}/rest/api/3/search/jql?${queryString}`;
        
        // Usar fetchWithRetry para manejo automático de errores
        const response = fetchWithRetry(url, options);
        const data = JSON.parse(response.getContentText());
        
        // Validar respuesta
        validateJiraResponse(data);
        
        if (data.issues && Array.isArray(data.issues)) {
          // Validar cada issue antes de agregarlo
          const validIssues = data.issues.filter(issue => validateIssue(issue));
          allIssues = allIssues.concat(validIssues);
          
          if (DEBUG_MODE && validIssues.length < data.issues.length) {
            Logger.log(`Se filtraron ${data.issues.length - validIssues.length} issues inválidos`);
          }
        }
        
        nextPageToken = data.nextPageToken || null;
        
      } catch (error) {
        Logger.log(`Error al importar datos de Jira: ${error.toString()}`);
        SpreadsheetApp.getUi().alert(`Error al importar datos: ${error.message}`);
        nextPageToken = null; // Detener el loop en caso de error
        break;
      }
    } while (nextPageToken);
    
    if (allIssues.length > 0) {
        const visibleRows = [];
        const rawDataRows = [];

        allIssues.forEach(issue => {
          const fields = issue.fields;
          let sprintHistory = 'N/A';
          let sprintName = 'Backlog';
          const sprintData = fields[SPRINT_FIELD_ID];
          const currentSP = fields[STORY_POINTS_FIELD_ID] || 0;
          
          let sprintStartDate = 'N/A';
          let sprintCompleteDate = 'N/A';
          let sprintEndDate = 'N/A';

          if (sprintData && Array.isArray(sprintData) && sprintData.length > 0) {
            sprintHistory = sprintData.map(sprint => sprint.name).join('; ');
            const activeSprint = sprintData.find(sprint => sprint.state === 'active');
            if (activeSprint) sprintName = activeSprint.name;
            else {
              const lastSprint = sprintData[sprintData.length - 1];
              if (lastSprint) sprintName = lastSprint.name;
            }
            const lastSprintForDates = sprintData[sprintData.length - 1];
            if (lastSprintForDates) {
                sprintStartDate = formatDate(lastSprintForDates.startDate);
                sprintCompleteDate = formatDate(lastSprintForDates.completeDate);
                sprintEndDate = formatDate(lastSprintForDates.endDate);
            }
          }

          let devStartDateObj = null;
          let devCloseDateObj = null;
          let timeInStatusStr = 'N/A (Procesando...)';
          let historicalStatuses = {};
          let historicalSPs = {};
          let lastClosedStatus = 'N/A';

          if (issue.changelog && issue.changelog.histories && issue.changelog.histories.length > 0) {
             if (sprintData && Array.isArray(sprintData) && sprintData.length > 0) {
                sprintData.forEach(sprint => {
                  let fotoDate = null;
                  if (sprint.completeDate) fotoDate = sprint.completeDate;
                  else if (sprint.state === 'closed' && sprint.endDate) fotoDate = sprint.endDate;
                  else if (sprint.endDate && new Date(sprint.endDate) < new Date()) fotoDate = new Date(sprint.endDate);

                  // 1. CAPTURAR ESTATUS HISTÓRICO O ACTUAL (FIX PARA SPRINT ACTIVO)
                  if (fotoDate) {
                    const status = findHistoryValueAtDate(issue.changelog, ['status'], fotoDate, null);
                    if (status) {
                      historicalStatuses[sprint.name] = status;
                      lastClosedStatus = status;
                    } else {
                      historicalStatuses[sprint.name] = 'N/A (Sin Historial)';
                    }
                  } else if (sprint.state === 'active') {
                    // --- FIX CRÍTICO: Si el sprint está activo, guarda el estatus ACTUAL ---
                    historicalStatuses[sprint.name] = fields.status ? fields.status.name : 'N/A';
                  }

                  // 2. CAPTURAR SP INICIALES (FIX SCOPE CREEP)
                  if (sprint.startDate) {
                      const sprintStart = new Date(sprint.startDate);
                      const issueCreated = new Date(fields.created);
                      let spAtStart = 0;
                      if (issueCreated.getTime() > sprintStart.getTime()) {
                          spAtStart = 0; // Creado después del inicio = 0
                      } else {
                          const foundSp = findHistoryValueAtDate(issue.changelog, ['Story Points', 'Story point estimate', 'Puntos de historia'], sprint.startDate, currentSP);
                          spAtStart = foundSp ? Number(foundSp) : 0;
                      }
                      historicalSPs[sprint.name] = spAtStart;
                  }
                });
             }
             
             devStartDateObj = findFirstChangeToStatus(issue.changelog, ['In Progress', 'En Progreso']);
             devCloseDateObj = findFirstChangeToStatus(issue.changelog, ['Done', 'Development Done']);
             
             const createdISO = fields.created;
             const resolvedISO = fields.resolutiondate;
             const currentStatus = fields.status ? fields.status.name : 'N/A';
             timeInStatusStr = calculateTimeInStatus(issue.changelog, createdISO, resolvedISO, currentStatus);
          }

          const keyHyperlink = `=HYPERLINK("https://${YOUR_JIRA_DOMAIN}/browse/${issue.key}","${issue.key}")`;
          const epicName = (fields.parent && fields.parent.fields.issuetype.name === 'Epic') ? fields.parent.fields.summary : 'N/A';
          
          visibleRows.push([
            projectKey,
            fields.issuetype ? fields.issuetype.name : 'N/A',
            keyHyperlink,
            fields.assignee ? fields.assignee.displayName : 'Unassigned',
            fields.priority ? fields.priority.name : 'N/A',
            fields.status ? fields.status.name : 'N/A',
            fields[STORY_POINTS_FIELD_ID] || 0,
            sprintHistory,
            sprintName,
            fields.summary || 'N/A',
            epicName,
            fields.resolutiondate ? formatDate(fields.resolutiondate) : 'N/A',
            fields.resolution ? fields.resolution.name : 'Unresolved',
            fields.created ? formatDate(fields.created) : 'N/A',
            fields.updated ? formatDate(fields.updated) : 'N/A',
            sprintStartDate,
            sprintCompleteDate,
            sprintEndDate,
            lastClosedStatus,
            JSON.stringify(historicalStatuses),
            JSON.stringify(historicalSPs),
            formatDate(devStartDateObj),
            formatDate(devCloseDateObj),
            timeInStatusStr
          ]);

          rawDataRows.push([
            sprintData ? JSON.stringify(sprintData) : '[]',
            JSON.stringify(historicalStatuses),
            devStartDateObj ? devStartDateObj.toISOString() : 'N/A',
            devCloseDateObj ? devCloseDateObj.toISOString() : 'N/A',
            fields.created ? fields.created : 'N/A',
            fields.resolutiondate ? fields.resolutiondate : 'N/A',
            issue.key,
            JSON.stringify(historicalSPs)
          ]);
        });
        
      dataSheet.getRange(2, 1, visibleRows.length, headers.length).setValues(visibleRows);
      
      const rawDataRange = dataSheet.getRange(2, headers.length + 1, rawDataRows.length, 8);
      rawDataRange.setValues(rawDataRows);
      dataSheet.hideColumns(headers.length + 1, 8);
      dataSheet.autoResizeColumns(1, headers.length);
      SpreadsheetApp.flush();
    }
    Logger.log(`Import completed. Imported ${allIssues.length} records.`);
    SpreadsheetApp.flush();

  } catch (e) {
    SpreadsheetApp.getUi().alert('Error during import: ' + e.toString());
  }

  // Procesar métricas usando los datos ya importados
  // Las funciones ahora leen directamente de la hoja para evitar reprocesamiento
  calculateDeveloperMetrics();
  calculateGlobalMetrics();
  generateLookerStudioData();
  generateCapacityPlanningData();
}

// ----------------------------------------------------------------------------
// MÉTRICAS DE DESARROLLADOR
// ----------------------------------------------------------------------------
function calculateDeveloperMetrics() {
  Logger.log('--- STARTING DEVELOPER METRICS CALCULATION ---');
  try {
    // Usar función centralizada para obtener tickets procesados
    const tickets = getProcessedTickets();
    if (tickets.length === 0) return;

    const metricsBySprint = {};
    tickets.forEach(ticket => {
      const sprintField = ticket['Sprint History'] || 'No Sprint';
      const ticketSprints = sprintField.split(';').map(s => s.trim()).filter(s => s);
      ticketSprints.forEach(sprintName => {
        if (!metricsBySprint[sprintName]) metricsBySprint[sprintName] = { tickets: [] };
        metricsBySprint[sprintName].tickets.push(ticket);
      });
    });
    
    const resultRows = [['Sprint', 'Desarrollador', 'Carga de Trabajo (SP Inicial)', 'Velocidad (SP Completados)', 'Tickets Asignados', 'Carryover (SP)', 'Lead Time Promedio (días)']];

    Object.keys(metricsBySprint).forEach(sprintName => {
      const sampleTicket = metricsBySprint[sprintName].tickets.find(t => t['Sprint Raw Data'] && t['Sprint Raw Data'] !== '[]');
      let endDate = new Date(0);
      if(sampleTicket) {
        try {
          const sprintDataArray = JSON.parse(sampleTicket['Sprint Raw Data']);
          const sprintObject = sprintDataArray.find(s => s.name === sprintName);
          if(sprintObject && sprintObject.endDate) endDate = new Date(sprintObject.endDate);
        } catch(e) {}
      }
      metricsBySprint[sprintName].endDate = endDate;
    });

    const sortedSprintNames = Object.keys(metricsBySprint).sort((a, b) => metricsBySprint[b].endDate - metricsBySprint[a].endDate);

    for (const sprintName of sortedSprintNames) {
      const allSprintTickets = metricsBySprint[sprintName].tickets;
      let sprintFotoDate = null;
      const sampleTicket = allSprintTickets.find(t => t['Sprint Raw Data'] && t['Sprint Raw Data'] !== '[]');
      if (sampleTicket) {
        try {
          const sprintDataArray = JSON.parse(sampleTicket['Sprint Raw Data']);
          const sprintObject = sprintDataArray.find(s => s.name === sprintName);
          if (sprintObject) {
            if (sprintObject.completeDate) sprintFotoDate = new Date(sprintObject.completeDate);
            else if (sprintObject.state === 'closed' && sprintObject.endDate) sprintFotoDate = new Date(sprintObject.endDate);
            else if (sprintObject.endDate && new Date(sprintObject.endDate) < new Date()) sprintFotoDate = new Date(sprintObject.endDate);
          }
        } catch(e) {}
      }

      const getStatusForTicket = (ticket) => {
        if (!sprintFotoDate) return ticket['Status'];
        try {
          const historicalStatuses = JSON.parse(ticket['Estatus por Sprint (JSON)']);
          return historicalStatuses[sprintName] || 'N/A (Sin Foto)';
        } catch(e) {
            try {
                const hist = JSON.parse(ticket['Historical Statuses (JSON)']);
                return hist[sprintName] || 'N/A (Sin Foto)';
            } catch (err) { return 'N/A (Error Foto)'; }
        }
      };
      
      const ticketsByDeveloper = allSprintTickets.reduce((acc, t) => {
        const assignee = t.Assignee || 'Unassigned';
        if (!acc[assignee]) acc[assignee] = [];
        acc[assignee].push(t);
        return acc;
      }, {});

      for (const developerName in ticketsByDeveloper) {
        const devTickets = ticketsByDeveloper[developerName];
        
        let workload = 0;
        devTickets.forEach(t => {
            let sp = 0;
            try {
                const spJson = JSON.parse(t['Historical SPs (JSON)']);
                if (spJson.hasOwnProperty(sprintName)) {
                    sp = Number(spJson[sprintName]) || 0;
                } else { sp = 0; }
            } catch (e) { sp = 0; }
            workload += sp;
        });

        const devCompletedTickets = devTickets.filter(t => {
            const status = getStatusForTicket(t);
            return status === 'Done' || status === 'Development Done';
        });
        const velocity = devCompletedTickets.reduce((sum, t) => sum + (Number(t['Story point estimate']) || 0), 0);
        const carryover = workload - velocity;
        const ticketsCount = devTickets.length;
        let devTotalLeadTime = 0;
        let devCompletedTicketsWithDates = 0;
        
        devCompletedTickets.forEach(t => {
          const startDateStr = t['Fecha Inicio Dev ISO'];
          const closeDateStr = t['Fecha Cierre Dev ISO'];
          if (startDateStr !== 'N/A' && closeDateStr !== 'N/A') {
            try {
              const startDate = new Date(startDateStr);
              const closeDate = new Date(closeDateStr);
              const leadTime = (closeDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
              if (leadTime >= 0) {
                devTotalLeadTime += leadTime;
                devCompletedTicketsWithDates++;
              }
            } catch(e) {}
          }
        });
        const devAvgLeadTime = devCompletedTicketsWithDates > 0 ? (devTotalLeadTime / devCompletedTicketsWithDates).toFixed(2) : 'N/A';
        resultRows.push([sprintName, developerName, workload, velocity, ticketsCount, carryover, devAvgLeadTime]);
      }
    }

    let devMetricsSheet = ss.getSheetByName(DEVELOPER_METRICS_SHEET_NAME);
    if (devMetricsSheet) { devMetricsSheet.getFilter()?.remove(); devMetricsSheet.clear(); }
    else { devMetricsSheet = ss.insertSheet(DEVELOPER_METRICS_SHEET_NAME); }
    writeDataInChunks(devMetricsSheet, resultRows);
    devMetricsSheet.autoResizeColumns(1, resultRows[0].length);
  } catch(e) {
    Logger.log('Error Developer Metrics: ' + e.toString());
  }
}

// ----------------------------------------------------------------------------
// MÉTRICAS GLOBALES (RESTAURADA)
// ----------------------------------------------------------------------------
function calculateGlobalMetrics() {
  Logger.log('--- STARTING GLOBAL METRICS CALCULATION ---');
  try {
    // Usar función centralizada para obtener tickets procesados
    const tickets = getProcessedTickets();
    if (tickets.length === 0) return;

    function calculateDaysDiff(startISO, endISO) {
      if (startISO === 'N/A' || endISO === 'N/A') return null;
      try {
        const startDate = new Date(startISO);
        const endDate = new Date(endISO);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
        const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 ? diff : null;
      } catch (e) {
        return null;
      }
    }

    let globalLeadTimeSum = 0;
    let globalLeadTimeCount = 0;
    let globalMTTRSum = 0;
    let globalMTTRCount = 0;
    let globalSPConsumidos = 0;
    let globalWorkload = 0;
    const devMetrics = {};

    function initDevMetrics(assignee) {
      if (!devMetrics[assignee]) {
        devMetrics[assignee] = {
          workload: 0,
          spConsumidos: 0,
          leadTimeSum: 0,
          leadTimeCount: 0,
          mttrSum: 0,
          mttrCount: 0
        };
      }
    }

    tickets.forEach(ticket => {
      const assignee = ticket.Assignee || 'Unassigned';
      initDevMetrics(assignee);

      const sp = Number(ticket['Story point estimate']) || 0;
      const status = ticket['Status'];
      const isCompleted = (status === 'Done' || status === 'Development Done');

      globalWorkload += sp;
      devMetrics[assignee].workload += sp;

      if (isCompleted) {
        globalSPConsumidos += sp;
        devMetrics[assignee].spConsumidos += sp;

        const leadTime = calculateDaysDiff(ticket['Fecha Inicio Dev ISO'], ticket['Fecha Cierre Dev ISO']);
        if (leadTime !== null) {
          globalLeadTimeSum += leadTime;
          globalLeadTimeCount++;
          devMetrics[assignee].leadTimeSum += leadTime;
          devMetrics[assignee].leadTimeCount++;
        }
      }

      if (ticket['Issue Type'] === 'Bug' && (ticket['Resolution'] !== 'Unresolved' || isCompleted)) {
        const mttr = calculateDaysDiff(ticket['Created ISO'], ticket['Resolved ISO']);
        if (mttr !== null) {
          globalMTTRSum += mttr;
          globalMTTRCount++;
          devMetrics[assignee].mttrSum += mttr;
          devMetrics[assignee].mttrCount++;
        }
      }
    });

    const globalSPPorConsumir = globalWorkload - globalSPConsumidos;
    const globalAvgLeadTime = (globalLeadTimeCount > 0) ? (globalLeadTimeSum / globalLeadTimeCount).toFixed(2) : 'N/A';
    const globalAvgMTTR = (globalMTTRCount > 0) ? (globalMTTRSum / globalMTTRCount).toFixed(2) : 'N/A';

    let globalSheet = ss.getSheetByName(GLOBAL_METRICS_SHEET_NAME);
    if (globalSheet) {
      globalSheet.getFilter()?.remove();
      globalSheet.clear();
    } else {
      globalSheet = ss.insertSheet(GLOBAL_METRICS_SHEET_NAME);
    }

    globalSheet.getRange('A1').setValue('Métricas Globales del Equipo').setFontWeight('bold').setFontSize(14);
    const globalRows = [
      ['Métrica', 'Valor'],
      ['Lead Time Promedio (días)', globalAvgLeadTime],
      ['MTTR Promedio (días) (Bugs)', globalAvgMTTR],
      ['SP Consumidos (Velocity)', globalSPConsumidos],
      ['SP por Consumir (Carry-over)', globalSPPorConsumir]
    ];
    globalSheet.getRange(2, 1, globalRows.length, 2).setValues(globalRows);
    globalSheet.getRange(2, 1, 1, 2).setFontWeight('bold');
    globalSheet.getRange(2, 2, globalRows.length - 1, 1).setHorizontalAlignment('right');

    let devRowStart = globalRows.length + 3;
    globalSheet.getRange(devRowStart, 1).setValue('Métricas Globales por Desarrollador').setFontWeight('bold').setFontSize(14);
    devRowStart++;

    const devHeader = ['Desarrollador', 'Lead Time Promedio (días)', 'MTTR Promedio (días) (Bugs)', 'SP Consumidos (Velocity)', 'SP por Consumir (Carry-over)'];
    const devResultRows = [devHeader];

    Object.keys(devMetrics).sort().forEach(devName => {
      const metrics = devMetrics[devName];
      const devSPPorConsumir = metrics.workload - metrics.spConsumidos;
      const devAvgLeadTime = (metrics.leadTimeCount > 0) ? (metrics.leadTimeSum / metrics.leadTimeCount).toFixed(2) : 'N/A';
      const devAvgMTTR = (metrics.mttrCount > 0) ? (metrics.mttrSum / metrics.mttrCount).toFixed(2) : 'N/A';

      devResultRows.push([
        devName,
        devAvgLeadTime,
        devAvgMTTR,
        metrics.spConsumidos,
        devSPPorConsumir
      ]);
    });

    writeDataInChunks(globalSheet, devResultRows);

    globalSheet.autoResizeColumns(1, devHeader.length);
    Logger.log('--- GLOBAL METRICS CALCULATION COMPLETE ---');

  } catch (e) {
    Logger.log('Error during global metrics calculation: ' + e.toString() + ' Stack: ' + e.stack);
  }
}

// ----------------------------------------------------------------------------
// DATA LOOKER STUDIO (RESTAURADA)
// ----------------------------------------------------------------------------
function generateLookerStudioData() {
  Logger.log('--- STARTING LOOKER STUDIO DATA GENERATION ---');
  SpreadsheetApp.flush();
  try {
    // Usar función centralizada para obtener tickets procesados
    const tickets = getProcessedTickets();
    if (tickets.length === 0) return;
    
    const projectKeyMatch = JQL_QUERY.match(/project\s*=\s*"([^"]+)"/i);
    const projectName = projectKeyMatch ? projectKeyMatch[1].toUpperCase() : 'PROJECT';
    
    const sprintHeader = ['Project Name', 'Sprint Name', 'Start Date', 'End Date', ...TARGET_STATUSES, 'Total SP', 'Completed SP', 'Carryover SP', 'Impediments', 'Avg Lead Time', 'Total Tickets', 'Completed Tickets', 'Pending Tickets', 'Completion %', 'Total QA'];
    const devHeader = ['Project Name', 'Sprint Name', 'Developer', ...TARGET_STATUSES, 'Workload (SP)', 'Velocity (SP)', 'Carryover (SP)', 'Tickets Assigned', 'Avg Lead Time', 'Completed Tickets', 'Pending Tickets', 'Completion %', 'Total QA'];
    const epicHeader = ['Project Name', 'Epic Name', ...TARGET_STATUSES, 'Total SP', 'Completed SP', 'Pending SP', 'Total Tickets', 'Avg Lead Time', 'Progress %', 'Completed Tickets', 'Pending Tickets', 'Total QA'];

    const lookerEpicRows = [epicHeader];
    const metricsByEpic = {};
    tickets.forEach(t => { const epic = t['Epic Name'] || 'No Epic'; if (!metricsByEpic[epic]) metricsByEpic[epic] = []; metricsByEpic[epic].push(t); });

    Object.keys(metricsByEpic).forEach(epicName => {
        const epicTickets = metricsByEpic[epicName];
        const epicStatusCounts = {};
        TARGET_STATUSES.forEach(s => epicStatusCounts[s] = 0);
        let totalSP = 0, completedSP = 0, leadTimeSum = 0, leadTimeCount = 0, completedTicketsCount = 0, totalQA = 0;

        epicTickets.forEach(t => {
            const st = mapToTargetStatus(t['Status'] || 'N/A');
            if (epicStatusCounts.hasOwnProperty(st)) epicStatusCounts[st]++;
            if (st === 'QA') totalQA++;
            const sp = Number(t['Story point estimate']) || 0;
            totalSP += sp;
            if (st === 'Done') { completedSP += sp; completedTicketsCount++; }
            const startStr = t['Fecha Inicio Dev ISO'], endStr = t['Fecha Cierre Dev ISO'];
            if (startStr !== 'N/A' && endStr !== 'N/A') {
                  const diff = (new Date(endStr) - new Date(startStr)) / (1000 * 60 * 60 * 24);
                  if (diff >= 0) { leadTimeSum += diff; leadTimeCount++; }
            }
        });
        const avgLeadTime = leadTimeCount > 0 ? (leadTimeSum / leadTimeCount).toFixed(2) : 'N/A';
        const progress = totalSP > 0 ? (completedSP / totalSP) : 0;
        const row = [projectName, epicName];
        TARGET_STATUSES.forEach(s => row.push(epicStatusCounts[s]));
        row.push(totalSP, completedSP, totalSP-completedSP, epicTickets.length, avgLeadTime, progress, completedTicketsCount, epicTickets.length-completedTicketsCount, totalQA);
        lookerEpicRows.push(row);
    });

    const lookerSprintRows = [sprintHeader];
    const lookerDevRows = [devHeader];
    const metricsBySprint = {};
    tickets.forEach(ticket => {
      const sprintField = ticket['Sprint History'] || 'No Sprint';
      const ticketSprints = sprintField.split(';').map(s => s.trim()).filter(s => s);
      ticketSprints.forEach(sprintName => {
        if (!metricsBySprint[sprintName]) metricsBySprint[sprintName] = { tickets: [] };
        metricsBySprint[sprintName].tickets.push(ticket);
      });
    });


    Object.keys(metricsBySprint).forEach(sprintName => {
        const sprintData = metricsBySprint[sprintName];
        const allSprintTickets = sprintData.tickets;
        let sprintFotoDate = null, startDate = 'N/A', endDate = 'N/A';
        const sampleTicket = allSprintTickets.find(t => t['Sprint Raw Data'] && t['Sprint Raw Data'] !== '[]');
        if (sampleTicket) {
            try {
                const sRaw = JSON.parse(sampleTicket['Sprint Raw Data']);
                const sObj = sRaw.find(s => s.name === sprintName);
                if (sObj) {
                    if (sObj.startDate) startDate = new Date(sObj.startDate).toLocaleDateString();
                    if (sObj.endDate) endDate = new Date(sObj.endDate).toLocaleDateString();
                    if (sObj.completeDate) sprintFotoDate = new Date(sObj.completeDate);
                }
            } catch(e) {}
        }

        const getStatus = (t) => {
            if (!sprintFotoDate) return t['Status'];
            try { const h = JSON.parse(t['Estatus por Sprint (JSON)']); return h[sprintName] || 'N/A (Sin Foto)'; }
            catch(e) { return t['Status']; }
        };

        const statusCounts = {}; TARGET_STATUSES.forEach(s => statusCounts[s] = 0);
        let totalSP = 0, completedSP = 0, leadTimeSum = 0, leadTimeCount = 0, impediments = 0, completedTicketsCount = 0, totalQA = 0;

        allSprintTickets.forEach(t => {
            const st = mapToTargetStatus(getStatus(t));
            if (statusCounts.hasOwnProperty(st)) statusCounts[st]++;
            if (st === 'QA') totalQA++;
            const sp = Number(t['Story point estimate']) || 0;
            totalSP += sp;
            if (st === 'Done') { completedSP += sp; completedTicketsCount++; }
            if (st === 'Blocked') impediments++;
            const startStr = t['Fecha Inicio Dev ISO'], endStr = t['Fecha Cierre Dev ISO'];
            if (startStr !== 'N/A' && endStr !== 'N/A') {
                  const diff = (new Date(endStr) - new Date(startStr)) / (1000 * 60 * 60 * 24);
                  if (diff >= 0) { leadTimeSum += diff; leadTimeCount++; }
            }
        });
        const avgLeadTime = leadTimeCount > 0 ? (leadTimeSum / leadTimeCount).toFixed(2) : 'N/A';
        const row = [projectName, sprintName, startDate, endDate];
        TARGET_STATUSES.forEach(s => row.push(statusCounts[s]));
        row.push(totalSP, completedSP, totalSP-completedSP, impediments, avgLeadTime, allSprintTickets.length, completedTicketsCount, allSprintTickets.length-completedTicketsCount, allSprintTickets.length > 0 ? (completedTicketsCount/allSprintTickets.length) : 0, totalQA);
        lookerSprintRows.push(row);

        const ticketsByDev = allSprintTickets.reduce((acc, t) => { const dev = t.Assignee || 'Unassigned'; if (!acc[dev]) acc[dev] = []; acc[dev].push(t); return acc; }, {});
        Object.keys(ticketsByDev).forEach(dev => {
            const devTickets = ticketsByDev[dev];
            const devStatusCounts = {}; TARGET_STATUSES.forEach(s => devStatusCounts[s] = 0);
            let workload = 0, velocity = 0, dLeadSum = 0, dLeadCount = 0, devCompletedCount = 0, devTotalQA = 0;
            devTickets.forEach(t => {
                const st = mapToTargetStatus(getStatus(t));
                if (devStatusCounts.hasOwnProperty(st)) devStatusCounts[st]++;
                if (st === 'QA') devTotalQA++;
                let spInitial = 0;
                try { const spJson = JSON.parse(t['Story Points por Sprint (Inicio) (JSON)']); spInitial = spJson[sprintName] ? Number(spJson[sprintName]) : 0; }
                catch(e) { spInitial = Number(t['Story point estimate']) || 0; }
                workload += spInitial;
                const spCurrent = Number(t['Story point estimate']) || 0;
                if (st === 'Done') { velocity += spCurrent; devCompletedCount++; }
                const startStr = t['Fecha Inicio Dev ISO'], endStr = t['Fecha Cierre Dev ISO'];
                if (startStr !== 'N/A' && endStr !== 'N/A') {
                      const diff = (new Date(endStr) - new Date(startStr)) / (1000 * 60 * 60 * 24);
                      if (diff >= 0) { dLeadSum += diff; dLeadCount++; }
                }
            });
            const dAvgLead = dLeadCount > 0 ? (dLeadSum / dLeadCount).toFixed(2) : 'N/A';
            const dRow = [projectName, sprintName, dev];
            TARGET_STATUSES.forEach(s => dRow.push(devStatusCounts[s]));
            dRow.push(workload, velocity, workload-velocity, devTickets.length, dAvgLead, devCompletedCount, devTickets.length-devCompletedCount, devTickets.length>0?(devCompletedCount/devTickets.length):0, devTotalQA);
            lookerDevRows.push(dRow);
        });
    });

    let sprintSheet = ss.getSheetByName(LOOKER_SPRINTS_SHEET_NAME); if (sprintSheet) sprintSheet.clear(); else sprintSheet = ss.insertSheet(LOOKER_SPRINTS_SHEET_NAME);
    writeDataInChunks(sprintSheet, lookerSprintRows);
    if (lookerSprintRows.length > 1) try { sprintSheet.getRange(2, lookerSprintRows[0].length - 1, lookerSprintRows.length - 1, 1).setNumberFormat("0.00%"); } catch(e){}

    let devSheet = ss.getSheetByName(LOOKER_DEVS_SHEET_NAME); if (devSheet) devSheet.clear(); else devSheet = ss.insertSheet(LOOKER_DEVS_SHEET_NAME);
    writeDataInChunks(devSheet, lookerDevRows);
    if (lookerDevRows.length > 1) try { devSheet.getRange(2, lookerDevRows[0].length - 1, lookerDevRows.length - 1, 1).setNumberFormat("0.00%"); } catch(e){}

    let epicSheet = ss.getSheetByName(LOOKER_EPICS_SHEET_NAME); if (epicSheet) epicSheet.clear(); else epicSheet = ss.insertSheet(LOOKER_EPICS_SHEET_NAME);
    writeDataInChunks(epicSheet, lookerEpicRows);
    if (lookerEpicRows.length > 1) { const progIdx = epicHeader.indexOf('Progress %') + 1; if (progIdx > 0) try { epicSheet.getRange(2, progIdx, lookerEpicRows.length - 1, 1).setNumberFormat("0.00%"); } catch(e){} }

    Logger.log('--- LOOKER STUDIO DATA GENERATION COMPLETE ---');
  } catch (e) { Logger.log('Error generating Looker data: ' + e.toString()); }
}


// ----------------------------------------------------------------------------
// CAPACITY PLANNING (ACTUALIZADO)
// ----------------------------------------------------------------------------
function generateCapacityPlanningData() {
    Logger.log('--- STARTING CAPACITY PLANNING DATA GENERATION (Fixed) ---');
    try {
        // Usar función centralizada para obtener tickets procesados
        const tickets = getProcessedTickets();
        if (tickets.length === 0) return;
        
        const projectKeyMatch = JQL_QUERY.match(/project\s*=\s*"([^"]+)"/i);
        const projectName = projectKeyMatch ? projectKeyMatch[1].toUpperCase() : 'PROJECT';
        const sprintDevMap = {};

        tickets.forEach(ticket => {
            const assignee = ticket.Assignee || 'Unassigned';
            const sprintField = ticket['Sprint History'] || 'No Sprint';
            const ticketSprints = sprintField.split(';').map(s => s.trim()).filter(s => s);
            ticketSprints.forEach(sprintName => {
                if (!sprintDevMap[sprintName]) sprintDevMap[sprintName] = {};
                if (!sprintDevMap[sprintName][assignee]) sprintDevMap[sprintName][assignee] = [];
                sprintDevMap[sprintName][assignee].push(ticket);
            });
        });
        
        function mapSpToHours(sp) { const spMap = { 1: 3, 2: 8, 3: 16, 5: 32, 8: 64, 13: 104 }; return spMap[sp] || (sp * 8); }

        const header = ['Project', 'Sprint N', 'Sprint', 'Start Date', 'End Date', 'Team member', 'Project Allocation (%)', 'Total days in sprint', 'Agency Holidays', 'PTO days', 'Other work/ Meetings (in days)', 'Available sprint days', 'Work day hours', 'Hours for tasks', 'Hrs Planned', '% Capacity assigned', 'Unplanned Capacity', '% Unplanned', 'Share of capacity', 'Hours delivered', 'Peformance Planned/Delivered', 'Performance Available/delivered', 'Feature assignment', 'Feature planned hours', 'Feature shared capacity %', 'Priority assignment', 'Priority planned hours', 'Priority shared capacity %', 'SP Equivalence', 'SP to Hours', 'Sprint Tasks Status', 'Sprint Task Status Number', 'Sprint Tasks Planned', 'Sprint Tasks Completed', 'Sprint Total Remaining Days', 'Sprint Actual Day', 'SP Planned to Deliver to date', 'SP Planned to Deliver Today (%)', 'SP Delivered to date', 'SP Delivered to date (%)', 'Current Sprint Performance'];
        const capacityRows = [header];
        let rowIdx = 2;
        
        const sprintStartDates = {};
        const sprintKeys = Object.keys(sprintDevMap);
        sprintKeys.forEach(sprintName => {
           const devs = sprintDevMap[sprintName];
           const firstDev = Object.keys(devs)[0];
           if(!firstDev) return;
           const sampleTicket = devs[firstDev][0];
           if (sampleTicket && sampleTicket['Sprint Raw Data']) {
               try {
                   const raw = JSON.parse(sampleTicket['Sprint Raw Data']);
                   const sprintObj = raw.find(s => s.name === sprintName);
                   if (sprintObj && sprintObj.startDate) { sprintStartDates[sprintName] = new Date(sprintObj.startDate).getTime(); }
                   else { sprintStartDates[sprintName] = 0; }
               } catch (e) { sprintStartDates[sprintName] = 0; }
           } else { sprintStartDates[sprintName] = 0; }
        });

        const sortedSprintNames = sprintKeys.filter(name => name.toLowerCase().includes('sprint')).sort((a, b) => (sprintStartDates[a] || 0) - (sprintStartDates[b] || 0));

        sortedSprintNames.forEach(sprintName => {
            const developers = sprintDevMap[sprintName];
            let startDate = 'N/A'; let endDate = 'N/A'; let totalDaysFormula = 0;
            const allSprintTickets = [];
            Object.keys(developers).forEach(dev => allSprintTickets.push(...developers[dev]));
            const sprintStatusCounts = {};
            TARGET_STATUSES.forEach(s => sprintStatusCounts[s] = 0);
            
            let sprintFotoDate = null;
            try {
                  const sRaw = JSON.parse(allSprintTickets[0]['Sprint Raw Data']);
                  const sObj = sRaw.find(s => s.name === sprintName);
                  if (sObj) {
                    if(sObj.startDate) startDate = new Date(sObj.startDate).toLocaleDateString();
                    if(sObj.endDate) endDate = new Date(sObj.endDate).toLocaleDateString();
                    if(sObj.completeDate) sprintFotoDate = new Date(sObj.completeDate);
                    totalDaysFormula = `=IFERROR(NETWORKDAYS(D${rowIdx}, E${rowIdx}), 0)`;
                  }
            } catch(e){}

            const getStatus = (t) => {
                if (!sprintFotoDate) return t['Status']; // Active sprint fallback
                try { const h = JSON.parse(t['Estatus por Sprint (JSON)']); return h[sprintName] || 'N/A'; }
                catch(e) { return t['Status']; }
            };

            allSprintTickets.forEach(t => {
                const rawSt = getStatus(t);
                const targetSt = mapToTargetStatus(rawSt);
                if (sprintStatusCounts.hasOwnProperty(targetSt)) sprintStatusCounts[targetSt]++;
            });

            const devKeys = Object.keys(developers).sort();
            const maxRows = Math.max(devKeys.length, TARGET_STATUSES.length);

            for (let i = 0; i < maxRows; i++) {
                let devName = "", devTickets = [], spPlanned = 0, spDelivered = 0, hrsPlanned = 0, hrsDelivered = 0;
                let tasksPlanned = 0, tasksCompleted = 0;
                if (i < devKeys.length) {
                    devName = devKeys[i];
                    devTickets = developers[devName];
                    devTickets.forEach(t => {
                        let spInitial = 0;
                        try {
                            const spJson = JSON.parse(t['Historical SPs (JSON)']);
                            if (spJson.hasOwnProperty(sprintName)) { spInitial = Number(spJson[sprintName]) || 0; }
                            else { spInitial = 0; }
                        } catch (e) { spInitial = 0; }
                        
                        spPlanned += spInitial;
                        hrsPlanned += mapSpToHours(spInitial);
                        const status = getStatus(t);
                        const targetSt = mapToTargetStatus(status);
                        const spCurrent = Number(t['Story point estimate']) || 0;
                        if (targetSt === 'Done' || targetSt === 'QA') {
                            spDelivered += spCurrent;
                            hrsDelivered += mapSpToHours(spCurrent);
                        }
                        if (targetSt === 'Done') tasksCompleted++;
                        tasksPlanned++;
                    });
                }
                let statusName = "", statusCount = "";
                if (i < TARGET_STATUSES.length) {
                    statusName = TARGET_STATUSES[i];
                    statusCount = sprintStatusCounts[statusName];
                }
                let row = [
                    projectName, sprintName.match(/\d+/) ? sprintName.match(/\d+/)[0] : 'N/A', sprintName, startDate, endDate, devName,
                ];
                if (devName) {
                    row.push(1, totalDaysFormula, 0, 0, 0.5, `=IFERROR(H${rowIdx} - SUM(I${rowIdx}:K${rowIdx}), H${rowIdx})`, 8, `=IFERROR(L${rowIdx} * M${rowIdx} * G${rowIdx}, 0)`, hrsPlanned, `=IFERROR(O${rowIdx} / N${rowIdx}, 0)`, `=IFERROR(N${rowIdx} - O${rowIdx}, 0)`, `=IFERROR(Q${rowIdx} / N${rowIdx}, 0)`, `=IFERROR(O${rowIdx} / SUMIF(C:C, C${rowIdx}, O:O), 0)`, hrsDelivered, `=IFERROR(T${rowIdx} / O${rowIdx}, 0)`, `=IFERROR(T${rowIdx} / N${rowIdx}, 0)`, devTickets.map(t => t['Epic Name'] || 'N/A').join('; '), "", "", "", "", "", spPlanned, hrsPlanned);
                } else { for(let k=0; k<24; k++) row.push(""); }

                row.push(statusName); row.push(statusCount);

                if (devName) {
                    row.push(tasksPlanned, tasksCompleted, `=IF(ISBLANK(E${rowIdx}), "N/A", IFERROR(NETWORKDAYS(TODAY(), E${rowIdx}), 0))`, `=IF(ISBLANK(D${rowIdx}), "N/A", IFERROR(NETWORKDAYS(D${rowIdx}, TODAY()), 0))`, spPlanned, "", spDelivered, "", `=IFERROR(AM${rowIdx} / AK${rowIdx}, 0)`);
                } else { for(let k=0; k<9; k++) row.push(""); }
                capacityRows.push(row); rowIdx++;
            }
        });

        let capacitySheet = ss.getSheetByName(CAPACITY_SHEET_NAME);
        if (capacitySheet) capacitySheet.clear();
        else capacitySheet = ss.insertSheet(CAPACITY_SHEET_NAME);
        
        writeDataInChunks(capacitySheet, capacityRows);

        if (capacityRows.length > 1) {
             const numRows = capacityRows.length - 1;
             const percentCols = [7, 16, 18, 19, 21, 22, 25, 28, 38, 40, 41];
             percentCols.forEach(col => capacitySheet.getRange(2, col, numRows, 1).setNumberFormat("0%"));
             const decimalCols = [11, 12, 13, 14, 15, 17, 20, 24, 27, 29, 30, 37, 39];
             decimalCols.forEach(col => capacitySheet.getRange(2, col, numRows, 1).setNumberFormat("0.00"));
             const integerCols = [8, 9, 10, 32, 33, 34, 35, 36];
             integerCols.forEach(col => capacitySheet.getRange(2, col, numRows, 1).setNumberFormat("0"));
        }
        const inputCols = [7, 9, 10, 11, 13, 29];
        inputCols.forEach(c => { if (capacityRows.length > 1) capacitySheet.getRange(2, c, capacityRows.length - 1, 1).setBackground("#fce5cd"); });
        capacitySheet.autoResizeColumns(1, header.length);
    } catch (e) { Logger.log('Error Capacity: ' + e.toString()); }
}