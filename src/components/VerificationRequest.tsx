import React from 'react';
import { CheckCircle, XCircle, MapPin, Clock } from 'lucide-react';
export function VerificationRequest({
  report,
  onVerify,
  onReject
}) {
  return <div className="bg-white rounded-xl shadow mb-4 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-800">Verification Request</h3>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Needs Verification
          </span>
        </div>
        <div className="mb-3">
          <p className="text-sm text-gray-700">{report.description}</p>
        </div>
        <div className="flex items-center text-xs text-gray-500 mb-2">
          <MapPin size={12} className="mr-1" />
          <span>{report.location}</span>
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <Clock size={12} className="mr-1" />
          <span>{report.time}</span>
        </div>
        <div className="mt-4 text-sm">
          <p className="text-gray-500">
            This incident was reported by someone in your address. Can you
            verify if this is accurate?
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => onVerify(report.id)} className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-1">
            <CheckCircle size={16} />
            <span>Verify</span>
          </button>
          <button onClick={() => onReject(report.id)} className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-1">
            <XCircle size={16} />
            <span>Reject</span>
          </button>
        </div>
      </div>
    </div>;
}