import { getStayPhase } from './stayPhase';

describe('getStayPhase', () => {
  const arrival = '2026-08-10';
  const departure = '2026-08-15';

  it('distinguishes each stay phase at date boundaries', () => {
    expect(getStayPhase(arrival, departure, '2026-08-09')).toBe('before');
    expect(getStayPhase(arrival, departure, '2026-08-10')).toBe('during');
    expect(getStayPhase(arrival, departure, '2026-08-14')).toBe('during');
    expect(getStayPhase(arrival, departure, '2026-08-15')).toBe('departure');
    expect(getStayPhase(arrival, departure, '2026-08-16')).toBe('after');
  });
});
