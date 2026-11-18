import { describe, expect, it } from 'vitest';
import { nextAction, upsert, type RoomSummary } from './my-rooms';

const room = (id: string, extra: Partial<RoomSummary> = {}): RoomSummary => ({
  id,
  title: id,
  when: '',
  status: 'lobby',
  voted: false,
  seenAt: 0,
  ...extra,
});

describe('upsert', () => {
  it('puts the latest room first without duplicating it', () => {
    const list = upsert(upsert([room('a'), room('b')], room('b', { status: 'voting' })), room('c'));
    expect(list.map((r) => r.id)).toEqual(['c', 'b', 'a']);
    expect(list[1].status).toBe('voting');
  });

  it('keeps at most 20 rooms', () => {
    let list: RoomSummary[] = [];
    for (let i = 0; i < 25; i++) list = upsert(list, room(`r${i}`));
    expect(list).toHaveLength(20);
    expect(list[0].id).toBe('r24');
  });
});

describe('nextAction', () => {
  it('tells the host to start and members to wait', () => {
    expect(nextAction({ status: 'lobby', voted: false }, true)).toBe('start');
    expect(nextAction({ status: 'lobby', voted: false }, false)).toBe('waiting-start');
  });

  it('asks for a decision until the vote is sent', () => {
    expect(nextAction({ status: 'voting', voted: false }, false)).toBe('decide');
    expect(nextAction({ status: 'voting', voted: true }, false)).toBe('waiting-others');
    expect(nextAction({ status: 'results', voted: true }, true)).toBe('decided');
  });
});
