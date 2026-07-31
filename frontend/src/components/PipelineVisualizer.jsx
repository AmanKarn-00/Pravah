import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Brain, ShieldAlert, CloudRain, Activity, Users, FileText, Settings2, HelpCircle } from 'lucide-react';

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

  // Find the index of the last active node for the progress bar
  const activeIdx = dynamicNodes.reduce((lastIdx, node, idx) => node.isActive ? idx : lastIdx, 0);

  return (
    <div className="w-full bg-slate-800/80 backdrop-blur-md border border-slate-700 py-6 mb-8 rounded-xl shadow-2xl relative z-10 overflow-x-auto no-scrollbar">
      <div className="min-w-max md:w-full mx-auto px-8 flex justify-between items-center relative gap-4">
        {/* Background Line */}
        <div className="absolute left-[5%] right-[5%] top-1/2 -translate-y-1/2 h-1.5 bg-slate-700/50 rounded-full z-0" />
        
        {/* Animated Active Line */}
        <div className="absolute left-[5%] right-[5%] top-1/2 -translate-y-1/2 h-1.5 z-0 overflow-hidden rounded-full">
          <motion.div 
            className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"
            initial={{ width: '0%' }}
            animate={{ width: dynamicNodes.length > 1 ? `${(activeIdx / (dynamicNodes.length - 1)) * 100}%` : '0%' }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>

        {dynamicNodes.map((node) => {
          const Icon = node.icon;
          return (
            <div key={node.id} className="relative z-10 flex flex-col items-center gap-2 flex-1 min-w-[80px]">
              <motion.div 
                className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 transition-all duration-500
                  ${node.isActive ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-600 text-slate-500'}
                  ${node.isCurrent ? 'scale-110' : ''}
                `}
                animate={node.isCurrent ? { 
                  boxShadow: ['0 0 10px rgba(16,185,129,0.4)', '0 0 30px rgba(16,185,129,0.9)', '0 0 10px rgba(16,185,129,0.4)'] 
                } : { 
                  boxShadow: node.isActive ? '0 0 10px rgba(16,185,129,0.2)' : 'none' 
                }}
                transition={node.isCurrent ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : {}}
              >
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
              </motion.div>
              <span className={`text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors duration-500 max-w-[90px] text-center leading-tight
                ${node.isActive ? 'text-emerald-400' : 'text-slate-500'}
              `}>
                {node.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineVisualizer;
