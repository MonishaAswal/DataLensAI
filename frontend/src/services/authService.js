import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export const firebaseAuthService = {
  /**
   * Register a new user with email and password, and create a user profile in Firestore
   */
  signup: async (name, email, password) => {
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Firebase Error:", error.message);
      throw error;
    }
    
    const user = userCredential.user;
    
    // Save additional profile details in Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        createdAt: new Date().toISOString()
      });
      console.log('[authService] Firestore user profile created successfully');
    } catch (firestoreError) {
      console.warn('[authService] Firestore profile write failed, but user created in Auth:', firestoreError.message);
    }
    
    return user;
  },

  /**
   * Log in an existing user
   */
  login: async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  /**
   * Log out the current user
   */
  logout: async () => {
    await signOut(auth);
  },

  /**
   * Trigger a password reset email
   */
  resetPassword: async (email) => {
    await sendPasswordResetEmail(auth, email);
  }
};

export default firebaseAuthService;
