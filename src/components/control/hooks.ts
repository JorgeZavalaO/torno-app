"use client";

import { useState, useEffect } from "react";

/**
 * Hook personalizado para actualización automática de datos cada cierto intervalo
 */
export function useAutoRefresh(
  refreshFn: () => void,
  intervalMs: number = 30000, // 30 segundos por defecto
  enabled: boolean = true
) {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setIsRefreshing(true);
      refreshFn();
      setLastRefresh(new Date());
      
      // Simular tiempo de carga mínimo para UX
      setTimeout(() => setIsRefreshing(false), 500);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [refreshFn, intervalMs, enabled]);

  const forceRefresh = () => {
    setIsRefreshing(true);
    refreshFn();
    setLastRefresh(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return { lastRefresh, isRefreshing, forceRefresh };
}

/**
 * Hook para formatear tiempo transcurrido desde la última actualización
 */
export function useTimeAgo(date: Date) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    const updateTimeAgo = () => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);

      if (diffSeconds < 60) {
        setTimeAgo(`hace ${diffSeconds}s`);
      } else if (diffMinutes < 60) {
        setTimeAgo(`hace ${diffMinutes}m`);
      } else {
        setTimeAgo(date.toLocaleTimeString());
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    
    return () => clearInterval(interval);
  }, [date]);

  return timeAgo;
}
