import React, { useState, useRef, useEffect } from "react";
import { Clinic, Message, ExtractedInfo } from "../types";
import { MessageSquare, Send, X, Calendar, Stethoscope, Clock, ShieldCheck, MapPin, Phone, HelpCircle, RefreshCw, Sparkles, Loader, Volume2, VolumeX, Mic, MicOff } from "lucide-react";

interface ClinicSimulationProps {
  activeClinic: Clinic;
  extractedInfo: ExtractedInfo;
  onUpdateExtractedInfo: (info: ExtractedInfo) => void;
  onUpdateIntent: (intent: "booking" | "general_qa" | "medical_refusal" | "escalation" | "", shouldEscalate: boolean) => void;
  chatHistory: Message[];
  setChatHistory: React.Dispatch<React.SetStateAction<Message[]>>;
}

export default function ClinicSimulation({
  activeClinic,
  extractedInfo,
  onUpdateExtractedInfo,
  onUpdateIntent,
  chatHistory,
  setChatHistory
}: ClinicSimulationProps) {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice Assistant state variables
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micStateMsg, setMicStateMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize SpeechSynthesis and load voices to prevent delay
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Voice Synthesis (TTS) Reader
  const speakText = (text: string, forceVoiceEnabledState?: boolean) => {
    const speakAllowed = forceVoiceEnabledState !== undefined ? forceVoiceEnabledState : isVoiceEnabled;
    if (!speakAllowed) return;

    try {
      window.speechSynthesis.cancel();
      // Clean up markdown / URLs slightly for cleaner speech reading
      const sanitizedText = text
        .replace(/https?:\/\/\S+/g, "the scheduling button")
        .replace(/[📍🕒🛡️🚨🗓️💷•*#_-]/g, "");

      const utterance = new SpeechSynthesisUtterance(sanitizedText);
      const voices = window.speechSynthesis.getVoices();
      
      // Select British voice for authenticity
      const ukVoice = voices.find(v => v.lang.startsWith("en-GB") || v.lang.includes("GB") || v.lang.includes("United Kingdom")) ||
                     voices.find(v => v.lang.startsWith("en-US") || v.lang.startsWith("en"));
      
      if (ukVoice) {
        utterance.voice = ukVoice;
      }
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech Synthesis read error:", err);
    }
  };

  // Set up Speech-to-Text (Speech Recognition) Web API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-GB";

      recognition.onstart = () => {
        setIsListening(true);
        setMicStateMsg("Listening... speak clearly into your mic.");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          setMicStateMsg(`Transcribed: "${transcript}"`);
          setTimeout(() => {
            setMicStateMsg(null);
          }, 3500);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setMicStateMsg("Mic permission blocked. Check browser settings or start in a new tab.");
        } else {
          setMicStateMsg(`Speech failure: ${event.error}`);
        }
        setTimeout(() => setMicStateMsg(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleVoice = () => {
    const nextState = !isVoiceEnabled;
    setIsVoiceEnabled(nextState);
    if (nextState) {
      // Small feedback spoken greeting
      speakText(`Voice assistance activated for ${activeClinic.name}. I will now read responses out loud.`, true);
      setMicStateMsg("Text-to-speech audio reader enabled!");
      setTimeout(() => setMicStateMsg(null), 3000);
    } else {
      window.speechSynthesis.cancel();
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setMicStateMsg("Voice input is not supported in this browser version. Try Chrome.");
      setTimeout(() => setMicStateMsg(null), 4000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
        recognitionRef.current.stop();
      }
    }
  };

  // Clean speaking on clinic change
  useEffect(() => {
    window.speechSynthesis.cancel();
    if (isVoiceEnabled) {
      speakText(`Welcome to ${activeClinic.name}. I am your automated clinic concierge.`);
    }
  }, [activeClinic]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isTyping]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Append User Message to timeline
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setInputText("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: activeClinic.id,
          messages: updatedHistory,
          extractedInfo
        })
      });

      if (!response.ok) throw new Error("Backend offline");
      const data = await response.json();

      setIsTyping(false);

      // Append Assistant response
      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: data.intent,
        shouldEscalate: data.shouldEscalate
      };

      setChatHistory(prev => [...prev, assistantMsg]);
      speakText(data.reply);
      
      // Update developer telemetry on the parent dashboard
      if (data.extractedInfo) {
        onUpdateExtractedInfo(data.extractedInfo);
      }
      onUpdateIntent(data.intent || "", data.shouldEscalate || false);

    } catch (error) {
      console.error(error);
      setIsTyping(false);
      const fallbackText = "We are currently experiencing standard communication maintenance. Please dial our reception desk directly for bookings.";
      setChatHistory(prev => [...prev, {
        id: `error-${Date.now()}`,
        sender: "assistant",
        content: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      speakText(fallbackText);
    }
  };

  const clearConversation = () => {
    window.speechSynthesis.cancel();
    setChatHistory([]);
    onUpdateExtractedInfo({ patientName: null, phone: null, email: null });
    onUpdateIntent("", false);
  };

  const demoSuggestions = [
    { label: "Book routine assessment", text: "I would like to book a routine checkup appointment please." },
    { label: "Check Invisalign costs", text: "How much is your Invisalign treatment, and is it covered by Bupa?" },
    { label: "I have extreme tooth pain", text: "My tooth is severely hurting, bleeding, and my wisdom tooth is swollen." },
    { label: "My name is John (Test slots)", text: "Hi, my name is John, you can reach me at john@gmail.com and 07700900077." },
    { label: "Escalate to clinic receptionist", text: "I want to speak with a human receptionist, please page someone." }
  ];

  // Colors depending on active tenant type
  const themeColors = {
    bg: activeClinic.type === "dental" ? "bg-sky-600" : activeClinic.type === "private" ? "bg-indigo-600" : "bg-emerald-600",
    text: activeClinic.type === "dental" ? "text-sky-600" : activeClinic.type === "private" ? "text-indigo-600" : "text-emerald-600",
    border: activeClinic.type === "dental" ? "border-sky-100" : activeClinic.type === "private" ? "border-indigo-100" : "border-emerald-100",
    hover: activeClinic.type === "dental" ? "hover:bg-sky-50" : activeClinic.type === "private" ? "hover:bg-indigo-50" : "hover:bg-emerald-50",
    badge: activeClinic.type === "dental" ? "bg-sky-50 text-sky-800 border-sky-100" : activeClinic.type === "private" ? "bg-indigo-50 text-indigo-800 border-indigo-100" : "bg-emerald-50 text-emerald-800 border-emerald-100"
  };

  return (
    <div className="border border-slate-200 bg-[#F8FAFC]/50 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[680px]">
      
      {/* Clinic Website Banner Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${activeClinic.type === "dental" ? "bg-sky-500" : activeClinic.type === "private" ? "bg-indigo-500" : "bg-emerald-500"}`} />
            <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold font-mono tracking-wider">{activeClinic.type}</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{activeClinic.name}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{activeClinic.address}</p>
        </div>
        
        {/* Contact Strip */}
        <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
            <Phone className="w-3.5 h-3.5 text-sky-600" />
            {activeClinic.phone}
          </span>
          <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Mon-Fri: {activeClinic.hours.split("|")[0]?.replace("Monday - Friday:", "") || "Daytime"}
          </span>
        </div>
      </div>

      {/* Landing Page Content Area */}
      <div className="flex-1 p-6 relative flex flex-col lg:flex-row gap-6">
        
        {/* Main Landing Info Frame */}
        <div className="flex-1 space-y-6 max-h-[580px] overflow-auto text-left">
          
          {/* Welcome Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Welcome General Portal</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We provide exceptional care to the families in Kensington and surrounding communities. 
              Our team consists of highly experienced practitioners dedicated to modern, safe, and empathetic treatments.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 pt-1.5 font-medium">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600" /> NHS & Private Consultations
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" /> Premium Local Clinic W8
              </span>
            </div>
          </div>

          {/* Dynamic Service Catalog */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Our Registered Services</h3>
              <span className="text-[10px] uppercase font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">Live Catalogue</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeClinic.services.map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs hover:border-sky-500 hover:shadow-sm transition flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-xs text-slate-800 block">{item.name}</span>
                      <span className="font-mono text-xs font-bold text-sky-750 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100 shrink-0">
                        {item.price}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestion Chips Box */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              Demo Suggestions (Click to trigger LLM):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {demoSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(s.text)}
                  className="bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-950 font-semibold text-[11px] px-3.5 py-2 rounded-full border border-slate-200 hover:border-sky-200 shadow-3xs transition cursor-pointer text-left"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Floating AI Chatbot Widget Simulation */}
        <div className={`w-full lg:w-[360px] bg-white rounded-2xl border ${themeColors.border} shadow-lg flex flex-col shrink-0 overflow-hidden h-[450px] lg:h-[480px] self-end relative z-10`}>
          
          {/* Box Header */}
          <div className={`${themeColors.bg} px-4 py-3 text-white flex justify-between items-center`}>
            <div className="flex items-center gap-2">
              <div className="bg-white p-1 rounded-lg">
                <Stethoscope className={`w-4 h-4 ${themeColors.text}`} />
              </div>
              <div className="text-left w-20 sm:w-auto">
                <span className="font-bold text-xs block leading-none truncate">{activeClinic.name} AI</span>
                <span className="text-[10px] text-white/80 mt-0.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                  Reception Assistant
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Voice Readback speaker switch */}
              <button
                onClick={handleToggleVoice}
                className={`text-white/85 hover:text-white text-[10px] whitespace-nowrap font-semibold flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded-md transition border ${
                  isVoiceEnabled ? "border-emerald-300 bg-white/20 text-white" : "border-transparent"
                }`}
                title={isVoiceEnabled ? "Mute voice assistant reader" : "Unmute voice assistant reader"}
              >
                {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 opacity-60" />}
                <span>{isVoiceEnabled ? "Audio: ON" : "Speak text"}</span>
              </button>

              <button
                onClick={clearConversation}
                className="text-white/80 hover:text-white text-[10px] font-semibold flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded-md transition"
                title="Clear Conversation"
              >
                <RefreshCw className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>

          {/* Guidelines info bar */}
          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 text-[10px] text-slate-550 flex items-center gap-1 text-left">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>UK compliance rules protect health data. Clinical diagnosis is disabled.</span>
          </div>

          {/* Floating voice mic states feedback bar */}
          {micStateMsg && (
            <div className="bg-slate-900 text-white text-[10px] px-3.5 py-2 flex justify-between items-center animate-fade-in font-medium border-b border-slate-950">
              <span className="truncate flex items-center gap-1.5 max-w-[90%]">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping inline-block" />
                {micStateMsg}
              </span>
              <button onClick={() => setMicStateMsg(null)} className="text-white/50 hover:text-white font-bold ml-2">×</button>
            </div>
          )}

          {/* Conversation Streams */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 text-slate-400 select-none">
                <MessageSquare className="w-8 h-8 text-sky-300" />
                <p className="text-xs font-semibold text-slate-600">Patient Virtual Concierge</p>
                <p className="text-[10px] leading-relaxed max-w-[200px]">
                  Write an inquiry above or select a preset suggest chip to test!
                </p>
              </div>
            ) : (
              chatHistory.map((m) => {
                const isUser = m.sender === "user";
                return (
                  <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}>
                    <div className={`p-3 rounded-2xl text-xs max-w-[85%] text-left whitespace-pre-wrap ${
                      isUser 
                        ? "bg-slate-950 text-white rounded-br-none" 
                        : "bg-white text-slate-800 border border-slate-150 rounded-bl-none shadow-3xs"
                    }`}>
                      {m.content}

                      {/* Render Interactive Booking button if booking intent identified */}
                      {!isUser && m.intent === "booking" && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <a
                            href={activeClinic.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Book Free Appointment
                          </a>
                        </div>
                      )}

                      {/* Render Red Diagnostic block warning if medical advice bypassed */}
                      {!isUser && m.intent === "medical_refusal" && (
                        <div className="mt-2 text-[10px] font-mono text-red-750 bg-red-50 p-2 rounded-lg flex items-start gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-red-650 shrink-0 mt-0.5" />
                          <span>Strict UK clinical advice guardrail active - medical opinions blocked.</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 px-1 font-mono">{m.timestamp}</span>
                  </div>
                );
              })
            )}

            {isTyping && (
              <div className="flex items-center gap-2 bg-white border border-slate-100 px-3.5 py-2.5 rounded-xl rounded-bl-none shadow-2xs w-[80px]">
                <Loader className="w-4 h-4 text-sky-600 animate-spin" />
                <span className="text-[10px] text-slate-400 font-semibold font-mono animate-pulse">AI</span>
              </div>
            )}
          </div>

          {/* Form write interface */}
          <div className="p-3 bg-white border-t border-slate-100 flex gap-1.5 items-center">
            {/* Direct Microphone audio-dictation trigger */}
            <button
              onClick={toggleListening}
              className={`p-2 rounded-xl border transition flex items-center justify-center shrink-0 cursor-pointer ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white border-red-300 animate-pulse"
                  : "bg-slate-50 hover:bg-slate-150 text-slate-500 hover:text-slate-700 border-slate-200"
              }`}
              title={isListening ? "Listening... click to capture speech" : "Use Voice Recognition Dictation (Speech to text)"}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <input
              type="text"
              placeholder={isListening ? "Speak now..." : "Ask about hours, services, book..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputText)}
              className="flex-1 text-xs border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2 bg-slate-50/50"
              disabled={isListening}
            />
            
            <button
              onClick={() => handleSendMessage(inputText)}
              className={`p-2 rounded-xl text-white transition flex items-center justify-center shrink-0 cursor-pointer ${themeColors.bg}`}
              disabled={isListening}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
