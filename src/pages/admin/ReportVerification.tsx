import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import {
  Loader2,
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
  X,
  CheckCheck,
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
  const [currentPage, setCurrentPage] = useState(1);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const reportsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const reportsSnap = await getDocs(collection(db, "reports"));
      const reportsData = reportsSnap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Report)
      );

      // Sort by latest first
      reportsData.sort(
        (a, b) =>
          b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      );

      setReports(reportsData);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleStatusChange = async (
    reportId: string,
    newStatus: "approved" | "rejected" | "resolved"
  ) => {
    const reportRef = doc(db, "reports", reportId);
    await updateDoc(reportRef, { status: newStatus });
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
    );
    if (selectedReport && selectedReport.id === reportId) {
      setSelectedReport({ ...selectedReport, status: newStatus });
    }
  };

  // Pagination logic
  const indexOfLast = currentPage * reportsPerPage;
  const indexOfFirst = indexOfLast - reportsPerPage;
  const currentReports = reports.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(reports.length / reportsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#0B1F8C]" size={40} />
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Report Verification
          </h1>
          <p className="text-gray-500">
            Review, approve, or reject submitted reports
          </p>
        </div>

        <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
          {currentReports.length > 0 ? (
            currentReports.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className="p-4 flex flex-col sm:flex-row gap-4 items-start hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {r.imageUrl && (
                  <img
                    src={r.imageUrl}
                    alt={r.incidentType}
                    className="w-full sm:w-24 h-40 sm:h-24 object-cover rounded-md"
                  />
                )}

                <div className="flex-1 w-full">
                  <h3 className="font-semibold capitalize text-gray-800">
                    {r.incidentType}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">{r.description}</p>
                  <p className="text-sm text-gray-500 mb-1">
                    Reporter: <strong>{r.reporterInfo.fullName}</strong>
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
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

                <div className="flex sm:flex-col gap-2 items-end w-full sm:w-auto justify-between sm:justify-end">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      r.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : r.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : r.status === "resolved"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {r.status}
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(r.id, "approved");
                      }}
                      className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded flex items-center gap-1"
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(r.id, "rejected");
                      }}
                      className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded flex items-center gap-1"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(r.id, "resolved");
                      }}
                      className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded flex items-center gap-1"
                    >
                      <CheckCheck size={14} /> Resolved
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              No reports found.
            </div>
          )}
        </div>

        {/* Pagination */}
        {reports.length > reportsPerPage && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* might add another modal for update confirmation */}

      {/* Details Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2"
          onClick={() => setSelectedReport(null)} // close on background click
        >
          <div
            className="relative bg-white rounded-xl shadow-lg max-w-3xl w-full p-6 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside modal
          >
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>

            <h2 className="text-lg font-bold mb-2 capitalize">
              {selectedReport.incidentType}
            </h2>

            {selectedReport.imageUrl && (
              <div
                className="relative group cursor-pointer mb-3 overflow-hidden"
                onClick={() => setFullscreenImage(selectedReport.imageUrl!)}
              >
                <img
                  src={selectedReport.imageUrl}
                  alt="Incident"
                  className="w-full h-48 object-cover rounded transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition duration-300 rounded" />
                <span className="absolute bottom-2 right-3 text-white text-xs opacity-0 group-hover:opacity-100 transition">
                  Click to view fullscreen
                </span>
              </div>
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
            <p className="text-xs text-gray-400 mb-4">
              Submitted{" "}
              {formatDistanceToNow(selectedReport.createdAt.toDate(), {
                addSuffix: true,
              })}
            </p>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <button
                onClick={() =>
                  handleStatusChange(selectedReport.id, "approved")
                }
                className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded flex items-center gap-1"
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button
                onClick={() =>
                  handleStatusChange(selectedReport.id, "rejected")
                }
                className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded flex items-center gap-1"
              >
                <XCircle size={16} /> Reject
              </button>
              <button
                onClick={() =>
                  handleStatusChange(selectedReport.id, "resolved")
                }
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded flex items-center gap-1"
              >
                <CheckCheck size={16} /> Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen img */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]"
          onClick={() => setFullscreenImage(null)}
        >
          <img
            src={fullscreenImage}
            alt="Fullscreen view"
            className="max-w-[95%] max-h-[90%] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
