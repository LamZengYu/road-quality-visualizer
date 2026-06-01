// Creates the database (if needed) and applies db/migrations/001_init.sql.
// Run with: npm run migrate
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  const name = process.env.DB_NAME || "road_quality";
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    multipleStatements: true,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\``);
  await conn.query(`USE \`${name}\``);
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "db", "migrations", "001_init.sql"),
    "utf8"
  );
  await conn.query(sql);
  console.log(`Migration applied to database '${name}'.`);
  await conn.end();
})().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
