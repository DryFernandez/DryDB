import { SavedConnection, QueryHistory, LocalStorage } from '../types/storage';

const STORAGE_KEY = 'drydb_data';

/**
 * Clase para manejar el almacenamiento local de conexiones y queries
 */
class StorageManager {
  /**
   * Obtiene todos los datos del localStorage
   */
  private getData(): LocalStorage {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return {
        connections: [],
        queries: []
      };
    }
    return JSON.parse(data);
  }

  /**
   * Guarda los datos en localStorage
   */
  private saveData(data: LocalStorage): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Guarda una nueva conexión
   */
  saveConnection(connection: SavedConnection): void {
    const data = this.getData();
    
    // Verificar si ya existe una conexión con el mismo ID
    const existingIndex = data.connections.findIndex(c => c.id === connection.id);
    
    if (existingIndex >= 0) {
      data.connections[existingIndex] = connection;
    } else {
      data.connections.push(connection);
    }
    
    this.saveData(data);
  }

  /**
   * Obtiene todas las conexiones guardadas
   */
  getConnections(): SavedConnection[] {
    return this.getData().connections;
  }

  /**
   * Obtiene una conexión por ID
   */
  getConnection(id: string): SavedConnection | null {
    const data = this.getData();
    return data.connections.find(c => c.id === id) || null;
  }

  /**
   * Elimina una conexión
   */
  deleteConnection(id: string): void {
    const data = this.getData();
    data.connections = data.connections.filter(c => c.id !== id);
    data.queries = data.queries.filter(q => q.connectionId !== id);
    this.saveData(data);
  }

  /**
   * Actualiza el timestamp de último uso de una conexión
   */
  updateLastUsed(id: string): void {
    const data = this.getData();
    const connection = data.connections.find(c => c.id === id);
    if (connection) {
      connection.lastUsed = new Date();
      this.saveData(data);
    }
  }

  /**
   * Guarda una query en el historial
   */
  saveQuery(query: QueryHistory): void {
    const data = this.getData();
    data.queries.push(query);
    
    // Limitar el historial a las últimas 100 queries por conexión
    const connectionQueries = data.queries.filter(q => q.connectionId === query.connectionId);
    if (connectionQueries.length > 100) {
      const oldestQuery = connectionQueries[0];
      data.queries = data.queries.filter(q => q.id !== oldestQuery.id);
    }
    
    this.saveData(data);
  }

  /**
   * Obtiene el historial de queries de una conexión
   */
  getQueriesByConnection(connectionId: string): QueryHistory[] {
    const data = this.getData();
    return data.queries
      .filter(q => q.connectionId === connectionId)
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
  }

  /**
   * Elimina una query del historial
   */
  deleteQuery(id: string): void {
    const data = this.getData();
    data.queries = data.queries.filter(q => q.id !== id);
    this.saveData(data);
  }

  /**
   * Establece la conexión actual
   */
  setCurrentConnection(id: string): void {
    const data = this.getData();
    data.currentConnectionId = id;
    this.saveData(data);
  }

  /**
   * Obtiene la conexión actual
   */
  getCurrentConnectionId(): string | null {
    return this.getData().currentConnectionId || null;
  }

  /**
   * Limpia toda la data
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const storageManager = new StorageManager();
