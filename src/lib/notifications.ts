import type { Locale } from '@/lib/i18n';

export type NotifyPermission = NotificationPermission | 'unsupported';

export function getNotificationPermission(): NotifyPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** Unregister any leftover workers/caches. Never registers a new one. */
export async function clearReplyServiceWorkers() {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    // ignore
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // ignore
  }
}

export async function registerReplyServiceWorker() {
  return null;
}

export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showWorkoutReminderNotification(locale: Locale = 'en') {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const title = locale === 'vi' ? 'REPLY · Đến giờ tập' : 'REPLY · Workout time';
  const body =
    locale === 'vi'
      ? 'Một buổi ngắn 20–30 phút cũng đủ giữ nhịp.'
      : 'A quick 20–30 minute session keeps your streak alive.';

  try {
    // eslint-disable-next-line no-new
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      tag: 'reply-workout-reminder',
    });
    return true;
  } catch {
    return false;
  }
}
