/**
 * Every unit conversion and rounding rule in the app, in one place.
 *
 * Storage and transport are always imperial — pounds and inches — so nothing
 * here converts at the API boundary; these run at the display edge and on form
 * submit only, which keeps the store and the server holding identical values.
 *
 * The module is pure: no React, no store access, no I/O. Reading the athlete's
 * preference is the caller's job (`useUnitPreference`), which is what lets every
 * rounding decision be exercised without a component or a store.
 *
 * Keep new rounding decisions in this file rather than at a call site, so there
 * is one place to change when a rule moves.
 */

import type { Client } from '@/api/types';

/** Which unit system the athlete reads and types in. Storage is unaffected. */
export type UnitPreference = Client['unit_preference'];

const INCHES_PER_FOOT = 12;
const INCHES_PER_CM = 0.393701;
const POUNDS_PER_KILOGRAM = 2.20462;

/**
 * A canonical load, in the unit the athlete reads.
 *
 * Kilograms are whole numbers on purpose. Consecutive five-pound grid steps are
 * 2.268 kg apart, so whole-kilogram rounding can never collapse two distinct
 * loads onto the same displayed number, and 100 kg → 220 lb → 100 kg round-trips
 * exactly. A decimal would buy precision the plate set cannot deliver.
 */
export function toDisplayWeight(pounds: number, unit: UnitPreference): number {
  if (unit === 'imperial') return pounds;
  return Math.round(pounds / POUNDS_PER_KILOGRAM);
}

/**
 * The inverse, for form submit: what the athlete typed, in canonical pounds.
 *
 * Whole pounds, because that is the resolution everything downstream stores and
 * the five-pound snap then rounds to anyway.
 */
export function toCanonicalWeight(entered: number, unit: UnitPreference): number {
  if (unit === 'imperial') return entered;
  return Math.round(entered * POUNDS_PER_KILOGRAM);
}

/**
 * A metric height, in canonical inches. One decimal: a whole inch is 2.54 cm, so
 * rounding a typed centimetre value to it would move the athlete by up to 1.3 cm.
 */
export function cmToInches(cm: number): number {
  return Math.round(cm * INCHES_PER_CM * 10) / 10;
}

/** The suffix that goes after a converted load. */
export function unitLabel(unit: UnitPreference): string {
  return unit === 'imperial' ? 'lb' : 'kg';
}

/** A prescribed or performed load, for display: converts *and* labels. */
export function formatWeight(pounds: number, unit: UnitPreference): string {
  return `${toDisplayWeight(pounds, unit)} ${unitLabel(unit)}`;
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
