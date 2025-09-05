import { Session } from '@supabase/supabase-js';
import { defineStore } from 'pinia';
import supabase from 'src/api/supabase';
import { Profile } from 'src/types';
import { ref } from 'vue';

export const useUserStore = defineStore('session', () => {
  // States
  const session = ref<Session | null>(null);
  const user = ref<Profile | null>(null);

  // Actions
  async function getSession() {
    session.value = (await supabase.auth.getSession())?.data.session as Session;
    return session.value;
  }

  async function fetchProfile() {
    await getSession();
    if (!session.value) return;

    user.value = session.value
      ? ((
          await supabase
            .from('profiles_view')
            .select('*')
            .eq('id', session.value.user.id)
            .single()
        ).data as Profile)
      : null;
    return user.value;
  }

  function $resetUser() {
    session.value = null;
    user.value = null;
  }

  return {
    session,
    user,
    getSession,
    fetchProfile,
    $resetUser,
  };
});
