import { transporter } from '../utils/email.ts';
import { buildHtmlEmail } from '../utils/buildHtmlEmail.ts';
import {
  Notification,
  NotificationAction,
  NotificationType,
} from '../schema.ts';
import {
  getUserEmail,
  getArticleTitle,
  getUserRole,
  getChangeIdForNotification,
} from '../utils/helpers.ts';

function getEmailContent(
  notification: Notification,
  context: {
    articleTitle: string;
    triggeredByEmail: string;
    triggeredOnEmail: string | null;
    role: string | null;
    recipientIsTarget: boolean;
    recipientIsChangeOwner: boolean;
    baseUrl: string;
    changeId: string | null;
  }
) {
  const {
    articleTitle,
    triggeredByEmail,
    triggeredOnEmail,
    role,
    recipientIsTarget,
    recipientIsChangeOwner,
    baseUrl,
    changeId,
  } = context;

  let subject = '';
  let text = '';
  let redirectUrl = changeId ? `${baseUrl}?change=${changeId}` : baseUrl;

  switch (notification.type) {
    case NotificationType.Revision:
      if (notification.action === NotificationAction.Insert) {
        subject = `New revision on « ${articleTitle} »`;
        text = `A new revision to « ${articleTitle} » has been made by ${triggeredByEmail}.`;
      }
      break;

    case NotificationType.Comment:
      if (notification.action === NotificationAction.Insert) {
        subject = `New comment on « ${articleTitle} »`;
        text = recipientIsChangeOwner
          ? `${triggeredByEmail} has replied to your change on article « ${articleTitle} ».`
          : `A new comment has been made to a change on « ${articleTitle} ».`;
      }
      break;

    case NotificationType.Role:
      if (notification.action === NotificationAction.Insert) {
        subject = `Access granted to « ${articleTitle} »`;
        text = recipientIsTarget
          ? `You have been granted « ${
              role ?? 'a role'
            } » permission to « ${articleTitle} ».`
          : `${triggeredOnEmail || 'Someone'} has been granted ${
              role ?? 'a role'
            } permission to « ${articleTitle} ».`;
        redirectUrl = baseUrl;
      } else if (
        notification.action === NotificationAction.Update &&
        recipientIsTarget
      ) {
        subject = `Your role updated on «${articleTitle}»`;
        text = `Your permission for « ${articleTitle} » has been changed to ${
          role ?? 'a role'
        }.`;
        redirectUrl = baseUrl;
      }
      break;

    default:
      console.warn('Unhandled email type or action:', notification);
      return null;
  }

  return subject && text ? { subject, text, redirectUrl } : null;
}

export async function sendEmailNotification(notification: Notification) {
  try {
    const toEmail = await getUserEmail(notification.user_id);
    if (!toEmail) {
      console.warn('No email found for recipient:', notification.user_id);
      return;
    }

    const triggeredByEmail = await getUserEmail(notification.triggered_by);
    if (!triggeredByEmail) {
      console.warn('No email found for triggerer:', notification.triggered_by);
      return;
    }

    const AI_BOT_EMAIL = Deno.env.get('AI_BOT_EMAIL');
    if (toEmail === AI_BOT_EMAIL) {
      console.log('Skipping email to AI bot');
      return;
    }
    const triggeredOnEmail = notification.triggered_on
      ? await getUserEmail(notification.triggered_on)
      : null;

    const articleTitle = await getArticleTitle(notification.article_id);

    let role: string | null = null;
    if (
      notification.type === NotificationType.Role &&
      notification.triggered_on
    ) {
      role = await getUserRole(
        notification.article_id,
        notification.triggered_on
      );
    }

    const recipientIsTarget = Boolean(
      notification.triggered_on &&
        notification.user_id === notification.triggered_on
    );

    const recipientIsChangeOwner = Boolean(
      notification.type === NotificationType.Comment &&
        notification.triggered_on &&
        notification.user_id === notification.triggered_on
    );

    const changeId = await getChangeIdForNotification(notification);
    const baseUrl = `/articles/${notification.article_id}`;

    const emailContent = getEmailContent(notification, {
      articleTitle,
      triggeredByEmail,
      triggeredOnEmail,
      role,
      recipientIsTarget,
      recipientIsChangeOwner,
      baseUrl,
      changeId,
    });

    if (!emailContent) {
      console.warn(
        'No email content generated for notification:',
        notification
      );
      return;
    }

    const html = buildHtmlEmail(
      emailContent.subject,
      emailContent.text,
      emailContent.redirectUrl
    );
    await transporter.sendMail({
      from: `"${triggeredByEmail}" <${Deno.env.get('SMTP_USER')}>`,
      replyTo: triggeredByEmail,
      to: toEmail,
      subject: emailContent.subject,
      html,
    });

    console.log(`Email sent to ${toEmail}`);
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}
