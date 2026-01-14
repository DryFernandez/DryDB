/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import { DatabaseType, DatabaseCredentials } from './types/database';
import * as XLSX from 'xlsx';
import { SavedConnection, QueryHistory } from './types/storage';
import { storageManager } from './utils/storage';

// ====== ELEMENTOS DEL DOM ======

// Vistas
const connectionView = document.getElementById('connection-view') as HTMLDivElement;
const mainView = document.getElementById('main-view') as HTMLDivElement;

// Connection form
const dbTypeSelect = document.getElementById('db-type') as HTMLSelectElement;
const hostInput = document.getElementById('host') as HTMLInputElement;
const portInput = document.getElementById('port') as HTMLInputElement;
const usernameInput = document.getElementById('username') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const databaseInput = document.getElementById('database') as HTMLInputElement;
const sslCheckbox = document.getElementById('ssl') as HTMLInputElement;
const btnConnect = document.getElementById('btn-connect') as HTMLButtonElement;
const btnSaveConnection = document.getElementById('btn-save-connection') as HTMLButtonElement;
const connectionStatus = document.getElementById('connection-status') as HTMLDivElement;
const connectionFields = document.getElementById('connection-fields') as HTMLDivElement;

// Main view
const connectionsList = document.getElementById('connections-list') as HTMLDivElement;
const queriesHistory = document.getElementById('queries-history') as HTMLDivElement;
const btnNewConnection = document.getElementById('btn-new-connection') as HTMLButtonElement;
const workspaceTitle = document.getElementById('workspace-title') as HTMLHeadingElement;
const workspaceContent = document.getElementById('workspace-content') as HTMLDivElement;

// Query Builder
const btnNewQuery = document.getElementById('btn-new-query') as HTMLButtonElement;
const queryBuilder = document.getElementById('query-builder') as HTMLDivElement;
const queryTypeSelect = document.getElementById('query-type') as HTMLSelectElement;
const tablesSection = document.getElementById('tables-section') as HTMLDivElement;
const tablesSelector = document.getElementById('tables-selector') as HTMLDivElement;
const joinSection = document.getElementById('join-section') as HTMLDivElement;
const joinsContainer = document.getElementById('joins-container') as HTMLDivElement;
const fieldsSection = document.getElementById('fields-section') as HTMLDivElement;
const fieldsSelector = document.getElementById('fields-selector') as HTMLDivElement;
const selectAllFields = document.getElementById('select-all-fields') as HTMLInputElement;
const aggregateSection = document.getElementById('aggregate-section') as HTMLDivElement;
const useAggregate = document.getElementById('use-aggregate') as HTMLInputElement;
const aggregateContainer = document.getElementById('aggregate-container') as HTMLDivElement;
const aggregateFunctions = document.getElementById('aggregate-functions') as HTMLDivElement;
const btnAddAggregate = document.getElementById('btn-add-aggregate') as HTMLButtonElement;
const groupbySection = document.getElementById('groupby-section') as HTMLDivElement;
const groupbySelector = document.getElementById('groupby-selector') as HTMLDivElement;
const havingSection = document.getElementById('having-section') as HTMLDivElement;
const havingContainer = document.getElementById('having-container') as HTMLDivElement;
const btnAddHaving = document.getElementById('btn-add-having') as HTMLButtonElement;
const valuesSection = document.getElementById('values-section') as HTMLDivElement;
const valuesContainer = document.getElementById('values-container') as HTMLDivElement;
const whereSection = document.getElementById('where-section') as HTMLDivElement;
const conditionsContainer = document.getElementById('conditions-container') as HTMLDivElement;
const btnAddCondition = document.getElementById('btn-add-condition') as HTMLButtonElement;
const orderSection = document.getElementById('order-section') as HTMLDivElement;
const orderField = document.getElementById('order-field') as HTMLSelectElement;
const orderDirection = document.getElementById('order-direction') as HTMLSelectElement;
const limitSection = document.getElementById('limit-section') as HTMLDivElement;
const useLimit = document.getElementById('use-limit') as HTMLInputElement;
const limitValue = document.getElementById('limit-value') as HTMLInputElement;
const generatedQuery = document.getElementById('generated-query') as HTMLTextAreaElement;
const btnExecuteGenerated = document.getElementById('btn-execute-generated') as HTMLButtonElement;
const btnCopyQuery = document.getElementById('btn-copy-query') as HTMLButtonElement;
const btnClearBuilder = document.getElementById('btn-clear-builder') as HTMLButtonElement;
const queryResultsSection = document.getElementById('query-results-section') as HTMLDivElement;
const queryResults = document.getElementById('query-results') as HTMLDivElement;

// ====== ESTADO DE LA APLICACIÓN ======

let currentConnection: SavedConnection | null = null;
let isConnected = false;
let currentSchema: any = null;
let selectedTables: string[] = [];
let queryBuilderState = {
  type: '',
  tables: [] as string[],
  fields: [] as string[],
  joins: [] as any[],
  conditions: [] as any[],
  values: {} as any,
  aggregates: [] as any[],
  groupBy: [] as string[],
  having: [] as any[],
  orderBy: { field: '', direction: 'ASC' },
  limit: null as number | null
};

// ====== INICIALIZACIÓN ======

// Verificar si hay conexiones guardadas al cargar
window.addEventListener('DOMContentLoaded', () => {
  const savedConnections = storageManager.getConnections();
  
  if (savedConnections.length > 0) {
    // Si hay conexiones, mostrar la vista principal
    showMainView();
    loadConnectionsList();
  } else {
    // Si no hay conexiones, mostrar la vista de configuración
    showConnectionView();
  }
});

// ====== NAVEGACIÓN ENTRE VISTAS ======

function showConnectionView() {
  connectionView.style.display = 'flex';
  mainView.style.display = 'none';
  resetConnectionForm();
}

function showMainView() {
  connectionView.style.display = 'none';
  mainView.style.display = 'block';
}

// ====== MANEJO DE CONEXIÓN ======

// Configurar puertos por defecto según el gestor
dbTypeSelect.addEventListener('change', () => {
  const dbType = dbTypeSelect.value;
  
  if (dbType === 'sqlite') {
    connectionFields.style.display = 'none';
    databaseInput.placeholder = 'Ruta al archivo .db';
  } else {
    connectionFields.style.display = 'block';
    databaseInput.placeholder = 'nombre_db';
    
    switch (dbType) {
      case 'mysql':
      case 'mariadb':
        portInput.value = '3306';
        break;
      case 'postgresql':
        portInput.value = '5432';
        break;
      case 'sqlserver':
        portInput.value = '1433';
        break;
    }
  }
});

// Conectar a la base de datos
btnConnect.addEventListener('click', async () => {
  const dbType = dbTypeSelect.value;
  
  if (!dbType) {
    showStatus('Por favor seleccione un gestor de base de datos', 'error');
    return;
  }

  if (!databaseInput.value) {
    showStatus('Por favor ingrese el nombre de la base de datos', 'error');
    return;
  }

  if (dbType !== 'sqlite') {
    if (!hostInput.value || !portInput.value || !usernameInput.value) {
      showStatus('Por favor complete todos los campos requeridos', 'error');
      return;
    }
  }

  showStatus('Conectando...', 'info');
  btnConnect.disabled = true;

  try {
    const credentials: DatabaseCredentials = {
      type: dbType as DatabaseType,
      host: hostInput.value,
      port: parseInt(portInput.value) || 3306,
      username: usernameInput.value,
      password: passwordInput.value,
      database: databaseInput.value,
      ssl: sslCheckbox.checked
    };

    const result = await window.databaseAPI.connect(credentials);

    if (result.connected) {
      showStatus(`✓ Conectado a ${result.database} (${result.type})`, 'success');
      isConnected = true;
      btnConnect.disabled = true;
      btnSaveConnection.disabled = false;
      
      // Guardar credenciales temporalmente
      (window as any).tempCredentials = credentials;
    } else {
      showStatus(`✗ Error de conexión: ${result.error}`, 'error');
      btnConnect.disabled = false;
      isConnected = false;
    }
  } catch (error: any) {
    showStatus(`✗ Error: ${error.message}`, 'error');
    btnConnect.disabled = false;
    isConnected = false;
  }
});

// Guardar conexión
btnSaveConnection.addEventListener('click', async () => {
  if (!isConnected) {
    showStatus('Debe conectarse primero antes de guardar', 'error');
    return;
  }

  const credentials = (window as any).tempCredentials as DatabaseCredentials;
  
  // Crear objeto de conexión guardada
  const connection: SavedConnection = {
    id: generateId(),
    name: `${credentials.database} (${credentials.type})`,
    credentials: credentials,
    createdAt: new Date(),
    lastUsed: new Date()
  };

  // Guardar en localStorage
  storageManager.saveConnection(connection);
  
  showStatus('✓ Conexión guardada exitosamente', 'success');
  
  // Esperar un momento y luego ir a la vista principal
  setTimeout(() => {
    currentConnection = connection;
    storageManager.setCurrentConnection(connection.id);
    showMainView();
    loadConnectionsList();
    loadConnection(connection);
  }, 1000);
});

// ====== VISTA PRINCIPAL ======

// Nueva conexión
btnNewConnection.addEventListener('click', async () => {
  // Desconectar si hay conexión activa
  if (isConnected) {
    await window.databaseAPI.disconnect();
    isConnected = false;
  }
  
  currentConnection = null;
  showConnectionView();
});

// Cargar lista de conexiones
function loadConnectionsList() {
  const connections = storageManager.getConnections();
  
  connectionsList.innerHTML = '';
  
  if (connections.length === 0) {
    connectionsList.innerHTML = '<p style="color: #95a5a6; padding: 20px; text-align: center;">No hay conexiones guardadas</p>';
    return;
  }

  connections.forEach(conn => {
    const connItem = document.createElement('div');
    connItem.className = 'connection-item';
    if (currentConnection && currentConnection.id === conn.id) {
      connItem.classList.add('active');
    }

    connItem.innerHTML = `
      <div>
        <div class="connection-name">${conn.credentials.database}</div>
        <div class="connection-type">${conn.credentials.type}</div>
      </div>
      <button class="connection-delete" title="Eliminar conexión">×</button>
    `;

    // Click en la conexión
    connItem.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).classList.contains('connection-delete')) {
        return;
      }
      await switchConnection(conn);
    });

    // Click en eliminar
    const deleteBtn = connItem.querySelector('.connection-delete') as HTMLButtonElement;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConnection(conn.id);
    });

    connectionsList.appendChild(connItem);
  });
}

// Cambiar de conexión
async function switchConnection(connection: SavedConnection) {
  // Desconectar de la conexión actual si existe
  if (isConnected) {
    await window.databaseAPI.disconnect();
    isConnected = false;
  }

  // Conectar a la nueva conexión
  showWorkspaceStatus('Conectando...', 'info');
  
  try {
    const result = await window.databaseAPI.connect(connection.credentials);
    
    if (result.connected) {
      currentConnection = connection;
      isConnected = true;
      storageManager.setCurrentConnection(connection.id);
      storageManager.updateLastUsed(connection.id);
      
      loadConnection(connection);
      loadConnectionsList(); // Actualizar la lista para marcar como activa
    } else {
      showWorkspaceStatus(`Error al conectar: ${result.error}`, 'error');
    }
  } catch (error: any) {
    showWorkspaceStatus(`Error: ${error.message}`, 'error');
  }
}

// Cargar información de la conexión
async function loadConnection(connection: SavedConnection) {
  workspaceTitle.textContent = `${connection.credentials.database} (${connection.credentials.type})`;
  btnNewQuery.style.display = 'block';
  
  // Cargar historial de queries
  loadQueriesHistory(connection.id);
  
  // Cargar esquema
  await loadSchemaForBuilder();
  
  // Ocultar query builder
  queryBuilder.style.display = 'none';
  
  // Mostrar mensaje de bienvenida si no está el query builder visible
  showWelcomeMessage(connection);
}

function showWelcomeMessage(connection: SavedConnection) {
  const welcomeDiv = document.createElement('div');
  welcomeDiv.id = 'welcome-message';
  welcomeDiv.style.textAlign = 'center';
  welcomeDiv.style.padding = '60px 20px';
  welcomeDiv.style.color = '#95a5a6';
  welcomeDiv.innerHTML = `
    <h2 style="color: #7f8c8d; border: none;">Conexión activa</h2>
    <p style="margin-top: 20px; font-size: 16px;">Base de datos: <strong>${connection.credentials.database}</strong></p>
    <p style="font-size: 14px; margin-top: 10px;">Gestor: ${connection.credentials.type.toUpperCase()}</p>
    <p style="font-size: 14px;">Host: ${connection.credentials.host}:${connection.credentials.port}</p>
    <p style="margin-top: 30px; font-size: 14px; color: #7f8c8d;">Haz clic en "Nueva Consulta" para comenzar</p>
  `;
  
  // Remover mensaje anterior si existe
  const existing = document.getElementById('welcome-message');
  if (existing) {
    existing.remove();
  }
  
  // Agregar antes del query builder
  queryBuilder.parentElement?.insertBefore(welcomeDiv, queryBuilder);
}

// Cargar historial de queries
function loadQueriesHistory(connectionId: string) {
  const queries = storageManager.getQueriesByConnection(connectionId);
  
  queriesHistory.innerHTML = '';
  
  if (queries.length === 0) {
    queriesHistory.innerHTML = '<p style="color: #95a5a6; font-size: 12px; padding: 10px;">Sin consultas aún</p>';
    return;
  }

  queries.slice(0, 20).forEach(query => {
    const queryItem = document.createElement('div');
    queryItem.className = `query-item ${query.success ? 'query-success' : 'query-error'}`;
    
    const queryText = document.createElement('div');
    queryText.className = 'query-text';
    queryText.textContent = query.query;
    queryText.title = query.query;
    
    const queryTime = document.createElement('div');
    queryTime.className = 'query-time';
    queryTime.textContent = formatDate(new Date(query.executedAt));
    
    queryItem.appendChild(queryText);
    queryItem.appendChild(queryTime);
    
    // Click para copiar query
    queryItem.addEventListener('click', () => {
      navigator.clipboard.writeText(query.query);
      showWorkspaceStatus('Query copiada al portapapeles', 'info');
    });
    
    queriesHistory.appendChild(queryItem);
  });
}

// Eliminar conexión
function deleteConnection(id: string) {
  if (confirm('¿Está seguro de que desea eliminar esta conexión?')) {
    storageManager.deleteConnection(id);
    
    // Si es la conexión actual, limpiar
    if (currentConnection && currentConnection.id === id) {
      currentConnection = null;
      workspaceTitle.textContent = 'Seleccione una conexión';
      workspaceContent.innerHTML = '';
      queriesHistory.innerHTML = '';
    }
    
    loadConnectionsList();
    
    // Si no quedan conexiones, volver a la vista de conexión
    const connections = storageManager.getConnections();
    if (connections.length === 0) {
      showConnectionView();
    }
  }
}

// ====== UTILIDADES ======

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  if (days < 7) return `Hace ${days} d`;
  
  return date.toLocaleDateString();
}

function resetConnectionForm() {
  dbTypeSelect.value = '';
  hostInput.value = 'localhost';
  portInput.value = '';
  usernameInput.value = '';
  passwordInput.value = '';
  databaseInput.value = '';
  sslCheckbox.checked = false;
  btnConnect.disabled = false;
  btnSaveConnection.disabled = true;
  connectionStatus.textContent = '';
  connectionStatus.className = 'status-message';
  isConnected = false;
  (window as any).tempCredentials = null;
}

function showStatus(message: string, type: 'success' | 'error' | 'info') {
  connectionStatus.textContent = message;
  connectionStatus.className = `status-message ${type}`;
}

function showWorkspaceStatus(message: string, type: 'success' | 'error' | 'info') {
  // Crear un mensaje temporal en el workspace
  const statusDiv = document.createElement('div');
  statusDiv.className = `status-message ${type}`;
  statusDiv.textContent = message;
  statusDiv.style.position = 'fixed';
  statusDiv.style.top = '20px';
  statusDiv.style.right = '20px';
  statusDiv.style.zIndex = '1000';
  statusDiv.style.minWidth = '300px';
  
  document.body.appendChild(statusDiv);
  
  setTimeout(() => {
    statusDiv.remove();
  }, 3000);
}

// ====== QUERY BUILDER ======

// Mostrar query builder
btnNewQuery.addEventListener('click', () => {
  // Ocultar mensaje de bienvenida
  const welcomeMsg = document.getElementById('welcome-message');
  if (welcomeMsg) {
    welcomeMsg.style.display = 'none';
  }
  
  // Mostrar query builder
  queryBuilder.style.display = 'block';
  resetQueryBuilder();
});

// Cambio de tipo de consulta
queryTypeSelect.addEventListener('change', async () => {
  const queryType = queryTypeSelect.value;
  queryBuilderState.type = queryType;
  
  if (!queryType) {
    hideAllSections();
    return;
  }

  // Cargar esquema si no está cargado
  if (!currentSchema && isConnected) {
    await loadSchemaForBuilder();
  }

  // Limpiar secciones previas y ocultar todas
  hideAllSections();
  
  // Siempre mostrar selector de tablas
  tablesSection.style.display = 'block';
  loadTablesSelector();

  // Mostrar secciones según el tipo de query
  switch (queryType) {
    case 'SELECT':
      whereSection.style.display = 'block';
      orderSection.style.display = 'block';
      limitSection.style.display = 'block';
      break;
    case 'INSERT':
      break;
    case 'UPDATE':
      whereSection.style.display = 'block';
      break;
    case 'DELETE':
      whereSection.style.display = 'block';
      break;
  }
  
  // Limpiar selecciones previas
  selectedTables = [];
  queryBuilderState.tables = [];
  queryBuilderState.fields = [];
  queryBuilderState.joins = [];
  queryBuilderState.conditions = [];
  queryBuilderState.values = {};
  fieldsSelector.innerHTML = '';
  joinsContainer.innerHTML = '';
  valuesContainer.innerHTML = '';
  conditionsContainer.innerHTML = '';
  generatedQuery.value = '';
});

// Cargar esquema para el builder
async function loadSchemaForBuilder() {
  try {
    const result = await window.databaseAPI.getSchema();
    if (result.success) {
      currentSchema = result.schema;
    } else {
      showWorkspaceStatus(`Error al cargar esquema: ${result.error}`, 'error');
    }
  } catch (error: any) {
    showWorkspaceStatus(`Error: ${error.message}`, 'error');
  }
}

// Cargar selector de tablas
function loadTablesSelector() {
  if (!currentSchema) return;

  tablesSelector.innerHTML = '';
  
  currentSchema.tables.forEach((table: any) => {
    const label = document.createElement('label');
    label.className = 'table-checkbox';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = table.name;
    checkbox.addEventListener('change', onTableSelectionChange);
    
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(table.name));
    
    tablesSelector.appendChild(label);
  });
}

// Cuando cambia la selección de tablas
function onTableSelectionChange() {
  selectedTables = Array.from(tablesSelector.querySelectorAll('input[type="checkbox"]:checked'))
    .map(cb => (cb as HTMLInputElement).value);
  
  queryBuilderState.tables = selectedTables;

  // Actualizar clases de selección
  tablesSelector.querySelectorAll('label').forEach(label => {
    const checkbox = label.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (checkbox.checked) {
      label.classList.add('selected');
    } else {
      label.classList.remove('selected');
    }
  });

  // Si no hay tablas seleccionadas, limpiar todo
  if (selectedTables.length === 0) {
    joinSection.style.display = 'none';
    fieldsSection.style.display = 'none';
    aggregateSection.style.display = 'none';
    groupbySection.style.display = 'none';
    havingSection.style.display = 'none';
    valuesSection.style.display = 'none';
    fieldsSelector.innerHTML = '';
    groupbySelector.innerHTML = '';
    joinsContainer.innerHTML = '';
    valuesContainer.innerHTML = '';
    conditionsContainer.innerHTML = '';
    aggregateFunctions.innerHTML = '';
    havingContainer.innerHTML = '';
    generatedQuery.value = '';
    return;
  }

  // Si hay más de una tabla, mostrar configuración de JOIN
  if (selectedTables.length > 1) {
    joinSection.style.display = 'block';
    loadJoinsConfiguration();
  } else {
    joinSection.style.display = 'none';
    queryBuilderState.joins = [];
  }

  // Actualizar campos disponibles según el tipo de query
  if (queryBuilderState.type === 'SELECT') {
    fieldsSection.style.display = 'block';
    aggregateSection.style.display = 'block';
    loadFieldsSelector();
    loadOrderByOptions();
  } else if (queryBuilderState.type === 'INSERT') {
    fieldsSection.style.display = 'none';
    aggregateSection.style.display = 'none';
    groupbySection.style.display = 'none';
    havingSection.style.display = 'none';
    valuesSection.style.display = 'block';
    loadValuesInputs();
  } else if (queryBuilderState.type === 'UPDATE') {
    fieldsSection.style.display = 'none';
    aggregateSection.style.display = 'none';
    groupbySection.style.display = 'none';
    havingSection.style.display = 'none';
    valuesSection.style.display = 'block';
    loadValuesInputs();
  }

  loadConditionsFields();
  generateQuery();
}

// Configurar JOINs
function loadJoinsConfiguration() {
  joinsContainer.innerHTML = '';
  
  for (let i = 1; i < selectedTables.length; i++) {
    const joinDiv = document.createElement('div');
    joinDiv.className = 'join-item';
    
    const title = document.createElement('h4');
    title.textContent = `JOIN: ${selectedTables[0]} ⟷ ${selectedTables[i]}`;
    joinDiv.appendChild(title);
    
    const fieldsDiv = document.createElement('div');
    fieldsDiv.className = 'join-fields';
    
    // Campo de la primera tabla
    const select1 = document.createElement('select');
    select1.dataset.joinIndex = i.toString();
    select1.dataset.side = 'left';
    loadTableFields(select1, selectedTables[0]);
    select1.addEventListener('change', updateJoinConfig);
    
    const equalSign = document.createElement('span');
    equalSign.textContent = '=';
    
    // Campo de la segunda tabla
    const select2 = document.createElement('select');
    select2.dataset.joinIndex = i.toString();
    select2.dataset.side = 'right';
    loadTableFields(select2, selectedTables[i]);
    select2.addEventListener('change', updateJoinConfig);
    
    fieldsDiv.appendChild(select1);
    fieldsDiv.appendChild(equalSign);
    fieldsDiv.appendChild(select2);
    
    joinDiv.appendChild(fieldsDiv);
    joinsContainer.appendChild(joinDiv);
  }
}

// Actualizar configuración de JOIN
function updateJoinConfig() {
  const joins: any[] = [];
  
  for (let i = 1; i < selectedTables.length; i++) {
    const leftSelect = joinsContainer.querySelector(`select[data-join-index="${i}"][data-side="left"]`) as HTMLSelectElement;
    const rightSelect = joinsContainer.querySelector(`select[data-join-index="${i}"][data-side="right"]`) as HTMLSelectElement;
    
    if (leftSelect && rightSelect && leftSelect.value && rightSelect.value) {
      joins.push({
        table1: selectedTables[0],
        field1: leftSelect.value,
        table2: selectedTables[i],
        field2: rightSelect.value
      });
    }
  }
  
  queryBuilderState.joins = joins;
  generateQuery();
}

// Cargar campos de una tabla en un select
function loadTableFields(select: HTMLSelectElement, tableName: string) {
  select.innerHTML = '<option value="">Seleccione campo...</option>';
  
  const table = currentSchema.tables.find((t: any) => t.name === tableName);
  if (table) {
    table.columns.forEach((col: any) => {
      const option = document.createElement('option');
      option.value = col.name;
      option.textContent = `${col.name} (${col.type})`;
      select.appendChild(option);
    });
  }
}

// Cargar selector de campos para SELECT
function loadFieldsSelector() {
  fieldsSelector.innerHTML = '';
  groupbySelector.innerHTML = '';
  queryBuilderState.fields = [];
  queryBuilderState.groupBy = [];
  
  selectedTables.forEach(tableName => {
    const table = currentSchema.tables.find((t: any) => t.name === tableName);
    if (table) {
      table.columns.forEach((col: any) => {
        const fieldName = selectedTables.length > 1 ? `${tableName}.${col.name}` : col.name;
        
        // Checkbox para selección de campos
        const div = document.createElement('div');
        div.className = 'field-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = fieldName;
        checkbox.id = `field-${tableName}-${col.name}`;
        checkbox.addEventListener('change', onFieldSelectionChange);
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = fieldName;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        fieldsSelector.appendChild(div);
        
        // Checkbox para GROUP BY
        const divGroup = document.createElement('div');
        divGroup.className = 'field-checkbox';
        
        const checkboxGroup = document.createElement('input');
        checkboxGroup.type = 'checkbox';
        checkboxGroup.value = fieldName;
        checkboxGroup.id = `groupby-${tableName}-${col.name}`;
        checkboxGroup.addEventListener('change', onGroupByChange);
        
        const labelGroup = document.createElement('label');
        labelGroup.htmlFor = checkboxGroup.id;
        labelGroup.textContent = fieldName;
        
        divGroup.appendChild(checkboxGroup);
        divGroup.appendChild(labelGroup);
        groupbySelector.appendChild(divGroup);
      });
    }
  });
}

function onGroupByChange() {
  queryBuilderState.groupBy = Array.from(groupbySelector.querySelectorAll('input[type="checkbox"]:checked'))
    .map(cb => (cb as HTMLInputElement).value);
  generateQuery();
}

// Select all fields
selectAllFields.addEventListener('change', () => {
  const checkboxes = fieldsSelector.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    (cb as HTMLInputElement).checked = selectAllFields.checked;
  });
  onFieldSelectionChange();
});

// Cuando cambia la selección de campos
function onFieldSelectionChange() {
  queryBuilderState.fields = Array.from(fieldsSelector.querySelectorAll('input[type="checkbox"]:checked'))
    .map(cb => (cb as HTMLInputElement).value);
  generateQuery();
}

// Cargar inputs de valores (INSERT/UPDATE)
function loadValuesInputs() {
  valuesContainer.innerHTML = '';
  queryBuilderState.values = {};
  
  if (selectedTables.length !== 1) {
    valuesContainer.innerHTML = '<p style="color: #e74c3c;">Por favor seleccione solo una tabla para INSERT/UPDATE</p>';
    return;
  }
  
  const table = currentSchema.tables.find((t: any) => t.name === selectedTables[0]);
  if (table) {
    table.columns.forEach((col: any) => {
      const div = document.createElement('div');
      div.className = 'value-item';
      
      const label = document.createElement('label');
      label.textContent = `${col.name} (${col.type})${col.nullable ? '' : ' *'}`;
      
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = col.nullable ? 'NULL' : 'Requerido';
      input.dataset.field = col.name;
      input.addEventListener('input', onValueChange);
      
      div.appendChild(label);
      div.appendChild(input);
      valuesContainer.appendChild(div);
    });
  }
}

// Cuando cambia un valor
function onValueChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const field = input.dataset.field!;
  queryBuilderState.values[field] = input.value;
  generateQuery();
}

// Cargar campos para condiciones WHERE
function loadConditionsFields() {
  // Esta función se llama cuando cambian las tablas
  // Los campos se cargarán dinámicamente al agregar condiciones
}

// Agregar condición WHERE
btnAddCondition.addEventListener('click', () => {
  addCondition();
});

function addCondition(condition?: any) {
  const div = document.createElement('div');
  div.className = 'condition-item';
  
  // Campo
  const fieldSelect = document.createElement('select');
  fieldSelect.innerHTML = '<option value="">Campo...</option>';
  selectedTables.forEach(tableName => {
    const table = currentSchema.tables.find((t: any) => t.name === tableName);
    if (table) {
      table.columns.forEach((col: any) => {
        const option = document.createElement('option');
        option.value = selectedTables.length > 1 ? `${tableName}.${col.name}` : col.name;
        option.textContent = selectedTables.length > 1 ? `${tableName}.${col.name}` : col.name;
        fieldSelect.appendChild(option);
      });
    }
  });
  if (condition) fieldSelect.value = condition.field;
  fieldSelect.addEventListener('change', updateConditions);
  
  // Operador
  const operatorSelect = document.createElement('select');
  ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL'].forEach(op => {
    const option = document.createElement('option');
    option.value = op;
    option.textContent = op;
    operatorSelect.appendChild(option);
  });
  if (condition) operatorSelect.value = condition.operator;
  operatorSelect.addEventListener('change', updateConditions);
  
  // Valor
  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.placeholder = 'Valor';
  if (condition) valueInput.value = condition.value;
  valueInput.addEventListener('input', updateConditions);
  
  // Botón eliminar
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', () => {
    div.remove();
    updateConditions();
  });
  
  div.appendChild(fieldSelect);
  div.appendChild(operatorSelect);
  div.appendChild(valueInput);
  div.appendChild(deleteBtn);
  
  conditionsContainer.appendChild(div);
  updateConditions();
}

// Actualizar condiciones
function updateConditions() {
  const conditions: any[] = [];
  
  conditionsContainer.querySelectorAll('.condition-item').forEach(item => {
    const selects = item.querySelectorAll('select');
    const input = item.querySelector('input');
    
    if (selects[0].value) {
      conditions.push({
        field: selects[0].value,
        operator: selects[1].value,
        value: input!.value
      });
    }
  });
  
  queryBuilderState.conditions = conditions;
  generateQuery();
}

// Cargar opciones de ORDER BY
function loadOrderByOptions() {
  orderField.innerHTML = '<option value="">Sin ordenar</option>';
  
  selectedTables.forEach(tableName => {
    const table = currentSchema.tables.find((t: any) => t.name === tableName);
    if (table) {
      table.columns.forEach((col: any) => {
        const option = document.createElement('option');
        option.value = selectedTables.length > 1 ? `${tableName}.${col.name}` : col.name;
        option.textContent = selectedTables.length > 1 ? `${tableName}.${col.name}` : col.name;
        orderField.appendChild(option);
      });
    }
  });
}

orderField.addEventListener('change', () => {
  queryBuilderState.orderBy.field = orderField.value;
  generateQuery();
});

orderDirection.addEventListener('change', () => {
  queryBuilderState.orderBy.direction = orderDirection.value;
  generateQuery();
});

// LIMIT
useLimit.addEventListener('change', () => {
  limitValue.disabled = !useLimit.checked;
  if (!useLimit.checked) {
    limitValue.value = '';
    queryBuilderState.limit = null;
  }
  generateQuery();
});

limitValue.addEventListener('input', () => {
  queryBuilderState.limit = limitValue.value ? parseInt(limitValue.value) : null;
  generateQuery();
});

// Funciones de agregación
useAggregate.addEventListener('change', () => {
  aggregateContainer.style.display = useAggregate.checked ? 'block' : 'none';
  groupbySection.style.display = useAggregate.checked ? 'block' : 'none';
  havingSection.style.display = useAggregate.checked ? 'block' : 'none';
  
  if (!useAggregate.checked) {
    queryBuilderState.aggregates = [];
    queryBuilderState.groupBy = [];
    queryBuilderState.having = [];
    aggregateFunctions.innerHTML = '';
    havingContainer.innerHTML = '';
  }
  generateQuery();
});

btnAddAggregate.addEventListener('click', () => {
  addAggregateFunction();
});

btnAddHaving.addEventListener('click', () => {
  addHavingCondition();
});

function addAggregateFunction() {
  const aggId = Date.now();
  const div = document.createElement('div');
  div.className = 'condition-row';
  div.dataset.aggId = aggId.toString();
  
  const allFields: string[] = [];
  selectedTables.forEach(table => {
    const tableInfo = currentSchema.tables.find((t: any) => t.name === table);
    if (tableInfo) {
      tableInfo.columns.forEach((col: any) => {
        allFields.push(`${table}.${col.name}`);
      });
    }
  });
  
  div.innerHTML = `
    <select class="agg-function">
      <option value="COUNT">COUNT</option>
      <option value="SUM">SUM</option>
      <option value="AVG">AVG</option>
      <option value="MIN">MIN</option>
      <option value="MAX">MAX</option>
      <option value="COUNT_DISTINCT">COUNT DISTINCT</option>
    </select>
    <select class="agg-field">
      <option value="*">* (todos)</option>
      ${allFields.map(f => `<option value="${f}">${f}</option>`).join('')}
    </select>
    <input type="text" class="agg-alias" placeholder="Alias (opcional)">
    <button class="btn-remove" onclick="this.parentElement.remove(); updateAggregates();">✕</button>
  `;
  
  aggregateFunctions.appendChild(div);
  
  div.querySelectorAll('select, input').forEach(el => {
    el.addEventListener('change', updateAggregates);
  });
  
  updateAggregates();
}

function updateAggregates() {
  const aggregates: any[] = [];
  aggregateFunctions.querySelectorAll('.condition-row').forEach(row => {
    const func = (row.querySelector('.agg-function') as HTMLSelectElement).value;
    const field = (row.querySelector('.agg-field') as HTMLSelectElement).value;
    const alias = (row.querySelector('.agg-alias') as HTMLInputElement).value;
    
    aggregates.push({ function: func, field, alias });
  });
  
  queryBuilderState.aggregates = aggregates;
  generateQuery();
}

function addHavingCondition() {
  const condId = Date.now();
  const div = document.createElement('div');
  div.className = 'condition-row';
  div.dataset.condId = condId.toString();
  
  div.innerHTML = `
    <select class="having-function">
      <option value="COUNT">COUNT</option>
      <option value="SUM">SUM</option>
      <option value="AVG">AVG</option>
      <option value="MIN">MIN</option>
      <option value="MAX">MAX</option>
    </select>
    <select class="having-field">
      <option value="*">*</option>
    </select>
    <select class="having-operator">
      <option value=">">&gt;</option>
      <option value="<">&lt;</option>
      <option value=">=">&gt;=</option>
      <option value="<=">&lt;=</option>
      <option value="=">=</option>
      <option value="!=">!=</option>
    </select>
    <input type="text" class="having-value" placeholder="Valor">
    <button class="btn-remove" onclick="this.parentElement.remove(); updateHaving();">✕</button>
  `;
  
  // Poblar campos
  const fieldSelect = div.querySelector('.having-field') as HTMLSelectElement;
  selectedTables.forEach(table => {
    const tableInfo = currentSchema.tables.find((t: any) => t.name === table);
    if (tableInfo) {
      tableInfo.columns.forEach((col: any) => {
        const option = document.createElement('option');
        option.value = `${table}.${col.name}`;
        option.textContent = `${table}.${col.name}`;
        fieldSelect.appendChild(option);
      });
    }
  });
  
  havingContainer.appendChild(div);
  
  div.querySelectorAll('select, input').forEach(el => {
    el.addEventListener('change', updateHaving);
  });
  
  updateHaving();
}

function updateHaving() {
  const having: any[] = [];
  havingContainer.querySelectorAll('.condition-row').forEach(row => {
    const func = (row.querySelector('.having-function') as HTMLSelectElement).value;
    const field = (row.querySelector('.having-field') as HTMLSelectElement).value;
    const operator = (row.querySelector('.having-operator') as HTMLSelectElement).value;
    const value = (row.querySelector('.having-value') as HTMLInputElement).value;
    
    if (value) {
      having.push({ function: func, field, operator, value });
    }
  });
  
  queryBuilderState.having = having;
  generateQuery();
}

// Generar query SQL
function generateQuery() {
  let query = '';
  const state = queryBuilderState;
  
  if (!state.type || state.tables.length === 0) {
    generatedQuery.value = '';
    return;
  }
  
  switch (state.type) {
    case 'SELECT':
      query = generateSelectQuery();
      break;
    case 'INSERT':
      query = generateInsertQuery();
      break;
    case 'UPDATE':
      query = generateUpdateQuery();
      break;
    case 'DELETE':
      query = generateDeleteQuery();
      break;
  }
  
  generatedQuery.value = query;
}

function generateSelectQuery(): string {
  const state = queryBuilderState;
  let query = 'SELECT ';
  
  // Funciones de agregación
  if (state.aggregates.length > 0) {
    const aggParts: string[] = [];
    
    state.aggregates.forEach(agg => {
      let aggStr = '';
      if (agg.function === 'COUNT_DISTINCT') {
        aggStr = `COUNT(DISTINCT ${agg.field})`;
      } else {
        aggStr = `${agg.function}(${agg.field})`;
      }
      
      if (agg.alias) {
        aggStr += ` AS ${agg.alias}`;
      }
      
      aggParts.push(aggStr);
    });
    
    // Agregar campos de GROUP BY a la selección
    if (state.groupBy.length > 0) {
      query += state.groupBy.join(', ') + ', ' + aggParts.join(', ');
    } else {
      query += aggParts.join(', ');
    }
  } else {
    // Campos normales
    if (selectAllFields.checked || state.fields.length === 0) {
      query += '*';
    } else {
      query += state.fields.join(', ');
    }
  }
  
  // FROM
  query += `\nFROM ${state.tables[0]}`;
  
  // JOINs
  if (state.joins.length > 0) {
    state.joins.forEach(join => {
      query += `\nINNER JOIN ${join.table2} ON ${join.table1}.${join.field1} = ${join.table2}.${join.field2}`;
    });
  }
  
  // WHERE
  if (state.conditions.length > 0) {
    query += '\nWHERE ';
    const whereClauses = state.conditions.map(c => {
      if (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL') {
        return `${c.field} ${c.operator}`;
      }
      const value = isNaN(c.value) ? `'${c.value}'` : c.value;
      return `${c.field} ${c.operator} ${value}`;
    });
    query += whereClauses.join(' AND ');
  }
  
  // GROUP BY
  if (state.groupBy.length > 0) {
    query += '\nGROUP BY ' + state.groupBy.join(', ');
  }
  
  // HAVING
  if (state.having.length > 0) {
    query += '\nHAVING ';
    const havingClauses = state.having.map(h => {
      return `${h.function}(${h.field}) ${h.operator} ${h.value}`;
    });
    query += havingClauses.join(' AND ');
  }
  
  // ORDER BY
  if (state.orderBy.field) {
    query += `\nORDER BY ${state.orderBy.field} ${state.orderBy.direction}`;
  }
  
  // LIMIT
  if (state.limit) {
    query += `\nLIMIT ${state.limit}`;
  }
  
  return query + ';';
}

function generateInsertQuery(): string {
  const state = queryBuilderState;
  if (state.tables.length !== 1) return '-- Seleccione solo una tabla';
  
  const fields = Object.keys(state.values).filter(k => state.values[k]);
  const values = fields.map(f => {
    const val = state.values[f];
    return isNaN(val) ? `'${val}'` : val;
  });
  
  if (fields.length === 0) return '-- Ingrese valores para insertar';
  
  return `INSERT INTO ${state.tables[0]} (${fields.join(', ')})\nVALUES (${values.join(', ')});`;
}

function generateUpdateQuery(): string {
  const state = queryBuilderState;
  if (state.tables.length !== 1) return '-- Seleccione solo una tabla';
  
  const setClauses = Object.keys(state.values)
    .filter(k => state.values[k])
    .map(k => {
      const val = state.values[k];
      const value = isNaN(val) ? `'${val}'` : val;
      return `${k} = ${value}`;
    });
  
  if (setClauses.length === 0) return '-- Ingrese valores para actualizar';
  
  let query = `UPDATE ${state.tables[0]}\nSET ${setClauses.join(', ')}`;
  
  // WHERE
  if (state.conditions.length > 0) {
    query += '\nWHERE ';
    const whereClauses = state.conditions.map(c => {
      if (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL') {
        return `${c.field} ${c.operator}`;
      }
      const value = isNaN(c.value) ? `'${c.value}'` : c.value;
      return `${c.field} ${c.operator} ${value}`;
    });
    query += whereClauses.join(' AND ');
  }
  
  return query + ';';
}

function generateDeleteQuery(): string {
  const state = queryBuilderState;
  if (state.tables.length !== 1) return '-- Seleccione solo una tabla';
  
  let query = `DELETE FROM ${state.tables[0]}`;
  
  // WHERE
  if (state.conditions.length > 0) {
    query += '\nWHERE ';
    const whereClauses = state.conditions.map(c => {
      if (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL') {
        return `${c.field} ${c.operator}`;
      }
      const value = isNaN(c.value) ? `'${c.value}'` : c.value;
      return `${c.field} ${c.operator} ${value}`;
    });
    query += whereClauses.join(' AND ');
  }
  
  return query + ';';
}

// Ejecutar query generada
btnExecuteGenerated.addEventListener('click', async () => {
  const query = generatedQuery.value.trim();
  
  if (!query || query.startsWith('--')) {
    showWorkspaceStatus('No hay consulta válida para ejecutar', 'error');
    return;
  }
  
  try {
    const result = await window.databaseAPI.executeQuery(query);
    
    if (result.success) {
      // Guardar en historial
      if (currentConnection) {
        const queryHistory: QueryHistory = {
          id: generateId(),
          connectionId: currentConnection.id,
          query: query,
          executedAt: new Date(),
          success: true
        };
        storageManager.saveQuery(queryHistory);
        loadQueriesHistory(currentConnection.id);
      }
      
      // Mostrar resultados
      displayResults(result.result);
      showWorkspaceStatus('✓ Consulta ejecutada correctamente', 'success');
    } else {
      // Guardar error en historial
      if (currentConnection) {
        const queryHistory: QueryHistory = {
          id: generateId(),
          connectionId: currentConnection.id,
          query: query,
          executedAt: new Date(),
          success: false,
          error: result.error
        };
        storageManager.saveQuery(queryHistory);
        loadQueriesHistory(currentConnection.id);
      }
      
      showWorkspaceStatus(`Error: ${result.error}`, 'error');
    }
  } catch (error: any) {
    showWorkspaceStatus(`Error: ${error.message}`, 'error');
  }
});

// Variable global para almacenar los últimos resultados
let lastQueryResults: any[] = [];

// Mostrar resultados
function displayResults(results: any[]) {
  queryResultsSection.style.display = 'block';
  queryResults.innerHTML = '';
  lastQueryResults = results;
  
  const btnExportExcel = document.getElementById('btn-export-excel') as HTMLButtonElement;
  
  if (!results || results.length === 0) {
    queryResults.innerHTML = '<p class="results-info">Consulta ejecutada. No hay resultados para mostrar.</p>';
    btnExportExcel.style.display = 'none';
    return;
  }
  
  btnExportExcel.style.display = 'inline-block';
  
  // Crear contenedor con scroll horizontal
  const tableContainer = document.createElement('div');
  tableContainer.className = 'results-table-container';
  
  const table = document.createElement('table');
  table.className = 'results-table';
  
  // Encabezados
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const columns = Object.keys(results[0]);
  
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Datos
  const tbody = document.createElement('tbody');
  results.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const td = document.createElement('td');
      td.textContent = row[col] !== null && row[col] !== undefined ? row[col] : 'NULL';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  queryResults.appendChild(tableContainer);
  
  const info = document.createElement('p');
  info.className = 'results-info';
  info.textContent = `Total: ${results.length} fila(s)`;
  queryResults.appendChild(info);
}

// Copiar query
btnCopyQuery.addEventListener('click', () => {
  const query = generatedQuery.value;
  if (query) {
    navigator.clipboard.writeText(query);
    showWorkspaceStatus('Query copiada al portapapeles', 'success');
  }
});

// Exportar a Excel
const btnExportExcel = document.getElementById('btn-export-excel') as HTMLButtonElement;
btnExportExcel.addEventListener('click', () => {
  if (!lastQueryResults || lastQueryResults.length === 0) {
    showWorkspaceStatus('No hay resultados para exportar', 'error');
    return;
  }
  
  try {
    // Crear un nuevo libro de trabajo
    const wb = XLSX.utils.book_new();
    
    // Convertir los resultados a una hoja de cálculo
    const ws = XLSX.utils.json_to_sheet(lastQueryResults);
    
    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    
    // Generar nombre de archivo con fecha y hora
    const now = new Date();
    const fileName = `query_results_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}.xlsx`;
    
    // Guardar el archivo
    XLSX.writeFile(wb, fileName);
    
    showWorkspaceStatus(`Archivo exportado: ${fileName}`, 'success');
  } catch (error: any) {
    showWorkspaceStatus(`Error al exportar: ${error.message}`, 'error');
  }
});

// Limpiar builder
btnClearBuilder.addEventListener('click', () => {
  resetQueryBuilder();
});

function resetQueryBuilder() {
  queryTypeSelect.value = '';
  selectedTables = [];
  queryBuilderState = {
    type: '',
    tables: [],
    fields: [],
    joins: [],
    conditions: [],
    values: {},
    aggregates: [],
    groupBy: [],
    having: [],
    orderBy: { field: '', direction: 'ASC' },
    limit: null
  };
  
  tablesSelector.innerHTML = '';
  fieldsSelector.innerHTML = '';
  groupbySelector.innerHTML = '';
  joinsContainer.innerHTML = '';
  valuesContainer.innerHTML = '';
  conditionsContainer.innerHTML = '';
  aggregateFunctions.innerHTML = '';
  havingContainer.innerHTML = '';
  generatedQuery.value = '';
  selectAllFields.checked = false;
  useAggregate.checked = false;
  aggregateContainer.style.display = 'none';
  useLimit.checked = false;
  limitValue.value = '';
  limitValue.disabled = true;
  orderField.value = '';
  orderDirection.value = 'ASC';
  queryResultsSection.style.display = 'none';
  
  hideAllSections();
}

function hideAllSections() {
  tablesSection.style.display = 'none';
  joinSection.style.display = 'none';
  fieldsSection.style.display = 'none';
  aggregateSection.style.display = 'none';
  groupbySection.style.display = 'none';
  havingSection.style.display = 'none';
  valuesSection.style.display = 'none';
  whereSection.style.display = 'none';
  orderSection.style.display = 'none';
  limitSection.style.display = 'none';
}

console.log('👋 Renderer process ready');


console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
);
