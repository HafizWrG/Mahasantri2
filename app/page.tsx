'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Ensure this file exists
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, CheckCircle, AlertCircle, Loader2, 
  Plus, Trash2, LogOut, ExternalLink, KeyRound, 
  Edit3, Save, BookOpen, Printer, ChevronLeft, 
  ChevronRight, LayoutGrid, LayoutList, Image as ImageIcon, 
  UserCog, GraduationCap, TrendingUp, Users, FileText, 
  Eye, EyeOff, Bot, Send
} from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ==========================================
// 1. UTILS & MODERN UI COMPONENTS
// ==========================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// -- AI Handler (Mock/Placeholder) --
const queryAgentation = async (message: string, contextData: any) => {
  try {
    // In a real app, do not expose API keys on the client side
    const response = await fetch('https://api.agentation.dev/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AGENTATION_KEY || 'demo-key'}`
      },
      body: JSON.stringify({
        agent_id: "student-advisor-v1",
        messages: [
          { role: "system", content: `Context: ${JSON.stringify(contextData)}` },
          { role: "user", content: message }
        ]
      })
    });
    if (!response.ok) throw new Error("API Error");
    const data = await response.json();
    return data.response;
  } catch (error) {
    return "Maaf, asisten sedang offline. Saya dapat membantu menghitung nilai jika data tersedia.";
  }
};

// -- Design System Components --

const Card = ({ children, className, onClick, hover = false }: any) => (
  <div 
    onClick={onClick}
    className={cn(
      "bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-200",
      hover && "hover:shadow-md hover:border-indigo-200 cursor-pointer",
      className
    )}
  >
    {children}
  </div>
);

const Button = ({ children, variant = "primary", size = "md", className, isLoading, ...props }: any) => {
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900",
    danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
  };
  const sizes: any = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", icon: "h-10 w-10 p-0 flex items-center justify-center" };
  
  return (
    <button 
      className={cn("inline-flex items-center justify-center rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none", variants[variant], sizes[size], className)}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
      {children}
    </button>
  );
};

const Input = ({ label, className, ...props }: any) => (
  <div className="w-full space-y-1.5">
    {label && <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>}
    <input 
      className={cn(
        "flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all",
        className
      )} 
      {...props} 
    />
  </div>
);

const Badge = ({ children, color = "gray", className }: any) => {
  const colors: any = {
    gray: "bg-gray-100 text-gray-600 border-gray-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200"
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide", colors[color], className)}>
      {children}
    </span>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <Card className="p-5 flex items-center justify-between">
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
      <Icon className="w-5 h-5 text-white" />
    </div>
  </Card>
);

const Toast = ({ message, type, onClose }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 10, scale: 0.95 }} 
    animate={{ opacity: 1, y: 0, scale: 1 }} 
    exit={{ opacity: 0, y: 10, scale: 0.95 }}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl z-[200] min-w-[300px]",
      type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-white border-rose-200 text-rose-700'
    )}
  >
    {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
    <span className="text-sm font-semibold">{message}</span>
    <button onClick={onClose} className="ml-auto opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
  </motion.div>
);

// ==========================================
// 2. MAIN APPLICATION
// ==========================================

export default function StudentSystem() {
  // --- STATE ---
  const [loginMode, setLoginMode] = useState<'admin' | 'student'>('admin');
  const [loginForm, setLoginForm] = useState({ email: "", password: "", nim: "" });
  const [user, setUser] = useState<any>(null); 
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('auth'); // 'report' | 'admin' | 'auth'
  
  // Data
  const [students, setStudents] = useState<any[]>([]);
  const [toasts, setToasts] = useState<any[]>([]);

  // View States
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0); 
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingGrades, setIsEditingGrades] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<any>({});
  
  // Admin Specific
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});

  // AI Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{role:string, content:string}[]>([
      {role:'ai', content:'Halo! Ada yang bisa saya bantu?'}
  ]);

  // --- UTILS ---
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const fetchAllData = async () => {
    try {
      // Note: Foreign Keys must exist in Supabase for this nesting to work
      const { data: stud, error } = await supabase.from('students')
        .select(`
          *,
          semesters ( *, subjects ( * ) )
        `)
        .order('id', { ascending: true });

      if (error) throw error;

      if (stud) {
        const sorted = stud.map((student: any) => ({
          ...student,
          semesters: student.semesters?.sort((a: any, b: any) => a.id - b.id).map((sem: any) => ({
            ...sem,
            subjects: sem.subjects?.sort((a: any, b: any) => a.id - b.id)
          }))
        }));
        setStudents(sorted);
      }
    } catch (err: any) {
      console.error("Data fetch error:", err);
      // Only show error if we are logged in
      if(user) showToast("Gagal memuat data: " + err.message, "error");
    }
  };

  // --- SESSION & AUTH EFFECT ---
  useEffect(() => {
    // 1. Check for Student Local Storage Session
    const storedStudent = localStorage.getItem('studentSession');
    if (storedStudent) {
        const parsedUser = JSON.parse(storedStudent);
        setUser(parsedUser);
        setCurrentPage('report');
        fetchAllData();
    }

    // 2. Check for Supabase Admin Session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
          setUser({ role: 'Admin', email: session.user.email });
          setCurrentPage('admin');
          fetchAllData();
      } else if (!localStorage.getItem('studentSession')) {
          // Only redirect to auth if no student session exists
          setUser(null);
          setCurrentPage('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update current student index when data loads or user logs in
  useEffect(() => {
     if (user?.role === 'Student' && students.length > 0) {
        const idx = students.findIndex(s => s.id === user.id);
        if(idx !== -1) setCurrentStudentIndex(idx);
     }
  }, [students, user]);

  // --- CALCULATION LOGIC (UT FORMULA) ---
  const calculateStats = (scores: any) => {
    const dKeys = ['d1','d2','d3','d4','d5','d6','d7','d8'];
    const tKeys = ['t1','t2','t3'];
    
    const dScores = dKeys.map(k => Number(scores[k])).filter(n => !isNaN(n) && n > 0);
    const tScores = tKeys.map(k => Number(scores[k])).filter(n => !isNaN(n) && n > 0);
    const uasScore = Number(scores.uas) || 0;
    
    const allTaskScores = [...dScores, ...tScores];
    const tutonAvg = allTaskScores.length > 0 ? allTaskScores.reduce((a, b) => a + b, 0) / allTaskScores.length : 0;
    
    // UT Rule: If UAS < 30, Tuton is ignored.
    let finalScore = 0;
    if (uasScore < 30) {
        finalScore = uasScore;
    } else {
        finalScore = (0.3 * tutonAvg) + (0.7 * uasScore);
    }
    
    let grade = "E";
    if (finalScore >= 80) grade = "A";
    else if (finalScore >= 70) grade = "B";
    else if (finalScore >= 60) grade = "C";
    else if (finalScore >= 50) grade = "D";

    return { finalScore: finalScore.toFixed(2), grade };
  };

  const calculateIPS = (subjects: any[]) => {
    if (!subjects?.length) return "0.00";
    let totalSKS = 0, totalPoints = 0;
    subjects.forEach(sub => {
      const { grade } = calculateStats(sub);
      const points = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 0 }[grade] || 0;
      const sks = Number(sub.sks) || 0;
      if (sks > 0) { totalSKS += sks; totalPoints += points * sks; }
    });
    return totalSKS === 0 ? "0.00" : (totalPoints / totalSKS).toFixed(2);
  };

  // --- CRUD ACTIONS ---
  const handleAddStudent = async () => {
    setLoading(true);
    const { error } = await supabase.from('students').insert([{ name: "Mahasantri Baru", nim: "NIM-" + Date.now(), prodi: "PBA", password: "123" }]);
    if (error) showToast("Gagal tambah: " + error.message, "error");
    else { await fetchAllData(); showToast("Mahasantri ditambahkan", "success"); }
    setLoading(false);
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm("Hapus data permanen?")) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) { await fetchAllData(); showToast("Terhapus", "success"); }
    else showToast("Gagal menghapus", "error");
  };

  const handleUpdateStudent = async (id: number, field: string, value: string) => {
    // Optimistic Update
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    await supabase.from('students').update({ [field]: value }).eq('id', id);
  };

  const saveProfile = async () => {
    setLoading(true);
    const { error } = await supabase.from('students').update({
       name: editProfileForm.name,
       nim: editProfileForm.nim,
       bio: editProfileForm.bio,
       avatar_url: editProfileForm.avatar_url,
       dnu_url: editProfileForm.dnu_url,
       ktm_url: editProfileForm.ktm_url,
       ktpu_url: editProfileForm.ktpu_url,
       password: editProfileForm.password
    }).eq('id', editProfileForm.id);
    
    if (error) showToast("Gagal update profil", "error");
    else { await fetchAllData(); setIsEditingProfile(false); showToast("Profil diperbarui", "success"); }
    setLoading(false);
  };

  const handleAddSemester = async (studentId: number) => {
    await supabase.from('semesters').insert([{ student_id: studentId, name: "Semester Baru" }]);
    fetchAllData();
  };
  const handleDeleteSemester = async (id: number) => {
    if(confirm("Hapus semester?")) { await supabase.from('semesters').delete().eq('id', id); fetchAllData(); }
  };
  const handleAddSubject = async (semesterId: number) => {
    await supabase.from('subjects').insert([{ semester_id: semesterId, name: "Matkul Baru", sks: 3 }]);
    fetchAllData();
  };
  const handleDeleteSubject = async (id: number) => {
    if(confirm("Hapus matkul?")) { await supabase.from('subjects').delete().eq('id', id); fetchAllData(); }
  };
  const handleUpdateSubject = async (id: number, field: string, value: any) => {
    await supabase.from('subjects').update({ [field]: value }).eq('id', id);
  };

  // --- AUTH HANDLERS ---
  const handleLogout = async () => {
    if (user?.role === 'Admin') {
        await supabase.auth.signOut();
    } else {
        localStorage.removeItem('studentSession');
    }
    setUser(null);
    setCurrentPage('auth');
    setStudents([]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        if (loginMode === 'admin') {
          // Admin Login (Supabase Auth)
          const { error } = await supabase.auth.signInWithPassword({ 
              email: loginForm.email, 
              password: loginForm.password 
          });
          if (error) throw error;
          
          showToast("Login Admin Berhasil", "success");
          // useEffect will handle the state update
          
        } else {
          // Student Login (Custom Table Check)
          // Note: In production, never store/query passwords in plain text. Use Supabase Auth for students too if possible.
          const { data, error } = await supabase.from('students')
              .select('*')
              .eq('nim', loginForm.nim)
              .eq('password', loginForm.password) // Plain text check (as per request logic)
              .single();
          
          if (error || !data) {
              throw new Error("NIM atau Password salah.");
          }

          const studentUser = { role: 'Student', id: data.id, name: data.name };
          localStorage.setItem('studentSession', JSON.stringify(studentUser)); // Persist student session
          setUser(studentUser);
          setCurrentPage('report');
          setLoginForm({ email: '', password: '', nim: '' }); // Clear form
          
          // Set initial view
          await fetchAllData();
          setViewMode('carousel');
          showToast(`Ahlan, ${data.name}`, "success");
        }
    } catch (err: any) {
        showToast(err.message || "Login Gagal", "error");
    } finally {
        setLoading(false);
    }
  };

  // --- RENDERERS ---

  // 1. ADMIN DASHBOARD
  const renderAdminDashboard = () => {
    const totalStudents = students.length;
    const totalSemesters = students.reduce((acc, curr) => acc + (curr.semesters?.length || 0), 0);
    // Simple mock GPA average logic
    const avgGPA = (students.reduce((acc, s) => {
        if(!s.semesters?.length) return acc;
        const lastSem = s.semesters[s.semesters.length - 1];
        return acc + parseFloat(calculateIPS(lastSem.subjects));
    }, 0) / (totalStudents || 1)).toFixed(2);

    const filtered = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.nim.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Overview dan manajemen data akademik</p>
            </div>
            <Button onClick={handleAddStudent} isLoading={loading}><Plus className="w-4 h-4 mr-2"/> Mahasantri Baru</Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Mahasantri" value={totalStudents} icon={Users} color="bg-indigo-600" />
            <StatCard label="Total Semester" value={totalSemesters} icon={FileText} color="bg-emerald-600" />
            <StatCard label="Rata-rata IPK (Est)" value={avgGPA} icon={TrendingUp} color="bg-amber-600" />
        </div>

        {/* Main Data Table */}
        <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                    <input 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-indigo-500 outline-none transition-all"
                        placeholder="Cari nama atau NIM..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Mahasantri</th>
                            <th className="px-6 py-4">Prodi</th>
                            <th className="px-6 py-4">Password</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map((s) => (
                            <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                            {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">{s.name.substring(0,2)}</div>}
                                        </div>
                                        <div>
                                            <input 
                                                className="block font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-full transition-colors"
                                                defaultValue={s.name}
                                                onBlur={(e) => handleUpdateStudent(s.id, 'name', e.target.value)}
                                            />
                                            <input 
                                                className="block text-xs text-gray-500 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-full mt-0.5"
                                                defaultValue={s.nim}
                                                onBlur={(e) => handleUpdateStudent(s.id, 'nim', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    <input 
                                        className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-20"
                                        defaultValue={s.prodi}
                                        onBlur={(e) => handleUpdateStudent(s.id, 'prodi', e.target.value)}
                                    />
                                </td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type={showPasswordMap[s.id] ? "text" : "password"}
                                            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-24"
                                            defaultValue={s.password}
                                            onBlur={(e) => handleUpdateStudent(s.id, 'password', e.target.value)}
                                        />
                                        <button onClick={() => setShowPasswordMap(p => ({...p, [s.id]: !p[s.id]}))} className="text-gray-400 hover:text-indigo-600">
                                            {showPasswordMap[s.id] ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => { setCurrentStudentIndex(students.findIndex(st => st.id === s.id)); setCurrentPage('report'); setViewMode('carousel'); }}>
                                            <BookOpen className="w-3.5 h-3.5 mr-1"/> Detail
                                        </Button>
                                        <button onClick={() => handleDeleteStudent(s.id)} className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Tidak ada data ditemukan.</div>}
            </div>
        </Card>
      </div>
    );
  };

  // 2. PUBLIC/DETAIL REPORT PAGE
  const renderReport = () => {
    if (!students.length) return <div className="min-h-screen flex items-center justify-center text-gray-400"><Loader2 className="animate-spin w-8 h-8 mr-2"/> Memuat Data...</div>;
    
    // Safety check for index
    const safeIndex = (currentStudentIndex >= 0 && currentStudentIndex < students.length) ? currentStudentIndex : 0;
    const student = viewMode === 'grid' ? null : students[safeIndex];
    
    // Permission check
    const canEdit = user?.role === 'Admin' || (user?.role === 'Student' && user.id === student?.id);

    // Filter logic for grid view
    const filteredGrid = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.nim.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 print:hidden">
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                    <input 
                        placeholder="Cari Mahasantri..." 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-indigo-500 outline-none shadow-sm"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); if(viewMode!=='grid') setViewMode('grid'); }}
                    />
                </div>
                {/* Only Admin or if in grid mode can switch views freely */}
                <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    <button onClick={() => setViewMode('carousel')} className={cn("p-2 rounded-md transition-all", viewMode === 'carousel' ? "bg-gray-100 text-indigo-600" : "text-gray-400 hover:text-gray-600")}><LayoutList className="w-5 h-5"/></button>
                    <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-md transition-all", viewMode === 'grid' ? "bg-gray-100 text-indigo-600" : "text-gray-400 hover:text-gray-600")}><LayoutGrid className="w-5 h-5"/></button>
                </div>
            </div>
            {viewMode === 'carousel' && (
                <div className="flex items-center gap-4">
                     <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm p-1">
                        <button onClick={() => setCurrentStudentIndex(prev => (prev - 1 + students.length) % students.length)} className="p-2 hover:bg-gray-50 rounded"><ChevronLeft className="w-4 h-4 text-gray-600"/></button>
                        <span className="text-xs font-bold text-gray-500 w-16 text-center">{safeIndex + 1} / {students.length}</span>
                        <button onClick={() => setCurrentStudentIndex(prev => (prev + 1) % students.length)} className="p-2 hover:bg-gray-50 rounded"><ChevronRight className="w-4 h-4 text-gray-600"/></button>
                     </div>
                     <Button variant="secondary" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2"/> Cetak</Button>
                </div>
            )}
        </div>

        {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredGrid.map((s, idx) => (
                    <Card key={s.id} onClick={() => { setCurrentStudentIndex(students.findIndex(st => st.id === s.id)); setViewMode('carousel'); }} className="p-4 hover:border-indigo-400 cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-full border border-gray-200 overflow-hidden flex-shrink-0">
                                {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">{s.name.substring(0,2)}</div>}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{s.name}</h4>
                                <p className="text-xs text-gray-500">{s.nim}</p>
                                <Badge color="indigo" className="mt-1">{s.prodi}</Badge>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Profile Side */}
                <div className="lg:col-span-3 space-y-6 print:w-full print:mb-6">
                    <Card className="p-6 text-center relative">
                        {canEdit && <button onClick={() => { setEditProfileForm({...student}); setIsEditingProfile(true); }} className="absolute top-3 right-3 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors print:hidden"><UserCog className="w-4 h-4"/></button>}
                        <div className="w-32 h-32 mx-auto rounded-full p-1 border-2 border-dashed border-gray-200 mb-4">
                             <div className="w-full h-full rounded-full bg-gray-50 overflow-hidden">
                                 {student?.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover" onError={(e:any) => e.target.src=`https://api.dicebear.com/7.x/initials/svg?seed=${student?.name}`}/> : <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300 font-bold">{student?.name[0]}</div>}
                             </div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{student?.name}</h2>
                        <p className="text-sm text-gray-500 font-mono mb-2">{student?.nim}</p>
                        <Badge color="emerald">AKTIF</Badge>
                        <p className="mt-4 text-sm text-gray-600 italic border-t border-gray-100 pt-4">"{student?.bio || '-'}"</p>
                    </Card>
                    
                    <Card className="p-0 overflow-hidden print:hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">Dokumen Digital</div>
                        <div className="divide-y divide-gray-100">
                             {[
                                { label: 'Transkrip (DNU)', url: student?.dnu_url },
                                { label: 'Kartu Mahasiswa', url: student?.ktm_url },
                                { label: 'Kartu Ujian', url: student?.ktpu_url },
                             ].map((doc, i) => (
                                 <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50">
                                     <span className="text-sm text-gray-600">{doc.label}</span>
                                     {doc.url ? <a href={doc.url} target="_blank" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">Buka <ExternalLink className="w-3 h-3"/></a> : <span className="text-xs text-gray-300">Kosong</span>}
                                 </div>
                             ))}
                        </div>
                    </Card>
                </div>

                {/* Grades Side */}
                <div className="lg:col-span-9 space-y-6 print:w-full">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm print:hidden">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-600"/> Laporan Akademik</h2>
                        {canEdit && (
                            <Button size="sm" variant={isEditingGrades ? "primary" : "secondary"} onClick={() => setIsEditingGrades(!isEditingGrades)}>
                                {isEditingGrades ? <><Save className="w-3 h-3 mr-2"/> Selesai</> : <><Edit3 className="w-3 h-3 mr-2"/> Edit Nilai</>}
                            </Button>
                        )}
                    </div>
                    
                    <div className="space-y-8">
                         {student?.semesters?.map((sem: any) => (
                             <div key={sem.id} className="break-inside-avoid">
                                 <div className="flex justify-between items-end mb-2 border-b border-gray-200 pb-2">
                                     <div>
                                         <h3 className="font-bold text-gray-800 text-lg">{sem.name}</h3>
                                         <p className="text-xs text-gray-500">IPS: <span className="font-bold text-indigo-600">{calculateIPS(sem.subjects)}</span></p>
                                     </div>
                                     {isEditingGrades && canEdit && <div className="flex gap-2 print:hidden"><button onClick={()=>handleAddSubject(sem.id)} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded">+ Matkul</button><button onClick={()=>handleDeleteSemester(sem.id)} className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded">Hapus Sem</button></div>}
                                 </div>
                                 <div className="overflow-x-auto">
                                     <table className="w-full text-xs text-left">
                                         <thead className="text-gray-400 font-medium border-b border-gray-100">
                                             <tr>
                                                 <th className="py-2 w-1/3">Mata Kuliah</th>
                                                 <th className="py-2 text-center w-10">SKS</th>
                                                 {Array.from({length:8}).map((_,i) => <th key={`d${i}`} className="py-2 text-center w-8 font-normal">D{i+1}</th>)}
                                                 {Array.from({length:3}).map((_,i) => <th key={`t${i}`} className="py-2 text-center w-8 font-normal text-indigo-400">T{i+1}</th>)}
                                                 <th className="py-2 text-center w-12 text-amber-600">UAS</th>
                                                 <th className="py-2 text-center w-12 font-bold text-gray-800">Akhir</th>
                                                 <th className="py-2 text-center w-10">Grade</th>
                                                 {isEditingGrades && canEdit && <th className="w-8 print:hidden"></th>}
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-gray-50">
                                              {sem.subjects?.map((sub: any) => {
                                                  const stats = calculateStats(sub);
                                                  return (
                                                      <tr key={sub.id} className="hover:bg-gray-50/50">
                                                          <td className="py-2 font-medium text-gray-700">
                                                              {isEditingGrades && canEdit ? <input className="w-full bg-transparent border-b border-gray-200 focus:border-indigo-500 outline-none" defaultValue={sub.name} onBlur={(e)=>handleUpdateSubject(sub.id, 'name', e.target.value)}/> : sub.name}
                                                          </td>
                                                          <td className="py-2 text-center">
                                                              {isEditingGrades && canEdit ? <input className="w-full text-center bg-transparent border-b border-gray-200 focus:border-indigo-500 outline-none" defaultValue={sub.sks} onBlur={(e)=>handleUpdateSubject(sub.id, 'sks', e.target.value)}/> : <span className="text-gray-400">{sub.sks}</span>}
                                                          </td>
                                                          {['d1','d2','d3','d4','d5','d6','d7','d8'].map(k => (
                                                              <td key={k} className="py-2 text-center">
                                                                  {isEditingGrades && canEdit ? <input className="w-full text-center bg-gray-50 focus:bg-white border-none rounded text-[10px]" placeholder="-" defaultValue={sub[k]} onBlur={(e)=>handleUpdateSubject(sub.id, k, e.target.value)}/> : <span className={sub[k]?"text-gray-600":"text-gray-200"}>{sub[k]||'-'}</span>}
                                                              </td>
                                                          ))}
                                                          {['t1','t2','t3'].map(k => (
                                                              <td key={k} className="py-2 text-center bg-indigo-50/30">
                                                                  {isEditingGrades && canEdit ? <input className="w-full text-center bg-indigo-50 focus:bg-white border-none rounded text-[10px] text-indigo-700" placeholder="-" defaultValue={sub[k]} onBlur={(e)=>handleUpdateSubject(sub.id, k, e.target.value)}/> : <span className={sub[k]?"text-indigo-700 font-medium":"text-gray-200"}>{sub[k]||'-'}</span>}
                                                              </td>
                                                          ))}
                                                          <td className="py-2 text-center bg-amber-50/30">
                                                              {isEditingGrades && canEdit ? <input className="w-full text-center bg-amber-50 focus:bg-white border-none rounded font-bold text-amber-600" defaultValue={sub.uas} onBlur={(e)=>handleUpdateSubject(sub.id, 'uas', e.target.value)}/> : <span className="text-amber-600 font-bold">{sub.uas||'-'}</span>}
                                                          </td>
                                                          <td className="py-2 text-center font-bold text-gray-900">{stats.finalScore}</td>
                                                          <td className="py-2 text-center">
                                                              <Badge color={stats.grade==='A'?'emerald':stats.grade==='E'?'rose':'gray'}>{stats.grade}</Badge>
                                                          </td>
                                                          {isEditingGrades && canEdit && <td className="text-center print:hidden"><button onClick={()=>handleDeleteSubject(sub.id)} className="text-gray-300 hover:text-rose-500"><Trash2 className="w-3 h-3"/></button></td>}
                                                      </tr>
                                                  )
                                              })}
                                         </tbody>
                                     </table>
                                     {(!sem.subjects || !sem.subjects.length) && <div className="text-center py-4 text-xs text-gray-400 italic">Belum ada mata kuliah.</div>}
                                 </div>
                                 {isEditingGrades && canEdit && <div className="mt-2 text-center print:hidden"><button onClick={()=>handleAddSemester(student.id)} className="text-xs text-indigo-600 font-bold hover:underline">+ Semester Baru</button></div>}
                             </div>
                         ))}
                    </div>
                </div>
            </div>
        )}

        {/* Edit Profile Modal */}
        <AnimatePresence>
            {isEditingProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5 p-4 backdrop-blur-sm">
                    <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900">Edit Profil</h3>
                            <button onClick={()=>setIsEditingProfile(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex gap-4 items-start">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden shrink-0">
                                    {editProfileForm.avatar_url ? <img src={editProfileForm.avatar_url} className="w-full h-full object-cover"/> : <ImageIcon className="w-6 h-6 m-5 text-gray-300"/>}
                                </div>
                                <div className="flex-1">
                                    <Input label="URL Foto Profil" placeholder="https://..." value={editProfileForm.avatar_url||''} onChange={(e:any)=>setEditProfileForm({...editProfileForm, avatar_url:e.target.value})}/>
                                    <p className="text-[10px] text-gray-400 mt-1">Gunakan link langsung ke gambar (Google Drive/Imgur).</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Nama" value={editProfileForm.name} onChange={(e:any)=>setEditProfileForm({...editProfileForm, name:e.target.value})}/>
                                <Input label="NIM" value={editProfileForm.nim} onChange={(e:any)=>setEditProfileForm({...editProfileForm, nim:e.target.value})}/>
                            </div>
                            <Input label="Bio" value={editProfileForm.bio||''} onChange={(e:any)=>setEditProfileForm({...editProfileForm, bio:e.target.value})}/>
                            <Input label="Password" value={editProfileForm.password||''} onChange={(e:any)=>setEditProfileForm({...editProfileForm, password:e.target.value})}/>
                            <div className="pt-2 border-t border-gray-100 space-y-2">
                                <Input label="URL DNU" value={editProfileForm.dnu_url||''} onChange={(e:any)=>setEditProfileForm({...editProfileForm, dnu_url:e.target.value})}/>
                                <Input label="URL KTM" value={editProfileForm.ktm_url||''} onChange={(e:any)=>setEditProfileForm({...editProfileForm, ktm_url:e.target.value})}/>
                                <Input label="URL KTPU" value={editProfileForm.ktpu_url||''} onChange={(e:any)=>setEditProfileForm({...editProfileForm, ktpu_url:e.target.value})}/>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                            <Button variant="ghost" onClick={()=>setIsEditingProfile(false)}>Batal</Button>
                            <Button onClick={saveProfile} isLoading={loading}>Simpan Perubahan</Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      </div>
    );
  };

  // 3. AUTH PAGE
  const renderAuth = () => (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-lg p-8 text-center">
         <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-indigo-200"><KeyRound/></div>
         <h2 className="text-xl font-bold text-gray-900 mb-2">Login Sistem</h2>
         <p className="text-sm text-gray-500 mb-6">Masuk untuk mengakses data akademik.</p>
         
         <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            {['admin', 'student'].map((mode: any) => (
               <button key={mode} onClick={() => setLoginMode(mode)} className={cn("flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-all", loginMode === mode ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>{mode}</button>
            ))}
         </div>
         
         <form onSubmit={handleLogin} className="space-y-4 text-left">
            {loginMode === 'admin' ? (
                <>
                   <Input label="Email" value={loginForm.email} onChange={(e:any)=>setLoginForm({...loginForm, email:e.target.value})}/>
                   <Input label="Password" type="password" value={loginForm.password} onChange={(e:any)=>setLoginForm({...loginForm, password:e.target.value})}/>
                </>
            ) : (
                <>
                   <Input label="NIM" value={loginForm.nim} onChange={(e:any)=>setLoginForm({...loginForm, nim:e.target.value})}/>
                   <Input label="Password" type="password" value={loginForm.password} onChange={(e:any)=>setLoginForm({...loginForm, password:e.target.value})}/>
                </>
            )}
            <Button className="w-full h-11 mt-2" type="submit" isLoading={loading}>Masuk Aplikasi</Button>
         </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 print:hidden">
         <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-black tracking-tight text-xl cursor-pointer" onClick={()=>setCurrentPage(user?.role==='Admin'?'admin':'report')}>
                <div className="bg-indigo-600 text-white p-1.5 rounded-lg"><GraduationCap className="w-5 h-5"/></div>
                <span className="text-gray-900">MAHASANTRI<span className="text-indigo-600">.APP</span></span>
            </div>
            
            <div className="flex items-center gap-2">
                {user ? (
                    <>
                        {user.role === 'Admin' && <button onClick={()=>setCurrentPage('admin')} className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors", currentPage==='admin'?"bg-gray-100 text-indigo-600":"text-gray-500 hover:text-gray-900")}>DASHBOARD</button>}
                        <button onClick={()=>setCurrentPage('report')} className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors", currentPage==='report'?"bg-gray-100 text-indigo-600":"text-gray-500 hover:text-gray-900")}>REPORT</button>
                        <div className="w-px h-6 bg-gray-200 mx-2"></div>
                        <button onClick={handleLogout} className="text-gray-400 hover:text-rose-500 transition-colors"><LogOut className="w-5 h-5"/></button>
                    </>
                ) : (
                    <Button size="sm" onClick={()=>setCurrentPage('auth')}>Login</Button>
                )}
            </div>
         </div>
      </nav>

      {/* Main Content */}
      <main className="pb-20">
         {currentPage === 'admin' && user?.role === 'Admin' ? renderAdminDashboard() : null}
         {currentPage === 'report' && renderReport()}
         {currentPage === 'auth' && renderAuth()}
      </main>

      {/* AI Chat Button */}
      {user && (
          <>
            <button onClick={() => setIsChatOpen(!isChatOpen)} className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50 print:hidden">
                {isChatOpen ? <X className="w-6 h-6"/> : <Bot className="w-6 h-6"/>}
            </button>

            {/* AI Chat Window */}
            <AnimatePresence>
                {isChatOpen && (
                    <motion.div initial={{opacity:0, y:20, scale:0.95}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, y:20, scale:0.95}} className="fixed bottom-24 right-6 w-80 h-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
                        <div className="bg-indigo-600 p-4 text-white font-bold text-sm flex items-center gap-2"><Bot className="w-4 h-4"/> Asisten Akademik</div>
                        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
                            {chatMessages.map((m,i)=>(
                                <div key={i} className={cn("text-xs p-3 rounded-xl max-w-[85%] leading-relaxed", m.role==='ai'?"bg-white border border-gray-100 text-gray-700 rounded-tl-none shadow-sm":"bg-indigo-600 text-white ml-auto rounded-tr-none")}>{m.content}</div>
                            ))}
                        </div>
                        <form className="p-2 bg-white border-t border-gray-100 flex gap-2" onSubmit={async(e)=>{
                            e.preventDefault();
                            if(!chatInput.trim()) return;
                            const msg = chatInput;
                            setChatMessages(p=>[...p, {role:'user', content:msg}]);
                            setChatInput("");
                            const reply = await queryAgentation(msg, students);
                            setChatMessages(p=>[...p, {role:'ai', content:reply}]);
                        }}>
                            <input className="flex-1 bg-gray-100 rounded-lg px-3 text-xs outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Ketik pesan..." value={chatInput} onChange={e=>setChatInput(e.target.value)}/>
                            <button type="submit" className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Send className="w-4 h-4"/></button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
          </>
      )}

      <div className="fixed top-20 right-5 z-[200] flex flex-col gap-2 print:hidden">
        <AnimatePresence>
          {toasts.map(t => <Toast key={t.id} {...t} onClose={() => setToasts(curr => curr.filter(x => x.id !== t.id))} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}
