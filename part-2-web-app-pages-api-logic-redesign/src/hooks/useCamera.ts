import { useState, useRef, useCallback } from 'react';
import { cameraService } from '@/lib/camera-service';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) return false;

    try {
      setCameraError(null);
      const success = await cameraService.startCamera(videoRef.current);
      setIsCameraActive(success);
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Camera access failed';
      setCameraError(errorMessage);
      setIsCameraActive(false);
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraService.stopCamera();
    setIsCameraActive(false);
    setCameraError(null);
  }, []);

  const captureFrame = useCallback(() => {
    return cameraService.captureFrame();
  }, []);

  return {
    videoRef,
    isCameraActive,
    cameraError,
    startCamera,
    stopCamera,
    captureFrame
  };
};