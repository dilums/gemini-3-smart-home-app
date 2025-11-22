
import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Shield, ShieldAlert, Zap, Send, Cpu, Wind, Wifi, Layers, Play, Square, Thermometer, Droplets, Video, Speaker, Monitor } from 'lucide-react';
import { RoomNode, SystemStatus, LogEntry, ViewMode, Device } from './types';
import { Scene3D } from './components/Scene3D';
import { HUDPanel, HUDButton, CircularGauge } from './components/HUDComponents';
import { generateSystemInsight } from './services/geminiService';

// --- Mock Data Initializers ---
const INITIAL_ROOMS: RoomNode[] = [
  { 
    id: 'living', name: 'LIVING ROOM', temp: 21.5, humidity: 45, lights: true, power: 120, active: false,
    devices: [
      { id: 'tv1', name: 'Holoscreen TV', type: 'TV', status: 'IDLE', powerDraw: 80 },
    ] 
  },
  { 
    id: 'kitchen', name: 'KITCHEN', temp: 22.0, humidity: 50, lights: true, power: 250, active: false,
    devices: [
      { id: 'fridge', name: 'Smart Fridge', type: 'FRIDGE', status: 'ACTIVE', powerDraw: 150, temperature: 3.5 }
    ]
  },
  { 
    id: 'master', name: 'MASTER SUITE', temp: 20.0, humidity: 40, lights: false, power: 40, active: false,
    devices: [
      { id: 'thermostat', name: 'Nest Hub', type: 'THERMOSTAT', status: 'ACTIVE', powerDraw: 5, temperature: 20.0 }
    ]
  },
  { 
    id: 'office', name: 'OFFICE', temp: 21.0, humidity: 35, lights: true, power: 350, active: true,
    devices: [
      { id: 'server', name: 'Home Server', type: 'SERVER', status: 'ACTIVE', powerDraw: 300, temperature: 45.0 }, 
      { id: 'router', name: 'Mesh Router', type: 'ROUTER', status: 'ACTIVE', powerDraw: 15 }
    ]
  },
  { 
    id: 'garage', name: 'GARAGE', temp: 18.0, humidity: 60, lights: false, power: 10, active: false,
    devices: [
      { id: 'washer', name: 'Quantum Washer', type: 'WASHER', status: 'IDLE', powerDraw: 0, progress: 0 },
      { id: 'camera_front', name: 'Front Cam', type: 'CAMERA', status: 'ACTIVE', powerDraw: 8 }
    ]
  },
];

const MOCK_ENERGY_DATA = [
  { time: '00:00', usage: 300 }, { time: '04:00', usage: 200 },
  { time: '08:00', usage: 800 }, { time: '12:00', usage: 650 },
  { time: '16:00', usage: 900 }, { time: '20:00', usage: 1100 },
  { time: '23:59', usage: 500 },
];

const App: React.FC = () => {
  // --- State ---
  const [rooms, setRooms] = useState<RoomNode[]>(INITIAL_ROOMS);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    security: 'ARMED',
    network: 'ONLINE',
    aiStatus: 'IDLE',
    totalPower: 0
  });
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('STANDARD');
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', timestamp: '08:00:01', source: 'SYSTEM', message: 'BOOT SEQUENCE COMPLETE', type: 'info' },
    { id: '2', timestamp: '08:00:05', source: 'SECURITY', message: 'PERIMETER SECURE', type: 'info' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  
  useEffect(() => {
    const total = rooms.reduce((acc, room) => {
      const roomBase = room.lights ? room.power : 5;
      const devicePower = room.devices.reduce((dAcc, d) => dAcc + (d.status === 'ACTIVE' ? d.powerDraw : 2), 0);
      return acc + roomBase + devicePower;
    }, 0);
    setSystemStatus(prev => ({ ...prev, totalPower: total }));
  }, [rooms]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // --- Handlers ---

  const addLog = (source: string, message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      source,
      message,
      type
    };
    setLogs(prev => [...prev.slice(-15), newLog]);
  };

  const toggleRoomLight = (id: string) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, lights: !r.lights } : r));
    addLog('MANUAL_OVERRIDE', `LIGHTS TOGGLED FOR ${id.toUpperCase()}`);
  };

  const toggleDevice = (roomId: string, deviceId: string) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        devices: r.devices.map(d => {
          if (d.id !== deviceId) return d;
          const newStatus = d.status === 'ACTIVE' ? 'IDLE' : 'ACTIVE';
          addLog('DEVICE_CTRL', `${d.name.toUpperCase()} SET TO ${newStatus}`, newStatus === 'ACTIVE' ? 'warning' : 'info');
          return { ...d, status: newStatus };
        })
      };
    }));
  };

  const toggleSecurity = () => {
    const newStatus = systemStatus.security === 'ARMED' ? 'DISARMED' : 'ARMED';
    setSystemStatus(prev => ({ ...prev, security: newStatus }));
    addLog('SECURITY', `SYSTEM ${newStatus}`, newStatus === 'ARMED' ? 'info' : 'warning');
  };

  const handleAICommand = async () => {
    if (!aiInput.trim()) return;
    
    const userQuery = aiInput;
    setAiInput('');
    setSystemStatus(prev => ({ ...prev, aiStatus: 'ANALYZING' }));
    addLog('USER', userQuery, 'info');

    setTimeout(async () => {
      const response = await generateSystemInsight(rooms, systemStatus, userQuery);
      setSystemStatus(prev => ({ ...prev, aiStatus: 'IDLE' }));
      addLog('AERO-12', response, 'ai');

      if (userQuery.toLowerCase().includes('view power')) setViewMode('POWER');
      if (userQuery.toLowerCase().includes('view water')) setViewMode('WATER');
      if (userQuery.toLowerCase().includes('view thermal')) setViewMode('THERMAL');
    }, 1500);
  };

  const handleDeviceSelect = (deviceId: string) => {
    // Find room of device
    const room = rooms.find(r => r.devices.some(d => d.id === deviceId));
    if (room) {
      setActiveRoomId(room.id);
      setSelectedDeviceId(deviceId);
    }
  };

  // --- Render Helpers ---
  
  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const selectedDevice = activeRoom?.devices.find(d => d.id === selectedDeviceId);

  const getDeviceIcon = (type: string) => {
      switch(type) {
          case 'WASHER': return <Activity className="w-4 h-4" />;
          case 'SERVER': return <Cpu className="w-4 h-4" />;
          case 'ROUTER': return <Wifi className="w-4 h-4" />;
          case 'FRIDGE': return <Wind className="w-4 h-4" />;
          case 'TV': return <Monitor className="w-4 h-4" />;
          case 'THERMOSTAT': return <Thermometer className="w-4 h-4" />;
          case 'CAMERA': return <Video className="w-4 h-4" />;
          default: return <Activity className="w-4 h-4" />;
      }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-cyan-400 overflow-hidden flex flex-col relative selection:bg-cyan-500/30">
      <div className="absolute inset-0 pointer-events-none scanline z-0 opacity-20"></div>
      <div className="absolute inset-0 pointer-events-none" style={{ 
        backgroundImage: 'linear-gradient(rgba(6,182,212,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}></div>

      {/* Header */}
      <header className="h-14 border-b border-cyan-900/50 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center space-x-4">
          <Cpu className="w-6 h-6 text-cyan-400 animate-pulse" />
          <div>
            <h1 className="font-header text-lg font-bold tracking-[0.2em] text-white">AERO-12</h1>
            <p className="text-[8px] text-cyan-600 uppercase tracking-widest leading-none">Home Operating System v2.5.1</p>
          </div>
        </div>
        <div className="flex items-center space-x-8">
           <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-400 uppercase">System Time</span>
              <span className="font-mono text-sm text-white">{new Date().toLocaleTimeString()}</span>
           </div>
           <div className={`px-3 py-0.5 text-xs border ${systemStatus.security === 'ARMED' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-red-500 text-red-400 bg-red-500/10 animate-pulse'}`}>
              {systemStatus.security}
           </div>
        </div>
      </header>

      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden z-10 relative">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-3 flex flex-col gap-4 h-full overflow-y-auto pr-2 custom-scrollbar">
          <HUDPanel title="Room Selector" className="flex-shrink-0">
            <div className="grid grid-cols-1 gap-1">
              {rooms.map(room => (
                <button 
                  key={room.id}
                  onClick={() => { setActiveRoomId(room.id); setSelectedDeviceId(null); }}
                  className={`flex items-center justify-between p-2 border transition-all duration-300 group ${activeRoomId === room.id ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/5 hover:border-white/20'}`}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-header text-xs text-white tracking-wider">{room.name}</span>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${room.lights ? 'bg-cyan-400 shadow-[0_0_6px_cyan]' : 'bg-slate-700'}`}></div>
                </button>
              ))}
            </div>
          </HUDPanel>

          {activeRoom && !selectedDevice && (
            <HUDPanel title={`Controls: ${activeRoom.name}`} className="flex-grow">
               <div className="space-y-6">
                  <div className="flex justify-center space-x-6 pt-2">
                    <CircularGauge value={activeRoom.temp} max={40} label="TEMP" unit="°C" color={activeRoom.temp > 24 ? '#f87171' : '#22d3ee'} />
                    <CircularGauge value={activeRoom.humidity} max={100} label="HUMIDITY" unit="%" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <HUDButton 
                      label={activeRoom.lights ? "LIGHTS ON" : "LIGHTS OFF"} 
                      onClick={() => toggleRoomLight(activeRoom.id)} 
                      active={activeRoom.lights} 
                    />
                    <HUDButton 
                      label="LOCKS" 
                      onClick={() => {}} 
                      active={systemStatus.security === 'ARMED'} 
                      danger 
                    />
                  </div>

                  {activeRoom.devices.length > 0 && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <h4 className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider">Device List</h4>
                      <div className="space-y-2">
                        {activeRoom.devices.map(device => (
                          <div key={device.id} className="flex items-center justify-between bg-black/30 p-2 border border-white/5 hover:border-cyan-500/30 cursor-pointer" onClick={() => setSelectedDeviceId(device.id)}>
                            <div className="flex items-center space-x-2 text-cyan-500">
                               {getDeviceIcon(device.type)}
                               <span className="text-xs text-white">{device.name}</span>
                            </div>
                            <button 
                               onClick={(e) => { e.stopPropagation(); toggleDevice(activeRoom.id, device.id); }}
                               className={`p-1 rounded border ${device.status === 'ACTIVE' ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : 'border-slate-700 text-slate-500'}`}
                            >
                               {device.status === 'ACTIVE' ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
               </div>
            </HUDPanel>
          )}

          {selectedDevice && (
            <HUDPanel title="Device Detail" className="flex-grow border-cyan-400/50">
               <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                     <div className="flex items-center space-x-3">
                       <div className="p-2 bg-cyan-900/20 rounded border border-cyan-500/50">
                          {getDeviceIcon(selectedDevice.type)}
                       </div>
                       <div>
                          <h2 className="text-sm font-bold text-white">{selectedDevice.name}</h2>
                          <span className="text-[10px] text-slate-400">{selectedDevice.type} UNIT - ID #{selectedDevice.id.toUpperCase()}</span>
                       </div>
                     </div>
                     <button onClick={() => setSelectedDeviceId(null)} className="text-xs text-slate-500 hover:text-white">[BACK]</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                     <div className="bg-white/5 p-2 rounded border border-white/10">
                        <span className="block text-[9px] text-slate-400 uppercase">Status</span>
                        <span className={`text-xs font-bold ${selectedDevice.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-300'}`}>{selectedDevice.status}</span>
                     </div>
                     <div className="bg-white/5 p-2 rounded border border-white/10">
                        <span className="block text-[9px] text-slate-400 uppercase">Power</span>
                        <span className="text-xs font-bold text-yellow-400">{selectedDevice.status === 'ACTIVE' ? selectedDevice.powerDraw : 0} W</span>
                     </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-400 uppercase flex justify-between">
                       <span>Efficiency</span>
                       <span>94%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 w-[94%]"></div>
                    </div>
                  </div>

                  {selectedDevice.temperature && (
                     <div className="flex items-center justify-between bg-red-900/10 border border-red-500/20 p-2 rounded">
                        <div className="flex items-center space-x-2">
                           <Thermometer className="w-4 h-4 text-red-400" />
                           <span className="text-xs text-red-300">Internal Temp</span>
                        </div>
                        <span className="font-mono text-red-400">{selectedDevice.temperature}°C</span>
                     </div>
                  )}

                  <HUDButton 
                    label={selectedDevice.status === 'ACTIVE' ? 'POWER DOWN' : 'INITIATE'} 
                    onClick={() => toggleDevice(activeRoom!.id, selectedDevice.id)}
                    active={selectedDevice.status === 'ACTIVE'}
                  />
               </div>
            </HUDPanel>
          )}
        </div>

        {/* CENTER COLUMN */}
        <div className="lg:col-span-6 flex flex-col gap-4 h-full">
          {/* View Toggles */}
          <div className="flex justify-center space-x-1 flex-wrap gap-y-2">
             {(['STANDARD', 'POWER', 'VENTILATION', 'WIFI', 'WATER', 'THERMAL'] as ViewMode[]).map(mode => (
               <button
                 key={mode}
                 onClick={() => setViewMode(mode)}
                 className={`px-3 py-1 text-[9px] border font-header tracking-widest transition-colors ${viewMode === mode ? 'bg-cyan-500 text-black border-cyan-500' : 'border-cyan-900/50 text-cyan-700 hover:border-cyan-500'}`}
               >
                 {mode}
               </button>
             ))}
          </div>

          <HUDPanel title="Holographic Overview" className="flex-[3] relative min-h-[300px] border-cyan-500/20">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05),transparent_70%)] pointer-events-none"></div>
             <Scene3D 
                alertMode={systemStatus.security === 'BREACH'} 
                activeRoomId={activeRoomId} 
                viewMode={viewMode}
                rooms={rooms}
                selectedDeviceId={selectedDeviceId}
                onDeviceClick={handleDeviceSelect}
              />
          </HUDPanel>
          
          {/* Compact Status Panel */}
          <HUDPanel title="System Status" className="flex-0 h-28">
            <div className="grid grid-cols-3 gap-2 h-full pb-2">
               <div className="flex flex-row items-center justify-between border border-white/5 bg-white/5 rounded px-3">
                  <div className="flex items-center gap-2">
                     <Wifi className="w-4 h-4 text-cyan-400" />
                     <span className="text-[10px] text-slate-400 uppercase hidden sm:block">Net</span>
                  </div>
                  <span className="text-white font-bold text-xs">{systemStatus.network}</span>
               </div>
               <div className="flex flex-row items-center justify-between border border-white/5 bg-white/5 rounded px-3">
                  <div className="flex items-center gap-2">
                     {systemStatus.security === 'ARMED' ? <Shield className="w-4 h-4 text-cyan-400" /> : <ShieldAlert className="w-4 h-4 text-red-500" />}
                     <span className="text-[10px] text-slate-400 uppercase hidden sm:block">Sec</span>
                  </div>
                  <span className={`font-bold text-xs ${systemStatus.security === 'ARMED' ? 'text-cyan-400' : 'text-red-500'}`}>{systemStatus.security}</span>
               </div>
               <div className="flex flex-row items-center justify-between border border-white/5 bg-white/5 rounded px-3">
                  <div className="flex items-center gap-2">
                     <Zap className="w-4 h-4 text-yellow-400" />
                     <span className="text-[10px] text-slate-400 uppercase hidden sm:block">Load</span>
                  </div>
                  <span className="text-white font-bold text-xs">{systemStatus.totalPower}W</span>
               </div>
               <div className="flex flex-row items-center justify-between border border-white/5 bg-white/5 rounded px-3">
                  <div className="flex items-center gap-2">
                     <Droplets className="w-4 h-4 text-blue-400" />
                     <span className="text-[10px] text-slate-400 uppercase hidden sm:block">Water</span>
                  </div>
                  <span className="text-white font-bold text-xs">OK</span>
               </div>
               <div className="flex flex-row items-center justify-between border border-white/5 bg-white/5 rounded px-3">
                  <div className="flex items-center gap-2">
                     <Thermometer className="w-4 h-4 text-red-400" />
                     <span className="text-[10px] text-slate-400 uppercase hidden sm:block">Avg T</span>
                  </div>
                  <span className="text-white font-bold text-xs">21°C</span>
               </div>
               <div className="flex flex-row items-center justify-between border border-white/5 bg-white/5 rounded px-3">
                  <div className="flex items-center gap-2">
                     <Cpu className="w-4 h-4 text-purple-400" />
                     <span className="text-[10px] text-slate-400 uppercase hidden sm:block">AI</span>
                  </div>
                  <span className="text-white font-bold text-xs">{systemStatus.aiStatus}</span>
               </div>
            </div>
          </HUDPanel>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-3 flex flex-col gap-4 h-full">
          <HUDPanel title="Energy Analytics" className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_ENERGY_DATA}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#475569" tick={{fontSize: 9}} />
                <YAxis stroke="#475569" tick={{fontSize: 9}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#ecfeff' }}
                  itemStyle={{ color: '#22d3ee' }}
                />
                <Area type="monotone" dataKey="usage" stroke="#22d3ee" fillOpacity={1} fill="url(#colorUsage)" />
              </AreaChart>
            </ResponsiveContainer>
          </HUDPanel>

          <HUDPanel title="AI Core Interface" className="flex-[1.5] flex flex-col">
             <div className="flex-1 bg-black/40 border border-white/5 p-2 overflow-y-auto font-mono text-[10px] space-y-1 mb-2 rounded custom-scrollbar">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-slate-500">[{log.timestamp}]</span>
                    <span className={`${log.type === 'error' ? 'text-red-500' : log.type === 'ai' ? 'text-cyan-300' : 'text-emerald-500'} font-bold`}>
                      {log.source}:
                    </span>
                    <span className="text-slate-300 break-words flex-1">{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
             </div>

             <div className="relative">
               <input 
                 type="text"
                 value={aiInput}
                 onChange={(e) => setAiInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleAICommand()}
                 placeholder="CMD_INPUT..."
                 className="w-full bg-slate-900/80 border border-cyan-900/50 text-cyan-100 px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-slate-600"
                 disabled={systemStatus.aiStatus === 'ANALYZING'}
               />
               <button 
                  onClick={handleAICommand}
                  disabled={systemStatus.aiStatus === 'ANALYZING'}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cyan-500 hover:text-cyan-300 disabled:opacity-50"
               >
                 {systemStatus.aiStatus === 'ANALYZING' ? (
                   <Activity className="w-3 h-3 animate-spin" />
                 ) : (
                   <Send className="w-3 h-3" />
                 )}
               </button>
             </div>

             <div className="mt-2 grid grid-cols-2 gap-2">
                <HUDButton label="DIAGNOSTICS" onClick={() => setAiInput('Run full system diagnostic report')} />
                <HUDButton label="EMERGENCY STOP" onClick={toggleSecurity} danger active={systemStatus.security === 'ARMED'} />
             </div>
          </HUDPanel>
        </div>

      </main>

      <footer className="h-6 bg-slate-950 border-t border-cyan-900/30 flex items-center justify-between px-6 text-[9px] text-slate-500 uppercase font-header z-20">
        <div className="flex space-x-4">
          <span>Server: US-EAST-2</span>
          <span>Latency: 12ms</span>
        </div>
        <div className="flex space-x-4">
          <span className={systemStatus.aiStatus === 'IDLE' ? 'text-emerald-500' : 'text-yellow-400'}>
             AI CORE: {systemStatus.aiStatus}
          </span>
          <span>v.2.5.1</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
