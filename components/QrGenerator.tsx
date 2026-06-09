'use client';
import React, { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, RefreshCw, Loader2, CheckCircle2, Printer, ShieldCheck } from 'lucide-react';

export default function QrGenerator() {
  const [secret, setSecret] = useState<string>('');
  const [label, setLabel] = useState<string>('ការិយាល័យ');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const renderQr = useCallback(async (value: string) => {
    if (!value) return;
    try {
      const url = await QRCode.toDataURL(value, {
        width: 640,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#1e1b4b', light: '#ffffff' },
      });
      setQrDataUrl(url);
    } catch (e) {
      console.error('QR render failed:', e);
    }
  }, []);

  // Load current secret
  useEffect(() => {
    fetch('/api/qr-config')
      .then((res) => res.json())
      .then((data) => {
        setSecret(data.secret || '');
        if (data.label) setLabel(data.label);
        return renderQr(data.secret || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [renderQr]);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/qr-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true, label }),
      });
      const data = await res.json();
      setSecret(data.secret);
      await renderQr(data.secret);
    } catch (e) {
      console.error(e);
    } finally {
      setRegenerating(false);
    }
  };

  const download = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `SecureAttend-QR-${label || 'office'}.png`;
    a.click();
  };

  const printQr = () => {
    if (!qrDataUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>SecureAttend QR — ${label}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px;color:#1e1b4b}
      img{width:340px;height:340px}h1{margin:8px 0}p{color:#64748b}</style></head>
      <body><h1>🛡️ SecureAttend</h1><h2>${label}</h2>
      <img src="${qrDataUrl}" /><p>ស្កេន QR នេះ ដើម្បីកត់ត្រាវត្តមាន (Check-IN / OUT)</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const copySecret = () => {
    navigator.clipboard?.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">QR Code ការិយាល័យ</h2>
        <p className="text-slate-500 mt-1">បង្កើត QR Code សម្រាប់បុគ្គលិកស្កេនកត់ត្រាវត្តមាន។ ព្រីនវាដាក់នៅការិយាល័យ។</p>
      </header>

      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          {/* QR preview */}
          <div className="shrink-0">
            <div className="relative w-60 h-60 rounded-3xl bg-gradient-to-br from-brand-50 to-violet-50 border border-brand-100 p-4 flex items-center justify-center shadow-inner">
              {loading || !qrDataUrl ? (
                <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Office QR" className="w-full h-full rounded-xl" />
              )}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 brand-gradient text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-glow-brand flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {label}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 w-full space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ឈ្មោះទីតាំង (Label)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ឧ. ការិយាល័យកណ្ដាល"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">លេខសម្ងាត់ QR (Secret)</label>
              <button
                onClick={copySecret}
                className="w-full text-left px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-600 break-all hover:bg-slate-100 transition flex items-center justify-between gap-2"
              >
                <span className="truncate">{secret || '...'}</span>
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <span className="text-[10px] text-brand-600 shrink-0 font-sans font-semibold">ចម្លង</span>}
              </button>
              <p className="text-xs text-slate-500 mt-2">QR ចាស់នឹងលែងប្រើបាន បន្ទាប់ពីបង្កើតថ្មី (Regenerate)។</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={download}
                disabled={!qrDataUrl}
                className="flex items-center justify-center gap-2 px-4 py-2.5 brand-gradient hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-glow-brand"
              >
                <Download size={16} /> ទាញយក PNG
              </button>
              <button
                onClick={printQr}
                disabled={!qrDataUrl}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
              >
                <Printer size={16} /> ព្រីន
              </button>
            </div>
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition"
            >
              {regenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              បង្កើត QR ថ្មី (Regenerate)
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-4 p-4 bg-brand-50 text-brand-900 rounded-2xl border border-brand-100">
        <QrCode className="w-6 h-6 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold mb-1">របៀបប្រើ:</p>
          <ol className="list-decimal list-inside space-y-1 opacity-90">
            <li>ទាញយក ឬ ព្រីន QR Code នេះ</li>
            <li>បិទវានៅច្រកចូលការិយាល័យ</li>
            <li>បុគ្គលិកបើកកម្មវិធី ជ្រើស "ស្កេន QR" រួចស្កេន ដើម្បីកត់ត្រាវត្តមាន</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
