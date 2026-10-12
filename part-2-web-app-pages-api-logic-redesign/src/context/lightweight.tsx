'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { detectRaspberryPiBrowser } from '@/lib/platform';

interface LightweightConfig {
  enabled: boolean;
  autoDetected: boolean;
  frameIntervalMs: number;
  canvasScale: number;
  disableHeavyUI: boolean;
  smallModel: boolean;
}

interface LightweightContextType {
  config: LightweightConfig;
  toggle: () => void;
  forceFullPower: () => void;
  forceLightweight: () => void;
}

const defaultConfig: LightweightConfig = {
  enabled: false,
  autoDetected: false,
  frameIntervalMs: 100, // Default: 10 FPS
  canvasScale: 1.0,
  disableHeavyUI: false,
  smallModel: false,
};

const lightweightConfig: LightweightConfig = {
  enabled: true,
  autoDetected: false,
  frameIntervalMs: 200, // 5 FPS for lightweight
  canvasScale: 0.7,
  disableHeavyUI: true,
  smallModel: true,
};

const LightweightContext = createContext<LightweightContextType | undefined>(undefined);

export function LightweightProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LightweightConfig>(defaultConfig);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('lightweight-mode');
    const isRaspberryPi = detectRaspberryPiBrowser();
    
    let newConfig: LightweightConfig;
    
    if (saved === 'lightweight') {
      newConfig = { ...lightweightConfig, autoDetected: false };
    } else if (saved === 'full') {
      newConfig = { ...defaultConfig, autoDetected: false };
    } else if (isRaspberryPi) {
      // Auto-enable for Raspberry Pi
      newConfig = { ...lightweightConfig, autoDetected: true };
    } else {
      newConfig = defaultConfig;
    }
    
    setConfig(newConfig);
  }, []);

  const toggle = () => {
    const newConfig = config.enabled ? defaultConfig : lightweightConfig;
    newConfig.autoDetected = false; // User override
    setConfig(newConfig);
    localStorage.setItem('lightweight-mode', newConfig.enabled ? 'lightweight' : 'full');
  };

  const forceFullPower = () => {
    const newConfig = { ...defaultConfig, autoDetected: false };
    setConfig(newConfig);
    localStorage.setItem('lightweight-mode', 'full');
  };

  const forceLightweight = () => {
    const newConfig = { ...lightweightConfig, autoDetected: false };
    setConfig(newConfig);
    localStorage.setItem('lightweight-mode', 'lightweight');
  };

  return (
    <LightweightContext.Provider value={{ config, toggle, forceFullPower, forceLightweight }}>
      {children}
    </LightweightContext.Provider>
  );
}

export function useLightweight() {
  const context = useContext(LightweightContext);
  if (context === undefined) {
    throw new Error('useLightweight must be used within a LightweightProvider');
  }
  return context;
}