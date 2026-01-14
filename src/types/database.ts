// Tipos de gestores de base de datos soportados
export enum DatabaseType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  SQLSERVER = 'sqlserver',
  MARIADB = 'mariadb',
  SQLITE = 'sqlite'
}

// Credenciales de conexión
export interface DatabaseCredentials {
  type: DatabaseType;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
}

// Configuración de conexión
export interface ConnectionConfig {
  credentials: DatabaseCredentials;
  connectionString?: string;
}

// Estado de la conexión
export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  database?: string;
  type?: DatabaseType;
}

// Estructura de tabla
export interface TableInfo {
  name: string;
  schema?: string;
  columns: ColumnInfo[];
}

// Información de columna
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: any;
}

// Esquema de base de datos
export interface DatabaseSchema {
  tables: TableInfo[];
  lastUpdated: Date;
}
