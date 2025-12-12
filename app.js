// Supabase configuration
const SUPABASE_URL = 'https://whgcdpaxhzcmqthwoasj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ2NkcGF4aHpjbXF0aHdvYXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODkzNDMsImV4cCI6MjA4MDQ2NTM0M30.0wQP2yip73l_5GdVyWE_akIhjCd1HYdf9q3p6Kf5cfc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let todos = [];
let filter = 'all';
let currentUser = null;
let editingId = null;

// DOM Elements
const taskInput = document.getElementById('task-input');
const reminderInput = document.getElementById('reminder-input');
const addTaskBtn = document.getElementById('add-task-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const taskToolbar = document.getElementById('task-toolbar');
const datePickerBtn = document.getElementById('date-picker-btn');
const selectedDateText = document.getElementById('selected-date-text');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const filterTabs = document.querySelectorAll('.tab');
const tabIndicator = document.querySelector('.tab-indicator');

// User Menu
const userAvatar = document.getElementById('user-avatar');
const avatarLetter = document.getElementById('avatar-letter');
const userDropdown = document.getElementById('user-dropdown');
const dropdownUserName = document.getElementById('dropdown-user-name');
const dropdownUserEmail = document.getElementById('dropdown-user-email');
const logoutBtn = document.getElementById('logout-btn');
const settingsBtn = document.getElementById('settings-btn');
const themeToggle = document.getElementById('theme-toggle');

// Initialize
initializeTheme();
checkAuth();
initializeTabIndicator();

// Theme Toggle
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'auth.html';
        return;
    }

    currentUser = session.user;
    initializeUser();
    await loadTodos();

    // Initialize notifications after app is loaded
    initNotificationsDelayed();
}


function initializeUser() {
    const email = currentUser.email;
    const firstLetter = email.charAt(0).toUpperCase();
    const username = email.split('@')[0];

    avatarLetter.textContent = firstLetter;
    dropdownUserName.textContent = username.charAt(0).toUpperCase() + username.slice(1);
    dropdownUserEmail.textContent = email;
}

// User Menu Toggle
userAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('visible');
    userDropdown.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('hidden');
        userDropdown.classList.remove('visible');
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'auth.html';
});

// Settings (placeholder)
settingsBtn.addEventListener('click', () => {
    alert('Settings feature coming soon!');
});

// Task Input Focus/Blur Handling
taskInput.addEventListener('focus', () => {
    taskToolbar.classList.remove('hidden');
    taskToolbar.classList.add('visible');
    updateAddButtonVisibility();
});

taskInput.addEventListener('input', () => {
    updateAddButtonVisibility();
});

function updateAddButtonVisibility() {
    const hasText = taskInput.value.trim().length > 0;
    if (hasText) {
        addTaskBtn.classList.remove('hidden');
        addTaskBtn.classList.add('visible');
    } else if (!editingId) { // Only hide if not editing
        addTaskBtn.classList.add('hidden');
        addTaskBtn.classList.remove('visible');
    }
}

// Cancel Edit
cancelEditBtn.addEventListener('click', cancelEdit);

function cancelEdit() {
    editingId = null;
    taskInput.value = '';
    reminderInput.value = '';
    selectedDateText.textContent = 'Due date';
    datePickerBtn.style.borderColor = '';
    datePickerBtn.style.color = '';

    cancelEditBtn.classList.remove('visible');
    cancelEditBtn.classList.add('hidden');

    // Reset Add Button icon
    addTaskBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    `;

    updateAddButtonVisibility();
    taskToolbar.classList.add('hidden');
    taskToolbar.classList.remove('visible');
}

function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    editingId = id;
    taskInput.value = todo.text;

    if (todo.reminder) {
        const date = new Date(todo.reminder);
        reminderInput.value = todo.reminder;
        selectedDateText.textContent = formatDateShort(date);
        datePickerBtn.style.borderColor = 'rgba(78, 159, 255, 0.4)';
        datePickerBtn.style.color = 'var(--accent-start)';
    } else {
        reminderInput.value = '';
        selectedDateText.textContent = 'Due date';
        datePickerBtn.style.borderColor = '';
        datePickerBtn.style.color = '';
    }

    // Show cancel button
    cancelEditBtn.classList.remove('hidden');
    cancelEditBtn.classList.add('visible');

    // Change Add Button to Save
    addTaskBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    `;
    addTaskBtn.classList.remove('hidden');
    addTaskBtn.classList.add('visible');

    // Show toolbar
    taskToolbar.classList.remove('hidden');
    taskToolbar.classList.add('visible');

    taskInput.focus();
}

// Custom Date Picker
const customDatepicker = document.getElementById('custom-datepicker');
const datepickerBackdrop = document.getElementById('datepicker-backdrop');
const datepickerDays = document.getElementById('datepicker-days');
const monthYearDisplay = document.getElementById('month-year-display');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const timeInput = document.getElementById('time-input');
const clearDateBtn = document.getElementById('clear-date');
const todayBtn = document.getElementById('today-btn');
const confirmDateBtn = document.getElementById('confirm-date');

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

// Toggle date picker
datePickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = customDatepicker.classList.contains('visible');
    if (isVisible) {
        closeDatepicker();
    } else {
        openDatepicker();
    }
});

function openDatepicker() {
    customDatepicker.classList.remove('hidden');
    datepickerBackdrop.classList.add('visible');
    // Force reflow
    customDatepicker.offsetHeight;
    customDatepicker.classList.add('visible');
    renderCalendar();
}

function closeDatepicker() {
    customDatepicker.classList.remove('visible');
    datepickerBackdrop.classList.remove('visible');
    setTimeout(() => {
        customDatepicker.classList.add('hidden');
    }, 300);
}

// Close when clicking backdrop
datepickerBackdrop.addEventListener('click', () => {
    closeDatepicker();
});

// Navigate months
prevMonthBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
});

nextMonthBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
});

// Render calendar
function renderCalendar() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    monthYearDisplay.textContent = `${months[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    datepickerDays.innerHTML = '';

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const btn = createDayButton(day, 'other-month');
        datepickerDays.appendChild(btn);
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        date.setHours(0, 0, 0, 0);

        let classes = '';
        if (date.getTime() === today.getTime()) {
            classes += ' today';
        }
        if (selectedDate && date.getTime() === selectedDate.getTime()) {
            classes += ' selected';
        }

        const btn = createDayButton(i, classes.trim());
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectDate(i);
        });
        datepickerDays.appendChild(btn);
    }

    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        const btn = createDayButton(i, 'other-month');
        datepickerDays.appendChild(btn);
    }
}

function createDayButton(day, classes) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `datepicker-day ${classes}`;
    btn.textContent = day;
    return btn;
}

function selectDate(day) {
    selectedDate = new Date(currentYear, currentMonth, day);
    selectedDate.setHours(0, 0, 0, 0);
    renderCalendar();
}

// Today button
todayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    selectedDate = new Date(today);
    selectedDate.setHours(0, 0, 0, 0);
    renderCalendar();
});

// Clear button
clearDateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedDate = null;
    reminderInput.value = '';
    selectedDateText.textContent = 'Due date';
    datePickerBtn.style.borderColor = '';
    datePickerBtn.style.color = '';
    closeDatepicker();
});

// Confirm button
// Confirm button
confirmDateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectedDate) {
        const time = timeInput.value || '12:00';
        const [hours, minutes] = time.split(':');
        const finalDate = new Date(selectedDate);
        finalDate.setHours(parseInt(hours), parseInt(minutes));

        // Format for the hidden input
        reminderInput.value = finalDate.toISOString();
        selectedDateText.textContent = formatDateShort(finalDate);
        datePickerBtn.style.borderColor = 'rgba(78, 159, 255, 0.4)';
        datePickerBtn.style.color = 'var(--accent-start)';

        closeDatepicker();

        // Auto-add task if text exists
        if (taskInput.value.trim().length > 0) {
            addTask();
        } else {
            // Focus input if no text yet
            taskInput.focus();
        }
    } else {
        closeDatepicker();
    }
});


function formatDateShort(date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

// Add Task
// Add or Update Task
async function addTask() {
    const text = taskInput.value.trim();
    const reminder = reminderInput.value;

    if (!text) return;

    if (editingId) {
        // Update existing logic
        const todo = todos.find(t => t.id === editingId);
        if (todo) {
            const updates = {
                text: text,
                reminder: reminder || null
            };

            // Optimistic update
            todo.text = text;
            todo.reminder = updates.reminder;
            renderTodos();

            cancelEdit(); // Reset UI

            await updateTodo(todo.id, updates);
        }
    } else {
        // Create new logic
        const newTodo = {
            id: null,
            text,
            reminder,
            completed: false,
            createdAt: new Date().toISOString()
        };

        // Optimistically add to UI
        todos.unshift(newTodo);
        renderTodos();

        // Save to database
        const success = await saveTodo(newTodo);

        if (!success) {
            todos = todos.filter(t => t !== newTodo);
            renderTodos();
        }

        // Clear inputs
        taskInput.value = '';
        reminderInput.value = '';
        selectedDateText.textContent = 'Due date';
        datePickerBtn.style.borderColor = '';
        datePickerBtn.style.color = '';
        taskToolbar.classList.add('hidden');
        taskToolbar.classList.remove('visible');
        addTaskBtn.classList.add('hidden');
        addTaskBtn.classList.remove('visible');

        // Refocus input
        taskInput.focus();
    }
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

// Filter Tabs
filterTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        filter = tab.dataset.filter;
        updateTabIndicator(index);
        renderTodos();
    });
});

function initializeTabIndicator() {
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
        const index = Array.from(filterTabs).indexOf(activeTab);
        updateTabIndicator(index, false);
    }
}

function updateTabIndicator(index, animate = true) {
    const tab = filterTabs[index];
    const tabsContainer = tab.parentElement;
    const containerRect = tabsContainer.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();

    const left = tabRect.left - containerRect.left;
    const width = tabRect.width;

    if (!animate) {
        tabIndicator.style.transition = 'none';
    }

    tabIndicator.style.transform = `translateX(${left}px)`;
    tabIndicator.style.width = `${width}px`;

    if (!animate) {
        // Force reflow
        tabIndicator.offsetHeight;
        tabIndicator.style.transition = '';
    }
}

// Database Operations
async function loadTodos() {
    try {
        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
                console.error('Database table not set up');
                showDatabaseSetupBanner();
                todos = [];
            } else {
                console.error('Error loading todos:', error);
                todos = [];
            }
        } else {
            todos = data.map(todo => ({
                id: todo.id,
                text: todo.text,
                reminder: todo.reminder,
                completed: todo.completed,
                createdAt: todo.created_at
            }));
        }

        renderTodos();
    } catch (error) {
        console.error('Error loading todos:', error);
        todos = [];
        renderTodos();
    }
}

function showDatabaseSetupBanner() {
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%); max-width: 500px; padding: 20px 24px; background: rgba(255, 165, 2, 0.15); backdrop-filter: blur(20px); border: 1px solid rgba(255, 165, 2, 0.3); border-radius: 16px; color: #ffa502; font-size: 14px; font-weight: 500; z-index: 10000; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); text-align: center; line-height: 1.6;
    `;
    banner.innerHTML = `<strong>⚠️ Database Not Set Up</strong><br>Run the SQL from database_setup_guide.md in Supabase`;
    document.body.appendChild(banner);
    setTimeout(() => {
        banner.style.transition = 'opacity 0.3s';
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
    }, 8000);
}

async function saveTodo(todo) {
    try {
        const { data, error } = await supabase
            .from('todos')
            .insert([{
                user_id: currentUser.id,
                text: todo.text,
                reminder: todo.reminder || null,
                completed: todo.completed,
                created_at: todo.createdAt
            }])
            .select();

        if (error) {
            if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
                alert('⚠️ Database table not set up!\n\nPlease:\n1. Go to Supabase → SQL Editor\n2. Run the SQL from database_setup_guide.md\n3. Refresh this page');
            } else {
                alert('Failed to save task: ' + error.message);
            }
            throw error;
        }

        todo.id = data[0].id;
        return true;
    } catch (error) {
        console.error('Error saving todo:', error);
        return false;
    }
}

async function updateTodo(id, updates) {
    try {
        const { error } = await supabase
            .from('todos')
            .update(updates)
            .eq('id', id)
            .eq('user_id', currentUser.id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating todo:', error);
        return false;
    }
}

async function removeTodo(id) {
    try {
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting todo:', error);
        return false;
    }
}

async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    todo.completed = !todo.completed;
    renderTodos();

    await updateTodo(id, { completed: todo.completed });
}

async function deleteTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    todos = todos.filter(t => t.id !== id);
    renderTodos();

    const success = await removeTodo(id);

    if (!success) {
        todos.push(todo);
        renderTodos();
    }
}

// Render Todos
function renderTodos() {
    taskList.innerHTML = '';

    const filteredTodos = todos.filter(todo => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true;
    });

    if (filteredTodos.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    filteredTodos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = `task-item ${todo.completed ? 'completed' : ''}`;
        li.style.animationDelay = `${index * 0.05}s`;

        // Due date chip
        let dueDateHtml = '';
        if (todo.reminder) {
            const dueDate = new Date(todo.reminder);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

            let chipClass = '';
            if (taskDate < today) {
                chipClass = 'overdue';
            } else if (taskDate.getTime() === today.getTime()) {
                chipClass = 'today';
            }

            dueDateHtml = `
                <span class="due-date-chip ${chipClass}">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${formatDateForChip(dueDate)}
                </span>
            `;
        }

        // Calendar button
        const calendarBtn = todo.reminder
            ? `<a href="${generateCalendarUrl(todo.text, todo.reminder)}" target="_blank" class="task-action-btn calendar" title="Add to Google Calendar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
               </a>`
            : '';

        li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${todo.completed ? 'checked' : ''}>
            <div class="task-content">
                <div class="task-text">${escapeHtml(todo.text)}</div>
                ${dueDateHtml ? `<div class="task-meta">${dueDateHtml}</div>` : ''}
            </div>
            <div class="task-actions">
                ${calendarBtn}
                <button class="task-action-btn edit" title="Edit task">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="task-action-btn delete" title="Delete task">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;

        const checkbox = li.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => toggleTodo(todo.id));

        const editBtn = li.querySelector('.edit');
        editBtn.addEventListener('click', () => editTodo(todo.id));

        const deleteBtn = li.querySelector('.delete');
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

        taskList.appendChild(li);
    });
}

function formatDateForChip(date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const taskDate = new Date(date);
    const timeString = taskDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (taskDate.toDateString() === today.toDateString()) {
        return `Today, ${timeString}`;
    } else if (taskDate.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${timeString}`;
    } else {
        const dateString = taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${dateString}, ${timeString}`;
    }
}

function generateCalendarUrl(text, reminder) {
    if (!reminder) return '';

    const date = new Date(reminder);
    const start = date.toISOString().replace(/[-:.]/g, '').slice(0, 15);
    const endDate = new Date(date.getTime() + 60 * 60 * 1000);
    const end = endDate.toISOString().replace(/[-:.]/g, '').slice(0, 15);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${start}Z/${end}Z&details=Reminder%20from%20RemindMe`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle window resize for tab indicator
window.addEventListener('resize', () => {
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
        const index = Array.from(filterTabs).indexOf(activeTab);
        updateTabIndicator(index, false);
    }
});

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================

let notificationPermission = 'default';
let swRegistration = null;

// Initialize notifications after a delay
function initNotificationsDelayed() {
    if (localStorage.getItem('notification-dismissed')) return;
    setTimeout(initializeNotifications, 2000);
}

// Initialize notifications
async function initializeNotifications() {
    if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return;
    }

    notificationPermission = Notification.permission;

    if ('serviceWorker' in navigator) {
        try {
            swRegistration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registered');
            navigator.serviceWorker.addEventListener('message', handleSWMessage);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    if (notificationPermission === 'default') {
        showNotificationPrompt();
    } else if (notificationPermission === 'granted') {
        startNotificationScheduler();
    }
}

// Show notification permission prompt
function showNotificationPrompt() {
    var promptBanner = document.createElement('div');
    promptBanner.id = 'notification-prompt';
    promptBanner.innerHTML = '<div class="notification-prompt-content">' +
        '<span class="notification-prompt-icon">🔔</span>' +
        '<div class="notification-prompt-text">' +
        '<strong>Enable Reminders</strong>' +
        '<p>Get notified when your tasks are due</p>' +
        '</div>' +
        '<div class="notification-prompt-buttons">' +
        '<button id="notification-deny">Not now</button>' +
        '<button id="notification-allow">Enable</button>' +
        '</div></div>';
    document.body.appendChild(promptBanner);

    document.getElementById('notification-allow').addEventListener('click', async function () {
        promptBanner.remove();
        var permission = await Notification.requestPermission();
        notificationPermission = permission;

        if (permission === 'granted') {
            startNotificationScheduler();
            showToast('Notifications enabled!');
        }
    });

    document.getElementById('notification-deny').addEventListener('click', function () {
        promptBanner.remove();
        localStorage.setItem('notification-dismissed', 'true');
    });
}

// Start the notification scheduler
function startNotificationScheduler() {
    checkDueTasksForNotification();
    setInterval(checkDueTasksForNotification, 60000);
}

// Check for due tasks and send notifications
function checkDueTasksForNotification() {
    if (notificationPermission !== 'granted') return;

    var now = new Date();

    todos.forEach(function (task) {
        if (task.completed || !task.reminder) return;

        var dueDate = new Date(task.reminder);
        var timeDiff = dueDate - now;
        var notifiedKey = 'notified-' + task.id;
        var notifiedFor = localStorage.getItem(notifiedKey);

        if (timeDiff <= 900000 && timeDiff > 0 && notifiedFor !== '15min') {
            showTaskNotification(task, 'Due in 15 minutes');
            localStorage.setItem(notifiedKey, '15min');
        }

        if (timeDiff <= 60000 && timeDiff > -60000 && notifiedFor !== 'due') {
            showTaskNotification(task, 'Due now!');
            localStorage.setItem(notifiedKey, 'due');
        }

        if (timeDiff < -60000 && timeDiff > -120000 && notifiedFor !== 'overdue') {
            showTaskNotification(task, 'Overdue!');
            localStorage.setItem(notifiedKey, 'overdue');
        }
    });
}

// Show a notification for a task
// Show a notification for a task
function showTaskNotification(task, status) {
    var title = 'Task ' + status;
    var options = {
        body: task.text,
        icon: './icon-192.png',
        tag: 'task-' + task.id,
        renotify: true
    };

    // Safety check for vibration
    try {
        if ('vibrate' in navigator) {
            options.vibrate = [200, 100, 200];
        }
    } catch (e) { }

    // Try to show notification
    try {
        if (swRegistration && 'showNotification' in swRegistration) {
            swRegistration.showNotification(title, options);
        } else {
            var notification = new Notification(title, options);
            notification.onclick = function () {
                window.focus();
                notification.close();
            };
        }
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}


// Show toast message
function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function () {
        toast.classList.add('visible');
    }, 10);

    setTimeout(function () {
        toast.classList.remove('visible');
        setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
}

// Handle messages from service worker
function handleSWMessage(event) {
    if (event.data && event.data.type === 'COMPLETE_TASK') {
        toggleTodo(event.data.taskId);
    }
}

