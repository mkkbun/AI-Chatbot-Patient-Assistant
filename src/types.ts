export interface Service {
  name: string;
  price: string;
  description: string;
}

export interface Clinic {
  id: string;
  name: string;
  type: string; // "dental" | "private" | "gp" | "hospital"
  address: string;
  phone: string;
  email: string;
  hours: string;
  insurance: string;
  bookingUrl: string;
  services: Service[];
  tone: string;
  safetyRefusal: string;
}

export interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
  intent?: "booking" | "general_qa" | "medical_refusal" | "escalation";
  shouldEscalate?: boolean;
}

export interface ExtractedInfo {
  patientName: string | null;
  phone: string | null;
  email: string | null;
}
