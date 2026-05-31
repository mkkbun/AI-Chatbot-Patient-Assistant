import React, { useState, useEffect } from "react";
import { Clinic, ExtractedInfo, Message } from "./types";
import ClinicSimulation from "./components/ClinicSimulation";
import DeveloperConsole from "./components/DeveloperConsole";
import Configurator from "./components/Configurator";
import ArchitectureHub from "./components/ArchitectureHub";
import { Layout, Cpu, Settings2, FileText, Heart, Shield, Sparkles, Building2, Terminal } from "lucide-react";

export default function App() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  
  // Real-time developer telemetry metrics
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo>({
    patientName: null,
    phone: null,
    email: null
  });
  const [currentIntent, setCurrentIntent] = useState<"booking" | "general_qa" | "medical_refusal" | "escalation" | "">("");
  const [shouldEscalate, setShouldEscalate] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"simulator" | "configurator" | "architecture">("simulator");

  // Load Tenants on mount
  const loadClinics = async () => {
    try {
      const res = await fetch("/api/clinics");
      if (res.ok) {
        const data = await res.json();
        setClinics(data);
        if (data.length > 0) {
          // Sync with currently selected, otherwise default first
          setSelectedClinic(prev => {
            const existed = data.find((c: Clinic) => c.id === prev?.id);
            return existed || data[0];
          });
        }
      }
    } catch (err) {
      console.error("Failed to load clinic configurations", err);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  // Clear states when user flips clinic settings to avoid context leak
  const handleClinicSelect = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setChatHistory([]);
    setExtractedInfo({ patientName: null, phone: null, email: null });
    setCurrentIntent("");
    setShouldEscalate(false);
  };

  // REST API: Save profile modification
  const handleUpdateClinic = async (updated: Clinic) => {
    try {
      const res = await fetch(`/api/clinics/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const saved = await res.json();
        setClinics(prev => prev.map(c => c.id === saved.id ? saved : c));
        setSelectedClinic(saved);
      }
    } catch (err) {
      console.error("Failed to update clinic template in-database", err);
    }
  };

  // REST API: Duplicate preset profile (multi-tenancy demo)
  const handleDuplicateClinic = async (target: Clinic) => {
    try {
      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target)
      });
      if (res.ok) {
        const added = await res.json();
        setClinics(prev => [...prev, added]);
        setSelectedClinic(added);
        // Clear chat
        setChatHistory([]);
        setExtractedInfo({ patientName: null, phone: null, email: null });
        setCurrentIntent("");
        setShouldEscalate(false);
      }
    } catch (err) {
      console.error("Failed to duplicate clinic preset", err);
    }
  };

  // REST API: Reset clinics to initial clean configurations
  const handleResetClinics = async () => {
    try {
      const res = await fetch("/api/clinics/reset", { method: "POST" });
      if (res.ok) {
        const defaults = await res.json();
        setClinics(defaults);
        if (defaults.length > 0) {
          setSelectedClinic(defaults[0]);
          setChatHistory([]);
          setExtractedInfo({ patientName: null, phone: null, email: null });
          setCurrentIntent("");
          setShouldEscalate(false);
        }
      }
    } catch (err) {
      console.error("Failed to trigger factory reset", err);
    }
  };

  if (clinics.length === 0 || !selectedClinic) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans">
        <div className="flex flex-col items-center gap-2">
          <Building2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Booting AI Orchestrator Sandbox...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans tracking-tight antialiased">
      
      {/* Platform Dashboard Top Navigation bar - Clean Minimalism style */}
      <header className="sticky top-0 z-50 bg-white text-slate-800 shadow-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 p-2.5 rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100 font-bold font-mono tracking-wider">Agency Platform</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">UK AI Patient Assistant</h1>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Viewing Tenant Profile:</span>
            <select
              value={selectedClinic.id}
              onChange={(e) => {
                const matched = clinics.find(c => c.id === e.target.value);
                if (matched) handleClinicSelect(matched);
              }}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 px-3 py-2.5 transition"
            >
              {clinics.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Body Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Workspace Tab Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
            <button
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "simulator"
                  ? "bg-white text-slate-950 shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Layout className="w-4 h-4 text-sky-600" />
              Patient Web Widget
            </button>
            <button
              onClick={() => setActiveTab("configurator")}
              className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "configurator"
                  ? "bg-white text-slate-950 shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Settings2 className="w-4 h-4 text-sky-600" />
              SaaS Playground
            </button>
            <button
              onClick={() => setActiveTab("architecture")}
              className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "architecture"
                  ? "bg-white text-slate-950 shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <FileText className="w-4 h-4 text-sky-600" />
              SaaS Architectural Blueprints
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <Terminal className="text-sky-600 w-4 h-4 shrink-0" />
            <span>Dev Origin: <code className="text-slate-900 font-bold font-mono">http://localhost:3000</code></span>
          </div>
        </div>

        {/* Dynamic Workspace Container */}
        <div>
          {activeTab === "simulator" && (
            <div className="space-y-6">
              
              {/* Alert Ribbon if Human is Escalated */}
              {shouldEscalate && (
                <div className="bg-amber-50 text-amber-900 px-4 py-3.5 rounded-2xl border border-amber-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                  <div className="flex items-start gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 animate-ping shrink-0" />
                    <div>
                      <span className="font-bold text-xs uppercase block leading-none">Receptionist Operator Paged</span>
                      <p className="text-xs text-amber-700 mt-1 leading-snug">
                        The AI classified this convo. as a priority case. The record has been pushed to the receptionist inbox for offline follow up.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShouldEscalate(false);
                      setCurrentIntent("general_qa");
                    }}
                    className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer self-start md:self-auto"
                  >
                    Clear operator alert
                  </button>
                </div>
              )}

              {/* Chat Simulation View (Interactive Website & Real chatbot + inspector sidebar) */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                
                {/* Visual Sandbox containing Clinic Site View & widget */}
                <div className="xl:col-span-2">
                  <ClinicSimulation
                    activeClinic={selectedClinic}
                    extractedInfo={extractedInfo}
                    onUpdateExtractedInfo={setExtractedInfo}
                    onUpdateIntent={(intent, esc) => {
                      setCurrentIntent(intent);
                      if (esc) setShouldEscalate(true);
                    }}
                    chatHistory={chatHistory}
                    setChatHistory={setChatHistory}
                  />
                </div>

                {/* Live Inspection Console Telemetry Stream */}
                <div className="xl:col-span-1">
                  <DeveloperConsole
                    extractedInfo={extractedInfo}
                    currentIntent={currentIntent}
                    shouldEscalate={shouldEscalate}
                    activeClinic={selectedClinic}
                    chatHistoryLength={chatHistory.length}
                  />
                </div>

              </div>

            </div>
          )}

          {activeTab === "configurator" && (
            <Configurator
              clinics={clinics}
              selectedClinic={selectedClinic}
              onUpdateClinic={handleUpdateClinic}
              onDuplicateClinic={handleDuplicateClinic}
              onResetClinics={handleResetClinics}
              onSelectClinic={handleClinicSelect}
            />
          )}

          {activeTab === "architecture" && (
            <ArchitectureHub />
          )}
        </div>

      </main>

      {/* Page Footer */}
      <footer className="bg-white text-slate-400 py-6 border-t border-slate-200 mt-12 text-[11px] font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600" />
            <span className="font-mono text-[11px] text-slate-650">UK Healthcare AI SaaS Boilerplate v2.4.0-Enterprise</span>
          </div>
          <div className="flex gap-6">
            <span className="text-slate-400">ACTIVE CLINICS: <span className="text-slate-700 font-bold">186</span></span>
            <span className="text-slate-400">GDPR STATUS: <span className="text-emerald-600 font-bold uppercase">Compliant</span></span>
            <span className="text-slate-400">AVG TOKEN COST: <span className="text-slate-700 font-bold">£0.002 / chat</span></span>
          </div>
          <div className="text-slate-400 italic">Powered by Gemini + HealthGuard™ Runtime</div>
        </div>
      </footer>

    </div>
  );
}

