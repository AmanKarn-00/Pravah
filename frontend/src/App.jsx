import React, { useState, useEffect } from 'react';
import GemmaOrchestrator from './components/GemmaOrchestrator';
import MapWidget from './components/MapWidget';
import EvidencePanel from './components/EvidencePanel';
import ExpertPanel from './components/ExpertPanel';
import ScenarioCards from './components/ScenarioCards';
import PipelineVisualizer from './components/PipelineVisualizer';
import ParticlesBackground from './components/ParticlesBackground';
import { Activity, CheckCircle2, MessageSquare, AlertTriangle, Zap, HardHat, Siren, BarChart3, CloudRain, Thermometer, Wind, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';

function App() {
  const [appState, setAppState] = useState(null);
  const [error, setError] = useState(null);
  const [currentOrchestrationStep, setCurrentOrchestrationStep] = useState(-1);
  const [currentMapStep, setCurrentMapStep] = useState(-1);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [liveWeather, setLiveWeather] = useState(null);

  // Fetch live weather on mount
  useEffect(() => {
    fetch('http://localhost:8000/api/weather')
      .then(res => res.json())
      .then(data => setLiveWeather(data))
      .catch(() => {});
  }, []);
  
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
        
        {/* ── Header ── */}
        <header className="max-w-[1600px] mx-auto mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
                PRAVAH
              </h1>
              <p className="text-xs text-slate-500 tracking-widest uppercase">AI Infrastructure Decision Engine</p>
            </div>
            {isWorking && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="ml-auto flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-400 tracking-wide">PROCESSING</span>
              </motion.div>
            )}
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto space-y-5">
          
          {/* ═══ Pipeline Thinking Visualizer ═══ */}
          <PipelineVisualizer demoState={demoState} steps={appState?.orchestration_steps || []} />

          {/* ═══ HERO: Chat + Map side-by-side ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Chat Panel */}
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

            {/* Map Panel — sticky so it doesn't stretch with chat */}
            <div className="lg:col-span-7">
              <div className="lg:sticky lg:top-6 relative">
              {/* Live Weather Widget — overlays top-left of map */}
              {liveWeather && (
                <div className="absolute top-3 left-3 z-[600] bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/60 p-3 shadow-xl min-w-[220px]">
                  <div className="flex items-center gap-2 mb-2">
                    <CloudRain className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Weather • Bhaktapur</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Thermometer className="w-3 h-3 text-orange-400" />
                      <span className="text-xs text-slate-300">{liveWeather.temperature_c ?? '--'}°C</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CloudRain className="w-3 h-3 text-cyan-400" />
                      <span className="text-xs text-slate-300">{liveWeather.rainfall_today_mm ?? 0} mm</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Wind className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-300">{liveWeather.wind_speed_kmh ?? '--'} km/h</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-300">{liveWeather.visibility_m ? `${(liveWeather.visibility_m / 1000).toFixed(1)} km` : '--'}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      liveWeather.road_condition === 'Dangerous' ? 'bg-red-500/20 text-red-400' :
                      liveWeather.road_condition === 'Wet' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      Road: {liveWeather.road_condition || 'Unknown'}
                    </span>
                    {liveWeather.storm_warning && (
                      <span className="text-[10px] font-bold text-red-400 animate-pulse">⚠️ STORM</span>
                    )}
                  </div>
                </div>
              )}
              <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700 shadow-xl overflow-hidden h-[500px]">
                <MapWidget 
                  simulationData={appState?.context?.simulate_route_closure || appState?.context?.simulate_network_cascade}
                  mapCascade={appState?.map_cascade}
                  currentMapStep={currentMapStep}
                  evidence={appState?.evidence}
                />
              </div>
              </div>
            </div>
          </div>

          {/* ═══ RESULTS ═══ */}
          {error && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5" />
              <p>{error}. Please ensure the backend is running.</p>
            </motion.div>
          )}

          {['ORCHESTRATING', 'MAP_CASCADE'].includes(demoState) && !hasResults && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-slate-400 border border-emerald-500/10 rounded-2xl p-8 text-center bg-gradient-to-b from-slate-900/60 to-slate-900/30 backdrop-blur-sm"
            >
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                className="w-10 h-10 mb-3 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"
              >
                <Activity className="w-5 h-5 text-emerald-400" />
              </motion.div>
              <h2 className="text-base font-semibold mb-1 text-emerald-400">Synthesizing Context…</h2>
              <p className="max-w-sm text-sm text-slate-500">Evaluating multi-domain constraints and running simulation models.</p>
            </motion.div>
          )}

          <AnimatePresence>
            {((['EXPERTS', 'FINAL'].includes(demoState)) || (demoState === 'IDLE' && hasResults)) && appState && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-5"
              >
                {/* ── Evidence Stats ── */}
                <EvidencePanel evidence={appState.evidence} />

                {/* ── Expert Verdicts (4-panel grid) ── */}
                {appState.experts && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
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
                )}

                {/* ── Scenario Comparison (Safest / Balanced / Least Disruptive) ── */}
                {appState.scenarios && appState.scenarios.length > 0 && (
                  <ScenarioCards scenarios={appState.scenarios} />
                )}

                {/* ── Final Decision ── */}
                {(demoState === 'FINAL' || (demoState === 'IDLE' && appState?.final)) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="relative"
                  >
                    {/* Outer glow */}
                    <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 blur-sm" />
                    
                    <div className="relative bg-gradient-to-br from-slate-800 via-slate-800/95 to-slate-900 rounded-2xl border border-emerald-500/25 shadow-2xl overflow-hidden backdrop-blur-md">
                      {/* Top accent bar */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400" />
                      
                      <div className="p-5 border-b border-slate-700/50 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-100">Final Decision & Resolution</h2>
                          <p className="text-[11px] text-slate-500">AI-synthesized from multi-domain analysis</p>
                        </div>
                      </div>
                      
                      <div className="p-6 space-y-5">
                        {/* Decision */}
                        <div>
                          <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2">
                            <Zap className="w-3 h-3" /> Action Plan
                          </h3>
                          <p className="text-slate-100 text-lg leading-relaxed font-medium">{appState.final?.decision}</p>
                        </div>
                        
                        {/* Explanation */}
                        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2">Explanation</h3>
                          <p className="text-slate-300 text-sm leading-relaxed">{appState.final?.explanation}</p>
                        </div>

                        {/* Public Notice + SMS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2.5 tracking-[0.12em]">
                              <MessageSquare className="w-3.5 h-3.5" /> Public Notice (Nepali)
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed">{appState.final?.public_notice_nepali}</p>
                          </div>
                          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2.5 tracking-[0.12em]">
                              <Activity className="w-3.5 h-3.5" /> SMS Alert
                            </h4>
                            <p className="text-sm text-slate-300 font-mono leading-relaxed">{appState.final?.sms}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Subtle footer */}
        <footer className="max-w-[1600px] mx-auto mt-8 pb-4 text-center">
          <p className="text-[10px] text-slate-700 tracking-widest uppercase">Pravah • Powered by Gemma AI</p>
        </footer>
      </div>
    </>
  );
}

export default App;
