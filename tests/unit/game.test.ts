import { describe, expect, it } from 'vitest';
import {
  agreementPercentage,
  buildInviteUrl,
  didMatch,
  finalMessage,
  formatInviteCode,
  initials,
  isWellFormedInviteCode,
  normalizeInviteCode,
  questionCount,
  revealInterpretation,
} from '../../src/lib/game';
import { toAppError } from '../../src/lib/errors';

describe('invite codes', () => {
  it('normalises user input like the server', () => {
    expect(normalizeInviteCode(' abcd-2345 ')).toBe('ABCD2345');
    expect(isWellFormedInviteCode('abcd 2345')).toBe(true);
    expect(isWellFormedInviteCode('ABCD0001')).toBe(false); // 0 and 1 are not in the alphabet
    expect(isWellFormedInviteCode('ABC')).toBe(false);
    expect(formatInviteCode('abcd2345')).toBe('ABCD 2345');
  });

  it('builds hash-routed invite URLs that work under a GitHub Pages subpath', () => {
    expect(buildInviteUrl('abcd2345', 'https://pavan-pm-portfolio.github.io', '/bobba_zone/')).toBe(
      'https://pavan-pm-portfolio.github.io/bobba_zone/#/join/ABCD2345',
    );
    expect(buildInviteUrl('ABCD2345', 'http://localhost:5173', '/')).toBe('http://localhost:5173/#/join/ABCD2345');
    expect(buildInviteUrl('ABCD2345', 'https://x.io', '/repo')).toBe('https://x.io/repo/#/join/ABCD2345');
  });
});

describe('scoring helpers', () => {
  it('matches the server formula and never divides by zero', () => {
    expect(agreementPercentage(7, 11)).toBe(63.64);
    expect(agreementPercentage(0, 0)).toBe(0);
    expect(agreementPercentage(12, 12)).toBe(100);
  });

  it('detects matches only when both answers exist', () => {
    expect(didMatch({ p1: 1, p2: 1 })).toBe(true);
    expect(didMatch({ p1: 2, p2: 1 })).toBe(false);
    expect(didMatch({ p1: 2 })).toBeNull();
    expect(didMatch(null)).toBeNull();
  });

  it('counts questions per mode', () => {
    expect(questionCount('quick', ['romance', 'future'])).toBe(6);
    expect(questionCount('full', [])).toBe(60);
  });
});

describe('copy', () => {
  const names = { 1: 'Shreya', 2: 'Pavan' } as const;
  it('never declares a winner', () => {
    for (let seed = 0; seed < 6; seed++) {
      for (const a of [
        { p1: 1, p2: 1 },
        { p1: 2, p2: 2 },
        { p1: 1, p2: 2 },
        { p1: 2, p2: 1 },
      ] as const) {
        const t = revealInterpretation(a, names, seed);
        expect(t).not.toMatch(/win|lose|loves? (you )?more|better partner/i);
      }
    }
    expect(finalMessage(100, 10)).not.toMatch(/compatib|soulmate/i);
  });

  it('makes initials', () => {
    expect(initials('Shreya Jaiswal')).toBe('SJ');
    expect(initials('pavan')).toBe('P');
    expect(initials('  ')).toBe('?');
  });
});

describe('errors', () => {
  it('maps server codes to friendly messages', () => {
    expect(toAppError({ message: 'already_submitted' }).code).toBe('already_submitted');
    expect(toAppError(new TypeError('Failed to fetch')).code).toBe('network');
    expect(toAppError({ message: 'weird' }).code).toBe('unknown');
  });
});
