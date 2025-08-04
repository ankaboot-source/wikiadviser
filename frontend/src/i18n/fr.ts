export const fr = {
  notifications: {
    noNotifications: 'Aucune notification',
    newNotifications: '{count} nouvelle{s} notification{s}',
    markAllAsRead: 'Tout marquer comme lu',
    failedToClear: 'Échec de la suppression de la notification',
    allMarkedAsRead: 'Toutes les notifications marquées comme lues',
    clear: 'Effacer',
    now: 'Maintenant',
    unknownTime: 'Inconnu',
    minutesAgo: 'il y a {minutes} minute{s}',
    hoursAgo: 'il y a {hours} heure{s}',
    // Keep these for the component's own messages
    'revision.create': 'Une nouvelle révision de "{articleTitle}" a été effectuée.',
    'comment.create': 'Un nouveau commentaire a été ajouté à une modification sur "{articleTitle}" par "{commenterName}".',
    'role.create': 'Vous avez reçu la permission "{role}" pour "{articleTitle}".',
    'role.update': 'Votre permission pour "{articleTitle}" a été changée en "{role}".',
    'role.create.others': '{userName} a reçu l\'accès "{role}" à "{articleTitle}".',
    'role.update.others': 'La permission de {userName} pour "{articleTitle}" a été changée en "{role}".',
  },
  // Add the top-level keys that match what the edge function sends
  'notifications.revision.create': 'Une nouvelle révision de "{articleTitle}" a été effectuée.',
  'notifications.comment.create': 'Un nouveau commentaire a été ajouté à une modification sur "{articleTitle}" par "{commenterName}".',
  'notifications.role.create': 'Vous avez reçu la permission "{role}" pour "{articleTitle}".',
  'notifications.role.update': 'Votre permission pour "{articleTitle}" a été changée en "{role}".',
  'notifications.role.create.others': '{userName} a reçu l\'accès "{role}" à "{articleTitle}".',
  'notifications.role.update.others': 'La permission de {userName} pour "{articleTitle}" a été changée en "{role}".',
};