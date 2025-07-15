<template>
  <q-btn flat round dense class="q-mr-sm">
    <q-icon name="notifications" />
    <q-badge v-if="unreadCount" color="red" floating>{{ unreadCount }}</q-badge>

    <q-menu>
      <q-list style="min-width: 280px">
        <q-item-label header>Notifications</q-item-label>
        <q-item
          v-for="n in unread"
          :key="n.id"
          clickable
          @click="markRead(n.id)"
        >
          <q-item-section>{{ n.message }}</q-item-section>
        </q-item>
        <q-item v-if="!unread.length">
          <q-item-section>No new notifications</q-item-section>
        </q-item>
      </q-list>
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
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
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
              position: 'top',
              timeout: 5000,
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
