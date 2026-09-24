import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const globalForDb = globalThis as unknown as { albaDb?: Database.Database };

export function databasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "alba.db");
}

export function openDatabase(file = databasePath()): Database.Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seedIfEmpty(db);
  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.albaDb) {
    globalForDb.albaDb = openDatabase();
  }
  return globalForDb.albaDb;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      kind TEXT NOT NULL CHECK (kind IN ('fijo', 'consumible')),
      is_example INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      unit TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0,
      estimated_uses REAL,
      is_example INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candle_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      margin_percent REAL NOT NULL DEFAULT 0,
      margin_fixed REAL NOT NULL DEFAULT 0,
      is_example INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipe_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candle_type_id INTEGER NOT NULL REFERENCES candle_types(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity REAL NOT NULL DEFAULT 0,
      UNIQUE (candle_type_id, product_id)
    );
  `);
}

function seedIfEmpty(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS total FROM categories").get() as { total: number };
  if (count.total > 0) return;

  const insertCategory = db.prepare(
    "INSERT INTO categories (name, kind, is_example) VALUES (?, ?, 1)",
  );
  const insertProduct = db.prepare(
    `INSERT INTO products
      (name, category_id, unit, quantity, unit_price, estimated_uses, is_example)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  );
  const insertCandle = db.prepare(
    "INSERT INTO candle_types (name, margin_percent, margin_fixed, is_example) VALUES (?, ?, ?, 1)",
  );
  const insertLine = db.prepare(
    "INSERT INTO recipe_lines (candle_type_id, product_id, quantity) VALUES (?, ?, ?)",
  );

  const seed = db.transaction(() => {
    const fijos = Number(insertCategory.run("Activos fijos", "fijo").lastInsertRowid);
    const variables = Number(insertCategory.run("Activos variables", "consumible").lastInsertRowid);
    const empaquetado = Number(insertCategory.run("Empaquetado", "consumible").lastInsertRowid);

    const molde = Number(
      insertProduct.run("Molde de vaso 200 ml", fijos, "unidad", 2, 18, 500).lastInsertRowid,
    );
    const cera = Number(
      insertProduct.run("Cera de soja", variables, "kg", 5, 8.5, null).lastInsertRowid,
    );
    const mecha = Number(
      insertProduct.run("Mecha de algodón", variables, "m", 20, 0.4, null).lastInsertRowid,
    );
    const vaso = Number(
      insertProduct.run("Vaso de cristal 200 ml", empaquetado, "unidad", 40, 0.85, null)
        .lastInsertRowid,
    );
    const bolsa = Number(
      insertProduct.run("Bolsa de papel kraft", empaquetado, "unidad", 30, 0.25, null)
        .lastInsertRowid,
    );
    insertProduct.run("Lacre para el sello", empaquetado, "unidad", 2, 0.15, null);

    const vela = Number(insertCandle.run("Vela de soja 200 ml", 40, 0).lastInsertRowid);
    insertLine.run(vela, cera, 0.2);
    insertLine.run(vela, mecha, 0.15);
    insertLine.run(vela, vaso, 1);
    insertLine.run(vela, bolsa, 1);
    insertLine.run(vela, molde, 0);
  });

  seed();
}
