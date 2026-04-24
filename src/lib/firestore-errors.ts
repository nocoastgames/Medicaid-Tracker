export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null, user: any) {
    if (error.message && error.message.includes("Missing or insufficient permissions")) {
        const errorInfo: FirestoreErrorInfo = {
            error: error.message,
            operationType,
            path,
            authInfo: user ? {
                userId: user.uid,
                email: user.email,
                emailVerified: user.emailVerified,
                isAnonymous: user.isAnonymous,
                providerInfo: user.providerData
            } : {
                 userId: 'unauthenticated',
                 email: '',
                 emailVerified: false,
                 isAnonymous: false,
                 providerInfo: []
            }
        };
        console.error("Firestore Error:", JSON.stringify(errorInfo, null, 2));
    } else {
        console.error("Firestore Error:", error);
    }
}
