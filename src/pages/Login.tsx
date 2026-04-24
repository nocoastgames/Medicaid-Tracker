import { loginWithGoogle } from '../services/firebase';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export function Login() {
    const { user, role, loading } = useAuth();
    const navigate = useNavigate();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (!loading && user) {
             if (role === 'admin' || role === 'teacher') navigate('/teacher');
             else if (role === 'pending') navigate('/pending');
             else if (role === 'pca') navigate('/');
             else if (role === null) {
                 // Do not navigate, stay on login page if role is null (e.g. error fetching role)
                 // You might want to show the error state in the UI.
                 if (isLoggingIn) {
                     setIsLoggingIn(false);
                 }
             }
        }
    }, [user, role, loading, navigate]);

    const handleLogin = async () => {
        if (isLoggingIn) return;
        setIsLoggingIn(true);
        setErrorMsg("");

        try {
            await loginWithGoogle();
        } catch (e: any) {
            console.error("Login failed", e);
            if (e.code === 'auth/popup-blocked') {
                setErrorMsg("Popup blocked by browser. Please allow popups for this site and try again, or click 'Open App' in the top right to open in a new tab.");
            } else if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
                setErrorMsg("Login popup was closed before finishing.");
            } else {
                setErrorMsg("An error occurred during login. Please try again. " + (e.message || ""));
            }
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Medicaid Time Tracker</CardTitle>
                    <CardDescription>Login to manage or record service times</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200">
                            {errorMsg}
                        </div>
                    )}
                    <Button onClick={handleLogin} disabled={isLoggingIn || loading} size="lg" className="w-full">
                        {isLoggingIn ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Please wait...
                            </>
                        ) : (
                            "Sign in with Google"
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
