'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useLightweight } from '@/context/lightweight';

interface LightweightToggleProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function LightweightToggle({ 
  className, 
  variant = 'outline',
  size = 'default'
}: LightweightToggleProps) {
  const { config, toggle } = useLightweight();

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={toggle}
        className={className}
      >
        {config.enabled ? 'Lightweight ON' : 'Full Power'}
      </Button>
      {config.autoDetected && (
        <span className="text-xs text-muted-foreground">
          Auto-enabled for Raspberry Pi
        </span>
      )}
    </div>
  );
}