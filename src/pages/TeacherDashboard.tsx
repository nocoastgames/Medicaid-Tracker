import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, logout } from '../services/firebase';
import { handleFirestoreError } from '../lib/firestore-errors';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { Label } from '../components/ui/Label';

export function TeacherDashboard() {
    const { user } = useAuth();
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [newClassName, setNewClassName] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (user) loadClassrooms();
    }, [user]);

    const loadClassrooms = async () => {
        if (!user) return;
        try {
            const q = query(collection(db, 'classrooms'), where('teacherId', '==', user.uid));
            const snap = await getDocs(q);
            setClassrooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            handleFirestoreError(e, 'list', 'classrooms', user);
        }
    };

    const addClassroom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newClassName.trim()) return;
        
        const id = crypto.randomUUID();
        try {
            await setDoc(doc(db, 'classrooms', id), {
                name: newClassName.trim(),
                teacherId: user.uid,
                createdAt: Date.now()
            });
            setNewClassName('');
            loadClassrooms();
        } catch (e) {
            handleFirestoreError(e, 'create', 'classrooms', user);
        }
    };

    const deleteClassroom = async (id: string) => {
        if (!user || !confirm("Are you sure? This doesn't auto-delete students/PCAs inside it in this demo.")) return;
        try {
            await deleteDoc(doc(db, 'classrooms', id));
            loadClassrooms();
        } catch (e) {
            handleFirestoreError(e, 'delete', `classrooms/${id}`, user);
        }
    }

    return (
        <div className="flex flex-col h-full flex-grow overflow-hidden bg-slate-50">
            <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center space-x-4">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Teacher Dashboard</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Manage Classrooms</p>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <button onClick={logout} className="flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 hover:bg-white transition-colors">
                        <span className="text-sm font-medium text-slate-700">Sign Out</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-auto p-6 lg:p-10 w-full mx-auto max-w-6xl">
                <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>My Classrooms</CardTitle>
                        <CardDescription>Select a classroom to launch the PCA tracking view, or manage students inside it.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {classrooms.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-4 border rounded shadow-sm hover:border-blue-300">
                                <span className="font-semibold text-lg">{c.name}</span>
                                <div className="space-x-2">
                                    <Button variant="destructive" size="sm" onClick={() => deleteClassroom(c.id)}>Remove</Button>
                                    <Button onClick={() => navigate(`/classroom/${c.id}`)}>Enter / Manage</Button>
                                </div>
                            </div>
                        ))}
                        {classrooms.length === 0 && <p className="text-gray-500">No classrooms yet.</p>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Create Classroom</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={addClassroom} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Classroom Name</Label>
                                <Input 
                                    id="name" 
                                    value={newClassName} 
                                    onChange={(e) => setNewClassName(e.target.value)} 
                                    placeholder="e.g. Room 101"
                                />
                            </div>
                            <Button type="submit" disabled={!newClassName.trim()}>Create Classroom</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            </main>
        </div>
    );
}
