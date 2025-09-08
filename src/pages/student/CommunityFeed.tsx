import React, { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  List,
  Map as MapIcon,
  Droplet,
  Car,
  Flame,
  ThumbsUp,
  Flag,
  Users,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { auth, db, storage } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  increment,
  GeoPoint,
  Timestamp,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface StudentData {
  address: {
    barangay: string;
    city: string;
    province: string;
  };
}

interface IncidentReport {
  id: string;
  incidentType: string;
  description: string;
  location: GeoPoint;
  reporterId: string;
  reporterInfo: {
    fullName: string;
    address?: {
      barangay?: string;
      city?: string;
      province?: string;
    };
  };
  status: "pending" | "verified" | "disputed" | "resolved";
  createdAt: Timestamp;
  imageUrl?: string;
  verifications: string[];
  disputers?: string[];
  disputes?: number;
  resolvers?: string[];
  specificLocation?: {
    province: string;
    city: string;
    barangay: string;
    street?: string;
    landmark?: string;
    psgc: {
      provinceCode: string;
      cityCode: string;
      barangayCode: string;
    };
  };
}

const VERIFICATION_THRESHOLD = 1;
const DISPUTE_THRESHOLD = 1;
const RESOLVED_THRESHOLD = 1;

const createCustomMarker = (
  incidentType: string,
  imageUrl?: string,
  status?: string
) => {
  const colorMap: { [key: string]: string } = {
    flood: "#3B82F6",
    accident: "#EF4444",
    fire: "#F97316",
    crime: "#6B7280",
    medical: "#EC4899",
    infrastructure: "#EAB308",
    other: "#8B5CF6",
  };
  const color = colorMap[incidentType.toLowerCase()] || colorMap.other;
  let ringColor = "#D1D5DB";
  if (status === "verified") ringColor = "#10B981";
  else if (status === "disputed") ringColor = "#EF4444";
  else if (status === "pending") ringColor = "#F59E0B";
  else if (status === "resolved") ringColor = "#6B7280";

  const svgIcon = `
    <div style="position: relative; width: 60px; height: 60px; ${
      status === "resolved" ? "filter: grayscale(80%);" : ""
    }">
      <div style="position: absolute; top: 0; left: 0; width: 60px; height: 60px; border-radius: 50%; border: 3px solid ${ringColor}; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.3);"></div>
      <div style="position: absolute; top: 6px; left: 6px; width: 48px; height: 48px; border-radius: 50%; overflow: hidden; background: ${color}; display: flex; align-items: center; justify-content: center;">
        ${
          imageUrl
            ? `<img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><div style="display: none; color: white; font-size: 18px; font-weight: bold;">${getIconSymbol(
                incidentType
              )}</div>`
            : `<div style="color: white; font-size: 18px; font-weight: bold;">${getIconSymbol(
                incidentType
              )}</div>`
        }
      </div>
      <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid ${ringColor};"></div>
    </div>`;

  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [60, 68],
    iconAnchor: [30, 68],
    popupAnchor: [0, -68],
  });
};

const getIconSymbol = (type: string): string => {
  switch (type.toLowerCase()) {
    case "flood":
      return "🌊";
    case "accident":
      return "🚗";
    case "fire":
      return "🔥";
    case "crime":
      return "⚠️";
    case "medical":
      return "👥";
    case "infrastructure":
      return "🏗️";
    default:
      return "❗";
  }
};

const getLocationString = (incident: IncidentReport): string => {
  if (incident.specificLocation) {
    const parts = [
      incident.specificLocation.barangay,
      incident.specificLocation.city,
      incident.specificLocation.province,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }
  const reporterAddress = incident.reporterInfo.address;
  if (reporterAddress) {
    const parts = [
      reporterAddress.barangay,
      reporterAddress.city,
      reporterAddress.province,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }
  return "Location not specified";
};

const getDetailedLocationString = (incident: IncidentReport): string => {
  const baseLocation = getLocationString(incident);
  if (incident.specificLocation) {
    const additionalDetails = [];
    if (incident.specificLocation.street) {
      additionalDetails.push(incident.specificLocation.street);
    }
    if (incident.specificLocation.landmark) {
      additionalDetails.push(`near ${incident.specificLocation.landmark}`);
    }
    if (additionalDetails.length > 0) {
      return `${additionalDetails.join(", ")}, ${baseLocation}`;
    }
  }
  return baseLocation;
};

export function CommunityFeed() {
  const [user, authLoading] = useAuthState(auth);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loadingStudentData, setLoadingStudentData] = useState(true);

  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  const [viewMode, setViewMode] = useState("list");
  const [filter, setFilter] = useState("all");

  const [verificationModal, setVerificationModal] =
    useState<IncidentReport | null>(null);
  const [disputeModal, setDisputeModal] = useState<IncidentReport | null>(null);
  const [resolveModal, setResolveModal] = useState<IncidentReport | null>(null);
  const [deleteModalData, setDeleteModalData] = useState<IncidentReport | null>(
    null
  );

  useEffect(() => {
    if (!user) {
      setLoadingStudentData(false);
      return;
    }
    setLoadingStudentData(true);
    const userDocRef = doc(db, "students", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setStudentData(docSnap.data() as StudentData);
      } else {
        setStudentData(null);
      }
      setLoadingStudentData(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    setLoadingIncidents(true);
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedIncidents: IncidentReport[] = [];
        querySnapshot.forEach((doc) => {
          fetchedIncidents.push({
            id: doc.id,
            ...doc.data(),
          } as IncidentReport);
        });
        setIncidents(fetchedIncidents);
        setLoadingIncidents(false);
      },
      (error) => {
        console.error("Error fetching incidents: ", error);
        setLoadingIncidents(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const getIncidentIcon = (type: string, size: number = 20) => {
    switch (type.toLowerCase()) {
      case "flood":
        return <Droplet size={size} className="text-blue-500" />;
      case "accident":
        return <Car size={size} className="text-red-500" />;
      case "fire":
        return <Flame size={size} className="text-orange-500" />;
      case "crime":
        return <AlertTriangle size={size} className="text-gray-700" />;
      case "medical":
        return <Users size={size} className="text-pink-500" />;
      case "infrastructure":
        return <AlertCircle size={size} className="text-yellow-600" />;
      default:
        return <AlertCircle size={size} className="text-purple-500" />;
    }
  };

  const getStatusBadge = (incident: IncidentReport) => {
    const verificationCount = incident.verifications.length;
    switch (incident.status) {
      case "verified":
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800">
            <CheckCircle size={12} />
            <span className="text-xs font-medium">Verified</span>
            {verificationCount > 0 && (
              <span className="text-xs">({verificationCount})</span>
            )}
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
            <Clock size={12} />
            <span className="text-xs font-medium">Pending</span>
            {verificationCount > 0 && (
              <span className="text-xs">({verificationCount})</span>
            )}
          </div>
        );
      case "disputed":
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800">
            <AlertTriangle size={12} />
            <span className="text-xs font-medium">Disputed</span>
          </div>
        );
      case "resolved":
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-800">
            <CheckCircle size={12} />
            <span className="text-xs font-medium">Resolved</span>
          </div>
        );
      default:
        return null;
    }
  };

  const handleVerify = async (incident: IncidentReport) => {
    if (!user) return;
    setVerificationModal(null);
    const reportRef = doc(db, "reports", incident.id);
    const updateData: any = { verifications: arrayUnion(user.uid) };
    if (incident.verifications.length + 1 >= VERIFICATION_THRESHOLD) {
      updateData.status = "verified";
    }
    await updateDoc(reportRef, updateData).catch((error) =>
      console.error("Error verifying report: ", error)
    );
  };

  const handleDispute = async (incident: IncidentReport) => {
    if (!user) return;
    setDisputeModal(null);
    const reportRef = doc(db, "reports", incident.id);
    const currentDisputes = incident.disputes || 0;
    const updateData: any = {
      disputers: arrayUnion(user.uid),
      disputes: increment(1),
    };
    if (currentDisputes + 1 >= DISPUTE_THRESHOLD) {
      updateData.status = "disputed";
    }
    await updateDoc(reportRef, updateData).catch((error) =>
      console.error("Error disputing report: ", error)
    );
  };

  const handleResolve = async (incident: IncidentReport) => {
    if (!user) return;
    setResolveModal(null);
    const reportRef = doc(db, "reports", incident.id);
    const updateData: any = { resolvers: arrayUnion(user.uid) };
    const currentResolversCount = incident.resolvers?.length || 0;
    if (currentResolversCount + 1 >= RESOLVED_THRESHOLD) {
      updateData.status = "resolved";
    }
    await updateDoc(reportRef, updateData).catch((error) =>
      console.error("Error resolving report: ", error)
    );
  };

  const handleDelete = async (incident: IncidentReport) => {
    if (!user) return;
    if (incident.imageUrl) {
      const imageRef = ref(storage, incident.imageUrl);
      try {
        await deleteObject(imageRef);
      } catch (error) {
        console.error("Error deleting image from storage: ", error);
      }
    }
    try {
      await deleteDoc(doc(db, "reports", incident.id));
      setDeleteModalData(null);
    } catch (error) {
      console.error("Error deleting report document: ", error);
      alert("Failed to delete report.");
    }
  };

  const filteredIncidents = useMemo(
    () =>
      incidents.filter(
        (incident) =>
          filter === "all" || incident.incidentType.toLowerCase() === filter
      ),
    [incidents, filter]
  );

  const sortedIncidents = useMemo(
    () =>
      [...filteredIncidents].sort((a, b) => {
        const statusOrder = {
          pending: 1,
          verified: 2,
          disputed: 3,
          resolved: 4,
        };
        return (
          statusOrder[a.status] - statusOrder[b.status] ||
          b.createdAt.toMillis() - a.createdAt.toMillis()
        );
      }),
    [filteredIncidents]
  );

  if (authLoading || loadingStudentData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-[#0B1F8C]" size={48} />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Community Feed</h1>
        <p className="text-gray-500">View reported incidents around Bocaue</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2">
          {[
            "all",
            "flood",
            "accident",
            "fire",
            "crime",
            "medical",
            "infrastructure",
            "other",
          ].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap capitalize ${
                filter === f
                  ? "bg-[#0B1F8C] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-1 flex-shrink-0">
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1 px-3 py-1 rounded-md ${
              viewMode === "map"
                ? "bg-white shadow text-[#0B1F8C]"
                : "text-gray-700"
            }`}
          >
            <MapIcon size={16} />{" "}
            <span className="text-sm font-medium">Map</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1 px-3 py-1 rounded-md ${
              viewMode === "list"
                ? "bg-white shadow text-[#0B1F8C]"
                : "text-gray-700"
            }`}
          >
            <List size={16} /> <span className="text-sm font-medium">List</span>
          </button>
        </div>
      </div>

      {loadingIncidents ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-[#0B1F8C]" size={32} />
        </div>
      ) : sortedIncidents.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No incidents found for the selected filter.
          </p>
        </div>
      ) : (
        <>
          {viewMode === "map" && (
            <div className="bg-white rounded-xl shadow overflow-hidden h-96 md:h-[500px]">
              <MapContainer
                center={[14.7915, 120.9425]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {sortedIncidents.map((incident) => (
                  <Marker
                    key={incident.id}
                    position={[
                      incident.location.latitude,
                      incident.location.longitude,
                    ]}
                    icon={createCustomMarker(
                      incident.incidentType,
                      incident.imageUrl,
                      incident.status
                    )}
                  >
                    <Popup maxWidth={300} className="custom-popup">
                      <div className="p-2">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            {getIncidentIcon(incident.incidentType, 16)}
                            <h3 className="font-semibold capitalize text-gray-800">
                              {incident.incidentType}
                            </h3>
                          </div>
                          {getStatusBadge(incident)}
                        </div>
                        {incident.imageUrl && (
                          <div className="mb-3">
                            <img
                              src={incident.imageUrl}
                              alt={incident.incidentType}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        <p className="text-sm text-gray-700 mb-2 line-clamp-3">
                          {incident.description}
                        </p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex items-center gap-1">
                            <MapPin size={12} />
                            <span className="line-clamp-2">
                              {getDetailedLocationString(incident)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>
                              {formatDistanceToNow(
                                incident.createdAt.toDate(),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                          Reported by:{" "}
                          <span className="font-medium">
                            {incident.reporterInfo.fullName}
                          </span>
                        </div>
                        {incident.verifications.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            {incident.verifications.length} verification
                            {incident.verifications.length !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {viewMode === "list" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedIncidents.map((incident) => {
                const hasVerified =
                  user && incident.verifications.includes(user.uid);
                const hasDisputed =
                  user && incident.disputers?.includes(user.uid);
                const hasResolved =
                  user && incident.resolvers?.includes(user.uid);
                const isReporter = user && incident.reporterId === user.uid;
                const canInteract =
                  studentData?.address?.barangay ===
                  incident.specificLocation?.barangay;

                return (
                  <div
                    key={incident.id}
                    className={`bg-white rounded-xl shadow overflow-hidden transition-all ${
                      incident.status === "verified"
                        ? "ring-2 ring-green-500"
                        : ""
                    } ${
                      incident.status === "resolved"
                        ? "opacity-60 hover:opacity-100"
                        : ""
                    }`}
                  >
                    {incident.imageUrl && (
                      <img
                        src={incident.imageUrl}
                        alt={incident.incidentType}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-full bg-gray-100">
                            {getIncidentIcon(incident.incidentType)}
                          </div>
                          <h3 className="font-medium text-gray-800 capitalize">
                            {incident.incidentType}
                          </h3>
                        </div>
                        {getStatusBadge(incident)}
                      </div>
                      <p className="text-sm text-gray-700 mt-2">
                        {incident.description}
                      </p>
                      <div className="mt-3 text-sm text-gray-500 flex items-start gap-1">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">
                          {getDetailedLocationString(incident)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        <span>
                          {formatDistanceToNow(incident.createdAt.toDate(), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center text-xs text-gray-500">
                        <span>
                          Reported by: {incident.reporterInfo.fullName}
                        </span>
                      </div>
                      <div className="mt-4">
                        {user &&
                          (isReporter ? (
                            <button
                              onClick={() => setDeleteModalData(incident)}
                              className="w-full bg-red-100 text-red-800 py-2 rounded-lg hover:bg-red-200 transition flex items-center justify-center gap-1"
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          ) : canInteract ? (
                            <>
                              {incident.status === "pending" &&
                                (() => {
                                  if (hasVerified)
                                    return (
                                      <div className="p-2 bg-green-50 rounded-lg text-sm text-center text-green-700">
                                        You've verified this report.
                                      </div>
                                    );
                                  if (hasDisputed)
                                    return (
                                      <div className="p-2 bg-red-50 rounded-lg text-sm text-center text-red-700">
                                        You've disputed this report.
                                      </div>
                                    );
                                  return (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          setVerificationModal(incident)
                                        }
                                        className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-1"
                                      >
                                        <ThumbsUp size={16} />
                                        <span>Verify</span>
                                      </button>
                                      <button
                                        onClick={() =>
                                          setDisputeModal(incident)
                                        }
                                        className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-1"
                                      >
                                        <Flag size={16} />
                                        <span>Dispute</span>
                                      </button>
                                    </div>
                                  );
                                })()}
                              {incident.status === "verified" &&
                                (() => {
                                  if (hasResolved)
                                    return (
                                      <div className="p-2 bg-blue-50 rounded-lg text-sm text-center text-blue-700">
                                        You've marked this as resolved.
                                      </div>
                                    );
                                  return (
                                    <button
                                      onClick={() => setResolveModal(incident)}
                                      className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-1"
                                    >
                                      <CheckCircle size={16} />
                                      <span>Mark as Resolved</span>
                                    </button>
                                  );
                                })()}
                            </>
                          ) : null)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {verificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Verify Report
            </h3>
            <p className="text-gray-600 mb-4">
              Are you confirming that this{" "}
              <span className="font-medium">
                {verificationModal.incidentType.toLowerCase()}
              </span>{" "}
              incident is accurate?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Your verification helps keep the community informed and safe.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleVerify(verificationModal)}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
              >
                Confirm Verification
              </button>
              <button
                onClick={() => setVerificationModal(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {disputeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Dispute Report
            </h3>
            <p className="text-gray-600 mb-4">
              Are you indicating that this{" "}
              <span className="font-medium">
                {disputeModal.incidentType.toLowerCase()}
              </span>{" "}
              incident is inaccurate or false?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Disputed reports will be flagged for administrator review.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDispute(disputeModal)}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
              >
                Confirm Dispute
              </button>
              <button
                onClick={() => setDisputeModal(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {resolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Mark as Resolved
            </h3>
            <p className="text-gray-600 mb-4">
              Are you confirming that this{" "}
              <span className="font-medium">
                {resolveModal.incidentType.toLowerCase()}
              </span>{" "}
              incident has been resolved?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This helps clear the feed of outdated reports.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleResolve(resolveModal)}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
              >
                Confirm Resolved
              </button>
              <button
                onClick={() => setResolveModal(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Delete Report
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete this report? This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteModalData)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setDeleteModalData(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-marker { background: transparent !important; border: none !important; }
        .custom-popup .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15); }
        .custom-popup .leaflet-popup-content { margin: 0; line-height: 1.4; }
        .custom-popup .leaflet-popup-tip { background: white; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}
