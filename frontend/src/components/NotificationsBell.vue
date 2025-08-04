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
      <q-card style="min-width: 320px" class="rounded-lg bg-white">
        <q-scroll-area style="height: 300px">
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
                  <q-item-label class="text-body2">{{
                    notification.message
                  }}</q-item-label>
                  <q-item-label caption>{{
                    formatTime(notification.created_at)
                  }}</q-item-label>
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

<script setup>
import supabase from 'src/api/supabase';
import { computed, onMounted, ref } from 'vue';
import { Notify } from 'quasar';

const unread = ref([]);
const unreadCount = computed(() => unread.value.length);

async function markRead(id) {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    unread.value = unread.value.filter((n) => n.id !== id);
  } catch (error) {
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
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}

function formatTime(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60),
  );

  if (diffInMinutes < 1) return 'Now';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
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
      .select('id, message, is_read, created_at')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) return;
    unread.value = data ?? [];

    supabase.channel('notifs').on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        const n = payload.new;
        if (!n.is_read) {
          unread.value.unshift(n);
          Notify.create({
            message: n.message,
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
    );
  } catch (error) {
    console.error('Error setting up notifications:', error);
  }
});
</script>
