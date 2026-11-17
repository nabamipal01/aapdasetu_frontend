import { get, post } from './api';

/**
 * Fetch the notification list for the logged-in user.
 * GET /api/notification/list.php?page=<page>&limit=<limit>
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     notifications: [{ notification_type, notification_id, title, message, location, created_at, is_read }],
 *     pagination: { page, limit, total_items, total_pages, has_next_page, has_previous_page },
 *     unread_count: number
 *   }
 * }
 */
export const listNotifications = (page = 1, limit = 20) =>
  get('/api/notification/list.php', { page, limit });

/**
 * Mark a single notification as read.
 * POST /api/notification/mark-read.php
 * Body: { notification_type, notification_id }
 *
 * Response shape:
 * { success: true, data: { notification_type, notification_id, is_read: true } }
 */
export const markNotificationRead = (notification_type, notification_id) =>
  post('/api/notification/mark-read.php', { notification_type, notification_id });

/**
 * Dismiss (delete) a single notification for the current user.
 * POST /api/notification/delete.php
 * Body: { notification_type, notification_id }
 */
export const deleteNotification = (notification_type, notification_id) =>
  post('/api/notification/delete.php', { notification_type, notification_id });
