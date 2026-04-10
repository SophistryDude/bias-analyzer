import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local or your environment."
  );
}

// For query purposes (connection pool)
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
