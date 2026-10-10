/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  QrCode,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import {
  INSTAGRAM_LIKE_PACKAGES,
  INSTAGRAM_VIEW_PACKAGES,
  InstagramPackageTier,
  InstagramServiceType,
  PRICE_PER_1000_LIKES,
  PRICE_PER_1000_VIEWS,
  WHATSAPP_NUMBER,
} from './data/services';
import { PaymentQrCode } from './components/PaymentQrCode';

/**
 * Each UTR ID is stored as a completely separate individual payment record.
 * If someone pays ₹5 with UTR 123456789012, their balance for that UTR is strictly ₹5.
 */
interface IndividualUtrPayment {
  utr: string;
  paidAmount: number;
  remainingBalance: number;
  time: string;
}

const PAYMENT_AMOUNTS = [5, 10, 20, 25, 30, 40, 50, 75, 100];
const STORAGE_KEY_UTR_PAYMENTS = 'miraj_smm_individual_utr_payments_v1';

export default function App() {
  // Store separate individual UTR payments (not mixed together)
  const [utrPayments, setUtrPayments] = useState<IndividualUtrPayment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_UTR_PAYMENTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Currently active UTR ID whose separate balance is displayed on screen
  const [activeUtr, setActiveUtr] = useState<string>('');

  // Form inputs for adding/activating an individual UTR payment
  const [selectedPaidAmount, setSelectedPaidAmount] = useState<string>('5');
  const [utrInput, setUtrInput] = useState<string>('');
  const [utrLookupInput, setUtrLookupInput] = useState<string>('');
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);

  // Order Calculator State: Instagram Views or Instagram Likes
  const [selectedService, setSelectedService] = useState<InstagramServiceType>('Instagram Views');
  const [quantityInput, setQuantityInput] = useState<string>('5000');
  const [videoLink, setVideoLink] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedPreview, setCopiedPreview] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_UTR_PAYMENTS, JSON.stringify(utrPayments));
    } catch {
      // Ignore storage quota errors
    }
  }, [utrPayments]);

  // Find the active individual UTR payment record
  const activePaymentRecord = useMemo(() => {
    if (!activeUtr.trim()) return null;
    return (
      utrPayments.find((p) => p.utr.toLowerCase() === activeUtr.trim().toLowerCase()) || null
    );
  }, [utrPayments, activeUtr]);

  // The balance shown is strictly the individual payment's balance for the active UTR ID (₹0 if no UTR entered)
  const currentUtrBalance = activePaymentRecord ? activePaymentRecord.remainingBalance : 0;

  const isViews = selectedService === 'Instagram Views';
  const unitWord = isViews ? 'Views' : 'Likes';
  const ratePer1000 = isViews ? PRICE_PER_1000_VIEWS : PRICE_PER_1000_LIKES;
  const activePackages = isViews ? INSTAGRAM_VIEW_PACKAGES : INSTAGRAM_LIKE_PACKAGES;

  const numericPaidAmount = useMemo(() => {
    const parsed = parseFloat(selectedPaidAmount.replace(/[^0-9.]/g, ''));
    return Number.isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100) / 100;
  }, [selectedPaidAmount]);

  const numericQuantity = useMemo(() => {
    const cleaned = parseInt(quantityInput.replace(/[^0-9]/g, ''), 10);
    return Number.isNaN(cleaned) || cleaned < 0 ? 0 : cleaned;
  }, [quantityInput]);

  // Automatic Order Price calculation:
  // - Views: ₹1 per 1,000 (5K = ₹5, 10K = ₹10, 20K = ₹20...)
  // - Likes: ₹25 per 1,000 (1K = ₹25, 2K = ₹50, 3K = ₹75...)
  const calculatedPriceInr = useMemo(() => {
    if (numericQuantity <= 0) return 0;
    const rawPrice = (numericQuantity / 1000) * ratePer1000;
    return Math.max(1, Math.round(rawPrice * 100) / 100);
  }, [numericQuantity, ratePer1000]);

  const handleSwitchService = (serviceOption: InstagramServiceType) => {
    setSelectedService(serviceOption);
    setFormError(null);
    if (serviceOption === 'Instagram Likes') {
      setQuantityInput('1000'); // 1K Likes = ₹25
    } else {
      setQuantityInput('5000'); // 5K Views = ₹5
    }
  };

  const handlePriceInputChange = (rupeesValue: string) => {
    const cleanedRupees = parseFloat(rupeesValue.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(cleanedRupees) || cleanedRupees <= 0) {
      setQuantityInput('');
      return;
    }
    const calculatedQty = Math.round((cleanedRupees / ratePer1000) * 1000);
    setQuantityInput(String(calculatedQty));
    if (formError) setFormError(null);
  };

  const handleSelectPackage = (pkg: InstagramPackageTier) => {
    setSelectedService(pkg.service);
    setQuantityInput(String(pkg.quantity));
    setFormError(null);
    const orderEl = document.getElementById('order-box');
    if (orderEl) {
      orderEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Submit UTR ID after QR Payment -> Sets that individual UTR's balance to the exact amount paid (e.g. ₹5 -> Balance: ₹5)
  const handleVerifyUtrPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrInput.trim();
    if (!cleanUtr) {
      setDepositError('Please enter your Payment UTR ID to show your balance.');
      return;
    }
    if (numericPaidAmount < 5) {
      setDepositError('Minimum payment amount is ₹5.');
      return;
    }

    setDepositError(null);

    const existingIndex = utrPayments.findIndex(
      (item) => item.utr.toLowerCase() === cleanUtr.toLowerCase()
    );

    const record: IndividualUtrPayment = {
      utr: cleanUtr,
      paidAmount: numericPaidAmount,
      remainingBalance: numericPaidAmount,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (existingIndex >= 0) {
      setUtrPayments((prev) => {
        const copy = [...prev];
        copy[existingIndex] = record;
        return copy;
      });
    } else {
      setUtrPayments((prev) => [record, ...prev]);
    }

    // Activate this individual UTR so the balance shows ONLY this person's payment (e.g. ₹5)
    setActiveUtr(cleanUtr);
    setDepositSuccessMsg(
      `UTR ID ${cleanUtr} verified! Your individual balance is ₹${numericPaidAmount.toLocaleString('en-IN')}.`
    );

    // Also auto-match order quantity to their paid amount so they can order immediately
    const matchedViewsOrLikes = Math.round((numericPaidAmount / ratePer1000) * 1000);
    if (matchedViewsOrLikes >= 1000) {
      setQuantityInput(String(matchedViewsOrLikes));
    }

    setUtrInput('');
  };

  // Look up an existing UTR ID to view its separate balance
  const handleCheckUtrBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLookup = utrLookupInput.trim();
    if (!cleanLookup) return;

    const found = utrPayments.find(
      (item) => item.utr.toLowerCase() === cleanLookup.toLowerCase()
    );
    if (found) {
      setActiveUtr(found.utr);
      setDepositError(null);
      setDepositSuccessMsg(
        `Showing balance for UTR ID ${found.utr}: ₹${found.remainingBalance.toLocaleString('en-IN')}`
      );
    } else {
      setDepositError(
        `UTR ID "${cleanLookup}" not found yet. Enter the amount you paid and your UTR ID above to activate your balance.`
      );
    }
  };

  // Pre-filled WhatsApp message containing Service, Quantity, Video Link, Total Price, and UTR ID
  const whatsappMessage = useMemo(() => {
    const formattedQty =
      numericQuantity > 0
        ? `${numericQuantity.toLocaleString('en-IN')} ${unitWord}`
        : `0 ${unitWord}`;
    const cleanLink = videoLink.trim() || '(Link not entered yet)';
    const utrLine = activePaymentRecord
      ? `UTR ID: ${activePaymentRecord.utr} (Balance: ₹${activePaymentRecord.remainingBalance.toLocaleString('en-IN')})\n`
      : utrInput.trim()
      ? `UTR ID: ${utrInput.trim()}\n`
      : `Payment: Paid ₹${calculatedPriceInr.toLocaleString('en-IN')} via QR Code\n`;

    return (
      `Hello MIRAJ SMM STORE, please confirm my Instagram order:\n\n` +
      `Service: ${selectedService}\n` +
      `Quantity: ${formattedQty}\n` +
      `Video Link: ${cleanLink}\n` +
      `Total Price: ₹${calculatedPriceInr.toLocaleString('en-IN')}\n` +
      utrLine +
      `\nPlease confirm my order.`
    );
  }, [
    selectedService,
    numericQuantity,
    unitWord,
    videoLink,
    calculatedPriceInr,
    activePaymentRecord,
    utrInput,
  ]);

  const whatsappUrl = useMemo(() => {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
  }, [whatsappMessage]);

  const validateOrderForm = (): boolean => {
    if (numericQuantity < 1000) {
      setFormError(`Minimum order quantity is 1,000 ${unitWord} (₹${ratePer1000}).`);
      return false;
    }

    const trimmedLink = videoLink.trim();
    if (!trimmedLink) {
      setFormError('Please paste your public Instagram Reel or post link.');
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleOpenPaymentStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOrderForm()) return;

    // If user already has an active UTR with enough balance, deduct from that UTR's separate balance and confirm
    if (activePaymentRecord && activePaymentRecord.remainingBalance >= calculatedPriceInr) {
      handleFinalConfirmOrder();
    } else {
      // Otherwise open the QR + UTR popup
      setSelectedPaidAmount(String(calculatedPriceInr));
      setShowQrModal(true);
    }
  };

  const handleFinalConfirmOrder = () => {
    if (!validateOrderForm()) return;

    // If user entered a UTR inside the modal, save/activate that individual UTR payment first
    const modalUtr = utrInput.trim();
    if (modalUtr) {
      const remainingAfterOrder = Math.max(
        0,
        Math.round((numericPaidAmount - calculatedPriceInr) * 100) / 100
      );
      const newRec: IndividualUtrPayment = {
        utr: modalUtr,
        paidAmount: numericPaidAmount || calculatedPriceInr,
        remainingBalance: remainingAfterOrder,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setUtrPayments((prev) => [
        newRec,
        ...prev.filter((p) => p.utr.toLowerCase() !== modalUtr.toLowerCase()),
      ]);
      setActiveUtr(modalUtr);
    } else if (activePaymentRecord) {
      // Deduct from the active UTR's individual balance
      setUtrPayments((prev) =>
        prev.map((item) =>
          item.utr === activePaymentRecord.utr
            ? {
                ...item,
                remainingBalance: Math.max(
                  0,
                  Math.round((item.remainingBalance - calculatedPriceInr) * 100) / 100
                ),
              }
            : item
        )
      );
    }

    const anchor = document.createElement('a');
    anchor.href = whatsappUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setShowQrModal(false);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 Zones (Brand — Nav Links — Primary CTA) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 px-4 sm:px-6 py-4">
          {/* Zone 1: Brand Title */}
          <a
            href="#"
            className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-700 whitespace-nowrap shrink-0"
          >
            MIRAJ SMM STORE
          </a>

          {/* Zone 2: Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-lg font-bold text-slate-800">
            <a
              href="#utr-balance-section"
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              QR Payment & UTR Balance
            </a>
            <a
              href="#order-box"
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Place Order
            </a>
            <a
              href="#views-packages"
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Views Price List
            </a>
            <a
              href="#likes-packages"
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Likes Price List
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action (Shows Individual UTR Balance) */}
          <div className="flex items-center shrink-0">
            <a
              href="#utr-balance-section"
              className="px-5 py-3 text-base sm:text-lg font-extrabold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>
                {activePaymentRecord
                  ? `UTR Balance: ₹${currentUtrBalance.toLocaleString('en-IN')}`
                  : 'Balance: ₹0'}
              </span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Clean Blue Header Banner with Separate UTR Balance Card */}
        <section className="bg-gradient-to-b from-blue-700 to-blue-800 text-white border-b border-blue-900/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5 text-base sm:text-xl font-bold text-blue-100 mb-3">
                  <span>Instagram Views & Likes Promotion</span>
                  <span aria-hidden="true">·</span>
                  <span>Views: 5K = ₹5</span>
                  <span aria-hidden="true">·</span>
                  <span>Likes: 1K = ₹25</span>
                </div>

                <h1
                  className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4"
                  style={{ textWrap: 'balance' }}
                >
                  Pay via QR Code & Enter UTR ID to Show Your Balance
                </h1>

                <p className="text-lg sm:text-xl text-blue-50 font-medium leading-relaxed">
                  Every customer payment is separate. If you pay ₹5 on our QR code and enter your
                  UTR ID, ₹5 will be shown in your balance.
                </p>
              </div>

              {/* Active Individual UTR Balance Display */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/25 rounded-2xl p-6 sm:p-7 min-w-[300px]">
                <div className="text-base sm:text-lg font-bold text-blue-100 mb-1">
                  {activePaymentRecord
                    ? `Active UTR ID: ${activePaymentRecord.utr}`
                    : 'Enter UTR ID Below to Show Balance'}
                </div>
                <div className="font-mono-tabular text-4xl sm:text-5xl font-extrabold text-white my-2">
                  ₹{currentUtrBalance.toLocaleString('en-IN')}
                </div>
                <div className="text-base sm:text-lg font-medium text-blue-100">
                  {activePaymentRecord
                    ? `Individual payment of ₹${activePaymentRecord.paidAmount.toLocaleString('en-IN')}`
                    : 'Each UTR ID shows its own separate payment balance'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Order Box + QR Code & UTR ID Balance Box */}
        <section className="py-8 sm:py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 7 Columns: Place Your Instagram Order */}
              <div id="order-box" className="lg:col-span-7">
                <form
                  onSubmit={handleOpenPaymentStep}
                  noValidate
                  className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8"
                >
                  <div className="pb-5 mb-6 border-b border-slate-200 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="text-base sm:text-lg font-extrabold text-blue-700 mb-1">
                        Step 1 · Select Your Instagram Package
                      </div>
                      <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-slate-900">
                        Place Your Instagram Order
                      </h2>
                    </div>
                    <span className="font-mono-tabular text-base sm:text-lg font-extrabold text-blue-700">
                      {isViews
                        ? '5K Views = ₹5 · 10K Views = ₹10'
                        : '1K Likes = ₹25 · 2K Likes = ₹50'}
                    </span>
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-base sm:text-lg text-red-700 font-bold"
                    >
                      {formError}
                    </div>
                  )}

                  <div className="space-y-7">
                    {/* Option 1: Choose Instagram Views or Instagram Likes */}
                    <div>
                      <label className="block text-lg sm:text-xl font-extrabold text-slate-900 mb-3">
                        1. Choose Service (Views or Likes)
                      </label>
                      <div
                        className="grid grid-cols-2 gap-3.5"
                        role="group"
                        aria-label="Choose Instagram Views or Instagram Likes"
                      >
                        <button
                          type="button"
                          onClick={() => handleSwitchService('Instagram Views')}
                          className={`min-h-[68px] px-4 py-3.5 rounded-xl font-display text-lg sm:text-xl font-extrabold border transition-colors cursor-pointer flex flex-col items-center justify-center whitespace-nowrap shrink-0 ${
                            isViews
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700'
                          }`}
                        >
                          <span>Instagram Views</span>
                          <span
                            className={`text-sm sm:text-base font-mono-tabular font-bold mt-1 ${
                              isViews ? 'text-blue-100' : 'text-slate-600'
                            }`}
                          >
                            5K = ₹5 · 10K = ₹10
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSwitchService('Instagram Likes')}
                          className={`min-h-[68px] px-4 py-3.5 rounded-xl font-display text-lg sm:text-xl font-extrabold border transition-colors cursor-pointer flex flex-col items-center justify-center whitespace-nowrap shrink-0 ${
                            !isViews
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700'
                          }`}
                        >
                          <span>Instagram Likes</span>
                          <span
                            className={`text-sm sm:text-base font-mono-tabular font-bold mt-1 ${
                              !isViews ? 'text-blue-100' : 'text-slate-600'
                            }`}
                          >
                            1K = ₹25 · 2K = ₹50
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Option 2: Quantity Option */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-2.5">
                        <label
                          htmlFor="quantity-input"
                          className="block text-lg sm:text-xl font-extrabold text-slate-900"
                        >
                          2. Quantity Option ({selectedService})
                        </label>
                        <span className="text-sm sm:text-base font-semibold text-slate-600">
                          Tap a package or enter any quantity
                        </span>
                      </div>

                      <input
                        id="quantity-input"
                        type="number"
                        inputMode="numeric"
                        min={1000}
                        step={1000}
                        required
                        value={quantityInput}
                        onChange={(e) => {
                          setQuantityInput(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        placeholder={isViews ? 'e.g. 5000' : 'e.g. 1000'}
                        className="w-full min-h-[58px] px-4 py-3.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono-tabular text-xl sm:text-2xl font-extrabold focus:outline-none focus:bg-white focus:border-blue-600"
                      />

                      {/* Quick Tap Package Buttons */}
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mt-3.5">
                        {activePackages.map((pkg) => {
                          const isSelected = numericQuantity === pkg.quantity;
                          return (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() => {
                                setQuantityInput(String(pkg.quantity));
                                setFormError(null);
                              }}
                              className={`min-h-[52px] px-3 py-2.5 rounded-xl text-base sm:text-lg font-mono-tabular font-extrabold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                              }`}
                            >
                              {pkg.shortLabel} · ₹{pkg.priceInr}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Option 3: Video Link Option */}
                    <div>
                      <label
                        htmlFor="video-link-input"
                        className="block text-lg sm:text-xl font-extrabold text-slate-900 mb-2.5"
                      >
                        3. Video / Post Link Option
                      </label>
                      <input
                        id="video-link-input"
                        type="url"
                        required
                        value={videoLink}
                        onChange={(e) => {
                          setVideoLink(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        placeholder="https://www.instagram.com/reel/..."
                        className="w-full min-h-[58px] px-4 py-3.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-lg sm:text-xl font-medium focus:outline-none focus:bg-white focus:border-blue-600"
                      />
                      <p className="text-base sm:text-lg font-medium text-slate-600 mt-2">
                        Paste your public Instagram Reel or post link. No password needed.
                      </p>
                    </div>

                    {/* Option 4: Price Will Show */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-blue-50 border border-blue-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-200/80">
                        <div>
                          <div className="text-base sm:text-lg font-extrabold text-blue-900">
                            Selected {selectedService}
                          </div>
                          <div className="font-mono-tabular text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">
                            {numericQuantity.toLocaleString('en-IN')} {unitWord}
                          </div>
                          <div className="text-base sm:text-lg font-bold text-slate-800 mt-2">
                            Your UTR Balance:{' '}
                            <span className="font-mono-tabular font-extrabold text-emerald-700">
                              ₹{currentUtrBalance.toLocaleString('en-IN')}
                            </span>
                            {activePaymentRecord && (
                              <span className="text-slate-700">
                                {' '}
                                (UTR: {activePaymentRecord.utr})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="sm:text-right">
                          <div className="text-base sm:text-lg font-extrabold text-blue-900">
                            Price Will Show
                          </div>
                          <div className="font-mono-tabular text-4xl sm:text-5xl font-extrabold text-blue-700 mt-1">
                            ₹{calculatedPriceInr.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {/* Optional: Enter Custom Amount in Rupees */}
                      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label
                          htmlFor="rupees-budget-input"
                          className="text-base sm:text-lg font-bold text-slate-900"
                        >
                          Or enter how many Rupees (₹) you want to pay:
                        </label>
                        <div className="relative w-full sm:w-48">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono-tabular text-lg sm:text-xl font-extrabold text-slate-500">
                            ₹
                          </span>
                          <input
                            id="rupees-budget-input"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={isViews ? 5 : 25}
                            value={calculatedPriceInr || ''}
                            onChange={(e) => handlePriceInputChange(e.target.value)}
                            placeholder={isViews ? '5' : '25'}
                            className="w-full min-h-[52px] pl-9 pr-4 py-2.5 rounded-xl border border-blue-300 bg-white text-slate-900 font-mono-tabular text-lg sm:text-xl font-extrabold focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Green Confirm Order Button */}
                    <button
                      type="submit"
                      className="w-full min-h-[62px] py-4 px-6 bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.99] text-white font-extrabold text-xl sm:text-2xl rounded-xl transition-all cursor-pointer flex items-center justify-center gap-3 whitespace-nowrap shrink-0"
                    >
                      <QrCode className="w-7 h-7" />
                      <span>
                        Confirm Order (₹{calculatedPriceInr.toLocaleString('en-IN')})
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Right 5 Columns: Scan QR Code & Enter UTR ID to Show Individual Balance */}
              <div id="utr-balance-section" className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
                  <div className="pb-5 mb-5 border-b border-slate-200 text-center">
                    <div className="text-base sm:text-lg font-extrabold text-blue-700 mb-1">
                      Step 2 · Scan QR Code & Enter UTR ID
                    </div>
                    <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                      Payment QR Code & UTR Balance
                    </h3>
                    <p className="text-base sm:text-lg font-medium text-slate-700 mt-2 leading-relaxed">
                      Scan the QR code below, pay your amount (e.g. ₹5, ₹10, ₹25), and enter your{' '}
                      <strong>UTR ID</strong> to show that exact amount in your balance.
                    </p>
                  </div>

                  {/* QR Code with Owner Upload/Lock Control */}
                  <div className="flex flex-col items-center justify-center mb-6">
                    <PaymentQrCode sizeClassName="w-64 h-64 sm:w-72 sm:h-72" />
                  </div>

                  {/* Individual UTR Balance Form */}
                  <form onSubmit={handleVerifyUtrPayment} noValidate className="space-y-5">
                    <div>
                      <label className="block text-lg sm:text-xl font-extrabold text-slate-900 mb-2.5">
                        1. Select or Enter Amount Paid (₹)
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-3">
                        {PAYMENT_AMOUNTS.map((amt) => {
                          const active = numericPaidAmount === amt;
                          return (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => {
                                setSelectedPaidAmount(String(amt));
                                setDepositError(null);
                              }}
                              className={`min-h-[48px] px-3 py-2 rounded-xl font-mono-tabular text-base sm:text-lg font-extrabold border transition-colors cursor-pointer ${
                                active
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-blue-50'
                              }`}
                            >
                              ₹{amt}
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono-tabular text-lg sm:text-xl font-extrabold text-slate-500">
                          ₹
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={5}
                          value={selectedPaidAmount}
                          onChange={(e) => setSelectedPaidAmount(e.target.value)}
                          placeholder="5"
                          className="w-full min-h-[54px] pl-9 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono-tabular text-lg sm:text-xl font-extrabold focus:outline-none focus:bg-white focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="utr-id-input"
                        className="block text-lg sm:text-xl font-extrabold text-slate-900 mb-2.5"
                      >
                        2. Enter Your Payment UTR ID
                      </label>
                      <input
                        id="utr-id-input"
                        type="text"
                        required
                        value={utrInput}
                        onChange={(e) => {
                          setUtrInput(e.target.value);
                          if (depositError) setDepositError(null);
                        }}
                        placeholder="Enter 12-digit UTR ID after paying"
                        className="w-full min-h-[54px] px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono-tabular text-lg sm:text-xl font-bold focus:outline-none focus:bg-white focus:border-blue-600"
                      />
                    </div>

                    {depositError && (
                      <div
                        role="alert"
                        className="p-4 rounded-xl bg-red-50 border border-red-200 text-base text-red-700 font-bold"
                      >
                        {depositError}
                      </div>
                    )}

                    {depositSuccessMsg && (
                      <div
                        role="status"
                        className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-base text-emerald-900 font-extrabold"
                      >
                        {depositSuccessMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full min-h-[58px] py-4 px-5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-lg sm:text-xl rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2.5 whitespace-nowrap"
                    >
                      <Wallet className="w-6 h-6" />
                      <span>
                        Submit UTR ID — Show ₹{numericPaidAmount.toLocaleString('en-IN')}
                      </span>
                    </button>
                  </form>

                  {/* Active Individual UTR Balance Box */}
                  <div className="mt-6 p-5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <div className="text-base sm:text-lg font-extrabold text-emerald-950">
                        {activePaymentRecord
                          ? `UTR ID: ${activePaymentRecord.utr}`
                          : 'Current UTR Balance'}
                      </div>
                      <div className="text-sm sm:text-base font-semibold text-emerald-800 mt-0.5">
                        {activePaymentRecord
                          ? 'Individual payment verified'
                          : 'Submit UTR ID above to show balance'}
                      </div>
                    </div>
                    <div className="font-mono-tabular text-3xl sm:text-4xl font-extrabold text-emerald-700">
                      ₹{currentUtrBalance.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Check Existing UTR Balance Lookup */}
                  {utrPayments.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-slate-200">
                      <form onSubmit={handleCheckUtrBalance} className="flex gap-2.5 mb-4">
                        <input
                          type="text"
                          value={utrLookupInput}
                          onChange={(e) => setUtrLookupInput(e.target.value)}
                          placeholder="Check balance by UTR ID..."
                          className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-base font-mono-tabular font-bold focus:outline-none focus:border-blue-600"
                        />
                        <button
                          type="submit"
                          className="min-h-[48px] px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-base font-extrabold rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Search className="w-5 h-5" />
                          <span>Check UTR</span>
                        </button>
                      </form>

                      <div className="text-base font-extrabold text-slate-800 mb-2.5">
                        Separate Individual UTR Payments (Tap to Select)
                      </div>
                      <div className="space-y-2.5">
                        {utrPayments.slice(0, 5).map((item) => {
                          const isCurrent =
                            activePaymentRecord && activePaymentRecord.utr === item.utr;
                          return (
                            <button
                              key={item.utr}
                              type="button"
                              onClick={() => {
                                setActiveUtr(item.utr);
                                setDepositSuccessMsg(
                                  `Selected UTR ID ${item.utr} — Balance: ₹${item.remainingBalance.toLocaleString('en-IN')}`
                                );
                              }}
                              className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between text-base transition-colors cursor-pointer ${
                                isCurrent
                                  ? 'bg-blue-50 border-blue-500 text-blue-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                              }`}
                            >
                              <div>
                                <span className="font-mono-tabular font-extrabold">
                                  UTR: {item.utr}
                                </span>
                                <span className="text-slate-600 font-medium"> · {item.time}</span>
                              </div>
                              <span className="font-mono-tabular font-extrabold text-emerald-700">
                                Balance: ₹{item.remainingBalance.toLocaleString('en-IN')}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Order Summary Preview */}
                  <div className="mt-6 pt-5 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-base font-extrabold text-slate-800">
                        Order Summary (+91 6002191384)
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={handleCopyMessage}
                          className="text-base font-extrabold text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedPreview ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base text-[#16a34a] font-extrabold hover:underline inline-flex items-center gap-1"
                        >
                          <span>Confirm Order Link</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-base font-mono-tabular font-semibold text-slate-900 whitespace-pre-wrap break-all leading-relaxed">
                      {whatsappMessage}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Public Instagram Views & Instagram Likes Price Lists Side-by-Side Below */}
        <section className="pb-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Instagram Views Price List (5K = ₹5 to 100K = ₹100) */}
              <div
                id="views-packages"
                className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8"
              >
                <div className="mb-6">
                  <div className="text-base sm:text-lg font-extrabold text-blue-700 mb-1">
                    Public Rate Chart · 01
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Instagram Views Price List
                  </h2>
                  <p className="text-base sm:text-lg font-medium text-slate-700 mt-1">
                    5K Views = ₹5 · 10K Views = ₹10 · Tap any package to order.
                  </p>
                </div>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {INSTAGRAM_VIEW_PACKAGES.map((pkg) => {
                    const isSelected =
                      selectedService === 'Instagram Views' && numericQuantity === pkg.quantity;
                    return (
                      <div
                        key={pkg.id}
                        className={`p-4 sm:px-5 flex items-center justify-between gap-4 transition-colors ${
                          isSelected ? 'bg-blue-50/90' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900">
                            {pkg.label}
                          </div>
                          <div className="text-base font-semibold text-slate-700 font-mono-tabular">
                            {pkg.quantity.toLocaleString('en-IN')} Instagram Views
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-mono-tabular text-2xl sm:text-3xl font-extrabold text-blue-700">
                              ₹{pkg.priceInr}
                            </div>
                            <div className="text-sm font-bold text-slate-600">Rupees</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectPackage(pkg)}
                            className={`min-h-[48px] px-5 py-2.5 rounded-xl text-base sm:text-lg font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              isSelected
                                ? 'bg-[#16a34a] text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select Views'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instagram Likes Price List (1K = ₹25, 2K = ₹50, 3K = ₹75 ... 10K = ₹250) */}
              <div
                id="likes-packages"
                className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8"
              >
                <div className="mb-6">
                  <div className="text-base sm:text-lg font-extrabold text-blue-700 mb-1">
                    Public Rate Chart · 02
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Instagram Likes Price List
                  </h2>
                  <p className="text-base sm:text-lg font-medium text-slate-700 mt-1">
                    1K Likes = ₹25 · 2K Likes = ₹50 · 3K Likes = ₹75 · Tap any package to order.
                  </p>
                </div>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {INSTAGRAM_LIKE_PACKAGES.map((pkg) => {
                    const isSelected =
                      selectedService === 'Instagram Likes' && numericQuantity === pkg.quantity;
                    return (
                      <div
                        key={pkg.id}
                        className={`p-4 sm:px-5 flex items-center justify-between gap-4 transition-colors ${
                          isSelected ? 'bg-blue-50/90' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900">
                            {pkg.label}
                          </div>
                          <div className="text-base font-semibold text-slate-700 font-mono-tabular">
                            {pkg.quantity.toLocaleString('en-IN')} Instagram Likes
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-mono-tabular text-2xl sm:text-3xl font-extrabold text-blue-700">
                              ₹{pkg.priceInr}
                            </div>
                            <div className="text-sm font-bold text-slate-600">Rupees</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectPackage(pkg)}
                            className={`min-h-[48px] px-5 py-2.5 rounded-xl text-base sm:text-lg font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              isSelected
                                ? 'bg-[#16a34a] text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select Likes'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* QR Code + UTR ID Payment Popup when Customer Clicks Confirm Order */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-xl relative">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
              aria-label="Close payment window"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-4">
              <div className="text-base font-extrabold text-blue-700 mb-1">
                Scan QR Code & Enter UTR ID
              </div>
              <h3 id="qr-modal-title" className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                Pay ₹{calculatedPriceInr.toLocaleString('en-IN')} for{' '}
                {numericQuantity.toLocaleString('en-IN')} {unitWord}
              </h3>
              <p className="text-base font-medium text-slate-700 mt-1.5">
                Scan the QR code below, pay ₹{calculatedPriceInr.toLocaleString('en-IN')}, enter your
                UTR ID, and tap Confirm Order.
              </p>
            </div>

            <div className="flex flex-col items-center my-4">
              <PaymentQrCode sizeClassName="w-64 h-64" showUploadControl={false} />
              <div className="mt-3.5 px-5 py-2 rounded-xl bg-blue-50 border border-blue-200 font-mono-tabular text-lg sm:text-xl font-extrabold text-blue-900">
                Amount to Pay: ₹{calculatedPriceInr.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="mb-5">
              <label
                htmlFor="modal-payment-utr"
                className="block text-lg font-extrabold text-slate-900 mb-2"
              >
                Enter Your Payment UTR ID
              </label>
              <input
                id="modal-payment-utr"
                type="text"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                placeholder="Enter 12-digit UTR ID"
                className="w-full min-h-[54px] px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono-tabular text-lg font-bold focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={handleFinalConfirmOrder}
              className="w-full min-h-[58px] py-4 px-5 bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-xl rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2.5 whitespace-nowrap"
            >
              <Check className="w-6 h-6" />
              <span>Confirm Order</span>
            </button>
          </div>
        </div>
      )}

      {/* Quiet Footer */}
      <footer className="bg-slate-900 text-slate-200 py-8 border-t border-slate-800 text-base">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-display font-extrabold text-white text-lg">
            © 2026 MIRAJ SMM STORE
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 font-semibold">
            <span>Instagram Views & Likes Promotion</span>
            <span aria-hidden="true">·</span>
            <span>Support: +91 6002191384</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
