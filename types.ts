
export type DeviceType = 'WASHER' | 'FRIDGE' | 'TV' | 'SERVER' | 'ROUTER' | 'SPEAKER' | 'CAMERA' | 'THERMOSTAT';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: 'OFF' | 'IDLE' | 'ACTIVE' | 'ERROR';
  powerDraw: number; // Watts
  progress?: number; // 0-100 for tasks like washing
  temperature?: number; // Device internal temp
}

export interface RoomNode {
  id: string;
  name: string;
  temp: number;
  humidity: number;
  lights: boolean;
  power: number; // watts
  active: boolean;
  devices: Device[];
}

export interface SystemStatus {
  security: 'ARMED' | 'DISARMED' | 'BREACH';
  network: 'ONLINE' | 'OFFLINE';
  aiStatus: 'IDLE' | 'ANALYZING' | 'GENERATING';
  totalPower: number;
}

export enum AICommandType {
  OPTIMIZE = 'OPTIMIZE',
  STATUS_REPORT = 'STATUS_REPORT',
  SECURITY_SCAN = 'SECURITY_SCAN'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'ai';
}

export type ViewMode = 'STANDARD' | 'POWER' | 'VENTILATION' | 'WIFI' | 'WATER' | 'THERMAL';
