<!--
  app/pages/notifications.vue
  NanoFeed — Notifications Page
-->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import UiAvatar from '../components/ui/Avatar.vue'
import UiButton from '../components/ui/Button.vue'

// Custom date formatter since we cannot install date-fns
const formatDistanceToNow = (date: Date) => {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString()
}
// @ts-ignore
const { markAsRead, markAsUnread, fetchUnreadCount, unreadCount } = useNotifications()
const router = useRouter()

const notifications = ref<any[]>([])
const isLoading = ref(true)
const page = ref(1)
const hasMore = ref(false)

const allRead = computed(() => {
  if (notifications.value.length === 0) return true
  return notifications.value.every(n => n.read)
})

const fetchNotifications = async (loadMore = false) => {
  if (!loadMore) {
    isLoading.value = true
    page.value = 1
  } else {
    page.value++
  }

  try {
    const res = await $fetch<any>('/api/notifications', {
      query: { page: page.value, limit: 20 }
    })
    
    if (loadMore) {
      notifications.value.push(...res.notifications)
    } else {
      notifications.value = res.notifications
    }
    
    hasMore.value = page.value < res.meta.totalPages
  } catch (err) {
    console.error('Failed to fetch notifications', err)
  } finally {
    isLoading.value = false
  }
}

// Group REACTION notifications by postId within the current loaded batch
const groupedNotifications = computed(() => {
  const groups: any[] = []
  const reactionGroups = new Map<string, any>()

  for (const notif of notifications.value) {
    if (notif.type === 'REACTION' && notif.postId) {
      if (reactionGroups.has(notif.postId)) {
        const group = reactionGroups.get(notif.postId)
        if (!group.senders.some((s: any) => s.id === notif.sender.id)) {
          group.senders.push(notif.sender)
        }
        // Keep the latest createdAt and unread status
        if (!notif.read) group.read = false
        if (new Date(notif.createdAt) > new Date(group.createdAt)) {
          group.createdAt = notif.createdAt
        }
        group.ids.push(notif.id)
      } else {
        const newGroup = {
          ...notif,
          isGrouped: true,
          senders: notif.sender ? [notif.sender] : [],
          ids: [notif.id]
        }
        reactionGroups.set(notif.postId, newGroup)
        groups.push(newGroup)
      }
    } else {
      groups.push({ ...notif, isGrouped: false })
    }
  }
  
  // Sort again as grouping might slightly shift things
  return groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

onMounted(() => {
  fetchNotifications()
})

const toggleAllRead = async () => {
  if (allRead.value) {
    await markAsUnread()
    notifications.value.forEach(n => n.read = false)
  } else {
    await markAsRead()
    notifications.value.forEach(n => n.read = true)
  }
  fetchUnreadCount()
}

const handleNotificationClick = (notif: any) => {
  // If unread, mark it as read
  if (!notif.read) {
    if (notif.isGrouped) {
      // mark all underlying ones as read
      // For simplicity, just mark one, or we can assume it's done globally
      notif.ids.forEach((id: string) => markAsRead(id))
      notif.read = true
    } else {
      markAsRead(notif.id)
      notif.read = true
    }
  }

  // Navigate if related to a post
  if (notif.postId) {
    router.push(`/post/${notif.postId}`)
  }
}

const toggleReadStatus = async (notif: any, event: Event) => {
  event.stopPropagation()
  if (notif.read) {
    if (notif.isGrouped) {
      for (const id of notif.ids) await markAsUnread(id)
    } else {
      await markAsUnread(notif.id)
    }
    notif.read = false
  } else {
    if (notif.isGrouped) {
      for (const id of notif.ids) await markAsRead(id)
    } else {
      await markAsRead(notif.id)
    }
    notif.read = true
  }
}

const getReactionGroupText = (senders: any[]) => {
  if (senders.length === 1) return `@${senders[0].username} loved your post.`
  return `@${senders[0].username} and ${senders.length - 1} others love your post.`
}

const parseMessage = (message: string) => {
  const parts = message.split(/(@\w+)/g)
  return parts.map(part => {
    if (part.startsWith('@')) {
      return { text: part, isMention: true, username: part.slice(1) }
    }
    return { text: part, isMention: false }
  })
}

const formatDate = (dateStr: string) => {
  try {
    return formatDistanceToNow(new Date(dateStr))
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="notifications-page">
    <div class="page-header">
      <h1 class="page-title">Notifications</h1>
      <UiButton variant="ghost" size="sm" @click="toggleAllRead">
        {{ allRead ? 'Mark all as unread' : 'Mark all as read' }}
      </UiButton>
    </div>

    <div v-if="isLoading && notifications.length === 0" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="groupedNotifications.length === 0" class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      <h2>No notifications yet</h2>
      <p>When someone interacts with your posts or account, you'll see it here.</p>
    </div>

    <div v-else class="notifications-list">
      <div 
        v-for="notif in groupedNotifications" 
        :key="notif.isGrouped ? notif.ids[0] : notif.id" 
        class="notification-item"
        :class="{ 'is-unread': !notif.read, 'is-clickable': !!notif.postId }"
        @click="handleNotificationClick(notif)"
      >
        <div class="notif-icon-col">
          <!-- Type matching Icons -->
          <svg v-if="notif.type === 'REACTION'" class="icon-reaction" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          <svg v-else-if="notif.type === 'REPLY'" class="icon-reply" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <svg v-else-if="notif.type === 'MENTION'" class="icon-mention" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
          <svg v-else-if="notif.type === 'ACCOUNT_STATUS'" class="icon-system" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          <svg v-else-if="notif.type === 'VERIFICATION_UPDATE'" class="icon-verified" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          <div v-else class="icon-fallback"></div>
        </div>

        <div class="notif-content-col">
          <div class="meta-row">
            <!-- Avatars -->
            <div class="avatars" v-if="notif.isGrouped">
               <UiAvatar 
                 v-for="s in notif.senders.slice(0, 3)" 
                 :key="s.id" 
                 :src="s.avatar" 
                 :alt="s.username" 
                 size="sm" 
                 class="stack-avatar" 
               />
               <span v-if="notif.senders.length > 3" class="avatar-more">+{{ notif.senders.length - 3 }}</span>
            </div>
            <UiAvatar v-else-if="notif.sender" :src="notif.sender.avatar" :alt="notif.sender.username" size="sm" />
            
            <span class="time">{{ formatDate(notif.createdAt) }}</span>

            <!-- Actions (mark unread) -->
            <button class="action-btn" @click="(e) => toggleReadStatus(notif, e)" :title="notif.read ? 'Mark as unread' : 'Mark as read'">
              <span class="dot" :class="{ 'is-unread': !notif.read }"></span>
            </button>
          </div>

          <div class="text-content">
            <template v-if="notif.type === 'REACTION' && notif.isGrouped">
              <span class="message fw-bold">{{ getReactionGroupText(notif.senders) }}</span>
            </template>
            <template v-else>
              <span class="message">
                <template v-for="(part, idx) in parseMessage(notif.message)" :key="idx">
                  <NuxtLink v-if="part.isMention" :to="`/profile/${part.username}`" class="mention-link" @click.stop>{{ part.text }}</NuxtLink>
                  <template v-else>{{ part.text }}</template>
                </template>
              </span>
            </template>
          </div>

          <div v-if="notif.post?.content" class="post-preview">
            {{ notif.post.content }}
          </div>
        </div>
      </div>

      <div v-if="hasMore" class="load-more">
        <UiButton @click="() => fetchNotifications(true)" :loading="isLoading" variant="secondary" block>
          Show more
        </UiButton>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-header {
  position: sticky;
  top: 0;
  z-index: $z-sticky;
  background-color: rgba($color-bg, 0.85);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid $color-border-soft;
  padding: $space-3 $space-4;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @include max-sm {
    top: 53px; // Below mobile navbar
  }

  .page-title {
    font-size: $font-size-xl;
    font-weight: $font-weight-bold;
    margin: 0;
  }
}

.notifications-list {
  display: flex;
  flex-direction: column;
}

.notification-item {
  display: flex;
  gap: $space-3;
  padding: $space-4;
  border-bottom: 1px solid $color-border;
  background-color: transparent;
  @include hover-transition(background-color);

  &.is-clickable {
    cursor: pointer;
    &:hover {
      background-color: $color-surface;
    }
  }

  &.is-unread {
    background-color: rgba($color-accent, 0.05);
    &:hover {
      background-color: rgba($color-accent, 0.08);
    }
  }
}

.notif-icon-col {
  width: 40px;
  display: flex;
  justify-content: flex-end;
  padding-top: $space-1;

  svg {
    width: 28px;
    height: 28px;
  }

  .icon-reaction { color: $color-danger; }
  .icon-reply { color: $color-accent; }
  .icon-mention { color: $color-accent; }
  .icon-system { color: $color-warning; }
  .icon-verified { color: #1d9bf0; }
}

.notif-content-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: $space-2;

  .avatars {
    display: flex;
    align-items: center;
    .stack-avatar {
      margin-right: -8px;
      border: 2px solid $color-bg;
      position: relative;
    }
    .avatar-more {
      margin-left: 12px;
      font-size: $font-size-xs;
      color: $color-text-muted;
      font-weight: $font-weight-bold;
    }
  }

  .time {
    color: $color-text-muted;
    font-size: $font-size-sm;
    margin-left: auto;
  }

  .action-btn {
    background: none;
    border: none;
    padding: $space-1;
    cursor: pointer;
    @include flex-center;
    
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: $color-border-soft;
      transition: background-color 0.2s;

      &.is-unread {
        background-color: $color-accent;
      }
    }

    &:hover .dot {
      background-color: $color-accent-hover;
    }
  }
}

.text-content {
  font-size: $font-size-md;
  color: $color-text;
  line-height: $line-height-relaxed;

  .fw-bold {
    font-weight: $font-weight-bold;
  }

  .mention-link {
    color: $color-accent;
    font-weight: $font-weight-bold;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
}

.post-preview {
  margin-top: $space-1;
  font-size: $font-size-sm;
  color: $color-text-muted;
  @include truncate(2);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-12 $space-4;
  text-align: center;
  color: $color-text-muted;

  .empty-icon {
    width: 64px;
    height: 64px;
    margin-bottom: $space-4;
    opacity: 0.5;
  }

  h2 {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: $color-text;
    margin-bottom: $space-2;
  }
}

.loading-state {
  padding: $space-8;
  @include flex-center;
}

.load-more {
  padding: $space-4;
}
</style>
