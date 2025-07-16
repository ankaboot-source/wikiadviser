<template>
  <q-btn
    flat
    round
    dense
    class="notification-btn q-mr-sm"
    :class="{
      'has-notifications': unreadCount > 0,
      'empty-notifications': unreadCount === 0,
    }"
  >
    <q-icon
      name="notifications"
      size="20px"
      :class="{
        'text-primary': unreadCount > 0,
        'text-grey-5': unreadCount === 0,
      }"
    />

    <q-badge
      v-if="unreadCount"
      color="red"
      floating
      rounded
      class="notification-badge"
    >
      {{ unreadCount > 99 ? '99+' : unreadCount }}
    </q-badge>

    <q-tooltip class="bg-grey-8">
      {{
        unreadCount
          ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`
          : 'No new notifications'
      }}
    </q-tooltip>

    <q-menu
      class="notification-menu"
      transition-show="scale"
      transition-hide="scale"
      anchor="bottom right"
      self="top right"
      :offset="[0, 8]"
    >
      <q-card class="notification-card">
        <q-card-section
          class="notification-header"
          :class="{ 'empty-header': unreadCount === 0 }"
        >
          <div class="row items-center justify-between">
            <div
              class="text-h6"
              :class="unreadCount > 0 ? 'text-grey-8' : 'text-grey-5'"
            >
              Notifications
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-scroll-area
          style="height: 320px; max-height: 320px"
          class="notification-scroll"
        >
          <q-list class="notification-list">
            <template v-if="unread.length">
              <q-item
                v-for="(notification, index) in unread"
                :key="notification.id"
                clickable
                class="notification-item"
                @click="markRead(notification.id)"
              >
                <q-item-section avatar>
                  <q-avatar
                    color="primary"
                    text-color="white"
                    size="32px"
                    class="notification-avatar"
                  >
                    <q-icon name="notifications" size="16px" />
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label class="notification-message">
                    {{ notification.message }}
                  </q-item-label>
                  <q-item-label caption class="notification-time">
                    {{ formatTime(notification.created_at) }}
                  </q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-icon
                    name="circle"
                    color="primary"
                    size="8px"
                    class="unread-indicator"
                  />
                </q-item-section>

                <q-separator
                  v-if="index < unread.length - 1"
                  spaced
                  inset="item"
                />
              </q-item>
            </template>

            <template v-else>
              <q-item class="empty-state">
                <q-item-section class="text-center">
                  <q-icon
                    name="notifications_off"
                    size="48px"
                    color="grey-4"
                    class="q-mb-sm"
                  />
                  <div class="text-grey-5">No new notifications</div>
                  <div class="text-grey-4 text-caption">
                    You're all caught up!
                  </div>
                </q-item-section>
              </q-item>
            </template>
          </q-list>
        </q-scroll-area>

        <q-separator />

        <q-card-actions
          class="notification-footer"
          :class="{ 'empty-footer': unreadCount === 0 }"
        >
          <q-btn
            v-if="unreadCount > 0"
            flat
            dense
            size="sm"
            label="Mark all read"
            color="primary"
            class="full-width"
            @click="markAllRead"
          />
        </q-card-actions>
      </q-card>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import supabase from 'src/api/supabase';
import { computed, onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import type { Tables } from 'src/types/database.types';

type NotificationRow = Tables<'notifications'>;

const unread = ref<NotificationRow[]>([]);
const unreadCount = computed(() => unread.value.length);

async function markRead(id: string) {
  try {
    console.log('Marking notification as read:', id);
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    unread.value = unread.value.filter((n) => n.id !== id);

    Notify.create({
      message: 'Notification marked as read',
      color: 'positive',
      position: 'bottom',
      timeout: 2000,
      actions: [{ icon: 'close', color: 'white' }],
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    Notify.create({
      message: 'Failed to mark notification as read',
      color: 'negative',
      position: 'bottom',
      timeout: 3000,
    });
  }
}

async function markAllRead() {
  try {
    const ids = unread.value.map((n) => n.id);
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids);
    unread.value = [];

    Notify.create({
      message: 'All notifications marked as read',
      color: 'positive',
      position: 'bottom',
      timeout: 2000,
      actions: [{ icon: 'close', color: 'white' }],
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

function formatTime(timestamp: string | null): string {
  if (!timestamp) return 'Unknown time';

  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60),
  );

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;

  return date.toLocaleDateString();
}

onMounted(async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('User ID:', user?.id);
    if (!user) {
      console.error('No user authenticated');
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id, message, is_read, created_at')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    console.log('Initial fetch data:', data, 'Error:', error);
    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }

    unread.value = (data as NotificationRow[]) ?? [];

    supabase
      .channel('notifs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification:', payload);
          const n = payload.new as NotificationRow;
          if (!n.is_read) {
            unread.value.unshift(n);
            Notify.create({
              message: n.message,
              color: 'primary',
              position: 'top-right',
              timeout: 5000,
              actions: [
                {
                  label: 'Mark as read',
                  color: 'white',
                  handler: () => markRead(n.id),
                },
                { icon: 'close', color: 'white' },
              ],
            });
          }
        },
      )
      .subscribe((status) => {
        console.log('Channel subscription status:', status);
      });
  } catch (error) {
    console.error('Error setting up notifications:', error);
  }
});
</script>

<style scoped>
.notification-btn {
  transition: all 0.2s ease;
}

.notification-btn:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.notification-btn.has-notifications {
  animation: subtle-pulse 2s infinite;
}

.notification-btn.empty-notifications {
  opacity: 0.7;
}

.notification-btn.empty-notifications:hover {
  opacity: 1;
}

.notification-badge {
  font-size: 10px;
  min-width: 18px;
  height: 18px;
  animation: badge-bounce 0.6s ease;
}

.notification-card {
  width: 380px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border-radius: 12px;
}

.notification-header {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 16px 20px;
}

.notification-header.empty-header {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.notification-scroll {
  background: white;
}

.notification-list {
  padding: 0;
}

.notification-item {
  padding: 12px 20px;
  transition: background-color 0.2s ease;
  border-left: 3px solid transparent;
}

.notification-item:hover {
  background-color: rgba(25, 118, 210, 0.04);
  border-left-color: #1976d2;
}

.notification-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.notification-message {
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
  color: #2d3748;
}

.notification-time {
  font-size: 12px;
  color: #718096;
}

.unread-indicator {
  animation: indicator-pulse 1.5s infinite;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.notification-footer {
  padding: 8px 12px;
  background-color: #fafbfc;
}

.notification-footer.empty-footer {
  background-color: #f8f9fa;
}

@keyframes subtle-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes badge-bounce {
  0% {
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes indicator-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
