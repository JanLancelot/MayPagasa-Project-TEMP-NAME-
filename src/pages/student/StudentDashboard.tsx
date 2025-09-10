import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Droplet,
  Car,
  Flame,
  AlertCircle,
  MapPin,
  Clock,
  CheckCircle,
  Loader2,
  User,
  XCircle,
  Archive,
} from "lucide-react";
import { VerificationRequest } from "../../components/VerificationRequest";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
  GeoPoint,
} from "firebase/firestore";

import { formatDistanceToNow } from "date-fns";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

interface StudentData {
  fullName: string;
  address: {
    barangay: string;
    city: string;
    province: string;
    street: string;
  };
}

interface Report {
  id: string;
  incidentType: string;
  description: string;
  location: GeoPoint;
  reporterId: string;
  reporterInfo: {
    fullName: string;
    address: {
      barangay: string;
      city: string;
      province?: string;
    };
  };
  status: "pending" | "verified" | "resolved" | "disputed";
  createdAt: Timestamp;
  imageUrl?: string;
  verifications: string[];
  specificLocation?: {
    region: string;
    province: string;
    city: string;
    barangay: string;
    street?: string;
  };
}

const StatusBadge = ({ status }: { status: Report["status"] }) => {
  const statusConfig = {
    verified: {
      text: "Verified",
      icon: <CheckCircle size={12} />,
      className: "bg-green-100 text-green-800",
    },
    pending: {
      text: "Pending",
      icon: <Clock size={12} />,
      className: "bg-yellow-100 text-yellow-800",
    },
    disputed: {
      text: "Disputed",
      icon: <XCircle size={12} />,
      className: "bg-red-100 text-red-800",
    },
    resolved: {
      text: "Resolved",
      icon: <Archive size={12} />,
      className: "bg-gray-100 text-gray-800",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${config.className}`}
    >
      {config.icon}
      <span>{config.text}</span>
    </span>
  );
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

export const createCustomMarker = (
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
    <div style="position: relative; width: 48px; height: 48px;">
      <div style="position: absolute; top: 0; left: 0; width: 48px; height: 48px; border-radius: 50%; border: 3px solid ${ringColor}; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.3);"></div>
      <div style="position: absolute; top: 5px; left: 5px; width: 38px; height: 38px; border-radius: 50%; overflow: hidden; background: ${color}; display: flex; align-items: center; justify-content: center;">
        ${
          imageUrl
            ? `<img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><div style="display: none; color: white; font-size: 16px; font-weight: bold;">${getIconSymbol(
                incidentType
              )}</div>`
            : `<div style="color: white; font-size: 16px; font-weight: bold;">${getIconSymbol(
                incidentType
              )}</div>`
        }
      </div>
      <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid ${ringColor};"></div>
    </div>`;

  return L.divIcon({
    html: svgIcon,
    className: "custom-marker-dashboard",
    iconSize: [48, 56],
    iconAnchor: [24, 56],
    popupAnchor: [0, -56],
  });
};

interface ChangeViewProps {
  center: [number, number];
  zoom: number;
}

function ChangeView({ center, zoom }: ChangeViewProps) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export function StudentDashboard() {
  const [user, authLoading] = useAuthState(auth);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [verificationRequests, setVerificationRequests] = useState<Report[]>(
    []
  );
  const [recentIncidents, setRecentIncidents] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const [mapCenter, setMapCenter] = useState<[number, number]>([
    14.7915, 120.9425,
  ]);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null
  );
  const [isLocating, setIsLocating] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPos: [number, number] = [latitude, longitude];
          setMapCenter(newPos);
          setUserPosition(newPos);
          setIsLocating(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      if (!authLoading) setLoading(false);
      return;
    }

    setLoading(true);
    const userDocRef = doc(db, "students", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setStudentData(docSnap.data() as StudentData);
      } else {
        setStudentData(null);
      }
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;

    const recentQuery = query(
      collection(db, "reports"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const unsubscribeRecent = onSnapshot(recentQuery, (snapshot) => {
      const incidents = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Report)
      );
      setRecentIncidents(incidents);
      if (loading) setLoading(false);
    });

    if (!studentData?.address?.barangay) {
      setVerificationRequests([]);
      return () => {
        unsubscribeRecent();
      };
    }

    const studentBarangay = studentData.address.barangay;

    const requestsQuery = query(
      collection(db, "reports"),
      where("status", "==", "pending"),
      where("reporterId", "!=", user.uid),
      where("specificLocation.barangay", "==", studentBarangay)
    );

    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      const requests = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Report))
        .filter((report) => !report.verifications.includes(user.uid));
      setVerificationRequests(requests);
      if (loading) setLoading(false);
    });

    return () => {
      unsubscribeRecent();
      unsubscribeRequests();
    };
  }, [user, studentData]);

  const activeIncidents = recentIncidents.filter(
    (incident) => incident.status !== "resolved"
  );

  const handleVerificationAction = async (reportId: string) => {
    if (!user) return;

    setVerificationRequests((prev) =>
      prev.filter((request) => request.id !== reportId)
    );

    const reportRef = doc(db, "reports", reportId);
    try {
      await updateDoc(reportRef, { verifications: arrayUnion(user.uid) });
      const reportSnap = await getDoc(reportRef);
      if (reportSnap.exists()) {
        const reportData = reportSnap.data();
        const VERIFICATION_THRESHOLD = 2;
        if (reportData.verifications.length >= VERIFICATION_THRESHOLD) {
          await updateDoc(reportRef, { status: "verified" });
        }
      }
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Failed to record action. Please try again.");
    }
  };

  const getIncidentIcon = (type: string, size: number = 24) => {
    switch (type.toLowerCase()) {
      case "flood":
        return <Droplet size={size} className="text-blue-500" />;
      case "accident":
        return <Car size={size} className="text-red-500" />;
      case "fire":
        return <Flame size={size} className="text-orange-500" />;
      default:
        return <AlertCircle size={size} className="text-purple-500" />;
    }
  };

  const getTodayDate = () =>
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatIncidentLocation = (report: Report): string => {
    if (report.specificLocation) {
      return [
        report.specificLocation.street,
        report.specificLocation.barangay,
        report.specificLocation.city,
        report.specificLocation.province,
      ]
        .filter(Boolean)
        .join(", ");
    }
    return [
      report.reporterInfo.address.barangay,
      report.reporterInfo.address.city,
      report.reporterInfo.address.province,
    ]
      .filter(Boolean)
      .join(", ");
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <Loader2 className="animate-spin text-[#0B1F8C]" size={48} />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {studentData?.fullName || "Student"}
        </h1>
        <p className="text-gray-500">{getTodayDate()}</p>
      </div>

      {verificationRequests.length > 0 && studentData?.address?.barangay && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            Verification Requests in{" "}
            <span className="text-[#0B1F8C]">
              {studentData.address.barangay}
            </span>
          </h2>
          {verificationRequests.map((request) => (
            <VerificationRequest
              key={request.id}
              report={{
                id: request.id,
                type: request.incidentType,
                location: formatIncidentLocation(request),
                time: formatDistanceToNow(request.createdAt.toDate(), {
                  addSuffix: true,
                }),
                status: request.status,
                description: request.description,
                reporter: request.reporterInfo.fullName,
              }}
              onVerify={() => handleVerificationAction(request.id)}
              onReject={() => handleVerificationAction(request.id)}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Link
          to="/student/report"
          className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
            <Droplet size={24} className="text-blue-500" />
          </div>
          <span className="text-sm font-medium text-center">Report Flood</span>
        </Link>
        <Link
          to="/student/report"
          className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
            <Car size={24} className="text-red-500" />
          </div>
          <span className="text-sm font-medium text-center">
            Report Accident
          </span>
        </Link>
        <Link
          to="/student/report"
          className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-2">
            <Flame size={24} className="text-orange-500" />
          </div>
          <span className="text-sm font-medium text-center">Report Fire</span>
        </Link>
        <Link
          to="/student/report"
          className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-2">
            <AlertCircle size={24} className="text-purple-500" />
          </div>
          <span className="text-sm font-medium text-center">Report Other</span>
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800">Nearby Incidents</h2>
          <Link
            to="/student/feed"
            className="text-sm text-[#0B1F8C] hover:underline"
          >
            View All
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow overflow-hidden h-80 relative">
          {isLocating && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-[#0B1F8C]" size={32} />
              <span className="ml-2 text-gray-600">
                Finding your location...
              </span>
            </div>
          )}
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
          >
            <ChangeView center={mapCenter} zoom={13} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {userPosition && (
              <Marker position={userPosition}>
                <Popup>You are here</Popup>
              </Marker>
            )}
            {activeIncidents.map(
              (incident) =>
                incident.location && (
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
                    <Popup maxWidth={250}>
                      <div className="p-1">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold capitalize text-gray-800">
                            {incident.incidentType}
                          </h3>
                          <StatusBadge status={incident.status} />
                        </div>
                        {incident.imageUrl && (
                          <img
                            src={incident.imageUrl}
                            alt={incident.incidentType}
                            className="w-full h-24 object-cover rounded-md mb-2"
                          />
                        )}
                        <p className="text-xs text-gray-600 mb-2">
                          {incident.description}
                        </p>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin size={12} />
                          <span>
                            {[
                              incident.specificLocation?.street,
                              incident.specificLocation?.barangay,
                              incident.specificLocation?.city,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          <span>
                            {formatDistanceToNow(incident.createdAt.toDate(), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
            )}
          </MapContainer>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Recent Reports</h2>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {activeIncidents.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {activeIncidents.slice(0, 5).map((incident) => (
                <div key={incident.id}>
                  {incident.imageUrl && (
                    <img
                      src={incident.imageUrl}
                      alt={incident.incidentType}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 p-2 bg-gray-100 rounded-full">
                          {getIncidentIcon(incident.incidentType, 20)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800 capitalize">
                            {incident.incidentType}
                          </h3>
                          <div className="text-xs text-gray-500 flex items-center gap-1.5">
                            <User size={12} />
                            <span>{incident.reporterInfo.fullName}</span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={incident.status} />
                    </div>

                    <div className="text-sm text-gray-500 space-y-1 mt-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} />
                        <span>{formatIncidentLocation(incident)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        <span>
                          {formatDistanceToNow(incident.createdAt.toDate(), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>No active reports found.</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-marker-dashboard {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 0;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
