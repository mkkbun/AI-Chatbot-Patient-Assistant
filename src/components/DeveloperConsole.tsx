import React, { useEffect, useState } from "react";
import { ExtractedInfo, Clinic } from "../types";
import { Cpu, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, Calendar, User, Phone, Mail, Terminal } from "lucide-react";

interface DeveloperConsoleProps {
  extractedInfo: ExtractedInfo;
  currentIntent: "booking" | "general_qa" | "medical_refusal" | "escalation" | "";
  shouldEscalate: boolean;
  activeClinic: Clinic;
  chatHistoryLength: number;
}

interface LogEntry {
  timestamp: string;
  type: "info" | "warning" | "success" | "error";
  message: string;
}

export default function DeveloperConsole({
  extractedInfo,
  currentIntent,
  shouldEscalate,
  activeClinic,
  chatHistoryLength
}: DeveloperConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Generate initial startup logs
    const nowStr = () => new Date().toLocaleTimeString();
    setLogs([
      { timestamp: nowStr(), type: "info", message: `AI Orchestrator loaded for ${activeClinic.name}.` },
      { timestamp: nowStr(), type: "success", message: `Dynamic clinical prompt loaded successfully.` },
      { timestamp: nowStr(), type: "info", message: `Compliance engine online (UK Health Safety Guideline v4).` }
    ]);
  }, [activeClinic]);

  useEffect(() => {
    if (chatHistoryLength === 0) return;
    const nowStr = () => new Date().toLocaleTimeString();
    
    // Create logical logs based on active states
    const newLogs: LogEntry[] = [];
    
    newLogs.push({
      timestamp: nowStr(),
      type: "info",
      message: `POST /api/chat - Dispatching context payload (History: ${chatHistoryLength} items)`
    });

    if (currentIntent) {
      let iconType: "info" | "success" | "warning" | "error" = "info";
      let msg = "";
      
      if (currentIntent === "medical_refusal") {
        iconType = "error";
        msg = "SAFETY RECOGNIZED: Clinical diagnosis block triggered. Directing to NHS 111 / 999.";
      } else if (currentIntent === "escalation" || shouldEscalate) {
        iconType = "warning";
        msg = "ESCALATION DETECTED: Triggering clinical support operator alerts.";
      } else if (currentIntent === "booking") {
        iconType = "success";
        msg = `BOOKING INTENT IDENTIFIED: Rendering direct schedule URL: ${activeClinic.bookingUrl}`;
      } else {
        iconType = "info";
        msg = "Q&A INTENT IDENTIFIED: Query matching clinic configuration.";
      }
      
      newLogs.push({ timestamp: nowStr(), type: iconType, message: msg });
    }

    // Slot extraction details
    const slots = [];
    if (extractedInfo.patientName) slots.push(`Name ("${extractedInfo.patientName}")`);
    if (extractedInfo.phone) slots.push(`Phone ("${extractedInfo.phone}")`);
    if (extractedInfo.email) slots.push(`Email ("${extractedInfo.email}")`);
    
    if (slots.length > 0) {
      newLogs.push({
        timestamp: nowStr(),
        type: "success",
        message: `PII LEAD GENERATION SUCCESS: Slot-filled info extracted: [${slots.join(", ")}]`
      });
    }

    setLogs(prev => [...prev, ...newLogs].slice(-50)); // Keep last 50
  }, [chatHistoryLength, extractedInfo, currentIntent, shouldEscalate]);

  return (
    <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs space-y-5 text-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest flex items-center gap-2">
          <Cpu className="w-5 h-5 text-sky-600 animate-pulse" />
          Live AI Inspection Console
        </h3>
        <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
          Tenant Module
        </span>
      </div>

      {/* 1. Slot Filling Matrix (Contact Leads Collected) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
          Patient Registration Slots (Pre-booking CRM)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Patient Name Slots */}
          <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            extractedInfo.patientName 
              ? "border-emerald-200 bg-emerald-50/30 text-emerald-900" 
              : "border-slate-200 bg-slate-50/50 text-slate-400"
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <User className={`w-4 h-4 shrink-0 ${extractedInfo.patientName ? "text-emerald-600" : "text-slate-400"}`} />
              <div className="text-left leading-normal min-w-0">
                <div className="text-[9px] font-bold font-mono leading-none tracking-wider text-slate-400">PATIENT NAME</div>
                <div className="text-xs font-semibold mt-0.5 truncate">
                  {extractedInfo.patientName || "Awaiting entry..."}
                </div>
              </div>
            </div>
            {extractedInfo.patientName && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          </div>

          {/* Patient Contact Phone */}
          <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            extractedInfo.phone 
              ? "border-emerald-200 bg-emerald-50/30 text-emerald-900" 
              : "border-slate-200 bg-slate-50/50 text-slate-400"
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Phone className={`w-4 h-4 shrink-0 ${extractedInfo.phone ? "text-emerald-600" : "text-slate-400"}`} />
              <div className="text-left leading-normal min-w-0">
                <div className="text-[9px] font-bold font-mono leading-none tracking-wider text-slate-400">CONTACT PHONE</div>
                <div className="text-xs font-semibold mt-0.5 truncate font-mono">
                  {extractedInfo.phone || "Awaiting entry..."}
                </div>
              </div>
            </div>
            {extractedInfo.phone && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          </div>

          {/* Patient Email */}
          <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            extractedInfo.email 
              ? "border-emerald-200 bg-emerald-50/30 text-emerald-900" 
              : "border-slate-200 bg-slate-50/50 text-slate-400"
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Mail className={`w-4 h-4 shrink-0 ${extractedInfo.email ? "text-emerald-600" : "text-slate-400"}`} />
              <div className="text-left leading-normal min-w-0">
                <div className="text-[9px] font-bold font-mono leading-none tracking-wider text-slate-400">EMAIL INBOX</div>
                <div className="text-xs font-semibold mt-0.5 truncate font-mono">
                  {extractedInfo.email || "Awaiting entry..."}
                </div>
              </div>
            </div>
            {extractedInfo.email && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          </div>

        </div>
      </div>

      {/* 2. Detected Intent Diagnostics */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
          Detected Conversation Intent
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          
          <div className={`p-2.5 rounded-xl border text-center transition ${
            currentIntent === "general_qa" 
              ? "border-sky-200 bg-sky-50/30 text-sky-950 font-bold" 
              : "border-slate-200 bg-white text-slate-500 opacity-60"
          }`}>
            <HelpCircle className="w-4 h-4 mx-auto mb-1 text-sky-500" />
            <div className="text-xs font-bold">General Q&A</div>
          </div>

          <div className={`p-2.5 rounded-xl border text-center transition ${
            currentIntent === "booking" 
              ? "border-sky-300 bg-sky-50/50 text-sky-950 font-bold" 
              : "border-slate-200 bg-white text-slate-500 opacity-60"
          }`}>
            <Calendar className="w-4 h-4 mx-auto mb-1 text-sky-600" />
            <div className="text-xs font-bold">Booking Lead</div>
          </div>

          <div className={`p-2.5 rounded-xl border text-center transition ${
            currentIntent === "medical_refusal" 
              ? "border-red-200 bg-red-50 text-red-900 font-bold" 
              : "border-slate-200 bg-white text-slate-500 opacity-60"
          }`}>
            <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-red-600 animate-bounce" />
            <div className="text-xs font-bold text-red-700">Medical Warning</div>
          </div>

          <div className={`p-2.5 rounded-xl border text-center transition ${
            currentIntent === "escalation" || shouldEscalate
              ? "border-amber-200 bg-amber-50 text-amber-900 font-bold animate-pulse" 
              : "border-slate-200 bg-white text-slate-500 opacity-60"
          }`}>
            <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
            <div className="text-xs font-bold text-amber-700">CRM Escalation</div>
          </div>

        </div>
      </div>

      {/* 3. Terminal output */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <span className="uppercase tracking-widest leading-none">System Execution Logs (Local / LLM Events)</span>
          <span className="font-mono text-[9px] text-slate-400 flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-sky-600" />
            v2.4.0-Enterprise
          </span>
        </div>
        <div className="bg-[#0F172A] rounded-xl p-4 font-mono text-xs overflow-auto max-h-[160px] space-y-2 text-slate-300 text-left leading-relaxed">
          {logs.length === 0 ? (
            <div className="text-slate-555 italic text-center py-4">Awaiting dialogue traffic to monitor pipeline...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex items-start gap-1.5 leading-tight">
                <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                <span className={`font-semibold shrink-0 uppercase text-[9px] px-1.5 py-0.5 rounded ${
                  log.type === "success" ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900" :
                  log.type === "warning" ? "bg-amber-950/50 text-amber-400 border border-amber-900" :
                  log.type === "error" ? "bg-red-950/50 text-red-300 border border-red-900 animate-pulse" :
                  "bg-slate-900 text-slate-300 border border-slate-800"
                }`}>
                  {log.type}
                </span>
                <span className="text-slate-200 flex-1 break-all select-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
