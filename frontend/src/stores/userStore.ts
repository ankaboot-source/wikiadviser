import { Session } from '@supabase/supabase-js';
import { defineStore } from 'pinia';
import supabase from 'src/api/supabase';
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

    user.value = session.value
      ? ((
          await supabase
            .from('profiles_view')
            .select('*')
            .eq('id', session.value.user.id)
            .single()
        ).data as Profile)
      : null;
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('llm_reviewer_config')
      .eq('id', session.value.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile data:', profileError);
    }
    if (user.value) {
      user.value = {
        ...user.value,
        llm_reviewer_config: profileData?.llm_reviewer_config || null,
      };
    }

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
