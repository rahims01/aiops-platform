import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    critical: 'bg-red-500',
    maintenance: 'bg-blue-500',
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
  };
  return colors[status] || 'bg-gray-500';
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
    maintenance: 'bg-gray-500 text-white',
  };
  return colors[severity] || 'bg-gray-500 text-white';
}

export function getPriorityColor(severity: string): string {
  const colors: Record<string, string> = {
    P1: 'bg-red-500 text-white',
    P2: 'bg-orange-500 text-white',
    P3: 'bg-yellow-500 text-white',
    P4: 'bg-blue-500 text-white',
  };
  return colors[severity] || 'bg-gray-500 text-white';
}

export function getIncidentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NEW: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    ANALYZING: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    REMEDIATING: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    RESOLVED: 'bg-green-500/15 text-green-600 dark:text-green-400',
    ESCALATED: 'bg-red-500/15 text-red-600 dark:text-red-400',
  };
  return colors[status] || 'bg-gray-500/15 text-gray-600 dark:text-gray-400';
}

export function getRiskColor(risk: string): string {
  const colors: Record<string, string> = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };
  return colors[risk] || 'bg-gray-500';
}