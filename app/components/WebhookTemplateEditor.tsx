// File: app/components/WebhookTemplateEditor.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { Info, Code, Copy, Check, RefreshCw, ChevronRight } from 'lucide-react';
import { EventType } from '../lib/types/integrations';

interface WebhookTemplateEditorProps {
  eventType: string;
  initialTemplate?: string;
  onChange: (template: string) => void;
}

export default function WebhookTemplateEditor({ eventType, initialTemplate, onChange }: WebhookTemplateEditorProps) {
  // Initialize the template with the initial value or a default empty string
  const [template, setTemplate] = useState(initialTemplate || '');
  const [schema, setSchema] = useState<any | null>(null);
  const [examplePayload, setExamplePayload] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Fetch schema and example payload
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/user/integrations/event-schemas?type=${eventType}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch schema (Status: ${response.status})`);
        }
        
        const data = await response.json();
        
        // Check if the response has the expected structure
        if (!data.schema) {
          console.warn('Schema data is missing expected structure:', data);
          throw new Error('The server returned an invalid schema format');
        }
        
        setSchema(data.schema);
        setExamplePayload(data.examplePayload);
        
        // If no initial template, generate a default one
        if (!initialTemplate || initialTemplate.trim() === '') {
          const defaultTemplate = JSON.stringify(data.examplePayload, null, 2);
          setTemplate(defaultTemplate);
          onChange(defaultTemplate);
        }
      } catch (err) {
        console.error('Error loading schema:', err);
        setError(`Failed to load field schema: ${err instanceof Error ? err.message : 'Unknown error'}`);
        
        // Set a basic fallback schema
        setSchema({
          description: "Event data structure (schema unavailable)",
          fields: [
            {
              path: "event",
              type: "string",
              description: "The type of event",
              example: eventType
            },
            {
              path: "timestamp",
              type: "string",
              description: "When the event was triggered",
              example: new Date().toISOString()
            }
          ]
        });
        
        // Set a basic fallback payload
        setExamplePayload({ 
          event: eventType, 
          timestamp: new Date().toISOString()
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSchema();
  }, [eventType, initialTemplate, onChange]);
  
  // Handle template changes with improved handler
  const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTemplate = e.target.value;
    setTemplate(newTemplate);
    
    // Debounce the onChange callback to prevent excessive updates
    // Clear any existing timeout
    if ((handleTemplateChange as any).timeoutId) {
      clearTimeout((handleTemplateChange as any).timeoutId);
    }
    
    // Set new timeout
    (handleTemplateChange as any).timeoutId = setTimeout(() => {
      onChange(newTemplate);
    }, 300);
  };
  
  // Copy field path to clipboard
  const copyFieldPath = (path: string) => {
    navigator.clipboard.writeText(`{{${path}}}`);
    setCopied(path);
    setTimeout(() => setCopied(null), 2000);
  };
  
  // Parse the template to preview the final payload
  const previewPayload = () => {
    try {
      let processedTemplate = template;
      
      // Find all {{variable}} patterns
      const variablePattern = /\{\{([^}]+)\}\}/g;
      let match;
      
      while ((match = variablePattern.exec(template)) !== null) {
        const fullMatch = match[0];
        const variablePath = match[1].trim();
        
        // Navigate the example payload object using the path
        const pathParts = variablePath.split('.');
        let value = { ...examplePayload };
        
        for (const part of pathParts) {
          if (value === undefined || value === null) break;
          value = value[part];
        }
        
        // Replace the variable with its value
        if (value !== undefined && value !== null) {
          processedTemplate = processedTemplate.replace(
            fullMatch,
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          );
        } else {
          // If value not found, replace with a placeholder
          processedTemplate = processedTemplate.replace(fullMatch, "[Not Found]");
        }
      }
      
      // Try to parse as JSON for pretty display
      try {
        return JSON.stringify(JSON.parse(processedTemplate), null, 2);
      } catch (e) {
        return processedTemplate;
      }
    } catch (error) {
      return `Error previewing template: ${error instanceof Error ? error.message : String(error)}`;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <RefreshCw className="h-5 w-5 animate-spin text-blue-500 mr-2" />
        <span>Loading template editor...</span>
      </div>
    );
  }
  
  if (error || !schema) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        <p>{error || 'Failed to load template editor'}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-md">
        <div className="flex items-start space-x-2">
          <Info className="h-5 w-5 mt-0.5 text-blue-500 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p>Use this editor to customize the webhook payload. Available fields can be added using <code className="bg-gray-200 px-1 py-0.5 rounded">{'{{field.path}}'}</code> syntax.</p>
            <p className="mt-1">Click on a field in the list to copy its path to the template.</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setPreviewMode(!previewMode)}
          className="text-sm flex items-center text-blue-600 hover:text-blue-800"
        >
          {previewMode ? 'Edit Template' : 'Preview Result'}
          <ChevronRight size={16} className="ml-1" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Field list */}
        <div className="md:col-span-1 border rounded-md p-3 bg-white">
          <h3 className="font-medium text-sm mb-2 flex items-center">
            <Code className="h-4 w-4 mr-1 text-gray-500" />
            Available Fields
          </h3>
          
          <div className="text-xs text-gray-500 mb-2">{schema.description}</div>
          
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {schema.fields.map((field: any) => (
              <button
                key={field.path}
                onClick={() => copyFieldPath(field.path)}
                className="w-full text-left p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center justify-between">
                  <code className="text-blue-600 font-mono text-sm">
                    {field.path}
                  </code>
                  <span className="text-xs text-gray-500">{field.type}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{field.description}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Example: <span className="font-mono">{typeof field.example === 'object' 
                    ? JSON.stringify(field.example) 
                    : String(field.example)}</span>
                </p>
                {copied === field.path && (
                  <span className="text-xs text-green-600 flex items-center mt-1">
                    <Check className="h-3 w-3 mr-1" />
                    Copied to template
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p className="font-medium">Example usage:</p>
              <p className="mt-1 font-mono">{'{"motorcycle": {{motorcycle}}}'}</p>
              <p className="mt-1 font-mono">{'{"mileage": {{newMileage}}}'}</p>
            </div>
          </div>
        </div>
        
        {/* Template editor or preview */}
        <div className="md:col-span-2 border rounded-md p-3 bg-white">
          <h3 className="font-medium text-sm mb-2">
            {previewMode ? 'Preview Result' : 'Template Editor'}
          </h3>
          
          {previewMode ? (
            <div className="h-72 p-3 font-mono text-sm border border-gray-300 rounded-md bg-gray-50 overflow-auto whitespace-pre">
              {previewPayload()}
            </div>
          ) : (
            <textarea
              value={template}
              onChange={handleTemplateChange}
              className="w-full h-72 p-3 font-mono text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter your template here..."
            />
          )}
          
          <div className="mt-2 text-xs text-gray-500">
            {previewMode 
              ? 'This is how your webhook payload will look when variables are replaced with actual values.'
              : 'Use JSON format for structured payloads. Variables will be replaced with actual values when the webhook is triggered.'}
          </div>
        </div>
      </div>
    </div>
  );
}