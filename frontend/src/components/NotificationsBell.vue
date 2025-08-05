<template>
  <q-btn
    flat
    round
    dense
    class="px-2"
    :class="{ 'has-notifications': unreadCount > 0 }"
  >
    <q-icon
      name="notifications"
      size="24px"
      :color="unreadCount > 0 ? 'primary' : 'grey-6'"
    />

    <q-badge
      v-if="unreadCount"
      color="red"
      floating
      rounded
      class="text-[10px] min-w-[16px] h-[16px]"
    >
      {{ unreadCount > 99 ? '99+' : unreadCount }}
    </q-badge>

    <q-tooltip class="bg-grey-9 text-white">
      {{
        unreadCount
          ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`
          : 'No notifications'
      }}
    </q-tooltip>

    <q-menu
      class="notification-menu"
      anchor="bottom middle"
      self="top middle"
      :offset="[0, 8]"
    >
      <q-card class="min-w-[320px] rounded-lg bg-white">
        <q-scroll-area class="h-[300px]">
          <q-list>
            <template v-if="unread.length">
              <q-item
                v-for="(notification, index) in unread"
                :key="notification.id"
                clickable
                class="px-4 py-3"
                @click="markRead(notification.id)"
              >
                <q-item-section avatar>
                  <q-avatar color="grey-2" text-color="grey-8" size="32px">
                    <q-icon name="notifications" size="16px" />
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label class="text-body2">
                    {{ getNotificationMessage(notification) }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ formatTime(notification.created_at) }}
                  </q-item-label>
                </q-item-section>

                <q-item-section side top>
                  <q-icon name="circle" color="primary" size="8px" />
                </q-item-section>

                <q-separator v-if="index < unread.length - 1" />
              </q-item>
            </template>

            <template v-else>
              <q-item class="px-4 py-8">
                <q-item-section class="text-center">
                  <q-icon name="notifications_off" size="40px" color="grey-5" />
                  <div class="text-body2 text-grey-7 q-mt-sm">
                    No notifications
                  </div>
                </q-item-section>
              </q-item>
            </template>
          </q-list>
        </q-scroll-area>

        <template v-if="unreadCount > 0">
          <q-separator />
          <q-card-actions align="center" class="q-pa-sm">
            <q-btn
              flat
              dense
              size="sm"
              label="Mark all as read"
              color="primary"
              @click="markAllRead"
            />
          </q-card-actions>
        </template>
      </q-card>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import supabase from 'src/api/supabase';
import type { Tables } from 'src/types/database.types';

interface NotificationParams {
  articleTitle?: string;
  commenterName?: string;
  role?: string;
  userName?: string;
  [key: string]: string | number | undefined;
}

type NotificationRow = Tables<'notifications'> & {
  type: string;
  action: string;
  params?: NotificationParams;
};

const unread = ref<NotificationRow[]>([]);
const unreadCount = computed(() => unread.value.length);

function getNotificationMessage(notification: NotificationRow): string {
  const { type, action, params = {} } = notification;

  switch (`${type}.${action}`) {
    case 'revision.create':
      return `A new revision to ${params.articleTitle} has been made.`;

    case 'comment.create':
      return `${params.commenterName} has replied to your change on article ${params.articleTitle}.`;

    case 'role.create':
      return `You have been granted ${params.role} permission to ${params.articleTitle}.`;

    case 'role.update':
      return `Your permission for ${params.articleTitle} has been changed to ${params.role}.`;

    case 'role.create_others':
      return `${params.userName} has been granted access to ${params.articleTitle}.`;

    case 'role.update_others':
      return `${params.userName}'s permission for ${params.articleTitle} has been changed to ${params.role}.`;

    default:
      return 'You have a new notification.';
  }
}

async function markRead(id: string) {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    unread.value = unread.value.filter((n) => n.id !== id);
  } catch {
    Notify.create({
      message: 'Failed to clear notification',
      color: 'negative',
      position: 'bottom',
      timeout: 3000,
    });
  }
}

async function markAllRead() {
  try {
    const ids = unread.value.map((n) => n.id);
    if (ids.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids);
    }
    unread.value = [];
    Notify.create({
      message: 'All notifications marked as read',
      color: 'positive',
      position: 'bottom',
      timeout: 2000,
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}

function formatTime(timestamp: string | null): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60),
  );

  if (diffInMinutes < 1) return 'Now';
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString();
}

onMounted(async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, action, params, is_read, created_at')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    unread.value = (data as NotificationRow[]).map((n) => ({
      ...n,
      params: (n.params as NotificationParams) ?? {},
    }));

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
          const n = payload.new as NotificationRow;
          if (!n.is_read) {
            unread.value.unshift({
              ...n,
              params: (n.params as NotificationParams) ?? {},
            });

            Notify.create({
              message: getNotificationMessage(n),
              color: 'primary',
              position: 'top-right',
              timeout: 5000,
              actions: [
                {
                  label: 'Clear',
                  color: 'white',
                  handler: () => markRead(n.id),
                },
              ],
            });
          }
        },
      )
      .subscribe();
  } catch (error) {
    console.error('Error setting up notifications:', error);
  }
});
</script>
