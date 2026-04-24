import { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, logout } from '../services/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { handleFirestoreError } from '../lib/firestore-errors';
import { useAuth } from '../contexts/AuthContext';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';

export function AdminDashboard() {
    const [users, setUsers] = useState<any[]>([]);
    const { user } = useAuth();
    
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const q = query(collection(db, 'users'));
            const snap = await getDocs(q);
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            handleFirestoreError(e, 'list', 'users', user);
        }
    };

    const toggleRole = async (targetUser: any) => {
        if (!user) return;
        try {
            const newRole = targetUser.role === 'admin' ? 'teacher' : 'admin';
            // We need custom role update? Wait, Admin can update everything.
            await updateDoc(doc(db, 'users', targetUser.id), {
                role: newRole,
                updatedAt: Date.now()
            });
            loadUsers();
        } catch (e) {
            handleFirestoreError(e, 'update', `users/${targetUser.id}`, user);
        }
    };

    const deleteUser = async (id: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'users', id));
            loadUsers();
        } catch (e) {
            handleFirestoreError(e, 'delete', `users/${id}`, user);
        }
    };

    return (
        <div className="flex flex-col h-full flex-grow overflow-hidden bg-slate-50">
            <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center space-x-4">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Admin Dashboard</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">System Management</p>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <button onClick={logout} className="flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 hover:bg-white transition-colors">
                        <span className="text-sm font-medium text-slate-700">Sign Out</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-auto p-6 lg:p-10 w-full mx-auto max-w-6xl">
            
            <Card>
                <CardHeader>
                    <CardTitle>Manage Users</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Display Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>{u.displayName}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {u.role?.toUpperCase()}
                                        </span>
                                    </TableCell>
                                    <TableCell className="space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => toggleRole(u)}>Toggle Role</Button>
                                        <Button variant="destructive" size="sm" onClick={() => deleteUser(u.id)}>Delete</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-gray-500 py-4">No users found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            </main>
        </div>
    );
}
