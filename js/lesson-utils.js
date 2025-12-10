// ===== Lesson Utilities with Firebase =====

import { 
    markLessonComplete as firebaseMarkComplete,
    markLessonIncomplete as firebaseMarkIncomplete,
    getCompletedLessons,
    getUser
} from './firebase-config.js';

// Session storage key for current user
const SESSION_KEY = 'businessEnglish_currentUser';

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
