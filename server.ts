import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("inventory.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    unit_price REAL,
    quantity INTEGER,
    stock_value REAL,
    stock_level INTEGER,
    reorder_days INTEGER,
    reorder_quantity INTEGER,
    discontinued BOOLEAN
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/inventory", (req, res) => {
    const items = db.prepare("SELECT * FROM inventory").all();
    res.json(items);
  });

  app.post("/api/inventory", (req, res) => {
    const item = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO inventory 
      (id, name, description, unit_price, quantity, stock_value, stock_level, reorder_days, reorder_quantity, discontinued)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      item.id,
      item.name,
      item.description,
      item.unit_price,
      item.quantity,
      item.stock_value,
      item.stock_level,
      item.reorder_days,
      item.reorder_quantity,
      item.discontinued ? 1 : 0
    );
    res.json({ success: true });
  });

  app.post("/api/inventory/bulk", (req, res) => {
    const items = req.body;
    const insert = db.prepare(`
      INSERT OR REPLACE INTO inventory 
      (id, name, description, unit_price, quantity, stock_value, stock_level, reorder_days, reorder_quantity, discontinued)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items) => {
      for (const item of items) {
        insert.run(
          item.id,
          item.name,
          item.description,
          item.unit_price,
          item.quantity,
          item.stock_value,
          item.stock_level,
          item.reorder_days,
          item.reorder_quantity,
          item.discontinued ? 1 : 0
        );
      }
    });

    transaction(items);
    res.json({ success: true, count: items.length });
  });

  app.delete("/api/inventory/:id", (req, res) => {
    db.prepare("DELETE FROM inventory WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
