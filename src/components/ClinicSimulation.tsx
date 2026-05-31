import React, { useState, useRef, useEffect } from "react";
import { Clinic, Message, ExtractedInfo } from "../types";
import { MessageSquare, Send, X, Calendar, Stethoscope, Clock, ShieldCheck, MapPin, Phone, HelpCircle, RefreshCw, Sparkles, Loader, Volume2, VolumeX, Mic, MicOff, PhoneCall, PhoneOff, User, Radio, Disc, Layout } from "lucide-react";

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
  const [simulationLayout, setSimulationLayout] = useState<"split" | "floating">("split");
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Switch between Standard Text Chat and Live Patient Calling Line
  const [activeWidgetMode, setActiveWidgetMode] = useState<"chat" | "call">("chat");

  // Voice Assistant state variables
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micStateMsg, setMicStateMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Voice Call state variables
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callMuted, setCallMuted] = useState(false);
  const [callStep, setCallStep] = useState<"disconnected" | "calling" | "connected" | "ended">("disconnected");
  const [speechStatus, setSpeechStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [voiceTranscript, setVoiceTranscript] = useState<Array<{ sender: "user" | "assistant" | "system", content: string, timestamp: string }>>([]);

  const callRecognitionRef = useRef<any>(null);

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

  // Dedicated automatic voice-to-voice synthesizer reader
  const speakVoiceCallText = (text: string, onEndCallback: () => void) => {
    try {
      window.speechSynthesis.cancel();
      const sanitizedText = text
        .replace(/https?:\/\/\S+/g, "the booking link")
        .replace(/[📍🕒🛡️🚨🗓️💷•*#_-]/g, "");

      const utterance = new SpeechSynthesisUtterance(sanitizedText);
      const voices = window.speechSynthesis.getVoices();
      
      const ukVoice = voices.find(v => v.lang.startsWith("en-GB") || v.lang.includes("GB") || v.lang.includes("United Kingdom")) ||
                     voices.find(v => v.lang.startsWith("en-US") || v.lang.startsWith("en"));
      
      if (ukVoice) {
        utterance.voice = ukVoice;
      }
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      
      utterance.onstart = () => {
        setSpeechStatus("speaking");
      };
      
      utterance.onend = () => {
        onEndCallback();
      };
      
      utterance.onerror = () => {
        onEndCallback();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Call speech synthesis read error:", err);
      onEndCallback();
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

  // Dedicated Continuous Loop Voice Caller Speech Recognition
  const startCallRecognition = () => {
    if (callRecognitionRef.current) {
      try {
        callRecognitionRef.current.abort();
      } catch (e) {}
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicStateMsg("Voice call mode: Web Speech recognition is unsupported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-GB";

    rec.onstart = () => {
      setSpeechStatus("listening");
      setMicStateMsg("Call Active: Speak now...");
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && transcript.trim()) {
        setMicStateMsg(null);
        handleSendVoiceCallMessage(transcript);
      }
    };

    rec.onerror = (event: any) => {
      console.warn("Call speech reader error:", event.error);
      if (event.error === "not-allowed") {
        setMicStateMsg("Mic permission blocked. Click 'Open in new tab' or check site permissions.");
        setSpeechStatus("idle");
      } else if (event.error === "no-speech") {
        if (isCallActive && !callMuted && speechStatus !== "speaking" && speechStatus !== "processing") {
          setTimeout(() => {
            if (isCallActive && !callMuted) {
              startCallRecognition();
            }
          }, 300);
        }
      } else {
        setSpeechStatus("idle");
      }
    };

    rec.onend = () => {
      if (isCallActive && !callMuted && speechStatus === "listening") {
        setTimeout(() => {
          if (isCallActive && !callMuted) {
            try { rec.start(); } catch (e) {}
          }
        }, 300);
      }
    };

    callRecognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      console.error("Call Speech Recognition starting error:", err);
    }
  };

  // Direct calling service API sender
  const handleSendVoiceCallMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setSpeechStatus("processing");
    setMicStateMsg("Processing spoken statement...");

    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setVoiceTranscript(prev => [...prev, { sender: "user", content: text, timestamp: timestampStr }]);

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

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        content: data.reply,
        timestamp: timestampStr,
        intent: data.intent,
        shouldEscalate: data.shouldEscalate
      };

      setChatHistory(prev => [...prev, assistantMsg]);
      setVoiceTranscript(prev => [...prev, { sender: "assistant", content: data.reply, timestamp: timestampStr }]);

      if (data.extractedInfo) {
        onUpdateExtractedInfo(data.extractedInfo);
      }
      onUpdateIntent(data.intent || "", data.shouldEscalate || false);

      setMicStateMsg("AI speaking...");
      speakVoiceCallText(data.reply, () => {
        if (isCallActive && !callMuted) {
          startCallRecognition();
        } else {
          setSpeechStatus("idle");
        }
      });

    } catch (error) {
      console.error(error);
      const fallbackText = "I apologize, our connection was interrupted. Could you say that again?";
      setVoiceTranscript(prev => [...prev, { sender: "system", content: "Outbound connection issue. Stale stream.", timestamp: timestampStr }]);
      
      speakVoiceCallText(fallbackText, () => {
        if (isCallActive && !callMuted) {
          startCallRecognition();
        } else {
          setSpeechStatus("idle");
        }
      });
    }
  };

  // Call runtime duration counter hooks
  useEffect(() => {
    let interval: any;
    if (isCallActive && callStep === "connected") {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive, callStep]);

  // Launch Voice Call mode
  const startVoiceCall = () => {
    setIsCallActive(true);
    setCallStep("calling");
    setSpeechStatus("idle");
    setVoiceTranscript([]);
    window.speechSynthesis.cancel();
    setMicStateMsg("Connecting Secure NHS AI Line...");

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    setTimeout(() => {
      setCallStep("connected");
      const greeting = `Thank you for calling ${activeClinic.name} AI Helpdesk. I can help you with practice opening hours, private dental fees, or booking a clinical checkup today. How may I assist you?`;
      
      const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setVoiceTranscript([{ sender: "assistant", content: greeting, timestamp: timestampStr }]);
      
      speakVoiceCallText(greeting, () => {
        if (!callMuted) {
          startCallRecognition();
        } else {
          setSpeechStatus("idle");
        }
      });
    }, 1500);
  };

  // End and reset Voice Call state
  const endVoiceCall = () => {
    window.speechSynthesis.cancel();
    if (callRecognitionRef.current) {
      try { callRecognitionRef.current.abort(); } catch (e) {}
    }
    setCallStep("ended");
    setSpeechStatus("idle");
    setMicStateMsg("Call disconnected.");
    
    setTimeout(() => {
      setIsCallActive(false);
      setCallStep("disconnected");
      setMicStateMsg(null);
    }, 1200);
  };

  // Toggle call microphone muted status
  const handleToggleCallMute = () => {
    const nextMuted = !callMuted;
    setCallMuted(nextMuted);
    if (nextMuted) {
      setSpeechStatus("idle");
      setMicStateMsg("Microphone Muted");
      if (callRecognitionRef.current) {
        try { callRecognitionRef.current.abort(); } catch (e) {}
      }
    } else {
      setMicStateMsg("Microphone Live");
      if (isCallActive && callStep === "connected") {
        startCallRecognition();
      }
    }
  };

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
    if (isCallActive) {
      endVoiceCall();
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
    if (callRecognitionRef.current) {
      try { callRecognitionRef.current.abort(); } catch (e) {}
    }
    setIsCallActive(false);
    setCallStep("disconnected");
    setSpeechStatus("idle");
    setVoiceTranscript([]);
    setChatHistory([]);
    onUpdateExtractedInfo({ patientName: null, phone: null, email: null });
    onUpdateIntent("", false);
  };

  const isPortfolio = activeClinic.type === "portfolio";

  const demoSuggestions = isPortfolio ? [
    { label: "Book freelance consulting 🗓️", text: "I'd love to schedule a video call with you to discuss a freelance project." },
    { label: "What is your Tech Stack? 💻", text: "What technologies and frameworks do you specialize in for full-stack build?" },
    { label: "Social Links & Profiles 🛡️", text: "Can you show me where to find your open source code or social timeline profiles?" },
    { label: "Malicious Prompt test 🛑", text: "Can you write a 1000-word university essay on ancient history for my exam class?" },
    { label: "Direct contact lookup 📍", text: "How can I contact the developer directly or drop an email lookup?" }
  ] : [
    { label: "Book routine assessment", text: "I would like to book a routine checkup appointment please." },
    { label: "Check Invisalign costs", text: "How much is your Invisalign treatment, and is it covered by Bupa?" },
    { label: "I have extreme tooth pain", text: "My tooth is severely hurting, bleeding, and my wisdom tooth is swollen." },
    { label: "My name is John (Test slots)", text: "Hi, my name is John, you can reach me at john@gmail.com and 07700900077." },
    { label: "Escalate to clinic receptionist", text: "I want to speak with a human receptionist, please page someone." }
  ];

  // Colors depending on active tenant type
  const themeColors = {
    bg: activeClinic.type === "dental" ? "bg-sky-600" : activeClinic.type === "private" ? "bg-indigo-600" : activeClinic.type === "portfolio" ? "bg-slate-900" : "bg-emerald-600",
    text: activeClinic.type === "dental" ? "text-sky-600" : activeClinic.type === "private" ? "text-indigo-600" : activeClinic.type === "portfolio" ? "text-slate-900" : "text-emerald-600",
    border: activeClinic.type === "dental" ? "border-sky-100" : activeClinic.type === "private" ? "border-indigo-100" : activeClinic.type === "portfolio" ? "border-slate-200" : "border-emerald-100",
    hover: activeClinic.type === "dental" ? "hover:bg-sky-50" : activeClinic.type === "private" ? "hover:bg-indigo-50" : activeClinic.type === "portfolio" ? "hover:bg-slate-100" : "hover:bg-emerald-50",
    badge: activeClinic.type === "dental" ? "bg-sky-50 text-sky-800 border-sky-100" : activeClinic.type === "private" ? "bg-indigo-50 text-indigo-800 border-indigo-100" : activeClinic.type === "portfolio" ? "bg-slate-100 text-slate-800 border-slate-200" : "bg-emerald-50 text-emerald-800 border-emerald-100"
  };

  return (
    <div className="space-y-4 flex flex-col">
      {/* Simulation Layout Mode Switcher */}
      <div className="bg-slate-100 border border-slate-200/60 py-2.5 px-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-left gap-3">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-3">WIDGET PLACEMENT PREVIEW</span>
          <span className="text-xs font-semibold text-slate-700">Toggle whether the chat widget docks inline or floats as a corner icon.</span>
        </div>
        <div className="flex gap-1 bg-slate-200/60 p-0.5 rounded-xl border border-slate-300/40 shrink-0">
          <button
            onClick={() => {
              setSimulationLayout("split");
              setIsChatOpen(true);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              simulationLayout === "split" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-500 hover:text-slate-850"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Split-View Sandbox
          </button>
          <button
            onClick={() => {
              setSimulationLayout("floating");
              setIsChatOpen(false); // Default to closed floating button in corner
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              simulationLayout === "floating" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-500 hover:text-slate-850"
            }`}
            id="corner-floating-mode-btn"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Corner Floating Widget
          </button>
        </div>
      </div>

      <div className="border border-slate-200 bg-[#F8FAFC]/50 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[680px] relative">
        
        {/* Clinic Website Banner Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${activeClinic.type === "dental" ? "bg-sky-500" : activeClinic.type === "private" ? "bg-indigo-500" : isPortfolio ? "bg-slate-700" : "bg-emerald-500"}`} />
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
              {isPortfolio ? "Freelance Consulting Availability" : `Mon-Fri: ${activeClinic.hours.split("|")[0]?.replace("Monday - Friday:", "") || "Daytime"}`}
            </span>
          </div>
        </div>

        {/* Landing Page Content Area */}
        <div className="flex-1 p-6 relative flex flex-col lg:flex-row gap-6">
          
          {/* Main Landing Info Frame */}
          <div className="flex-1 space-y-6 max-h-[580px] overflow-auto text-left">
            
            {/* Welcome Card */}
            {isPortfolio ? (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2.5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Senior Engineering Portfolio</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Hi, I am <strong>{activeClinic.name}</strong>, a Full-Stack Systems Engineer and Generative AI developer.
                  I design and deploy highly secure typescript portals, type-safe API proxies, and local rule orchestrations to keep corporate workflows slick and fast.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 pt-1.5 font-medium">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Type-Safe React & API Architectures
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-600" /> {activeClinic.address}
                  </span>
                </div>
              </div>
            ) : (
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
            )}

            {/* Dynamic Service Catalog */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {isPortfolio ? "Registered Skills & Services" : "Our Registered Services"}
                </h3>
                <span className="text-[10px] uppercase font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">Live Catalogue</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeClinic.services.map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs hover:border-sky-500 hover:shadow-sm transition flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-xs text-slate-800 block">{item.name}</span>
                        <span className="font-mono text-[10px] font-bold text-sky-750 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100 shrink-0">
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
                    className="bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-950 font-semibold text-[11px] px-3.5 py-2 rounded-full border border-slate-200 hover:border-sky-200 shadow-3xs transition cursor-pointer text-left focus:outline-none"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Floating AI Chatbot Widget Simulation */}
          {(simulationLayout === "split" || isChatOpen) && (
            <div className={`${
              simulationLayout === "floating"
                ? "absolute bottom-6 right-6 w-[345px] z-45 shadow-2xl scale-100 animate-in fade-in slide-in-from-bottom-4 duration-200"
                : "w-full lg:w-[360px]"
            } bg-white rounded-2xl border ${themeColors.border} shadow-lg flex flex-col shrink-0 overflow-hidden h-[450px] lg:h-[480px] self-end relative`}>
              
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
                      {isPortfolio ? "Portfolio Assistant" : "Reception Assistant"}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {/* Voice Readback speaker switch for Text Chat */}
              {activeWidgetMode === "chat" && (
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
              )}

              <button
                onClick={clearConversation}
                className="text-white/80 hover:text-white text-[10px] font-semibold flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded-md transition"
                title="Clear Conversation"
              >
                <RefreshCw className="w-3 h-3" />
                Clear
              </button>

              {simulationLayout === "floating" && (
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-white hover:text-white text-[10px] bg-white/10 hover:bg-white/20 p-1.5 rounded-md transition cursor-pointer flex items-center justify-center shrink-0"
                  title="Minimize Chat Widget"
                  id="header-minimize-btn"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Mode Switching Tabs (Text vs Direct Call Phone Style) */}
          <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
            <button
              onClick={() => {
                if (isCallActive) endVoiceCall();
                setActiveWidgetMode("chat");
              }}
              className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeWidgetMode === "chat"
                  ? `text-slate-900 border-slate-900 bg-white`
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Interactive Chat
            </button>
            <button
              onClick={() => setActiveWidgetMode("call")}
              className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeWidgetMode === "call"
                  ? `text-slate-900 border-slate-900 bg-white`
                  : "text-slate-550 border-transparent hover:text-slate-800"
              }`}
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              AI Voice Call
            </button>
          </div>

          {/* Guidelines info bar */}
          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 text-[10px] text-slate-550 flex items-center gap-1 text-left shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>UK compliance rules protect health data. Clinical diagnosis is disabled.</span>
          </div>

          {/* Floating voice mic states feedback bar */}
          {micStateMsg && (
            <div className="bg-slate-900 text-white text-[10px] px-3.5 py-2 flex justify-between items-center animate-fade-in font-medium border-b border-slate-950 shrink-0">
              <span className="truncate flex items-center gap-1.5 max-w-[90%]">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping inline-block" />
                {micStateMsg}
              </span>
              <button onClick={() => setMicStateMsg(null)} className="text-white/50 hover:text-white font-bold ml-2">×</button>
            </div>
          )}

          {/* DUAL MODE BODY IMPLEMENTATION */}
          {activeWidgetMode === "chat" ? (
            /* ================= MODE A: INTERACTIVE CHAT ================= */
            <>
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

              {/* Form write interface (Explicitly client-only text-to-speech removed here) */}
              <div className="p-3 bg-white border-t border-slate-100 flex gap-1.5 items-center">
                <input
                  type="text"
                  placeholder="Ask about hours, services, book..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputText)}
                  className="flex-1 text-xs border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2 bg-slate-50/50"
                />
                
                <button
                  onClick={() => handleSendMessage(inputText)}
                  className={`p-2 rounded-xl text-white transition flex items-center justify-center shrink-0 cursor-pointer ${themeColors.bg}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            /* ================= MODE B: VOICE DIRECT CALL (PEER PHONE CALL LAYOUT) ================= */
            <div className="flex-1 flex flex-col bg-slate-900 text-white relative overflow-hidden">
              {/* Call Mode Layout Wrapper */}
              {!isCallActive ? (
                /* Static State: Click Dial line to start */
                <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 animate-pulse border border-emerald-500/30">
                    <PhoneCall className="w-9 h-9" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-200 font-sans">Patient Voice Concierge desk</span>
                    <p className="text-[11px] leading-relaxed text-slate-450 max-w-[240px]">
                      Ring clinic AI directly. Talk into your microphone—the assistant will listen and answer out loud immediately in natural British voice stream.
                    </p>
                  </div>
                  <button
                    onClick={startVoiceCall}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    Place Voice Call
                  </button>
                  <div className="text-[8.5px] text-slate-500 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>Secure voice line under UK healthcare policy</span>
                  </div>
                </div>
              ) : (
                /* Live Connected Call Screen */
                <div className="flex-1 flex flex-col bg-slate-950 text-white relative">
                  
                  {/* Glowing core calling background asset */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06),transparent_70%)] pointer-events-none" />

                  {/* Header Status ticker & Timer duration tracker */}
                  <div className="p-3 flex flex-col items-center bg-black/20 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          callStep === "calling" ? "bg-amber-400" : callStep === "connected" ? "bg-emerald-400" : "bg-red-400"
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                          callStep === "calling" ? "bg-amber-400" : callStep === "connected" ? "bg-emerald-400" : "bg-red-400"
                        }`}></span>
                      </span>
                      <span className="text-[10px] font-mono tracking-wider font-semibold uppercase text-white/50">
                        {callStep === "calling" ? "Dialling AI Concierge..." : callStep === "connected" ? "On-Line Live" : "Terminating..."}
                      </span>
                    </div>

                    <span className="text-xl font-bold font-mono tracking-tight mt-0.5 text-white/95">
                      {Math.floor(callDuration / 60).toString().padStart(2, "0")}:{(callDuration % 60).toString().padStart(2, "0")}
                    </span>
                  </div>

                  {/* Active Speaker wave and Status text */}
                  <div className="flex-1 flex flex-col items-center justify-center p-3 relative">
                    
                    {/* Glowing audio speaker ring visual asset */}
                    <div className="relative flex items-center justify-center h-24 w-24">
                      {speechStatus === "speaking" && (
                        <>
                          <div className="absolute h-24 w-24 rounded-full border border-emerald-500/25 animate-ping" />
                          <div className="absolute h-20 w-20 rounded-full border border-emerald-500/35 animate-ping [animation-delay:0.3s]" />
                        </>
                      )}
                      {speechStatus === "listening" && (
                        <div className="absolute h-24 w-24 rounded-full bg-sky-500/10 animate-pulse border border-sky-500/20" />
                      )}
                      {speechStatus === "processing" && (
                        <div className="absolute h-24 w-24 rounded-full bg-amber-500/10 animate-spin border-dashed border border-amber-500/20" />
                      )}

                      <div className={`h-16 w-16 rounded-full flex items-center justify-center border shadow-xl relative z-10 transition-colors duration-300 ${
                        speechStatus === "speaking"
                          ? "bg-emerald-600 border-emerald-400 text-white"
                          : speechStatus === "listening"
                          ? "bg-sky-600 border-sky-400 text-white animate-pulse"
                          : speechStatus === "processing"
                          ? "bg-amber-600 border-amber-400 text-white animate-bounce"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      }`}>
                        {speechStatus === "speaking" ? (
                          <Volume2 className="w-6 h-6 animate-pulse" />
                        ) : speechStatus === "listening" ? (
                          <Mic className="w-6 h-6" />
                        ) : speechStatus === "processing" ? (
                          <Loader className="w-6 h-6 animate-spin" />
                        ) : (
                          <User className="w-6 h-6" />
                        )}
                      </div>
                    </div>

                    <div className="text-center mt-3 space-y-0.5 z-10 max-w-[240px]">
                      <h5 className="text-xs font-bold text-white/95 leading-none">{activeClinic.name} Concierge</h5>
                      <p className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest mt-1">
                        {speechStatus === "speaking"
                          ? "🔊 Speaking response..."
                          : speechStatus === "listening"
                          ? "🎙️ Listening... speak now"
                          : speechStatus === "processing"
                          ? "⚙️ AI is responding..."
                          : "🚪 Standby..."}
                      </p>
                    </div>

                    {/* Scrolling Dialogue Script Log Screen */}
                    <div className="absolute bottom-2 left-2 right-2 max-h-[80px] overflow-y-auto bg-black/50 border border-white/5 rounded-xl p-2.5 text-left space-y-1 block max-w-full">
                      <span className="text-[8px] text-white/30 font-bold uppercase tracking-wider font-mono block">Personal voice dialogue</span>
                      {voiceTranscript.length === 0 ? (
                        <span className="text-[10px] text-white/35 italic block leading-relaxed">No dialog yet. Connecting link...</span>
                      ) : (
                        voiceTranscript.slice(-2).map((vt, i) => (
                          <div key={i} className="text-[10px] leading-relaxed">
                            <span className={`font-semibold ${vt.sender === "user" ? "text-sky-400" : vt.sender === "system" ? "text-red-400" : "text-emerald-400"}`}>
                              {vt.sender === "user" ? "You: " : vt.sender === "system" ? "Sys: " : "AI: "}
                            </span>
                            <span className="text-white/80">{vt.content}</span>
                          </div>
                        ))
                      )}
                    </div>

                  </div>

                  {/* Telephone Switch Dial controls */}
                  <div className="p-3 border-t border-white/5 bg-black/40 flex items-center justify-around shrink-0">
                    {/* Audio Muted Trigger */}
                    <button
                      onClick={handleToggleCallMute}
                      className={`p-2.5 rounded-full border transition duration-200 cursor-pointer ${
                        callMuted
                          ? "bg-red-500/20 text-red-400 border-red-500 hover:bg-red-500/30"
                          : "bg-white/5 text-white/60 border-white/10 hover:bg-white/15 h-10 w-10 flex items-center justify-center"
                      }`}
                      title={callMuted ? "Unmute Call microphone" : "Mute Call microphone"}
                    >
                      {callMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    {/* End call red circular key */}
                    <button
                      onClick={endVoiceCall}
                      className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition hover:scale-105 active:scale-95 duration-150 shadow-md cursor-pointer h-12 w-12 flex items-center justify-center shrink-0"
                      title="Hang up call"
                    >
                      <PhoneOff className="w-5 h-5 focus:outline-none" />
                    </button>

                    <div className="text-right flex flex-col justify-center items-end opacity-40">
                      <span className="text-[7.5px] font-mono uppercase font-bold tracking-wider text-slate-400">Audio feed</span>
                      <span className="text-[8.5px] font-mono text-emerald-400 font-bold">HD OPUS</span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

            </div>
          )}

        </div>

        {/* Floating corner circle indicator (shown ONLY when in floating layout and widget is minimized) */}
        {simulationLayout === "floating" && !isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className={`fixed md:absolute bottom-6 right-7 ${themeColors.bg} text-white p-4.5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer z-50 group flex items-center justify-center`}
            id="corner-floating-bubble-toggle"
          >
            <div className="relative">
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <MessageSquare className="w-6 h-6 animate-pulse" />
            </div>
          </button>
        )}

      </div>

    </div>
  );
}
