import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Report {
  id: string;
  incidentType: string;
  description: string;
  status: "pending" | "approved" | "rejected" | "resolved" | "disputed";
  createdAt: any;
  reporterInfo: {
    fullName: string;
    address: { barangay: string; city: string; province?: string };
  };
  imageUrl?: string;
  location?: { latitude: number; longitude: number };
}

export function ReportVerification() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const reportsSnap = await getDocs(collection(db, "reports"));
      const reportsData = reportsSnap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Report)
      );
      setReports(reportsData);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleStatusChange = async (reportId: string, newStatus: "approved" | "rejected") => {
    const reportRef = doc(db, "reports", reportId);
    await updateDoc(reportRef, { status: newStatus });
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#0B1F8C]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Report Verification</h1>
        <p className="text-gray-500">Review, approve, or reject submitted reports</p>
        <p className="text-red-500">Don't use the approve/reject button, I'll clarify this later | will also fix responsiveness later</p>
      </div>

      <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
        {reports.length > 0 ? (
          reports.map((r) => (
            <div key={r.id} className="p-4 flex gap-4 items-start">
              {r.imageUrl && (
                <img
                  src={r.imageUrl}
                  alt={r.incidentType}
                  className="w-24 h-24 object-cover rounded-md"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold capitalize text-gray-800">
                  {r.incidentType}
                </h3>
                <p className="text-sm text-gray-600 mb-1">{r.description}</p>
                <p className="text-sm text-gray-500 mb-1">
                  Reporter: <strong>{r.reporterInfo.fullName}</strong>
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={12} />
                  <span>
                    {[
                      r.reporterInfo.address.barangay,
                      r.reporterInfo.address.city,
                      r.reporterInfo.address.province,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <Clock size={12} />
                  <span>
                    {formatDistanceToNow(r.createdAt.toDate(), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 items-end">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    r.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : r.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {r.status}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedReport(r)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
                  >
                    <Eye size={14} /> View
                  </button>
                  <button
                    onClick={() => handleStatusChange(r.id, "approved")}
                    className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded flex items-center gap-1"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(r.id, "rejected")}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded flex items-center gap-1"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-gray-500">No reports found.</div>
        )}
      </div>

      {/* Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg relative">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold mb-2">
              {selectedReport.incidentType}
            </h2>
            {selectedReport.imageUrl && (
              <img
                src={selectedReport.imageUrl}
                alt="Incident"
                className="w-full h-48 object-cover rounded mb-3"
              />
            )}
            <p className="text-gray-700 mb-2">{selectedReport.description}</p>
            <p className="text-sm text-gray-500 mb-1">
              Reporter: <strong>{selectedReport.reporterInfo.fullName}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-1">
              Address:{" "}
              {[
                selectedReport.reporterInfo.address.barangay,
                selectedReport.reporterInfo.address.city,
                selectedReport.reporterInfo.address.province,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p className="text-xs text-gray-400">
              Submitted{" "}
              {formatDistanceToNow(selectedReport.createdAt.toDate(), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
