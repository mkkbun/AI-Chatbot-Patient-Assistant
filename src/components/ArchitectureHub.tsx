import React, { useState } from "react";
import { BookOpen, ShieldCheck, Cpu, Code2, Layers, Zap, Info, Copy, Check, Database, Award, ArrowRight } from "lucide-react";

export default function ArchitectureHub() {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const folderStructureText = `my-digital-agency-saas/
├── apps/
│   ├── api-gateway/                 # Handles CORS, Rate Limiting, & API Key Auth
│   ├── chat-widget/                 # Vanilla JS / React micro-frontend loaded via CDN
│   └── portal-dashboard/            # React/Next.js dashboard for clinic owners
├── packages/
│   ├── db-schema/                   # Shared Prisma definitions (Postgres/Supabase)
│   ├── ai-engine/                   # Core LLM prompt templates, Guardrails & LLM Clients
│   └── clinic-configs/              # JSON verification schemas and default templates
├── services/
│   ├── chat-orchestrator/           # Node.js + Express microservice for chat routing
│   │   ├── src/
│   │   │   ├── config/              # Dynamic tenant config loaders
│   │   │   ├── controllers/         # Handles /chat hook and context extraction
│   │   │   ├── middleware/          # GDPR filters & rate meters
│   │   │   ├── services/            # OpenAI / Gemini API wrappers
│   │   │   └── utils/               # Intent classifiers & HIPAA/GDPR parsers
│   └── webhook-handler/             # Listens to incoming Twilio (WhatsApp/Voice) triggers
└── docker-compose.yml`;

  const promptExampleText = `You are an automated reception concierge on the official website of:
- Name: {{CLINIC_NAME}}
- Type: {{CLINIC_TYPE}} (e.g., Dental, Private GP, Wellness)
- Location: {{CLINIC_ADDRESS}}

### CLINIC INVENTORY
{{CLINIC_SERVICES}}

### COMPLIANCE RULES (CRITICAL)
- Absolute Prohibition: Do not diagnose symptoms, suggest medication (e.g. "take paracetamol"), recommend therapies, or evaluate physical wellness.
- Refusal Guide: If a user asks a clinical diagnostic question, respond: "{{CLINIC_SAFETY_REFUSAL_PROMPT}}"
- Safety Override: If they declare severe symptoms such as heavy bleeding, extreme swelling, chest discomfort, or breathing struggle, alert them to visit a local A&E or dial 999.

### RESPONSE SCHEMAFORMAT:
Always respond with a valid JSON document matching:
{
  "reply": "Empathetic response using British spelling...",
  "extractedInfo": {
    "patientName": "string | null",
    "phone": "UK phone number | null",
    "email": "email | null"
  },
  "intent": "booking" | "general_qa" | "medical_refusal" | "escalation",
  "shouldEscalate": boolean
}`;

  return (
    <div id="architecture-hub-section" className="space-y-8 text-slate-800">
      <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-sky-600" />
          Production Engineering Manual
        </h2>
        <p className="mt-1 text-slate-500 text-xs">
          A modular, production-tested blueprint designed for UK dental clinics & private hospitals. 
          Use this interactive hub to review technical files, GDPR safety rules, and scale pathways.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Visual charts & Prompt templates */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Chat Workflow Visualization */}
          <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-sky-600" />
              1. Modular Chat Processing Workflow
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch">
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-center flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-sky-600 uppercase">Step 01</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">Ingress</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Patient enters message on Website Widget, WhatsApp, or SMS.</p>
              </div>
              <div className="flex items-center justify-center text-slate-300 md:rotate-0 rotate-90 py-1">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-center flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-emerald-600 uppercase">Step 02</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">GDPR & Safety</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Scan input for extreme clinical crises (triggers instant 999 guide).</p>
              </div>
              <div className="flex items-center justify-center text-slate-300 md:rotate-0 rotate-90 py-1">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-center flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-sky-600 uppercase">Step 03</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">AI Execution</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Inject tenant configuration with JSON schema enforce instructions.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch mt-4">
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-center flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-amber-600 uppercase">Step 04</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">Intent Parsing</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Read generated JSON variables. Trigger routing handlers.</p>
              </div>
              <div className="flex items-center justify-center text-slate-300 md:rotate-0 rotate-90 py-1">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-center flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-sky-600 uppercase">Step 05</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">Slot Filling</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Identify if contact leads were gathered; update Clinic CRM logs.</p>
              </div>
              <div className="flex items-center justify-center text-slate-300 md:rotate-0 rotate-90 py-1">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-center flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-sky-700 uppercase">Step 06</div>
                  <div className="text-xs font-bold text-sky-950 mt-1">Response Out</div>
                </div>
                <p className="text-[11px] text-sky-700 mt-2">Stream British response to widget with interactive booking blocks.</p>
              </div>
            </div>
          </div>

          {/* Section 2: prompt engineering */}
          <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-600" />
                2. Prompt Engineering & Tone Design
              </h3>
              <button
                onClick={() => handleCopy(promptExampleText, "prompt")}
                className="text-xs text-sky-700 hover:text-sky-850 transition flex items-center gap-1 font-bold bg-sky-50 border border-sky-100 hover:bg-sky-100 px-2.5 py-1 rounded-lg"
              >
                {copiedSnippet === "prompt" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSnippet === "prompt" ? "Copied" : "Copy Template"}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              This engineered system prompt forces the model to strictly perform dynamic slot filling, intent categorization, safety guardrails, and return consistent JSON structures in a single prompt execution.
            </p>
            <div className="bg-[#0F172A] text-slate-200 p-4 rounded-xl text-xs font-mono overflow-auto max-h-[300px] border border-slate-800">
              <pre>{promptExampleText}</pre>
            </div>
          </div>

          {/* Section 3: Folder Structure */}
          <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Code2 className="w-5 h-5 text-sky-600" />
                3. Production Backend Folder Schema
              </h3>
              <button
                onClick={() => handleCopy(folderStructureText, "folders")}
                className="text-xs text-sky-700 hover:text-sky-855 transition flex items-center gap-1 font-bold bg-sky-50 border border-sky-100 hover:bg-sky-100 px-2.5 py-1 rounded-lg"
              >
                {copiedSnippet === "folders" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSnippet === "folders" ? "Copied" : "Copy Structure"}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              We recommend a monorepo setup (using Turborepo, pnpm workspaces, or direct modular layers) for agency scaling. This allows rapid client deployment, dynamic CDN widget delivery, and easy SaaS orchestration.
            </p>
            <div className="bg-[#0F172A] text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-auto max-h-[280px] border border-slate-800">
              <pre>{folderStructureText}</pre>
            </div>
          </div>
        </div>

        {/* Right column - Answers to detailed scaling questions (Bullet points / text) */}
        <div className="space-y-6">
          {/* Section 4: Safety Guardrails */}
          <div className="border border-emerald-200 bg-emerald-50/30 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-widest flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Healthcare Safety Guardrails
            </h3>
            <ul className="space-y-3 text-xs leading-relaxed text-slate-70500">
              <li>
                <strong className="text-slate-900 block font-bold mb-0.5">Pre-inference Keyphrase Filter:</strong>
                <p>Run immediate checks on query strings for severe, dangerous keywords (e.g., severe hemorrhage, anaphylaxis) on the Express layer to bypass LLM latency and trigger rapid 999 response templates immediately.</p>
              </li>
              <li>
                <strong className="text-slate-900 block font-bold mb-0.5">Clinical Boundary Enforcer:</strong>
                <p>Embed solid refusal messages in the prompt templates. Force the chatbot to pivot standard symptoms to safe registration schedules or recommend NHS 111 assessments.</p>
              </li>
              <li>
                <strong className="text-slate-900 block font-bold mb-0.5">GDPR Compliance Filters:</strong>
                <p>Store all in-flight conversation states without PII in browser memory. Store client registration records in a secure, encrypted UK clinic CRM database rather than inside OpenAI/Gemini logs.</p>
              </li>
            </ul>
          </div>

          {/* Section 5: Multi-Clinic Scaling Model */}
          <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-sky-600" />
              Scaling to 100+ Clinics
            </h3>
            <div className="space-y-3 text-xs leading-relaxed text-slate-550">
              <div>
                <strong className="text-slate-900 block font-bold mb-0.5">1. Dynamic Tenant Middleware:</strong>
                Configure a wildcard CDN routing (e.g., <code className="bg-slate-100 px-1 text-sky-600 rounded">widget.agency.com/loader.js</code>) that reads the clinic&apos;s API key, queries the Postgres tenant table, caches parameters in Redis, and launches customized configurations on the fly.
              </div>
              <div>
                <strong className="text-slate-900 block font-bold mb-0.5">2. LLM Cache & Token Throttling:</strong>
                Implement semantic caching of administrative questions (opening hours, address details) to bypass LLM calls for repeated interactions, lowering API bills by up to 45%.
              </div>
              <div>
                <strong className="text-slate-900 block font-bold mb-0.5">3. Multi-Channel Triggers (WhatsApp):</strong>
                Orchestrate incoming webhooks from Twilio (for SMS & WhatsApp). Run clean session managers that track patient numbers, parse intents, and push booking links natively via WhatsApp templates.
              </div>
            </div>
          </div>

          {/* Section 6: Commercial Agency Value Props */}
          <div className="border border-slate-850 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-xs font-bold text-sky-450 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-sky-400" />
              SaaS Value Proposition
            </h3>
            <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
              UK dental clinics and private health practices are willing to pay £150–£400/month for these specific workload-saving features:
            </p>
            <ul className="space-y-2.5 text-xs text-slate-200 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✔</span>
                <span><strong>Out-of-Hours Conversions:</strong> Capture emergency checkups at 10 PM while competitors are completely silent.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✔</span>
                <span><strong>Pre-Registration Leads:</strong> Streamline incoming patients to input Name and Phone before sharing booking links, reducing flake rates.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✔</span>
                <span><strong>NHS vs. Private Directing:</strong> Route patient queries transparently, guiding premium clients directly to highly lucrative private slots.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
