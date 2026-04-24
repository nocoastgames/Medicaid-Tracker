import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'teacher' | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'teacher' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
                setRole(userDoc.data().role);
            } else {
                // Determine if this is the first user (bootstrap). We allow the first user to become admin if there are no users? No, Firestore rules block list if we're not admin.
                // For this demo, let's just make the user a 'teacher' by default, and provide a way in the UI or Firebase Console to upgrade to admin.
                // Actually, our rules say "allow first user to be created if auth matches" basically `(request.auth.uid == userId) || isAdmin()`.
                // Let's create the user as a 'teacher'.
                const newUser = {
                    email: currentUser.email || '',
                    displayName: currentUser.displayName || '',
                    role: 'teacher',
                    createdAt: Date.now()
                };
                await setDoc(doc(db, 'users', currentUser.uid), newUser);
                setRole('teacher');
            }
        } catch (e) {
            console.error("Error fetching user role", e);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
