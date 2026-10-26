/**
 * Runs the real Supabase migrations inside an in-process Postgres (PGlite)
 * with minimal stand-ins for the Supabase-managed `auth` and `realtime`
 * schemas, then lets tests call RPCs and raw SQL *as* a given user with the
 * same `authenticated` role and RLS that PostgREST uses in production.
 */
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const MIGRATIONS_DIR = join(import.meta.dirname, '..', '..', 'supabase', 'migrations');

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, is_anonymous boolean default true);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated;

  create schema realtime;
  grant usage on schema realtime to authenticated;
  create table realtime.messages (
    id bigint generated always as identity primary key,
    topic text not null,
    extension text not null,
    event text,
    payload jsonb,
    private boolean default true,
    inserted_at timestamptz default now()
  );
  alter table realtime.messages enable row level security;
  grant select, insert on realtime.messages to authenticated;
  create function realtime.topic() returns text language sql stable as $$
    select nullif(current_setting('realtime.topic', true), '')
  $$;
  grant execute on function realtime.topic() to authenticated;
  -- mirrors realtime.send(payload, event, topic, private)
  create function realtime.send(payload jsonb, event text, topic text, private boolean default true)
  returns void language sql as $$
    insert into realtime.messages (topic, extension, event, payload, private)
    values (topic, 'broadcast', event, payload, private)
  $$;
`;

export interface Db {
  pg: PGlite;
  newUser(): Promise<string>;
  /** Call an RPC exactly like supabase.rpc() would (as `authenticated`). */
  rpc<T = any>(uid: string, fn: string, args?: Record<string, unknown>): Promise<T>;
  /** Run arbitrary SQL as the given user (simulates direct REST/table access). */
  sqlAs<T = any>(uid: string, sql: string, params?: unknown[], extra?: Record<string, string>): Promise<T[]>;
  /** Superuser query for assertions/test setup. */
  admin<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
}

async function asUser<T>(pg: PGlite, uid: string, extra: Record<string, string>, fn: (tx: Transaction) => Promise<T>) {
  return pg.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    for (const [k, v] of Object.entries(extra)) {
      await tx.query(`select set_config($1, $2, true)`, [k, v]);
    }
    await tx.exec('set local role authenticated');
    return fn(tx);
  });
}

export async function createDb(): Promise<Db> {
  const pg = new PGlite();
  await pg.exec(SUPABASE_STUBS);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    await pg.exec(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'));
  }

  return {
    pg,
    async newUser() {
      const id = randomUUID();
      await pg.query('insert into auth.users (id) values ($1)', [id]);
      return id;
    },
    async rpc(uid, fn, args = {}) {
      const keys = Object.keys(args);
      const call = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`;
      const res = await asUser(pg, uid, {}, (tx) => tx.query<{ r: any }>(call, keys.map((k) => args[k])));
      return res.rows[0]!.r;
    },
    async sqlAs(uid, sql, params = [], extra = {}) {
      const res = await asUser(pg, uid, extra, (tx) => tx.query(sql, params));
      return res.rows as any[];
    },
    async admin(sql, params = []) {
      return (await pg.query(sql, params)).rows as any[];
    },
  };
}

/** Assert that a promise rejects with a given error code (exception message). */
export async function expectError(p: Promise<unknown>, code: string | RegExp) {
  try {
    await p;
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (typeof code === 'string' ? msg.includes(code) : code.test(msg)) return msg;
    throw new Error(`Expected error ${code} but got: ${msg}`);
  }
  throw new Error(`Expected error ${code} but call succeeded`);
}
