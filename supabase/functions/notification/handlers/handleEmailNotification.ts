import { transporter } from '../utils/email.ts';
import { Notification } from '../schema.ts';
import { getUserEmail } from '../utils/helpers.ts';

export async function sendEmailNotification(notification: Notification) {
  const toEmail = await getUserEmail(notification.user_id);
  const triggeredByEmail = await getUserEmail(notification.triggered_by);

  if (!toEmail) return;

  let subject = '';
  let text = '';

  const { articleTitle, role, commenterName, userName, isChangeOwner, isForSelf } = notification.params || {};

  switch (`${notification.type}:${notification.action}`) {
    case 'revision:create':
      subject = `New revision on "${articleTitle}"`;
      text = `A new revision has been made to the article "${articleTitle}" by ${triggeredByEmail}.`;
      break;

    case 'comment:create':
      subject = `New comment on "${articleTitle}"`;
      // Different text based on recipient type
      if (isChangeOwner) {
        text = `${commenterName || triggeredByEmail} has replied to your change on article "${articleTitle}".`;
      } else {
        text = `A new comment has been made to a change on "${articleTitle}".`;
      }
      break;

    case 'role:create':
      subject = `Access granted to "${articleTitle}"`;
      // Different text based on recipient type
      if (isForSelf) {
        text = `You've been granted ${role} access to the article "${articleTitle}".`;
      } else {
        text = `${userName} has been granted ${role} access to the article "${articleTitle}".`;
      }
      break;

    case 'role:update':
      subject = `Your role updated on "${articleTitle}"`;
      if (isForSelf) {
        text = `Your role was updated to ${role} on the article "${articleTitle}".`;
      } else {
        text = `${userName}'s role was updated to ${role} on the article "${articleTitle}".`;
      }
      break;

    default:
      console.warn('Unhandled email type:', notification);
      return;
  }

  await transporter.sendMail({
    from: Deno.env.get('SMTP_USER'),
    to: toEmail,
    subject,
    text,
  });
}