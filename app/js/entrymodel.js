// A separate, versioned introduction. Never label its observations as full-game evidence.
export const RECORD_VERSION = 1;
export const OPENING = { cash: 15000, stock: 0, debt: 0, receivable: 0, withdrawn: 0, trained: false };
export function startRun(game) {
  return { schemaVersion: RECORD_VERSION, gameId: game.id, contentVersion: game.version,
    id: crypto.randomUUID(), startedAt: new Date().toISOString(), scenario: structuredClone(game),
    step: 0, phase: 'choice', state: { ...OPENING }, observations: [], note: '', trajectory: '' };
}
export function steps(run) {
  return run.scenario.days.flatMap((day, dayIndex) => day.beats.map(beat => ({ ...beat, dayIndex })));
}
export function currentBeat(run) {
  const beat = steps(run)[run.step];
  const state = run.phase === 'result' ? run.observations.at(-1).before : run.state;
  return beat?.creditVariant && state.receivable > 0 ? { ...beat, ...beat.creditVariant } : beat;
}
export function transaction(state, option) {
  let { receipts = 0, payments = 0, stock = 0, debt = 0, receivable = 0, withdrawn = 0 } = option;
  if (option.dynamic === 'repay') { payments = state.debt; debt = -state.debt; }
  if (option.dynamic === 'handover') receipts = state.trained ? 4000 : 2400;
  const next = { ...state, cash: state.cash + receipts - payments,
    stock: state.stock + stock, debt: state.debt + debt,
    receivable: state.receivable + receivable, withdrawn: state.withdrawn + withdrawn };
  if (typeof option.trained === 'boolean') next.trained = option.trained;
  for (const key of ['cash', 'stock', 'debt', 'receivable', 'withdrawn']) {
    if (!Number.isSafeInteger(next[key]) || next[key] < 0) throw new Error('Invalid transaction: ' + key);
  }
  return { state: next, receipts, payments };
}
export function choose(run, optionId) {
  if (run.phase !== 'choice') throw new Error('Decision already recorded');
  const beat = currentBeat(run);
  const option = beat.options?.find(o => o.id === optionId);
  if (!option) throw new Error('Unknown choice');
  const result = transaction(run.state, option);
  const observation = { kind: 'decision', beatId: beat.id, optionId, at: new Date().toISOString(),
    before: { ...run.state }, after: result.state, receipts: result.receipts, payments: result.payments,
    outcome: option.outcome };
  return { ...run, phase: 'result', state: result.state,
    trajectory: beat.id === 'path' ? optionId : run.trajectory,
    observations: [...run.observations, observation] };
}
export function advance(run) {
  if (run.phase !== 'result') throw new Error('No result to advance');
  return { ...run, step: run.step + 1, phase: 'choice' };
}
export function finish(run) {
  if (run.phase !== 'choice' || currentBeat(run)?.kind !== 'note') throw new Error('Incomplete attempt');
  return { ...run, phase: 'complete', completedAt: new Date().toISOString(),
    observations: [...run.observations, { kind: 'optional-plan', beatId: currentBeat(run).id,
      text: run.note, at: new Date().toISOString(), verification: 'not-verified' }] };
}
export function validRun(run) {
  try {
    if (run.schemaVersion !== RECORD_VERSION || run.gameId !== 'asha-intro' || run.contentVersion !== 3 ||
      typeof run.id !== 'string' || typeof run.note !== 'string' || run.note.length > 1000 ||
      !['choice', 'result', 'complete'].includes(run.phase) || !Number.isInteger(run.step) ||
      run.step < 0 || run.step >= steps(run).length || !Array.isArray(run.observations)) return false;
    // Replay with the pinned content. Reject inconsistent saved balances or repeated decisions.
    let replay = { ...run, state: { ...OPENING }, step: 0, phase: 'choice', observations: [], trajectory: '' };
    for (const observation of run.observations) {
      if (observation.kind === 'optional-plan') {
        if (replay.phase === 'result') replay = advance(replay);
        if (observation.text !== run.note || observation.verification !== 'not-verified') return false;
        replay = finish(replay);
      } else {
        if (replay.phase === 'result') replay = advance(replay);
        if (currentBeat(replay)?.id !== observation.beatId) return false;
        replay = choose(replay, observation.optionId);
        const expected = replay.observations.at(-1);
        if (observation.receipts !== expected.receipts || observation.payments !== expected.payments ||
          !Object.keys(OPENING).every(key => observation.before?.[key] === expected.before[key] && observation.after?.[key] === expected.after[key])) return false;
      }
    }
    if (run.phase === 'choice' && replay.phase === 'result') replay = advance(replay);
    return replay.step === run.step && replay.phase === run.phase && replay.trajectory === run.trajectory &&
      Object.keys(OPENING).every(key => replay.state[key] === run.state[key]);
  } catch { return false; }
}
