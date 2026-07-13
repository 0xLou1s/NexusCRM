import type { Database, DatabaseConnection } from "@workspace/db"
import { and, eq, type SQL } from "drizzle-orm"
import type {
  PgColumn,
  PgInsertValue,
  PgTable,
  PgUpdateSetSource,
} from "drizzle-orm/pg-core"

// Spec §4: every business table carries `org_id`. A table without one cannot be
// reached through this repository at all.
export type OrgScopedTable = PgTable & {
  id: PgColumn
  orgId: PgColumn
}

type Row<TTable extends OrgScopedTable> = TTable["$inferSelect"]
type NewRow<TTable extends OrgScopedTable> = Omit<
  TTable["$inferInsert"],
  "orgId"
>
type RowPatch<TTable extends OrgScopedTable> = Partial<NewRow<TTable>>

/**
 * `orgId` is the first argument of every method, and it comes from the access
 * token by way of @OrgId() — never from an ambient request context, and never
 * from the caller's own input. A query that forgets which organization it
 * belongs to is a compile error here rather than a cross-tenant read at runtime
 * (spec §4).
 *
 * A subclass that needs a query this base does not express builds it against
 * `this.db` and gets the same protection by starting from `within(orgId)`.
 */
export abstract class OrgScopedRepository<TTable extends OrgScopedTable> {
  protected constructor(
    private readonly connection: DatabaseConnection,
    protected readonly table: TTable
  ) {}

  protected get db(): Database {
    return this.connection.db
  }

  protected within(orgId: string, ...conditions: (SQL | undefined)[]): SQL {
    // `and` returns undefined only when handed nothing; the org condition is
    // always there.
    return and(eq(this.table.orgId, orgId), ...conditions) as SQL
  }

  async findById(orgId: string, id: string): Promise<Row<TTable> | undefined> {
    const [row] = await this.db
      .select()
      .from(this.table as PgTable)
      .where(this.within(orgId, eq(this.table.id, id)))
      .limit(1)

    return row as Row<TTable> | undefined
  }

  async findMany(
    orgId: string,
    ...conditions: (SQL | undefined)[]
  ): Promise<Row<TTable>[]> {
    const rows = await this.db
      .select()
      .from(this.table as PgTable)
      .where(this.within(orgId, ...conditions))

    return rows as Row<TTable>[]
  }

  async insert(orgId: string, values: NewRow<TTable>): Promise<Row<TTable>> {
    // Drizzle's value types are mapped over the table's columns and cannot be
    // resolved while the table is still a type parameter. The assertion is what
    // it costs to state the rule once here instead of in every repository.
    const [row] = await this.db
      .insert(this.table)
      .values({ ...values, orgId } as PgInsertValue<TTable>)
      .returning()

    if (!row) throw new Error("An insert returned no row")

    return row as Row<TTable>
  }

  async update(
    orgId: string,
    id: string,
    patch: RowPatch<TTable>
  ): Promise<Row<TTable> | undefined> {
    const [row] = await this.db
      .update(this.table)
      .set(patch as PgUpdateSetSource<TTable>)
      .where(this.within(orgId, eq(this.table.id, id)))
      .returning()

    return row as Row<TTable> | undefined
  }

  async deleteById(orgId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(this.table)
      .where(this.within(orgId, eq(this.table.id, id)))
      .returning({ id: this.table.id })

    return deleted.length > 0
  }
}
