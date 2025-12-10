// ===== Homepage JavaScript with Firebase =====

import { 
    loginUser, 
    getUser,
    getCompletedLessons,
    resetProgress as firebaseResetProgress 
} from './firebase-config.js';

// ===== Local Storage Keys (for session only) =====
const SESSION_KEY = 'businessEnglish_currentUser';

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

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    const username = getCurrentUser();
    
    if (username) {
        // User is logged in - verify they exist in Firebase
        try {
            const userData = await getUser(username);
            if (userData) {
                hideLoginModal();
                showWelcomeBanner(userData.displayName);
                await loadProgress(username);
                updateProgressDisplay();
            } else {
                // User doesn't exist in Firebase anymore
                clearCurrentUser();
                showLoginModal();
            }
        } catch (error) {
            console.error('Error checking user:', error);
            showLoginModal();
        }
    } else {
        // Show login modal
        showLoginModal();
    }
    
    // Setup form handler
    setupLoginForm();
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const nameInput = document.getElementById('studentName');
            const submitBtn = loginForm.querySelector('.login-btn');
            const name = nameInput.value.trim();
            
            if (name.length >= 2) {
                // Show loading state
                submitBtn.textContent = 'Loading...';
                submitBtn.disabled = true;
                
                try {
                    // Login or create user in Firebase
                    const userData = await loginUser(name);
                    
                    // Store username in session
                    setCurrentUser(name.toLowerCase());
                    
                    hideLoginModal();
                    showWelcomeBanner(userData.displayName);
                    await loadProgress(name.toLowerCase());
                    updateProgressDisplay();
                } catch (error) {
                    console.error('Login error:', error);
                    alert('There was an error connecting to the server. Please try again.');
                    submitBtn.textContent = 'Start Learning';
                    submitBtn.disabled = false;
                }
            }
        });
    }
}

function showLoginModal() {
    const overlay = document.getElementById('loginOverlay');
    const welcomeBanner = document.getElementById('welcomeBanner');
    
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

// Make this function globally accessible for the button onclick
window.showLoginModal = function() {
    clearCurrentUser();
    showLoginModal();
    
    // Reset the login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.reset();
        const submitBtn = loginForm.querySelector('.login-btn');
        submitBtn.textContent = 'Start Learning';
        submitBtn.disabled = false;
    }
};


// ===== Progress Tracking =====

// Store completed lessons locally for quick access
let cachedCompletedLessons = [];

async function loadProgress(username) {
    try {
        cachedCompletedLessons = await getCompletedLessons(username);
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
    const username = getCurrentUser();
    // Get display name from welcome banner if available
    const displayNameEl = document.getElementById('displayName');
    const studentName = displayNameEl ? displayNameEl.textContent : (username || 'Student');
    
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

// Make this globally accessible
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


// ===== Easter Egg: Konami Code =====
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', function(e) {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        alert('🎉 You found the secret! Good luck with your learning journey!');
        konamiCode = [];
    }
});


// ===== Export functions for use in lesson pages =====
// These will be available globally via window.BusinessEnglish
window.BusinessEnglish = {
    getCurrentUser,
    getCompletedLessons: () => cachedCompletedLessons,
    getStudentName: () => {
        const displayNameEl = document.getElementById('displayName');
        return displayNameEl ? displayNameEl.textContent : getCurrentUser();
    }
};