import { Client } from "postgres";
import { config } from "../config.ts";

let dbClient: Client | null = null;
let isConnected = false;

// Подключение к базе данных
export async function connectDB(): Promise<Client | null> {
  if (isConnected && dbClient) {
    return dbClient;
  }

  try {
    console.log("🔌 Connecting to PostgreSQL...");
    
    dbClient = new Client({
      hostname: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
    });

    await dbClient.connect();
    isConnected = true;
    
    console.log("✅ Connected to PostgreSQL");
    return dbClient;
  } catch (error) {
    console.warn("⚠️  Failed to connect to PostgreSQL:", error);
    console.warn("⚠️  Bot will work without database functionality");
    dbClient = null;
    isConnected = false;
    return null;
  }
}

// Отключение от базы данных
export async function disconnectDB(): Promise<void> {
  if (dbClient && isConnected) {
    try {
      await dbClient.end();
      console.log("👋 Disconnected from PostgreSQL");
    } catch (error) {
      console.error("Error disconnecting from database:", error);
    } finally {
      dbClient = null;
      isConnected = false;
    }
  }
}

// Получить клиент базы данных
export function getDBClient(): Client | null {
  return isConnected ? dbClient : null;
}

// Проверить, подключена ли БД
export function isDatabaseConnected(): boolean {
  return isConnected;
}

// Выполнить SQL запрос
export async function query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
  const client = getDBClient();
  
  if (!client) {
    throw new Error("Database not connected");
  }

  try {
    const result = await client.queryObject<T>(sql, params);
    return { rows: result.rows };
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

// Инициализация схемы базы данных
export async function initializeDatabase(): Promise<void> {
  const client = await connectDB();
  
  if (!client) {
    console.warn("⚠️  Skipping database initialization - not connected");
    return;
  }

  try {
    console.log("🔧 Initializing database schema...");
    
    // Читаем и выполняем SQL схему
    const schemaUrl = new URL("./schema.sql", import.meta.url);
    const schemaPath = schemaUrl.protocol === "file:" 
      ? schemaUrl.pathname.replace(/^\/([A-Z]:)/, "$1") // Fix Windows path
      : schemaUrl.pathname;
    const schema = await Deno.readTextFile(schemaPath);
    
    await client.queryArray(schema);
    
    console.log("✅ Database schema initialized");
  } catch (error: any) {
    // Игнорируем ошибку если схема уже существует
    if (error?.fields?.code === "42710") { // trigger already exists
      console.log("✅ Database schema already exists");
      return;
    }
    console.error("❌ Error initializing database:", error);
    throw error;
  }
}
