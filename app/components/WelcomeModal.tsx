// app/components/WelcomeModal.tsx
"use client";

import React, { useState } from 'react';
import { X, Bike, Wrench, Calendar, Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface WelcomeModalProps {
  motorcycleName: string;
  motorcycleId: string;
}

export default function WelcomeModal({ motorcycleName, motorcycleId }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();
  
  const closeModal = () => {
    setIsOpen(false);
    // Clear the welcome query parameter
    const url = new URL(window.location.href);
    url.searchParams.delete('welcome');
    router.replace(url.pathname + url.search);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
          <button 
            onClick={closeModal}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center mb-6">
            <div className="bg-blue-600 rounded-full p-3 mr-4">
              <Bike className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-medium text-gray-900">
              Welcome to Rideway!
            </h3>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Great! You've added <span className="font-medium text-gray-800">{motorcycleName}</span> to your garage. Now let's help you keep track of your maintenance and more.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-4 mt-4 border border-blue-100">
              <h4 className="font-medium text-blue-800 mb-2">Quick Start Guide</h4>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="bg-blue-100 rounded-full p-1 mr-2 mt-0.5">
                    <Check size={14} className="text-blue-600" />
                  </div>
                  <span className="text-sm text-blue-700">
                    Start by adding your regular maintenance tasks
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="bg-blue-100 rounded-full p-1 mr-2 mt-0.5">
                    <Check size={14} className="text-blue-600" />
                  </div>
                  <span className="text-sm text-blue-700">
                    Record your mileage to get timely service reminders
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="bg-blue-100 rounded-full p-1 mr-2 mt-0.5">
                    <Check size={14} className="text-blue-600" />
                  </div>
                  <span className="text-sm text-blue-700">
                    Log maintenance activities to track your motorcycle's history
                  </span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Link
              href={`/maintenance/setup?motorcycle=${motorcycleId}`}
              className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition"
            >
              <Calendar size={16} className="mr-2" />
              Set Up Maintenance Schedule
              <ChevronRight size={16} className="ml-auto" />
            </Link>
            
            <Link
              href={`/maintenance/add?motorcycle=${motorcycleId}`}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 shadow-sm transition"
            >
              <Wrench size={16} className="mr-2" />
              Log Maintenance
              <ChevronRight size={16} className="ml-auto" />
            </Link>
            
            <button
              onClick={closeModal}
              className="mt-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              I'll explore on my own
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}