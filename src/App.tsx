import React, { useState } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Wifi, 
  WifiOff, 
  Database, 
  RefreshCw, 
  Play, 
  Sliders, 
  Clock, 
  CreditCard, 
  AlertTriangle, 
  Search, 
  Info, 
  Code, 
  Copy, 
  Check, 
  Settings,
  Flame,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TransactionData, PredictionResponse, TransactionRecord } from "./types";
import { PRESET_TEMPLATES } from "./presets";

const DEFAULT_FORM_STATE: TransactionData = {
  time: 142851,
  amount: 4299.00,
  v1: -1.3598,
  v2: 0.2142,
  v3: 2.5363,
  v4: 1.10,
  v5: -0.35,
  v11: -0.45,
  v12: 0.22,
  v14: 0.18,
  v17: -0.05,
};

export default function App() {
  // Application Dynamic State
  const [formData, setFormData] = useState<TransactionData>({ ...DEFAULT_FORM_STATE });
  const [apiUrl, setApiUrl] = useState<string>("http://localhost:8000/predict");
  const [useSimulator, setUseSimulator] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  
  // Results view trigger state
  const [currentResult, setCurrentResult] = useState<PredictionResponse | null>(null);
  const [lastAnalyzedData, setLastAnalyzedData] = useState<TransactionData | null>(null);
  
  // Interactive copy code triggers
  const [copiedPython, setCopiedPython] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  // Live query log history database
  const [logs, setLogs] = useState<TransactionRecord[]>([
    {
      id: "#TXN-9021",
      timestamp: "14:22:15",
      inputs: { ...DEFAULT_FORM_STATE },
      result: { prediction: 1, probability: 0.9348, latencyMs: 34 },
      mode: "Simulator"
    },
    {
      id: "#TXN-8998",
      timestamp: "14:18:42",
      inputs: { ...PRESET_TEMPLATES[0].data },
      result: { prediction: 0, probability: 0.0120, latencyMs: 14 },
      mode: "Simulator"
    },
    {
      id: "#TXN-8941",
      timestamp: "14:15:02",
      inputs: { ...PRESET_TEMPLATES[1].data },
      result: { prediction: 0, probability: 0.0154, latencyMs: 22 },
      mode: "Simulator"
    }
  ]);
  const [logSearchQuery, setLogSearchQuery] = useState<string>("");

  // Statistics calculation helper
  const totalAnalyzed = logs.length;
  const fraudDetectedCount = logs.filter(l => l.result.prediction === 1).length;
  const safeCount = logs.filter(l => l.result.prediction === 0).length;

  const handleInputChange = (field: keyof TransactionData, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setFormData({ ...preset.data });
    setApiError(null);
  };

  // Safe/Fraud mathematical prediction algorithm (decision boundaries simulator)
  const runSimulatorInference = (data: TransactionData): PredictionResponse => {
    let score = -2.8; // Bias
    
    // Feature alignments weights
    score += data.v4 * 1.5;
    score += data.v11 * 1.4;
    score -= data.v1 * 0.4;
    score -= data.v12 * 1.9;
    score -= data.v14 * 2.6; // Core predictor
    score -= data.v17 * 3.4; // Strongest negative correlation predictor

    // Amount scaling
    if (data.amount > 3000) {
      score += 1.4;
    } else if (data.amount > 1000) {
      score += 0.8;
    }
    
    // Sigmoid math function
    const probability = 1 / (1 + Math.exp(-score));
    const prediction = probability >= 0.50 ? 1 : 0;
    
    return {
      prediction,
      probability: parseFloat(probability.toFixed(4)),
      latencyMs: Math.floor(Math.random() * 15) + 8 // 8-23 milliseconds
    };
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setApiError(null);
    setCurrentResult(null);

    const startTime = performance.now();

    if (useSimulator) {
      setTimeout(() => {
        const results = runSimulatorInference(formData);
        setCurrentResult(results);
        setLastAnalyzedData({ ...formData });
        setIsAnalyzing(false);

        const newRecord: TransactionRecord = {
          id: `#TXN-${Math.floor(8000 + Math.random() * 1000)}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          inputs: { ...formData },
          result: results,
          mode: "Simulator"
        };
        setLogs(prev => [newRecord, ...prev]);
      }, 650);
    } else {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5500);

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.prediction === undefined || data.probability === undefined) {
          throw new Error("Invalid API payload! Missing 'prediction' or 'probability' keys.");
        }

        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        const results: PredictionResponse = {
          prediction: Number(data.prediction),
          probability: Number(data.probability),
          latencyMs: latency
        };

        setCurrentResult(results);
        setLastAnalyzedData({ ...formData });

        const newRecord: TransactionRecord = {
          id: `#TXN-${Math.floor(8000 + Math.random() * 1000)}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          inputs: { ...formData },
          result: results,
          mode: "Real Endpoint"
        };
        setLogs(prev => [newRecord, ...prev]);

      } catch (err: any) {
        let displayError = "Could not contact FastAPI server.";
        if (err.name === 'AbortError') {
          displayError = `Connection timeout. The endpoint ${apiUrl} took longer than 5.5 seconds to reply.`;
        } else if (err instanceof TypeError) {
          displayError = `Connecting failed: CORS Blocked or Server Offline at ${apiUrl}. Verify your FastAPI app is running locally with uvicorn and has CORS middleware enabled.`;
        } else if (err.message) {
          displayError = err.message;
        }

        setApiError(displayError);
        setCurrentResult({
          prediction: -1,
          probability: 0.0,
          error: displayError
        });
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const copyPythonCode = () => {
    const code = `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for local cross-origin network fetching
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Transaction(BaseModel):
    time: float
    amount: float
    v1: float
    v2: float
    v3: float
    v4: float
    v5: float
    v11: float
    v12: float
    v14: float
    v17: float

@app.post("/predict")
def predict(tx: Transaction):
    # Logic matching your machine learning decision model
    score = (tx.v4 * 1.5) + (tx.v11 * 1.4) - (tx.v1 * 0.4) - (tx.v12 * 1.9) - (tx.v14 * 2.6) - (tx.v17 * 3.4)
    if tx.amount > 3000:
        score += 1.4
    
    probability = 1 / (1 + 2.71828 ** (-score))
    prediction = 1 if probability >= 0.50 else 0
    
    return {
        "prediction": prediction,
        "probability": round(probability, 4)
    }

# Run locally in terminal: uvicorn main:app --reload --port 8000
`;
    navigator.clipboard.writeText(code);
    setCopiedPython(true);
    setTimeout(() => setCopiedPython(false), 2000);
  };

  const copyCurlCode = () => {
    const code = `curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(formData, null, 2)}'`;
    navigator.clipboard.writeText(code);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const filteredLogs = logs.filter(rec => {
    const term = logSearchQuery.toLowerCase();
    if (!term) return true;
    return (
      rec.id.toLowerCase().includes(term) ||
      rec.inputs.amount.toString().includes(term) ||
      rec.result.probability.toString().includes(term) ||
      (rec.result.prediction === 1 ? "fraud" : "safe").includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans antialiased overflow-x-hidden selection:bg-[#3b82f6] selection:text-white flex flex-col">
      
      {/* Decorative Warm Background gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-radial from-[#3b82f6]/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-radial from-[#ef4444]/3 via-transparent to-transparent pointer-events-none" />

      {/* Header element configured with "Elegant Dark" aesthetics */}
      <header id="app-header" className="sticky top-0 z-50 h-[60px] border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 bg-[#10b981] rounded-full shadow-[0_0_8px_#10b981]" />
          </div>
          <span className="font-bold tracking-tight text-sm uppercase">
            SENTINEL AI <span className="font-light text-[#a1a1aa] ml-1.5 border-l border-[#27272a] pl-2">FRAUD ENGINE v2.4</span>
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-6 text-[11px] font-mono text-[#a1a1aa]">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>LATENCY: 14ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>NODE: US-EAST-1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>PREDICTOR: GRADIENT INF</span>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 border-r border-l border-[#27272a] bg-[#09090b]">
        
        {/* Left Interactive Parameter Matrix Sidebar (Column span-4) */}
        <aside id="left-parameters-sidebar" className="lg:col-span-4 border-r border-[#27272a] p-6 flex flex-col gap-5 bg-[#0c0c0e]">
          <div>
            <span className="text-[11px] uppercase letter-spacing-[0.1em] text-[#a1a1aa] font-semibold block tracking-wider">
              Transaction Parameters
            </span>
            <p className="text-[12px] text-[#a1a1aa] mt-1">Configure feature space dimensions for evaluation.</p>
          </div>

          {/* Quick preset templates block */}
          <div className="bg-[#18181b]/50 border border-[#27272a] rounded-lg p-3.5 space-y-2">
            <div className="flex justify-between items-center text-[10px] text-[#a1a1aa] uppercase font-bold tracking-wider">
              <span>Quick Loader Matrix</span>
              <span className="text-[9px] text-[#3b82f6]">Auto-fill form</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_TEMPLATES.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => applyPreset(preset)}
                  type="button"
                  className="p-2 text-left bg-[#18181b] border border-[#27272a] hover:border-[#3b82f6] rounded transition text-[11px] flex flex-col justify-between h-14 group"
                >
                  <span className="font-semibold text-[#fafafa] truncate group-hover:text-[#3b82f6] block w-full">{preset.name}</span>
                  <span className={`text-[8px] font-mono uppercase font-bold ${
                    preset.type === "safe" ? "text-[#10b981]" : preset.type === "fraud" ? "text-[#ef4444]" : "text-amber-500"
                  }`}>
                    {preset.type}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Configuration Endpoint toggler */}
          <div className="bg-[#18181b]/50 border border-[#27272a] rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#fafafa] flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-[#3b82f6]" />
                <span>Backend API Connector</span>
              </label>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setUseSimulator(!useSimulator)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none ${
                  useSimulator ? "bg-[#27272a]" : "bg-[#3b82f6]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    useSimulator ? "translate-x-0" : "translate-x-4"
                  }`}
                />
              </button>
            </div>

            <div className="text-[10px] text-[#a1a1aa] leading-relaxed">
              {useSimulator ? (
                <span>Currently in <strong className="text-indigo-400">Sandbox-Simulator</strong> mode. No backend required. Toggle off to connect local FastAPI server.</span>
              ) : (
                <span>Streaming live payload requests directly to your FastAPI microservice origin.</span>
              )}
            </div>

            {!useSimulator && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-[#a1a1aa] font-mono">Url Target Endpoint:</span>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] text-xs font-mono px-2 py-1.5 text-[#fafafa] rounded outline-none focus:border-[#3b82f6]"
                />
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleAnalyze} className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Flat Amount in USD */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] text-[#a1a1aa] font-medium">Transaction Amount (USD)</label>
                  <span className="text-[11px] text-[#fafafa] font-mono font-bold">${formData.amount.toLocaleString()}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-[#a1a1aa] font-mono">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange("amount", parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-md py-2.5 pl-7 pr-3 text-[#fafafa] font-mono text-sm outline-none focus:border-[#3b82f6]"
                    required
                  />
                </div>
              </div>

              {/* Time Sec */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] text-[#a1a1aa] font-medium">Time Elapsed (Seconds)</label>
                  <span className="text-[11px] text-[#fafafa] font-mono">{formData.time}s</span>
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 w-3.5 h-3.5 text-[#a1a1aa]" />
                  <input
                    type="number"
                    min="0"
                    value={formData.time}
                    onChange={(e) => handleInputChange("time", parseInt(e.target.value) || 0)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-md py-2.5 pl-9 pr-3 text-[#fafafa] font-mono text-sm outline-none focus:border-[#3b82f6]"
                    required
                  />
                </div>
              </div>

              {/* Grid of dimensional PCA inputs */}
              <div className="pt-2 border-t border-[#27272a]">
                <span className="text-[10px] uppercase font-bold text-[#a1a1aa] font-mono tracking-wider mb-2 block">
                  PCA Dimensional Feature space
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[#a1a1aa] font-mono">Factor V1</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.v1}
                      onChange={(e) => handleInputChange("v1", parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded p-1.5 text-xs text-[#fafafa] font-mono outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[#a1a1aa] font-mono">Factor V2</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.v2}
                      onChange={(e) => handleInputChange("v2", parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded p-1.5 text-xs text-[#fafafa] font-mono outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[#a1a1aa] font-mono">Factor V3</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.v3}
                      onChange={(e) => handleInputChange("v3", parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded p-1.5 text-xs text-[#fafafa] font-mono outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[#a1a1aa] font-mono">Factor V4</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.v4}
                      onChange={(e) => handleInputChange("v4", parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded p-1.5 text-xs text-[#fafafa] font-mono outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                </div>

                {/* Additional high correlation factors slide controls */}
                <div className="mt-3.5 space-y-2.5 bg-[#18181b]/35 p-3 rounded border border-[#27272a]">
                  <span className="text-[9px] font-bold text-[#ef4444] font-mono tracking-wider block">
                    HIGH IMPACT DETECTOR ANCHORS (V14 & V17)
                  </span>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-[#a1a1aa]">Component V14</span>
                      <span className={formData.v14 < 0 ? "text-[#ef4444] font-bold" : "text-[#fafafa]"}>{formData.v14.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-7"
                      max="4"
                      step="0.05"
                      value={formData.v14}
                      onChange={(e) => handleInputChange("v14", parseFloat(e.target.value))}
                      className="w-full h-1 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-[#ef4444] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-[#a1a1aa]">Component V17</span>
                      <span className={formData.v17 < 0 ? "text-[#ef4444] font-bold" : "text-[#fafafa]"}>{formData.v17.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-7"
                      max="4"
                      step="0.05"
                      value={formData.v17}
                      onChange={(e) => handleInputChange("v17", parseFloat(e.target.value))}
                      className="w-full h-1 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-[#ef4444] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full bg-[#3b82f6] hover:bg-[#3b82f6]/95 border-none rounded-md py-3.5 text-white font-bold text-xs tracking-widest uppercase transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Inference Processing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white text-white" />
                    <span>Analyze Transaction</span>
                  </>
                )}
              </button>

              <div className="text-[10px] text-[#a1a1aa] line-height-[1.4] mt-3.5 italic text-center">
                All computations are validated inside space-locked sandbox containers using advanced vector mappings.
              </div>
            </div>
          </form>
        </aside>

        {/* Right Dynamic Assessment Panel (Column span-8) */}
        <section id="right-assessment-viewport" className="lg:col-span-8 p-6 flex flex-col gap-6 bg-gradient-to-tr from-[#3b82f6]/[0.02] via-transparent to-transparent">
          
          <div>
            <span className="text-[11px] uppercase letter-spacing-[0.1em] text-[#a1a1aa] font-semibold block tracking-wider">
              Risk Assessment Output
            </span>
          </div>

          {/* Result Card styled according to Elegant Dark constraints */}
          <div className="h-max md:h-[280px]">
            <AnimatePresence mode="wait">
              
              {/* Neutral state */}
              {!currentResult && (
                <motion.div
                  key="neutral"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[260px] border border-[#27272a] bg-[#18181b] rounded-xl flex flex-col items-center justify-center gap-4 text-center p-6 relative"
                >
                  <div className="absolute top-4 right-4 text-[10px] letter-spacing-[1px] text-[#a1a1aa] uppercase font-mono">
                    System Telemetry Ready
                  </div>

                  <div className="w-16 h-16 border-2 border-[#27272a] rounded-full flex items-center justify-center relative">
                    <Activity className="w-7 h-7 text-[#3b82f6] animate-pulse" />
                    <div className="absolute inset-0 rounded-full border border-[#3b82f6]/20 animate-ping pointer-events-none" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#fafafa] uppercase tracking-wider">Awaiting Stream</h3>
                    <p className="text-xs text-[#a1a1aa] max-w-sm mt-1 leading-relaxed">
                      Select a preset transaction profile or fill out the vectors on the left sidebar to prompt real-time neural network categorization.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Safe State (Prediction = 0) */}
              {currentResult && currentResult.prediction === 0 && (
                <motion.div
                  key="safe"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[260px] border border-[#10b981] bg-gradient-to-tr from-[#18181b] to-[#062d1e] rounded-xl flex flex-col items-center justify-center gap-4 text-center p-6 relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4 text-[10px] letter-spacing-[1px] text-[#10b981] uppercase font-mono font-bold tracking-widest bg-[#10b981]/10 px-2 py-0.5 rounded">
                    ANALYSIS COMPLETE
                  </div>

                  {/* SVG Probability Ring as styled in elegant dark specs */}
                  <div className="w-24 h-24 rounded-full border-8 border-[#27272a] flex items-center justify-center relative bg-[#09090b]">
                    {/* SVG Progress Circle */}
                    <svg className="absolute -inset-2 w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        stroke="#10b981"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 38}
                        strokeDashoffset={2 * Math.PI * 38 * (1 - currentResult.probability)}
                      />
                    </svg>
                    <span className="text-lg font-mono font-bold text-[#fafafa]">
                      {(currentResult.probability * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="z-10">
                    <h2 className="text-[#10b981] tracking-[2px] font-bold text-lg uppercase">
                      TRANSACTION APPROVED
                    </h2>
                    <p className="text-xs text-[#a1a1aa] mt-1.5 max-w-md mx-auto leading-relaxed">
                      Legitimate transactional parameters. Covariance values mapping coordinates safely align within expected parameters.
                    </p>
                  </div>

                  {lastAnalyzedData && (
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[10px] font-mono text-[#a1a1aa] border-t border-[#27272a]/40 pt-2.5">
                      <span>AMT: ${lastAnalyzedData.amount.toFixed(2)}</span>
                      <span>LATENCY: {currentResult.latencyMs || 14}ms</span>
                      <span>METHOD: {useSimulator ? "SANDBOX" : "FASTAPI"}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Fraud State (Prediction = 1) */}
              {currentResult && currentResult.prediction === 1 && (
                <motion.div
                  key="fraud"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[260px] border border-[#ef4444] bg-gradient-to-tr from-[#18181b] to-[#2d1111] rounded-xl flex flex-col items-center justify-center gap-4 text-center p-6 relative overflow-hidden animate-pulse"
                >
                  <div className="absolute top-4 right-4 text-[10px] letter-spacing-[1px] text-[#ef4444] uppercase font-mono font-bold tracking-widest bg-[#ef4444]/10 px-2 py-0.5 rounded">
                    CRITICAL SWEEP
                  </div>

                  {/* SVG Red Probability Ring */}
                  <div className="w-24 h-24 rounded-full border-8 border-[#27272a] flex items-center justify-center relative bg-[#09090b]">
                    <svg className="absolute -inset-2 w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        stroke="#ef4444"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 38}
                        strokeDashoffset={2 * Math.PI * 38 * (1 - currentResult.probability)}
                      />
                    </svg>
                    <span className="text-lg font-mono font-bold text-[#fafafa]">
                      {(currentResult.probability * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="z-10">
                    <h2 className="text-[#ef4444] tracking-[2px] font-bold text-lg uppercase flex items-center justify-center gap-1.5">
                      <ShieldAlert className="w-5 h-5 text-[#ef4444]" />
                      CRITICAL ALERT: FRAUD DETECTED
                    </h2>
                    <p className="text-xs text-[#a1a1aa] mt-1.5 max-w-md mx-auto leading-relaxed">
                      Warning: Structural patterns match high-risk velocity. Negative anomalies detected in variance dimensions.
                    </p>
                  </div>

                  {lastAnalyzedData && (
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[10px] font-mono text-[#a1a1aa] border-t border-[#27272a]/40 pt-2.5">
                      <span>AMT: ${lastAnalyzedData.amount.toFixed(2)}</span>
                      <span>LATENCY: {currentResult.latencyMs || 34}ms</span>
                      <span>METHOD: {useSimulator ? "SANDBOX" : "FASTAPI"}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Error Output state */}
              {currentResult && currentResult.prediction === -1 && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[260px] border border-amber-600/90 bg-[#18181b] rounded-xl flex flex-col items-center justify-center gap-4 text-center p-6 relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4 text-[10px] text-amber-500 font-mono font-bold bg-amber-500/10 px-2.5 py-0.5 rounded">
                    CONNECTION DIAGNOSTIC
                  </div>

                  <WifiOff className="w-12 h-12 text-amber-500 animate-bounce" />

                  <div className="px-6">
                    <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-widest">
                      Unable to request API classification
                    </h3>
                    <p className="text-[11px] text-[#a1a1aa] font-mono mt-1.5 max-w-md mx-auto">
                      {currentResult.error}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setUseSimulator(true);
                      setCurrentResult(null);
                      setApiError(null);
                    }}
                    type="button"
                    className="mt-2 text-xs bg-[#3b82f6] hover:bg-[#3b82f6]/95 border-none rounded py-1.5 px-3.5 text-white font-semibold transition cursor-pointer"
                  >
                    Activate Sandbox Simulator fallback
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Live Session Logs Section with fully styled content elements */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] uppercase letter-spacing-[0.1em] text-[#a1a1aa] font-semibold block tracking-wider">
                  Live Session Logs
                </span>
                <p className="text-[11px] text-[#a1a1aa] mt-0.5">Telemetry history generated during testing.</p>
              </div>

              {/* Search query tagger */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#a1a1aa]" />
                <input
                  type="text"
                  placeholder="Filter logs by amount/outcome..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#fafafa] placeholder-[#a1a1aa]/50 outline-none focus:border-[#3b82f6]"
                />
              </div>
            </div>

            {/* Logs tabular representation formatted nicely with Courier/Mono look */}
            <div className="border border-[#27272a] bg-[#18181b] rounded-xl overflow-x-auto">
              <table className="w-full border-collapse font-mono text-[12px] text-left">
                <thead>
                  <tr className="border-b border-[#27272a] bg-[#18181b]/50">
                    <th className="p-3 text-[#a1a1aa] tracking-wider uppercase font-semibold text-[10px]">TIMESTAMP</th>
                    <th className="p-3 text-[#a1a1aa] tracking-wider uppercase font-semibold text-[10px]">TRANS_ID</th>
                    <th className="p-3 text-[#a1a1aa] tracking-wider uppercase font-semibold text-[10px]">AMOUNT</th>
                    <th className="p-3 text-[#a1a1aa] tracking-wider uppercase font-semibold text-[10px]">RISK PROB</th>
                    <th className="p-3 text-[#a1a1aa] tracking-wider uppercase font-semibold text-[10px]">OUTCOME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/40">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-[#a1a1aa] italic">
                        No transaction logs match search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr 
                        key={log.id} 
                        className="hover:bg-[#27272a]/20 transition cursor-pointer"
                        onClick={() => {
                          setFormData({ ...log.inputs });
                          setCurrentResult(log.result);
                          setLastAnalyzedData({ ...log.inputs });
                        }}
                      >
                        <td className="p-3 text-[#a1a1aa]">{log.timestamp}</td>
                        <td className="p-3 text-[#fafafa] font-bold">{log.id}</td>
                        <td className="p-3 text-[#fafafa]">${log.inputs.amount.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`${log.result.prediction === 1 ? "text-[#ef4444]" : "text-[#10b981]"}`}>
                            {log.result.probability.toFixed(4)}
                          </span>
                        </td>
                        <td className="p-3">
                          {log.result.prediction === 1 ? (
                            <span className="text-[#ef4444] font-bold">DENIED</span>
                          ) : log.result.prediction === 0 ? (
                            <span className="text-[#10b981] font-bold">APPROVED</span>
                          ) : (
                            <span className="text-amber-500 font-bold">FAILED</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick clean-up mechanism */}
            {logs.length > 0 && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#a1a1aa]">
                  Showing {filteredLogs.length} logs of {logs.length} total.
                </span>
                <button
                  onClick={() => setLogs([])}
                  className="text-[#ef4444] hover:underline flex items-center gap-1 cursor-pointer font-mono"
                  type="button"
                >
                  Clear History Database
                </button>
              </div>
            )}
          </div>

          {/* Setup Integration Code Deck at the very bottom */}
          <div className="border border-[#27272a] bg-[#1c1c1f]/40 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase letter-spacing-[0.1em] text-[#a1a1aa] font-semibold block tracking-wider">
                Microservice Synchronizer & Integration Guide
              </span>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-[11px] text-[#3b82f6] hover:underline transition select-none cursor-pointer"
              >
                {showConfig ? "Hide Code helper" : "Show Code Helper"}
              </button>
            </div>

            {showConfig && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4 pt-1 border-t border-[#27272a]/60 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Python FastAPI snippet */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-[#a1a1aa] font-mono">
                      <span>Python: uvicorn main:app</span>
                      <button
                        onClick={copyPythonCode}
                        className="text-[#3b82f6] hover:text-[#fafafa] flex items-center gap-1 cursor-pointer"
                        title="Copy fastAPI Python code"
                      >
                        {copiedPython ? (
                          <>
                            <Check className="w-3 h-3 text-[#10b981]" />
                            <span className="text-[#10b981]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3 bg-[#09090b] text-[10px] font-mono border border-[#27272a] rounded overflow-x-auto max-h-56 leading-relaxed text-[#a1a1aa]">
                      {`from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class cc_tx(BaseModel):
    time: float
    amount: float
    v1: float; v2: float; v3: float; v4: float
    v5: float; v11: float; v12: float; v14: float; v17: float

@app.post("/predict")
def predict_tx(tx: cc_tx):
    # Simulated decision tree
    score = (tx.v4 * 1.5) + (tx.v11 * 1.4) - (tx.v17 * 3.4)
    prob = 1 / (1 + 2.718 ** -score)
    return {"prediction": 1 if prob >= 0.5 else 0, "probability": round(prob, 4)}`}
                    </pre>
                  </div>

                  {/* cURL diagnostic curl */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-[#a1a1aa] font-mono">
                      <span>cURL Diagnostic request</span>
                      <button
                        onClick={copyCurlCode}
                        className="text-[#3b82f6] hover:text-[#fafafa] flex items-center gap-1 cursor-pointer"
                        title="Copy curl command"
                      >
                        {copiedCurl ? (
                          <>
                            <Check className="w-3 h-3 text-[#10b981]" />
                            <span className="text-[#10b981]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3 bg-[#09090b] text-[10px] font-mono border border-[#27272a] rounded overflow-x-auto max-h-56 leading-relaxed text-[#a1a1aa]">
                      {`curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
  "time": ${formData.time},
  "amount": ${formData.amount},
  "v1": ${formData.v1},
  "v2": ${formData.v2},
  "v3": ${formData.v3},
  "v4": ${formData.v4},
  "v5": ${formData.v5},
  "v11": ${formData.v11},
  "v12": ${formData.v12},
  "v14": ${formData.v14},
  "v17": ${formData.v17}
}'`}
                    </pre>
                    
                    <div className="bg-[#09090b]/80 p-2.5 rounded border border-[#27272a] text-[10px] text-slate-400 leading-relaxed font-sans mt-2.5">
                      💡 <strong>FastAPI Integration:</strong> The model expects features exactly. Adjust values using sliders during simulation to watch the live probability update based on custom metrics or real API returns!
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

        </section>

      </main>
    </div>
  );
}
