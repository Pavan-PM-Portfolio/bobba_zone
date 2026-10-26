import { beforeAll, describe, expect, it } from 'vitest';
import { createDb, expectError, type Db } from './harness';

let db: Db;
beforeAll(async () => {
  db = await createDb();
});

async function pair() {
  const a = await db.newUser();
  const b = await db.newUser();
  const c = await db.rpc(a, 'create_session', { p_game: 'after_dark', p_display_name: 'Pavan', p_settings: JSON.stringify({ mode: 'pick_one' }) });
  await db.rpc(b, 'join_any', { p_invite_code: c.invite_code, p_display_name: 'Shreya' });
  await db.rpc(a, 'set_session_ready', { p_session_id: c.session_id, p_ready: true });
  await db.rpc(b, 'set_session_ready', { p_session_id: c.session_id, p_ready: true });
  await db.rpc(a, 'start_session', { p_session_id: c.session_id });
  return { a, b, id: c.session_id as string };
}
const submit = (uid: string, id: string, key: string, payload: unknown) =>
  db.rpc(uid, 'submit_entry', { p_session_id: id, p_key: key, p_payload: JSON.stringify(payload) });
const view = (uid: string, id: string) => db.rpc(uid, 'get_session', { p_session_id: id });
const terms = (uid: string, id: string) => db.rpc(uid, 'after_dark_terms', { p_session_id: id });

describe('After Dark: private entries', () => {
  it('priv entries are never visible to the partner, not even as pending', async () => {
    const { a, b, id } = await pair();
    await submit(a, id, 'priv:d0', { text: 'only-mine' });
    await submit(b, id, 'priv:d0', { text: 'only-hers' });
    const va = await view(a, id);
    const vb = await view(b, id);
    expect(JSON.stringify(va)).toContain('only-mine');
    expect(JSON.stringify(va)).not.toContain('only-hers');
    expect(JSON.stringify(vb)).not.toContain('only-mine');
    expect(va.partner_pending).toEqual([]);
    expect(vb.partner_pending).toEqual([]);
  });

  it('authors can change or delete their private entries', async () => {
    const { a, id } = await pair();
    await submit(a, id, 'priv:d1', { text: 'v1' });
    await submit(a, id, 'priv:d1', { text: 'v2' });
    expect((await view(a, id)).entries.find((e: any) => e.key === 'priv:d1').payload).toEqual({ text: 'v2' });
    await db.rpc(a, 'delete_entry', { p_session_id: id, p_key: 'priv:d1' });
    expect((await view(a, id)).entries.find((e: any) => e.key === 'priv:d1')).toBeUndefined();
  });
});

describe('After Dark: agreed terms', () => {
  it('requires both adult + consent before anything is agreed', async () => {
    const { a, b, id } = await pair();
    expect(await terms(a, id)).toEqual({ me_ready: false, partner_ready: false, agreed: false });
    await submit(a, id, 'priv:setup', { adult: true, consent: true, level: 4, include: ['flirty', 'romantic'], type: 'mix' });
    expect(await terms(a, id)).toEqual({ me_ready: true, partner_ready: false, agreed: false });
    await submit(b, id, 'priv:setup', { adult: true, consent: false, level: 4, include: ['flirty'], type: 'mix' });
    expect((await terms(a, id)).partner_ready).toBe(false);
  });

  it('uses the lower intensity, the shared categories and a compatible content type', async () => {
    const { a, b, id } = await pair();
    await submit(a, id, 'priv:setup', { adult: true, consent: true, level: 4, include: ['bold', 'flirty', 'kissing', 'romantic'], type: 'mix' });
    await submit(b, id, 'priv:setup', { adult: true, consent: true, level: 2, include: ['dates', 'flirty', 'romantic'], type: 'questions' });
    const t = await terms(b, id);
    expect(t).toEqual({ me_ready: true, partner_ready: true, agreed: true, level: 2, categories: ['flirty', 'romantic'], type: 'questions', type_conflict: false });
    // neither player's raw boundaries are exposed
    expect(JSON.stringify(await view(b, id))).not.toContain('kissing');
    expect(JSON.stringify(await view(a, id))).not.toContain('dates');

    // lowering intensity mid-game takes effect immediately
    await submit(a, id, 'priv:setup', { adult: true, consent: true, level: 1, include: ['flirty', 'romantic'], type: 'mix' });
    expect((await terms(b, id)).level).toBe(1);
  });

  it('opposite content types fall back to questions; no shared category means not agreed', async () => {
    const { a, b, id } = await pair();
    await submit(a, id, 'priv:setup', { adult: true, consent: true, level: 3, include: ['playful'], type: 'challenges' });
    await submit(b, id, 'priv:setup', { adult: true, consent: true, level: 3, include: ['bold'], type: 'questions' });
    const t = await terms(a, id);
    expect(t).toMatchObject({ agreed: false, type: 'questions', type_conflict: true, categories: [] });
  });

  it('is members-only and only for After Dark sessions', async () => {
    const { id } = await pair();
    const o = await db.newUser();
    await expectError(terms(o, id), 'session_not_found');
    const x = await db.newUser();
    const s = await db.rpc(x, 'create_session', { p_game: 'trust', p_display_name: 'X' });
    await expectError(terms(x, s.session_id), 'invalid_input');
  });
});
