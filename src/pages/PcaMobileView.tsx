import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs, getDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const SERVICES = [
    "Toileting/Diapering",
    "Eating/Meal Prep",
    "Mobility/Ambulation",
    "Positioning/Transferring",
    "Dressing"
];

export function PcaMobileView() {
    const { classroomId, token, pcaId } = useParams();
    const [status, setStatus] = useState<'initializing' | 'invalid' | 'ready'>('initializing');
    const [errorMsg, setErrorMsg] = useState('');
    const [authWaitMsg, setAuthWaitMsg] = useState('');
    
    const [classroomName, setClassroomName] = useState('Loading...');
    const [pcas, setPcas] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [activeLogs, setActiveLogs] = useState<any[]>([]);

    const [selectedPca, setSelectedPca] = useState<any>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    useEffect(() => {
        setupSession();
    }, [classroomId, token]);

    const setupSession = async () => {
        if (!classroomId || !token) return;
        try {
            // Sign in anonymously
            const userCred = await signInAnonymously(auth);
            const uid = userCred.user.uid;

            // Register session token to get access to classroom data based on rules
            await setDoc(doc(db, 'classrooms', classroomId, 'pcaSessions', uid), {
                token: token,
                createdAt: Date.now()
            });

            // If we succeed writing session, token must be valid (per rules). We can now read data.
            await loadClassroom();
            await loadPcas();
            await loadStudents();
            await loadActiveLogs();
            setStatus('ready');

        } catch (error: any) {
            console.error('Error setting up PCA session:', error);
            if (error.code === 'auth/operation-not-allowed') {
                setErrorMsg('Anonymous authentication is not enabled in this app\'s Firebase project. The developer must go to the Firebase Console -> Authentication -> Sign-in Method -> add Anonymous and enable it.');
                setAuthWaitMsg('Waiting for developer or teacher to fix...');
            } else if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                setErrorMsg('Invalid or expired QR code link ' + error.message);
            } else {
                setErrorMsg('Failed to connect to the classroom session. details: ' + (error.message || JSON.stringify(error)));
            }
            setStatus('invalid');
        }
    };

    const loadClassroom = async () => {
        if (!classroomId) return;
        const snap = await getDoc(doc(db, 'classrooms', classroomId));
        if (snap.exists()) setClassroomName(snap.data().name);
    };

    const loadPcas = async () => {
        if (!classroomId) return;
        const q = query(collection(db, 'pcas'), where('classroomId', '==', classroomId));
        const snap = await getDocs(q);
        const pcasList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPcas(pcasList);
        if (pcaId) {
             const found = pcasList.find(p => p.id === pcaId);
             if (found) setSelectedPca(found);
        }
    };

    const loadStudents = async () => {
        if (!classroomId) return;
        const q = query(collection(db, 'students'), where('classroomId', '==', classroomId));
        const snap = await getDocs(q);
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const loadActiveLogs = async () => {
        if (!classroomId) return;
        const today = format(new Date(), 'yyyy-MM-dd');
        const q = query(collection(db, 'serviceLogs'), where('classroomId', '==', classroomId), where('date', '==', today));
        const snap = await getDocs(q);
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter((l:any) => !l.endTime);
        setActiveLogs(logs);
    };

    const startService = async (service: string) => {
        if (!selectedPca || !selectedStudent || !classroomId) return;
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const newRef = doc(collection(db, 'serviceLogs'));
            const payload = {
                classroomId,
                studentId: selectedStudent.id,
                pcaId: selectedPca.id,
                serviceType: service,
                startTime: Date.now(),
                date: today,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            await setDoc(newRef, payload);
            await loadActiveLogs();
        } catch (e: any) {
            console.error('Failed to start service: ', e);
        }
    };

    const stopService = async (logId: string) => {
        try {
            await updateDoc(doc(db, 'serviceLogs', logId), {
                endTime: Date.now(),
                updatedAt: Date.now()
            });
            await loadActiveLogs();
        } catch (e: any) {
            console.error('Failed to stop service: ', e);
        }
    };

    if (status === 'initializing') {
        return <div className="p-8 text-center"><p className="text-xl">Connecting to classroom...</p></div>;
    }

    if (status === 'invalid') {
        return (
            <div className="p-8 text-center max-w-md mx-auto mt-10">
                <Card className="border-red-200">
                    <CardHeader className="bg-red-50 text-red-800 rounded-t-xl">
                        <CardTitle>Session Error</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <p className="text-slate-700">{errorMsg}</p>
                        {authWaitMsg && <p className="text-yellow-600 font-bold mt-4 animate-pulse">{authWaitMsg}</p>}
                        {!authWaitMsg && <p className="text-sm text-slate-500 mt-4">Please ask the teacher to show you the QR code again.</p>}
                    </CardContent>
                </Card>
            </div>
        );
    }

    const uncompletedServices = SERVICES.filter(s => 
        !activeLogs.some((l:any) => l.pcaId === selectedPca?.id && l.studentId === selectedStudent?.id && l.serviceType === s)
    );
    const currentActiveForSelection = activeLogs.filter((l:any) => l.pcaId === selectedPca?.id && l.studentId === selectedStudent?.id);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex flex-col items-center">
                <h1 className="text-xl font-bold text-slate-800">{classroomName}</h1>
                <p className="text-xs font-bold text-slate-400 tracking-wider">PCA LOGGING VIEW</p>
            </header>

            <main className="flex-grow p-4 max-w-lg mx-auto w-full">
                {!selectedPca && (
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                        <h2 className="text-lg font-bold text-slate-700 mb-4">Tap Your Name</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {pcas.map(p => (
                                <button key={p.id} onClick={() => setSelectedPca(p)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 active:bg-blue-50 transition-colors flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl mb-2">{p.name.substring(0,2).toUpperCase()}</div>
                                    <span className="font-medium text-slate-700">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {selectedPca && !selectedStudent && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setSelectedPca(null)} className="text-blue-600 font-bold hover:underline">← Back</button>
                            <span className="text-slate-400">/</span>
                            <span className="font-bold text-slate-700">{selectedPca.name}</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-700 mb-4">Select Student</h2>
                        <div className="space-y-2">
                            {students.map(s => (
                                <button key={s.id} onClick={() => setSelectedStudent(s)} className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 active:bg-blue-50 transition-colors font-medium text-slate-700">
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {selectedPca && selectedStudent && (
                    <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
                        <div className="flex items-center gap-2 mb-6">
                            <button onClick={() => setSelectedStudent(null)} className="text-blue-600 font-bold hover:underline">← Back</button>
                            <span className="text-slate-400">/</span>
                            <span className="font-bold text-slate-700">{selectedPca.name}</span>
                        </div>
                        
                        <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg">
                            <p className="text-sm font-medium text-slate-400 mb-1">Logging services for</p>
                            <p className="text-2xl font-bold">{selectedStudent.name}</p>
                        </div>

                        {currentActiveForSelection.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-amber-600 uppercase mb-3">Currently Active</h3>
                                <div className="space-y-3">
                                    {currentActiveForSelection.map((log:any) => (
                                        <Card key={log.id} className="border-amber-200 bg-amber-50 shadow-none border-2 border-dashed">
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-slate-800">{log.serviceType}</p>
                                                    <p className="text-sm text-slate-500">Started at {format(log.startTime, 'h:mm a')}</p>
                                                </div>
                                                <Button onClick={() => stopService(log.id)} className="bg-red-500 hover:bg-red-600 font-bold">Stop</Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 mt-6">Start New Service</h3>
                            <div className="space-y-2">
                                {uncompletedServices.map(service => (
                                    <button 
                                        key={service} 
                                        onClick={() => startService(service)}
                                        className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:bg-blue-50 hover:border-blue-400 transition-colors font-bold text-slate-700 flex justify-between items-center"
                                    >
                                        {service}
                                        <span className="text-blue-500">→</span>
                                    </button>
                                ))}
                                {uncompletedServices.length === 0 && (
                                    <p className="text-slate-500 italic text-sm">All services are currently active for this student.</p>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
