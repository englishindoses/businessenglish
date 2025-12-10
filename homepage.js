// ===== Homepage JavaScript =====

// ===== Profile / Login System =====
const STORAGE_KEYS = {
    studentName: 'businessEnglish_studentName',
    completedLessons: 'businessEnglish_completedLessons'
};

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    const studentName = localStorage.getItem(STORAGE_KEYS.studentName);
    
    if (studentName) {
        // User is logged in
        hideLoginModal();
        showWelcomeBanner(studentName);
    } else {
        // Show login modal
        showLoginModal();
    }
    
    // Load progress
    loadProgress();
    updateProgressDisplay();
    
    // Setup form handler
    setupLoginForm();
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nameInput = document.getElementById('studentName');
            const name = nameInput.value.trim();
            
            if (name.length >= 2) {
                localStorage.setItem(STORAGE_KEYS.studentName, name);
                hideLoginModal();
                showWelcomeBanner(name);
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


// ===== Progress Tracking =====

function getCompletedLessons() {
    const stored = localStorage.getItem(STORAGE_KEYS.completedLessons);
    return stored ? JSON.parse(stored) : [];
}

function saveCompletedLessons(lessons) {
    localStorage.setItem(STORAGE_KEYS.completedLessons, JSON.stringify(lessons));
}

function markLessonComplete(lessonNumber) {
    const completed = getCompletedLessons();
    if (!completed.includes(lessonNumber)) {
        completed.push(lessonNumber);
        saveCompletedLessons(completed);
    }
    return completed;
}

function markLessonIncomplete(lessonNumber) {
    let completed = getCompletedLessons();
    completed = completed.filter(num => num !== lessonNumber);
    saveCompletedLessons(completed);
    return completed;
}

function isLessonComplete(lessonNumber) {
    const completed = getCompletedLessons();
    return completed.includes(lessonNumber);
}

function loadProgress() {
    const completed = getCompletedLessons();
    const lessonCards = document.querySelectorAll('.lesson-card');
    
    lessonCards.forEach(card => {
        const lessonNum = parseInt(card.dataset.lesson);
        if (completed.includes(lessonNum)) {
            card.classList.add('completed');
        } else {
            card.classList.remove('completed');
        }
    });
}

function updateProgressDisplay() {
    const completed = getCompletedLessons();
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
    const studentName = localStorage.getItem(STORAGE_KEYS.studentName) || 'Student';
    
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

function confirmResetProgress() {
    const completed = getCompletedLessons();
    if (completed.length === 0) {
        alert('No progress to reset!');
        return;
    }
    
    if (confirm('Are you sure you want to reset all your progress? This cannot be undone.')) {
        resetProgress();
    }
}

function resetProgress() {
    saveCompletedLessons([]);
    loadProgress();
    updateProgressDisplay();
}


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
// These can be called from lesson pages to mark completion
window.BusinessEnglish = {
    markLessonComplete,
    markLessonIncomplete,
    isLessonComplete,
    getCompletedLessons,
    getStudentName: () => localStorage.getItem(STORAGE_KEYS.studentName)
};
