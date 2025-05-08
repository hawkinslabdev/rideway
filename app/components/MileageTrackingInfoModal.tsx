// app/components/MileageTrackingInfoModal.tsx
"use client";

import React from 'react';
import { X, Info, AlertTriangle, Check } from 'lucide-react';

interface MileageTrackingInfoModalProps {
  onClose: () => void;
}

export default function MileageTrackingInfoModal({ onClose }: MileageTrackingInfoModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <Info size={24} className="text-blue-600 mr-2" />
            Mileage Tracking Methods
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-6">
          <p className="text-gray-700">
            RideWay offers two different ways to track maintenance based on mileage:
          </p>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-lg mb-2 text-blue-800">From Current Mileage</h3>
            <p className="text-blue-700 mb-3">
              This method counts forward from your current odometer reading, 
              regardless of where you are in a maintenance cycle.
            </p>
            
            <div className="flex gap-6 text-sm">
              <div className="flex-1">
                <div className="font-medium mb-1 text-blue-800">How it works:</div>
                <ul className="list-disc pl-5 text-blue-700 space-y-1">
                  <li>If current mileage is 5,000 and interval is 3,000 miles, next service is due at 8,000 miles</li>
                  <li>When you update your mileage, service remains due at 8,000 miles</li>
                  <li>After completing maintenance, next service will be scheduled 3,000 miles from completion mileage</li>
                </ul>
              </div>
              <div className="flex-1">
                <div className="font-medium mb-1 text-blue-800">Best for:</div>
                <ul className="list-disc pl-5 text-blue-700 space-y-1">
                  <li>Regular ongoing maintenance</li>
                  <li>Items that should be serviced based on use, not fixed schedules</li>
                  <li>Riders who track mileage closely</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-3 text-sm text-blue-700">
              <span className="font-medium text-blue-800">Example:</span> Oil changes after every 3,000 miles of riding
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-medium text-lg mb-2 text-amber-800">From Fixed Intervals (Zero-Based)</h3>
            <p className="text-amber-700 mb-3">
              This method aligns maintenance to fixed milestones regardless of your current mileage, following manufacturer service schedules.
            </p>
            
            <div className="flex gap-6 text-sm">
              <div className="flex-1">
                <div className="font-medium mb-1 text-amber-800">How it works:</div>
                <ul className="list-disc pl-5 text-amber-700 space-y-1">
                  <li>Services are scheduled at fixed milestones (e.g., 6,000, 12,000, 18,000 miles)</li>
                  <li>If your current mileage is 4,500 and interval is 6,000 miles, next service is due at 6,000 miles</li>
                  <li>If your mileage is 7,200, next service would be due at 12,000 miles</li>
                </ul>
              </div>
              <div className="flex-1">
                <div className="font-medium mb-1 text-amber-800">Best for:</div>
                <ul className="list-disc pl-5 text-amber-700 space-y-1">
                  <li>Factory-recommended maintenance schedules</li>
                  <li>Major service intervals (valve adjustments, etc.)</li>
                  <li>Following manufacturer warranty requirements</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-3 text-sm text-amber-700">
              <span className="font-medium text-amber-800">Example:</span> Valve clearance checks every 12,000 miles as specified in owner's manual
            </div>
          </div>
          
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Important Note</h4>
                <p className="text-sm text-gray-700">
                  When you update your motorcycle's mileage, RideWay will automatically adjust your 
                  maintenance tracking. Fixed interval tasks will snap to their next milestone, while 
                  current-based tasks will maintain their originally scheduled value.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 inline-flex items-center bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Check size={16} className="mr-2" />
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}