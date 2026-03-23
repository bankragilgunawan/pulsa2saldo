/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
// PERBAIKAN DI SINI: Nama foldernya harus generative-ai
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { 
  Send, 
  User, 
  Bot, 
  RefreshCw, 
  ArrowRight, 
  Wallet, 
  Building2, 
  MessageCircle,
  Info,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Perbaikan nama motion
import { Message, ConversionData } from './types';

const WHATSAPP_NUMBER = "6282121218466";
const DEFAULT_RATE = 0.75;

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'ringkasan' | 'cara'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: "Halo! Selamat datang di Pulsa2Saldo. Saya asisten chatbot Anda untuk menukar pulsa menjadi saldo e-wallet atau transfer bank.\n\nRate hari ini: 0.70 - 0.80 (Rata-rata 0.75).\n\nSilakan beri tahu saya provider pulsa Anda (Telkomsel, XL, Indosat, dll) dan nominal yang ingin ditukar.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversionData, setConversionData] = useState<ConversionData>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const genAIRef = useRef<any>(null); // Ganti nama ref agar lebih jelas

  useEffect(() => {
    // PERBAIKAN DI SINI: Cara panggil kunci API
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      genAIRef.current = new GoogleGenerativeAI(apiKey);
    }
  }, []);

      const extractDataWithAI = async (allMessages: Message[]) => {
    try {
      if (!genAIRef.current) return;
      
      const model = genAIRef.current.getGenerativeModel({ 
        model: "gemini-1.5-flash"
      });

      const prompt = `Ekstrak data transaksi tukar pulsa dari riwayat chat berikut. 
            Berikan hasil dalam format JSON murni dengan key: 
            provider, amount, targetType, targetName, accountNumber.
            
            Riwayat Chat:
            ${allMessages.map(m => `${m.role}: ${m.text}`).join('\n')}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      // Membersihkan teks dari markdown agar JSON.parse tidak error
      const rawText = response.text().replace(/```json|```/g, "").trim();
      const data = JSON.parse(rawText);
      
      setConversionData(prev => ({
        ...prev,
        provider: data.provider || prev.provider,
        amount: data.amount || prev.amount,
        targetType: data.targetType || prev.targetType,
        targetName: data.targetName || prev.targetName,
        accountNumber: data.accountNumber || prev.accountNumber,
      }));
    } catch (error) {
      console.error("AI Extraction Error:", error);
    }
  };

    const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // PERBAIKAN: Gunakan genAIRef yang sudah kita buat di atas
      if (!genAIRef.current) throw new Error("AI not initialized");

      const model = genAIRef.current.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: `Anda adalah asisten chatbot "Pulsa2Saldo". 
            Tugas Anda adalah membantu user menukar pulsa menjadi saldo e-wallet atau transfer bank.
            
            Informasi Penting:
            - WhatsApp Admin: 082121218466
            - Rate: 0.70 - 0.80 (Gunakan 0.75 sebagai estimasi jika user bertanya).
            
            Langkah-langkah yang harus Anda pastikan terkumpul:
            1. Provider Pulsa (Telkomsel, XL, dll).
            2. Nominal Pulsa.
            3. Tujuan (E-wallet: DANA/OVO/GOPAY atau Bank: BCA/BNI/dll).
            4. Nomor Rekening / Nomor HP E-wallet.
            
            Gaya bicara: Ramah, profesional, dan to-the-point. Gunakan Bahasa Indonesia.
            Jika data sudah lengkap, katakan pada user bahwa data sudah siap dan mereka bisa mengklik tombol "Kirim ke WhatsApp" di tab Ringkasan.`
      });

      // Jalankan Chat dan Ekstraksi Data sekaligus
      const [result] = await Promise.all([
        model.generateContent({
          contents: newMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          }))
        }),
        extractDataWithAI(newMessages)
      ]);
      
      const response = await result.response;
      const text = response.text();

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: text || "Maaf, saya tidak mengerti. Bisa diulangi?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Maaf, asisten sedang tidak enak badan (masalah koneksi). Coba lagi nanti ya.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWALink = () => {
    const text = `Halo Admin Pulsa2Saldo,\n\nSaya ingin tukar pulsa:\n- Provider: ${conversionData.provider || '-'}\n- Nominal: Rp ${conversionData.amount?.toLocaleString() || '-'}\n- Tujuan: ${conversionData.targetName || conversionData.targetType || '-'}\n- No Rek/HP: ${conversionData.accountNumber || '-'}\n\nMohon diproses ya.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  const isDataComplete = conversionData.provider && conversionData.amount && conversionData.targetName && conversionData.accountNumber;

  const handleReset = () => {
    setMessages([{
      id: '1',
      role: 'model',
      text: "Halo! Silakan beri tahu saya provider pulsa Anda dan nominal yang ingin ditukar.",
      timestamp: new Date()
    }]);
    setConversionData({});
    setActiveTab('chat');
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-40">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-slate-200/50 rounded-full blur-[120px]"></div>
      </div>

      {/* Unified Container */}
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto md:p-6 overflow-hidden relative z-10">
        
        {/* Integrated Header & Main Panel */}
        <div className="bg-white/80 backdrop-blur-xl md:rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-white/60 flex flex-col flex-1 overflow-hidden relative">
          
          {/* Header Section - More Unified */}
          <header className="px-8 py-6 flex items-center justify-between shrink-0 relative z-20">
            <div className="flex items-center gap-5">
              <motion.div 
                whileHover={{ rotate: 15, scale: 1.05 }}
                className="w-14 h-14 bg-emerald-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-emerald-200/50"
              >
                <RefreshCw className="text-white w-7 h-7" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Pulsa2Saldo</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.25em]">System Operational</p>
                </div>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Rate: 0.75</span>
              </div>
              <button 
                onClick={handleReset}
                className="p-3.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all duration-300 group bg-white border border-slate-100 shadow-sm"
                title="Reset Chat"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
              </button>
            </div>
          </header>

          {/* Tab Navigation - Premium & Robust */}
          <nav className="px-8 pb-2 shrink-0 relative z-20">
            <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-[1.5rem] border border-slate-200/50 overflow-x-auto no-scrollbar">
              {[
                { id: 'chat', label: 'Chat', icon: MessageCircle },
                { id: 'ringkasan', label: 'Ringkasan', icon: Info },
                { id: 'cara', label: 'Panduan', icon: ChevronRight },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-extrabold transition-all duration-500 rounded-2xl ${
                    activeTab === tab.id 
                      ? 'text-emerald-700' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTabBg"
                      className="absolute inset-0 bg-white shadow-md shadow-slate-200/50 rounded-2xl z-0"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <tab.icon className={`w-4 h-4 transition-transform duration-500 ${activeTab === tab.id ? 'scale-110' : ''}`} />
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </nav>

          {/* Content Area */}
          <main className="flex-1 overflow-hidden flex flex-col relative">
            
            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 no-scrollbar">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                            msg.role === 'user' 
                              ? 'bg-white border border-slate-200 text-slate-500' 
                              : 'bg-emerald-600 text-white shadow-emerald-200'
                          }`}>
                            {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                          </div>
                          <div className={`p-6 rounded-[2rem] text-[15px] leading-relaxed chat-bubble-shadow ${
                            msg.role === 'user' 
                              ? 'bg-emerald-600 text-white rounded-tr-none' 
                              : 'bg-white text-slate-800 rounded-tl-none border border-slate-100/50'
                          }`}>
                            {msg.text.split('\n').map((line, i) => (
                              <p key={i} className={i > 0 ? 'mt-3' : ''}>{line}</p>
                            ))}
                            <div className={`flex items-center gap-1.5 mt-3 opacity-40 text-[10px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-white border border-slate-100/50 p-6 rounded-[2rem] rounded-tl-none flex gap-2 items-center chat-bubble-shadow">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Floating & Integrated */}
                <div className="p-8 shrink-0">
                  <div className="relative flex items-center max-w-3xl mx-auto">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Tanya asisten tentang tukar pulsa..."
                      className="w-full bg-white border-2 border-slate-100 rounded-[2rem] py-6 pl-8 pr-20 text-base font-semibold focus:outline-none focus:border-emerald-500 focus:ring-[12px] focus:ring-emerald-500/5 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.05)] placeholder:text-slate-300"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-3 p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xl shadow-emerald-200/50"
                    >
                      <Send className="w-6 h-6" />
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Ringkasan Tab */}
            {activeTab === 'ringkasan' && (
              <div className="flex-1 overflow-y-auto p-10 animate-slide-up no-scrollbar">
                <div className="max-w-lg mx-auto space-y-10">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Info className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Rincian Transaksi</h2>
                    <p className="text-slate-500 mt-3 font-semibold">Pastikan semua data sudah sesuai sebelum diproses</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="group p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Provider Pulsa</label>
                          <span className="font-black text-slate-900 text-2xl">{conversionData.provider || '---'}</span>
                        </div>
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-emerald-50 transition-colors duration-500">
                          <RefreshCw className="w-8 h-8 text-emerald-600" />
                        </div>
                      </div>
                    </div>

                    <div className="group p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500">
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Nominal Pulsa</label>
                          <span className="font-black text-slate-900 text-2xl">
                            {conversionData.amount ? `Rp ${conversionData.amount.toLocaleString()}` : '---'}
                          </span>
                        </div>
                        <div className="text-right">
                          <label className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] block mb-3">Estimasi Saldo</label>
                          <span className="font-black text-emerald-600 text-2xl">
                             {conversionData.amount ? `Rp ${(conversionData.amount * DEFAULT_RATE).toLocaleString()}` : 'Rp 0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="group p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Tujuan Transfer</label>
                          <span className="font-black text-slate-900 text-2xl">{conversionData.targetName || '---'}</span>
                        </div>
                        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-inner">
                          {conversionData.targetType === 'ewallet' ? <Wallet className="w-8 h-8 text-emerald-600" /> : <Building2 className="w-8 h-8 text-emerald-600" />}
                        </div>
                      </div>
                      <div className="pt-8 border-t border-slate-100">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Nomor Rekening / HP</label>
                        <span className="font-mono text-2xl font-black text-slate-900 tracking-widest bg-slate-50 px-6 py-4 rounded-2xl block text-center border border-slate-100">
                          {conversionData.accountNumber || '---'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <motion.a
                      whileHover={isDataComplete ? { scale: 1.02, y: -4 } : {}}
                      whileTap={isDataComplete ? { scale: 0.98 } : {}}
                      href={generateWALink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group w-full py-7 rounded-[2rem] flex items-center justify-center gap-4 font-black text-xl transition-all shadow-2xl ${
                        isDataComplete 
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200/50' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <MessageCircle className="w-8 h-8 group-hover:animate-bounce" />
                      Lanjut ke WhatsApp
                    </motion.a>
                    {!isDataComplete && (
                      <div className="mt-8 p-6 bg-amber-50 rounded-[1.5rem] border border-amber-100 flex items-start gap-4">
                        <Info className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 font-semibold leading-relaxed">
                          Data belum lengkap. Silakan kembali ke tab <span className="text-emerald-700 underline underline-offset-4">Chat</span> dan beri tahu asisten detail transaksi Anda.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Panduan Tab */}
            {activeTab === 'cara' && (
              <div className="flex-1 overflow-y-auto p-10 animate-slide-up no-scrollbar">
                <div className="max-w-4xl mx-auto space-y-12">
                  <div className="text-center">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Panduan Pengguna</h2>
                    <p className="text-slate-500 mt-3 font-semibold text-lg">6 Langkah mudah tukar pulsa jadi saldo</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { step: '01', title: 'Konsultasi Chat', desc: 'Beri tahu asisten provider, nominal, dan tujuan transfer Anda.' },
                      { step: '02', title: 'Verifikasi Data', desc: 'Cek tab Ringkasan untuk memastikan semua data sudah benar.' },
                      { step: '03', title: 'Klik WhatsApp', desc: 'Hubungi admin kami melalui tombol WhatsApp yang tersedia.' },
                      { step: '04', title: 'Transfer Pulsa', desc: 'Lakukan transfer pulsa ke nomor yang diberikan oleh admin.' },
                      { step: '05', title: 'Proses Cepat', desc: 'Admin akan memproses transaksi Anda dalam hitungan menit.' },
                      { step: '06', title: 'Selesai', desc: 'Saldo akan langsung dikirim ke rekening atau e-wallet Anda.' },
                    ].map((item) => (
                      <div key={item.step} className="group p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:border-emerald-100 transition-all duration-500 relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-slate-50 rounded-full group-hover:bg-emerald-50 transition-colors duration-500 -z-0"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-5 mb-6">
                            <span className="text-5xl font-black text-slate-100 group-hover:text-emerald-200 transition-colors duration-500">{item.step}</span>
                            <h4 className="font-black text-slate-900 text-xl">{item.title}</h4>
                          </div>
                          <p className="text-base text-slate-500 leading-relaxed font-semibold">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                    <h3 className="text-2xl font-black mb-8 flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Info className="w-6 h-6 text-white" />
                      </div>
                      Informasi Penting
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em]">Ketentuan Layanan</p>
                        <ul className="space-y-4 text-base text-slate-300 font-semibold">
                          <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            Hanya menerima pulsa transfer
                          </li>
                          <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            Rate mengikuti pasar harian
                          </li>
                          <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            Proses 5-15 menit kerja
                          </li>
                        </ul>
                      </div>
                      <div className="space-y-6">
                        <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em]">Jaminan Keamanan</p>
                        <p className="text-base text-slate-300 font-semibold leading-relaxed">
                          Seluruh transaksi diproses secara manual oleh admin profesional untuk menjamin keamanan dan ketepatan pengiriman saldo Anda.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>

          {/* Integrated Footer - Minimal & Clean */}
          <footer className="px-10 py-6 bg-white/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Secure Encryption</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">v2.2.0 Stable</span>
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              © 2026 Pulsa2Saldo • Crafted for Excellence
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

