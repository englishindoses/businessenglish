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
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
    };
    
    await setDoc(userRef, userData);
    return userData;
}

/**
 * Login or create user - returns user data
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
    } else {
        // Create new user
        return await createUser(username);
    }
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
        lastUpdated: serverTimestamp()
    });
}

// Export db for advanced usage if needed
export { db };