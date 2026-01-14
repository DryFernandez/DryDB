// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { DatabaseCredentials } from './types/database';

// Exponer API de base de datos al renderer de forma segura
contextBridge.exposeInMainWorld('databaseAPI', {
  // Conectar a la base de datos
  connect: (credentials: DatabaseCredentials) => 
    ipcRenderer.invoke('db:connect', credentials),
  
  // Desconectar
  disconnect: () => 
    ipcRenderer.invoke('db:disconnect'),
  
  // Obtener esquema
  getSchema: () => 
    ipcRenderer.invoke('db:getSchema'),
  
  // Ejecutar query
  executeQuery: (query: string) => 
    ipcRenderer.invoke('db:executeQuery', query),
  
  // Verificar conexión
  isConnected: () => 
    ipcRenderer.invoke('db:isConnected'),
  
  // Obtener credenciales
  getCredentials: () => 
    ipcRenderer.invoke('db:getCredentials')
});

// Tipos para TypeScript en el renderer
declare global {
  interface Window {
    databaseAPI: {
      connect: (credentials: DatabaseCredentials) => Promise<any>;
      disconnect: () => Promise<any>;
      getSchema: () => Promise<any>;
      executeQuery: (query: string) => Promise<any>;
      isConnected: () => Promise<boolean>;
      getCredentials: () => Promise<DatabaseCredentials | null>;
    };
  }
}
