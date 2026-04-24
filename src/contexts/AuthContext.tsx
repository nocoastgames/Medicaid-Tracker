import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'teacher' | 'pca' | 'pending' | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'teacher' | 'pca' | 'pending' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.isAnonymous) {
            setRole('pca');
            setLoading(false);
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const isAdminEmail = currentUser.email === 'renegml@nv.ccsd.net' || currentUser.email === 'mrenegar@gmail.com';

            if (userDoc.exists()) {
                const data = userDoc.data();
                if (isAdminEmail && data.role !== 'admin') {
                    try {
                        await updateDoc(doc(db, 'users', currentUser.uid), { role: 'admin' });
                        setRole('admin');
                    } catch (updateErr) {
                        console.error("Error setting admin role initially", updateErr);
                        setRole('pending'); // fallback so they don't get stuck
                    }
                } else {
                    setRole(data.role);
                }
            } else {
                // If it's the requested admin emails, become admin. Otherwise become pending.
                const initialRole = isAdminEmail ? 'admin' : 'pending';
                
                const newUser = {
                    email: currentUser.email || '',
                    displayName: currentUser.displayName || '',
                    role: initialRole,
                    createdAt: Date.now()
                };
                try {
                    await setDoc(doc(db, 'users', currentUser.uid), newUser);
                    setRole(initialRole);
                } catch (setErr) {
                    console.error("Error creating new user doc", setErr);
                    setRole('pending'); // fallback
                }
            }
        } catch (e) {
            console.error("Error fetching user role", e);
            setRole('pending');
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
