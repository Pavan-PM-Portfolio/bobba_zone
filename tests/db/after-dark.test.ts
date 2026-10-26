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

describe('Desire Mode: disclosure choices', () => {
  it('a secret kept private is never readable by the partner, and blocks a "reveal together" answer', async () => {
    const { a, b, id } = await pair();
    // A: reveal after both answer. B: keep private.
    await submit(a, id, 'seal:x4', { id: 'd-sc-try', picks: ['b'], note: 'a-secret-note' });
    await submit(a, id, 'pub:xd4', { share: 'together' });
    await submit(b, id, 'priv:x4', { id: 'd-sc-try', picks: ['c'], note: 'b-private-note' });
    await submit(b, id, 'pub:xd4', { share: 'private' });
    const va = JSON.stringify(await view(a, id));
    const vb = JSON.stringify(await view(b, id));
    expect(va).not.toContain('b-private-note');
    expect(vb).not.toContain('a-secret-note');
    // the partner only learns the share choice, which is what the marker is for
    expect(vb).toContain('"share":"together"');
    expect(va).toContain('"share":"private"');
  });

  it('answers marked "reveal together" appear for both only once both exist', async () => {
    const { a, b, id } = await pair();
    await submit(a, id, 'seal:x5', { id: 'd-k-blindfold', picks: ['curious'] });
    expect(JSON.stringify(await view(b, id))).not.toContain('curious');
    await submit(b, id, 'seal:x5', { id: 'd-k-blindfold', picks: ['yes'] });
    expect(JSON.stringify(await view(b, id))).toContain('curious');
    expect(JSON.stringify(await view(a, id))).toContain('"yes"');
    // sealed answers cannot be changed after the fact
    await expectError(submit(a, id, 'seal:x5', { id: 'd-k-blindfold', picks: ['no'] }), 'already_submitted');
  });

  it('desire categories are intersected privately like any other boundary', async () => {
    const { a, b, id } = await pair();
    await submit(a, id, 'priv:setup', { adult: true, consent: true, level: 5, include: ['turnons', 'kink', 'secret'], type: 'questions' });
    await submit(b, id, 'priv:setup', { adult: true, consent: true, level: 5, include: ['kink', 'fantasy'], type: 'questions' });
    expect((await terms(a, id)).categories).toEqual(['kink']);
    expect(JSON.stringify(await view(b, id))).not.toContain('turnons');
  });
});

describe('VELVET: Atlas reveal permissions', () => {
  it('Atlas card answers keep their privacy rules', async () => {
    const { a, b, id } = await pair();
    const k = 'a-ka-silk-ties';
    await submit(a, id, `seal:x${k}`, { id: 'v-ka-silk-ties', picks: ['discuss'] });
    await submit(a, id, `pub:xs${k}`, { id: 'v-ka-silk-ties', picks: ['discuss'] });
    await submit(a, id, `pub:xd${k}`, { share: 'now' });
    await submit(b, id, `priv:x${k}`, { id: 'v-ka-silk-ties', picks: ['yes'], tag: 'b-private' });
    await submit(b, id, `pub:xd${k}`, { share: 'private' });
    expect(JSON.stringify(await view(a, id))).not.toContain('b-private');
    expect(JSON.stringify(await view(b, id))).toContain('"discuss"');
  });
});

describe('VELVET: its own game', () => {
  it('can be created as a separate game and uses the same private boundaries', async () => {
    const a = await db.newUser();
    const b = await db.newUser();
    const c = await db.rpc(a, 'create_session', { p_game: 'velvet', p_display_name: 'Pavan', p_settings: JSON.stringify({ mode: 'velvet', style: 'roulette' }), p_title: 'Desire Roulette' });
    await db.rpc(b, 'join_any', { p_invite_code: c.invite_code, p_display_name: 'Partner' });
    const id = c.session_id as string;
    await db.rpc(a, 'set_session_ready', { p_session_id: id, p_ready: true });
    await db.rpc(b, 'set_session_ready', { p_session_id: id, p_ready: true });
    await db.rpc(a, 'start_session', { p_session_id: id });
    expect((await view(a, id)).session.game).toBe('velvet');
    await submit(a, id, 'priv:setup', { adult: true, consent: true, level: 5, include: ['body', 'atlas', 'secret'], type: 'questions' });
    await submit(b, id, 'priv:setup', { adult: true, consent: true, level: 5, include: ['atlas', 'talk'], type: 'questions' });
    expect((await terms(a, id)).categories).toEqual(['atlas']);
    expect(JSON.stringify(await view(b, id))).not.toContain('secret');
  });

  it('still refuses unknown games', async () => {
    const a = await db.newUser();
    await expectError(db.rpc(a, 'create_session', { p_game: 'nope', p_display_name: 'X', p_settings: '{}' }), 'invalid_game');
  });
});
