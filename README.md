# UK AI Patient Assistant Platform

A full-stack **production sandbox and live evaluation environment** for multi-clinic AI receptionists, designed for UK dental, GP, and private healthcare practices. Configure clinic personas, simulate patient conversations in real time, and inspect developer telemetry—all powered by Google Gemini with safety guardrails aligned to UK clinical communication norms.

## Overview

This platform demonstrates how a single codebase can serve **multiple clinic tenants** with distinct tones, services, hours, and compliance rules. Each tenant receives tailored AI responses while sharing a common orchestration layer for intent classification, patient detail extraction, and escalation handling.

| Capability | Description |
|------------|-------------|
| **Multi-clinic simulator** | Switch between pre-configured dental, private GP, and wellness clinics; chat resets per tenant to prevent context leakage |
| **Live developer console** | Stream intent labels, extracted contact fields, escalation flags, and full message history during conversations |
| **Clinic configurator** | Edit profiles, duplicate tenants, and persist settings via REST API |
| **Architecture hub** | Reference folder layouts, prompt templates, and production deployment patterns for scaling to SaaS |
| **Safety & compliance** | Medical refusal prompts, NHS 111 / 999 escalation paths, and British English tone enforcement |

Built with [Google AI Studio](https://ai.studio) and extensible toward a microservices architecture (API gateway, chat widget, portal dashboard) documented in-app.

## Tech Stack

- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Motion
- **Backend:** Express, TypeScript, in-memory multi-tenant datastore
- **AI:** Google Gemini API (`@google/genai`) with structured JSON responses and local fallback when no API key is configured

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Gemini API key](https://aistudio.google.com/apikey) (optional for demo mode with smart local fallback)

## Quick Start

1. **Clone and install**

   ```bash
   git clone https://github.com/mkkbun/AI-Chatbot-Patient-Assistant.git
   cd ai-assistant
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and set your API key:

   ```bash
   cp .env.example .env
   ```

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) (or the port shown in the terminal).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite + Express dev server with hot reload |
| `npm run build` | Production build (client + server bundle) |
| `npm start` | Run production server from `dist/` |
| `npm run lint` | Type-check with TypeScript |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/clinics` | List all clinic configurations |
| `POST` | `/api/clinics` | Create or duplicate a clinic |
| `PUT` | `/api/clinics/:id` | Update a clinic profile |
| `POST` | `/api/chat` | Send a patient message and receive structured AI response |

## Project Structure

```
ai-assistant/
├── server.ts              # Express API, Gemini integration, clinic datastore
├── src/
│   ├── App.tsx            # Main shell: tabs, state, API wiring
│   ├── components/
│   │   ├── ClinicSimulation.tsx   # Patient chat UI
│   │   ├── DeveloperConsole.tsx   # Live telemetry panel
│   │   ├── Configurator.tsx       # Tenant profile editor
│   │   └── ArchitectureHub.tsx    # Docs & production blueprints
│   └── types.ts
├── .env.example
└── package.json
```

## Security Notes

- Never commit `.env` files or API keys. Use `.env.example` as a template only.
- AI outputs are constrained by per-clinic safety refusal prompts; this is a **demo sandbox**, not a certified medical device.
- For production, replace the in-memory store with a database, add authentication, rate limiting, and audit logging as outlined in the Architecture Hub.

## AI Studio

Original app hosted in AI Studio:  
https://ai.studio/apps/8e62467a-88d4-4817-b16e-63da0137ed0b

## License

This project is provided as-is for evaluation and extension. Add a license file if you plan to open-source or distribute commercially.
