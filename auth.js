// Supabase configuration
const SUPABASE_URL = 'https://whgcdpaxhzcmqthwoasj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ2NkcGF4aHpjbXF0aHdvYXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODkzNDMsImV4cCI6MjA4MDQ2NTM0M30.0wQP2yip73l_5GdVyWE_akIhjCd1HYdf9q3p6Kf5cfc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

// Check if user is already logged in
checkAuth();

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
    }
}

// Toggle between login and register forms
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    clearMessages();
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    clearMessages();
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = loginForm.querySelector('.auth-btn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        showSuccess('Successfully signed in! Redirecting...');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);

    } catch (error) {
        showError(error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
});

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const submitBtn = registerForm.querySelector('.auth-btn');

    if (password !== passwordConfirm) {
        showError('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        // Check if email confirmation is required
        if (data.user && !data.session) {
            showSuccess('Account created! Please check your email to confirm your account.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        } else {
            showSuccess('Account created! Redirecting...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }

    } catch (error) {
        showError(error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
    }
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    successMessage.classList.add('hidden');
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
}

function clearMessages() {
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
}
