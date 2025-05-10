// app/components/ServiceRecordCard.tsx
import React from 'react';
import { format, parseISO } from 'date-fns';
import { Wrench, Calendar, DollarSign, MapPin, FileText } from 'lucide-react';
import Link from 'next/link';
import { useSettings } from '../contexts/SettingsContext';

interface ServiceRecordCardProps {
  record: {
    id: string;
    motorcycleId: string;
    motorcycle: string;
    date: string;
    mileage: number | null;
    task: string;
    cost: number | null;
    location: string | null;
    notes: string | null;
  };
  compact?: boolean;
}

const ServiceRecordCard: React.FC<ServiceRecordCardProps> = ({ record, compact = false }) => {
  const { formatDistance, formatCurrency } = useSettings();

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition">
        <div className="flex justify-between">
          <div>
            <h3 className="font-medium">{record.task}</h3>
            <p className="text-sm text-gray-500">{record.motorcycle}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{format(parseISO(record.date), 'MMM d, yyyy')}</p>
            {record.cost !== null && (
              <p className="text-sm text-gray-600">{formatCurrency(record.cost)}</p>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {record.mileage !== null && (
            <div className="bg-gray-100 px-2 py-1 rounded-md">
              {formatDistance(record.mileage)}
            </div>
          )}
          {record.location && (
            <div className="bg-gray-100 px-2 py-1 rounded-md truncate max-w-[150px]">
              {record.location}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{record.task}</h3>
          <p className="text-gray-600">{record.motorcycle}</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center text-gray-700">
            <Calendar size={16} className="mr-1" />
            {format(parseISO(record.date), 'MMMM d, yyyy')}
          </div>
          {record.cost !== null && (
            <div className="flex items-center text-gray-700 mt-1">
              <DollarSign size={16} className="mr-1" />
              {formatCurrency(record.cost)}
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {record.mileage !== null && (
          <div className="flex items-center text-gray-600">
            <Wrench size={18} className="mr-2 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Odometer</p>
              <p>{formatDistance(record.mileage)}</p>
            </div>
          </div>
        )}
        
        {record.location && (
          <div className="flex items-center text-gray-600">
            <MapPin size={18} className="mr-2 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p>{record.location}</p>
            </div>
          </div>
        )}
      </div>
      
      {record.notes && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-start">
            <FileText size={18} className="mr-2 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-gray-700 whitespace-pre-wrap">{record.notes}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t flex justify-end">
        <Link
          href={`/history/${record.id}`}
          className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ServiceRecordCard;