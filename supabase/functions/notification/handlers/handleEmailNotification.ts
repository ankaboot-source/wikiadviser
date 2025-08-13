import { transporter } from '../utils/email.ts';
import { Notification, NotificationAction, NotificationType } from '../schema.ts';
import {
  getUserEmail,
  getArticleTitle,
  getUserRole,
} from '../utils/helpers.ts';

export async function sendEmailNotification(notification: Notification) {
  try {
    const toEmail = await getUserEmail(notification.user_id);
    if (!toEmail) {
      console.warn('No email found for recipient:', notification.user_id);
      return;
    }

    const triggeredByEmail = await getUserEmail(notification.triggered_by);
    const triggeredOnEmail = notification.triggered_on
      ? await getUserEmail(notification.triggered_on)
      : null;

    const articleTitle = await getArticleTitle(notification.article_id);

    let role: string | null = null;
    if (notification.type === NotificationType.Role && notification.triggered_on) {
      role = await getUserRole(
        notification.article_id,
        notification.triggered_on
      );
    }

    const recipientIsTarget =
      notification.triggered_on &&
      notification.user_id === notification.triggered_on;

    const recipientIsChangeOwner =
      notification.type === NotificationType.Comment &&
      notification.triggered_on &&
      notification.user_id === notification.triggered_on;

    let subject = '';
    let text = '';

    switch (notification.type) {
    case NotificationType.Revision:
      if (notification.action === NotificationAction.Insert) {
        subject = `New revision on "${articleTitle}"`;
        text = `A new revision to ${articleTitle} has been made.`;
      }
      break;

    case NotificationType.Comment:
      if (notification.action === NotificationAction.Insert) {
        subject = `New comment on "${articleTitle}"`;
        text = recipientIsChangeOwner
          ? `${triggeredByEmail || 'Someone'} has replied to your change on article ${articleTitle}.`
          : `A new comment has been made to a change on ${articleTitle}.`;
      }
      break;

    case NotificationType.Role:
      if (notification.action === NotificationAction.Insert) {
        subject = `Access granted to "${articleTitle}"`;
        text = recipientIsTarget
          ? `You have been granted ${role ?? 'a role'} permission to ${articleTitle}.`
          : `${triggeredOnEmail || 'Someone'} has been granted access to ${articleTitle}.`;
      } else if (notification.action === NotificationAction.Update) {
        if (recipientIsTarget) {
          subject = `Your role updated on "${articleTitle}"`;
          text = `Your permission for ${articleTitle} has been changed to ${role ?? 'a role'}.`;
        }
      }
      break;

    default:
      console.warn('Unhandled email type or action:', notification);
      return;
  }
    await transporter.sendMail({
      from: Deno.env.get('SMTP_USER'),
      to: toEmail,
      subject,
      text,
    });

    console.log(
      `Email sent to ${toEmail} for ${text}`
    );
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}
