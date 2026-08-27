import { Dumbbell, History, type LucideIcon } from 'lucide-react';

export type Destination = {
  path: string;
  label: string;
  icon: LucideIcon;
};

/**
 * The app's top-level destinations, declared once as data. The tab bar renders
 * from this list, so a third tab is an entry here rather than another block of
 * markup. `/account` is deliberately absent: it is reached from the top bar,
 * not from a tab, so no tab is current while an athlete is on it.
 */
export const destinations: Destination[] = [
  { path: '/track', label: 'Track', icon: Dumbbell },
  { path: '/history', label: 'History', icon: History },
];
