import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name} (see .env.example)`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: required("JWT_SECRET"),
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: required("DB_USER"),
    password: process.env.DB_PASS ?? "",
    database: required("DB_NAME"),
  },
};
