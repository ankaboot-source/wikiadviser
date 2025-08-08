import { Notification, TriggerPayload } from "../schema.ts";
import { handleRevisionInsert } from "./handleRevisionInsert.ts";
import { handleCommentInsert } from "./handleCommentInsert.ts";
import { handlePermissionChange } from "./handlePermissionChange.ts";
import { insertNotification } from "../utils/insertnotification.ts";
import { sendEmailNotification } from "./handleEmailNotification.ts";

export async function handleDbChange(
  payload: TriggerPayload,
): Promise<void> {
  let notification: undefined | Notification ;

  switch (payload.table) {
    case "changes":
      notification = await handleRevisionInsert(payload);

      break;
    case "comments":
      notification = await handleCommentInsert(payload);

      break;
    case "permissions":
      notification = await handlePermissionChange(payload);

      break;
    default:
      console.warn(`Unhandled table: ${payload.table}`);
      break;
  }
  if (!notification) return;
  await insertNotification(notification);

  // Send email for each notification
  try {
    await sendEmailNotification(notification);
  } catch (e) {
    const error = e as Error & { code?: string };

    // More specific error handling
    if (error.code === "ESOCKET" || error.code === "ECONNREFUSED") {
      console.warn(
        "Email service unavailable, notification saved to database only",
      );
    } else {
      console.error("Failed to send email:", error);
    }
  }
}
