'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { 
  Search, Menu, X, CheckCircle, AlertCircle, Loader2, 
  LayoutDashboard, Plus, Trash2, User, LogOut, 
  ExternalLink, Download, Lock, KeyRound, ShieldCheck,
  GraduationCap, CreditCard, FileText, Eye, EyeOff, Edit3, Save
} from 'lucide-react';

// ==========================================
// 1. UI COMPONENTS (LIGHTWEIGHT VERSION)
// ==========================================

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-5 right-5 flex items-center gap-3 px-4 py-3 rounded-lg border z-[200] ${
      type === 'success' ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-rose-100 border-rose-300 text-rose-900'
    }`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
    </div>
  );
};

// Removed animate-pulse for performance
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`bg-slate-200 rounded ${className}`} />
);

const Button = ({ children, variant = "primary", size = "default", className = "", isLoading, ...props }: any) => {
  const base = "inline-flex items-center justify-center rounded-lg font-medium active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
    glass: "bg-white/80 text-slate-800 border border-white/50 hover:bg-white" // Removed heavy glass effect
  };
  const sizes: any = {
    sm: "h-8 px-3 text-xs",
    default: "h-10 px-5 text-sm",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10"
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={isLoading} {...props}>
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
      {children}
    </button>
  );
};

const Input = ({ className = "", label, ...props }: any) => (
  <div className="w-full">
    {label && <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{label}</label>}
    <input 
      className={`flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${className}`} 
      {...props} 
    />
  </div>
);

// Removed blur and reduced shadow for performance
const Card = ({ children, className = "", ...props }: any) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

const Badge = ({ children, variant = "default", className = "" }: any) => {
  const styles: any = {
    default: "bg-slate-100 text-slate-600 border-slate-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

// ==========================================
// 2. MAIN LOGIC
// ==========================================

export default function Home() {
  // --- STATE ---
  const [isSiteUnlocked, setIsSiteUnlocked] = useState(false); 
  const [sitePin, setSitePin] = useState("");
  
  // Auth States
  const [loginMode, setLoginMode] = useState<'admin' | 'student'>('admin');
  const [loginForm, setLoginForm] = useState({ email: "", password: "", nim: "" });
  const [user, setUser] = useState<any>(null); // { role: 'Admin' | 'Student', id?: number, name?: string }
  
  const [loading, setLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState('store'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [isEditingGallery, setIsEditingGallery] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number, message: string, type: 'success' | 'error' }>>([]);

  // --- DATA STATE ---
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // --- CRUD STATES ---
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState(0);
  const [publicStudentId, setPublicStudentId] = useState(0);
  const [galleryForm, setGalleryForm] = useState({ title: "", desc: "", type: "", link: "", icon: "" });
  const [showPassword, setShowPassword] = useState(false);

  // Student Self-Edit State
  const [isStudentEditing, setIsStudentEditing] = useState(false);
  const [studentEditForm, setStudentEditForm] = useState<any>({});

  // --- UTILS ---
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- FETCH FUNCTIONS ---
  const fetchGallery = async () => {
    const { data } = await supabase.from('gallery_items').select('*').order('created_at', { ascending: false });
    if (data) setGalleryItems(data);
  };

  const fetchAcademicData = async () => {
    setIsDataLoading(true);
    // Optimized Query: Only fetch necessary fields first
    const { data } = await supabase
      .from('students')
      .select(`
        id, name, nim, prodi, bio, dnu_url, ktm_url, ktpu_url, password,
        semesters (
          *,
          subjects ( * )
        )
      `)
      .order('id', { ascending: true });
    
    if (data) {
      // Sort in JS to reduce DB load complexity on free tier
      const sortedData = data.map((student: any) => ({
        ...student,
        semesters: student.semesters?.sort((a: any, b: any) => a.id - b.id).map((sem: any) => ({
          ...sem,
          subjects: sem.subjects?.sort((a: any, b: any) => a.id - b.id)
        }))
      }));
      setStudents(sortedData);
    }
    setIsDataLoading(false);
  };

  // --- INITIAL EFFECT ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser({ role: 'Admin', email: session.user.email });
      } else if (user?.role !== 'Student') {
        setUser(null);
      }
    });

    fetchGallery();
    fetchAcademicData();

    return () => subscription.unsubscribe();
  }, []);

  // --- STATS CALCULATION ---
  const calculateStats = (scores: any) => {
    const dKeys = ['d1','d2','d3','d4','d5','d6','d7','d8'];
    const tKeys = ['t1','t2','t3'];
    
    const dScores = dKeys.map(k => Number(scores[k])).filter(v => !isNaN(v) && v > 0);
    const tScores = tKeys.map(k => Number(scores[k])).filter(v => !isNaN(v) && v > 0);
    const uasScore = Number(scores.uas) || 0;

    const allTutonScores = [...dScores, ...tScores];
    const tutonAvg = allTutonScores.length > 0 
      ? allTutonScores.reduce((a, b) => a + b, 0) / allTutonScores.length 
      : 0;

    const finalScore = (0.7 * uasScore) + (0.3 * tutonAvg);
    let grade = "E";
    if (finalScore >= 85) grade = "A";
    else if (finalScore >= 80) grade = "A-";
    else if (finalScore >= 75) grade = "B+";
    else if (finalScore >= 70) grade = "B";
    else if (finalScore >= 65) grade = "B-";
    else if (finalScore >= 60) grade = "C+";
    else if (finalScore >= 55) grade = "C";
    else if (finalScore >= 50) grade = "C-";
    else if (finalScore >= 40) grade = "D";

    return { finalScore: finalScore.toFixed(2), grade, tutonAvg: tutonAvg.toFixed(2) };
  };

  const getGradePoint = (grade: string) => {
    switch(grade) {
      case 'A': return 4.0; case 'A-': return 3.7;
      case 'B+': return 3.3; case 'B': return 3.0; case 'B-': return 2.7;
      case 'C+': return 2.3; case 'C': return 2.0; case 'C-': return 1.7;
      case 'D': return 1.0; default: return 0.0;
    }
  };

  const calculateIPS = (semester: any) => {
    let totalSKS = 0;
    let totalWeightedPoints = 0;
    if (!semester?.subjects) return "0.00";

    semester.subjects.forEach((sub: any) => {
      const stats = calculateStats(sub); 
      const point = getGradePoint(stats.grade);
      const sks = Number(sub.sks) || 0; 
      
      if (sks > 0) {
        totalSKS += sks;
        totalWeightedPoints += (point * sks);
      }
    });
    return totalSKS === 0 ? "0.00" : (totalWeightedPoints / totalSKS).toFixed(2);
  };

  const calculateIPK = (student: any) => {
    let totalSKS = 0;
    let totalWeightedPoints = 0;
    if (!student?.semesters) return "0.00";
    student.semesters.forEach((sem: any) => {
      sem.subjects?.forEach((sub: any) => {
        const stats = calculateStats(sub);
        const point = getGradePoint(stats.grade);
        const sks = Number(sub.sks) || 0; 
        if (sks > 0) {
          totalSKS += sks;
          totalWeightedPoints += (point * sks);
        }
      });
    });
    return totalSKS === 0 ? "0.00" : (totalWeightedPoints / totalSKS).toFixed(2);
  };

  // --- ACTIONS ---
  const handleSiteUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (sitePin === "210250") {
      setIsSiteUnlocked(true);
      setSitePin("");
    } else {
      showToast("PIN Salah!", "error");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (loginMode === 'admin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });

      if (error) {
        showToast(error.message, "error");
      } else {
        setCurrentPage('dashboard');
        setLoginForm({ email: "", password: "", nim: "" });
        showToast("Login Admin Berhasil", "success");
      }
    } else {
      const { data, error } = await supabase
        .from('students')
        .select('*') 
        .eq('nim', loginForm.nim)
        .eq('password', loginForm.password) 
        .single();

      if (error || !data) {
        showToast("NIM atau Password Salah!", "error");
      } else {
        const studentIndex = students.findIndex(s => s.id === data.id);
        if (studentIndex !== -1) {
            setPublicStudentId(studentIndex);
            setUser({ role: 'Student', id: data.id, name: data.name });
            setCurrentPage('report');
            setLoginForm({ email: "", password: "", nim: "" });
            showToast(`Selamat datang, ${data.name}`, "success");
        } else {
            showToast("Data sinkronisasi gagal. Coba refresh.", "error");
        }
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (user?.role === 'Admin') await supabase.auth.signOut();
    setUser(null);
    setCurrentPage('store');
  }

  // --- MAHASANTRI SELF EDIT ---
  const startStudentEdit = () => {
    const student = students[publicStudentId];
    setStudentEditForm({
        name: student.name,
        nim: student.nim,
        prodi: student.prodi,
        bio: student.bio,
        password: student.password,
        dnu_url: student.dnu_url,
        ktm_url: student.ktm_url,
        ktpu_url: student.ktpu_url
    });
    setIsStudentEditing(true);
  }

  const saveStudentEdit = async () => {
    if (!user || user.role !== 'Student') return;
    setLoading(true);

    const { error } = await supabase
        .from('students')
        .update(studentEditForm)
        .eq('id', user.id);

    if (!error) {
        // Update local state without refetching all
        const updatedStudents = students.map(s => s.id === user.id ? { ...s, ...studentEditForm } : s);
        setStudents(updatedStudents);
        setIsStudentEditing(false);
        showToast("Profil berhasil diperbarui", "success");
    } else {
        showToast("Gagal update: " + error.message, "error");
    }
    setLoading(false);
  }

  // --- DATA MUTATIONS (ADMIN) ---
  const updateStudentInfo = async (id: number, field: string, value: string) => {
    const updatedStudents = students.map(s => s.id === id ? { ...s, [field]: value } : s);
    setStudents(updatedStudents);
    await supabase.from('students').update({ [field]: value }).eq('id', id);
  };

  // ... (Other admin CRUD functions kept similar but optimized calls)
  const saveGalleryItem = async () => {
    if (!galleryForm.title) return showToast("Judul wajib!", "error");
    setLoading(true);
    const { error } = await supabase.from('gallery_items').insert([{ 
      title: galleryForm.title, description: galleryForm.desc, type: galleryForm.type, link: galleryForm.link, icon: galleryForm.icon || "✨", color: "bg-slate-500" 
    }]);
    if (!error) { fetchGallery(); setGalleryForm({ title: "", desc: "", type: "", link: "", icon: "" }); showToast("Tersimpan", "success"); }
    setLoading(false);
  };

  const deleteGalleryItem = async (id: number) => {
    if(!confirm("Hapus?")) return;
    await supabase.from('gallery_items').delete().eq('id', id);
    fetchGallery();
  };

  const addStudent = async () => {
    setLoading(true);
    await supabase.from('students').insert([{ name: "Mahasantri Baru", nim: `NIM-${Date.now()}`, prodi: "Prodi Baru" }]);
    await fetchAcademicData();
    setLoading(false);
  };

  const deleteStudent = async (id: number) => {
    if(!confirm("Hapus mahasiswa ini?")) return;
    await supabase.from('students').delete().eq('id', id);
    fetchAcademicData();
    setEditingStudentId(null);
  };

  const addSemester = async (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    await supabase.from('semesters').insert([{ student_id: studentId, name: `Semester ${(student?.semesters?.length || 0) + 1}` }]);
    fetchAcademicData();
  };
  
  const deleteSemester = async (semId: number) => {
    if(!confirm("Hapus semester?")) return;
    await supabase.from('semesters').delete().eq('id', semId);
    fetchAcademicData();
    setSelectedSemester(0);
  };

  const addSubject = async (semesterId: number) => {
    await supabase.from('subjects').insert([{ semester_id: semesterId, name: "Matkul Baru", sks: 3 }]);
    fetchAcademicData();
  };

  const handleSubjectChange = (studentIdx: number, semIdx: number, subIdx: number, field: string, value: string) => {
    if (!students[studentIdx]?.semesters?.[semIdx]?.subjects?.[subIdx]) return;
    const newStudents = [...students];
    newStudents[studentIdx].semesters[semIdx].subjects[subIdx][field] = value;
    setStudents(newStudents);
  };

  const saveSubjectBlur = async (subjectId: number, field: string, value: any) => {
    await supabase.from('subjects').update({ [field]: value }).eq('id', subjectId);
  };

  const deleteSubject = async (subjectId: number) => {
    await supabase.from('subjects').delete().eq('id', subjectId);
    fetchAcademicData();
  };

  // --- RENDERS ---

  if (!isSiteUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 text-center shadow-lg">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Situs Terkunci</h1>
          <form onSubmit={handleSiteUnlock} className="space-y-4">
            <Input type="password" placeholder="PIN..." className="text-center text-xl tracking-widest font-bold" maxLength={6} value={sitePin} onChange={(e: any) => setSitePin(e.target.value)} />
            <Button type="submit" className="w-full font-bold">Buka Situs</Button>
          </form>
          <p className="mt-4 text-xs text-indigo-600 font-medium">Hint: 210250</p>
        </Card>
      </div>
    );
  }

  const renderStore = () => (
    <div className="container mx-auto px-4 py-10">
      <div className="text-center mb-10 space-y-4">
        <Badge variant="indigo">DIGITAL GALLERY</Badge>
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900">
          Karya & Arsip Digital
        </h1>
      </div>
      
      {isDataLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {galleryItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-md border-slate-200 flex flex-col h-full">
              <div className={`h-32 flex items-center justify-center text-4xl bg-slate-100`}>
                {item.icon && (item.icon.startsWith('http')) ? (
                  <img src={item.icon} alt="icon" className="w-full h-full object-cover" />
                ) : (
                  <span>{item.icon || "✨"}</span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <Badge variant="sky" className="mb-2 w-fit">{item.type}</Badge>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-slate-500 text-xs mb-4 line-clamp-2 flex-1">{item.description}</p>
                <Button variant="secondary" size="sm" className="w-full mt-auto" onClick={() => window.open(item.link, '_blank')}>Lihat <ExternalLink className="w-3 h-3 ml-2" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderReport = () => {
    const student = students[publicStudentId];
    const isStudentLogin = user?.role === 'Student';
    
    if (isDataLoading) return <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500"/></div>;
    if (!student) return <div className="text-center py-20 text-slate-500">Data tidak ditemukan.</div>;
    const ipk = calculateIPK(student);

    return (
      <div className="container mx-auto px-4 py-10">
        
        {/* STUDENT SELECTOR (Admin only) */}
        {!isStudentLogin && (
          <div className="flex justify-center mb-8">
            <div className="flex overflow-x-auto gap-2 p-1 max-w-full pb-2 no-scrollbar">
              {students.map((s, idx) => (
                <button 
                  key={s.id} onClick={() => setPublicStudentId(idx)} 
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border whitespace-nowrap ${publicStudentId === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE CARD */}
        <Card className="overflow-hidden shadow-lg border-0 mb-8">
          <div className="bg-slate-800 p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{student.name}</h2>
                    {isStudentLogin && (
                        <button onClick={startStudentEdit} className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors" title="Edit Profil">
                            <Edit3 className="w-4 h-4"/>
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2 opacity-80 text-sm">
                   <span className="border border-white/20 px-2 py-0.5 rounded">NIM: {student.nim}</span>
                   <span className="border border-white/20 px-2 py-0.5 rounded">{student.prodi}</span>
                </div>
                {student.bio && <p className="mt-3 text-slate-300 text-sm italic">"{student.bio}"</p>}
              </div>
              <div className="text-center bg-indigo-600 p-3 rounded-lg min-w-[100px]">
                 <p className="text-[10px] text-white/70 uppercase font-bold">IPK Total</p>
                 <p className="text-3xl font-bold">{ipk}</p>
              </div>
            </div>
          </div>
          
          {/* DOCUMENTS */}
          <div className="bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-slate-100">
             {[
                { label: 'DNU/LKAM', sub: 'Transkrip', icon: FileText, color: 'text-indigo-600 bg-indigo-50', link: student.dnu_url },
                { label: 'KTM', sub: 'Kartu Identitas', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50', link: student.ktm_url },
                { label: 'KTPU', sub: 'Kartu Ujian', icon: CheckCircle, color: 'text-amber-600 bg-amber-50', link: student.ktpu_url },
             ].map((doc, i) => (
                 <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${doc.color}`}><doc.icon className="w-4 h-4"/></div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-700 text-sm">{doc.label}</h4>
                        <p className="text-[10px] text-slate-400">{doc.sub}</p>
                    </div>
                    {doc.link ? <Button variant="secondary" size="sm" onClick={() => window.open(doc.link, '_blank')} className="h-7 px-2"><ExternalLink className="w-3 h-3"/></Button> : <span className="text-[10px] text-slate-300">N/A</span>}
                 </div>
             ))}
          </div>

          {/* EDIT FORM MODAL (INLINE) FOR STUDENT */}
          {isStudentEditing && isStudentLogin && (
            <div className="p-6 bg-indigo-50 border-b border-indigo-100">
                <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2"><Edit3 className="w-4 h-4"/> Edit Data Diri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input label="Nama Lengkap" value={studentEditForm.name} onChange={(e:any)=>setStudentEditForm({...studentEditForm, name: e.target.value})} />
                    <Input label="NIM" value={studentEditForm.nim} onChange={(e:any)=>setStudentEditForm({...studentEditForm, nim: e.target.value})} />
                    <Input label="Prodi" value={studentEditForm.prodi} onChange={(e:any)=>setStudentEditForm({...studentEditForm, prodi: e.target.value})} />
                    <Input label="Bio Singkat" value={studentEditForm.bio || ""} onChange={(e:any)=>setStudentEditForm({...studentEditForm, bio: e.target.value})} />
                    <Input label="Password Login" value={studentEditForm.password || ""} onChange={(e:any)=>setStudentEditForm({...studentEditForm, password: e.target.value})} />
                    <div className="md:col-span-2 space-y-2 mt-2">
                        <p className="text-xs font-bold text-slate-500 uppercase">Link Dokumen (Google Drive/Cloud)</p>
                        <Input placeholder="Link PDF DNU..." value={studentEditForm.dnu_url || ""} onChange={(e:any)=>setStudentEditForm({...studentEditForm, dnu_url: e.target.value})} />
                        <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Link Gambar KTM..." value={studentEditForm.ktm_url || ""} onChange={(e:any)=>setStudentEditForm({...studentEditForm, ktm_url: e.target.value})} />
                            <Input placeholder="Link Gambar KTPU..." value={studentEditForm.ktpu_url || ""} onChange={(e:any)=>setStudentEditForm({...studentEditForm, ktpu_url: e.target.value})} />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <Button variant="secondary" onClick={()=>setIsStudentEditing(false)}>Batal</Button>
                    <Button onClick={saveStudentEdit} isLoading={loading}>Simpan Perubahan</Button>
                </div>
            </div>
          )}

          {/* GRADES TABLE */}
          <div className="bg-slate-50 p-6 space-y-8">
            {student.semesters?.map((sem: any) => (
                <div key={sem.id}>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-slate-800 text-lg border-l-4 border-indigo-600 pl-3">{sem.name}</h3>
                        <Badge variant="indigo">IPS: {calculateIPS(sem)}</Badge>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                            <th className="px-3 py-3 w-40">Mata Kuliah</th>
                            <th className="px-1 py-3 text-center">SKS</th>
                            {Array.from({length: 8}, (_, i) => <th key={`d${i}`} className="px-1 text-center w-8 text-[10px]">D{i+1}</th>)}
                            {Array.from({length: 3}, (_, i) => <th key={`t${i}`} className="px-1 text-center w-8 text-[10px] text-indigo-600">T{i+1}</th>)}
                            <th className="px-2 py-3 text-center w-12 text-amber-600">UAS</th>
                            <th className="px-3 py-3 text-center w-14 font-bold">Nilai</th>
                            <th className="px-3 py-3 text-center w-14 font-bold">Grade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sem.subjects?.map((sub: any) => {
                                const stats = calculateStats(sub);
                                return (
                                    <tr key={sub.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 font-medium text-slate-700">{sub.name}</td>
                                    <td className="px-1 py-2 text-center text-slate-500">{sub.sks}</td>
                                    {['d1','d2','d3','d4','d5','d6','d7','d8'].map(k => <td key={k} className="px-1 text-center text-slate-400">{sub[k]||'-'}</td>)}
                                    {['t1','t2','t3'].map(k => <td key={k} className="px-1 text-center text-indigo-600 bg-indigo-50/20">{sub[k]||'-'}</td>)}
                                    <td className="px-2 text-center font-bold text-amber-600 bg-amber-50/20">{sub.uas||'-'}</td>
                                    <td className="px-3 text-center font-bold text-slate-700 bg-slate-100/50">{stats.finalScore}</td>
                                    <td className="px-3 text-center"><Badge variant={stats.grade.includes('A')?'emerald':'default'}>{stats.grade}</Badge></td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        </table>
                    </div>
                </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  const renderAuth = () => (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <Card className="w-full max-w-sm p-8 shadow-xl border-slate-200">
        <div className="text-center mb-6">
           <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200">
             <KeyRound className="w-6 h-6 text-white" />
           </div>
           <h2 className="text-xl font-bold text-slate-900">Login Sistem</h2>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
            <button onClick={() => setLoginMode('admin')} className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${loginMode === 'admin' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Admin</button>
            <button onClick={() => setLoginMode('student')} className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${loginMode === 'student' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Mahasantri</button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {loginMode === 'admin' ? (
             <>
                <Input label="Email" type="email" value={loginForm.email} onChange={(e: any) => setLoginForm({...loginForm, email: e.target.value})} />
                <Input label="Password" type="password" value={loginForm.password} onChange={(e: any) => setLoginForm({...loginForm, password: e.target.value})} />
             </>
          ) : (
             <>
                <Input label="NIM" type="text" value={loginForm.nim} onChange={(e: any) => setLoginForm({...loginForm, nim: e.target.value})} />
                <div className="relative">
                    <Input label="Password" type={showPassword ? "text" : "password"} value={loginForm.password} onChange={(e: any) => setLoginForm({...loginForm, password: e.target.value})} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"><Eye className="w-4 h-4" /></button>
                </div>
             </>
          )}
          <Button type="submit" className="w-full mt-2" isLoading={loading}>Masuk</Button>
        </form>
      </Card>
    </div>
  );

  // Simplified Dashboard Render
  const renderDashboard = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-indigo-600" /> Admin Dashboard</h1>
        <div className="flex bg-slate-100 p-1 rounded-lg">
           <button onClick={() => setIsEditingGallery(false)} className={`px-3 py-1.5 rounded text-xs font-bold ${!isEditingGallery ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>Akademik</button>
           <button onClick={() => setIsEditingGallery(true)} className={`px-3 py-1.5 rounded text-xs font-bold ${isEditingGallery ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>Galeri</button>
        </div>
      </div>

      {isEditingGallery ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-4 h-fit">
            <h3 className="font-bold text-slate-800 mb-4 text-sm">Tambah Galeri</h3>
            <div className="space-y-3">
              <Input placeholder="Judul..." value={galleryForm.title} onChange={(e: any) => setGalleryForm({...galleryForm, title: e.target.value})} />
              <Input placeholder="Deskripsi..." value={galleryForm.desc} onChange={(e: any) => setGalleryForm({...galleryForm, desc: e.target.value})} />
              <Input placeholder="Tipe (App/Design)..." value={galleryForm.type} onChange={(e: any) => setGalleryForm({...galleryForm, type: e.target.value})} />
              <Input placeholder="Icon URL / Emoji..." value={galleryForm.icon} onChange={(e: any) => setGalleryForm({...galleryForm, icon: e.target.value})} />
              <Input placeholder="Link Tujuan..." value={galleryForm.link} onChange={(e: any) => setGalleryForm({...galleryForm, link: e.target.value})} />
              <Button onClick={saveGalleryItem} className="w-full" size="sm" isLoading={loading}>Simpan</Button>
            </div>
          </Card>
          <div className="lg:col-span-2 space-y-3">
            {galleryItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-lg">{item.icon?.startsWith('http') ? <img src={item.icon} className="w-full h-full object-cover rounded"/> : item.icon || "✨"}</div>
                  <div><h4 className="font-bold text-sm text-slate-800">{item.title}</h4><p className="text-xs text-slate-500">{item.type}</p></div>
                </div>
                <Button variant="danger" size="sm" onClick={() => deleteGalleryItem(item.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <Button onClick={addStudent} size="sm" isLoading={loading}><Plus className="w-4 h-4 mr-1"/> Mahasantri Baru</Button>
            {students.map((student, idx) => (
              <button key={student.id} onClick={() => { setEditingStudentId(idx); setSelectedSemester(0); }} className={`px-4 py-2 rounded-lg text-sm font-medium border whitespace-nowrap ${editingStudentId === idx ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                {student.name}
              </button>
            ))}
          </div>
          
          {editingStudentId !== null && students[editingStudentId] && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><User className="w-4 h-4 text-indigo-500" /> Edit Data Mahasantri</h3>
                    <Button variant="danger" size="sm" onClick={() => deleteStudent(students[editingStudentId].id)}>Hapus Siswa</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Nama" value={students[editingStudentId].name} onChange={(e: any) => updateStudentInfo(students[editingStudentId].id, 'name', e.target.value)} />
                  <Input label="NIM" value={students[editingStudentId].nim} onChange={(e: any) => updateStudentInfo(students[editingStudentId].id, 'nim', e.target.value)} />
                  <Input label="Password" value={students[editingStudentId].password || ""} onChange={(e: any) => updateStudentInfo(students[editingStudentId].id, 'password', e.target.value)} placeholder="Set Password..." />
                  <div className="md:col-span-3"><Input label="Bio" value={students[editingStudentId].bio || ""} onChange={(e: any) => updateStudentInfo(students[editingStudentId].id, 'bio', e.target.value)} /></div>
                </div>
              </Card>

              {/* Semester Editor (Simplified) */}
              <Card className="p-4">
                 <div className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b border-slate-100">
                    {students[editingStudentId].semesters?.map((sem: any, idx: number) => (
                       <button key={sem.id} onClick={() => setSelectedSemester(idx)} className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap ${selectedSemester === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{sem.name}</button>
                    ))}
                    <button onClick={() => addSemester(students[editingStudentId].id)} className="px-3 py-1.5 rounded text-xs font-bold bg-slate-200 hover:bg-slate-300">+</button>
                 </div>
                 
                 {students[editingStudentId].semesters?.[selectedSemester] ? (
                    <div>
                        <div className="flex justify-end gap-2 mb-2">
                            <button onClick={() => deleteSemester(students[editingStudentId].semesters[selectedSemester].id)} className="text-xs text-rose-500 underline">Hapus Semester</button>
                            <Button size="sm" onClick={() => addSubject(students[editingStudentId].semesters[selectedSemester].id)}>+ Matkul</Button>
                        </div>
                        <div className="space-y-2">
                           {students[editingStudentId].semesters[selectedSemester].subjects?.map((sub: any, sIdx: number) => (
                             <div key={sub.id} className="grid grid-cols-12 gap-1 items-center bg-slate-50 p-2 rounded text-xs">
                                <div className="col-span-3"><input className="w-full bg-transparent font-bold text-slate-700" value={sub.name} onChange={(e) => handleSubjectChange(editingStudentId, selectedSemester, sIdx, 'name', e.target.value)} onBlur={(e) => saveSubjectBlur(sub.id, 'name', e.target.value)} /></div>
                                <div className="col-span-1"><input className="w-full text-center bg-white rounded border border-slate-200" value={sub.sks} onChange={(e) => handleSubjectChange(editingStudentId, selectedSemester, sIdx, 'sks', e.target.value)} onBlur={(e) => saveSubjectBlur(sub.id, 'sks', e.target.value)} /></div>
                                <div className="col-span-6 grid grid-cols-8 gap-0.5">
                                   {['d1','d2','d3','d4','d5','t1','t2','uas'].map(k => (
                                     <input key={k} className={`w-full text-center rounded border border-slate-200 ${k==='uas'?'bg-amber-50 border-amber-200':''}`} placeholder={k} value={sub[k]||""} onChange={(e) => handleSubjectChange(editingStudentId, selectedSemester, sIdx, k, e.target.value)} onBlur={(e) => saveSubjectBlur(sub.id, k, e.target.value)} />
                                   ))}
                                </div>
                                <div className="col-span-2 text-right"><button onClick={()=>deleteSubject(sub.id)} className="text-rose-500 hover:bg-rose-100 p-1 rounded"><Trash2 className="w-3 h-3"/></button></div>
                             </div>
                           ))}
                        </div>
                    </div>
                 ) : <p className="text-center text-xs text-slate-400 py-4">Pilih semester</p>}
              </Card>
            </div>
          )}
        </>
      )}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => <div key={t.id} className="pointer-events-auto"><Toast message={t.message} type={t.type} onClose={() => removeToast(t.id)} /></div>)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('store')}>
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            <span className="font-bold text-lg tracking-tight">MAHASANTRI</span>
          </div>
          
          <div className="hidden md:flex items-center gap-1">
            {['store', 'report'].map(page => <button key={page} onClick={() => setCurrentPage(page)} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase ${currentPage === page ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-900'}`}>{page}</button>)}
            {user?.role === 'Admin' && <button onClick={() => setCurrentPage('dashboard')} className="px-4 py-1.5 rounded-md text-xs font-bold uppercase text-slate-500 hover:text-slate-900">Dashboard</button>}
          </div>

          <div className="flex items-center gap-2">
            <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}</button>
            <div className="hidden md:block">
              {user ? <Button variant="ghost" size="sm" onClick={handleLogout} className="text-rose-500"><LogOut className="w-4 h-4 mr-2" /> Keluar</Button> : <Button size="sm" onClick={() => setCurrentPage('auth')}>Login</Button>}
            </div>
          </div>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden absolute top-14 left-0 right-0 bg-white border-b border-slate-200 p-2 shadow-lg z-40">
            {['store', 'report', ...(user?.role === 'Admin' ? ['dashboard'] : [])].map(page => (
              <button key={page} onClick={() => { setCurrentPage(page); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold uppercase border-b border-slate-50 last:border-0">{page}</button>
            ))}
            {user ? <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold uppercase text-rose-600">Keluar</button> : <button onClick={() => { setCurrentPage('auth'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold uppercase text-indigo-600">Login</button>}
          </div>
        )}
      </nav>
      
      <main className="min-h-[calc(100vh-56px)] pb-10">
        {currentPage === 'store' && renderStore()}
        {currentPage === 'report' && renderReport()}
        {currentPage === 'dashboard' && renderDashboard()}
        {currentPage === 'auth' && renderAuth()}
      </main>
    </div>
  );
}