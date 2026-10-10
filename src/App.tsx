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
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Unified Outer Layout Container:
          - Mobile: 16px margin on top, bottom, left, and right
          - Desktop: max-width 1200px, centered horizontally, 24px side padding
          - All panels aligned to the exact same grid */}
      <div className="site-layout-container flex flex-col gap-4 sm:gap-5">
        {/* Top Bar Contract: 3 Zones (Brand — Nav Links — Primary CTA) */}
        <header className="sticky top-[16px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl px-4 sm:px-5 py-3 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            {/* Zone 1: Brand Title */}
            <a
              href="#"
              className="font-display text-lg sm:text-xl font-bold tracking-tight text-blue-700 whitespace-nowrap shrink-0"
            >
              MIRAJ SMM STORE
            </a>

            {/* Zone 2: Single-Line Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-700">
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
                className="px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Wallet className="w-4 h-4" />
                <span>
                  {activePaymentRecord
                    ? `UTR Balance: ₹${currentUtrBalance.toLocaleString('en-IN')}`
                    : 'Balance: ₹0'}
                </span>
              </a>
            </div>
          </div>
        </header>

        <main className="flex flex-col gap-4 sm:gap-5">
          {/* Aligned Blue Header Banner Panel with Separate UTR Balance Card */}
          <section className="bg-gradient-to-b from-blue-700 to-blue-800 text-white rounded-xl border border-blue-900/20 p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-blue-100 mb-2">
                  <span>Instagram Views & Likes Promotion</span>
                  <span aria-hidden="true">·</span>
                  <span>Views: 5K = ₹5</span>
                  <span aria-hidden="true">·</span>
                  <span>Likes: 1K = ₹25</span>
                </div>

                <h1
                  className="font-display text-xl sm:text-3xl font-bold tracking-tight text-white leading-snug mb-2"
                  style={{ textWrap: 'balance' }}
                >
                  Pay via QR Code & Enter UTR ID to Show Your Balance
                </h1>

                <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                  Every customer payment is separate. If you pay ₹5 on our QR code and enter your
                  UTR ID, ₹5 will be shown in your balance.
                </p>
              </div>

              {/* Active Individual UTR Balance Display */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 sm:p-5 min-w-[240px]">
                <div className="text-xs sm:text-sm font-semibold text-blue-100 mb-0.5">
                  {activePaymentRecord
                    ? `Active UTR ID: ${activePaymentRecord.utr}`
                    : 'Enter UTR ID Below to Show Balance'}
                </div>
                <div className="font-mono-tabular text-2xl sm:text-3xl font-bold text-white my-1">
                  ₹{currentUtrBalance.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-blue-100">
                  {activePaymentRecord
                    ? `Individual payment of ₹${activePaymentRecord.paidAmount.toLocaleString('en-IN')}`
                    : 'Each UTR ID shows its own separate payment balance'}
                </div>
              </div>
            </div>
          </section>

          {/* Section 1: Aligned 12-Column Grid — Order Box + QR Code & UTR ID Balance Box */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
              {/* Left 7 Columns: Place Your Instagram Order */}
              <div id="order-box" className="lg:col-span-7 flex">
                <form
                  onSubmit={handleOpenPaymentStep}
                  noValidate
                  className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col justify-between"
                >
                  <div className="pb-4 mb-4 border-b border-slate-200 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-blue-700 mb-0.5">
                        Step 1 · Select Your Instagram Package
                      </div>
                      <h2 className="font-display text-lg sm:text-2xl font-bold text-slate-900">
                        Place Your Instagram Order
                      </h2>
                    </div>
                    <span className="font-mono-tabular text-xs sm:text-sm font-bold text-blue-700">
                      {isViews
                        ? '5K Views = ₹5 · 10K Views = ₹10'
                        : '1K Likes = ₹25 · 2K Likes = ₹50'}
                    </span>
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-semibold"
                    >
                      {formError}
                    </div>
                  )}

                  <div className="space-y-5">
                    {/* Option 1: Choose Instagram Views or Instagram Likes */}
                    <div>
                      <label className="block text-sm sm:text-base font-bold text-slate-900 mb-2">
                        1. Choose Service (Views or Likes)
                      </label>
                      <div
                        className="grid grid-cols-2 gap-3"
                        role="group"
                        aria-label="Choose Instagram Views or Instagram Likes"
                      >
                        <button
                          type="button"
                          onClick={() => handleSwitchService('Instagram Views')}
                          className={`min-h-[52px] px-3 py-2.5 rounded-xl font-display text-sm sm:text-base font-bold border transition-colors cursor-pointer flex flex-col items-center justify-center whitespace-nowrap shrink-0 ${
                            isViews
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700'
                          }`}
                        >
                          <span>Instagram Views</span>
                          <span
                            className={`text-xs font-mono-tabular font-medium mt-0.5 ${
                              isViews ? 'text-blue-100' : 'text-slate-600'
                            }`}
                          >
                            5K = ₹5 · 10K = ₹10
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSwitchService('Instagram Likes')}
                          className={`min-h-[52px] px-3 py-2.5 rounded-xl font-display text-sm sm:text-base font-bold border transition-colors cursor-pointer flex flex-col items-center justify-center whitespace-nowrap shrink-0 ${
                            !isViews
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700'
                          }`}
                        >
                          <span>Instagram Likes</span>
                          <span
                            className={`text-xs font-mono-tabular font-medium mt-0.5 ${
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
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                        <label
                          htmlFor="quantity-input"
                          className="block text-sm sm:text-base font-bold text-slate-900"
                        >
                          2. Quantity Option ({selectedService})
                        </label>
                        <span className="text-xs font-medium text-slate-600">
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
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono-tabular text-base sm:text-lg font-bold focus:outline-none focus:bg-white focus:border-blue-600"
                      />

                      {/* Quick Tap Package Buttons */}
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2.5">
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
                              className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-mono-tabular font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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
                        className="block text-sm sm:text-base font-bold text-slate-900 mb-1.5"
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
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm sm:text-base focus:outline-none focus:bg-white focus:border-blue-600"
                      />
                      <p className="text-xs text-slate-600 mt-1">
                        Paste your public Instagram Reel or post link. No password needed.
                      </p>
                    </div>

                    {/* Option 4: Price Will Show */}
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-200/80">
                        <div>
                          <div className="text-xs font-bold text-blue-800">
                            Selected {selectedService}
                          </div>
                          <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                            {numericQuantity.toLocaleString('en-IN')} {unitWord}
                          </div>
                          <div className="text-xs sm:text-sm font-medium text-slate-700 mt-1">
                            Your UTR Balance:{' '}
                            <span className="font-mono-tabular font-bold text-emerald-700">
                              ₹{currentUtrBalance.toLocaleString('en-IN')}
                            </span>
                            {activePaymentRecord && (
                              <span className="text-slate-600">
                                {' '}
                                (UTR: {activePaymentRecord.utr})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="sm:text-right">
                          <div className="text-xs font-bold text-blue-800">
                            Price Will Show
                          </div>
                          <div className="font-mono-tabular text-2xl sm:text-3xl font-bold text-blue-700 mt-0.5">
                            ₹{calculatedPriceInr.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {/* Optional: Enter Custom Amount in Rupees */}
                      <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <label
                          htmlFor="rupees-budget-input"
                          className="text-xs sm:text-sm font-semibold text-slate-800"
                        >
                          Or enter how many Rupees (₹) you want to pay:
                        </label>
                        <div className="relative w-full sm:w-40">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono-tabular text-sm font-bold text-slate-500">
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
                            className="w-full min-h-[38px] pl-7 pr-3 py-1.5 rounded-lg border border-blue-300 bg-white text-slate-900 font-mono-tabular text-sm sm:text-base font-bold focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Green Confirm Order Button */}
                    <button
                      type="submit"
                      className="w-full min-h-[48px] py-3 px-5 bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.99] text-white font-bold text-base sm:text-lg rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <QrCode className="w-5 h-5" />
                      <span>
                        Confirm Order (₹{calculatedPriceInr.toLocaleString('en-IN')})
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Right 5 Columns: Scan QR Code & Enter UTR ID to Show Individual Balance */}
              <div id="utr-balance-section" className="lg:col-span-5 flex">
                <div className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col justify-between">
                  <div>
                    <div className="pb-4 mb-4 border-b border-slate-200 text-center">
                      <div className="text-xs sm:text-sm font-bold text-blue-700 mb-0.5">
                        Step 2 · Scan QR Code & Enter UTR ID
                      </div>
                      <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                        Payment QR Code & UTR Balance
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                        Scan the QR code below, pay your amount (e.g. ₹5, ₹10, ₹25), and enter your{' '}
                        <strong>UTR ID</strong> to show that exact amount in your balance.
                      </p>
                    </div>

                    {/* QR Code with Owner Upload/Lock Control */}
                    <div className="flex flex-col items-center justify-center mb-4">
                      <PaymentQrCode sizeClassName="w-48 h-48 sm:w-52 sm:h-52" />
                    </div>

                    {/* Individual UTR Balance Form */}
                    <form onSubmit={handleVerifyUtrPayment} noValidate className="space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                          1. Select or Enter Amount Paid (₹)
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-2">
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
                                className={`min-h-[36px] px-2 py-1 rounded-lg font-mono-tabular text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
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
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono-tabular text-sm sm:text-base font-bold text-slate-500">
                            ₹
                          </span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={5}
                            value={selectedPaidAmount}
                            onChange={(e) => setSelectedPaidAmount(e.target.value)}
                            placeholder="5"
                            className="w-full min-h-[42px] pl-7 pr-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono-tabular text-sm sm:text-base font-bold focus:outline-none focus:bg-white focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="utr-id-input"
                          className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5"
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
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono-tabular text-sm sm:text-base focus:outline-none focus:bg-white focus:border-blue-600"
                        />
                      </div>

                      {depositError && (
                        <div
                          role="alert"
                          className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-semibold"
                        >
                          {depositError}
                        </div>
                      )}

                      {depositSuccessMsg && (
                        <div
                          role="status"
                          className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold"
                        >
                          {depositSuccessMsg}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full min-h-[44px] py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <Wallet className="w-4 h-4" />
                        <span>
                          Submit UTR ID — Show ₹{numericPaidAmount.toLocaleString('en-IN')}
                        </span>
                      </button>
                    </form>

                    {/* Active Individual UTR Balance Box */}
                    <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-900">
                          {activePaymentRecord
                            ? `UTR ID: ${activePaymentRecord.utr}`
                            : 'Current UTR Balance'}
                        </div>
                        <div className="text-xs text-emerald-700 mt-0.5">
                          {activePaymentRecord
                            ? 'Individual payment verified'
                            : 'Submit UTR ID above to show balance'}
                        </div>
                      </div>
                      <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-emerald-700">
                        ₹{currentUtrBalance.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Check Existing UTR Balance Lookup */}
                    {utrPayments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <form onSubmit={handleCheckUtrBalance} className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={utrLookupInput}
                            onChange={(e) => setUtrLookupInput(e.target.value)}
                            placeholder="Check balance by UTR ID..."
                            className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-mono-tabular focus:outline-none focus:border-blue-600"
                          />
                          <button
                            type="submit"
                            className="min-h-[38px] px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>Check UTR</span>
                          </button>
                        </form>

                        <div className="text-xs font-bold text-slate-700 mb-2">
                          Separate Individual UTR Payments (Tap to Select)
                        </div>
                        <div className="space-y-2">
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
                                className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                  isCurrent
                                    ? 'bg-blue-50 border-blue-500 text-blue-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                                }`}
                              >
                                <div>
                                  <span className="font-mono-tabular font-bold">
                                    UTR: {item.utr}
                                  </span>
                                  <span className="text-slate-500"> · {item.time}</span>
                                </div>
                                <span className="font-mono-tabular font-bold text-emerald-700">
                                  Balance: ₹{item.remainingBalance.toLocaleString('en-IN')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Summary Preview */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-600">
                        Order Summary (+91 6002191384)
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleCopyMessage}
                          className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedPreview ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#16a34a] font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <span>Confirm Order Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <pre className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono-tabular text-slate-800 whitespace-pre-wrap break-all leading-relaxed">
                      {whatsappMessage}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Public Instagram Views & Instagram Likes Price Lists Side-by-Side Below */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
              {/* Instagram Views Price List (5K = ₹5 to 100K = ₹100) */}
              <div
                id="views-packages"
                className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col"
              >
                <div className="mb-4">
                  <div className="text-xs font-bold text-blue-700 mb-0.5">
                    Public Rate Chart · 01
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                    Instagram Views Price List
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
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
                        className={`p-3 sm:px-4 flex items-center justify-between gap-3 transition-colors ${
                          isSelected ? 'bg-blue-50/90' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-display text-sm sm:text-base font-bold text-slate-900">
                            {pkg.label}
                          </div>
                          <div className="text-xs text-slate-600 font-mono-tabular">
                            {pkg.quantity.toLocaleString('en-IN')} Instagram Views
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-mono-tabular text-base sm:text-lg font-bold text-blue-700">
                              ₹{pkg.priceInr}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500">Rupees</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectPackage(pkg)}
                            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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
                className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col"
              >
                <div className="mb-4">
                  <div className="text-xs font-bold text-blue-700 mb-0.5">
                    Public Rate Chart · 02
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                    Instagram Likes Price List
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
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
                        className={`p-3 sm:px-4 flex items-center justify-between gap-3 transition-colors ${
                          isSelected ? 'bg-blue-50/90' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-display text-sm sm:text-base font-bold text-slate-900">
                            {pkg.label}
                          </div>
                          <div className="text-xs text-slate-600 font-mono-tabular">
                            {pkg.quantity.toLocaleString('en-IN')} Instagram Likes
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-mono-tabular text-base sm:text-lg font-bold text-blue-700">
                              ₹{pkg.priceInr}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500">Rupees</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectPackage(pkg)}
                            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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
          </section>
        </main>

        {/* Aligned Quiet Footer Panel */}
        <footer className="bg-slate-900 text-slate-200 rounded-xl p-4 sm:px-6 border border-slate-800 text-xs sm:text-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="font-display font-bold text-white text-sm">
              © 2026 MIRAJ SMM STORE
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span>Instagram Views & Likes Promotion</span>
              <span aria-hidden="true">·</span>
              <span>Support: +91 6002191384</span>
            </div>
          </div>
        </footer>
      </div>

      {/* QR Code + UTR ID Payment Popup when Customer Clicks Confirm Order */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-[16px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-xl relative">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
              aria-label="Close payment window"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-3">
              <div className="text-xs font-bold text-blue-700 mb-0.5">
                Scan QR Code & Enter UTR ID
              </div>
              <h3 id="qr-modal-title" className="font-display text-lg sm:text-xl font-bold text-slate-900">
                Pay ₹{calculatedPriceInr.toLocaleString('en-IN')} for{' '}
                {numericQuantity.toLocaleString('en-IN')} {unitWord}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Scan the QR code below, pay ₹{calculatedPriceInr.toLocaleString('en-IN')}, enter your
                UTR ID, and tap Confirm Order.
              </p>
            </div>

            <div className="flex flex-col items-center my-3">
              <PaymentQrCode
                sizeClassName="w-48 h-48"
                showUploadControl={false}
              />
              <div className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 font-mono-tabular text-xs sm:text-sm font-bold text-blue-900">
                Amount to Pay: ₹{calculatedPriceInr.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="modal-payment-utr"
                className="block text-xs sm:text-sm font-bold text-slate-900 mb-1"
              >
                Enter Your Payment UTR ID
              </label>
              <input
                id="modal-payment-utr"
                type="text"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                placeholder="Enter 12-digit UTR ID"
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono-tabular text-sm font-bold focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={handleFinalConfirmOrder}
              className="w-full min-h-[46px] py-2.5 px-4 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-base rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Check className="w-5 h-5" />
              <span>Confirm Order</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
