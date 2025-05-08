// File: app/components/IntegrationsManager.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { 
  Webhook, HomeIcon, Bell, Plus, Trash2, Save, 
  Check, X, ChevronRight, Edit, RefreshCw,
  AlertCircle, Info, Settings
} from 'lucide-react';
import { IntegrationType, EventType } from '../lib/types/integrations';
import { toast } from 'react-hot-toast';

// Types for UI state
interface Integration {
  id: string;
  userId: string;
  name: string;
  type: IntegrationType;
  active: boolean;
  config: any;
  events: IntegrationEvent[];
  createdAt: string;
  updatedAt: string;
}

interface IntegrationEvent {
  id: string;
  integrationId: string;
  eventType: EventType | string;
  enabled: boolean;
  templateData?: any;
}

interface Template {
  id: string;
  name: string;
  description: string;
  type: IntegrationType;
  defaultConfig: any;
}

export default function IntegrationsManager() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailViewId, setDetailViewId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchIntegrations();
    fetchTemplates();
  }, []);
  
  const fetchIntegrations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/integrations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch integrations');
      }
      
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      setError('Failed to load integrations');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/user/integrations/templates');
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      // Not setting error here to avoid blocking the UI
    }
  };
  
  const refreshIntegrations = async () => {
    try {
      setIsRefreshing(true);
      await fetchIntegrations();
      toast.success('Integrations refreshed');
    } catch (err) {
      toast.error('Failed to refresh integrations');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const toggleIntegrationActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/user/integrations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !currentActive })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update integration');
      }
      
      // Update local state
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === id 
            ? { ...integration, active: !currentActive } 
            : integration
        )
      );
      
      toast.success(`Integration ${!currentActive ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update integration');
      console.error(err);
    }
  };
  
  const deleteIntegration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/user/integrations/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete integration');
      }
      
      // Update local state
      setIntegrations(prev => prev.filter(integration => integration.id !== id));
      toast.success('Integration deleted');
    } catch (err) {
      toast.error('Failed to delete integration');
      console.error(err);
    }
  };
  
  const getIntegrationIcon = (type: IntegrationType) => {
    switch (type) {
      case 'webhook':
        return <Webhook size={16} />;
      case 'homeassistant':
        return <HomeIcon size={16} />;
      case 'ntfy':
        return <Bell size={16} />;
      default:
        return <Settings size={16} />;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
        <div>
          <p className="text-red-800 font-medium">{error}</p>
          <button 
            onClick={refreshIntegrations} 
            className="text-red-700 text-sm underline mt-1"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header with refresh and add buttons */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Integrations</h2>
        <div className="flex space-x-2">
          <button
            onClick={refreshIntegrations}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            aria-label="Refresh integrations"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={16} className="mr-1" />
            Add Integration
          </button>
        </div>
      </div>
      
      {/* Integrations list */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {integrations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <Webhook className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium mb-1">No integrations yet</h3>
            <p className="text-gray-500 mb-4">
              Connect Rideway to other services to automate notifications.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus size={16} className="mr-1" />
              Add Your First Integration
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {integrations.map(integration => (
              <div key={integration.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 ${
                      integration.active 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {getIntegrationIcon(integration.type)}
                    </div>
                    <div>
                      <h3 className="font-medium">{integration.name}</h3>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="capitalize">{integration.type}</span>
                        <span className="mx-1">•</span>
                        <span>
                          {integration.events.filter(e => e.enabled).length} events
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center mr-2">
                      <span className="text-sm mr-2 text-gray-500">
                        {integration.active ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => toggleIntegrationActive(integration.id, integration.active)}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                          integration.active ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`
                          inline-block w-4 h-4 transform rounded-full bg-white transition-transform
                          ${integration.active ? 'translate-x-6' : 'translate-x-1'}
                        `} />
                      </button>
                    </div>
                    <button
                      onClick={() => setDetailViewId(integration.id)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      aria-label="Edit integration"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => deleteIntegration(integration.id)}
                      className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded"
                      aria-label="Delete integration"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modals here */}
      {showAddModal && (
        <AddIntegrationModal 
          templates={templates}
          onClose={() => setShowAddModal(false)}
          onSave={fetchIntegrations}
        />
      )}
      
      {detailViewId && (
        <EditIntegrationModal
          integrationId={detailViewId}
          onClose={() => setDetailViewId(null)}
          onSave={fetchIntegrations}
        />
      )}
    </div>
  );
}

// Add Integration Modal Component
interface AddIntegrationModalProps {
  templates: Template[];
  onClose: () => void;
  onSave: () => void;
}

function AddIntegrationModal({ templates, onClose, onSave }: AddIntegrationModalProps) {
  const getIntegrationIcon = (type: IntegrationType) => {
    switch (type) {
      case 'webhook':
        return <Webhook size={16} />;
      case 'homeassistant':
        return <HomeIcon size={16} />;
      case 'ntfy':
        return <Bell size={16} />;
      default:
        return <Settings size={16} />;
    }
  };
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    config: {},
    events: [
      { eventType: 'maintenance_due', enabled: true },
      { eventType: 'maintenance_completed', enabled: true },
      { eventType: 'mileage_updated', enabled: true },
      { eventType: 'motorcycle_added', enabled: true }
    ]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When template selection changes, update the form data
  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        if (selectedType !== template.type) {
          setSelectedType(template.type);
        }
        setFormData(prev => {
          if (
            prev.name !== template.name ||
            JSON.stringify(prev.config) !== JSON.stringify(template.defaultConfig)
          ) {
            return {
              ...prev,
              name: template.name,
              config: template.defaultConfig
            };
          }
          return prev;
        });
      }
    }
  }, [selectedTemplate, templates, selectedType]);

  const handleTypeSelect = (type: IntegrationType) => {
    setSelectedType(type);
    setSelectedTemplate(null);

    // Set default config based on type
    let defaultConfig = {};
    switch (type) {
      case 'webhook':
        defaultConfig = {
          url: '',
          method: 'POST',
          headers: {},
          authentication: { type: 'none' }
        };
        break;
      case 'homeassistant':
        defaultConfig = {
          baseUrl: 'http://homeassistant.local:8123',
          longLivedToken: '',
          entityId: ''
        };
        break;
      case 'ntfy':
        defaultConfig = {
          topic: '',
          server: 'https://ntfy.sh',
          priority: 'default',
          authorization: { type: 'none' }
        };
        break;
    }

    setFormData(prev => ({
      ...prev,
      config: defaultConfig
    }));

    setStep(2);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      if (!selectedType) {
        throw new Error('Please select an integration type');
      }
      
      if (!formData.name.trim()) {
        throw new Error('Please provide a name for the integration');
      }
      
      // Different validation based on type
      if (selectedType === 'webhook') {
        const config = formData.config as any;
        if (!config.url || !config.url.trim()) {
          throw new Error('Webhook URL is required');
        }
        if (!config.method) {
          throw new Error('HTTP method is required');
        }
      } else if (selectedType === 'homeassistant') {
        const config = formData.config as any;
        if (!config.baseUrl || !config.baseUrl.trim()) {
          throw new Error('Home Assistant URL is required');
        }
        if (!config.longLivedToken || !config.longLivedToken.trim()) {
          throw new Error('Long-lived token is required');
        }
      } else if (selectedType === 'ntfy') {
        const config = formData.config as any;
        if (!config.topic || !config.topic.trim()) {
          throw new Error('Topic is required');
        }
      }
      
      // Prepare data for submission
      const integrationData = {
        name: formData.name,
        type: selectedType,
        active: true,
        config: formData.config,
        events: formData.events
      };
      
      // Submit the data
      const response = await fetch('/api/user/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(integrationData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create integration');
      }
      
      toast.success('Integration created successfully');
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle config field changes
  const handleConfigChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }));
  };

  // Function to handle nested config changes
  const handleNestedConfigChange = (parentKey: string, key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [parentKey]: {
          ...(prev.config as any)[parentKey],
          [key]: value
        }
      }
    }));
  };

  // Toggle event types
  const toggleEvent = (eventType: EventType) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.map(event => 
        event.eventType === eventType 
          ? { ...event, enabled: !event.enabled } 
          : event
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Add Integration</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
          
          {step === 1 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Choose Integration Type</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Template section */}
                {templates.length > 0 && (
                  <div className="md:col-span-2 mb-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Templates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {templates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`flex items-center p-3 border rounded-lg text-left hover:bg-gray-50 ${
                            selectedTemplate === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className={`p-2 rounded-lg mr-3 ${
                            selectedTemplate === template.id 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {getIntegrationIcon(template.type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">
                              {template.name}
                            </h3>
                            {template.description && (
                              <p className="text-xs text-gray-500">{template.description}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 mb-2 border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Integration</h4>
                    </div>
                  </div>
                )}
                
                {/* Integration types */}
                <button
                  onClick={() => handleTypeSelect('webhook')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Webhook className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium">Webhook</h3>
                    <p className="text-sm text-gray-500">Send HTTP requests to custom endpoints</p>
                  </div>
                </button>
                
                <button
                  onClick={() => handleTypeSelect('homeassistant')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <HomeIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium">Home Assistant</h3>
                    <p className="text-sm text-gray-500">Connect to your Home Assistant instance</p>
                  </div>
                </button>
                
                <button
                  onClick={() => handleTypeSelect('ntfy')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium">ntfy.sh</h3>
                    <p className="text-sm text-gray-500">Send push notifications via ntfy.sh</p>
                  </div>
                </button>
              </div>
            </div>
          )}
          
          {step === 2 && selectedType && (
            <div>
              <h3 className="text-lg font-medium mb-4">Configure Integration</h3>
              
              <div className="space-y-6">
                {/* Integration Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Integration Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="My Integration"
                  />
                </div>
                
                {/* Type-specific configuration */}
                {selectedType === 'webhook' && (
                  <WebhookConfigForm 
                    config={formData.config as any}
                    onChange={handleConfigChange}
                    onNestedChange={handleNestedConfigChange}
                  />
                )}
                
                {selectedType === 'homeassistant' && (
                  <HomeAssistantConfigForm 
                    config={formData.config as any}
                    onChange={handleConfigChange}
                  />
                )}
                
                {selectedType === 'ntfy' && (
                  <NtfyConfigForm 
                    config={formData.config as any}
                    onChange={handleConfigChange}
                    onNestedChange={handleNestedConfigChange}
                  />
                )}
                
                {/* Events configuration */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Events to Trigger
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {formData.events.map(event => (
                      <div key={event.eventType} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">
                            {event.eventType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleEvent(event.eventType as EventType)}
                          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                            event.enabled ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`
                            inline-block w-4 h-4 transform rounded-full bg-white transition-transform
                            ${event.enabled ? 'translate-x-6' : 'translate-x-1'}
                          `} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          {step === 1 ? (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Back
            </button>
          )}
          
          {step === 2 && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                  Creating...
                </>
              ) : (
                <>
                  <Save size={16} className="inline-block mr-1" />
                  Save Integration
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// WebhookConfigForm Component
interface WebhookConfigFormProps {
    config: any;
    onChange: (key: string, value: any) => void;
    onNestedChange: (parentKey: string, key: string, value: any) => void;
  }
  
  function WebhookConfigForm({ config, onChange, onNestedChange }: WebhookConfigFormProps) {
    const [headers, setHeaders] = useState<{ key: string; value: string }[]>(() => {
      // Initialize from existing headers
      if (config.headers && typeof config.headers === 'object') {
        return Object.entries(config.headers).map(([key, value]) => ({
          key,
          value: value as string
        }));
      }
      return [{ key: '', value: '' }];
    });
  
    // Update headers in parent component
    useEffect(() => {
      const headerObj: Record<string, string> = {};
      headers.forEach(header => {
        if (header.key && header.value) {
          headerObj[header.key] = header.value;
        }
      });
      onChange('headers', headerObj);
    }, [headers, onChange]);
  
    const addHeader = () => {
      setHeaders(prev => [...prev, { key: '', value: '' }]);
    };
  
    const removeHeader = (index: number) => {
      setHeaders(prev => prev.filter((_, i) => i !== index));
    };
  
    const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
      setHeaders(prev => 
        prev.map((header, i) => 
          i === index ? { ...header, [field]: value } : header
        )
      );
    };
  
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Webhook URL
          </label>
          <input
            type="url"
            value={config.url || ''}
            onChange={(e) => onChange('url', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="https://example.com/webhook"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HTTP Method
          </label>
          <select
            value={config.method || 'POST'}
            onChange={(e) => onChange('method', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Authentication
          </label>
          <select
            value={config.authentication?.type || 'none'}
            onChange={(e) => onNestedChange('authentication', 'type', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="none">None</option>
            <option value="basic">Basic Auth</option>
            <option value="bearer">Bearer Token</option>
          </select>
        </div>
        
        {config.authentication?.type === 'basic' && (
          <div className="pl-4 border-l-2 border-gray-200 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={config.authentication?.username || ''}
                onChange={(e) => onNestedChange('authentication', 'username', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={config.authentication?.password || ''}
                onChange={(e) => onNestedChange('authentication', 'password', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>
        )}
        
        {config.authentication?.type === 'bearer' && (
          <div className="pl-4 border-l-2 border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bearer Token
            </label>
            <input
              type="password"
              value={config.authentication?.token || ''}
              onChange={(e) => onNestedChange('authentication', 'token', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Token"
            />
          </div>
        )}
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Headers
            </label>
            <button 
              type="button"
              onClick={addHeader}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Add Header
            </button>
          </div>
          
          <div className="space-y-2">
            {headers.map((header, index) => (
              <div key={index} className="flex space-x-2">
                <input
                  type="text"
                  value={header.key}
                  onChange={(e) => updateHeader(index, 'key', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Header name"
                />
                <input
                  type="text"
                  value={header.value}
                  onChange={(e) => updateHeader(index, 'value', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Value"
                />
                <button
                  type="button"
                  onClick={() => removeHeader(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // HomeAssistantConfigForm Component
  interface HomeAssistantConfigFormProps {
    config: any;
    onChange: (key: string, value: any) => void;
  }
  
  function HomeAssistantConfigForm({ config, onChange }: HomeAssistantConfigFormProps) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Home Assistant URL
          </label>
          <input
            type="url"
            value={config.baseUrl || ''}
            onChange={(e) => onChange('baseUrl', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="http://homeassistant.local:8123"
          />
          <p className="mt-1 text-xs text-gray-500">
            The URL of your Home Assistant instance, including protocol and port
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Long-Lived Access Token
          </label>
          <input
            type="password"
            value={config.longLivedToken || ''}
            onChange={(e) => onChange('longLivedToken', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Your Long-Lived Access Token"
          />
          <p className="mt-1 text-xs text-gray-500">
            Create this in Home Assistant under your profile &gt; Long-Lived Access Tokens
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entity ID (Optional)
          </label>
          <input
            type="text"
            value={config.entityId || ''}
            onChange={(e) => onChange('entityId', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="sensor.motorcycle_mileage"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional: The entity ID to update when mileage changes
          </p>
        </div>
      </div>
    );
  }
  
  // NtfyConfigForm Component
  interface NtfyConfigFormProps {
    config: any;
    onChange: (key: string, value: any) => void;
    onNestedChange: (parentKey: string, key: string, value: any) => void;
  }
  
  function NtfyConfigForm({ config, onChange, onNestedChange }: NtfyConfigFormProps) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic
          </label>
          <input
            type="text"
            value={config.topic || ''}
            onChange={(e) => onChange('topic', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="your-unique-topic"
          />
          <p className="mt-1 text-xs text-gray-500">
            A unique topic name for your notifications
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ntfy Server URL (Optional)
          </label>
          <input
            type="url"
            value={config.server || 'https://ntfy.sh'}
            onChange={(e) => onChange('server', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="https://ntfy.sh"
          />
          <p className="mt-1 text-xs text-gray-500">
            Default is ntfy.sh. Change if using a self-hosted instance.
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={config.priority || 'default'}
            onChange={(e) => onChange('priority', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="default">Default</option>
            <option value="low">Low</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Authentication
          </label>
          <select
            value={config.authorization?.type || 'none'}
            onChange={(e) => onNestedChange('authorization', 'type', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="none">None</option>
            <option value="basic">Basic Auth</option>
            <option value="token">Access Token</option>
          </select>
        </div>
        
        {config.authorization?.type === 'basic' && (
          <div className="pl-4 border-l-2 border-gray-200 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={config.authorization?.username || ''}
                onChange={(e) => onNestedChange('authorization', 'username', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={config.authorization?.password || ''}
                onChange={(e) => onNestedChange('authorization', 'password', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>
        )}
        
        {config.authorization?.type === 'token' && (
          <div className="pl-4 border-l-2 border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Token
            </label>
            <input
              type="password"
              value={config.authorization?.token || ''}
              onChange={(e) => onNestedChange('authorization', 'token', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Token"
            />
          </div>
        )}
      </div>
    );
  }
  
  // EditIntegrationModal Component
  interface EditIntegrationModalProps {
    integrationId: string;
    onClose: () => void;
    onSave: () => void;
  }
  
  function EditIntegrationModal({ integrationId, onClose, onSave }: EditIntegrationModalProps) {
    const [integration, setIntegration] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
      fetchIntegration();
    }, [integrationId]);
    
    const fetchIntegration = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/user/integrations/${integrationId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch integration');
        }
        
        const data = await response.json();
        setIntegration(data);
      } catch (err) {
        setError('Failed to load integration details');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    const handleSave = async () => {
      try {
        setIsSaving(true);
        setError(null);
        
        const response = await fetch(`/api/user/integrations/${integrationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: integration.name,
            config: integration.config,
            events: integration.events
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update integration');
        }
        
        toast.success('Integration updated successfully');
        onSave();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsSaving(false);
      }
    };
    
    const handleConfigChange = (key: string, value: any) => {
      setIntegration((prev: typeof integration) => ({
        ...prev,
        config: {
          ...prev.config,
          [key]: value
        }
      }));
    };
    
    const handleNestedConfigChange = (parentKey: string, key: string, value: any) => {
      setIntegration((prev: typeof integration) => ({
        ...prev,
        config: {
          ...prev.config,
          [parentKey]: {
            ...(prev.config)[parentKey],
            [key]: value
          }
        }
      }));
    };
    
    const toggleEvent = (eventType: EventType) => {
      setIntegration((prev: typeof integration) => ({
        ...prev,
        events: prev.events.map((event: any) => 
          event.eventType === eventType 
            ? { ...event, enabled: !event.enabled } 
            : event
        )
      }));
    };
    
    if (isLoading) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6">
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      );
    }
    
    if (!integration) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                Integration Not Found
              </h3>
              <p className="text-gray-500 mb-4">
                {error || "The integration could not be found."}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Edit Integration</h2>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Integration Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Integration Name
                </label>
                <input
                  type="text"
                  value={integration.name}
                  onChange={(e) => setIntegration({...integration, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="My Integration"
                />
              </div>
              
              {/* Type-specific configuration */}
              {integration.type === 'webhook' && (
                <WebhookConfigForm 
                  config={integration.config}
                  onChange={handleConfigChange}
                  onNestedChange={handleNestedConfigChange}
                />
              )}
              
              {integration.type === 'homeassistant' && (
                <HomeAssistantConfigForm 
                  config={integration.config}
                  onChange={handleConfigChange}
                />
              )}
              
              {integration.type === 'ntfy' && (
                <NtfyConfigForm 
                  config={integration.config}
                  onChange={handleConfigChange}
                  onNestedChange={handleNestedConfigChange}
                />
              )}
              
              {/* Events configuration */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Events to Trigger
                </label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {integration.events.map((event: any) => (
                    <div key={event.eventType} className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">
                          {event.eventType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleEvent(event.eventType)}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                          event.enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`
                          inline-block w-4 h-4 transform rounded-full bg-white transition-transform
                          ${event.enabled ? 'translate-x-6' : 'translate-x-1'}
                        `} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} className="inline-block mr-1" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }