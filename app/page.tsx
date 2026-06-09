'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, MapPin, Clock, History as HistoryIcon, ShieldCheck, UserCheck, CheckCircle2, XCircle, RefreshCw, Info, AlertTriangle, SwitchCamera, Navigation, Image as ImageIcon, X, QrCode, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Link from 'next/link';

const MapComponent = dynamic(() => import('../components/Map'), { ssr: false });

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
  const [verifyMethod, setVerifyMethod] = useState<'camera' | 'qr'>('camera');
  const [qrActionType, setQrActionType] = useState<'IN' | 'OUT' | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Mock History
  const [history, setHistory] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [tgUser, setTgUser] = useState<{name: string, id: string | null}>({name: 'ភ្ញៀវអនាមិក (Guest)', id: null});

  // Real-time clock update & History Load
  useEffect(() => {
    setIsClient(true);
    
    // Telegram Web App init
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
        const user = (window as any).Telegram.WebApp.initDataUnsafe.user;
        setTgUser({
           name: `${user.first_name} ${user.last_name || ''}`.trim(),
           id: user.id
        });
        (window as any).Telegram.WebApp.ready();
    }
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    try {
      const storedHistory = localStorage.getItem('secure_attend_history');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }

      const storedCoordsStr = localStorage.getItem('secure_attend_office_coords');
      if (storedCoordsStr) {
        const storedCoords = JSON.parse(storedCoordsStr);
        if (storedCoords.lat && storedCoords.lng) {
          setOfficeCoords({ lat: parseFloat(storedCoords.lat), lng: parseFloat(storedCoords.lng) });
        }
        if (storedCoords.radius) {
          setAllowedRadius(parseFloat(storedCoords.radius));
        }
      }
    } catch (e) {
      console.error("Failed to load local storage data:", e);
    }
    
    return () => clearInterval(timer);
  }, []);

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
    setActionType(type);
    setPhoto(null);
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

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
       const video = videoRef.current;
       const canvas = canvasRef.current;
       // Match source dimensions for high quality
       canvas.width = video.videoWidth || 640;
       canvas.height = video.videoHeight || 480;
       const ctx = canvas.getContext('2d');
       if (ctx) {
         // Mirror the canvas so it acts like a real selfie mirror
         ctx.translate(canvas.width, 0);
         ctx.scale(-1, 1);
         ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
         const photoData = canvas.toDataURL('image/jpeg', 0.85);
         setPhoto(photoData);
         stopCamera();
       }
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    openCameraFlow(actionType!);
  };

  const submitAttendance = async (methodParam: 'camera' | 'qr' | any = 'camera', payloadData: string | null = null) => {
    const method = methodParam === 'qr' ? 'qr' : 'camera';
    const actType = method === 'camera' ? actionType : qrActionType;
    if (!actType) return;
    if (method === 'camera' && !photo && !payloadData) return;
    
    // Simulate current logged in user
    const currentEmployeeName = tgUser.name; 

    const newEntry = {
      id: Date.now(),
      type: actType,
      time: new Date().toISOString(),
      distance: distance?.toFixed(1) || '0',
      photo: method === 'camera' ? (payloadData || photo) : null,
      method: method
    };
    
    const updatedHistory = [newEntry, ...history].slice(0, 50); // Keep last 50 entries
    setHistory(updatedHistory);
    
    try {
      localStorage.setItem('secure_attend_history', JSON.stringify(updatedHistory));
      
      // Notify Telegram
      await fetch('/api/notify-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: currentEmployeeName,
          actionType: newEntry.type,
          time: newEntry.time,
          distance: newEntry.distance
        })
      });
    } catch (e) {
      console.error("Failed to save history or notify Telegram:", e);
    }
    
    const msg = `កំណត់ត្រា ${actType === 'IN' ? 'ចូលធ្វើការ' : 'ចេញពីធ្វើការ'} ត្រូវបានរក្សាទុកដោយជោគជ័យ! (ព្រមទាំងបានជូនដំណឹងទៅ Telegram)`;
    setSuccessMessage(msg);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2500);

    setPhoto(null);
    setActionType(null);
    setQrActionType(null);
  };

  const handleQRScan = (results: any) => {
     if (!results || results.length === 0) return;
     const text = results[0]?.rawValue || results[0]?.text || results?.text || results;
     if (typeof text !== 'string') return;

     if (text === 'SECURE_ATTEND_OFFICE_QR_2026') {
         submitAttendance('qr', text);
     } else {
         alert('QR Code មិនត្រឹមត្រូវទេ! (តម្រូវឲ្យស្កេន QR ការិយាល័យ)');
         setQrActionType(null);
     }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 font-sans text-slate-900 pb-16 safe-area-bottom">
      {/* Top App Header */}
      <header className="bg-indigo-600 text-white p-4 shadow-md z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-200" />
          <h1 className="text-lg font-bold">SecureAttend</h1>
        </div>
        <div className="text-sm font-medium opacity-90 flex items-center gap-2">
          <UserCheck className="w-4 h-4 opacity-70" />
          {tgUser.name}
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto h-full sm:pt-4">
        {/* TAB 1: ATTENDANCE */}
        {activeTab === 'attend' && (
          <div className="p-4 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Clock Widget */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <Clock className="w-8 h-8 text-indigo-500 mb-2" />
              <div className="text-4xl font-extrabold text-slate-800 tracking-tight font-mono">
                {isClient ? currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
              </div>
              <div className="text-slate-500 mt-1 text-sm font-medium">
                {isClient ? currentTime.toLocaleDateString('km-KH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'កំពុងផ្ទុក...'}
              </div>
            </div>

            {/* Geofence Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-500" /> ទីតាំងរបស់អ្នក
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

            {/* Verification Method Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl mt-2">
               <button onClick={() => setVerifyMethod('camera')} className={`flex-1 py-2.5 flex justify-center items-center gap-2 text-sm font-bold rounded-lg transition-colors ${verifyMethod === 'camera' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
                  <Camera className="w-4 h-4" /> ថតមុខ (Selfie)
               </button>
               <button onClick={() => setVerifyMethod('qr')} className={`flex-1 py-2.5 flex justify-center items-center gap-2 text-sm font-bold rounded-lg transition-colors ${verifyMethod === 'qr' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
                  <QrCode className="w-4 h-4" /> ស្កេន QR
               </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mt-2">
              <button 
                disabled={!isWithinRadius}
                onClick={() => verifyMethod === 'camera' ? openCameraFlow('IN') : setQrActionType('IN')}
                className="bg-emerald-600 text-white disabled:bg-slate-300 disabled:text-slate-500 py-4 rounded-2xl font-bold shadow-sm shadow-emerald-600/20 active:scale-95 transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="bg-white/20 p-2 rounded-full"><UserCheck className="w-6 h-6" /></div>
                ចូលធ្វើការ (IN)
              </button>

              <button 
                disabled={!isWithinRadius}
                onClick={() => verifyMethod === 'camera' ? openCameraFlow('OUT') : setQrActionType('OUT')}
                className="bg-amber-500 text-white disabled:bg-slate-300 disabled:text-slate-500 py-4 rounded-2xl font-bold shadow-sm shadow-amber-500/20 active:scale-95 transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="bg-black/10 p-2 rounded-full"><Clock className="w-6 h-6" /></div>
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
                {history.map((record) => (
                  <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail Placeholder representing stored photo */}
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative break-inside-avoid flex items-center justify-center">
                        {record.method === 'qr' ? (
                           <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                              <QrCode className="w-6 h-6" />
                           </div>
                        ) : record.photo ? (
                          <img src={record.photo} alt="Verification" className="object-cover w-full h-full" /> 
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${record.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                             {record.type}
                           </span>
                           <span className="font-bold text-slate-700">
                             {new Date(record.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{new Date(record.time).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500 inline-block mb-1" />
                       <div className="text-[10px] text-slate-400">{record.distance}m</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INFO / SECURITY SPECS */}
        {activeTab === 'info' && (
          <div className="p-4 space-y-4 pb-10 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-2 px-2">ស្ថាបត្យកម្មប្រព័ន្ធ (Architecture)</h2>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <h3 className="font-bold text-indigo-700 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> ការពារការបន្លំម៉ោង (Anti-Cheat Time)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                ដើម្បីទប់ស្កាត់ការបន្លំម៉ោង (Fake Clock)៖ បច្ចុប្បន្ន Time ដែលឃើញលើអេក្រង់គឺគ្រាន់តែសម្រាប់បង្ហាញ។ នៅពេលចុច Submit, Frontend ទាញទិន្នន័យបញ្ជូនទៅ Database (e.g., Firebase), ប៉ុន្តែ Database ត្រូវតែប្រើ <strong>Server-Side Timestamp</strong> (ដូចជា <code>serverTimestamp()</code> ក្នុង Firestore ឬ <code>now()</code> ក្នុង Supabase) ជាជាងយក Time ពី Device ផ្ទាល់។
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <h3 className="font-bold text-amber-600 flex items-center gap-2">
                <MapPin className="w-5 h-5" /> ការពារទីតាំងក្លែងក្លាយ (Anti-Fake GPS)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                ប្រព័ន្ធប្រើប្រាស់នូវ <strong>HTML5 Geolocation API</strong> ប្រកបដោយ Accuracy ខ្ពស់។ យើងប្រើប្រាស់រូបមន្ត <strong>Haversine Formula</strong> គណនាចម្ងាយដោយឡែកពី API Maps ផ្សេងៗ។ 
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <h3 className="font-bold text-emerald-600 flex items-center gap-2">
                <Camera className="w-5 h-5" /> កាមេរ៉ាផ្ទាល់ (Live Self-Verification)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                មិនអនុញ្ញាតឱ្យប្រើ <code>&lt;input type="file" /&gt;</code> ឡើយ ដើម្បីហាមការ Upload រូបកាត់តចូល។ យើងបញ្ជាយកត្រឹមតែកាមេរ៉ាមុខ (Front Face Camera) ផ្ទាល់ (<code>navigator.mediaDevices.getUserMedia</code>) ដោយទាញចេញជាផ្ទាំង Canvas Base64 រួចទើបបម្លែងអាប់ឡូតទៅកាន់ Cloud Storage។
              </p>
            </div>

            {/* Admin Link */}
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-5 mt-6 text-white text-center">
              <ShieldCheck className="w-8 h-8 mx-auto text-indigo-400 mb-2" />
              <h3 className="font-bold">សម្រាប់អ្នកគ្រប់គ្រង (Admin)</h3>
              <p className="text-sm text-slate-400 font-medium mt-1 mb-4">ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធ ដើម្បីកំណត់ទីតាំង និង Telegram។</p>
              <Link href="/admin" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition w-full">
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
                <div className="w-full max-w-sm flex gap-4">
                  <button 
                    onClick={retakePhoto}
                    className="flex-1 py-4 bg-slate-800 rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    ថតផ្ដើមម្ដងទៀត
                  </button>
                  <button 
                    onClick={() => submitAttendance('camera')}
                    className="flex-1 py-4 bg-emerald-600 rounded-2xl font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    យល់ព្រម <CheckCircle2 className="w-5 h-5" />
                  </button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* FULLSCREEN QR OVERLAY */}
      {qrActionType && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col slide-in-from-bottom-full animate-in duration-300">
           <div className="p-4 flex items-center justify-between text-white font-medium bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
              <span>{qrActionType === 'IN' ? 'ឆែកចូល (Check IN)' : 'ឆែកចេញ (Check OUT)'} - ស្កេន QR</span>
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
              <QrCode className="w-8 h-8 mb-4 text-indigo-400" />
              ស្វែងរក QR Code របស់ការិយាល័យដើម្បីស្កេននិងផ្ទៀងផ្ទាត់វត្តមានរបស់អ្នក។
           </div>
        </div>
      )}

      {/* Bottom Tab Navigation */}
      <nav className="border-t border-slate-200 bg-white px-6 py-3 flex justify-between items-center fixed bottom-0 w-full z-40 pb-safe">
        <button 
          onClick={() => setActiveTab('attend')} 
          className={`flex flex-col items-center gap-1 w-1/3 transition-colors ${activeTab === 'attend' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`${activeTab === 'attend' ? 'bg-indigo-100' : 'bg-transparent'} p-1.5 rounded-full transition-colors`}>
            <MapPin className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold">បញ្ជិកា</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('history')} 
          className={`flex flex-col items-center gap-1 w-1/3 transition-colors ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`${activeTab === 'history' ? 'bg-indigo-100' : 'bg-transparent'} p-1.5 rounded-full transition-colors`}>
            <HistoryIcon className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold">ប្រវត្តិ</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('info')} 
          className={`flex flex-col items-center gap-1 w-1/3 transition-colors ${activeTab === 'info' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`${activeTab === 'info' ? 'bg-indigo-100' : 'bg-transparent'} p-1.5 rounded-full transition-colors`}>
            <Info className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold">ព័ត៌មាន</span>
        </button>
      </nav>

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
