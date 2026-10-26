import { beforeAll, describe, expect, it } from 'vitest';
import { createDb, expectError, type Db } from './harness';

let db: Db;
beforeAll(async () => {
  db = await createDb();
});

async function pair(game = 'know_me', settings: Record<string, unknown> = {}, start = true) {
  const a = await db.newUser();
  const b = await db.newUser();
  const c = await db.rpc(a, 'create_session', { p_game: game, p_display_name: 'Pavan', p_settings: settings });
  const j = await db.rpc(b, 'join_any', { p_invite_code: c.invite_code, p_display_name: 'Shreya' });
  expect(j).toMatchObject({ ok: true, kind: 'session', session_id: c.session_id, player_number: 2 });
  const id: string = c.session_id;
  if (start) {
    await db.rpc(a, 'set_session_ready', { p_session_id: id, p_ready: true });
    await db.rpc(b, 'set_session_ready', { p_session_id: id, p_ready: true });
    await db.rpc(a, 'start_session', { p_session_id: id });
  }
  return { a, b, id, code: c.invite_code as string };
}

const view = (uid: string, id: string) => db.rpc(uid, 'get_session', { p_session_id: id });
const submit = (uid: string, id: string, key: string, payload: unknown) =>
  db.rpc(uid, 'submit_entry', { p_session_id: id, p_key: key, p_payload: JSON.stringify(payload) });

describe('sessions: lifecycle and access', () => {
  it('creates, joins by code, starts only when both are ready', async () => {
    const { a, b, id } = await pair('trust', {}, false);
    await expectError(db.rpc(a, 'start_session', { p_session_id: id }), 'players_not_ready');
    await db.rpc(a, 'set_session_ready', { p_session_id: id, p_ready: true });
    await db.rpc(b, 'set_session_ready', { p_session_id: id, p_ready: true });
    await expectError(db.rpc(b, 'start_session', { p_session_id: id }), 'host_only');
    await db.rpc(a, 'start_session', { p_session_id: id });
    expect((await view(b, id)).session.status).toBe('in_progress');
  });

  it('rejects unknown games and a third player, and reconnects to the same seat', async () => {
    const u = await db.newUser();
    await expectError(db.rpc(u, 'create_session', { p_game: 'poker', p_display_name: 'A' }), 'invalid_game');
    const { b, id, code } = await pair('trust', {}, false);
    const third = await db.newUser();
    expect(await db.rpc(third, 'join_any', { p_invite_code: code, p_display_name: 'C' })).toEqual({ ok: false, error: 'room_unavailable' });
    expect(await db.rpc(b, 'join_any', { p_invite_code: code, p_display_name: 'Shreya' })).toMatchObject({ ok: true, rejoined: true, session_id: id });
  });

  it('join_any also joins the original game rooms', async () => {
    const a = await db.newUser();
    const b = await db.newUser();
    const r = await db.rpc(a, 'create_room', { p_display_name: 'A', p_mode: 'quick' });
    expect(await db.rpc(b, 'join_any', { p_invite_code: r.invite_code, p_display_name: 'B' })).toMatchObject({ ok: true, kind: 'room', room_id: r.room_id });
  });

  it('blocks outsiders from every session RPC and all tables', async () => {
    const { id } = await pair();
    const o = await db.newUser();
    const calls: [string, Record<string, unknown>][] = [
      ['get_session', { p_session_id: id }],
      ['submit_entry', { p_session_id: id, p_key: 'pub:x', p_payload: '{}' }],
      ['update_session_state', { p_session_id: id, p_patch: '{}', p_expected_version: 0 }],
      ['complete_session', { p_session_id: id }],
      ['delete_session', { p_session_id: id }],
      ['save_moment', { p_game: 'x', p_title: 't', p_session_id: id }],
    ];
    for (const [fn, args] of calls) await expectError(db.rpc(o, fn, args), 'session_not_found');
    for (const t of ['sessions', 'session_players', 'session_entries', 'moments', 'mystery_clues', 'mystery_chapters']) {
      await expectError(db.sqlAs(o, `select * from public.${t}`), 'permission denied');
    }
  });
});

describe('sessions: entry privacy', () => {
  it('sealed entries stay hidden until both have answered', async () => {
    const { a, b, id } = await pair();
    await submit(a, id, 'seal:q1', { answer: 'secret-A' });

    const bv = await view(b, id);
    expect(JSON.stringify(bv.entries)).not.toContain('secret-A');
    expect(bv.partner_pending).toEqual(['seal:q1']);
    await expectError(db.sqlAs(b, `select * from public.session_entries`), 'permission denied');

    await submit(b, id, 'seal:q1', { answer: 'secret-B' });
    for (const uid of [a, b]) {
      const v = await view(uid, id);
      expect(v.entries.filter((e: any) => e.key === 'seal:q1')).toHaveLength(2);
      expect(v.partner_pending).toEqual([]);
    }
  });

  it('sealed entries are immutable; public entries can be edited and removed', async () => {
    const { a, id } = await pair();
    await submit(a, id, 'seal:q2', { v: 1 });
    expect(await submit(a, id, 'seal:q2', { v: 1 })).toMatchObject({ duplicate: true });
    await expectError(submit(a, id, 'seal:q2', { v: 2 }), 'already_submitted');
    await expectError(db.admin(`update public.session_entries set payload = '{}' where step_key = 'seal:q2'`), 'sealed entries are immutable');
    await submit(a, id, 'pub:note1', { text: 'one' });
    await submit(a, id, 'pub:note1', { text: 'two' });
    expect((await view(a, id)).entries.find((e: any) => e.key === 'pub:note1').payload).toEqual({ text: 'two' });
    await expectError(db.rpc(a, 'delete_entry', { p_session_id: id, p_key: 'seal:q2' }), 'invalid_input');
    await db.rpc(a, 'delete_entry', { p_session_id: id, p_key: 'pub:note1' });
    expect((await view(a, id)).entries.find((e: any) => e.key === 'pub:note1')).toBeUndefined();
  });

  it('gated entries need both answers AND both consents', async () => {
    const { a, b, id } = await pair('after_hours');
    await submit(a, id, 'gated:p1', { text: 'A-private' });
    await submit(b, id, 'gated:p1', { text: 'B-private' });
    expect(JSON.stringify((await view(a, id)).entries)).not.toContain('B-private');
    await submit(a, id, 'ok:p1', { reveal: true });
    expect(JSON.stringify((await view(a, id)).entries)).not.toContain('B-private');
    await submit(b, id, 'ok:p1', { reveal: true });
    expect(JSON.stringify((await view(a, id)).entries)).toContain('B-private');
    expect(JSON.stringify((await view(b, id)).entries)).toContain('A-private');
  });

  it('validates keys and sizes', async () => {
    const { a, id } = await pair();
    await expectError(submit(a, id, 'secret:x', {}), 'invalid_input');
    await expectError(submit(a, id, 'pub:../../x', {}), 'invalid_input');
    await expectError(submit(a, id, 'pub:big', { t: 'x'.repeat(9000) }), 'invalid_input');
  });

  it('realtime channel for sessions is members-only', async () => {
    const { a, id } = await pair();
    const o = await db.newUser();
    const ok = await db.sqlAs(a, `select public.is_room_channel_member($1) ok`, [`session:${id}`]);
    const no = await db.sqlAs(o, `select public.is_room_channel_member($1) ok`, [`session:${id}`]);
    expect([ok[0].ok, no[0].ok]).toEqual([true, false]);
    const msgs = await db.admin(`select payload from realtime.messages where topic = $1`, [`session:${id}`]);
    for (const m of msgs) expect(Object.keys(m.payload).sort()).toEqual(['at', 'event', 'session_id']);
  });
});

describe('sessions: shared state', () => {
  it('compare-and-set prevents lost updates', async () => {
    const { a, b, id } = await pair('story');
    expect(await db.rpc(a, 'update_session_state', { p_session_id: id, p_patch: '{"turn":1}', p_expected_version: 0 })).toEqual({ ok: true, version: 1 });
    expect(await db.rpc(b, 'update_session_state', { p_session_id: id, p_patch: '{"turn":9}', p_expected_version: 0 })).toEqual({
      ok: false,
      conflict: true,
      version: 1,
    });
    expect((await view(b, id)).session.state).toEqual({ turn: 1 });
  });

  it('completes, renames and lists on the dashboard; moments are private to the pair', async () => {
    const { a, b, id } = await pair('story');
    await db.rpc(a, 'complete_session', { p_session_id: id, p_title: 'The Night Train' });
    await db.rpc(b, 'rename_session', { p_session_id: id, p_title: 'Night Train to Kochi' });
    const dash = await db.rpc(b, 'get_dashboard');
    expect(dash.sessions.find((s: any) => s.id === id)).toMatchObject({ status: 'completed', title: 'Night Train to Kochi' });

    await db.rpc(a, 'save_moment', { p_game: 'story', p_title: 'Our first story', p_body: 'It began on a train.', p_session_id: id });
    expect((await db.rpc(b, 'get_dashboard')).moments.map((m: any) => m.title)).toContain('Our first story');
    const o = await db.newUser();
    expect((await db.rpc(o, 'get_dashboard')).moments).toEqual([]);
    const mid = (await db.rpc(a, 'get_dashboard')).moments[0].id;
    await expectError(db.rpc(o, 'delete_moment', { p_moment_id: mid }), 'not_found');
    await db.rpc(b, 'delete_moment', { p_moment_id: mid });
    expect((await db.rpc(a, 'get_dashboard')).moments).toEqual([]);
  });

  it('either player can delete a session; entries cascade', async () => {
    const { a, b, id } = await pair();
    await submit(a, id, 'seal:x', { v: 1 });
    await db.rpc(b, 'delete_session', { p_session_id: id });
    expect(await db.admin(`select 1 from public.session_entries where session_id = $1`, [id])).toHaveLength(0);
  });
});

describe('mystery: server-held clues and answers', () => {
  it('each player sees only their own clues; answers are validated on the server', async () => {
    const { a, b, id } = await pair('mystery', { case_id: 'lighthouse-letter' });
    const ma = await db.rpc(a, 'get_mystery', { p_session_id: id });
    const mb = await db.rpc(b, 'get_mystery', { p_session_id: id });
    expect(ma.chapters).toHaveLength(1);
    const aTitles = ma.chapters[0].my_clues.map((c: any) => c.title);
    const bTitles = mb.chapters[0].my_clues.map((c: any) => c.title);
    expect(aTitles.some((t: string) => bTitles.includes(t))).toBe(false);
    expect(ma.chapters[0].partner_clue_count).toBe(bTitles.length);
    expect(JSON.stringify(ma)).not.toContain('answer');
    expect(ma.chapters[0].resolution).toBeNull();
    expect(ma.case.ending).toBeNull();

    // clients cannot jump chapters through the generic state API
    await expectError(db.rpc(a, 'update_session_state', { p_session_id: id, p_patch: '{"chapter":3}', p_expected_version: 0 }), 'invalid_input');

    expect(await db.rpc(a, 'mystery_answer', { p_session_id: id, p_option_id: 't1' })).toMatchObject({ correct: false });
    await expectError(db.rpc(a, 'mystery_answer', { p_session_id: id, p_option_id: 'nadia' }), 'invalid_choice');
    expect(await db.rpc(b, 'mystery_answer', { p_session_id: id, p_option_id: 't3' })).toMatchObject({ correct: true, solved: false });

    const m2 = await db.rpc(a, 'get_mystery', { p_session_id: id });
    expect(m2.chapter).toBe(2);
    expect(m2.chapters[0].resolution).toBeTruthy();
    expect(m2.chapters[0].attempts).toBe(2);

    await db.rpc(a, 'mystery_hint', { p_session_id: id });
    expect((await db.rpc(b, 'get_mystery', { p_session_id: id })).chapters[1].hints).toHaveLength(1);

    await db.rpc(a, 'mystery_answer', { p_session_id: id, p_option_id: 'nadia' });
    const done = await db.rpc(a, 'mystery_answer', { p_session_id: id, p_option_id: 'lantern' });
    expect(done).toMatchObject({ correct: true, solved: true });
    expect((await db.rpc(b, 'get_mystery', { p_session_id: id })).case.ending).toContain('lantern room');
  });

  it('every chapter of every case needs clues from both players and has a valid answer', async () => {
    const rows = await db.admin(`
      select ch.case_id, ch.chapter_no,
             (select count(distinct player_number) from public.mystery_clues c where c.case_id = ch.case_id and c.chapter_no = ch.chapter_no) seats,
             exists (select 1 from jsonb_array_elements(ch.options) o where o ->> 'id' = ch.answer_id) valid
        from public.mystery_chapters ch`);
    expect(rows.length).toBeGreaterThanOrEqual(6);
    for (const r of rows) expect([r.seats, r.valid]).toEqual([2, true]);
  });
});

describe('dashboard', () => {
  it('reports the caller’s own seat for each game', async () => {
    const { a, b, id } = await pair('trust', {}, false);
    const da = await db.rpc(a, 'get_dashboard');
    const dbb = await db.rpc(b, 'get_dashboard');
    expect(da.sessions.find((s: any) => s.id === id).my_seat).toBe(1);
    expect(dbb.sessions.find((s: any) => s.id === id).my_seat).toBe(2);
  });
});
