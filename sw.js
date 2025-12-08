// RemindMe Service Worker
// Handles background notifications for due tasks

const CACHE_NAME = 'remindme-v1';
const CHECK_INTERVAL = 60000; // Check every minute

// Install event
self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker installed');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activated');
    event.waitUntil(clients.claim());
});

// Message handler for receiving tasks from main app
self.addEventListener('message', (event) => {
    if (event.data.type === 'SCHEDULE_NOTIFICATIONS') {
        const tasks = event.data.tasks;
        scheduleNotifications(tasks);
    }

    if (event.data.type === 'CHECK_DUE_TASKS') {
        checkDueTasks(event.data.tasks);
    }
});

// Check for due tasks and show notifications
function checkDueTasks(tasks) {
    const now = new Date();

    tasks.forEach(task => {
        if (task.completed || !task.reminder) return;

        const dueDate = new Date(task.reminder);
        const timeDiff = dueDate - now;

        // Notify if due within the next minute or overdue
        if (timeDiff <= 60000 && timeDiff > -60000) {
            showNotification(task);
        }

        // Notify 15 minutes before
        if (timeDiff <= 900000 && timeDiff > 840000) {
            showNotification(task, '15 minutes');
        }

        // Notify 1 hour before
        if (timeDiff <= 3600000 && timeDiff > 3540000) {
            showNotification(task, '1 hour');
        }
    });
}

// Show notification
function showNotification(task, timeUntil = null) {
    const title = timeUntil
        ? `⏰ Due in ${timeUntil}: ${task.title}`
        : `🔔 Task Due: ${task.title}`;

    const options = {
        body: task.title,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `task-${task.id}`,
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
            taskId: task.id,
            url: self.location.origin
        },
        actions: [
            { action: 'complete', title: '✓ Done' },
            { action: 'snooze', title: '⏰ Snooze' }
        ]
    };

    self.registration.showNotification(title, options);
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const action = event.action;
    const taskId = event.notification.data.taskId;

    if (action === 'complete') {
        // Send message to main app to complete task
        clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'COMPLETE_TASK',
                    taskId: taskId
                });
            });
        });
    } else if (action === 'snooze') {
        // Snooze for 15 minutes
        setTimeout(() => {
            self.registration.showNotification('⏰ Snoozed Reminder', {
                body: 'Your task reminder was snoozed',
                tag: `task-${taskId}-snooze`
            });
        }, 900000);
    } else {
        // Open app
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});

// Periodic sync for background checks (if supported)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-due-tasks') {
        event.waitUntil(checkAllDueTasks());
    }
});

async function checkAllDueTasks() {
    // This would need to fetch tasks from storage/API
    // For now, we rely on messages from the main app
    console.log('[SW] Periodic sync triggered');
}
