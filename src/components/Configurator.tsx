import React, { useState, useEffect } from "react";
import { Clinic, Service } from "../types";
import { Save, Plus, Trash2, Copy, Download, RefreshCw, Settings, Info, Check } from "lucide-react";

interface ConfiguratorProps {
  clinics: Clinic[];
  selectedClinic: Clinic;
  onUpdateClinic: (updated: Clinic) => Promise<void>;
  onDuplicateClinic: (clinic: Clinic) => Promise<void>;
  onResetClinics: () => Promise<void>;
  onSelectClinic: (clinic: Clinic) => void;
}

export default function Configurator({
  clinics,
  selectedClinic,
  onUpdateClinic,
  onDuplicateClinic,
  onResetClinics,
  onSelectClinic
}: ConfiguratorProps) {
  const [formData, setFormData] = useState<Clinic>({ ...selectedClinic });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Scraper integrations states
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeSuccess, setScrapeSuccess] = useState(false);

  const handleScrape = async () => {
    if (!scrapeUrl) return;
    setIsScraping(true);
    setScrapeError(null);
    setScrapeSuccess(false);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(scrapeUrl)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const fetched = json.data;
          setFormData(prev => ({
            ...prev,
            name: fetched.name || prev.name,
            address: fetched.address || prev.address,
            phone: fetched.phone || prev.phone,
            email: fetched.email || prev.email,
            hours: fetched.hours || prev.hours,
            insurance: fetched.insurance || prev.insurance,
            bookingUrl: fetched.bookingUrl || prev.bookingUrl,
            tone: fetched.tone || prev.tone,
            safetyRefusal: fetched.safetyRefusal || prev.safetyRefusal,
            services: Array.isArray(fetched.services) ? fetched.services : prev.services,
            type: "portfolio" // Auto-triage to portfolio
          }));
          setScrapeSuccess(true);
          setTimeout(() => setScrapeSuccess(false), 4000);
        } else {
          setScrapeError(json.error || "Could not extract structured data.");
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setScrapeError(errJson.error || "Failed to trigger portfolio crawler scraper.");
      }
    } catch (err: any) {
      setScrapeError(err.message || "Network error. Please try again.");
    } finally {
      setIsScraping(false);
    }
  };

  // Keep form in sync when current selected clinic changes
  useEffect(() => {
    setFormData({ ...selectedClinic });
  }, [selectedClinic]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceChange = (index: number, field: keyof Service, value: string) => {
    const updatedServices = [...formData.services];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    setFormData(prev => ({ ...prev, services: updatedServices }));
  };

  const handleAddService = () => {
    const newService: Service = { name: "New Service Description", price: "£0", description: "Brief details of this treatment." };
    setFormData(prev => ({ ...prev, services: [...prev.services, newService] }));
  };

  const handleRemoveService = (index: number) => {
    const updatedServices = formData.services.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, services: updatedServices }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateClinic(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async () => {
    const dupName = `${formData.name} (Copy)`;
    const duplicated: Clinic = {
      ...formData,
      name: dupName,
      id: `${formData.id}-copy-${Date.now().toString().slice(-4)}`
    };
    await onDuplicateClinic(duplicated);
  };

  const handleDownloadConfig = () => {
    const fileData = JSON.stringify(formData, null, 2);
    const blob = new Blob([fileData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${formData.id}-config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 text-slate-800">
      
      {/* Clinic Manager Side List */}
      <div className="xl:col-span-1 space-y-4">
        <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-5 h-5 text-sky-600" />
              Manage Presets
            </h3>
            <button
              onClick={async () => {
                if (confirm("Are you sure you want to restore defaults? All edits will be reset.")) {
                  setIsResetting(true);
                  await onResetClinics();
                  setIsResetting(false);
                }
              }}
              disabled={isResetting}
              className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-semibold bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
              Restore Defaults
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Select a tenant configuration to tweak its prompt engineering, service fees, or safety settings.
          </p>

          <div className="space-y-2">
            {clinics.map(c => {
              const isActive = c.id === selectedClinic.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectClinic(c)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col ${
                    isActive
                      ? "border-sky-500 bg-sky-50/50 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-xs text-slate-850 truncate max-w-[180px]">{c.name}</span>
                    <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                      c.type === "dental" ? "bg-sky-50 text-sky-850 border border-sky-100" :
                      c.type === "private" ? "bg-indigo-50 text-indigo-850 border border-indigo-100" : "bg-emerald-50 text-emerald-850 border border-emerald-100"
                    }`}>
                      {c.type}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 truncate w-full">{c.address}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-200 flex gap-2">
            <button
              onClick={handleDuplicate}
              className="flex-1 max-w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs px-3 py-2.5 rounded-xl border border-slate-250 transition flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-sky-600" />
              Duplicate Tenant
            </button>
            <button
              onClick={handleDownloadConfig}
              className="flex-1 max-w-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs px-3 py-2.5 rounded-xl border border-sky-100 transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export config.json
            </button>
          </div>
        </div>

        <div className="bg-[#0F172A] rounded-2xl p-5 text-xs text-slate-300 space-y-2.5 leading-relaxed shadow-lg">
          <div className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            Agency SaaS Deployment Guide
          </div>
          <p className="text-slate-350">
            When duplicating a clinic setup in this panel, its profile, services catalogues, and safety refusals are synchronized with our running backend database state instantaneously.
          </p>
          <p className="text-slate-350">
            You can verify how changes impact the chatbot immediately by selecting the updated preset on the list and chatting with it on the main tab.
          </p>
        </div>
      </div>

      {/* Profile Form (Takes other columns) */}
      <div className="xl:col-span-2">
        <form onSubmit={handleSave} className="border border-slate-200 bg-white rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Modify Profile: {formData.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Parameters edited below are loaded immediately for AI intent extraction.</p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Syncing..." : saveSuccess ? "Synchronized!" : "Save Changes"}
            </button>
          </div>

          {/* Portfolio Site Crawler Scanner Integration */}
          <div className="bg-sky-50 border border-sky-100/60 rounded-2xl p-4.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-600 animate-pulse bg-white p-1 rounded-sm shadow-xs border border-sky-200/50" />
              <div>
                <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wide">Sync Profile from Portfolio Website</h4>
                <p className="text-[10.5px] text-sky-700">Provide your portfolio homepage URL to automatically scrape and map your skills profile!</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="e.g. https://myatkaungkhant.me"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                className="flex-1 text-xs border border-sky-150 bg-white focus:outline-none focus:border-sky-500 rounded-xl px-3 py-2.5 shadow-3xs text-slate-900 font-medium"
              />
              <button
                type="button"
                onClick={handleScrape}
                disabled={isScraping}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white text-xs font-semibold rounded-xl border border-sky-700 shadow-2xs cursor-pointer transition flex items-center gap-1 shrink-0"
              >
                {isScraping ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isScraping ? "Crawling info..." : "Scrape & Populate"}
              </button>
            </div>

            {scrapeSuccess && (
              <p className="text-[11px] font-semibold text-emerald-700 animate-fade-in flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                ✓ Extraction complete from {new URL(scrapeUrl).hostname}! Make sure to press "Save Changes" to commit.
              </p>
            )}

            {scrapeError && (
              <p className="text-[11px] font-semibold text-red-700 animate-fade-in block leading-tight">
                ⚠️ Scanning warning (orfallback): {scrapeError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {formData.type === "portfolio" ? "Developer Name" : "Clinic Name"}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full text-sm border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2.5 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Profile Preset Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full text-sm border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2.5 bg-slate-50/50 h-[40px]"
              >
                <option value="dental">Dental Practice</option>
                <option value="private">Private Medical Clinic</option>
                <option value="gp">NHS GP Surgery</option>
                <option value="hospital">Private Hospital</option>
                <option value="portfolio">Personal Portfolio (Resume Assistant)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {formData.type === "portfolio" ? "Base Location / Remote Policy" : "Geographic Location / Address"}
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                className="w-full text-sm border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2.5 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {formData.type === "portfolio" ? "Contact Phone Number" : "Reception Telephone"}
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full text-sm border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2.5 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {formData.type === "portfolio" ? "Contact Email Address" : "Email Helpline"}
              </label>
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full text-sm border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2.5 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {formData.type === "portfolio" ? "Consulting Working Hours" : "Opening Hours Guidelines"}
              </label>
              <input
                type="text"
                name="hours"
                value={formData.hours}
                onChange={handleInputChange}
                required
                className="w-full text-sm border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2.5 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {formData.type === "portfolio" ? "Calendly / Scheduler URL" : "Direct Booking Link (Calendly)"}
              </label>
              <input
                type="text"
                name="bookingUrl"
                value={formData.bookingUrl}
                onChange={handleInputChange}
                required
                className="w-full text-sm border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2.5 bg-slate-50/50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {formData.type === "portfolio" ? "GitHub / LinkedIn / Social Networks" : "Insurance Partnerships Accepted"}
              </label>
              <input
                type="text"
                name="insurance"
                value={formData.insurance}
                onChange={handleInputChange}
                required
                className="w-full text-sm border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2.5 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
              {formData.type === "portfolio" ? "Persona Tone & Safety Prompt Styling" : "Tone & Clinical Guardrails Prompt Styling"}
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              {formData.type === "portfolio" 
                ? "Instruct the LLM developer assistant regarding your tech experience and safety guardrails." 
                : "Instruct the LLM how to behave and where to redirect clinical advice inquiries."}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  {formData.type === "portfolio" ? "Developer Voice & Tone Specifications" : "Clinic Voice & Tone Specifications"}
                </label>
                <textarea
                  name="tone"
                  value={formData.tone}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full text-sm border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl p-3 bg-slate-50/50 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  {formData.type === "portfolio" ? "Malicious / School Out of Scope Refusal" : "Clinical Refusal Guardrail (Safety Refusal Prompt)"}
                </label>
                <textarea
                  name="safetyRefusal"
                  value={formData.safetyRefusal}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full text-sm border border-slate-200 focus:border-sky-500 focus:outline-none rounded-xl p-3 bg-slate-50/50 font-mono text-xs text-red-8050 text-red-800 bg-red-50/5 border-red-100"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase">
                  {formData.type === "portfolio" ? "Tech Stack & Services Offerings" : "Treatment Service Catalogue"}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {formData.type === "portfolio" ? "Describe your specific code service tags and contract rates." : "Define standard treatment tags and pricing structures."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddService}
                className="text-xs text-sky-600 hover:text-sky-800 font-semibold bg-sky-50 border border-sky-100 hover:bg-sky-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {formData.services.map((service, index) => (
                <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-start md:items-center">
                  <div className="flex-1 space-y-2 md:space-y-0 md:grid md:grid-cols-4 md:gap-3 w-full">
                    <input
                      type="text"
                      placeholder="Service Name"
                      value={service.name}
                      onChange={(e) => handleServiceChange(index, "name", e.target.value)}
                      required
                      className="md:col-span-1 text-xs border border-slate-200 focus:border-sky-500 focus:outline-none rounded-lg px-2 py-1.5 bg-white w-full font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="Price"
                      value={service.price}
                      onChange={(e) => handleServiceChange(index, "price", e.target.value)}
                      required
                      className="md:col-span-1 text-xs border border-slate-200 focus:border-sky-500 focus:outline-none rounded-lg px-2 py-1.5 bg-white w-full font-mono text-slate-70500"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={service.description}
                      onChange={(e) => handleServiceChange(index, "description", e.target.value)}
                      required
                      className="md:col-span-2 text-xs border border-slate-200 focus:border-sky-500 focus:outline-none rounded-lg px-2 py-1.5 bg-white w-full text-slate-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveService(index)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>

    </div>
  );
}
