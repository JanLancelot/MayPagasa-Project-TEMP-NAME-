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
  LayoutDashboard,
  X,
  Search,
  UserPlus,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createCustomMarker } from "../student/StudentDashboard";
import { Link } from "react-router-dom";

interface Address {
  barangay: string;
  city: string;
  province?: string;
}

interface ReporterInfo {
  fullName: string;
  address: Address;
}

interface Location {
  latitude: number;
  longitude: number;
}

interface Report {
  id: string;
  incidentType: string;
  description: string;
  status: "pending" | "verified" | "resolved" | "disputed";
  createdAt: any;
  reporterInfo: ReporterInfo;
  imageUrl?: string;
  location?: Location;
}

const STATUS_COLORS: Record<string, string> = {
  verified: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  resolved: "bg-blue-100 text-blue-800",
  disputed: "bg-red-100 text-red-800",
};

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [disputedCount, setDisputedCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"list" | "map">("list");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "" | "pending" | "verified" | "resolved" | "disputed"
  >("");

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
      setVerifiedCount(reportsData.filter((r) => r.status === "verified").length);
      setResolvedCount(reportsData.filter((r) => r.status === "resolved").length);
      setDisputedCount(reportsData.filter((r) => r.status === "disputed").length);

      const usersSnap = await getDocs(collection(db, "students"));
      setTotalUsers(usersSnap.size);

      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredReports = reports.filter(
    (r) =>
      (filterStatus === "" || r.status === filterStatus) &&
      (
        r.incidentType.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.reporterInfo.fullName.toLowerCase().includes(search.toLowerCase())
      )
  );

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
        <Header />
        <Stats
          totalUsers={totalUsers}
          pendingCount={pendingCount}
          verifiedCount={verifiedCount}
          resolvedCount={resolvedCount}
          disputedCount={disputedCount}
        />
        <QuickLinks />
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <FilterBar
          search={search}
          setSearch={setSearch}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />
        {activeTab === "list" ? (
          <ReportList
            reports={filteredReports}
            onSelect={setSelectedReport}
          />
        ) : (
          <ReportMap reports={filteredReports} />
        )}
      </div>
      {selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
      <p className="text-gray-500">System overview & recent reports</p>
    </div>
  );
}

function Stats({
  totalUsers,
  pendingCount,
  verifiedCount,
  resolvedCount,
  disputedCount,
}: {
  totalUsers: number;
  pendingCount: number;
  verifiedCount: number;
  resolvedCount: number;
  disputedCount: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
      <StatCard
        icon={<Users className="text-blue-600" size={28} />}
        label="Total Users"
        value={totalUsers}
      />
      <StatCard
        icon={<AlertTriangle className="text-yellow-500" size={28} />}
        label="Pending"
        value={pendingCount}
      />
      <StatCard
        icon={<CheckCircle className="text-green-600" size={28} />}
        label="Verified"
        value={verifiedCount}
      />
      <StatCard
        icon={<Clock className="text-blue-600" size={28} />}
        label="Resolved"
        value={resolvedCount}
      />
      <StatCard
        icon={<LayoutDashboard className="text-red-600" size={28} />}
        label="Disputed"
        value={disputedCount}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white shadow rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <h3 className="text-xl font-bold">{value}</h3>
      </div>
      {icon}
    </div>
  );
}

function QuickLinks() {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row gap-4">
      <Link
        to="/admin/users"
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition"
      >
        <UserPlus size={18} />
        Manage Users
      </Link>
      <Link
        to="/admin/reports"
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-medium transition"
      >
        <FileText size={18} />
        All Reports
      </Link>
      <Link
        to="/admin/analytics"
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-medium transition"
      >
        <LayoutDashboard size={18} />
        Analytics
      </Link>
    </div>
  );
}

function Tabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: "list" | "map";
  setActiveTab: (tab: "list" | "map") => void;
}) {
  return (
    <div className="flex gap-4 border-b">
      <button
        onClick={() => setActiveTab("list")}
        className={`px-4 py-2 ${
          activeTab === "list"
            ? "border-b-2 border-blue-600 font-semibold"
            : ""
        }`}
      >
        Recent Reports
      </button>
      <button
        onClick={() => setActiveTab("map")}
        className={`px-4 py-2 ${
          activeTab === "map"
            ? "border-b-2 border-blue-600 font-semibold"
            : ""
        }`}
      >
        Report Map
      </button>
    </div>
  );
}

function FilterBar({
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
}: {
  search: string;
  setSearch: (v: string) => void;
  filterStatus: "" | "pending" | "verified" | "resolved" | "disputed";
  setFilterStatus: (v: "" | "pending" | "verified" | "resolved" | "disputed") => void;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-2 mb-4">
      <div className="flex items-center border rounded px-2 bg-white w-full md:w-1/3">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="outline-none px-2 py-1 w-full"
        />
      </div>
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value as any)}
        className="border rounded px-2 py-1 bg-white w-full md:w-1/4"
      >
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="verified">Verified</option>
        <option value="resolved">Resolved</option>
        <option value="disputed">Disputed</option>
      </select>
    </div>
  );
}

function ReportList({
  reports,
  onSelect,
}: {
  reports: Report[];
  onSelect: (report: Report) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Reports</h2>
      <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
        {reports.length > 0 ? (
          reports.map((r) => (
            <div
              key={r.id}
              className="p-4 flex flex-col sm:flex-row gap-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelect(r)}
            >
              {r.imageUrl && (
                <img
                  src={r.imageUrl}
                  alt={r.incidentType}
                  className="w-full sm:w-24 h-24 object-cover rounded-md"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold capitalize text-gray-800">
                  {r.incidentType}
                </h3>
                <p className="text-sm text-gray-600 mb-1">{r.description}</p>
                <p className="text-xs text-gray-500 mb-1">
                  Reported by:{" "}
                  <span className="font-medium">
                    {r.reporterInfo?.fullName || "Unknown"}
                  </span>
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
              <span
                className={`self-start px-2 py-1 text-xs font-medium rounded-full ${
                  STATUS_COLORS[r.status]
                }`}
              >
                {r.status}
              </span>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-gray-500">No reports found.</div>
        )}
      </div>
    </div>
  );
}

function ReportMap({ reports }: { reports: Report[] }) {
  return (
    <div className="h-[400px] sm:h-[500px] w-full">
      <MapContainer
        center={[14.7915, 120.9425]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reports.map(
          (r) =>
            r.location && (
              <Marker
                key={r.id}
                position={[r.location.latitude, r.location.longitude]}
                icon={createCustomMarker(
                  r.incidentType,
                  r.imageUrl,
                  r.status
                )}
              >
                <Popup maxWidth={250}>
                  <div className="p-1">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold capitalize text-gray-800">
                        {r.incidentType}
                      </h3>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          STATUS_COLORS[r.status]
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    {r.imageUrl && (
                      <img
                        src={r.imageUrl}
                        alt={r.incidentType}
                        className="w-full h-24 object-cover rounded-md mb-2"
                      />
                    )}
                    <p className="text-xs text-gray-600 mb-2">
                      {r.description}
                    </p>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={12} />
                      <span>
                        {[
                          r.reporterInfo.address.barangay,
                          r.reporterInfo.address.city,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Clock size={12} />
                      <span>
                        {formatDistanceToNow(r.createdAt.toDate(), {
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
  );
}

function ReportModal({
  report,
  onClose,
}: {
  report: Report;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2">
      <div className="relative bg-white rounded-xl shadow-lg max-w-3xl w-full p-6 overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold mb-4 capitalize">
          {report.incidentType}
        </h2>
        {report.imageUrl && (
          <img
            src={report.imageUrl}
            alt={report.incidentType}
            className="w-full max-h-[500px] object-contain rounded-md mb-4"
          />
        )}
        <p className="text-gray-700 mb-2">{report.description}</p>
        <p className="text-sm text-gray-500 mb-1">
          Reported by: <span className="font-medium">{report.reporterInfo.fullName}</span>
        </p>
        <p className="text-sm text-gray-500 mb-1">
          Location:{" "}
          {[
            report.reporterInfo.address.barangay,
            report.reporterInfo.address.city,
            report.reporterInfo.address.province,
          ]
            .filter(Boolean)
            .join(", ")}
        </p>
        <p className="text-sm text-gray-500">
          {formatDistanceToNow(report.createdAt.toDate(), {
            addSuffix: true,
          })}
        </p>
      </div>
    </div>
  );
}