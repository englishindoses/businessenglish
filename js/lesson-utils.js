// ===== Lesson Utilities with Firebase =====

import { 
    markLessonComplete as firebaseMarkComplete,
    markLessonIncomplete as firebaseMarkIncomplete,
    getCompletedLessons,
    getUser,
    getLessonData,
    saveLessonField,
    saveNote
} from './firebase-config.js';

// Session storage key for current user
const SESSION_KEY = 'businessEnglish_currentUser';

// Debounce timers
const debounceTimers = {};

/**
 * Get the current logged-in username
 * @returns {string|null}
 */
export function getCurrentUser() {
    return sessionStorage.getItem(SESSION_KEY);
}

/**
 * Check if a specific lesson is complete for the current user
 * @param {number} lessonNumber 
 * @returns {Promise<boolean>}
 */
export async function isLessonComplete(lessonNumber) {
    const username = getCurrentUser();
    if (!username) return false;
    
    try {
        const completed = await getCompletedLessons(username);
        return completed.includes(lessonNumber);
    } catch (error) {
        console.error('Error checking lesson completion:', error);
        return false;
    }
}

/**
 * Mark a lesson as complete
 * @param {number} lessonNumber 
 * @returns {Promise<boolean>} - Returns true if successful
 */
export async function markLessonComplete(lessonNumber) {
    const username = getCurrentUser();
    if (!username) {
        console.error('No user logged in');
        return false;
    }
    
    try {
        await firebaseMarkComplete(username, lessonNumber);
        return true;
    } catch (error) {
        console.error('Error marking lesson complete:', error);
        return false;
    }
}

/**
 * Mark a lesson as incomplete
 * @param {number} lessonNumber 
 * @returns {Promise<boolean>} - Returns true if successful
 */
export async function markLessonIncomplete(lessonNumber) {
    const username = getCurrentUser();
    if (!username) {
        console.error('No user logged in');
        return false;
    }
    
    try {
        await firebaseMarkIncomplete(username, lessonNumber);
        return true;
    } catch (error) {
        console.error('Error marking lesson incomplete:', error);
        return false;
    }
}

/**
 * Get the display name of the current user
 * @returns {Promise<string|null>}
 */
export async function getDisplayName() {
    const username = getCurrentUser();
    if (!username) return null;
    
    try {
        const userData = await getUser(username);
        return userData ? userData.displayName : null;
    } catch (error) {
        console.error('Error getting display name:', error);
        return username;
    }
}

/**
 * Check if user is logged in, redirect to home if not
 * @returns {boolean}
 */
export function requireLogin() {
    const username = getCurrentUser();
    if (!username) {
        // Redirect to homepage for login
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ===== Lesson Data Functions =====

/**
 * Load all lesson data for a specific lesson
 * @param {string} lessonId - The lesson identifier (e.g., "lesson1")
 * @returns {Promise<Object>}
 */
export async function loadLessonData(lessonId) {
    const username = getCurrentUser();
    if (!username) {
        console.log('No user logged in, returning defaults');
        return getDefaultLessonData();
    }
    
    try {
        const data = await getLessonData(username, lessonId);
        console.log(`Loaded lesson data for ${lessonId}:`, data);
        return data;
    } catch (error) {
        console.error('Error loading lesson data:', error);
        return getDefaultLessonData();
    }
}

/**
 * Get default empty lesson data structure
 * @returns {Object}
 */
function getDefaultLessonData() {
    return {
        notes: {},
        sorting: { zone1: [], zone2: [], bank: [] },
        revealedTopics: [],
        matching: {},
        flippedCards: [],
        selectedScenario: null
    };
}

/**
 * Save a specific field with debouncing
 * @param {string} lessonId - The lesson identifier
 * @param {string} field - The field to save
 * @param {any} value - The value to save
 * @param {number} delay - Debounce delay in ms (default 1000)
 */
export function saveFieldDebounced(lessonId, field, value, delay = 1000) {
    const username = getCurrentUser();
    if (!username) {
        console.log('No user logged in, not saving');
        return;
    }
    
    const timerKey = `${lessonId}-${field}`;
    
    // Clear existing timer
    if (debounceTimers[timerKey]) {
        clearTimeout(debounceTimers[timerKey]);
    }
    
    // Set new timer
    debounceTimers[timerKey] = setTimeout(async () => {
        try {
            await saveLessonField(username, lessonId, field, value);
            console.log(`Saved ${field} for ${lessonId}`);
        } catch (error) {
            console.error(`Error saving ${field}:`, error);
        }
    }, delay);
}

/**
 * Save a note with debouncing
 * @param {string} lessonId - The lesson identifier
 * @param {string} noteIndex - The note index
 * @param {string} content - The note content
 * @param {number} delay - Debounce delay in ms (default 1000)
 */
export function saveNoteDebounced(lessonId, noteIndex, content, delay = 1000) {
    const username = getCurrentUser();
    if (!username) {
        console.log('No user logged in, not saving note');
        return;
    }
    
    const timerKey = `${lessonId}-note-${noteIndex}`;
    
    // Clear existing timer
    if (debounceTimers[timerKey]) {
        clearTimeout(debounceTimers[timerKey]);
    }
    
    // Set new timer
    debounceTimers[timerKey] = setTimeout(async () => {
        try {
            await saveNote(username, lessonId, noteIndex, content);
            console.log(`Saved note ${noteIndex} for ${lessonId}`);
        } catch (error) {
            console.error(`Error saving note:`, error);
        }
    }, delay);
}

/**
 * Save immediately without debouncing (for important saves)
 * @param {string} lessonId - The lesson identifier
 * @param {string} field - The field to save
 * @param {any} value - The value to save
 */
export async function saveFieldImmediate(lessonId, field, value) {
    const username = getCurrentUser();
    if (!username) {
        console.log('No user logged in, not saving');
        return;
    }
    
    try {
        await saveLessonField(username, lessonId, field, value);
        console.log(`Saved ${field} for ${lessonId} immediately`);
    } catch (error) {
        console.error(`Error saving ${field}:`, error);
    }
}
