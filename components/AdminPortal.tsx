import React from 'react';
import { LayoutGrid, Activity, ArrowRight, LogOut } from 'lucide-react';
import { User } from '../types';

interface AdminPortalProps {
  user: User;
  onSelect: (destination: 'workspace' | 'dashboard') => void;
  onLogout: () => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ user, onSelect, onLogout }) => {
  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans text-zinc-100">
       
       {/* Background Ambiance */}
       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-900/10 rounded-full blur-[120px] pointer-events-none" />
       <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none" />
       <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

       {/* Header */}
       <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 rounded-full flex items-center justify-center shadow-lg">
                <span className="font-serif text-amber-500 font-bold text-xl">A</span>
             </div>
             <div>
               <h1 className="text-sm font-serif text-zinc-200 tracking-wide">Amina's Work</h1>
               <p className="text-[10px] text-amber-500/80 uppercase tracking-widest">Admin Portal</p>
             </div>
          </div>
          <button 
             onClick={onLogout}
             className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 hover:bg-zinc-900 text-zinc-500 hover:text-white transition-all text-xs font-medium"
          >
             <LogOut size={14} />
             Disconnect
          </button>
       </div>

       {/* Content */}
       <div className="relative z-10 max-w-5xl w-full px-6">
          <div className="text-center mb-16">
             <h2 className="font-serif text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-zinc-500 mb-4">
                Welcome back, {user.name.split(' ')[0]}
             </h2>
             <p className="text-zinc-500 text-sm tracking-wide">SELECT YOUR DESTINATION</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             
             {/* Workspace Card */}
             <button 
               onClick={() => onSelect('workspace')}
               className="group relative h-[300px] bg-zinc-950/50 border border-zinc-800 hover:border-amber-500/50 rounded-2xl p-8 text-left transition-all duration-500 hover:shadow-[0_0_50px_-10px_rgba(245,158,11,0.15)] overflow-hidden"
             >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                   <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-amber-500/30 flex items-center justify-center transition-colors mb-6">
                      <LayoutGrid size={28} className="text-zinc-400 group-hover:text-amber-400 transition-colors" />
                   </div>
                   
                   <div>
                      <h3 className="text-2xl font-serif text-zinc-100 mb-2 group-hover:text-amber-100 transition-colors">Launch Studio</h3>
                      <p className="text-sm text-zinc-500 group-hover:text-zinc-400 leading-relaxed max-w-sm">
                         Access the intelligence suite. Generate subtitles, translate content, and edit timelines.
                      </p>
                   </div>

                   <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
                      <ArrowRight className="text-amber-500" />
                   </div>
                </div>
             </button>

             {/* Dashboard Card */}
             <button 
               onClick={() => onSelect('dashboard')}
               className="group relative h-[300px] bg-zinc-950/50 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-8 text-left transition-all duration-500 hover:shadow-[0_0_50px_-10px_rgba(99,102,241,0.15)] overflow-hidden"
             >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                   <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-indigo-500/30 flex items-center justify-center transition-colors mb-6">
                      <Activity size={28} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                   </div>
                   
                   <div>
                      <h3 className="text-2xl font-serif text-zinc-100 mb-2 group-hover:text-indigo-100 transition-colors">Command Center</h3>
                      <p className="text-sm text-zinc-500 group-hover:text-zinc-400 leading-relaxed max-w-sm">
                         View user analytics, track active sessions, and monitor system usage statistics.
                      </p>
                   </div>

                   <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
                      <ArrowRight className="text-indigo-500" />
                   </div>
                </div>
             </button>

          </div>
       </div>
    </div>
  );
};

export default AdminPortal;