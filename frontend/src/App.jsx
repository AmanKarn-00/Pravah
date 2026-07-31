import React, { useState } from 'react';
import GemmaOrchestrator from './components/GemmaOrchestrator';
import MapWidget from './components/MapWidget';
import ExpertPanel from './components/ExpertPanel';
import EvidencePanel from './components/EvidencePanel';
import MemoryPanel from './components/MemoryPanel';
import PipelineVisualizer from './components/PipelineVisualizer';
import ParticlesBackground from './components/ParticlesBackground';
import { Activity, HardHat, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';

function App() {
  const [appState, setAppState] = useState(null);
  const [error, setError] = useState(null);
  const [currentOrchestrationStep, setCurrentOrchestrationStep] = useState(-1);
  const [currentMapStep, setCurrentMapStep] = useState(-1);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  
  // Use refs to avoid stale closures in the async while loop
  const demoStateRef = React.useRef('IDLE');
  const [demoState, setReactDemoState] = useState('IDLE');
  const setDemoState = (state) => {
    demoStateRef.current = state;
    setReactDemoState(state);
  };
  
  const handleSendMessage = async (msg) => {
    const newUserMessage = { role: 'user', content: msg };
    const updatedHistory = [...chatHistory, newUserMessage];

    setChatHistory(updatedHistory);
    setDemoState('ORCHESTRATING');
    setCurrentOrchestrationStep(-1);
    setAppState({ orchestration_steps: [] });
    setError(null);
    setCurrentMapStep(-1);
    setCurrentConfidence(0);
    
    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: updatedHistory }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to communicate with AI Engine');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let stepIndex = -1;
      let orchestratedSteps = [];
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); 
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (!dataStr.trim()) continue;
            
            try {
              const event = JSON.parse(dataStr);
              
              if (event.type === 'step') {
                 const newStep = { ...event, timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) };
                 orchestratedSteps = [...orchestratedSteps, newStep];
                 setAppState(prev => ({
                   ...prev,
                   orchestration_steps: orchestratedSteps
                 }));
                 stepIndex++;
                 setCurrentOrchestrationStep(stepIndex);
                 
                 toast.success(`✓ ${event.name} Complete`, {
                   style: { background: '#0f172a', border: '1px solid #10b981', color: '#10b981' }
                 });
              } else if (event.type === 'step_start') {
                 const newStep = { name: event.name, status: 'running', timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) };
                 orchestratedSteps = [...orchestratedSteps, newStep];
                 setAppState(prev => ({
                   ...prev,
                   orchestration_steps: orchestratedSteps
                 }));
                 stepIndex++;
                 setCurrentOrchestrationStep(stepIndex);
              } else if (event.type === 'step_end') {
                 orchestratedSteps = orchestratedSteps.map(step => 
                   step.name === event.name && step.status === 'running' 
                     ? { ...step, status: event.status, duration: event.duration, result: event.result } 
                     : step
                 );
                 setAppState(prev => ({
                   ...prev,
                   orchestration_steps: orchestratedSteps
                 }));
                 if (event.status === 'success') {
                   toast.success(`✓ ${event.name} Complete (${event.duration})`, {
                     style: { background: '#0f172a', border: '1px solid #10b981', color: '#10b981' }
                   });
                 }
              } else if (event.type === 'clarification') {
                 setCurrentConfidence(event.data.confidence);
                 setChatHistory(prev => [...prev, { role: 'assistant', content: event.data.question }]);
                 toast.error(`⚠ Clarification Needed: ${event.data.question}`, {
                    style: { background: '#0f172a', border: '1px solid #f59e0b', color: '#f59e0b' },
                    duration: 5000
                 });
                 setDemoState('IDLE');
              } else if (event.type === 'final') {
                 setAppState(prev => ({
                   ...prev,
                   ...event.data,
                   orchestration_steps: prev.orchestration_steps
                 }));
                 
                 const decisionMsg = event.data.final?.decision || "Final decision generated.";
                 setChatHistory(prev => [...prev, { role: 'assistant', content: `Decision: ${decisionMsg}` }]);
                 
                 startMapCascade(event.data);
              }
            } catch (e) {
              console.error("Error parsing chunk", e, dataStr);
            }
          }
        }
      }
    } catch (error) {
      console.error("Orchestration error:", error);
      toast.error("Failed to connect to orchestrator.");
      setDemoState('IDLE');
    }
  };

  const startMapCascade = (data) => {
    if (data.map_cascade && data.map_cascade.length > 0) {
      setDemoState('MAP_CASCADE');
      setCurrentMapStep(-1);
      
      data.map_cascade.forEach((step, idx) => {
        setTimeout(() => {
          setCurrentMapStep(idx);
        }, step.delay || (1000 * (idx + 1))); 
      });
      
      const maxDelay = Math.max(...data.map_cascade.map(s => s.delay || 0), data.map_cascade.length * 1000);
      
      setTimeout(() => {
        setDemoState('EXPERTS');
        setTimeout(() => setDemoState('FINAL'), 1500);
      }, maxDelay + 1000);
    } else {
      setDemoState('EXPERTS');
      setTimeout(() => setDemoState('FINAL'), 1500);
    }
  };

  return (
    <>
      <ParticlesBackground />
      <div className="min-h-screen bg-transparent text-slate-200 p-4 md:p-8 font-sans relative z-10">
        <Toaster position="bottom-right" />
        
        <header className="max-w-7xl mx-auto mb-6 border-b border-slate-700/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                PRAVAH
              </h1>
              <p className="text-sm text-slate-400 tracking-wider">AI Infrastructure Decision Engine</p>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto">
          <PipelineVisualizer demoState={demoState} steps={appState?.orchestration_steps || []} />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 flex flex-col gap-6">
              <GemmaOrchestrator 
                onSendMessage={handleSendMessage} 
                demoState={demoState}
                steps={appState?.orchestration_steps || []}
                currentStep={currentOrchestrationStep}
                confidence={currentConfidence}
                chatHistory={chatHistory}
              />
              
              <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700 shadow-xl p-4 flex-1">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-200">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Live Network Cascade Simulation
                </h3>
                <div className="h-full min-h-[300px]">
                  <MapWidget 
                    simulationData={appState?.context?.simulation?.simulation_results}
                    mapCascade={appState?.map_cascade}
                    currentMapStep={currentMapStep}
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5" />
                  <p>{error}. Please ensure the backend is running.</p>
                </div>
              )}

              {demoState === 'IDLE' && !error && chatHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700/50 rounded-xl p-12 text-center bg-slate-900/30 backdrop-blur-sm">
                  <Activity className="w-12 h-12 mb-4 opacity-50" />
                  <h2 className="text-xl font-medium mb-2 text-slate-300">Awaiting Input</h2>
                  <p className="max-w-md text-slate-400">Enter a request in the conversation panel to initiate tool gathering, expert deliberation, and AI resolution.</p>
                </div>
              )}

              {['ORCHESTRATING', 'MAP_CASCADE'].includes(demoState) && (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 border border-slate-800/50 rounded-xl p-12 text-center bg-slate-900/30 backdrop-blur-sm">
                   <Activity className="w-12 h-12 mb-4 opacity-50 animate-pulse text-emerald-500" />
                   <h2 className="text-xl font-medium mb-2 text-emerald-400">Synthesizing Context...</h2>
                   <p className="max-w-md">The orchestrator is actively evaluating constraints and testing simulation models.</p>
                 </div>
              )}

              {['EXPERTS', 'FINAL'].includes(demoState) && appState && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <EvidencePanel evidence={appState.evidence} />
                  {appState.memory && appState.memory.length > 0 && (
                    <MemoryPanel memory={appState.memory} />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <ExpertPanel 
                      title="Traffic Operations"
                      icon={Activity}
                      colorClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      {...appState.experts.traffic}
                    />
                    <ExpertPanel 
                      title="Infrastructure Planning"
                      icon={HardHat}
                      colorClass="bg-orange-500/10 text-orange-400 border-orange-500/20"
                      {...appState.experts.infrastructure}
                    />
                  </div>

                  {/* Final Decision Panel */}
                  <AnimatePresence>
                    {demoState === 'FINAL' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl border border-emerald-500/30 shadow-2xl overflow-hidden relative backdrop-blur-md"
                      >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-cyan-400" />
                        <div className="p-5 border-b border-slate-700 flex items-center gap-2">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          <h2 className="text-lg font-bold text-slate-100">Final Decision & Resolution</h2>
                        </div>
                        
                        <div className="p-6 space-y-6">
                          <div>
                            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Action Plan</h3>
                            <p className="text-slate-200 text-lg leading-relaxed">{appState.final?.decision}</p>
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Explanation</h3>
                            <p className="text-slate-300">{appState.final?.explanation}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                              <h4 className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4" /> Generated Notice (Nepali)
                              </h4>
                              <p className="text-sm text-slate-300 font-medium">{appState.final?.public_notice_nepali}</p>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                              <h4 className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2 mb-2">
                                <Activity className="w-4 h-4" /> SMS Alert
                              </h4>
                              <p className="text-sm text-slate-300 font-mono">{appState.final?.sms}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        </main>

        {/* Clarification Modal Overlay */}
        <AnimatePresence>
          {demoState === 'CLARIFICATION' && appState?.clarification && (
            <ClarificationModal 
              clarification={appState.clarification}
              onResolve={handleClarificationResolve}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default App;
