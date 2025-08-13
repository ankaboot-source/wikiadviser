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

type NotificationData = Tables<'notifications'> & {
  article?: { title?: string };
  triggered_by_profile?: { email?: string };
  triggered_on_profile?: { email?: string };
  triggered_on_role?: string | null;
};

const unread = ref<NotificationData[]>([]);
const unreadCount = computed(() => unread.value.length);

const currentUser = ref<{ id?: string; email?: string }>({});

function formatTime(timestamp: string | null): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60),
  );

  if (diffInMinutes < 1) return 'Now';
  if (diffInMinutes < 60)
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString();
}

function getNotificationMessage(notification: NotificationData): string {
  const type = notification.type;
  const action = notification.action;
  const articleTitle = notification.article?.title ?? 'an article';

  const subject = notification.triggered_on_profile?.email ?? 'Someone';
  const role = notification.triggered_on_role ?? '';

  const key = `${type}.${action}`;

  switch (key) {
    case 'revision.insert':
      return `A new revision to "${articleTitle}" has been made.`;

    case 'comment.insert': {
      const actorEmail = notification.triggered_by_profile?.email ?? 'Someone';
      const changeOwnerId = notification.triggered_on;
      const currentUserId = currentUser.value.id;

      if (currentUserId === changeOwnerId) {
        return `"${actorEmail}" has replied to your change on article "${articleTitle}".`;
      }

      return `A new comment has been made to a change on "${articleTitle}".`;
    }

    case 'role.insert':
      if (notification.user_id === currentUser.value.id) {
        return `You have been granted "${role}" permission to "${articleTitle}".`;
      }
      return `"${subject}" has been granted access to "${articleTitle}".`;

    case 'role.update':
      if (notification.user_id === currentUser.value.id) {
        return `Your permission for "${articleTitle}" has been changed to ${role}.`;
      }
      return `${subject}'s permission for "${articleTitle}" has been changed to ${role}.`;

    default:
      return 'You have a new notification.';
  }
}

async function fetchPermissionsMap(articleIds: string[], userIds: string[]) {
  if (!articleIds.length || !userIds.length) return new Map<string, string>();

  const { data: perms, error } = await supabase
    .from('permissions')
    .select('article_id, user_id, role')
    .in('article_id', articleIds)
    .in('user_id', userIds);

  if (error) {
    console.error('Error fetching permissions:', error);
    return new Map();
  }

  const map = new Map<string, string>();
  (perms || []).forEach((p) => {
    map.set(`${p.article_id}:${p.user_id}`, p.role);
  });
  return map;
}

async function loadNotificationsForUser(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      `
      id,
      user_id,
      type,
      action,
      article_id,
      triggered_by,
      triggered_on,
      is_read,
      created_at,
      article:articles ( title ),
      triggered_by_profile:profiles!notifications_triggered_by_fkey ( email ),
      triggered_on_profile:profiles!notifications_triggered_on_fkey ( email )
    `,
    )
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    return;
  }

  const rows = (data || []) as NotificationData[];

  const articleIds = Array.from(
    new Set(rows.map((r) => r.article_id).filter(Boolean)),
  );
  const userIds = Array.from(
    new Set(rows.map((r) => r.triggered_on).filter(Boolean)),
  );

  const permsMap = await fetchPermissionsMap(articleIds, userIds);

  rows.forEach((r) => {
    const key = `${r.article_id}:${r.triggered_on}`;
    r.triggered_on_role = permsMap.get(key) ?? null;
  });

  unread.value = rows;
}

async function fetchNotificationById(id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      `
      id,
      user_id,
      type,
      action,
      article_id,
      triggered_by,
      triggered_on,
      is_read,
      created_at,
      article:articles ( title ),
      triggered_by_profile:profiles!notifications_triggered_by_fkey ( email ),
      triggered_on_profile:profiles!notifications_triggered_on_fkey ( email )
    `,
    )
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching single notification:', error);
    return null;
  }

  const row = data as NotificationData | null;
  if (!row) return null;

  const { data: perms, error: pErr } = await supabase
    .from('permissions')
    .select('role')
    .eq('article_id', row.article_id)
    .eq('user_id', row.triggered_on)
    .single();

  if (!pErr && perms) {
    row.triggered_on_role = perms.role;
  } else {
    row.triggered_on_role = null;
  }

  return row;
}

async function markRead(id: string) {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    unread.value = unread.value.filter((n) => n.id !== id);
  } catch (err) {
    console.error('Failed markRead', err);
    Notify.create({
      message: 'Failed to clear notification',
      color: 'negative',
    });
  }
}

async function markAllRead() {
  try {
    const ids = unread.value.map((n) => n.id).filter(Boolean);
    if (ids.length) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids);
    }
    unread.value = [];
    Notify.create({
      message: 'All notifications marked as read',
      color: 'positive',
    });
  } catch (err) {
    console.error('Failed markAllRead', err);
  }
}

onMounted(async () => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    currentUser.value.id = user.id;
    currentUser.value.email = (user.email as string) ?? '';

    await loadNotificationsForUser(user.id);

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
        async (payload) => {
          const raw = payload.new as { id: string };
          if (!raw?.id) return;
          const full = await fetchNotificationById(raw.id);
          if (!full) return;
          if (!full.is_read) {
            unread.value.unshift(full);
            Notify.create({
              message: getNotificationMessage(full),
              color: 'primary',
              position: 'top-right',
              timeout: 5000,
              actions: [
                {
                  label: 'Clear',
                  color: 'white',
                  handler: () => markRead(full.id),
                },
              ],
            });
          }
        },
      )
      .subscribe();
  } catch (err) {
    console.error('Error initializing notifications', err);
  }
});
</script>
