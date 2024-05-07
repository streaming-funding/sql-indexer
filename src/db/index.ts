import pg from "pg";
import {
  sql,
  Kysely,
  PostgresDialect,
  CamelCasePlugin,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";
import { Address } from "viem";
import { schemaName, migrate } from "./migrate.js";

type Database = {
  pools: PoolsTable;
  recipients: RecipientsTable;
};

type PoolsTable = {
  id: string;
  chainId: number;
  token: Address;
  metadataCid: string;
  createdAtBlock: bigint;
  updatedAtBlock: bigint;
  strategyAddress: Address;
  strategyId: string;
  strategyName: string;
  projectId: string;
  tags: string[];
};

type RecipientsTable = {
  id: string;
  chainId: number;
  poolId: string;
  recipientAddress: Address;
  anchorAddress: Address | null;
  status: "PENDING" | "REJECTED" | "APPROVED";
  metadataCid: string | null;
  createdAtBlock: bigint;
  updatedAtBlock: bigint;
  tags: string[];
};

type Pool = Selectable<PoolsTable>;
type PoolNew = Insertable<PoolsTable>;
type PoolUpdate = Updateable<PoolsTable>;
type Recipient = Selectable<RecipientsTable>;
type RecipientNew = Insertable<RecipientsTable>;
type RecipientUpdate = Updateable<RecipientsTable>;

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    connectionString: process.env.DATABASE_URI,
  }),
});

const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
}).withSchema(schemaName);

async function createSchemaIfNotExists() {
  const exists = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata
      WHERE schema_name = ${schemaName}
    )`.execute(db);

  if (exists.rows.length > 0 && exists.rows[0].exists) {
    console.info(`schema "${schemaName}" exists, skipping creation`);

    return;
  }

  console.info(`schema "${schemaName}" does not exist, creating schema`);

  await db.transaction().execute(async (tx) => {
    await tx.schema.createSchema(schemaName).execute();
    await migrate(tx);
  });
}

export {
  db,
  createSchemaIfNotExists,
  Database,
  PoolsTable,
  Pool,
  PoolNew,
  PoolUpdate,
  Recipient,
  RecipientNew,
  RecipientUpdate,
};
