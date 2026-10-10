import React, { useState, useRef, useEffect } from 'react';
import { Upload, Lock, Unlock, RotateCcw } from 'lucide-react';

const QR_MATRIX_37: string[] = [
  '1111111011001110100101010111001111111',
  '1000001011011010000111000010001000001',
  '1011101000011011100110100101101011101',
  '1011101011101110011111111111001011101',
  '1011101011000100011110101101101011101',
  '1000001001110011001110011000101000001',
  '1111111010101010101010101010101111111',
  '0000000011001101011100101110100000000',
  '1110111110110100101110001100111011010',
  '0110110011010000111000100110000000111',
  '0011111011010100110001010000110111110',
  '0001110101100110001000100101110101100',
  '1011111010111010110001001000101110101',
  '1101110011111111000000001101110111000',
  '0010101001011000000000001010111000111',
  '1011110100110100000000001101100101100',
  '1111001010111000000000000001101001111',
  '0010011101001000000000001011100101101',
  '0000011011110000000000000110011110011',
  '0011010110101000000000000110111010011',
  '0110111011100000000000000001011100110',
  '1111110101010100000000001001010111100',
  '0100111011111100000000000000110010110',
  '1001100001111001100010100110011111010',
  '1101111010111011011111100010110101001',
  '1110000010001110101011101110111110010',
  '1011011100100100011101100111110111001',
  '0111000111101011100111001110110100110',
  '1100011001110010110011101010111110101',
  '0000000010001110100100111000100010001',
  '1111111010011101111010010111101011101',
  '1000001001000110100101010011100010000',
  '1011101001111111011010110010111110110',
  '1011101010111110010011101100001101011',
  '1011101011100101101101101110110000010',
  '1000001001100001100111110000111000110',
  '1111111010110100000110101111011101110',
];

const STORAGE_KEY_CUSTOM_QR = 'miraj_smm_custom_qr_image_v1';
const STORAGE_KEY_QR_LOCKED = 'miraj_smm_qr_locked_v1';
const OWNER_PIN = '6002191384';

export function PaymentQrCode({
  sizeClassName = 'w-64 h-64 sm:w-72 sm:h-72',
  showUploadControl = true,
}: {
  sizeClassName?: string;
  showUploadControl?: boolean;
}) {
  const [customQrDataUrl, setCustomQrDataUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CUSTOM_QR);
    } catch {
      return null;
    }
  });

  const [isLockedForCustomers, setIsLockedForCustomers] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_QR_LOCKED) === 'true';
    } catch {
      return false;
    }
  });

  const [showPinPrompt, setShowPinPrompt] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const syncQr = () => {
      try {
        setCustomQrDataUrl(localStorage.getItem(STORAGE_KEY_CUSTOM_QR));
        setIsLockedForCustomers(localStorage.getItem(STORAGE_KEY_QR_LOCKED) === 'true');
      } catch {
        // Ignore storage errors
      }
    };
    window.addEventListener('miraj-qr-updated', syncQr);
    return () => window.removeEventListener('miraj-qr-updated', syncQr);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomQrDataUrl(reader.result);
        try {
          localStorage.setItem(STORAGE_KEY_CUSTOM_QR, reader.result);
          window.dispatchEvent(new Event('miraj-qr-updated'));
        } catch {
          // Ignore storage quota errors
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetQr = () => {
    setCustomQrDataUrl(null);
    try {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_QR);
      window.dispatchEvent(new Event('miraj-qr-updated'));
    } catch {
      // Ignore storage errors
    }
  };

  const handleLockQr = () => {
    setIsLockedForCustomers(true);
    setShowPinPrompt(false);
    try {
      localStorage.setItem(STORAGE_KEY_QR_LOCKED, 'true');
      window.dispatchEvent(new Event('miraj-qr-updated'));
    } catch {
      // Ignore storage errors
    }
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === OWNER_PIN) {
      setIsLockedForCustomers(false);
      setShowPinPrompt(false);
      setPinInput('');
      setPinError(false);
      try {
        localStorage.setItem(STORAGE_KEY_QR_LOCKED, 'false');
        window.dispatchEvent(new Event('miraj-qr-updated'));
      } catch {
        // Ignore storage errors
      }
    } else {
      setPinError(true);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative rounded-2xl overflow-hidden border-2 border-amber-300 shadow-sm bg-[#ecc578] p-3 flex items-center justify-center ${sizeClassName}`}
      >
        {customQrDataUrl ? (
          <img
            src={customQrDataUrl}
            alt="MIRAJ SMM STORE Payment QR Code"
            className="w-full h-full object-contain rounded-lg"
          />
        ) : (
          <svg
            viewBox="0 0 39 39"
            className="w-full h-full"
            role="img"
            aria-label="MIRAJ SMM STORE Payment QR Code"
          >
            <rect x="0" y="0" width="39" height="39" fill="#ecc578" />
            <g transform="translate(1, 1)">
              {QR_MATRIX_37.map((rowStr, rIdx) =>
                rowStr.split('').map((cell, cIdx) => {
                  if (cell !== '1') return null;
                  return (
                    <rect
                      key={`${rIdx}-${cIdx}`}
                      x={cIdx}
                      y={rIdx}
                      width={1.03}
                      height={1.03}
                      fill="#080808"
                    />
                  );
                })
              )}
              <circle cx="18.5" cy="18.5" r="4.6" fill="#141414" />
              <path
                d="M16.2 15.6 L17.7 15.6 L20.8 21.4 L19.3 21.4 Z"
                fill="#f59e0b"
              />
              <path
                d="M19.3 15.6 L20.8 15.6 L17.7 21.4 L16.2 21.4 Z"
                fill="#fbbf24"
              />
            </g>
          </svg>
        )}
      </div>

      {showUploadControl && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!isLockedForCustomers ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[48px] px-5 py-2.5 text-base sm:text-lg font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>{customQrDataUrl ? 'Change QR Code' : 'Upload My QR Code'}</span>
              </button>

              {customQrDataUrl && (
                <>
                  <button
                    type="button"
                    onClick={handleLockQr}
                    className="min-h-[48px] px-5 py-2.5 text-base sm:text-lg font-extrabold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Lock className="w-5 h-5" />
                    <span>Save & Lock for Customers</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetQr}
                    className="min-h-[48px] px-4 py-2.5 text-base font-bold text-slate-700 hover:text-red-600 bg-slate-100 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>Reset</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {!showPinPrompt ? (
                <button
                  type="button"
                  onClick={() => setShowPinPrompt(true)}
                  className="text-sm sm:text-base font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer py-1.5"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Owner Edit QR</span>
                </button>
              ) : (
                <form onSubmit={handleUnlockSubmit} className="flex items-center gap-2 mt-1.5">
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinError(false);
                    }}
                    placeholder="Enter owner number"
                    className={`min-h-[44px] px-3.5 py-2 text-base rounded-lg border font-mono-tabular w-48 focus:outline-none ${
                      pinError ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'
                    }`}
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2 bg-blue-600 text-white text-base font-extrabold rounded-lg cursor-pointer"
                  >
                    Unlock
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
