export type AppTab = 'home' | 'discovery' | 'profile';

export const tabs: Array<{ id: AppTab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'profile', label: 'Profile' },
];
