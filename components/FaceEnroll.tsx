'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, ScanFace, Camera, RefreshCw, CheckCircle2, Loader2, Cloud, Smartphone, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getFaceDescriptor, loadFaceModels } from '@/lib/face';
import {
  FaceEnrollment,
  saveLocalEnrollment,
  saveCloudEnrollment,
} from '@/lib/faceStore';

type StorageChoice = 'local' | 'cloud' | 'both';
type Step = 'camera' | 'processing' | 'review' | 'saving';

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
  onEnrolled: (rec: FaceEnrollment) => void;
}

export default function FaceEnroll({ userId, userName, onClose, onEnrolled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>('camera');
  const [modelLoading, setModelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [storage, setStorage] = useState<StorageChoice>('both');

  // Warm up the AI models as soon as the modal opens.
  useEffect(() => {
    loadFaceModels()
      .then(() => setModelLoading(false))
      .catch(() => {
        setModelLoading(false);
        setError('មិនអាចផ្ទុក AI Models បានទេ។ សូមពិនិត្យបណ្ដាញ ឬ refresh ម្ដងទៀត។');
      });
  }, []);

  // Manage the camera stream.
  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError('មិនអាចបើកកាមេរ៉ាបានទេ! សូមអនុញ្ញាតសិទ្ធិប្រើ Camera។');
      }
    }
    if (step === 'camera') start();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopCamera(), []);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return;
    setError(null);
    setStep('processing');

    const video = videoRef.current;
    // Snapshot for the thumbnail (mirrored to feel like a selfie).
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    const thumb = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const desc = await getFaceDescriptor(video);
      if (!desc) {
        setError('រកមុខមិនឃើញ! សូមដាក់មុខឱ្យចំ និងមានពន្លឺគ្រប់គ្រាន់។');
        setStep('camera');
        return;
      }
      setDescriptor(Array.from(desc));
      setPhoto(thumb);
      stopCamera();
      setStep('review');
    } catch {
      setError('មានបញ្ហាក្នុងការវិភាគមុខ។ សូមសាកល្បងម្ដងទៀត។');
      setStep('camera');
    }
  };

  const retake = () => {
    setPhoto(null);
    setDescriptor(null);
    setError(null);
    setStep('camera');
  };

  const save = async () => {
    if (!descriptor) return;
    setStep('saving');
    const rec: FaceEnrollment = {
      userId,
      name: userName,
      descriptor,
      photo: photo || '',
      createdAt: new Date().toISOString(),
    };

    if (storage === 'local' || storage === 'both') saveLocalEnrollment(rec);
    if (storage === 'cloud' || storage === 'both') {
      rec.syncedToCloud = await saveCloudEnrollment(rec);
    }
    onEnrolled(rec);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-sm flex flex-col text-white">
      {/* Header */}
      <div className="px-4 py-3.5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-glow-brand">
            <ScanFace className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <h2 className="text-base font-bold">ចុះឈ្មោះមុខ</h2>
            <p className="text-[11px] text-slate-400 -mt-0.5">Face Registration</p>
          </div>
        </div>
        <button onClick={handleClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 overflow-y-auto">
        {/* Camera / processing view */}
        {(step === 'camera' || step === 'processing') && (
          <div className="w-full max-w-sm flex flex-col items-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden ring-4 ring-brand-500/40 bg-slate-900">
              <video ref={videoRef} autoPlay playsInline muted className="object-cover w-full h-full -scale-x-100" />
              {/* scan ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/30 animate-[spin_8s_linear_infinite]" />
              {step === 'processing' && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-300" />
                  <span className="text-sm font-medium">កំពុងវិភាគមុខ...</span>
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                ដាក់មុខរបស់អ្នកឱ្យចំក្នុងរង្វង់ ក្នុងកន្លែងមានពន្លឺល្អ
              </p>
              {modelLoading && (
                <p className="text-xs text-brand-300 mt-2 flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> កំពុងផ្ទុក AI Models...
                </p>
              )}
            </div>

            {error && (
              <div className="mt-4 w-full p-3 bg-red-500/15 text-red-300 rounded-xl text-sm flex gap-2 items-start border border-red-500/20">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="font-medium leading-tight">{error}</span>
              </div>
            )}

            <button
              onClick={captureAndAnalyze}
              disabled={modelLoading || step === 'processing'}
              className="mt-7 w-full brand-gradient disabled:opacity-50 py-4 rounded-2xl font-bold shadow-glow-brand active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" /> ថត និងវិភាគមុខ
            </button>
          </div>
        )}

        {/* Review + storage choice */}
        {(step === 'review' || step === 'saving') && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <div className="relative w-40 h-40 rounded-full overflow-hidden ring-4 ring-emerald-400/50">
              {photo && <img src={photo} alt="មុខ" className="object-cover w-full h-full" />}
              <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-slate-950">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <h3 className="mt-5 text-lg font-bold">មុខត្រូវបានវិភាគជោគជ័យ</h3>
            <p className="text-sm text-slate-400 mt-1 text-center">ជ្រើសរើសកន្លែងរក្សាទុកទិន្នន័យមុខរបស់អ្នក</p>

            {/* Storage choice */}
            <div className="mt-5 w-full space-y-2.5">
              {([
                { id: 'both', icon: ShieldCheck, title: 'ទាំងពីរ (ណែនាំ)', desc: 'រក្សាលើទូរស័ព្ទ + Cloud — ប្រើបានគ្រប់ device' },
                { id: 'local', icon: Smartphone, title: 'លើទូរស័ព្ទ', desc: 'រក្សាក្នុង device នេះតែប៉ុណ្ណោះ (Private)' },
                { id: 'cloud', icon: Cloud, title: 'Cloud', desc: 'រក្សាក្នុង database — ប្រើបានគ្រប់ device' },
              ] as const).map(({ id, icon: Icon, title, desc }) => (
                <button
                  key={id}
                  onClick={() => setStorage(id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition ${
                    storage === id
                      ? 'bg-brand-500/15 border-brand-400/50 ring-1 ring-brand-400/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${storage === id ? 'brand-gradient' : 'bg-white/10'}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{title}</p>
                    <p className="text-[11px] text-slate-400 leading-tight">{desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${storage === id ? 'border-brand-400 bg-brand-500' : 'border-white/30'}`}>
                    {storage === id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 w-full flex gap-3">
              <button
                onClick={retake}
                disabled={step === 'saving'}
                className="flex-1 py-3.5 bg-white/10 hover:bg-white/15 rounded-2xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" /> ថតម្ដងទៀត
              </button>
              <button
                onClick={save}
                disabled={step === 'saving'}
                className="flex-1 py-3.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl font-bold text-white shadow-glow-emerald active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {step === 'saving' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> កំពុងរក្សាទុក</>
                ) : (
                  <><CheckCircle2 className="w-5 h-5" /> រក្សាទុក</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
