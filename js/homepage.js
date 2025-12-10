// ===== Homepage JavaScript with Firebase =====

import { 
    loginUser, 
    signUpUser,
    userExists,
    getUser,
    getCompletedLessons,
    resetProgress as firebaseResetProgress 
} from './firebase-config.js';

// ===== Session Storage Key =====
const SESSION_KEY = 'businessEnglish_currentUser';

// ===== Auth Mode: 'login' or 'signup' =====
let authMode = 'login';

// ===== Get Current User =====
function getCurrentUser() {
    return sessionStorage.getItem(SESSION_KEY);
}

function setCurrentUser(username) {
    sessionStorage.setItem(SESSION_KEY, username);
}

function clearCurrentUser() {
    sessionStorage.removeItem(SESSION_KEY);
}

// ===== Store completed lessons locally for quick access =====
let cachedCompletedLessons = [];

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

async function initializeApp() {
    // Setup form handler first
    setupLoginForm();
    
    const username = getCurrentUser();
    console.log('Current user from session:', username);
    
    if (username) {
        // User is logged in - verify they exist in Firebase
        try {
            console.log('Checking Firebase for user:', username);
            const userData = await getUser(username);
            if (userData) {
                console.log('User found in Firebase:', userData);
                hideLoginModal();
                showWelcomeBanner(userData.displayName);
                await loadProgress(username);
                updateProgressDisplay();
            } else {
                // User doesn't exist in Firebase anymore
                console.log('User not found in Firebase, showing login');
                clearCurrentUser();
                showLoginModal();
            }
        } catch (error) {
            console.error('Error checking user:', error);
            showLoginModal();
        }
    } else {
        // Show login modal
        console.log('No user in session, showing login');
        showLoginModal();
    }
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Setting up login form handler');
        loginForm.addEventListener('submit', handleFormSubmit);
    } else {
        console.error('Login form not found!');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('Form submitted, mode:', authMode);
    
    const nameInput = document.getElementById('studentName');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    const name = nameInput.value.trim();
    
    // Clear previous errors
    errorMessage.textContent = '';
    errorMessage.classList.remove('show');
    
    if (name.length < 2) {
        showError('Username must be at least 2 characters.');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = authMode === 'login' ? 'Logging in...' : 'Creating account...';
    
    try {
        if (authMode === 'login') {
            // LOGIN MODE: Check if user exists first
            const exists = await userExists(name);
            
            if (!exists) {
                showError('Username not found. Please check spelling or create a new account.');
                resetSubmitButton();
                return;
            }
            
            // User exists, log them in
            const userData = await loginUser(name);
            console.log('Login successful:', userData);
            
            setCurrentUser(name.toLowerCase());
            hideLoginModal();
            showWelcomeBanner(userData.displayName);
            await loadProgress(name.toLowerCase());
            updateProgressDisplay();
            
        } else {
            // SIGNUP MODE: Check if user already exists
            const exists = await userExists(name);
            
            if (exists) {
                showError('Username already taken. Please choose a different name or log in.');
                resetSubmitButton();
                return;
            }
            
            // Create new user
            const userData = await signUpUser(name);
            console.log('Sign up successful:', userData);
            
            setCurrentUser(name.toLowerCase());
            hideLoginModal();
            showWelcomeBanner(userData.displayName);
            cachedCompletedLessons = [];
            updateLessonCards();
            updateProgressDisplay();
        }
        
        // Reset form
        nameInput.value = '';
        resetSubmitButton();
        
    } catch (error) {
        console.error('Auth error:', error);
        showError('Connection error. Please check your internet and try again.');
        resetSubmitButton();
    }
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function resetSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.textContent = authMode === 'login' ? 'Log In' : 'Create Account';
}

// Toggle between Login and Sign Up modes
window.toggleAuthMode = function() {
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const submitBtn = document.getElementById('submitBtn');
    const toggleText = document.getElementById('toggleText');
    const toggleBtn = document.getElementById('toggleBtn');
    const errorMessage = document.getElementById('errorMessage');
    const nameInput = document.getElementById('studentName');
    
    // Clear errors and input
    errorMessage.textContent = '';
    errorMessage.classList.remove('show');
    nameInput.value = '';
    
    if (authMode === 'login') {
        // Switch to Sign Up mode
        authMode = 'signup';
        modalTitle.textContent = 'Create Account';
        modalSubtitle.textContent = 'Choose a username to start tracking your progress.';
        submitBtn.textContent = 'Create Account';
        toggleText.textContent = 'Already have an account?';
        toggleBtn.textContent = 'Log In';
    } else {
        // Switch to Login mode
        authMode = 'login';
        modalTitle.textContent = 'Welcome Back';
        modalSubtitle.textContent = 'Enter your username to continue your progress.';
        submitBtn.textContent = 'Log In';
        toggleText.textContent = 'New here?';
        toggleBtn.textContent = 'Create Account';
    }
};

function showLoginModal() {
    const overlay = document.getElementById('loginOverlay');
    const welcomeBanner = document.getElementById('welcomeBanner');
    
    // Reset to login mode
    authMode = 'login';
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const submitBtn = document.getElementById('submitBtn');
    const toggleText = document.getElementById('toggleText');
    const toggleBtn = document.getElementById('toggleBtn');
    const errorMessage = document.getElementById('errorMessage');
    const nameInput = document.getElementById('studentName');
    
    if (modalTitle) modalTitle.textContent = 'Welcome Back';
    if (modalSubtitle) modalSubtitle.textContent = 'Enter your username to continue your progress.';
    if (submitBtn) {
        submitBtn.textContent = 'Log In';
        submitBtn.disabled = false;
    }
    if (toggleText) toggleText.textContent = 'New here?';
    if (toggleBtn) toggleBtn.textContent = 'Create Account';
    if (errorMessage) {
        errorMessage.textContent = '';
        errorMessage.classList.remove('show');
    }
    if (nameInput) nameInput.value = '';
    
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
    }
    if (welcomeBanner) {
        welcomeBanner.style.display = 'none';
    }
}

function hideLoginModal() {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

function showWelcomeBanner(name) {
    const welcomeBanner = document.getElementById('welcomeBanner');
    const displayName = document.getElementById('displayName');
    
    if (welcomeBanner && displayName) {
        displayName.textContent = name;
        welcomeBanner.style.display = 'block';
    }
}

// Logout function
window.logout = function() {
    console.log('Logging out...');
    
    // Clear session
    clearCurrentUser();
    
    // Clear cached progress
    cachedCompletedLessons = [];
    
    // Update UI
    updateLessonCards();
    updateProgressDisplay();
    
    // Hide welcome banner
    const welcomeBanner = document.getElementById('welcomeBanner');
    if (welcomeBanner) {
        welcomeBanner.style.display = 'none';
    }
    
    // Show login modal
    showLoginModal();
};


// ===== Progress Tracking =====

async function loadProgress(username) {
    try {
        console.log('Loading progress for:', username);
        cachedCompletedLessons = await getCompletedLessons(username);
        console.log('Completed lessons:', cachedCompletedLessons);
        updateLessonCards();
    } catch (error) {
        console.error('Error loading progress:', error);
        cachedCompletedLessons = [];
    }
}

function updateLessonCards() {
    const lessonCards = document.querySelectorAll('.lesson-card');
    
    lessonCards.forEach(card => {
        const lessonNum = parseInt(card.dataset.lesson);
        if (cachedCompletedLessons.includes(lessonNum)) {
            card.classList.add('completed');
        } else {
            card.classList.remove('completed');
        }
    });
}

function updateProgressDisplay() {
    const completed = cachedCompletedLessons;
    const total = 12;
    const count = completed.length;
    const percentage = Math.round((count / total) * 100);
    
    // Update count
    const completedCountEl = document.getElementById('completedCount');
    if (completedCountEl) {
        completedCountEl.textContent = count;
    }
    
    // Update percentage
    const percentageEl = document.getElementById('progressPercentage');
    if (percentageEl) {
        percentageEl.textContent = percentage + '%';
    }
    
    // Update progress bar
    const progressBarFill = document.getElementById('progressBarFill');
    if (progressBarFill) {
        progressBarFill.style.width = percentage + '%';
    }
    
    // Update circular progress
    const progressCircle = document.getElementById('progressCircle');
    if (progressCircle) {
        const circumference = 339.292; // 2 * PI * 54
        const offset = circumference - (percentage / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }
    
    // Update message
    const messageEl = document.getElementById('progressMessage');
    if (messageEl) {
        messageEl.innerHTML = getProgressMessage(count, total);
    }
}

function getProgressMessage(completed, total) {
    const displayNameEl = document.getElementById('displayName');
    const studentName = displayNameEl ? displayNameEl.textContent : 'Student';
    
    if (completed === 0) {
        return `<p>Welcome, ${studentName}! Start your first lesson to begin tracking your progress.</p>`;
    } else if (completed < total / 4) {
        return `<p>Great start, ${studentName}! You're building a strong foundation. Keep going! 💪</p>`;
    } else if (completed < total / 2) {
        return `<p>Excellent progress, ${studentName}! You're nearly halfway through the course. 🌟</p>`;
    } else if (completed < total * 0.75) {
        return `<p>Amazing work, ${studentName}! You've completed more than half the course! 🎯</p>`;
    } else if (completed < total) {
        return `<p>Almost there, ${studentName}! Just ${total - completed} lesson${total - completed !== 1 ? 's' : ''} to go! 🏃</p>`;
    } else {
        return `<p>Congratulations, ${studentName}! 🎉 You've completed the entire Business English course! 🏆</p>`;
    }
}

// Reset progress function
window.confirmResetProgress = async function() {
    if (cachedCompletedLessons.length === 0) {
        alert('No progress to reset!');
        return;
    }
    
    if (confirm('Are you sure you want to reset all your progress? This cannot be undone.')) {
        const username = getCurrentUser();
        if (username) {
            try {
                await firebaseResetProgress(username);
                cachedCompletedLessons = [];
                updateLessonCards();
                updateProgressDisplay();
                alert('Progress has been reset.');
            } catch (error) {
                console.error('Error resetting progress:', error);
                alert('There was an error resetting your progress. Please try again.');
            }
        }
    }
};


// ===== Smooth Scroll =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});


// ===== Enhanced Hover Effects =====
document.querySelectorAll('.lesson-card.available').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-6px) scale(1.01)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = '';
    });
});


// ===== Intersection Observer for Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe sections for fade-in
document.querySelectorAll('.overview, .progress-section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// Add visible class styles
const style = document.createElement('style');
style.textContent = `
    .overview.visible,
    .progress-section.visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);


// ===== Keyboard Navigation =====
document.querySelectorAll('.lesson-card.available').forEach((card, index) => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });
});


// ===== Export functions for use in lesson pages =====
window.BusinessEnglish = {
    getCurrentUser,
    getCompletedLessons: () => cachedCompletedLessons,
    getStudentName: () => {
        const displayNameEl = document.getElementById('displayName');
        return displayNameEl ? displayNameEl.textContent : getCurrentUser();
    }
};
