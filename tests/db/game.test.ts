import { beforeAll, describe, expect, it } from 'vitest';
import { createDb, expectError, type Db } from './harness';

let db: Db;

beforeAll(async () => {
  db = await createDb();
});

/** Create a room as a new host and seat a new partner. */
async function setupPair(opts: { mode?: string; rounds?: string[] | null; start?: boolean } = {}) {
  const host = await db.newUser();
  const partner = await db.newUser();
  const created = await db.rpc(host, 'create_room', {
    p_display_name: 'Shreya',
    p_couple_name: 'S & P',
    p_mode: opts.mode ?? 'quick',
    p_rounds: opts.rounds ?? null,
  });
  const joined = await db.rpc(partner, 'join_room', {
    p_invite_code: created.invite_code,
    p_display_name: 'Pavan',
  });
  expect(joined.ok).toBe(true);
  const roomId: string = created.room_id;
  if (opts.start) {
    await db.rpc(host, 'set_ready', { p_room_id: roomId, p_ready: true });
    await db.rpc(partner, 'set_ready', { p_room_id: roomId, p_ready: true });
    await db.rpc(host, 'start_game', { p_room_id: roomId });
  }
  return { host, partner, roomId, code: created.invite_code as string };
}

async function current(uid: string, roomId: string) {
  const s = await db.rpc(uid, 'get_game_state', { p_room_id: roomId });
  return s.current as {
    id: string;
    index: number;
    status: string;
    my_answer: number | null;
    partner_submitted: boolean;
    answers: Record<string, number> | null;
    discussion_prompt: string | null;
  };
}

describe('question bank', () => {
  it('seeds 60 active questions, 15 per round, with stable slugs', async () => {
    const rows = await db.admin<{ category: string; n: number }>(
      `select category, count(*)::int n from public.questions where is_active group by category order by category`,
    );
    expect(rows).toEqual([
      { category: 'chaotic', n: 15 },
      { category: 'future', n: 15 },
      { category: 'romance', n: 15 },
      { category: 'understanding', n: 15 },
    ]);
    const slugs = await db.admin(`select count(distinct slug)::int n from public.questions`);
    expect(slugs[0].n).toBe(60);
  });

  it('lets signed-in users read active questions but not inactive ones', async () => {
    const u = await db.newUser();
    await db.admin(`update public.questions set is_active = false where slug = 'future-15'`);
    const visible = await db.sqlAs(u, `select count(*)::int n from public.questions`);
    expect(visible[0].n).toBe(59);
    await db.admin(`update public.questions set is_active = true where slug = 'future-15'`);
    await expectError(db.sqlAs(u, `update public.questions set question_text = 'hacked'`), 'permission denied');
  });
});

describe('room creation and joining', () => {
  it('creates a room with a secure-format invite code and per-round question selection', async () => {
    const host = await db.newUser();
    const r = await db.rpc(host, 'create_room', {
      p_display_name: '  Shreya  ',
      p_mode: 'standard',
      p_rounds: ['future', 'romance', 'romance'],
    });
    expect(r.invite_code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    const state = await db.rpc(host, 'get_game_state', { p_room_id: r.room_id });
    expect(state.room.status).toBe('waiting');
    expect(state.room.settings.rounds).toEqual(['romance', 'future']); // deduped, canonical order
    expect(state.room.question_count).toBe(12);
    expect(state.me).toMatchObject({ player_number: 1, display_name: 'Shreya', is_host: true });

    const order = await db.admin(
      `select q.category from public.game_questions gq join public.questions q on q.id = gq.question_id
        where gq.room_id = $1 order by gq.question_index`,
      [r.room_id],
    );
    expect(order.slice(0, 6).every((x) => x.category === 'romance')).toBe(true);
    expect(order.slice(6).every((x) => x.category === 'future')).toBe(true);
  });

  it('generates distinct codes', async () => {
    const host = await db.newUser();
    const codes = new Set<string>();
    for (let i = 0; i < 15; i++) {
      codes.add((await db.rpc(host, 'create_room', { p_display_name: 'A', p_mode: 'quick' })).invite_code);
    }
    expect(codes.size).toBe(15);
  });

  it('validates inputs on the server', async () => {
    const u = await db.newUser();
    await expectError(db.rpc(u, 'create_room', { p_display_name: '   ' }), 'invalid_name');
    await expectError(db.rpc(u, 'create_room', { p_display_name: 'x'.repeat(31) }), 'invalid_name');
    await expectError(db.rpc(u, 'create_room', { p_display_name: 'A', p_mode: 'marathon' }), 'invalid_mode');
    await expectError(db.rpc(u, 'create_room', { p_display_name: 'A', p_rounds: ['spicy'] }), 'invalid_rounds');
  });

  it('requires authentication for every RPC', async () => {
    await expectError(
      db.pg.transaction(async (tx) => {
        await tx.exec('set local role authenticated');
        await tx.query(`select public.create_room('A')`);
      }),
      'not_authenticated',
    );
    await expectError(
      db.pg.transaction(async (tx) => {
        await tx.exec('set local role anon');
        await tx.query(`select public.create_room('A')`);
      }),
      'permission denied',
    );
  });

  it('refuses anonymous Supabase sessions (accounts only)', async () => {
    const anon = await db.newUser();
    const asAnon = (sql: string) =>
      db.pg.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [anon]);
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: anon, role: 'authenticated', is_anonymous: true }),
        ]);
        await tx.exec('set local role authenticated');
        return tx.query(sql);
      });
    await expectError(asAnon(`select public.create_room('Sneaky')`), 'account_required');
    await expectError(asAnon(`select public.get_history()`), 'account_required');
    const member = await asAnon(`select public.is_room_channel_member('room:00000000-0000-0000-0000-000000000000') ok`);
    expect((member.rows[0] as { ok: boolean }).ok).toBe(false);
  });

  it('accepts codes typed in lowercase with spaces/dashes', async () => {
    const host = await db.newUser();
    const partner = await db.newUser();
    const r = await db.rpc(host, 'create_room', { p_display_name: 'A' });
    const messy = `${r.invite_code.slice(0, 4).toLowerCase()} - ${r.invite_code.slice(4)}`;
    const j = await db.rpc(partner, 'join_room', { p_invite_code: messy, p_display_name: 'B' });
    expect(j).toMatchObject({ ok: true, player_number: 2, rejoined: false });
  });

  it('returns one generic error for invalid codes', async () => {
    const u = await db.newUser();
    expect(await db.rpc(u, 'join_room', { p_invite_code: 'ZZZZZZZZ', p_display_name: 'B' })).toEqual({
      ok: false,
      error: 'room_unavailable',
    });
    expect(await db.rpc(u, 'join_room', { p_invite_code: 'short', p_display_name: 'B' })).toEqual({
      ok: false,
      error: 'room_unavailable',
    });
  });

  it('rate-limits repeated failed join attempts (anti-enumeration)', async () => {
    const u = await db.newUser();
    for (let i = 0; i < 10; i++) {
      await db.rpc(u, 'join_room', { p_invite_code: `ABCD${2000 + i}`.slice(0, 8), p_display_name: 'B' });
    }
    // even a valid code is refused while limited
    const host = await db.newUser();
    const r = await db.rpc(host, 'create_room', { p_display_name: 'A' });
    expect(await db.rpc(u, 'join_room', { p_invite_code: r.invite_code, p_display_name: 'B' })).toEqual({
      ok: false,
      error: 'rate_limited',
    });
  });

  it('prevents a third player from joining (capacity)', async () => {
    const { code } = await setupPair();
    const intruder = await db.newUser();
    expect(await db.rpc(intruder, 'join_room', { p_invite_code: code, p_display_name: 'C' })).toEqual({
      ok: false,
      error: 'room_unavailable',
    });
  });

  it('reconnects a returning player to the same seat (no duplicate seats)', async () => {
    const { partner, roomId, code } = await setupPair();
    const again = await db.rpc(partner, 'join_room', { p_invite_code: code, p_display_name: 'Pavan' });
    expect(again).toMatchObject({ ok: true, room_id: roomId, player_number: 2, rejoined: true });
    const seats = await db.admin(`select count(*)::int n from public.game_players where room_id = $1`, [roomId]);
    expect(seats[0].n).toBe(2);
  });

  it('enforces seat uniqueness at the database level', async () => {
    const { roomId, partner } = await setupPair();
    await expectError(
      db.admin(
        `insert into public.game_players (room_id, user_id, display_name, player_number) values ($1, $2, 'dup', 1)`,
        [roomId, partner],
      ),
      /duplicate key|unique/,
    );
  });

  it('does not let late joiners into a game in progress', async () => {
    const { code } = await setupPair({ start: true });
    const late = await db.newUser();
    expect((await db.rpc(late, 'join_room', { p_invite_code: code, p_display_name: 'C' })).ok).toBe(false);
  });
});

describe('lobby', () => {
  it('only lets the host start, and only when both are ready', async () => {
    const { host, partner, roomId } = await setupPair();
    await expectError(db.rpc(host, 'start_game', { p_room_id: roomId }), 'players_not_ready');
    await db.rpc(host, 'set_ready', { p_room_id: roomId, p_ready: true });
    await db.rpc(partner, 'set_ready', { p_room_id: roomId, p_ready: true });
    await expectError(db.rpc(partner, 'start_game', { p_room_id: roomId }), 'host_only');
    expect(await db.rpc(host, 'start_game', { p_room_id: roomId })).toMatchObject({ ok: true, already_started: false });
    // idempotent
    expect(await db.rpc(host, 'start_game', { p_room_id: roomId })).toMatchObject({ ok: true, already_started: true });
    const s = await db.rpc(partner, 'get_game_state', { p_room_id: roomId });
    expect(s.room.status).toBe('in_progress');
    expect(s.current.index).toBe(0);
  });

  it('cannot start alone', async () => {
    const host = await db.newUser();
    const r = await db.rpc(host, 'create_room', { p_display_name: 'A' });
    await db.rpc(host, 'set_ready', { p_room_id: r.room_id, p_ready: true });
    await expectError(db.rpc(host, 'start_game', { p_room_id: r.room_id }), 'waiting_for_partner');
  });
});

describe('authorisation', () => {
  it('blocks non-members from every room RPC', async () => {
    const { roomId } = await setupPair({ start: true });
    const outsider = await db.newUser();
    const gq = await db.admin(`select id from public.game_questions where room_id = $1 and question_index = 0`, [roomId]);
    const calls: [string, Record<string, unknown>][] = [
      ['get_game_state', { p_room_id: roomId }],
      ['set_ready', { p_room_id: roomId, p_ready: true }],
      ['start_game', { p_room_id: roomId }],
      ['submit_answer', { p_room_id: roomId, p_game_question_id: gq[0].id, p_selected_player_number: 1 }],
      ['reveal_question', { p_room_id: roomId, p_game_question_id: gq[0].id }],
      ['skip_question', { p_room_id: roomId, p_game_question_id: gq[0].id, p_vote: true }],
      ['advance_question', { p_room_id: roomId, p_from_index: 0 }],
      ['get_completed_results', { p_room_id: roomId }],
      ['delete_game_session', { p_room_id: roomId }],
      ['cancel_room', { p_room_id: roomId }],
      ['play_again', { p_room_id: roomId }],
    ];
    for (const [fn, args] of calls) {
      await expectError(db.rpc(outsider, fn, args), 'room_not_found');
    }
  });

  it('denies all direct table access to game data', async () => {
    const { host } = await setupPair({ start: true });
    for (const table of ['game_rooms', 'game_players', 'game_questions', 'answers', 'game_results', 'rate_limit_events']) {
      await expectError(db.sqlAs(host, `select * from public.${table}`), 'permission denied');
    }
    await expectError(
      db.sqlAs(host, `insert into public.game_results (room_id, questions_answered, matching_answers, agreement_percentage)
                      select id, 10, 10, 100 from public.game_rooms limit 1`),
      'permission denied',
    );
  });

  it('keeps internal helper functions private', async () => {
    const u = await db.newUser();
    for (const fn of ['public._compute_results(gen_random_uuid())', 'public.cleanup_expired_rooms()', 'public._generate_invite_code()']) {
      await expectError(db.sqlAs(u, `select ${fn}`), 'permission denied');
    }
  });

  it('only lets players see their own profile', async () => {
    const { host, partner } = await setupPair();
    const rows = await db.sqlAs(host, `select id from public.profiles`);
    expect(rows.map((r) => r.id)).toEqual([host]);
    expect(rows.map((r) => r.id)).not.toContain(partner);
  });
});

describe('answers: privacy, reveal, immutability', () => {
  it('never exposes the partner answer before both have submitted', async () => {
    const { host, partner, roomId } = await setupPair({ start: true });
    const q = await current(host, roomId);

    const res = await db.rpc(host, 'submit_answer', {
      p_room_id: roomId,
      p_game_question_id: q.id,
      p_selected_player_number: 2,
    });
    expect(res).toEqual({ ok: true, duplicate: false, revealed: false });

    // Partner sees only "partner submitted", never the choice.
    const seen = await current(partner, roomId);
    expect(seen.partner_submitted).toBe(true);
    expect(seen.my_answer).toBeNull();
    expect(seen.answers).toBeNull();
    expect(seen.status).toBe('pending');
    expect(seen.discussion_prompt).toBeNull();
    const fullState = JSON.stringify(await db.rpc(partner, 'get_game_state', { p_room_id: roomId }));
    expect(fullState).not.toMatch(/selected_player_number/);

    // Direct table read is denied, so no API path leaks it.
    await expectError(db.sqlAs(partner, `select * from public.answers`), 'permission denied');
    // Completed-results endpoint refuses while game is live.
    await expectError(db.rpc(partner, 'get_completed_results', { p_room_id: roomId }), 'game_not_completed');

    // Realtime payloads sent so far contain no selection.
    const msgs = await db.admin(`select event, payload from realtime.messages where topic = $1`, [`room:${roomId}`]);
    const submitted = msgs.filter((m) => m.event === 'answer_submitted');
    expect(submitted).toHaveLength(1);
    expect(Object.keys(submitted[0].payload).sort()).toEqual(['at', 'event', 'player_number', 'question_index', 'room_id']);
    expect(submitted[0].payload.player_number).toBe(1); // who, not what

    // The submitter sees their own choice.
    expect((await current(host, roomId)).my_answer).toBe(2);
  });

  it('reveals both answers simultaneously once both have submitted', async () => {
    const { host, partner, roomId } = await setupPair({ start: true });
    const q = await current(host, roomId);
    await db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 1 });
    const second = await db.rpc(partner, 'submit_answer', {
      p_room_id: roomId,
      p_game_question_id: q.id,
      p_selected_player_number: 1,
    });
    expect(second.revealed).toBe(true);
    for (const uid of [host, partner]) {
      const c = await current(uid, roomId);
      expect(c.status).toBe('revealed');
      expect(c.answers).toEqual({ p1: 1, p2: 1 });
      expect(c.discussion_prompt).toBeTruthy();
    }
    const events = await db.admin(`select event from realtime.messages where topic = $1 order by id`, [`room:${roomId}`]);
    expect(events.map((e) => e.event)).toContain('question_revealed');
  });

  it('is idempotent for duplicate submissions and refuses changed answers', async () => {
    const { host, roomId } = await setupPair({ start: true });
    const q = await current(host, roomId);
    const args = { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 1 };
    await db.rpc(host, 'submit_answer', args);
    expect(await db.rpc(host, 'submit_answer', args)).toMatchObject({ ok: true, duplicate: true });
    await expectError(db.rpc(host, 'submit_answer', { ...args, p_selected_player_number: 2 }), 'already_submitted');
    const count = await db.admin(`select count(*)::int n from public.answers where game_question_id = $1`, [q.id]);
    expect(count[0].n).toBe(1);
  });

  it('makes answers immutable even for privileged writes', async () => {
    const { host, roomId } = await setupPair({ start: true });
    const q = await current(host, roomId);
    await db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 1 });
    await expectError(db.admin(`update public.answers set selected_player_number = 2`), 'answers are immutable');
    await expectError(db.sqlAs(host, `update public.answers set selected_player_number = 2`), 'permission denied');
  });

  it('rejects invalid choices and non-current questions', async () => {
    const { host, roomId } = await setupPair({ start: true });
    const q = await current(host, roomId);
    await expectError(
      db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 3 }),
      'invalid_choice',
    );
    const later = await db.admin(`select id from public.game_questions where room_id = $1 and question_index = 1`, [roomId]);
    await expectError(
      db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: later[0].id, p_selected_player_number: 1 }),
      'question_not_current',
    );
    // a question id from another room
    const other = await setupPair({ start: true });
    const oq = await current(other.host, other.roomId);
    await expectError(
      db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: oq.id, p_selected_player_number: 1 }),
      'question_not_found',
    );
  });

  it('cannot submit before the game starts', async () => {
    const { host, roomId } = await setupPair();
    const gq = await db.admin(`select id from public.game_questions where room_id = $1 and question_index = 0`, [roomId]);
    await expectError(
      db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: gq[0].id, p_selected_player_number: 1 }),
      'game_not_in_progress',
    );
  });

  it('reveal_question refuses to reveal with only one answer', async () => {
    const { host, partner, roomId } = await setupPair({ start: true });
    const q = await current(host, roomId);
    await db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 2 });
    expect(await db.rpc(partner, 'reveal_question', { p_room_id: roomId, p_game_question_id: q.id })).toEqual({
      ok: true,
      revealed: false,
    });
    expect((await current(partner, roomId)).answers).toBeNull();
  });
});

describe('Realtime channel authorisation', () => {
  it('only room members pass the private-channel policy; clients cannot send broadcasts', async () => {
    const { host, roomId } = await setupPair({ start: true });
    const outsider = await db.newUser();
    const topic = { 'realtime.topic': `room:${roomId}` };

    const memberSees = await db.sqlAs(host, `select count(*)::int n from realtime.messages`, [], topic);
    expect(memberSees[0].n).toBeGreaterThan(0);
    const outsiderSees = await db.sqlAs(outsider, `select count(*)::int n from realtime.messages`, [], topic);
    expect(outsiderSees[0].n).toBe(0);

    // members may publish presence, not broadcast (no spoofed "revealed" events)
    await db.sqlAs(host, `insert into realtime.messages (topic, extension) values ($1, 'presence')`, [`room:${roomId}`], topic);
    await expectError(
      db.sqlAs(
        host,
        `insert into realtime.messages (topic, extension, event, payload) values ($1, 'broadcast', 'question_revealed', '{}')`,
        [`room:${roomId}`],
        topic,
      ),
      'row-level security',
    );
    await expectError(
      db.sqlAs(outsider, `insert into realtime.messages (topic, extension) values ($1, 'presence')`, [`room:${roomId}`], topic),
      'row-level security',
    );
    // malformed topics are rejected
    const bad = await db.sqlAs(host, `select public.is_room_channel_member('room:not-a-uuid') ok`);
    expect(bad[0].ok).toBe(false);
  });

  it('no broadcast in a full game ever carries an answer selection', async () => {
    const { roomId } = await playFullGame([1, 1, 2, 1, 1, 2, 'skip', 1, 2, 1, 1, 1], [1, 2, 2, 1, 2, 2, 'skip', 1, 2, 2, 1, 1]);
    const msgs = await db.admin(`select payload from realtime.messages where topic = $1`, [`room:${roomId}`]);
    for (const m of msgs) {
      const keys = Object.keys(m.payload);
      expect(keys).not.toContain('selected_player_number');
      expect(keys).not.toContain('answers');
      expect(keys).not.toContain('answer');
    }
  });
});

type Move = 1 | 2 | 'skip';

async function playFullGame(p1Moves: Move[], p2Moves: Move[]) {
  const pair = await setupPair({ start: true, mode: 'quick' }); // 12 questions
  const { host, partner, roomId } = pair;
  for (let i = 0; i < p1Moves.length; i++) {
    const q = await current(host, roomId);
    expect(q.index).toBe(i);
    const a = p1Moves[i]!;
    const b = p2Moves[i]!;
    if (a === 'skip' && b === 'skip') {
      await db.rpc(host, 'skip_question', { p_room_id: roomId, p_game_question_id: q.id });
      await db.rpc(partner, 'skip_question', { p_room_id: roomId, p_game_question_id: q.id });
    } else {
      await db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: a });
      await db.rpc(partner, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: b });
    }
    await db.rpc(i % 2 ? host : partner, 'advance_question', { p_room_id: roomId, p_from_index: i });
  }
  return pair;
}

describe('skipping, advancing and scoring', () => {
  it('skips only when both players agree; votes can be withdrawn', async () => {
    const { host, partner, roomId } = await setupPair({ start: true });
    const q = await current(host, roomId);
    expect(await db.rpc(host, 'skip_question', { p_room_id: roomId, p_game_question_id: q.id })).toMatchObject({
      skipped: false,
    });
    await expectError(db.rpc(host, 'advance_question', { p_room_id: roomId, p_from_index: 0 }), 'question_not_finished');
    const pv = await db.rpc(partner, 'get_game_state', { p_room_id: roomId });
    expect(pv.current.partner_skip_vote).toBe(true);
    await db.rpc(host, 'skip_question', { p_room_id: roomId, p_game_question_id: q.id, p_vote: false });
    expect((await current(host, roomId)).status).toBe('pending');
    await db.rpc(host, 'skip_question', { p_room_id: roomId, p_game_question_id: q.id, p_vote: true });
    expect(await db.rpc(partner, 'skip_question', { p_room_id: roomId, p_game_question_id: q.id })).toMatchObject({
      skipped: true,
    });
    expect((await current(host, roomId)).status).toBe('skipped');
  });

  it('cannot advance past an unanswered question', async () => {
    const { host, partner, roomId } = await setupPair({ start: true });
    const q = await current(host, roomId);
    await db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 1 });
    await expectError(db.rpc(partner, 'advance_question', { p_room_id: roomId, p_from_index: 0 }), 'question_not_finished');
  });

  it('advances exactly once when both players press Next together', async () => {
    const { host, partner, roomId } = await setupPair({ start: true });
    const q = await current(host, roomId);
    await db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 1 });
    await db.rpc(partner, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 2 });
    const [a, b] = await Promise.all([
      db.rpc(host, 'advance_question', { p_room_id: roomId, p_from_index: 0 }),
      db.rpc(partner, 'advance_question', { p_room_id: roomId, p_from_index: 0 }),
    ]);
    expect([a.moved, b.moved].sort()).toEqual([false, true]);
    expect((await current(host, roomId)).index).toBe(1);
  });

  it('scores mutual agreement, excludes skipped questions, and is reproducible', async () => {
    // 12 questions (quick, 3 per round). Q7 skipped.
    // matches at indexes: 0, 2, 3, 7, 8, 10, 11  => 7 of 11 answered
    const p1: Move[] = [1, 1, 2, 1, 1, 2, 'skip', 1, 2, 1, 1, 1];
    const p2: Move[] = [1, 2, 2, 1, 2, 1, 'skip', 1, 2, 2, 1, 1];
    const { host, partner, roomId } = await playFullGame(p1, p2);

    const state = await db.rpc(host, 'get_game_state', { p_room_id: roomId });
    expect(state.room.status).toBe('completed');
    expect(state.results).toMatchObject({
      questions_answered: 11,
      questions_skipped: 1,
      matching_answers: 7,
      agreement_percentage: 63.64,
    });
    const rounds = state.results.round_breakdown as { category: string; answered: number; matching: number; skipped: number }[];
    expect(rounds.map((r) => r.category)).toEqual(['romance', 'chaotic', 'understanding', 'future']);
    expect(rounds.map((r) => [r.answered, r.matching, r.skipped])).toEqual([
      [3, 2, 0],
      [3, 1, 0],
      [2, 2, 1],
      [3, 2, 0],
    ]);

    // Reproducible from raw data
    const stored = await db.admin(`select * from public.game_results where room_id = $1`, [roomId]);
    await db.admin(`delete from public.game_results where room_id = $1`, [roomId]);
    const recomputed = await db.admin(`select (public._compute_results($1)).*`, [roomId]);
    expect(recomputed[0].matching_answers).toBe(stored[0].matching_answers);
    expect(Number(recomputed[0].agreement_percentage)).toBe(Number(stored[0].agreement_percentage));

    // Completed results reveal everything to members, skipped answers excluded
    const full = await db.rpc(partner, 'get_completed_results', { p_room_id: roomId });
    expect(full.questions).toHaveLength(12);
    expect(full.questions[6]).toMatchObject({ status: 'skipped', answers: null });
    expect(full.questions[1].answers).toEqual({ p1: 1, p2: 2 });
  });

  it('gives no extra score for choosing yourself or your partner', async () => {
    const allSelf = await playFullGame(Array(12).fill(1), Array(12).fill(1));
    const allPartner = await playFullGame(Array(12).fill(2), Array(12).fill(2));
    const a = await db.rpc(allSelf.host, 'get_game_state', { p_room_id: allSelf.roomId });
    const b = await db.rpc(allPartner.host, 'get_game_state', { p_room_id: allPartner.roomId });
    expect(a.results.agreement_percentage).toBe(100);
    expect(b.results.agreement_percentage).toBe(100);
  });

  it('scores 0% (not NaN) when every question was skipped', async () => {
    const { host, roomId } = await playFullGame(Array(12).fill('skip'), Array(12).fill('skip'));
    const s = await db.rpc(host, 'get_game_state', { p_room_id: roomId });
    expect(s.results).toMatchObject({ questions_answered: 0, questions_skipped: 12, agreement_percentage: 0 });
  });

  it('clients cannot forge results', async () => {
    const { host, roomId } = await playFullGame(Array(12).fill(1), Array(12).fill(2));
    await expectError(
      db.sqlAs(host, `update public.game_results set agreement_percentage = 100 where room_id = $1`, [roomId]),
      'permission denied',
    );
  });
});

describe('reconnection and recovery', () => {
  it('restores state after a refresh mid-question (own answer kept, partner hidden)', async () => {
    const { host, roomId, code } = await setupPair({ start: true });
    const q = await current(host, roomId);
    await db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 2 });
    // "refresh": the client calls join again via the invite link, then reads state
    expect(await db.rpc(host, 'join_room', { p_invite_code: code, p_display_name: 'Shreya' })).toMatchObject({
      ok: true,
      rejoined: true,
      player_number: 1,
    });
    const after = await current(host, roomId);
    expect(after).toMatchObject({ my_answer: 2, partner_submitted: false, status: 'pending', answers: null });
  });

  it('a refresh during the reveal shows the same reveal', async () => {
    const { host, partner, roomId } = await setupPair({ start: true });
    const q = await current(host, roomId);
    await db.rpc(host, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 2 });
    await db.rpc(partner, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 1 });
    const again = await current(partner, roomId);
    expect(again).toMatchObject({ status: 'revealed', answers: { p1: 2, p2: 1 } });
  });

  it('play again creates one shared new room with both seats', async () => {
    const { host, partner, roomId } = await playFullGame(Array(12).fill(1), Array(12).fill(1));
    const [a, b] = [
      await db.rpc(host, 'play_again', { p_room_id: roomId }),
      await db.rpc(partner, 'play_again', { p_room_id: roomId }),
    ];
    expect(a.room_id).toBe(b.room_id);
    expect([a.created, b.created]).toEqual([true, false]);
    const s = await db.rpc(partner, 'get_game_state', { p_room_id: a.room_id });
    expect(s.room.status).toBe('waiting');
    expect(s.players.map((p: any) => p.display_name)).toEqual(['Shreya', 'Pavan']);
    expect(s.me.player_number).toBe(2);
    // history keeps the old session
    const hist = await db.rpc(host, 'get_history');
    expect(hist.some((h: any) => h.room_id === roomId)).toBe(true);
  });
});

describe('expiry, history and deletion', () => {
  it('refuses actions on an expired room and lets cleanup cancel it', async () => {
    const { host, partner, roomId, code } = await setupPair({ start: true });
    await db.admin(`update public.game_rooms set expires_at = now() - interval '1 minute' where id = $1`, [roomId]);
    const q = await current(host, roomId);
    await expectError(
      db.rpc(partner, 'submit_answer', { p_room_id: roomId, p_game_question_id: q.id, p_selected_player_number: 1 }),
      'room_expired',
    );
    expect((await db.rpc(host, 'get_game_state', { p_room_id: roomId })).room.status).toBe('expired');

    const waiting = await db.newUser();
    const w = await db.rpc(waiting, 'create_room', { p_display_name: 'A' });
    await db.admin(`update public.game_rooms set expires_at = now() - interval '1 minute' where id = $1`, [w.room_id]);
    const joiner = await db.newUser();
    expect((await db.rpc(joiner, 'join_room', { p_invite_code: w.invite_code, p_display_name: 'B' })).ok).toBe(false);

    // create_room above already ran cleanup once (cancelling the first room);
    // an explicit run catches the rest.
    await db.admin(`select public.cleanup_expired_rooms() r`);
    const st = await db.admin(`select status from public.game_rooms where id = any($1::uuid[]) order by status`, [
      [roomId, w.room_id],
    ]);
    expect(st.map((r) => r.status)).toEqual(['cancelled', 'cancelled']);
    expect(code).toBeTruthy();
  });

  it('purges old cancelled rooms during cleanup', async () => {
    const u = await db.newUser();
    const r = await db.rpc(u, 'create_room', { p_display_name: 'A' });
    await db.admin(`update public.game_rooms set status = 'cancelled', expires_at = now() - interval '8 days' where id = $1`, [
      r.room_id,
    ]);
    await db.admin(`select public.cleanup_expired_rooms()`);
    expect(await db.admin(`select 1 from public.game_rooms where id = $1`, [r.room_id])).toHaveLength(0);
  });

  it('history is private to the two players', async () => {
    const { host, partner, roomId } = await playFullGame(Array(12).fill(1), Array(12).fill(2));
    const outsider = await db.newUser();
    expect((await db.rpc(host, 'get_history')).some((h: any) => h.room_id === roomId)).toBe(true);
    expect((await db.rpc(partner, 'get_history')).some((h: any) => h.room_id === roomId)).toBe(true);
    expect(await db.rpc(outsider, 'get_history')).toEqual([]);
  });

  it('either player can delete a session; answers cascade', async () => {
    const { host, partner, roomId } = await playFullGame(Array(12).fill(1), Array(12).fill(2));
    const outsider = await db.newUser();
    await expectError(db.rpc(outsider, 'delete_game_session', { p_room_id: roomId }), 'room_not_found');
    await db.rpc(partner, 'delete_game_session', { p_room_id: roomId });
    expect(await db.admin(`select 1 from public.game_rooms where id = $1`, [roomId])).toHaveLength(0);
    expect(
      await db.admin(
        `select 1 from public.answers a join public.game_questions gq on gq.id = a.game_question_id where gq.room_id = $1`,
        [roomId],
      ),
    ).toHaveLength(0);
    await expectError(db.rpc(host, 'get_game_state', { p_room_id: roomId }), 'room_not_found');
  });

  it('host can cancel a waiting room; partner cannot', async () => {
    const { host, partner, roomId } = await setupPair();
    await expectError(db.rpc(partner, 'cancel_room', { p_room_id: roomId }), 'host_only');
    await db.rpc(host, 'cancel_room', { p_room_id: roomId });
    expect((await db.rpc(partner, 'get_game_state', { p_room_id: roomId })).room.status).toBe('cancelled');
  });
});
