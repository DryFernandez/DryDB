import { DatabaseType, DatabaseCredentials, ConnectionStatus, DatabaseSchema, TableInfo, ColumnInfo } from '../types/database';

// Importaciones dinámicas para los drivers
let mysql: any;
let pg: any;
let mssql: any;

class DatabaseConnection {
  private connection: any = null;
  private credentials: DatabaseCredentials | null = null;
  private connectionType: DatabaseType | null = null;

  /**
   * Conecta a la base de datos con las credenciales proporcionadas
   */
  async connect(credentials: DatabaseCredentials): Promise<ConnectionStatus> {
    try {
      this.credentials = credentials;
      this.connectionType = credentials.type;

      switch (credentials.type) {
        case DatabaseType.MYSQL:
        case DatabaseType.MARIADB:
          return await this.connectMySQL(credentials);
        
        case DatabaseType.POSTGRESQL:
          return await this.connectPostgreSQL(credentials);
        
        case DatabaseType.SQLSERVER:
          return await this.connectSQLServer(credentials);
        
        case DatabaseType.SQLITE:
          return await this.connectSQLite(credentials);
        
        default:
          throw new Error(`Gestor de base de datos no soportado: ${credentials.type}`);
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Error desconocido al conectar'
      };
    }
  }

  /**
   * Conecta a MySQL/MariaDB
   */
  private async connectMySQL(credentials: DatabaseCredentials): Promise<ConnectionStatus> {
    if (!mysql) {
      mysql = await import('mysql2/promise');
    }

    this.connection = await mysql.createConnection({
      host: credentials.host,
      port: credentials.port,
      user: credentials.username,
      password: credentials.password,
      database: credentials.database,
      ssl: credentials.ssl ? { rejectUnauthorized: false } : undefined
    });

    // Verificar conexión
    await this.connection.ping();

    return {
      connected: true,
      database: credentials.database,
      type: credentials.type
    };
  }

  /**
   * Conecta a PostgreSQL
   */
  private async connectPostgreSQL(credentials: DatabaseCredentials): Promise<ConnectionStatus> {
    if (!pg) {
      pg = await import('pg');
    }

    const client = new pg.Client({
      host: credentials.host,
      port: credentials.port,
      user: credentials.username,
      password: credentials.password,
      database: credentials.database,
      ssl: credentials.ssl ? { rejectUnauthorized: false } : undefined
    });

    await client.connect();
    this.connection = client;

    return {
      connected: true,
      database: credentials.database,
      type: credentials.type
    };
  }

  /**
   * Conecta a SQL Server
   */
  private async connectSQLServer(credentials: DatabaseCredentials): Promise<ConnectionStatus> {
    if (!mssql) {
      mssql = await import('mssql');
    }

    const config = {
      server: credentials.host,
      port: credentials.port,
      user: credentials.username,
      password: credentials.password,
      database: credentials.database,
      options: {
        encrypt: credentials.ssl || true,
        trustServerCertificate: true
      }
    };

    this.connection = await mssql.connect(config);

    return {
      connected: true,
      database: credentials.database,
      type: credentials.type
    };
  }

  /**
   * Conecta a SQLite
   */
  private async connectSQLite(credentials: DatabaseCredentials): Promise<ConnectionStatus> {
    const sqlite3 = await import('sqlite3');
    const { open } = await import('sqlite');

    this.connection = await open({
      filename: credentials.database,
      driver: sqlite3.Database
    });

    return {
      connected: true,
      database: credentials.database,
      type: credentials.type
    };
  }

  /**
   * Desconecta de la base de datos
   */
  async disconnect(): Promise<void> {
    if (!this.connection) return;

    try {
      switch (this.connectionType) {
        case DatabaseType.MYSQL:
        case DatabaseType.MARIADB:
          await this.connection.end();
          break;
        
        case DatabaseType.POSTGRESQL:
          await this.connection.end();
          break;
        
        case DatabaseType.SQLSERVER:
          await this.connection.close();
          break;
        
        case DatabaseType.SQLITE:
          await this.connection.close();
          break;
      }
    } finally {
      this.connection = null;
      this.credentials = null;
      this.connectionType = null;
    }
  }

  /**
   * Obtiene el esquema de la base de datos
   */
  async getSchema(): Promise<DatabaseSchema> {
    if (!this.connection) {
      throw new Error('No hay conexión activa a la base de datos');
    }

    const tables = await this.getTables();
    
    return {
      tables,
      lastUpdated: new Date()
    };
  }

  /**
   * Obtiene la lista de tablas con sus columnas
   */
  private async getTables(): Promise<TableInfo[]> {
    switch (this.connectionType) {
      case DatabaseType.MYSQL:
      case DatabaseType.MARIADB:
        return await this.getMySQLTables();
      
      case DatabaseType.POSTGRESQL:
        return await this.getPostgreSQLTables();
      
      case DatabaseType.SQLSERVER:
        return await this.getSQLServerTables();
      
      case DatabaseType.SQLITE:
        return await this.getSQLiteTables();
      
      default:
        throw new Error('Tipo de base de datos no soportado');
    }
  }

  /**
   * Obtiene tablas de MySQL/MariaDB
   */
  private async getMySQLTables(): Promise<TableInfo[]> {
    const [tables] = await this.connection.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [this.credentials!.database]
    );

    const tableInfos: TableInfo[] = [];

    for (const table of tables as any[]) {
      const [columns] = await this.connection.query(
        `SELECT 
          COLUMN_NAME as name,
          DATA_TYPE as type,
          IS_NULLABLE as nullable,
          COLUMN_KEY as columnKey,
          COLUMN_DEFAULT as defaultValue
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [this.credentials!.database, table.TABLE_NAME]
      );

      const columnInfos: ColumnInfo[] = (columns as any[]).map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable === 'YES',
        isPrimaryKey: col.columnKey === 'PRI',
        isForeignKey: col.columnKey === 'MUL',
        defaultValue: col.defaultValue
      }));

      tableInfos.push({
        name: table.TABLE_NAME,
        columns: columnInfos
      });
    }

    return tableInfos;
  }

  /**
   * Obtiene tablas de PostgreSQL
   */
  private async getPostgreSQLTables(): Promise<TableInfo[]> {
    const result = await this.connection.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );

    const tableInfos: TableInfo[] = [];

    for (const row of result.rows) {
      const columnsResult = await this.connection.query(
        `SELECT 
          column_name as name,
          data_type as type,
          is_nullable as nullable,
          column_default as default_value
        FROM information_schema.columns 
        WHERE table_name = $1`,
        [row.table_name]
      );

      const keysResult = await this.connection.query(
        `SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary`,
        [row.table_name]
      );

      const primaryKeys = keysResult.rows.map((r: any) => r.attname);

      const columnInfos: ColumnInfo[] = columnsResult.rows.map((col: any) => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable === 'YES',
        isPrimaryKey: primaryKeys.includes(col.name),
        isForeignKey: false,
        defaultValue: col.default_value
      }));

      tableInfos.push({
        name: row.table_name,
        schema: 'public',
        columns: columnInfos
      });
    }

    return tableInfos;
  }

  /**
   * Obtiene tablas de SQL Server
   */
  private async getSQLServerTables(): Promise<TableInfo[]> {
    const result = await this.connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`
    );

    const tableInfos: TableInfo[] = [];

    for (const row of result.recordset) {
      const columnsResult = await this.connection.query(
        `SELECT 
          COLUMN_NAME as name,
          DATA_TYPE as type,
          IS_NULLABLE as nullable,
          COLUMN_DEFAULT as defaultValue
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${row.TABLE_NAME}'`
      );

      const keysResult = await this.connection.query(
        `SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_NAME = '${row.TABLE_NAME}' AND CONSTRAINT_NAME LIKE 'PK_%'`
      );

      const primaryKeys = keysResult.recordset.map((r: any) => r.COLUMN_NAME);

      const columnInfos: ColumnInfo[] = columnsResult.recordset.map((col: any) => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable === 'YES',
        isPrimaryKey: primaryKeys.includes(col.name),
        isForeignKey: false,
        defaultValue: col.defaultValue
      }));

      tableInfos.push({
        name: row.TABLE_NAME,
        columns: columnInfos
      });
    }

    return tableInfos;
  }

  /**
   * Obtiene tablas de SQLite
   */
  private async getSQLiteTables(): Promise<TableInfo[]> {
    const tables = await this.connection.all(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );

    const tableInfos: TableInfo[] = [];

    for (const table of tables) {
      const columns = await this.connection.all(`PRAGMA table_info(${table.name})`);

      const columnInfos: ColumnInfo[] = columns.map((col: any) => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0,
        isPrimaryKey: col.pk === 1,
        isForeignKey: false,
        defaultValue: col.dflt_value
      }));

      tableInfos.push({
        name: table.name,
        columns: columnInfos
      });
    }

    return tableInfos;
  }

  /**
   * Ejecuta una consulta SQL
   */
  async executeQuery(query: string): Promise<any> {
    if (!this.connection) {
      throw new Error('No hay conexión activa a la base de datos');
    }

    switch (this.connectionType) {
      case DatabaseType.MYSQL:
      case DatabaseType.MARIADB:
        const [rows] = await this.connection.query(query);
        return rows;
      
      case DatabaseType.POSTGRESQL:
        const result = await this.connection.query(query);
        return result.rows;
      
      case DatabaseType.SQLSERVER:
        const sqlResult = await this.connection.query(query);
        return sqlResult.recordset;
      
      case DatabaseType.SQLITE:
        return await this.connection.all(query);
      
      default:
        throw new Error('Tipo de base de datos no soportado');
    }
  }

  /**
   * Verifica si hay una conexión activa
   */
  isConnected(): boolean {
    return this.connection !== null;
  }

  /**
   * Obtiene las credenciales actuales
   */
  getCredentials(): DatabaseCredentials | null {
    return this.credentials;
  }
}

// Singleton para manejar una única conexión
export const databaseConnection = new DatabaseConnection();
