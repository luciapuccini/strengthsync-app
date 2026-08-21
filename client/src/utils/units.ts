/**
 * Every unit conversion and rounding rule in the app, in one place.
 *
 * Storage and transport are always imperial — pounds and inches — so nothing
 * here converts at the API boundary; these run at the display edge and on form
 * submit only, which keeps the store and the server holding identical values.
 *
 * Kilogram rendering and the centimetre height input land here too when the
 * metric preference ships. Keep new rounding decisions in this file rather than
 * at a call site, so there is one place to change when a rule moves.
 */

const INCHES_PER_FOOT = 12;

/** A prescribed or performed load, for display. */
export function formatWeight(pounds: number): string {
  return `${pounds} lb`;
}

/** Compose the two halves of an imperial height input. Exact — no rounding. */
export function feetInchesToInches(feet: number, inches: number): number {
  return feet * INCHES_PER_FOOT + inches;
}

/**
 * Split a stored height back into the pair the form asks for, so stepping
 * backwards through the questionnaire re-shows what was typed. Inches round to
 * a whole number: only a metric entry can carry a fraction, and that athlete is
 * not looking at this input.
 */
export function inchesToFeetInches(totalInches: number): { feet: number; inches: number } {
  const rounded = Math.round(totalInches);
  return {
    feet: Math.floor(rounded / INCHES_PER_FOOT),
    inches: rounded % INCHES_PER_FOOT,
  };
}
