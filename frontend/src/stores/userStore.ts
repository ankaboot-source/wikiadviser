import { Session } from '@supabase/supabase-js';
import { defineStore } from 'pinia';
import supabase from 'src/api/supabase';
import supabaseClient from 'src/api/supabase';
import { Profile } from 'src/types';
import { ref } from 'vue';

export const useUserStore = defineStore('session', () => {
  // States
  const session = ref<Session | null>(null);
  const user = ref<Profile | null>(null);
  const name = ref<string | undefined>(undefined);

  // Actions
  async function getSession() {
    session.value = (await supabase.auth.getSession())?.data.session as Session;
    return session.value;
  }

  async function fetchProfile() {
    await getSession();
    if (!session.value) return;

    const { data, error } = await supabaseClient.functions.invoke('get/profile', {
      method: 'POST',
      body: { userId: session.value.user.id },
    });

    if (error) {
      console.error('Error fetching profile data:', error);
      user.value = null;
      return;
    }

    user.value = data?.profile as Profile;
    name.value = user.value?.display_name || user.value?.email;
  }

  function $resetUser() {
    session.value = null;
    user.value = null;
    name.value = undefined;
  }

  return {
    session,
    user,
    name,
    getSession,
    fetchProfile,
    $resetUser,
  };
});
