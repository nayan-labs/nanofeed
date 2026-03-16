/**
 * app/composables/useNotifications.ts
 * NanoFeed — Notifications Composable
 * 
 * Composable for managing notifications.
 */

import { ref } from 'vue'

export const useNotifications = () => {
  const unreadCount = useState<number>('unreadNotificationsCount', () => 0)
  const isFetchingCount = useState<boolean>('isFetchingUnreadCount', () => false)

  const fetchUnreadCount = async () => {
    try {
      isFetchingCount.value = true
      const res = await $fetch<{count: number}>('/api/notifications/unread-count')
      unreadCount.value = res.count
    } catch (err) {
      console.error('Failed to fetch unread count', err)
    } finally {
      isFetchingCount.value = false
    }
  }

  const markAsRead = async (id?: string) => {
    try {
      await $fetch('/api/notifications/mark-read', {
        method: 'POST',
        body: id ? { id } : {}
      })
      if (!id) {
         unreadCount.value = 0
      } else {
         fetchUnreadCount() // refresh total count
      }
    } catch (err) {
      console.error('Failed to mark read', err)
    }
  }

  const markAsUnread = async (id?: string) => {
    try {
      await $fetch('/api/notifications/mark-unread', {
        method: 'POST',
        body: id ? { id } : {}
      })
      fetchUnreadCount() // refresh total count
    } catch (err) {
      console.error('Failed to mark unread', err)
    }
  }

  return {
    unreadCount,
    isFetchingCount,
    fetchUnreadCount,
    markAsRead,
    markAsUnread
  }
}
