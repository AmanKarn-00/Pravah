import React, { useState } from 'react';
import { Send, Mic, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatInterface = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Gemma AI
        </h2>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col justify-end">
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="flex gap-3 text-slate-400 items-start"
            >
              <Loader2 className="w-5 h-5 animate-spin mt-1 text-emerald-400" />
              <div className="bg-slate-700/50 p-3 rounded-lg rounded-tl-none border border-slate-600/50">
                <p className="text-sm">Analyzing input and orchestrating tools...</p>
                <div className="flex gap-1 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{animationDelay: '0ms'}}/>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{animationDelay: '150ms'}}/>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{animationDelay: '300ms'}}/>
                </div>
              </div>
            </motion.div>
          )}
          {!isLoading && (
            <div className="flex gap-3 text-slate-200 items-start">
              <div className="bg-emerald-500/20 text-emerald-300 p-2 rounded-full">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-lg rounded-tl-none border border-slate-600/50">
                <p>How can I help you plan infrastructure today?</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-slate-800/80 border-t border-slate-700">
        <div className="flex gap-2 mb-3">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 transition-colors">
            <Mic className="w-4 h-4" /> Voice
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 transition-colors">
            <ImageIcon className="w-4 h-4" /> Upload Photo
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Close one lane tomorrow..."
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-200"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center w-12"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
