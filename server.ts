import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

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
  },
  {
    id: "myat-kaung-khant",
    name: "Myat Kaung Khant (Portfolio)",
    type: "portfolio",
    address: "London, UK (Fully available for hybrid/remote global software engineering contracts)",
    phone: "+44 7700 900077",
    email: "myatkaungkhant022@gmail.com",
    hours: "Freelance & Consulting: 9:00 AM - 6:00 PM GMT | Always Online",
    insurance: "GitHub: @myatkaungkhant | LinkedIn: Myat Kaung Khant",
    bookingUrl: "https://calendly.com/myatkaungkhant/chat-with-me",
    services: [
      { name: "Full-Stack Web & Mobile Apps", price: "Starting £60/hr", description: "Vast experience crafting fluid SPA/SSR client panels in React/Next.js paired with styled Tailwind CSS layouts." },
      { name: "Generative AI & LLM Embeddings", price: "Contracts", description: "Implementing custom server-side API proxy controllers, safety guardrails, and dynamic system prompts via Gemini." },
      { name: "Secure Node.js Rest APIs", price: "Custom quote", description: "Developing highly optimized Express backend routines, Docker setups, and containerized Cloud Run system infrastructures." }
    ],
    tone: "Enthusiastic, welcoming, highly tech-savvy, humble and creative. Always prioritizes sharing booking links. Highlights high-quality react/node architectural craft.",
    safetyRefusal: "I am designed only to discuss portfolio achievements, coding skills, and freelance inquiries. Please ask related items, or book a consultation slot to talk directly!"
  }
];

let clinics = [...initialClinics];

// GET ALL CLINICS
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

// 5. CHAT ENDPOINT - CORE DUAL-MODE AGENT IMPLEMENTATION (HEALTHCARE & PORTFOLIO)
app.post("/api/chat", async (req, res) => {
  const { clinicId, messages, extractedInfo: clientExtractedInfo } = req.body;
  const clinic = clinics.find((c) => c.id === clinicId);
  
  if (!clinic) {
    return res.status(404).json({ error: `Clinic/agent with ID '${clinicId}' not found.` });
  }

  const patientMessage = (messages[messages.length - 1]?.content || "").toLowerCase().trim();
  
  // High-risk safety check for medical mode only
  if (clinic.type !== "portfolio") {
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
  }

  const ai = getGeminiClient();

  // If Gemini is not set up, fall back to a high-quality local rule engine for responsive workflow sandbox
  if (!ai) {
    return res.json(processLocalRuleReply(patientMessage, clinic, clientExtractedInfo));
  }

  try {
    const formattedServices = clinic.services.map(s => `- ${s.name}: ${s.price} (${s.description})`).join("\n");
    
    let systemInstruction = "";

    if (clinic.type === "portfolio") {
      systemInstruction = `You are an exceptionally talented, friendly, and helpful AI Representative and personal assistant running on the official portfolio website of "${clinic.name}".

### YOUR PRIMARY GOAL
Excite and assist potential recruiters, engineering managers, technology partners, or freelance clients who visit my portfolio website.
1. Proactively showcase my technical experience, projects, soft skills, and contact details.
2. Answer administrative questions (geographic location, remote availability, work permit authorizations, freelance rates under "${clinic.name}").
3. Urge them to schedule a face-to-face video sync using my Calendly scheduler: ${clinic.bookingUrl}.
4. Carefully collect basic recruiter contact logs (Visitor Name, Phone/WhatsApp, and Email) to register high-potential sales leads.

### SAFETY & TASK BOUNDARIES (CRITICAL)
- If visitors ask you to solve standard student homework, write unrelated mathematical puzzles, compose personal essays, write code for illegal hacks, or write malicious spam, gracefully refuse. State: "${clinic.safetyRefusal}"
- Keep responses friendly, upbeat, succinct, and professional. Always prioritize recommending the booking or direct email: ${clinic.email}.

### PORTFOLIO OWNER BIO & DETAILS:
- Owner Name/Brand: ${clinic.name}
- Geographic Location: ${clinic.address}
- Main Contact Email: ${clinic.email}
- Contact Phone/WhatsApp: ${clinic.phone}
- Availability Hours: ${clinic.hours}
- Primary Profiles / Networks: ${clinic.insurance}
- Calendly Direct Scheduler URL: ${clinic.bookingUrl}

### SKILLS & OFFERS CATALOGUE:
${formattedServices}

### BEHAVIOURAL TONE PARAMETERS:
${clinic.tone}

### STRUCTURAL JSON OUTPUT GUIDELINES
You must output ONLY a valid parseable JSON object matching exactly this Schema:
{
  "reply": "Write your delightful, highly supportive conversational portfolio assistant response here. Mention my booking link (${clinic.bookingUrl}) or email (${clinic.email}) where appropriate. Maintain custom tone guidelines.",
  "extractedInfo": {
    "patientName": "Extracted recruiter/visitor name or null",
    "phone": "Extracted phone or null",
    "email": "Extracted email address or null"
  },
  "intent": "booking" | "general_qa" | "medical_refusal" | "escalation",
  "shouldEscalate": boolean
}

In "extractedInfo", carry over previously gathered traits: ${JSON.stringify(clientExtractedInfo || {})}. Carefully parse the latest message to merge any new names, emails, or phone numbers.
Set "shouldEscalate" to true only if they ask to contact the developer directly or have a pressing freelance/hire contract inquiry.
Set "intent" to:
- "medical_refusal" if you had to refuse writing school homework/malicious code/spam.
- "booking" if they want to arrange a direct consultation, phone schedule, or ask where to sync.
- "escalation" if human override was triggered.
- "general_qa" for general portfolio questions.`;
    } else {
      systemInstruction = `You are a highly capable AI Assistant running as an automated receptionist on the official website of "${clinic.name}".

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

### BEHAVIOURAL TONE PARAMETERS:
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
    }

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
              description: "The empathetic response to send back to the user"
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
    console.error("Gemini Assistant Failure (Gracefully falling back to local sandbox rules):", error);
    const localResult = processLocalRuleReply(patientMessage, clinic, clientExtractedInfo);
    return res.json({
      ...localResult,
      isFallback: true
    });
  }
});

// 6. SCRAPER ENDPOINT - AUTO SYNC USER PORTFOLIO INFORMATION DIRECTLY
app.post("/api/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Portfolio website URL is required." });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch website content: ${response.statusText}`);
    }
    const htmlText = await response.text();

    // Clean html content to feed to Gemini
    const cleanText = htmlText
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 10000);

    const ai = getGeminiClient();
    if (ai) {
      const runPrompt = `Analyze the following webpage plain-text and build a beautiful AI agent configuration for the user's personal portfolio. 
Extract the Owner's Name, Location, Contact Email, Contact Phone, social channels link, Calendly Link (if any), and core engineering services/offerings.

Text Content:
"${cleanText}"

Respond of a strictly valid JSON object structure matching:
{
  "name": "Owner Name (e.g. Myat Kaung Khant)",
  "address": "Extracted Location (or Remote)",
  "phone": "Extracted contact number (or placeholder phone)",
  "email": "Extracted contact email",
  "hours": "Availability details",
  "insurance": "GitHub, LinkedIn or social channels (e.g. GitHub: @myat | LinkedIn: Myat)",
  "bookingUrl": "Calendly scheduler URL found (or placeholder calendly url)",
  "services": [
    { "name": "Dynamic Service Profile", "price": "e.g. Contracts", "description": "Short explanation of service" }
  ],
  "tone": "Warm, creative, exceptionally smart tech-focused voice narrative.",
  "safetyRefusal": "Short playful refusal statement if users ask chatbot to resolve school exam homework, compose standard essays, or write illegal tools."
}`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: runPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const dataText = aiResponse.text || "{}";
      const scrapedData = JSON.parse(dataText.trim());
      return res.json({ success: true, data: scrapedData });
    } else {
      // Fallback parser
      const titleMatch = htmlText.match(/<title>([^<]+)<\/title>/i);
      const hostName = new URL(url).hostname;
      const ownerName = titleMatch ? titleMatch[1].split(/[|-]/)[0].trim() : "Developer (" + hostName + ")";
      
      const emailMatches = htmlText.match(/[a-zA-Z0-9_\-\.]+@[a-zA-Z0-9_\-\.]+\.[a-zA-Z]{2,5}/g);
      const emailFound = emailMatches ? emailMatches[0] : "developer@example.com";

      const calendlyMatch = htmlText.match(/calendly\.com\/[a-zA-Z0-9_\-]+/i);
      const calendlyFound = calendlyMatch ? "https://" + calendlyMatch[0] : "https://calendly.com/meeting";

      const fallbackScrape = {
        name: ownerName,
        address: "Remote / Hybrid (London and Global)",
        phone: "+44 7700 900077",
        email: emailFound,
        hours: "Freelance & Consulting: 9:00 AM - 6:00 PM GMT",
        insurance: "Social Channels found on " + hostName,
        bookingUrl: calendlyFound,
        services: [
          { name: "Full-Stack Web Development", price: "Contracts", description: "Designing slick, interactive web solutions with modern React.js/Vite frameworks." },
          { name: "Generative AI Systems Integration", price: "Hourly rate", description: "Connecting Gemini API backend routes and orchestrating context streams safely." }
        ],
        tone: "Polite, upbeat, professional, and knowledgeable. Standard UK/US spellings.",
        safetyRefusal: "Please discuss personal projects, technologies, or contract services instead!"
      };
      return res.json({ success: true, data: fallbackScrape, warning: "Gemini API key is unconfigured. Extracted fallback metadata." });
    }
  } catch (error: any) {
    console.error("Scraper Error:", error);
    return res.status(500).json({ error: `Scraping failed: ${error.message}` });
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

  const isPortfolio = clinic.type === "portfolio";

  // Refusal filter (Unrelated / school essay tests for portfolio OR diagnostic inquiries for medical)
  if (isPortfolio) {
    if (
      messageText.includes("homework") ||
      messageText.includes("essay") ||
      messageText.includes("hack") ||
      messageText.includes("attack website") ||
      messageText.includes("math test") ||
      messageText.includes("exam")
    ) {
      reply = `${clinic.safetyRefusal}`;
      intent = "medical_refusal"; // treat as out of scope refusal
    }
  } else {
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
  }

  // If intent was already set to refusal, don't check other branches
  if (intent !== "medical_refusal") {
    // Human Escalation / Direct Contact
    if (
      messageText.includes("human") ||
      messageText.includes("receptionist") ||
      messageText.includes("manager") ||
      messageText.includes("chat with someone") ||
      messageText.includes("person") ||
      messageText.includes("complaint") ||
      messageText.includes("contact you") ||
      messageText.includes("talk directly")
    ) {
      if (isPortfolio) {
        reply = `Undoubtedly! I've flagged this thread for ${clinic.name}. You can email them directly on ${clinic.email} or call ${clinic.phone}. They will get back to you right away!`;
      } else {
        reply = `Understood. I've flagged this thread for clinical staff attention. A human receptionist will check your messages and reach you on ${clinic.phone} or via email (${clinic.email}). Is there a preferred time we should dial you?`;
      }
      intent = "escalation";
      shouldEscalate = true;
    }
    // Booking flow / Calendly Schedule
    else if (
      messageText.includes("book") ||
      messageText.includes("appointment") ||
      messageText.includes("schedule") ||
      messageText.includes("calendly") ||
      messageText.includes("reserve") ||
      messageText.includes("meeting") ||
      messageText.includes("routine") ||
      messageText.includes("checkup") ||
      messageText.includes("consult")
    ) {
      intent = "booking";
      if (!current.patientName || !current.phone) {
        if (isPortfolio) {
          reply = `I would be absolutely thrilled to assist you in scheduling a consulting meeting with ${clinic.name}. Before you access the Calendly scheduler, please let me know your full name and the best contact phone number/email so I can log you as an active freelance lead!`;
        } else {
          reply = `I would be delighted to assist you in arranging an appointment at ${clinic.name}. Before you access the online scheduler, some details are needed to pre-register your record: May I please capture your full name and the best contact phone number?`;
        }
      } else {
        if (isPortfolio) {
          reply = `Splendid, thank you ${current.patientName}! You can pick an available slot directly via my live Calendly scheduler: ${clinic.bookingUrl}. If you prefer I text or email you instead, please let me know or confirm your phone is ${current.phone}.`;
        } else {
          reply = `Splendid, thank you ${current.patientName}! You can select an appropriate slot directly via our live scheduler: ${clinic.bookingUrl}. If you prefer we call you to book, please verify your telephone is ${current.phone}.`;
        }
      }
    }
    // Price / services
    else if (messageText.includes("service") || messageText.includes("cost") || messageText.includes("price") || messageText.includes("charge") || messageText.includes("how much") || messageText.includes("skill") || messageText.includes("offer") || messageText.includes("project")) {
      const list = clinic.services.map((s: any) => `• ${s.name}: ${s.price}`).join("\n");
      if (isPortfolio) {
        reply = `I offer premium full-stack and GenAI services. Here is an overview of my core capabilities:\n\n${list}\n\nWould you like me to guide you to my live scheduling scheduler at ${clinic.bookingUrl}?`;
      } else {
        reply = `Our treatments and consultations at ${clinic.name} are structured to provide premium value. Here is an overview of standard services:\n\n${list}\n\nWould you like me to guide you to the online scheduling scheduler at ${clinic.bookingUrl}?`;
      }
    }
    // Address / Location
    else if (messageText.includes("where") || messageText.includes("location") || messageText.includes("address") || messageText.includes("find you") || messageText.includes("map") || messageText.includes("live")) {
      if (isPortfolio) {
        reply = `${clinic.name} is based in:\n📍 ${clinic.address}.\n\nRemote-friendly and fully prepared to join global contracts or hybrid teams! Reach my direct mail at ${clinic.email}.`;
      } else {
        reply = `${clinic.name} is conveniently situated in Central London at:\n📍 ${clinic.address}.\n\nYou can reach our frontdesk at ${clinic.phone} if you seek directions or parking arrangements.`;
      }
    }
    // Hours / Availability
    else if (messageText.includes("hour") || messageText.includes("open") || messageText.includes("close") || messageText.includes("when do you") || messageText.includes("available")) {
      if (isPortfolio) {
        reply = `I am generally available for contract consultations and active developer work within:\n🕒 ${clinic.hours}.\n\nI can always accommodate critical timezone overlaps with US or APAC clients during contract delivery!`;
      } else {
        reply = `Our team at ${clinic.name} is available during the following intervals:\n🕒 ${clinic.hours}.\n\nOutside of these settings, urgent out-of-hours coverage is handled in compliance with traditional NHS/clinical guides.`;
      }
    }
    // Insurance / Links / GitHub / LinkedIn
    else if (messageText.includes("insurance") || messageText.includes("bupa") || messageText.includes("axa") || messageText.includes("denplan") || messageText.includes("github") || messageText.includes("linkedin") || messageText.includes("social") || messageText.includes("profile")) {
      if (isPortfolio) {
        reply = `Excellent! Check out my professional networks, profiles, and open-source contributions here:\n🛡️ ${clinic.insurance}.\n\nLet's connect or schedule a Calendly sync directly on ${clinic.bookingUrl}!`;
      } else {
        reply = `Regarding health insurance, ${clinic.name} operates with top-tier providers:\n🛡️ ${clinic.insurance}.\n\nWe recommend notifying your insurer before starting treatment to verify claims eligibility.`;
      }
    }
    // Hello greeting
    else {
      if (isPortfolio) {
        reply = `Hello! Thank you for visiting the official portfolio of ${clinic.name}. I'm your interactive consulting & freelance concierge.
  
I can help you:
1. Learn about my software services & skills 💻
2. Schedule a direct video consultation 🗓️
3. View my GitHub & LinkedIn networks 🛡️
4. Find my contact details & location 📍

How can I assist your engineering recruitment needs today?`;
      } else {
        reply = `Hello! Thank you for visiting ${clinic.name} online helpdesk. I'm your virtual patient concierge.

I can help you:
1. Book an appointment 🗓️
2. Answer service costs/fees 💷
3. Verify clinic hours & location 📍
4. Provide insurance updates 🛡️

How can I comfort your medical admin needs today?`;
      }
    }
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
