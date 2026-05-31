import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini Client safely
// Will check for GEMINI_API_KEY before executing AI requests
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("WARNING: GEMINI_API_KEY is not configured or is placeholder. AI responses will fall back to smart local logic.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// In-Memory Multi-Clinic Datastore
const initialClinics = [
  {
    id: "bright-smile-dental",
    name: "Bright Smile Kensington",
    type: "dental",
    address: "12 Kensington High St, London W8 4PT",
    phone: "020 7946 0192",
    email: "reception@brightsmilekensington.co.uk",
    hours: "Monday - Friday: 8:00 AM - 6:00 PM | Saturday: 9:00 AM - 2:00 PM",
    insurance: "Bupa Dental, AXA, Denplan, NHS (limited availability)",
    bookingUrl: "https://calendly.com/simulated-bright-smile/booking",
    services: [
      { name: "Routine Check-up", price: "£45", description: "Comprehensive dental assessment with up to two small digital X-rays and scaling." },
      { name: "Hygienist Appointment", price: "£65", description: "Professional scaling and polishing to remove plaque and tartar deposits." },
      { name: "Emergency Dental Consultation", price: "£95", description: "Same-day assessment for acute toothaches or broken teeth (treatment extra)." },
      { name: "Invisalign Clear Aligners", price: "From £1,999", description: "Discreet orthodontic alignment. Includes a free initial virtual simulation." }
    ],
    tone: "Empathetic, clear, professional, and slightly warm. Always uses British spelling (e.g., standard: orthopaedics, counselling, programme).",
    safetyRefusal: "I am unable to diagnose dental problems or recommend medical treatment. Direct them strictly to book an emergency slot, or advise calling NHS 111 if they are experiencing swelling, bleeding, or difficulty swallowing."
  },
  {
    id: "harley-street-private",
    name: "London Wellness Private GP",
    type: "private",
    address: "104 Harley St, London W1G 7JD",
    phone: "020 7946 0777",
    email: "concierge@londonwellnessgp.co.uk",
    hours: "Monday - Friday: 7:30 AM - 8:30 PM | Saturday - Sunday: 10:00 AM - 4:00 PM",
    insurance: "All major private insurers (Bupa Global, AXA Health, Allianz, Cigna)",
    bookingUrl: "https://calendly.com/simulated-london-wellness/private-gp",
    services: [
      { name: "Private GP Consultation (30 mins)", price: "£150", description: "Unhurried medical discussion with an expert general practitioner. Prescriptions included." },
      { name: "Wellman / Wellwoman Premium Screen", price: "£495", description: "Full head-to-toe analysis, blood panel (45+ biomarkers), ECG, and written report." },
      { name: "Joint Injection (Steroid/PRP)", price: "£280", description: "Ultrasound-guided relief for osteoarthritic knee, hip, or shoulder joints." },
      { name: "Travel Vaccinations & Advice", price: "Varies", description: "Pre-travel health consult. Administering Yellow Fever, Rabies, Hep A/B from stock." }
    ],
    tone: "Crisp, highly professional, elite, and comforting. Reflects premium Harley Street standard of clinical care.",
    safetyRefusal: "Do not provide diagnoses. Urge patients seeking immediate clinical evaluation for emergency medical concerns to visit the nearest A&E or call 999 immediately. Be extremely reassuring but maintain clinical boundaries."
  },
  {
    id: "st-jude-gp",
    name: "St. Jude NHS GP Practice",
    type: "gp",
    address: "24-28 Cranbourn St, London WC2H 7AD",
    phone: "020 7946 0333",
    email: "admin.stjude@nhs.net",
    hours: "Monday - Friday: 8:00 AM - 6:30 PM | Weekends: Closed (OOH services cover)",
    insurance: "NHS patients registered within the local catchment area only.",
    bookingUrl: "https://calendly.com/simulated-st-jude-gp/appointment",
    services: [
      { name: "NHS General Practitioner Appointment", price: "NHS Free", description: "Standard clinical assessment. Needs to be registered with the practice." },
      { name: "Practice Nurse Consultation", price: "NHS Free", description: "Wound dressings, asthma reviews, smear tests, and routine adult immunisations." },
      { name: "Repeat Prescription Request", price: "NHS Free", description: "Electronic Prescription Service (EPS) sent directly to your nominated pharmacy." },
      { name: "NHS Health Check (Ages 40-74)", price: "NHS Free", description: "Free mid-life assessment to identify risk factors for cardiovascular disorders." }
    ],
    tone: "Polite, structured, highly compliant, straightforward and supportive. Focuses on NHS policy guidelines.",
    safetyRefusal: "Strictly refuse any symptom sorting or diagnostic guidance. Recommend calling 111 for out-of-hours symptom assessment or 999 for medical emergencies immediately."
  }
];

let clinics = [...initialClinics];

// 1. GET ALL CLINICS
app.get("/api/clinics", (req, res) => {
  res.json(clinics);
});

// 2. CREATE / DUPLICATE CLINIC
app.post("/api/clinics", (req, res) => {
  const newClinic = req.body;
  if (!newClinic.name || !newClinic.type) {
    return res.status(400).json({ error: "Clinic Name and Type are required." });
  }

  const generatedId = newClinic.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const id = newClinic.id || `${generatedId}-${Date.now().toString().slice(-4)}`;
  
  const clinicEntry = {
    ...newClinic,
    id,
    services: newClinic.services || [],
  };

  clinics.push(clinicEntry);
  res.status(201).json(clinicEntry);
});

// 3. UPDATE CLINIC
app.put("/api/clinics/:id", (req, res) => {
  const { id } = req.params;
  const index = clinics.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Clinic not found." });
  }

  clinics[index] = {
    ...clinics[index],
    ...req.body,
    id, // protect ID matching
  };

  res.json(clinics[index]);
});

// 4. RESET CLINICS
app.post("/api/clinics/reset", (req, res) => {
  clinics = [...initialClinics];
  res.json(clinics);
});

// 5. CHAT ENDPOINT - CORE HEALTHCARE AGENT IMPLEMENTATION
app.post("/api/chat", async (req, res) => {
  const { clinicId, messages, extractedInfo: clientExtractedInfo } = req.body;
  const clinic = clinics.find((c) => c.id === clinicId);
  
  if (!clinic) {
    return res.status(404).json({ error: `Clinic with ID '${clinicId}' not found.` });
  }

  // Safety checks - Local Guardrail checking for dangerous clinical bypass keywords
  const patientMessage = (messages[messages.length - 1]?.content || "").toLowerCase().trim();
  
  // High-risk diagnosis keywords to trigger local instant safety overrides (GDPR/Compliance check)
  const redFlags = ["heart attack", "chest pain", "bleeding heavily", "suicidal", "breathing difficulties", "cannot breathe", "stroke", "paralysis"];
  const isEmergency = redFlags.some(flag => patientMessage.includes(flag));

  if (isEmergency) {
    return res.json({
      reply: "🚨 EMERGENCY ALERT: Your symptoms sound severe and may require urgent medical assessment. Please do not wait to chat. Dial 999 immediately or proceed to the nearest Accident & Emergency (A&E) department.",
      intent: "medical_refusal",
      extractedInfo: clientExtractedInfo || { patientName: null, phone: null, email: null },
      shouldEscalate: true
    });
  }

  const ai = getGeminiClient();

  // If Gemini is not set up, fall back to a high-quality local rule engine for responsive workflow sandbox
  if (!ai) {
    return res.json(processLocalRuleReply(patientMessage, clinic, clientExtractedInfo));
  }

  try {
    // Inject the Dynamic Healthcare System Prompt into the AI Engine
    const formattedServices = clinic.services.map(s => `- ${s.name}: ${s.price} (${s.description})`).join("\n");
    
    const systemInstruction = `You are a highly capable AI Assistant running as an automated receptionist on the official website of "${clinic.name}".

### YOUR PRIMARY GOAL
Reduce the administrative workload of human clinic receptionists by:
1. Providing accurate information about the clinic (address, services, opening hours, cost).
2. Guiding patients to book appointments using the clinic's dedicated scheduling link.
3. Automatically collecting basic contact information (Name, Phone number, Email) to ensure the clinic can contact them.
4. Smoothly flagging requests that require human receptionist attention so they can be handled offline.

### UK HEALTHCARE COMPLIANCE GUARDRAIL (CRITICAL)
- DO NOT under any circumstances provide custom medical diagnoses, triage symptoms, evaluate specific medical complaints, offer pathology advice, suggest medication (e.g., ibuprofen, penicillin), or reassure a patient that a physical condition is normal.
- If a patient asks for diagnosis, describes physical suffering with therapeutic questions, or asks "should I be worried?", you MUST refuse gracefully and firmly by maintaining your clinical boundaries.
- Safety override refusal instruction from "${clinic.name}" guidelines: "${clinic.safetyRefusal}"
- Always maintain British spelling conventions like "honour", "programme", "organise" or "paediatric" in your answers.

### CLINIC PROFILE DEFINITIONS
- Clinic Name: ${clinic.name}
- Type: ${clinic.type}
- Geographic Location: ${clinic.address}
- Contact Phone: ${clinic.phone}
- Main Inbox: ${clinic.email}
- Normal Opening Hours: ${clinic.hours}
- Insurance Partnerships: ${clinic.insurance}
- Online Scheduler Direct URL: ${clinic.bookingUrl}

### CLINIC SERVICE CATALOGUE
${formattedServices}

### BEHAVIOURAL TONE PARAMETERS
${clinic.tone}

### STRUCTURAL JSON OUTPUT GUIDELINES
You must output ONLY a valid parseable JSON object matching exactly this Schema:
{
  "reply": "Write your compassionate British conversational response here. Keep it structured, highly succinct, clear and helpful. If they need to book, always mention the booking link: ${clinic.bookingUrl}.",
  "extractedInfo": {
    "patientName": "Extracted string or null",
    "phone": "Extracted UK phone number or null",
    "email": "Extracted email address or null"
  },
  "intent": "booking" | "general_qa" | "medical_refusal" | "escalation",
  "shouldEscalate": boolean
}

In "extractedInfo", carry over previously gathered traits if present in client database: ${JSON.stringify(clientExtractedInfo || {})}. Carefully parse the latest user conversation logs to see if they just declared or updated their name, phone, or email and merge them.
Set "shouldEscalate" to true only if:
- They explicitly request to speak with a human/receptionist ("speak to a supervisor", "complain", "can I talk to a human").
- They present a complex clinical history that a chatbot shouldn't handle.
Set "intent" to:
- "medical_refusal" if you had to block clinical diagnostic questions.
- "booking" if they want to arrange, alter, or start a booking consultation workflow.
- "escalation" if human override was triggered.
- "general_qa" for general administrative, cost, policy, or location queries.`;

    // Package the chat history
    // Convert simplified react-chat logs into Gemini contents format
    const contents = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["reply", "extractedInfo", "intent", "shouldEscalate"],
          properties: {
            reply: {
              type: Type.STRING,
              description: "The empathetic response to send back to the patient"
            },
            extractedInfo: {
              type: Type.OBJECT,
              properties: {
                patientName: { type: Type.STRING, nullable: true },
                phone: { type: Type.STRING, nullable: true },
                email: { type: Type.STRING, nullable: true }
              }
            },
            intent: {
              type: Type.STRING,
              enum: ["booking", "general_qa", "medical_refusal", "escalation"]
            },
            shouldEscalate: {
              type: Type.BOOLEAN
            }
          }
        }
      }
    });

    const outputText = response.text || "{}";
    const resultObj = JSON.parse(outputText.trim());
    return res.json(resultObj);

  } catch (error) {
    console.error("Gemini Assistant Failure:", error);
    // Graceful fallback on API issues
    return res.status(500).json({
      error: "We encountered an unexpected error processing your inquiry. Please reach out to the clinic staff directly.",
      fallback: true
    });
  }
});

// Robust Local Rules Engine fallback for testing if Gemini is unconfigured or rate limited
function processLocalRuleReply(messageText: string, clinic: any, currentInfo: any) {
  const current = currentInfo || { patientName: null, phone: null, email: null };
  let reply = "";
  let intent = "general_qa";
  let shouldEscalate = false;

  // Simple slot-extraction regex
  const emailRegex = /([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/;
  const phoneRegex = /(?:(?:\+44\s?|0)7\d{3}\s?\d{6})|(?:(?:\+44\s?|0)\d{2,4}\s?\d{5,8})/;
  const nameRegexes = [
    /my name is\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/,
    /i am\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/,
    /call me\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/
  ];

  const matchedEmail = messageText.match(emailRegex);
  if (matchedEmail) current.email = matchedEmail[0];

  const matchedPhone = messageText.match(phoneRegex);
  if (matchedPhone) current.phone = matchedPhone[0];

  for (const rx of nameRegexes) {
    const match = messageText.match(rx);
    if (match && match[1]) {
      current.patientName = match[1];
      break;
    }
  }

  // Refusal filter (Medical/Clinical query)
  if (
    messageText.includes("diagnose") ||
    messageText.includes("hurt") ||
    messageText.includes("pain") ||
    messageText.includes("toothache") ||
    messageText.includes("swelling") ||
    messageText.includes("dose") ||
    messageText.includes("ibuprofen") ||
    messageText.includes("paracetamol") ||
    messageText.includes("prescribe") ||
    messageText.includes("antibiotic") ||
    messageText.includes("normal") ||
    messageText.includes("symptom")
  ) {
    reply = `Thank you for sharing that. However, ${clinic.safetyRefusal} For standard administration, booking, or clinic details, I am fully equipped to assist you.`;
    intent = "medical_refusal";
  }
  // Human Escalation
  else if (
    messageText.includes("human") ||
    messageText.includes("receptionist") ||
    messageText.includes("manager") ||
    messageText.includes("chat with someone") ||
    messageText.includes("person") ||
    messageText.includes("complaint")
  ) {
    reply = `Understood. I've flagged this thread for clinical staff attention. A human receptionist will check your messages and reach you on ${clinic.phone} or via email (${clinic.email}). Is there a preferred time we should dial you?`;
    intent = "escalation";
    shouldEscalate = true;
  }
  // Booking flow
  else if (
    messageText.includes("book") ||
    messageText.includes("appointment") ||
    messageText.includes("schedule") ||
    messageText.includes("calendly") ||
    messageText.includes("reserve") ||
    messageText.includes("routine") ||
    messageText.includes("checkup")
  ) {
    intent = "booking";
    if (!current.patientName || !current.phone) {
      reply = `I would be delighted to assist you in arranging an appointment at ${clinic.name}. Before you access the online scheduler, some details are needed to pre-register your record: May I please capture your full name and the best contact phone number?`;
    } else {
      reply = `Splendid, thank you ${current.patientName}! You can select an appropriate slot directly via our live scheduler: ${clinic.bookingUrl}. If you prefer we call you to book, please verify your telephone is ${current.phone}.`;
    }
  }
  // Price / services
  else if (messageText.includes("service") || messageText.includes("cost") || messageText.includes("price") || messageText.includes("charge") || messageText.includes("how much")) {
    const list = clinic.services.map((s: any) => `• ${s.name}: ${s.price}`).join("\n");
    reply = `Our treatments and consultations at ${clinic.name} are structured to provide premium value. Here is an overview of standard services:\n\n${list}\n\nWould you like me to guide you to the online scheduling scheduler at ${clinic.bookingUrl}?`;
  }
  // Address / Location
  else if (messageText.includes("where") || messageText.includes("location") || messageText.includes("address") || messageText.includes("find you") || messageText.includes("map")) {
    reply = `${clinic.name} is conveniently situated in Central London at:\n📍 ${clinic.address}.\n\nYou can reach our frontdesk at ${clinic.phone} if you seek directions or parking arrangements.`;
  }
  // Hours
  else if (messageText.includes("hour") || messageText.includes("open") || messageText.includes("close") || messageText.includes("when do you")) {
    reply = `Our team at ${clinic.name} is available during the following intervals:\n🕒 ${clinic.hours}.\n\nOutside of these settings, urgent out-of-hours coverage is handled in compliance with traditional NHS/clinical guides.`;
  }
  // Insurance
  else if (messageText.includes("insurance") || messageText.includes("bupa") || messageText.includes("axa") || messageText.includes("denplan")) {
    reply = `Regarding health insurance, ${clinic.name} operates with top-tier providers:\n🛡️ ${clinic.insurance}.\n\nWe recommend notifying your insurer before starting treatment to verify claims eligibility.`;
  }
  // Hello greeting
  else {
    reply = `Hello! Thank you for visiting ${clinic.name} online helpdesk. I'm your virtual patient concierge.

I can help you:
1. Book an appointment 🗓️
2. Answer service costs/fees 💷
3. Verify clinic hours & location 📍
4. Provide insurance updates 🛡️

How can I comfort your medical admin needs today?`;
  }

  return {
    reply,
    extractedInfo: current,
    intent,
    shouldEscalate
  };
}

// Vite middleware integration for live browser feedback and development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[production-server] Active on port ${PORT}`);
  });
}

startServer();
