import { DatabaseCredentials } from './database';

// Conexión guardada
export interface SavedConnection {
  id: string;
  name: string; // nombre_db (tipo_gestor)
  credentials: DatabaseCredentials;
  createdAt: Date;
  lastUsed?: Date;
}

// Consulta guardada en el historial
export interface QueryHistory {
  id: string;
  connectionId: string;
  query: string;
  executedAt: Date;
  success: boolean;
  error?: string;
}

// Datos de almacenamiento local
export interface LocalStorage {
  connections: SavedConnection[];
  queries: QueryHistory[];
  currentConnectionId?: string;
}
