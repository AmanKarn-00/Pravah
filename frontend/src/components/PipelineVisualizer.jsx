import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Brain, ShieldAlert, CloudRain, Activity, Users, FileText, Settings2, HelpCircle, Zap, CheckCircle2 } from 'lucide-react';

const PipelineVisualizer = ({ demoState, steps = [] }) => {
  const dynamicNodes = [];
  
  if (demoState !== 'IDLE') {
    dynamicNodes.push({ id: 'input', label: 'Input Received', icon: Mic, isActive: true, isCurrent: false });
  } else {
    dynamicNodes.push({ id: 'input', label: 'Awaiting Input', icon: Mic, isActive: false, isCurrent: false });
  }

  steps.forEach(step => {
    let Icon = Settings2;
    if (step.name === 'check_bridge_tonnage') Icon = ShieldAlert;
    else if (step.name === 'get_monsoon_landslide_risk') Icon = CloudRain;
    else if (step.name === 'Extract Entities') Icon = FileText;
    else if (step.name === 'ask_clarification') Icon = HelpCircle;
    else if (step.name === 'simulate_network_cascade') Icon = Activity;
    else if (step.name === 'query_decision_memory') Icon = Brain;
    else if (step.name === 'Expert Resolution') Icon = Users;

    dynamicNodes.push({
      id: step.name + dynamicNodes.length,
      label: step.name.replace(/_/g, ' '),
      icon: Icon,
      isActive: true,
      isCurrent: step.status === 'running'
    });
  });

  if (['EXPERTS', 'FINAL'].includes(demoState)) {
    dynamicNodes.push({
      id: 'final',
      label: 'Decision Reached',
      icon: Brain,
      isActive: true,
      isCurrent: demoState === 'EXPERTS'
    });
  } else if (demoState !== 'IDLE') {
    dynamicNodes.push({
      id: 'final_pending',
      label: 'Pending Decision',
      icon: Brain,
      isActive: false,
      isCurrent: false
    });
  }

  const activeIdx = dynamicNodes.reduce((lastIdx, node, idx) => node.isActive ? idx : lastIdx, 0);
  const progressPct = dynamicNodes.length > 1 ? (activeIdx / (dynamicNodes.length - 1)) * 100 : 0;
  const isProcessing = demoState !== 'IDLE';

  return (
    <div className="w-full relative">
      {/* Glowing border effect when processing */}
      <div className={`absolute -inset-[1px] rounded-2xl transition-opacity duration-700 ${isProcessing ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,182,212,0.3), rgba(16,185,129,0.3))', filter: 'blur(1px)' }}
      />
      
      <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 py-5 px-3 rounded-2xl shadow-2xl overflow-x-auto no-scrollbar">
        {/* Subtle top shimmer when active */}
        {isProcessing && (
          <motion.div 
            className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div 
              className="h-full w-1/3"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.8), rgba(6,182,212,0.8), transparent)' }}
              animate={{ x: ['-100%', '400%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            />
          </motion.div>
        )}

        <div className="min-w-max md:w-full mx-auto px-4 flex justify-between items-center relative gap-3">
          {/* Background track */}
          <div className="absolute left-[5%] right-[5%] top-1/2 -translate-y-1/2 h-[3px] bg-slate-800 rounded-full z-0" />
          
          {/* Active progress line with glow */}
          <div className="absolute left-[5%] right-[5%] top-1/2 -translate-y-1/2 h-[3px] z-0 overflow-hidden rounded-full">
            <motion.div 
              className="h-full rounded-full"
              style={{ 
                background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                boxShadow: '0 0 12px rgba(16,185,129,0.6), 0 0 4px rgba(6,182,212,0.4)'
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>

          {dynamicNodes.map((node, idx) => {
            const Icon = node.icon;
            const isCompleted = node.isActive && !node.isCurrent;
            return (
              <motion.div 
                key={node.id} 
                className="relative z-10 flex flex-col items-center gap-2 flex-1 min-w-[72px]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <motion.div 
                  className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center border transition-all duration-500
                    ${node.isCurrent 
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                      : isCompleted 
                        ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' 
                        : 'bg-slate-800/80 border-slate-700 text-slate-600'
                    }
                  `}
                  animate={node.isCurrent ? { 
                    boxShadow: [
                      '0 0 8px rgba(16,185,129,0.3), inset 0 0 8px rgba(16,185,129,0.1)', 
                      '0 0 24px rgba(16,185,129,0.7), inset 0 0 12px rgba(16,185,129,0.2)', 
                      '0 0 8px rgba(16,185,129,0.3), inset 0 0 8px rgba(16,185,129,0.1)'
                    ],
                    scale: [1, 1.08, 1]
                  } : { 
                    boxShadow: isCompleted ? '0 0 8px rgba(16,185,129,0.15)' : 'none',
                    scale: 1
                  }}
                  transition={node.isCurrent ? { repeat: Infinity, duration: 1.8, ease: "easeInOut" } : { duration: 0.3 }}
                >
                  {isCompleted && !node.isCurrent ? (
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <Icon className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </motion.div>
                <span className={`text-[8px] sm:text-[9px] md:text-[10px] font-semibold uppercase tracking-wider transition-colors duration-500 max-w-[80px] text-center leading-tight
                  ${node.isCurrent ? 'text-emerald-300' : node.isActive ? 'text-emerald-500/80' : 'text-slate-600'}
                `}>
                  {node.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PipelineVisualizer;
