import React, { useState } from 'react';
import GemmaOrchestrator from './components/GemmaOrchestrator';
import MapWidget from './components/MapWidget';
import ExpertPanel from './components/ExpertPanel';
import EvidencePanel from './components/EvidencePanel';
import MemoryPanel from './components/MemoryPanel';
import ScenarioPanel from './components/ScenarioPanel';
import PipelineVisualizer from './components/PipelineVisualizer';
import ParticlesBackground from './components/ParticlesBackground';
import { Activity, HardHat, CheckCircle2, MessageSquare, AlertTriangle, Siren, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';

function App() {
  const [appState, setAppState] = useState(null);
  const [error, setError] = useState(null);
  const [currentOrchestrationStep, setCurrentOrchestrationStep] = useState(-1);
  const [currentMapStep, setCurrentMapStep] = useState(-1);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  
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
        setTimeout(() => {
          setDemoState('FINAL');
          setTimeout(() => setDemoState('IDLE'), 2000);
        }, 1500);
      }, maxDelay + 1000);
    } else {
      setDemoState('EXPERTS');
      setTimeout(() => {
        setDemoState('FINAL');
        setTimeout(() => setDemoState('IDLE'), 2000);
      }, 1500);
    }
  };

  const isWorking = demoState === 'FETCHING' || demoState === 'ORCHESTRATING';
  const hasResults = appState?.experts;

  return (
    <>
      <ParticlesBackground />
      <div className="min-h-screen bg-transparent text-slate-200 p-4 md:p-6 font-sans relative z-10">
        <Toaster position="bottom-right" />
        
        <header className="max-w-[1600px] mx-auto mb-4 border-b border-slate-700/50 pb-3">
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

        <main className="max-w-[1600px] mx-auto">
          <PipelineVisualizer demoState={demoState} steps={appState?.orchestration_steps || []} />
          
          {/* TOP ROW: Chat (left) + Map (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
            {/* Chat Panel - Left */}
            <div className="lg:col-span-5">
              <GemmaOrchestrator 
                onSendMessage={handleSendMessage} 
                demoState={demoState}
                steps={appState?.orchestration_steps || []}
                currentStep={currentOrchestrationStep}
                confidence={currentConfidence}
                chatHistory={chatHistory}
              />
            </div>

            {/* Map Panel - Right */}
            <div className="lg:col-span-7">
              <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700 shadow-xl overflow-hidden h-full min-h-[500px]">
                <MapWidget 
                  simulationData={appState?.context?.simulate_route_closure || appState?.context?.simulate_network_cascade}
                  mapCascade={appState?.map_cascade}
                  currentMapStep={currentMapStep}
                  evidence={appState?.evidence}
                />
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: Results (full width) */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5" />
              <p>{error}. Please ensure the backend is running.</p>
            </div>
          )}

          {['ORCHESTRATING', 'MAP_CASCADE'].includes(demoState) && !hasResults && (
            <div className="flex flex-col items-center justify-center text-slate-400 border border-slate-800/50 rounded-xl p-8 text-center bg-slate-900/30 backdrop-blur-sm mb-4">
              <Activity className="w-10 h-10 mb-3 opacity-50 animate-pulse text-emerald-500" />
              <h2 className="text-lg font-medium mb-1 text-emerald-400">Synthesizing Context...</h2>
              <p className="max-w-md text-sm">The orchestrator is actively evaluating constraints and testing simulation models.</p>
            </div>
          )}

          {((['EXPERTS', 'FINAL'].includes(demoState)) || (demoState === 'IDLE' && hasResults)) && appState && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <EvidencePanel evidence={appState.evidence} />
              {appState.memory && appState.memory.length > 0 && (
                <MemoryPanel memory={appState.memory} />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                <ExpertPanel 
                  title="Traffic Operations"
                  icon={Activity}
                  colorClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  {...appState.experts.traffic}
                />
                <ExpertPanel 
                  title="Infrastructure"
                  icon={HardHat}
                  colorClass="bg-orange-500/10 text-orange-400 border-orange-500/20"
                  {...appState.experts.infrastructure}
                />
                {appState.experts.emergency && (
                  <ExpertPanel 
                    title="Emergency Response"
                    icon={Siren}
                    colorClass="bg-red-500/10 text-red-400 border-red-500/20"
                    {...appState.experts.emergency}
                  />
                )}
                {appState.experts.planning && (
                  <ExpertPanel 
                    title="Strategic Planning"
                    icon={BarChart3}
                    colorClass="bg-violet-500/10 text-violet-400 border-violet-500/20"
                    {...appState.experts.planning}
                  />
                )}
              </div>

              {/* Scenario Comparison */}
              {appState.scenarios && <ScenarioPanel scenarios={appState.scenarios} />}

              {/* Final Decision Panel */}
              <AnimatePresence>
                {(demoState === 'FINAL' || (demoState === 'IDLE' && appState?.final)) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl border border-emerald-500/30 shadow-2xl overflow-hidden relative backdrop-blur-md mb-4"
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
        </main>
      </div>
    </>
  );
}

export default App;
