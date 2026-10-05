import type { Client } from '@/api/types';

export type UnitPreference = Client['unit_preference'];

const INCHES_PER_FOOT = 12;
const INCHES_PER_CM = 0.393701;
const POUNDS_PER_KILOGRAM = 2.20462;

export function toDisplayWeight(pounds: number, unit: UnitPreference): number {
  if (unit === 'imperial') return pounds;
  return Math.round(pounds / POUNDS_PER_KILOGRAM);
}

export function toCanonicalWeight(entered: number, unit: UnitPreference): number {
  if (unit === 'imperial') return entered;
  return Math.round(entered * POUNDS_PER_KILOGRAM);
}

export function cmToInches(cm: number): number {
  return Math.round(cm * INCHES_PER_CM * 10) / 10;
}

export function inchesToCm(totalInches: number): number {
  return Math.round(totalInches / INCHES_PER_CM);
}

export function unitLabel(unit: UnitPreference): string {
  return unit === 'imperial' ? 'lb' : 'kg';
}

export function formatWeight(pounds: number, unit: UnitPreference): string {
  return `${toDisplayWeight(pounds, unit)} ${unitLabel(unit)}`;
}

export function feetInchesToInches(feet: number, inches: number): number {
  return feet * INCHES_PER_FOOT + inches;
}

export function inchesToFeetInches(totalInches: number): { feet: number; inches: number } {
  const rounded = Math.round(totalInches);
  return {
    feet: Math.floor(rounded / INCHES_PER_FOOT),
    inches: rounded % INCHES_PER_FOOT,
  };
}
