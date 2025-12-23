// ===== Firebase Configuration =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDkBEnPyQt2Uxjc6oNyG39bIPZz8Bs8Pfg",
    authDomain: "business-english-2025.firebaseapp.com",
    projectId: "business-english-2025",
    storageBucket: "business-english-2025.firebasestorage.app",
    messagingSenderId: "579294985312",
    appId: "1:579294985312:web:58ae5a67b47e5ecf699705"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== User Management Functions =====

/**
 * Check if a user exists in Firestore
 * @param {string} username - The username to check
 * @returns {Promise<boolean>}
 */
export async function userExists(username) {
    const userRef = doc(db, "users", username.toLowerCase());
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
}

/**
 * Get user data from Firestore
 * @param {string} username - The username to retrieve
 * @returns {Promise<Object|null>}
 */
export async function getUser(username) {
    const userRef = doc(db, "users", username.toLowerCase());
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        return userSnap.data();
    }
    return null;
}

/**
 * Create a new user in Firestore
 * @param {string} username - The username to create
 * @returns {Promise<Object>}
 */
export async function createUser(username) {
    const userRef = doc(db, "users", username.toLowerCase());
    const userData = {
        displayName: username,
        completedLessons: [],
        lessonData: {},
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
    };
    
    await setDoc(userRef, userData);
    return userData;
}

/**
 * Login existing user - returns user data or null if not found
 * @param {string} username - The username
 * @returns {Promise<Object>}
 */
export async function loginUser(username) {
    const existingUser = await getUser(username);
    
    if (existingUser) {
        // Update last login time
        const userRef = doc(db, "users", username.toLowerCase());
        await updateDoc(userRef, {
            lastUpdated: serverTimestamp()
        });
        return existingUser;
    }
    
    return null;
}

/**
 * Sign up new user - creates a new account
 * @param {string} username - The username
 * @returns {Promise<Object>}
 */
export async function signUpUser(username) {
    return await createUser(username);
}

/**
 * Mark a lesson as complete for a user
 * @param {string} username - The username
 * @param {number} lessonNumber - The lesson number to mark complete
 * @returns {Promise<number[]>} - Updated array of completed lessons
 */
export async function markLessonComplete(username, lessonNumber) {
    const userRef = doc(db, "users", username.toLowerCase());
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const userData = userSnap.data();
        let completedLessons = userData.completedLessons || [];
        
        if (!completedLessons.includes(lessonNumber)) {
            completedLessons.push(lessonNumber);
            completedLessons.sort((a, b) => a - b);
            
            await updateDoc(userRef, {
                completedLessons: completedLessons,
                lastUpdated: serverTimestamp()
            });
        }
        
        return completedLessons;
    }
    
    return [];
}

/**
 * Mark a lesson as incomplete for a user
 * @param {string} username - The username
 * @param {number} lessonNumber - The lesson number to mark incomplete
 * @returns {Promise<number[]>} - Updated array of completed lessons
 */
export async function markLessonIncomplete(username, lessonNumber) {
    const userRef = doc(db, "users", username.toLowerCase());
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const userData = userSnap.data();
        let completedLessons = userData.completedLessons || [];
        
        completedLessons = completedLessons.filter(num => num !== lessonNumber);
        
        await updateDoc(userRef, {
            completedLessons: completedLessons,
            lastUpdated: serverTimestamp()
        });
        
        return completedLessons;
    }
    
    return [];
}

/**
 * Get completed lessons for a user
 * @param {string} username - The username
 * @returns {Promise<number[]>}
 */
export async function getCompletedLessons(username) {
    const userData = await getUser(username);
    return userData ? (userData.completedLessons || []) : [];
}

/**
 * Reset all progress for a user
 * @param {string} username - The username
 * @returns {Promise<void>}
 */
export async function resetProgress(username) {
    const userRef = doc(db, "users", username.toLowerCase());
    await updateDoc(userRef, {
        completedLessons: [],
        lessonData: {},
        lastUpdated: serverTimestamp()
    });
}

// ===== Lesson Data Functions =====

/**
 * Get all lesson data for a specific lesson
 * @param {string} username - The username
 * @param {string} lessonId - The lesson identifier (e.g., "lesson1")
 * @returns {Promise<Object>} - Lesson data object
 */
export async function getLessonData(username, lessonId) {
    const userData = await getUser(username);
    
    if (userData && userData.lessonData && userData.lessonData[lessonId]) {
        return userData.lessonData[lessonId];
    }
    
    // Return default empty structure
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
 * Save all lesson data for a specific lesson
 * @param {string} username - The username
 * @param {string} lessonId - The lesson identifier (e.g., "lesson1")
 * @param {Object} data - The lesson data to save
 * @returns {Promise<void>}
 */
export async function saveLessonData(username, lessonId, data) {
    const userRef = doc(db, "users", username.toLowerCase());
    
    // Use dot notation to update nested field
    const updateData = {
        [`lessonData.${lessonId}`]: data,
        lastUpdated: serverTimestamp()
    };
    
    await updateDoc(userRef, updateData);
}

/**
 * Save a specific part of lesson data
 * @param {string} username - The username
 * @param {string} lessonId - The lesson identifier (e.g., "lesson1")
 * @param {string} field - The field to update (e.g., "notes", "sorting")
 * @param {any} value - The value to save
 * @returns {Promise<void>}
 */
export async function saveLessonField(username, lessonId, field, value) {
    const userRef = doc(db, "users", username.toLowerCase());
    
    const updateData = {
        [`lessonData.${lessonId}.${field}`]: value,
        lastUpdated: serverTimestamp()
    };
    
    await updateDoc(userRef, updateData);
}

/**
 * Save a note for a specific lesson
 * @param {string} username - The username
 * @param {string} lessonId - The lesson identifier
 * @param {string} noteIndex - The note index (e.g., "0", "1")
 * @param {string} content - The note content
 * @returns {Promise<void>}
 */
export async function saveNote(username, lessonId, noteIndex, content) {
    const userRef = doc(db, "users", username.toLowerCase());
    
    const updateData = {
        [`lessonData.${lessonId}.notes.${noteIndex}`]: content,
        lastUpdated: serverTimestamp()
    };
    
    await updateDoc(userRef, updateData);
}

// Export db for advanced usage if needed
export { db };
