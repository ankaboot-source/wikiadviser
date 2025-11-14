import { getUserPermission } from '../_shared/helpers/supabaseHelper.ts';
import { Context, Next } from 'hono';
import createSupabaseClient from '../_shared/supabaseClient.ts';

export const hasPermissions = (permissions: string[]) => {
  return async (context: Context, next: Next) => {
    const supabaseClient = createSupabaseClient(
      context.req.header('Authorization')
    );

    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();

    if (error || !user) {
      return context.json({ message: 'Unauthorized' }, 401);
    }

    try {
      const articleId = context.req.param('id');

      const permission = await getUserPermission(articleId, user.id);
      const grantedPermissions = permission
        ? permissions.includes(permission)
        : null;

      if (grantedPermissions) {
        return await next();
      }

      return context.json(
        { message: 'User does not have required permissions' },
        403
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something unexpected has occurred, try again later.';
      console.error(message);
      return context.json({ message }, 500);
    }
  };
};
