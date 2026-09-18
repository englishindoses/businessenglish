/**
 * Google sign-in and the online copy of each student's practice.
 *
 * This file is loaded only when someone signs in or is already signed in, so
 * guests never download Firebase. It uses the same Firebase project as the
 * course website, but its own collection, `appUsers`, so the website's
 * username logins are never touched.
 *
 * appUsers/{uid}:
 *   name, photo, email       from their Google account
 *   answered, sessions,
 *   questionCount, lastActive  small totals, so the teacher's list loads quickly
 *   progress, questions,
 *   session                  the full practice, as JSON text
 *   updatedAt                when the practice last changed (device clock)
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { summarise } from './storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDkBEnPyQt2Uxjc6oNyG39bIPZz8Bs8Pfg',
  authDomain: 'business-english-2025.firebaseapp.com',
  projectId: 'business-english-2025',
  storageBucket: 'business-english-2025.firebasestorage.app',
  messagingSenderId: '579294985312',
  appId: '1:579294985312:web:58ae5a67b47e5ecf699705',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const COLLECTION = 'appUsers';

/** The signed-in student in the shape the app uses, or null. */
function toStudent(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    name: user.displayName || '',
    email: user.email || '',
    photo: user.photoURL || '',
  };
}

/** Resolves once Firebase knows whether someone is signed in. */
export function currentStudent() {
  return new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, (user) => {
      stop();
      resolve(toStudent(user));
    });
  });
}

/** Finishes a sign-in that had to leave the page (the redirect fallback). */
export async function finishRedirect() {
  try {
    const result = await getRedirectResult(auth);
    return toStudent(result?.user);
  } catch {
    return null;
  }
}

/**
 * @param {boolean} stay  keep them signed in after the app closes
 * @returns {Promise<object|null|'redirect'>} the student, null if they backed
 *   out, or 'redirect' when the page is about to leave for Google's sign-in
 */
export async function signInWithGoogle(stay) {
  await setPersistence(auth, stay ? browserLocalPersistence : browserSessionPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    return toStudent(result.user);
  } catch (error) {
    const code = error?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return null;
    }
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      // Leaves the page; finishRedirect() picks it up when they come back.
      await signInWithRedirect(auth, provider);
      return 'redirect';
    }
    throw error;
  }
}

export async function signOut() {
  await firebaseSignOut(auth);
}

// ---------- the student's own record ----------

export async function loadPractice(uid) {
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    updatedAt: data.updatedAt || 0,
    progress: parse(data.progress),
    questions: parse(data.questions),
    session: parse(data.session),
  };
}

export async function savePractice(student, practice) {
  const totals = summarise(practice.progress || {});
  await setDoc(
    doc(db, COLLECTION, student.uid),
    {
      name: student.name,
      email: student.email,
      photo: student.photo,
      answered: totals.answered,
      sessions: totals.sessions,
      questionCount: (practice.questions || []).length,
      lastActive: serverTimestamp(),
      updatedAt: practice.updatedAt || Date.now(),
      progress: JSON.stringify(practice.progress || {}),
      questions: JSON.stringify(practice.questions || []),
      session: JSON.stringify(practice.session ?? null),
    },
    { merge: true }
  );
}

// ---------- the teacher's view ----------

export async function listStudents() {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('lastActive', 'desc')));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      name: data.name || '',
      email: data.email || '',
      photo: data.photo || '',
      answered: data.answered || 0,
      sessions: data.sessions || 0,
      questionCount: data.questionCount || 0,
      lastActive: data.lastActive?.toDate?.() || null,
    };
  });
}

export async function getStudent(uid) {
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    name: data.name || '',
    email: data.email || '',
    photo: data.photo || '',
    lastActive: data.lastActive?.toDate?.() || null,
    progress: parse(data.progress) || {},
    questions: parse(data.questions) || [],
  };
}

function parse(text) {
  if (typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
