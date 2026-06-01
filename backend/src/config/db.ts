import mysql from "mysql2/promise";
import { env } from "./env";

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  connectionLimit: 10,
  namedPlaceholders: true,
  timezone: "Z", // treat all date values as UTC so timestamps round-trip correctly
});
