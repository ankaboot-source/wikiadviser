import { transporter } from '../utils/email.ts';
import { Notification } from '../schema.ts';
import { getUserEmail } from '../utils/helpers.ts';
export async function sendEmailNotification(notification: Notification) {
  const toEmail = await getUserEmail(notification.user_id);
  const triggeredByEmail = await getUserEmail(notification.triggered_by);

  if (!toEmail) return;

  let subject = '';
  let text = '';

  const {
    articleTitle,
    role,
    commenterName,
    userName,
    isChangeOwner,
    isForSelf,
  } = notification.params || {};

  switch (`${notification.type}.${notification.action}`) {
    case 'revision.create':
      subject = `New revision on "${articleTitle}"`;
      text = `A new revision to ${articleTitle} has been made.`;
      break;

    case 'comment.create':
      subject = `New comment on "${articleTitle}"`;
      if (isChangeOwner) {
        text = `${
          commenterName || triggeredByEmail
        } has replied to your change on article ${articleTitle}.`;
      } else {
        text = `A new comment has been made to a change on ${articleTitle}.`;
      }
      break;

    case 'role.create':
      subject = `Access granted to "${articleTitle}"`;
      if (isForSelf) {
        text = `You have been granted ${role} permission to ${articleTitle}.`;
      } else {
        text = `${userName} has been granted access to ${articleTitle}.`;
      }
      break;

    case 'role.update':
      subject = `Your role updated on "${articleTitle}"`;
      if (isForSelf) {
        text = `Your permission for ${articleTitle} has been changed to ${role}.`;
      } else {
        text = `${userName}'s role was updated to ${role} on the article "${articleTitle}".`;
      }
      break;

    case 'role.update_others':
      subject = `Role updated on "${articleTitle}"`;
      text = `${userName}'s permission for ${articleTitle} has been changed to ${role}.`;
      break;

    case 'role.create_others':
      subject = `New member added to "${articleTitle}"`;
      text = `${userName} has been granted access to ${articleTitle}.`;
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
