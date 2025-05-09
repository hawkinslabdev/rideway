// app/contexts/SettingsContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { config, UnitsType, ThemeType, getUnitsLabel, formatCurrency } from '../lib/config';
import { DistanceUtil } from '../lib/utils/distance';
import {
  convertTaskToDisplayUnits,
  convertMotorcycleToDisplayUnits,
  convertRecordToDisplayUnits,
  prepareTaskForStorage,
  prepareMotorcycleForStorage,
  prepareRecordForStorage
} from '../lib/utils/unitsConverter';

// Define the shape of our settings
export interface AppSettings {
  emailNotifications: boolean;
  maintenanceReminders: boolean;
  units: UnitsType;
  language: string;
  theme: ThemeType;
  maintenanceView: 'calendar' | 'list';
  currency: string; // Added currency property
  locale: string;   // Added locale property
}

// Define the shape of our context
interface SettingsContextType {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  saveSettings: () => Promise<void>;
  // Conversion helpers
  convertToDisplayUnits: (valueInKm: number | null | undefined, decimals?: number) => number | null;
  convertToStorageUnits: (displayValue: number | null | undefined, decimals?: number) => number | null;
  // Format helpers
  formatCurrency: (value: number | null) => string;
  getUnitsLabel: () => { distance: string, volume: string };
  formatDistance: (value: number | null | undefined, decimals?: number) => string;
  // Enhanced conversion helpers for complex objects
  convertTaskToDisplay: (task: any) => any;
  convertMotorcycleToDisplay: (motorcycle: any) => any;
  convertRecordToDisplay: (record: any) => any;
  prepareTaskForStorage: (formData: any) => any;
  prepareMotorcycleForStorage: (formData: any) => any;
  prepareRecordForStorage: (formData: any) => any;
}

// Create the context with a default value
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Custom hook to use the settings context
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  
  return context;
};

// Default settings based on our config
const defaultSettings: AppSettings = {
  emailNotifications: config.defaultEmailNotifications,
  maintenanceReminders: config.defaultMaintenanceReminders,
  units: config.defaultUnits as UnitsType,
  language: config.defaultLanguage,
  theme: config.defaultTheme as ThemeType,
  maintenanceView: 'calendar',
  currency: config.defaultCurrency || 'EUR', // Added default currency
  locale: config.defaultLocale || 'en-US', // Added default locale
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem('rideway-settings');
        
        if (savedSettings) {
          setSettings(prevSettings => ({
            ...prevSettings,
            ...JSON.parse(savedSettings)
          }));
        }
        
        // Mark as loaded
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load settings from localStorage:', err);
        setIsLoaded(true);
      }
    }
  }, []);

  // Update a single setting
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Save to localStorage immediately for better persistence
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('rideway-settings');
      let updatedSettings = { ...settings, [key]: value };
      
      if (savedSettings) {
        updatedSettings = { ...JSON.parse(savedSettings), [key]: value };
      }
      
      localStorage.setItem('rideway-settings', JSON.stringify(updatedSettings));
    }
  };

  // Save all settings
  const saveSettings = async (): Promise<void> => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rideway-settings', JSON.stringify(settings));
    }
    // In a future implementation, this could also save to the server/database
  };

  // Get the current units label
  const getCurrentUnitsLabel = () => {
    return getUnitsLabel(settings.units);
  };

  // Format a distance value with the current units
  const formatCurrentDistance = (value: number | null | undefined, decimals = 0): string => {
    return DistanceUtil.format(value, settings.units, decimals);
  };
  
  // Convert a value from storage units (km) to display units
  const convertToDisplayUnits = (valueInKm: number | null | undefined, decimals = 0): number | null => {
    return DistanceUtil.toDisplayUnits(valueInKm, settings.units, decimals);
  };
  
  // Convert a value from display units to storage units (km)
  const convertToStorageUnits = (displayValue: number | null | undefined, decimals = 0): number | null => {
    return DistanceUtil.toStorageUnits(displayValue, settings.units, decimals);
  };

  // Enhanced object conversion helpers
  const convertTaskToDisplay = (task: any) => {
    return convertTaskToDisplayUnits(task, settings.units);
  };

  const convertMotorcycleToDisplay = (motorcycle: any) => {
    return convertMotorcycleToDisplayUnits(motorcycle, settings.units);
  };

  const convertRecordToDisplay = (record: any) => {
    return convertRecordToDisplayUnits(record, settings.units);
  };

  const prepareTaskForStorageHelper = (formData: any) => {
    return prepareTaskForStorage(formData, settings.units);
  };

  const prepareMotorcycleForStorageHelper = (formData: any) => {
    return prepareMotorcycleForStorage(formData, settings.units);
  };

  const prepareRecordForStorageHelper = (formData: any) => {
    return prepareRecordForStorage(formData, settings.units);
  };

  // Only render children once settings are loaded from localStorage
  if (!isLoaded) {
    return null; // Or a loading spinner if you prefer
  }

  return (
    <SettingsContext.Provider 
      value={{ 
        settings, 
        updateSetting, 
        saveSettings,
        getUnitsLabel: getCurrentUnitsLabel,
        formatCurrency: (value: number | null) => formatCurrency(value, settings.currency, settings.locale),
        formatDistance: formatCurrentDistance,
        convertToDisplayUnits,
        convertToStorageUnits,
        // Enhanced helpers
        convertTaskToDisplay: convertTaskToDisplay,
        convertMotorcycleToDisplay: convertMotorcycleToDisplay,
        convertRecordToDisplay: convertRecordToDisplay,
        prepareTaskForStorage: prepareTaskForStorageHelper,
        prepareMotorcycleForStorage: prepareMotorcycleForStorageHelper,
        prepareRecordForStorage: prepareRecordForStorageHelper
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};