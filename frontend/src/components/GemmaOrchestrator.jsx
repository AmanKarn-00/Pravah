import React, { useState, useEffect } from 'react';
import { Send, Mic, Image as ImageIcon, Loader2, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GemmaOrchestrator = ({ onSendMessage, demoState, steps = [], currentStep = -1, confidence = 0, chatHistory = [] }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && demoState === 'IDLE') {
      onSendMessage(input);
      setInput('');
    }
  };

  const getStepSummary = (step) => {
    if (!step.result) return null;
    const res = step.result;
    
    switch (step.name) {
      case 'check_bridge_tonnage':
        return res.status === 'PASS' 
          ? `${res.max_load}t max load` 
          : `FAIL: ${res.truck_weight}t > ${res.max_load}t`;
      case 'get_monsoon_landslide_risk':
        return `${res.rain_mm}mm rain | ${res.risk_level} Risk`;
      case 'simulate_network_cascade':
        return `${res.increase_pct} congestion`;
      case 'query_decision_memory':
        return res.similar_event ? 'Found Match' : 'No Match';
      case 'Extract Entities':
        return Object.values(res).filter(v => v && v !== 'Unknown').join(', ') || 'No entities';
      default:
        return 'Success';
    }
  };

  const isWorking = demoState === 'FETCHING' || demoState === 'ORCHESTRATING';

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isWorking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          Gemma Orchestrator
        </h2>
        {demoState !== 'IDLE' && demoState !== 'FETCHING' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Confidence:</span>
            <span className={`font-mono font-bold ${confidence < 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {confidence}%
            </span>
          </div>
        )}
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col">
        {chatHistory.length === 0 && demoState === 'IDLE' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Activity className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-center">Awaiting input to begin orchestration...</p>
          </div>
        ) : (
          <div className="space-y-4 flex-1">
            {/* Chat History */}
            {chatHistory.map((msg, idx) => (
              <div key={`chat-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-100' : 'bg-slate-700/40 border border-slate-600/50 text-slate-200'}`}>
                  <p className="text-sm font-medium mb-1 opacity-70">{msg.role === 'user' ? 'Officer' : 'Gemma'}</p>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Live Orchestration Steps as Gemma's internal monologue */}
            {demoState !== 'IDLE' && steps.length > 0 && (
              <div className="flex justify-start">
                <div className="max-w-[95%] p-3 rounded-lg bg-slate-700/40 border border-slate-600/50 text-slate-200 w-full">
                  <div className="flex items-center gap-2 mb-3 opacity-70">
                    <p className="text-sm font-medium">Gemma</p>
                    <span className="text-xs italic flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> orchestrating...
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <AnimatePresence>
                      {steps.map((step, idx) => (
                        idx <= currentStep && (
                          <motion.div
                            key={`step-${idx}`}
                            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="flex flex-col bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/80"
                          >
                            <div className="flex items-start gap-3">
                              {step.status === 'running' ? (
                                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0 mt-0.5" />
                              ) : step.status === 'error' ? (
                                <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                </div>
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between w-full">
                                  <p className="text-xs font-bold text-slate-200 uppercase tracking-wide truncate pr-2">
                                    {step.name}
                                  </p>
                                  <div className="flex items-center gap-2 shrink-0">
                                     {step.duration && (
                                       <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                                         {step.duration}
                                       </span>
                                     )}
                                  </div>
                                </div>
                                {step.status === 'success' && getStepSummary(step) && (
                                  <p className="text-[11px] text-emerald-400 mt-1 font-mono bg-emerald-400/10 inline-block px-1.5 py-0.5 rounded">
                                    {getStepSummary(step)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-800/80 border-t border-slate-700">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Close Bailey Bridge for 2 days due to monsoon..."
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-200"
            disabled={demoState !== 'IDLE'}
          />
          <button 
            type="submit" 
            disabled={demoState !== 'IDLE' || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center w-12"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default GemmaOrchestrator;
