export const en = {
  notifications: {
    noNotifications: 'No notifications',
    newNotifications: '{count} new notification{s}',
    markAllAsRead: 'Mark all as read',
    failedToClear: 'Failed to clear notification',
    allMarkedAsRead: 'All notifications marked as read',
    clear: 'Clear',
    now: 'Now',
    unknownTime: 'Unknown',
    minutesAgo: '{minutes} minute{s} ago',
    hoursAgo: '{hours} hour{s} ago',
    // Keep these for the component's own messages
    'revision.create': 'A new revision to "{articleTitle}" has been made.',
    'comment.create': 'A new comment has been made to a change on "{articleTitle}" by "{commenterName}".',
    'role.create': 'You have been granted "{role}" permission to "{articleTitle}".',
    'role.update': 'Your permission for "{articleTitle}" has been changed to "{role}".',
    'role.create.others': '{userName} has been granted "{role}" access to "{articleTitle}".',
    'role.update.others': '{userName}\'s permission for "{articleTitle}" has been changed to "{role}".',
  },
  // Add the top-level keys that match what the edge function sends
  'notifications.revision.create': 'A new revision to "{articleTitle}" has been made.',
  'notifications.comment.create': 'A new comment has been made to a change on "{articleTitle}" by "{commenterName}".',
  'notifications.role.create': 'You have been granted "{role}" permission to "{articleTitle}".',
  'notifications.role.update': 'Your permission for "{articleTitle}" has been changed to "{role}".',
  'notifications.role.create.others': '{userName} has been granted "{role}" access to "{articleTitle}".',
  'notifications.role.update.others': '{userName}\'s permission for "{articleTitle}" has been changed to "{role}".',
};