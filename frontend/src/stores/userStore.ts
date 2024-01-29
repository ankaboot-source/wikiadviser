import { Session } from '@supabase/supabase-js';
import { defineStore } from 'pinia';
import supabase from 'src/api/supabase';
import { Profile } from 'src/types';
import { ref } from 'vue';

export const useUserStore = defineStore('session', () => {
  // States
  const session = ref<Session>();
  const user = ref<Profile | null>(null);

  // Actions
  async function getSession() {
    session.value = (await supabase.auth.getSession()).data.session as Session;
  }

  async function updateProfile() {
    user.value =
      ((
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.value?.user.id)
          .single()
      ).data as Profile) ?? null;
  }

  return {
    session,
    user,
    getSession,
    updateProfile,
  };
});
