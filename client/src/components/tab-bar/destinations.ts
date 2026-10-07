import { Dumbbell, History, type LucideIcon } from 'lucide-react';

export type Destination = {
  path: string;
  label: string;
  icon: LucideIcon;
};

export const destinations: Destination[] = [
  { path: '/track', label: 'Track', icon: Dumbbell },
  { path: '/history', label: 'History', icon: History },
];
