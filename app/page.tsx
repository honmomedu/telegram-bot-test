'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, MapPin, Clock, History as HistoryIcon, ShieldCheck, UserCheck, CheckCircle2, XCircle, RefreshCw, Info, AlertTriangle, Navigation, Image as ImageIcon, X, QrCode, Settings, ScanFace, Loader2, UserPlus, CreditCard, Nfc } from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Link from 'next/link';
import { getFaceDescriptor, matchConfidence } from '@/lib/face';
import { FaceEnrollment, resolveEnrollment } from '@/lib/faceStore';
import { ActiveEmployee, getActiveEmployee, clearActiveEmployee } from '@/lib/employeeStore';
import { initOrgContext } from '@/lib/orgClient';

const MapComponent = dynamic(() => import('../components/Map'), { ssr: false });
const FaceEnroll = dynamic(() => import('../components/FaceEnroll'), { ssr: false });
const ActivateGate = dynamic(() => import('../components/ActivateGate'), { ssr: false });

// Default Office Coordinates (Central Phnom Penh)
const DEFAULT_OFFICE_COORDS = { lat: 11.5564, lng: 104.9282 }; 
const DEFAULT_ALLOWED_RADIUS_METERS = 100;

// Haversine formula to calculate distance directly on the client
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth's radius in metres
  const f1 = lat1 * Math.PI / 180;
  const f2 = lat2 * Math.PI / 180;
  const df = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(df / 2) * Math.sin(df / 2) +
            Math.cos(f1) * Math.cos(f2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'attend' | 'history' | 'info'>('attend');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [officeCoords, setOfficeCoords] = useState(DEFAULT_OFFICE_COORDS);
  const [allowedRadius, setAllowedRadius] = useState(DEFAULT_ALLOWED_RADIUS_METERS);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  // Camera & Verification States
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'IN' | 'OUT' | null>(null);
  const [verifyMethod, setVerifyMethod] = useState<'camera' | 'qr' | 'card' | 'nfc'>('camera');
  const [scanKind, setScanKind] = useState<'office' | 'card'>('office');
  const [orgMethods, setOrgMethods] = useState<{ face: boolean; office_qr: boolean; qr_card: boolean; nfc: boolean; manual: boolean }>({ face: true, office_qr: true, qr_card: false, nfc: false, manual: false });
  const [nfcScanning, setNfcScanning] = useState<null | 'IN' | 'OUT'>(null);
  const [qrActionType, setQrActionType] = useState<'IN' | 'OUT' | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // History (attendance records from the server)
  const [history, setHistory] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Active employee identity (device-level login by Employee ID)
  const [employee, setEmployee] = useState<ActiveEmployee | null>(null);
  const [activationChecked, setActivationChecked] = useState(false);

  // Face enrollment & verification
  const [enrollment, setEnrollment] = useState<FaceEnrollment | null>(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'idle' | 'verifying' | 'matched' | 'failed'>('idle');
  const [faceConfidence, setFaceConfidence] = useState<number | null>(null);
  // The employee identified by the face during a check-in (auto-match)
  const [matchedEmployee, setMatchedEmployee] = useState<{ code: string; name: string } | null>(null);
  // Substitution: this check-in is covering for another employee
  const [allEmployees, setAllEmployees] = useState<{ code: string; name: string }[]>([]);
  const [substituteFor, setSubstituteFor] = useState<string>('');

  // QR secrets (admin-generated, validated server-side config)
  const [validQrSecrets, setValidQrSecrets] = useState<string[]>(['SECURE_ATTEND_OFFICE_QR_2026']);

  const currentUserId = employee?.code || 'guest';

  // Load attendance history for the active employee from the server
  const loadHistory = useCallback((code: string) => {
    if (!code || code === 'guest') return;
    fetch(`/api/attendance?code=${encodeURIComponent(code)}&limit=50`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data.records)) setHistory(data.records); })
      .catch(() => {});
  }, []);

  // Real-time clock update & initial data load
  useEffect(() => {
    setIsClient(true);
    initOrgContext(); // scope all API calls to this org (from ?org=)

    // Telegram Web App ready (identity comes from Employee ID, not Telegram)
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        (window as any).Telegram.WebApp.ready?.();
    }

    // Restore the activated employee on this device
    setEmployee(getActiveEmployee());
    setActivationChecked(true);

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    try {
      // Load office coordinates from API
      fetch('/api/office-config').then(res => res.json()).then(data => {
        if (data.lat && data.lng) {
          setOfficeCoords({ lat: parseFloat(data.lat), lng: parseFloat(data.lng) });
        }
        if (data.radius) {
          setAllowedRadius(parseFloat(data.radius));
        }
      }).catch(e => console.error("Failed to fetch office coords:", e));
    } catch (e) {
      console.error("Failed to load local storage data:", e);
    }
    
    // Load valid QR secrets (admin-generated)
    fetch('/api/qr-config')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.validSecrets) && data.validSecrets.length) {
          setValidQrSecrets(data.validSecrets);
        }
      })
      .catch(() => {});

    // Load this org's enabled attendance methods
    fetch('/api/org')
      .then((res) => res.json())
      .then((data) => { if (data.methods) setOrgMethods(data.methods); })
      .catch(() => {});

    // Load employee list (for the substitution picker)
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.employees)) {
          setAllEmployees(data.employees.map((e: any) => ({ code: e.code, name: e.name })));
        }
      })
      .catch(() => {});

    return () => clearInterval(timer);
  }, []);

  // Keep the selected verify method valid for this org's enabled methods
  useEffect(() => {
    const ok: Record<string, boolean> = { camera: orgMethods.face, qr: orgMethods.office_qr, card: orgMethods.qr_card, nfc: orgMethods.nfc };
    if (!ok[verifyMethod]) {
      const first = (['camera', 'qr', 'card', 'nfc'] as const).find((m) => ok[m]);
      if (first) setVerifyMethod(first);
    }
  }, [orgMethods, verifyMethod]);

  // Load the employee's face enrollment + attendance history once activated
  useEffect(() => {
    if (!isClient || !employee) return;
    resolveEnrollment(employee.code)
      .then((rec) => setEnrollment(rec))
      .catch(() => {});
    loadHistory(employee.code);

    // Auto-link Telegram for private DM when opened inside the Mini App
    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.id) {
      fetch('/api/employees/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: employee.code, telegramId: tgUser.id }),
      }).catch(() => {});
    }
  }, [isClient, employee, loadHistory]);

  // Strict Geolocation fetching
  const checkLocation = useCallback(() => {
    setIsLocating(true);
    setLocationError(null);
    setDistance(null);
    
    if (!navigator.geolocation) {
      setLocationError('កម្មវិធី Browser របស់អ្នកមិនគាំទ្រប្រព័ន្ធទីតាំង (Geolocation) ទេ');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        // Calculate Distance using Haversine
        const dist = calculateDistance(latitude, longitude, officeCoords.lat, officeCoords.lng);
        setDistance(dist);
        setIsWithinRadius(dist <= allowedRadius);
        setIsLocating(false);
      },
      (err) => {
        console.warn("Location Error:", err.message || err);
        setLocationError('មិនអាចទាញយកទីតាំងបានទេ។ សូមបើកសិទ្ធិ Location ជូនកម្មវិធី។');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [officeCoords.lat, officeCoords.lng, allowedRadius]);

  // Fetch location on mount
  useEffect(() => {
    checkLocation();
  }, [checkLocation]);

  // Clean up camera on unmount/tab change
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const openCameraFlow = async (type: 'IN' | 'OUT') => {
    // Require a registered face before allowing selfie check-in.
    if (!enrollment) {
      setShowEnroll(true);
      return;
    }
    setActionType(type);
    setPhoto(null);
    setFaceStatus('idle');
    setFaceConfidence(null);
    setSubstituteFor('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }, // Strictly front camera
        audio: false 
      });
      setCameraActive(true);
      // Slight delay to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("មិនអាចបើកកាមេរ៉ាបានទេ! សូមអនុញ្ញាតសិទ្ធិប្រើប្រាស់ Camera។");
      setActionType(null);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // Match source dimensions for high quality
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Unmirrored snapshot for the AI (same orientation as enrollment).
    const aiCanvas = document.createElement('canvas');
    aiCanvas.width = canvas.width;
    aiCanvas.height = canvas.height;
    aiCanvas.getContext('2d')?.drawImage(video, 0, 0, aiCanvas.width, aiCanvas.height);

    // Mirror the visible canvas so it acts like a real selfie mirror.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL('image/jpeg', 0.85);
    setPhoto(photoData);

    // --- AI face auto-match: the server identifies WHO this face is ---
    setFaceStatus('verifying');
    setFaceConfidence(null);
    setMatchedEmployee(null);
    try {
      const desc = await getFaceDescriptor(aiCanvas);
      stopCamera();
      if (!desc) {
        setFaceStatus('failed');
        return;
      }
      const res = await fetch('/api/attendance/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: Array.from(desc) }),
      });
      const data = await res.json();
      if (data.matched) {
        setMatchedEmployee({ code: data.code, name: data.name });
        setFaceConfidence(data.confidence ?? null);
        setFaceStatus('matched');
      } else {
        // Fallback: match locally against this device's own enrollment
        // (covers the case where the cloud table isn't populated yet).
        if (enrollment) {
          const localMod = await import('@/lib/face');
          const dist = localMod.faceDistance(desc, enrollment.descriptor);
          if (dist < localMod.MATCH_THRESHOLD) {
            setMatchedEmployee({ code: employee?.code || enrollment.userId, name: employee?.name || enrollment.name });
            setFaceConfidence(matchConfidence(dist));
            setFaceStatus('matched');
            return;
          }
        }
        setFaceStatus('failed');
      }
    } catch {
      stopCamera();
      setFaceStatus('failed');
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    openCameraFlow(actionType!);
  };

  const submitAttendance = async (methodParam: 'camera' | 'qr' | any = 'camera') => {
    const method = methodParam === 'qr' ? 'qr' : 'face';
    const actType = method === 'face' ? actionType : qrActionType;
    if (!actType) return;

    // Resolve identity: face -> auto-matched employee; QR -> device employee.
    const id = method === 'face' ? matchedEmployee : (employee ? { code: employee.code, name: employee.name } : null);
    if (!id) return;

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: id.code,
          name: id.name,
          type: actType,
          method,
          distance: distance != null ? Number(distance.toFixed(1)) : null,
          confidence: method === 'face' ? faceConfidence : null,
          substituteFor: substituteFor || null,
        }),
      });
      const data = await res.json();

      const subName = substituteFor ? (allEmployees.find((e) => e.code === substituteFor)?.name || substituteFor) : '';
      const who = id.name || id.code;
      const dmNote = data.telegramLinked
        ? (data.dmSent ? ' · ផ្ញើ DM ផ្ទាល់ ✓' : '')
        : ' (មិនទាន់ភ្ជាប់ Telegram ផ្ទាល់)';
      const subNote = subName ? ` 🔄 (ជំនួសឱ្យ ${subName})` : '';
      setSuccessMessage(
        `${who} — ${actType === 'IN' ? 'ចូលធ្វើការ' : 'ចេញពីធ្វើការ'} ត្រូវបានកត់ត្រាជោគជ័យ!${subNote}${dmNote}`,
      );
    } catch (e) {
      console.error('Failed to record attendance:', e);
      setSuccessMessage('មានបញ្ហាក្នុងការកត់ត្រា។ សូមសាកល្បងម្ដងទៀត។');
    }

    // Refresh history from the server
    if (employee) loadHistory(employee.code);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2800);

    setPhoto(null);
    setActionType(null);
    setQrActionType(null);
    setMatchedEmployee(null);
    setFaceStatus('idle');
    setSubstituteFor('');
  };

  // Record attendance for a specific employee (card / NFC kiosk flows)
  const recordByCode = async (code: string, name: string, type: 'IN' | 'OUT', method: 'qr_card' | 'nfc') => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, type, method, distance: distance != null ? Number(distance.toFixed(1)) : null }),
      });
      const data = await res.json();
      const dmNote = data.telegramLinked ? (data.dmSent ? ' · DM ✓' : '') : '';
      setSuccessMessage(`${name || code} — ${type === 'IN' ? 'ចូលធ្វើការ' : 'ចេញពីធ្វើការ'} ត្រូវបានកត់ត្រាជោគជ័យ!${dmNote}`);
    } catch {
      setSuccessMessage('មានបញ្ហាក្នុងការកត់ត្រា។');
    }
    if (employee) loadHistory(employee.code);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2800);
  };

  const handleQRScan = async (results: any) => {
     if (!results || results.length === 0) return;
     const text = results[0]?.rawValue || results[0]?.text || results?.text || results;
     if (typeof text !== 'string') return;
     const type = qrActionType;

     if (scanKind === 'card') {
        // Scan an employee QR card -> identify -> record
        try {
          const res = await fetch('/api/employees/by-card', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card: text }),
          });
          const data = await res.json();
          setQrActionType(null);
          if (data.matched) await recordByCode(data.code, data.name, type as 'IN' | 'OUT', 'qr_card');
          else alert('កាតមិនត្រឹមត្រូវ ឬរកបុគ្គលិកមិនឃើញ!');
        } catch { setQrActionType(null); alert('មានបញ្ហាស្កេនកាត។'); }
        return;
     }

     // Office QR
     if (validQrSecrets.includes(text)) {
         submitAttendance('qr');
     } else {
         alert('QR Code មិនត្រឹមត្រូវទេ! (តម្រូវឲ្យស្កេន QR ការិយាល័យ)');
         setQrActionType(null);
     }
  };

  // NFC tap check-in (Android Chrome only)
  const startNfcScan = async (type: 'IN' | 'OUT') => {
    if (typeof window === 'undefined' || !('NDEFReader' in window)) {
      alert('ឧបករណ៍នេះមិនគាំទ្រ NFC ទេ (ប្រើ Chrome លើ Android)។');
      return;
    }
    setNfcScanning(type);
    try {
      const reader = new (window as any).NDEFReader();
      await reader.scan();
      const serial: string = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), 25000);
        reader.onreading = (ev: any) => { clearTimeout(t); resolve(ev.serialNumber); };
        reader.onreadingerror = () => { clearTimeout(t); reject(new Error('err')); };
      });
      const res = await fetch(`/api/employees/by-nfc?nfc=${encodeURIComponent(serial)}`);
      const data = await res.json();
      setNfcScanning(null);
      if (data.matched) await recordByCode(data.code, data.name, type, 'nfc');
      else alert('កាត NFC នេះមិនទាន់ចុះបញ្ជី ឬរកបុគ្គលិកមិនឃើញ!');
    } catch {
      setNfcScanning(null);
      alert('មិនអាចអាន NFC បានទេ។ សូមប៉ះកាតម្ដងទៀត។');
    }
  };

  const onActionClick = (type: 'IN' | 'OUT') => {
    if (verifyMethod === 'camera') return openCameraFlow(type);
    if (verifyMethod === 'qr') { setScanKind('office'); return setQrActionType(type); }
    if (verifyMethod === 'card') { setScanKind('card'); return setQrActionType(type); }
    if (verifyMethod === 'nfc') return startNfcScan(type);
  };

  // Wait until we know whether a device employee exists (avoid flash)
  if (!activationChecked) {
    return (
      <div className="min-h-[100dvh] bg-ambient flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-brand-400 animate-spin" />
      </div>
    );
  }

  // Not activated yet -> show the Employee ID gate
  if (!employee) {
    return <ActivateGate onActivated={(e) => setEmployee(e)} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-ambient font-sans text-slate-900 overflow-hidden">
      {/* Top App Header */}
      <header className="brand-gradient text-white px-4 py-3.5 shadow-glow-brand z-10 flex items-center justify-between relative overflow-hidden">
        {/* decorative glow */}
        <div className="absolute -top-10 -right-6 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2.5 relative">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/25">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-bold tracking-tight">SecureAttend</h1>
            <p className="text-[10px] font-medium text-white/70 -mt-0.5">ប្រព័ន្ធកត់ត្រាវត្តមាន</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm('ប្តូរគណនីបុគ្គលិក? អ្នកនឹងត្រូវបញ្ចូល Employee ID ឡើងវិញ។')) {
              clearActiveEmployee();
              setEmployee(null);
              setEnrollment(null);
            }
          }}
          className="flex items-center gap-2 bg-white/15 backdrop-blur rounded-full pl-2.5 pr-3 py-1.5 ring-1 ring-white/20 relative max-w-[48%] active:scale-95 transition"
        >
          <UserCheck className="w-4 h-4 text-white/80 shrink-0" />
          <span className="text-xs font-semibold truncate">{employee?.name || 'បុគ្គលិក'}</span>
        </button>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto sm:pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        {/* TAB 1: ATTENDANCE */}
        {activeTab === 'attend' && (
          <div className="p-4 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Greeting hero — account owner */}
            <div className="flex items-center gap-3.5 pt-1">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-white shadow-card brand-gradient flex items-center justify-center">
                  {enrollment?.photo ? (
                    <img src={enrollment.photo} alt="" className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-white text-xl font-bold">{(employee?.name || '?').trim().charAt(0)}</span>
                  )}
                </div>
                {enrollment && (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-white">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500">
                  {(() => { const h = currentTime.getHours(); return h < 12 ? 'អរុណសួស្តី ☀️' : h < 17 ? 'ទិវាសួស្តី 🌤️' : h < 19 ? 'សាយ័ណ្ហសួស្តី 🌇' : 'រាត្រីសួស្តី 🌙'; })()}
                </p>
                <h2 className="text-xl font-bold text-slate-900 truncate leading-tight">{employee?.name || 'បុគ្គលិក'}</h2>
                <p className="text-xs text-slate-400 truncate">
                  {employee?.department ? `${employee.department} · ` : ''}លេខ {employee?.code}
                </p>
              </div>
            </div>

            {/* Clock Widget (compact) */}
            <div className="relative rounded-2xl px-5 py-3.5 flex items-center justify-between overflow-hidden bg-slate-900 text-white shadow-card">
              {/* ambient glow */}
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-brand-500/30 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-1.5 text-brand-300 mb-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest">ម៉ោងបច្ចុប្បន្ន</span>
                </div>
                <div className="text-3xl font-bold tracking-tight font-mono tabular-nums bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
                  {isClient ? currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                </div>
              </div>
              <div className="text-right text-slate-400 text-xs font-medium relative leading-tight max-w-[42%]">
                {isClient ? currentTime.toLocaleDateString('km-KH', { weekday: 'long', day: 'numeric', month: 'long' }) : '...'}
              </div>
            </div>

            {/* Face Enrollment Status */}
            {enrollment ? (
              <button
                onClick={() => setShowEnroll(true)}
                className="w-full bg-white rounded-3xl shadow-card border border-slate-100 p-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition"
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-emerald-400/60">
                    {enrollment.photo ? (
                      <img src={enrollment.photo} alt="មុខ" className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full bg-emerald-50 flex items-center justify-center"><ScanFace className="w-6 h-6 text-emerald-500" /></div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-white">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <ScanFace className="w-4 h-4 text-emerald-500" /> ចុះឈ្មោះមុខរួចរាល់
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    បានផ្ទៀងផ្ទាត់សម្គាល់មុខ · {enrollment.syncedToCloud ? 'Cloud ☁️' : 'លើ device'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-brand-600 shrink-0">ប្ដូរ</span>
              </button>
            ) : (
              <button
                onClick={() => setShowEnroll(true)}
                className="w-full relative overflow-hidden brand-gradient text-white rounded-3xl shadow-glow-brand p-4 flex items-center gap-3 text-left active:scale-[0.99] transition"
              >
                <div className="absolute -top-8 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
                <div className="w-12 h-12 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0 relative">
                  <ScanFace className="w-6 h-6" />
                </div>
                <div className="flex-1 relative">
                  <p className="text-sm font-bold flex items-center gap-1.5">ចុះឈ្មោះមុខ <UserPlus className="w-4 h-4" /></p>
                  <p className="text-xs text-white/80 mt-0.5 leading-tight">ចុះឈ្មោះមុខម្ដង ដើម្បីផ្ទៀងផ្ទាត់ពេលចូល/ចេញ</p>
                </div>
                <span className="text-xs font-bold bg-white/20 rounded-full px-3 py-1.5 shrink-0 relative">ចាប់ផ្ដើម</span>
              </button>
            )}

            {/* Geofence Card */}
            <div className="bg-white rounded-3xl shadow-card border border-slate-100 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-brand-500" /> ទីតាំងរបស់អ្នក
                </h2>
                <button 
                  onClick={checkLocation}
                  disabled={isLocating}
                  className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {locationError ? (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex gap-2 items-start border border-red-100">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="font-medium leading-tight">{locationError}</p>
                </div>
              ) : distance !== null ? (
                <>
                  <div className={`p-4 rounded-xl border ${isWithinRadius ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isWithinRadius ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                        {isWithinRadius ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className={`font-bold ${isWithinRadius ? 'text-emerald-800' : 'text-red-800'}`}>
                          {isWithinRadius ? 'ស្ថិតក្នុងតំបន់អនុញ្ញាត' : 'នៅឆ្ងាយពីការិយាល័យ'}
                        </p>
                        <p className={`text-sm font-medium mt-0.5 ${isWithinRadius ? 'text-emerald-600' : 'text-red-600'}`}>
                          ចម្ងាយ៖ {distance.toFixed(0)} ម៉ែត្រ (អនុញ្ញាត {allowedRadius}m)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <MapComponent officeCoords={officeCoords} userCoords={location} radius={allowedRadius} />
                  </div>
                </>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                  <Navigation className="w-4 h-4 mr-2 animate-pulse" /> កំពុងស្កេនទីតាំង...
                </div>
              )}
            </div>

            {/* Verification Method Toggle (only methods this org enabled) */}
            <div className="flex flex-wrap bg-white border border-slate-100 shadow-card p-1 rounded-2xl mt-2 gap-1">
               {([
                 orgMethods.face && { k: 'camera', icon: Camera, label: 'ថតមុខ' },
                 orgMethods.office_qr && { k: 'qr', icon: QrCode, label: 'QR ការិយាល័យ' },
                 orgMethods.qr_card && { k: 'card', icon: CreditCard, label: 'ស្កេនកាត' },
                 orgMethods.nfc && { k: 'nfc', icon: Nfc, label: 'NFC' },
               ].filter(Boolean) as { k: any; icon: any; label: string }[]).map(({ k, icon: Icon, label }) => (
                 <button key={k} onClick={() => setVerifyMethod(k)} className={`flex-1 min-w-[28%] py-2.5 flex justify-center items-center gap-1.5 text-xs font-bold rounded-xl transition-all ${verifyMethod === k ? 'brand-gradient text-white shadow-glow-brand' : 'text-slate-500'}`}>
                   <Icon className="w-4 h-4" /> {label}
                 </button>
               ))}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mt-2">
              <button
                disabled={!isWithinRadius}
                onClick={() => onActionClick('IN')}
                className="group bg-gradient-to-br from-emerald-500 to-emerald-600 text-white disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 disabled:shadow-none py-5 rounded-2xl font-bold shadow-glow-emerald active:scale-95 transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="bg-white/20 p-2.5 rounded-full group-active:scale-90 transition-transform"><UserCheck className="w-6 h-6" /></div>
                ចូលធ្វើការ (IN)
              </button>

              <button
                disabled={!isWithinRadius}
                onClick={() => onActionClick('OUT')}
                className="group bg-gradient-to-br from-amber-400 to-orange-500 text-white disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 disabled:shadow-none py-5 rounded-2xl font-bold shadow-[0_10px_30px_-8px_rgba(245,158,11,0.5)] active:scale-95 transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="bg-black/10 p-2.5 rounded-full group-active:scale-90 transition-transform"><Clock className="w-6 h-6" /></div>
                ចេញធ្វើការ (OUT)
              </button>
            </div>
            
            {!isWithinRadius && distance !== null && !locationError && (
              <p className="text-xs text-center text-slate-500 font-medium">អ្នកត្រូវតែស្ថិតនៅក្នុងរយៈចម្ងាយ {allowedRadius} ម៉ែត្រការិយាល័យ</p>
            )}
          </div>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === 'history' && (
          <div className="p-4 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">ប្រវត្តិបញ្ជិកា (History)</h2>
            
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <HistoryIcon className="w-12 h-12 mb-3 opacity-20" />
                <p>មិនទាន់មានប្រវត្តិទេ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((record) => {
                  const ts = record.created_at || record.time;
                  return (
                  <div key={record.id} className="bg-white p-4 rounded-2xl shadow-card border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${record.method === 'qr' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {record.method === 'qr' ? <QrCode className="w-6 h-6" /> : <ScanFace className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${record.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                             {record.type}
                           </span>
                           <span className="font-bold text-slate-700">
                             {new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          {new Date(ts).toLocaleDateString('km-KH')} · {record.method === 'qr' ? 'QR' : 'Face'}
                          {record.confidence != null ? ` ${record.confidence}%` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500 inline-block mb-1" />
                       {record.distance != null && <div className="text-[10px] text-slate-400">{record.distance}m</div>}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INFO / SECURITY SPECS */}
        {activeTab === 'info' && (
          <div className="p-4 space-y-4 pb-10 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-2 px-2">ស្ថាបត្យកម្មប្រព័ន្ធ (Architecture)</h2>
            
            <div className="bg-white rounded-3xl shadow-card border border-slate-100 p-5 space-y-3">
              <h3 className="font-bold text-indigo-700 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> ការពារការបន្លំម៉ោង (Anti-Cheat Time)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                ដើម្បីទប់ស្កាត់ការបន្លំម៉ោង (Fake Clock)៖ បច្ចុប្បន្ន Time ដែលឃើញលើអេក្រង់គឺគ្រាន់តែសម្រាប់បង្ហាញ។ នៅពេលចុច Submit, Frontend ទាញទិន្នន័យបញ្ជូនទៅ Database (e.g., Firebase), ប៉ុន្តែ Database ត្រូវតែប្រើ <strong>Server-Side Timestamp</strong> (ដូចជា <code>serverTimestamp()</code> ក្នុង Firestore ឬ <code>now()</code> ក្នុង Supabase) ជាជាងយក Time ពី Device ផ្ទាល់។
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-card border border-slate-100 p-5 space-y-3">
              <h3 className="font-bold text-amber-600 flex items-center gap-2">
                <MapPin className="w-5 h-5" /> ការពារទីតាំងក្លែងក្លាយ (Anti-Fake GPS)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                ប្រព័ន្ធប្រើប្រាស់នូវ <strong>HTML5 Geolocation API</strong> ប្រកបដោយ Accuracy ខ្ពស់។ យើងប្រើប្រាស់រូបមន្ត <strong>Haversine Formula</strong> គណនាចម្ងាយដោយឡែកពី API Maps ផ្សេងៗ។ 
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-card border border-slate-100 p-5 space-y-3">
              <h3 className="font-bold text-emerald-600 flex items-center gap-2">
                <Camera className="w-5 h-5" /> កាមេរ៉ាផ្ទាល់ (Live Self-Verification)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                មិនអនុញ្ញាតឱ្យប្រើ <code>&lt;input type="file" /&gt;</code> ឡើយ ដើម្បីហាមការ Upload រូបកាត់តចូល។ យើងបញ្ជាយកត្រឹមតែកាមេរ៉ាមុខ (Front Face Camera) ផ្ទាល់ (<code>navigator.mediaDevices.getUserMedia</code>) ដោយទាញចេញជាផ្ទាំង Canvas Base64 រួចទើបបម្លែងអាប់ឡូតទៅកាន់ Cloud Storage។
              </p>
            </div>

            {/* Admin Link */}
            <div className="relative bg-slate-900 rounded-3xl shadow-card border border-slate-800 p-6 mt-6 text-white text-center overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/30 rounded-full blur-3xl" />
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center mb-3 relative">
                <ShieldCheck className="w-6 h-6 text-brand-300" />
              </div>
              <h3 className="font-bold relative">សម្រាប់អ្នកគ្រប់គ្រង (Admin)</h3>
              <p className="text-sm text-slate-400 font-medium mt-1 mb-4 relative">ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធ ដើម្បីកំណត់ទីតាំង និង Telegram។</p>
              <Link href="/admin" className="relative inline-flex items-center justify-center gap-2 px-6 py-3 brand-gradient hover:opacity-90 text-white font-semibold rounded-xl shadow-glow-brand transition w-full">
                 <Settings className="w-5 h-5" /> ចូលផ្ទាំងអ្នកគ្រប់គ្រង
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* FULLSCREEN CAMERA OVERLAY */}
      {actionType && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col slide-in-from-bottom-full animate-in duration-300">
           <div className="p-4 flex items-center justify-between text-white font-medium bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
              <span>{actionType === 'IN' ? 'ឆែកចូល (Check IN)' : 'ឆែកចេញ (Check OUT)'} - ថតរូបផ្ទៀងផ្ទាត់</span>
              <button onClick={() => { stopCamera(); setActionType(null); setPhoto(null); }} className="p-2 bg-white/20 rounded-full hover:bg-white/30 backdrop-blur">
                 <X className="w-5 h-5" />
              </button>
           </div>
           
           <div className="relative flex-1 bg-slate-900 overflow-hidden flex items-center justify-center">
             {!photo ? (
               <>
                 {/* Video mirror view */}
                 <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline 
                   muted 
                   className="object-cover w-full h-full transform -scale-x-100" 
                 />
                 <canvas ref={canvasRef} className="hidden" />
                 
                 {/* Face Guide Overlay */}
                 <div className="absolute inset-0 border-[10vw] border-black/40 pointer-events-none">
                    <div className="w-full h-full border-2 border-dashed border-white/50 rounded-[4rem]"></div>
                 </div>
               </>
             ) : (
                <img src={photo} alt="Captured" className="object-cover w-full h-full" />
             )}
           </div>
           
           {/* Camera Bottom Constraints */}
           <div className="bg-black text-white p-8 pb-12 flex flex-col items-center justify-center gap-6">
              {!photo ? (
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center ring-4 ring-white/30 active:scale-95 transition-transform"
                >
                  <div className="w-16 h-16 bg-white border-2 border-black rounded-full"></div>
                </button>
              ) : (
                <div className="w-full max-w-sm flex flex-col gap-4">
                  {/* AI verification status banner */}
                  {faceStatus === 'verifying' && (
                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/10 text-brand-200 font-semibold text-sm">
                      <Loader2 className="w-5 h-5 animate-spin" /> កំពុងផ្ទៀងផ្ទាត់មុខ (AI)...
                    </div>
                  )}
                  {faceStatus === 'matched' && (
                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500/20 text-emerald-300 font-semibold text-sm border border-emerald-400/30">
                      <ScanFace className="w-5 h-5" /> ស្គាល់៖ {matchedEmployee?.name || 'បុគ្គលិក'}{faceConfidence !== null ? ` · ${faceConfidence}%` : ''} ✓
                    </div>
                  )}
                  {faceStatus === 'failed' && (
                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-500/20 text-red-300 font-semibold text-sm border border-red-400/30 text-center">
                      <AlertTriangle className="w-5 h-5 shrink-0" /> រកមិនឃើញបុគ្គលិក — មុខមិនត្រូវនឹងអ្នកណាម្នាក់ ឬមិនច្បាស់។ សូមថតម្ដងទៀត
                    </div>
                  )}

                  {/* Substitution picker (only when a face is matched) */}
                  {faceStatus === 'matched' && allEmployees.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                        <RefreshCw className="w-3.5 h-3.5" /> ការជំនួស (បើមកជំនួសគេ)
                      </label>
                      <select
                        value={substituteFor}
                        onChange={(e) => setSubstituteFor(e.target.value)}
                        className="w-full bg-slate-800 text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">ខ្លួនឯង (មិនជំនួស)</option>
                        {allEmployees
                          .filter((e) => e.code !== matchedEmployee?.code)
                          .map((e) => (
                            <option key={e.code} value={e.code}>ជំនួសឱ្យ {e.name} ({e.code})</option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={retakePhoto}
                      className="flex-1 py-4 bg-slate-800 rounded-2xl font-bold flex items-center justify-center gap-2"
                    >
                      ថតម្ដងទៀត
                    </button>
                    <button
                      onClick={() => submitAttendance('camera')}
                      disabled={faceStatus !== 'matched'}
                      className="flex-1 py-4 bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400 rounded-2xl font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                      យល់ព្រម <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* FULLSCREEN QR OVERLAY */}
      {qrActionType && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col slide-in-from-bottom-full animate-in duration-300">
           <div className="p-4 flex items-center justify-between text-white font-medium bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
              <span>{qrActionType === 'IN' ? 'ឆែកចូល (Check IN)' : 'ឆែកចេញ (Check OUT)'} - {scanKind === 'card' ? 'ស្កេនកាតបុគ្គលិក' : 'ស្កេន QR'}</span>
              <button onClick={() => setQrActionType(null)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 backdrop-blur">
                 <X className="w-5 h-5" />
              </button>
           </div>

           <div className="flex-1 flex flex-col items-center justify-center">
               <div className="w-[80vw] h-[80vw] max-w-sm max-h-sm overflow-hidden rounded-3xl border-4 border-indigo-500 bg-slate-900">
                   <Scanner onScan={handleQRScan} />
               </div>
           </div>

           <div className="bg-black text-white p-8 pb-12 flex flex-col items-center justify-center text-sm text-center">
              {scanKind === 'card' ? <CreditCard className="w-8 h-8 mb-4 text-indigo-400" /> : <QrCode className="w-8 h-8 mb-4 text-indigo-400" />}
              {scanKind === 'card' ? 'ស្កេនកាត QR របស់បុគ្គលិក ដើម្បីចុះវត្តមាន។' : 'ស្វែងរក QR Code របស់ការិយាល័យដើម្បីស្កេននិងផ្ទៀងផ្ទាត់វត្តមានរបស់អ្នក។'}
           </div>
        </div>
      )}

      {/* FULLSCREEN NFC OVERLAY */}
      {nfcScanning && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white px-6">
          <button onClick={() => setNfcScanning(null)} className="absolute top-4 right-4 p-2 bg-white/15 rounded-full"><X className="w-5 h-5" /></button>
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-brand-500/40 animate-pulse-ring" />
            <div className="w-28 h-28 rounded-full brand-gradient flex items-center justify-center shadow-glow-brand relative"><Nfc className="w-12 h-12" /></div>
          </div>
          <h3 className="mt-8 text-lg font-bold">{nfcScanning === 'IN' ? 'ឆែកចូល' : 'ឆែកចេញ'} — ប៉ះកាត NFC</h3>
          <p className="text-sm text-slate-400 mt-2 text-center">សូមប៉ះកាត NFC របស់បុគ្គលិកទៅខាងក្រោយទូរស័ព្ទ...</p>
          <Loader2 className="w-6 h-6 animate-spin text-brand-300 mt-6" />
        </div>
      )}

      {/* Bottom Tab Navigation */}
      <nav className="border-t border-slate-200/70 glass px-6 py-2.5 flex justify-between items-center fixed bottom-0 w-full z-40 pb-safe">
        {([
          { id: 'attend', icon: MapPin, label: 'បញ្ជិកា' },
          { id: 'history', icon: HistoryIcon, label: 'ប្រវត្តិ' },
          { id: 'info', icon: Info, label: 'ព័ត៌មាន' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-1 w-1/3 transition-colors ${activeTab === id ? 'text-brand-600' : 'text-slate-400'}`}
          >
            <div className={`${activeTab === id ? 'brand-gradient text-white shadow-glow-brand' : 'bg-transparent'} px-4 py-1.5 rounded-full transition-all`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold">{label}</span>
          </button>
        ))}
      </nav>

      {/* FACE ENROLLMENT MODAL */}
      {showEnroll && (
        <FaceEnroll
          userId={currentUserId}
          userName={employee?.name || ''}
          onClose={() => setShowEnroll(false)}
          onEnrolled={(rec) => {
            setEnrollment(rec);
            setShowEnroll(false);
            setSuccessMessage('ចុះឈ្មោះមុខបានជោគជ័យ! ឥឡូវអ្នកអាចចូល/ចេញធ្វើការបាន។');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2500);
          }}
        />
      )}

      {/* SUCCESS ANIMATION OVERLAY */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-white rounded-3xl p-8 flex flex-col items-center justify-center max-w-sm w-full shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-800 text-center mb-2">ជោគជ័យ!</h3>
              <p className="text-slate-600 text-center text-sm font-medium leading-relaxed">
                {successMessage}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
