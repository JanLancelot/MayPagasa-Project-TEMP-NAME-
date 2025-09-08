import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  MapPin,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Report {
  id: string;
  incidentType: string;
  description: string;
  status: "pending" | "verified" | "resolved" | "disputed";
  createdAt: any;
  reporterInfo: {
    fullName: string;
    address: { barangay: string; city: string; province?: string };
  };
  imageUrl?: string;
  lat?: number; // 👈 make sure you save lat/lng in Firestore
  lng?: number;
}

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [verifiedCount, setVerifiedCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"list" | "map">("list");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const reportsQuery = query(
        collection(db, "reports"),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const reportsSnap = await getDocs(reportsQuery);
      const reportsData = reportsSnap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Report)
      );
      setReports(reportsData);

      setPendingCount(reportsData.filter((r) => r.status === "pending").length);
      setVerifiedCount(
        reportsData.filter((r) => r.status === "verified").length
      );

      const usersSnap = await getDocs(collection(db, "students"));
      setTotalUsers(usersSnap.size);

      setLoading(false);
    };

    fetchData();
  }, []);

  const getMarkerIcon = (status: string) =>
  new L.Icon({
    iconUrl:
      status === "pending"
        ? "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
        : status === "verified"
        ? "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
        : status === "resolved"
        ? "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
        : "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#0B1F8C]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-500">System overview & recent reports</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-xl p-6 flex items-center gap-4">
          <Users className="text-blue-600" size={32} />
          <div>
            <p className="text-gray-500 text-sm">Total Users</p>
            <h3 className="text-xl font-bold">{totalUsers}</h3>
          </div>
        </div>
        <div className="bg-white shadow rounded-xl p-6 flex items-center gap-4">
          <AlertTriangle className="text-yellow-500" size={32} />
          <div>
            <p className="text-gray-500 text-sm">Pending Reports</p>
            <h3 className="text-xl font-bold">{pendingCount}</h3>
          </div>
        </div>
        <div className="bg-white shadow rounded-xl p-6 flex items-center gap-4">
          <CheckCircle className="text-green-600" size={32} />
          <div>
            <p className="text-gray-500 text-sm">Verified Reports</p>
            <h3 className="text-xl font-bold">{verifiedCount}</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 ${
            activeTab === "list" ? "border-b-2 border-blue-600 font-semibold" : ""
          }`}
        >
          Recent Reports
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className={`px-4 py-2 ${
            activeTab === "map" ? "border-b-2 border-blue-600 font-semibold" : ""
          }`}
        >
          Report Map
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "list" ? (
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Reports</h2>
          <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
            {reports.length > 0 ? (
              reports.map((r) => (
                <div key={r.id} className="p-4 flex gap-4">
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
                  <span
                    className={`self-start px-2 py-1 text-xs font-medium rounded-full ${
                      r.status === "verified"
                        ? "bg-green-100 text-green-800"
                        : r.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : r.status === "resolved"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                No reports found.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-[500px] w-full">
          <MapContainer
      center={[14.7915, 120.9425]} // Default center (Bulacan)
      zoom={12}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {reports.map((r) =>
        r.location ? (
          <Marker
            key={r.id}
            position={[r.location.latitude, r.location.longitude]}
            icon={getMarkerIcon(r.status)}
          >
            <Popup>
              <div>
                <h3 className="font-semibold capitalize">{r.incidentType}</h3>
                <p className="text-sm">{r.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Status: <strong>{r.status}</strong>
                </p>
                {r.imageUrl && (
                  <img
                    src={r.imageUrl}
                    alt="Incident"
                    className="mt-2 w-32 h-20 object-cover rounded"
                  />
                )}
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
        </div>
      )}
    </div>
  );
}
