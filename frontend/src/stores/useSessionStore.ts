import { Session, User } from '@supabase/supabase-js';
import { defineStore } from 'pinia';
import supabase from 'src/api/supabase';
import { ref } from 'vue';

export const useSessionStore = defineStore('session', () => {
  // States
  const session = ref<Session>();
  const user = ref<User>();

  // Actions
  async function fetchSession() {
    session.value = (await supabase.auth.getSession()).data.session as Session;
  }

  async function fetchUser() {
    user.value = (await supabase.auth.getUser()).data.user as User;
  }

  return {
    session,
    user,
    fetchSession,
    fetchUser,
  };
});
