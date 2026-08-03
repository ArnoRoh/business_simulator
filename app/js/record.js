// The behavioural record.
//
// Governed by docs/assessment.md. Three layers, and the separation is deliberate:
//
//   1. Observations  — raw, factual, durable. Never interpreted at write time.
//   2. Indicators    — derived patterns, each of which MUST cite its evidence.
//   3. Profile       — human-readable, hedged, anchored to observations.
//
// Two rules that are easy to break and expensive to fix:
//
//   * Scoring is never baked into storage. Observations outlive every change to how
//     we interpret them, so interpretation happens at read time only.
//   * No composite score. No rank. No percentile. A single number invites the
//     mechanical filtering that makes business-plan scores harmful, and hides which
//     behaviours produced it.

const SCHEMA_VERSION = 1;

export function createRecord(scenarioId) {
  return {
    schemaVersion: SCHEMA_VERSION,
    scenarioId,
    startedAt: new Date().toISOString(),
    observations: [],
  };
}

/** Layer 1. Append-only. Called at every decision point. */
export function observe(record, entry) {
  record.observations.push({
    at: new Date().toISOString(),
    ...entry,
  });
  return record;
}

export function observeInfoSought(record, turnId, infoId, label) {
  return observe(record, { kind: 'info-sought', turnId, infoId, label });
}

export function observePrediction(record, turnId, predicted, actual, correct, metric) {
  return observe(record, { kind: 'prediction', turnId, predicted, actual, correct, metric });
}

export function observeDecision(record, turnId, concept, optionId, optionLabel, infoSoughtCount, pnlBefore, pnlAfter) {
  return observe(record, {
    kind: 'decision',
    turnId,
    concept,
    optionId,
    optionLabel,
    infoSoughtCount,
    profitBefore: pnlBefore,
    profitAfter: pnlAfter,
  });
}

export function observeConstraint(record, turnId, text) {
  return observe(record, { kind: 'constraint-named', turnId, text });
}

// ---------------------------------------------------------------------------
// Layer 2 — indicators. Each returns { id, label, summary, evidence: [] }.
// An indicator that cannot point at its evidence is an opinion and does not ship.
// ---------------------------------------------------------------------------

function predictions(record) {
  return record.observations.filter((o) => o.kind === 'prediction');
}

function decisions(record) {
  return record.observations.filter((o) => o.kind === 'decision');
}

/**
 * Calibration — does the learner correctly anticipate the consequence of their own
 * choice? The strongest indicator available, because becoming well-calibrated about a
 * system requires understanding it. Hard to fake by performing for an assessor.
 */
export function calibration(record) {
  const preds = predictions(record);
  const correct = preds.filter((p) => p.correct);

  // Split early vs late to see whether calibration IMPROVED — learning, rather than
  // arriving already knowing.
  const half = Math.floor(preds.length / 2);
  const early = preds.slice(0, half);
  const late = preds.slice(half);
  const rate = (arr) => (arr.length ? arr.filter((p) => p.correct).length / arr.length : null);

  const earlyRate = rate(early);
  const lateRate = rate(late);
  let trend = null;
  if (earlyRate !== null && lateRate !== null && preds.length >= 6) {
    if (lateRate - earlyRate > 0.15) trend = 'improved';
    else if (earlyRate - lateRate > 0.15) trend = 'declined';
    else trend = 'steady';
  }

  return {
    id: 'calibration',
    label: 'Anticipating consequences',
    total: preds.length,
    correct: correct.length,
    earlyRate,
    lateRate,
    trend,
    evidence: preds.map((p) => ({
      turnId: p.turnId,
      predicted: p.predicted,
      actual: p.actual,
      correct: p.correct,
    })),
  };
}

/** Does the learner buy information before committing, or decide blind? */
export function informationSeeking(record) {
  const decs = decisions(record);
  const withInfo = decs.filter((d) => (d.infoSoughtCount || 0) > 0);
  return {
    id: 'information-seeking',
    label: 'Checking before deciding',
    total: decs.length,
    withInfo: withInfo.length,
    evidence: decs.map((d) => ({
      turnId: d.turnId,
      concept: d.concept,
      infoSought: d.infoSoughtCount || 0,
      choice: d.optionLabel,
    })),
  };
}

/** What did they do immediately after a decision that lost money? */
export function recovery(record) {
  const decs = decisions(record);
  const events = [];
  for (let i = 0; i < decs.length - 1; i += 1) {
    const d = decs[i];
    if (typeof d.profitAfter === 'number' && typeof d.profitBefore === 'number' && d.profitAfter < d.profitBefore) {
      events.push({
        setbackTurn: d.turnId,
        drop: d.profitBefore - d.profitAfter,
        nextChoice: decs[i + 1].optionLabel,
        nextTurn: decs[i + 1].turnId,
      });
    }
  }
  return {
    id: 'recovery',
    label: 'After a setback',
    total: events.length,
    evidence: events,
  };
}

/** Breadth — which concepts did they actually engage with? */
export function conceptCoverage(record) {
  const seen = new Map();
  for (const d of decisions(record)) {
    if (!d.concept) continue;
    seen.set(d.concept, (seen.get(d.concept) || 0) + 1);
  }
  return {
    id: 'concept-coverage',
    label: 'Concepts encountered',
    total: seen.size,
    evidence: [...seen.entries()].map(([concept, times]) => ({ concept, times })),
  };
}

export function allIndicators(record) {
  return [
    calibration(record),
    informationSeeking(record),
    recovery(record),
    conceptCoverage(record),
  ];
}

// ---------------------------------------------------------------------------
// Layer 3 — profile. Human-readable, hedged, observation-anchored.
// ---------------------------------------------------------------------------

/**
 * Statements are written so that deleting "in the simulation" would make them false.
 * That is the test from docs/assessment.md for whether we are overclaiming.
 */
export function buildProfile(record) {
  const cal = calibration(record);
  const info = informationSeeking(record);
  const rec = recovery(record);
  const cov = conceptCoverage(record);

  const statements = [];

  if (cal.total > 0) {
    statements.push({
      indicator: cal.label,
      text: `Correctly anticipated the effect of their own decision in ${cal.correct} of ${cal.total} predictions.`,
      detail: cal.trend === 'improved'
        ? 'Accuracy was higher in the second half of the playthrough than the first.'
        : cal.trend === 'declined'
          ? 'Accuracy was lower in the second half than the first.'
          : cal.trend === 'steady'
            ? 'Accuracy was broadly steady across the playthrough.'
            : null,
    });
  }

  if (info.total > 0) {
    statements.push({
      indicator: info.label,
      text: `Sought information before deciding in ${info.withInfo} of ${info.total} decisions.`,
      detail: null,
    });
  }

  if (rec.total > 0) {
    statements.push({
      indicator: rec.label,
      text: `Faced ${rec.total} decision${rec.total === 1 ? '' : 's'} that reduced weekly profit, and continued afterwards.`,
      detail: 'What they chose next is listed in the evidence below.',
    });
  }

  statements.push({
    indicator: cov.label,
    text: `Made decisions across ${cov.total} business concept${cov.total === 1 ? '' : 's'}.`,
    detail: null,
  });

  return {
    scenarioId: record.scenarioId,
    startedAt: record.startedAt,
    generatedAt: new Date().toISOString(),
    statements,
    indicators: allIndicators(record),

    // Carried INSIDE the artefact, not as a footnote. This will be read out of
    // context, so the caveat has to travel with it. docs/assessment.md, item 3.
    limitations: [
      'This describes what happened inside a simulation. It is not a measure of how this person runs a real business.',
      'It has not been validated against real business outcomes. No such study exists yet.',
      'It should not be used as an automatic cut-off, or to rank one person against another.',
      'Figures in the simulation are illustrative placeholders, not researched local data.',
    ],
  };
}

/**
 * Deliberately NOT a score.
 *
 * Prediction accuracy is reported as a proportion because it is the one signal the
 * project owner wants to gate a funnel on. Presenting it as a bare percentage would
 * make it trivially sortable, which is the failure mode assessment.md exists to
 * prevent — so callers get the raw counts and must show the evidence alongside.
 */
export function predictionTally(record) {
  const cal = calibration(record);
  return { correct: cal.correct, total: cal.total, trend: cal.trend };
}
