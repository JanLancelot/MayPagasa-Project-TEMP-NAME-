import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { Loader2, Users as UsersIcon, Search, Filter, Eye, X, ShieldOff, CheckCircle } from "lucide-react";

interface StudentAddress {
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  street?: string;
  houseNumber?: string;
}

interface Student {
  uid: string;
  fullName: string;
  studentId: string;
  email: string;
  address?: StudentAddress;
  banned?: boolean;
  createdAt?: any;
}

interface ReportStats {
  total: number;
  pending: number;
  verified: number;
  resolved: number;
  disputed: number;
  rejected: number;
}

export function UserManagement() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);

  const [search, setSearch] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("all");

  const [selectedUser, setSelectedUser] = useState<Student | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStats, setProfileStats] = useState<ReportStats | null>(null);

  const [confirmUser, setConfirmUser] = useState<Student | null>(null);
  const [banActionLoading, setBanActionLoading] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "students"));
        const data: Student[] = snap.docs.map((d) => {
          const val = d.data() as any;
          return {
            uid: val.uid || d.id,
            fullName: val.fullName || "",
            studentId: val.studentId || "",
            email: val.email || "",
            address: val.address || {},
            banned: !!val.banned,
            createdAt: val.createdAt,
          };
        });
        setStudents(data);
      } catch (e) {
        console.error("Failed to load students", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const barangayOptions = useMemo(() => {
    const setVals = new Set<string>();
    students.forEach((s) => {
      if (s.address?.city) setVals.add(s.address.city);
    });
    return Array.from(setVals).sort();
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const candidates = students.filter((s) => {
      const matchesQuery = !q
        || s.fullName?.toLowerCase().includes(q)
        || s.email?.toLowerCase().includes(q)
        || s.studentId?.toLowerCase().includes(q)
        || s.address?.city?.toLowerCase().includes(q)
        || s.address?.barangay?.toLowerCase().includes(q);
      const matchesCity = barangayFilter === "all" || s.address?.city === barangayFilter;
      return matchesQuery && matchesCity;
    });

    if (!q) return candidates;
    const score = (s: Student) => {
      let sc = 0;
      if (s.address?.city?.toLowerCase().includes(q)) sc += 4;
      if (s.address?.barangay?.toLowerCase().includes(q)) sc += 2;
      if (s.fullName?.toLowerCase().includes(q)) sc += 1;
      if (s.email?.toLowerCase().includes(q)) sc += 1;
      if (s.studentId?.toLowerCase().includes(q)) sc += 1;
      return sc;
    };
    return [...candidates].sort((a, b) => score(b) - score(a));
  }, [students, search, barangayFilter]);

  const totalUsers = students.length;
  const bannedUsers = students.filter((s) => s.banned).length;
  const activeUsers = totalUsers - bannedUsers;

  const openProfile = async (user: Student) => {
    setSelectedUser(user);
    setProfileLoading(true);
    setProfileStats(null);
    try {
      const qReports = query(collection(db, "reports"), where("reporterId", "==", user.uid));
      const snap = await getDocs(qReports);
      let stats: ReportStats = { total: 0, pending: 0, verified: 0, resolved: 0, disputed: 0, rejected: 0 };
      stats.total = snap.size;
      snap.forEach((d) => {
        const status = (d.data() as any).status as string;
        if (status === "verified") stats.verified++;
        else if (status === "resolved") stats.resolved++;
        else if (status === "disputed") stats.disputed++;
        else if (status === "rejected") stats.rejected++;
        else stats.pending++;
      });
      setProfileStats(stats);
    } catch (e) {
      console.error("Failed to load user report stats", e);
    } finally {
      setProfileLoading(false);
    }
  };

  const requestBanToggle = (user: Student) => setConfirmUser(user);

  const performBanToggle = async () => {
    if (!confirmUser) return;
    setBanActionLoading(true);
    try {
      const userRef = doc(db, "students", confirmUser.uid);
      await updateDoc(userRef, { banned: !confirmUser.banned });
      setStudents((prev) => prev.map((s) => (s.uid === confirmUser.uid ? { ...s, banned: !confirmUser.banned } : s)));
      setConfirmUser(null);
    } catch (e) {
      console.error("Failed to update user ban status", e);
    } finally {
      setBanActionLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#0B1F8C]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-6 px-2 md:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">User Management</h1>
        <p className="text-sm md:text-base text-gray-500">Search, review profiles, and manage bans</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-xl shadow p-3 md:p-4 flex items-center gap-3 min-w-0">
          <UsersIcon className="text-blue-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-sm truncate">Total Users</p>
            <h3 className="text-lg md:text-xl font-bold">{totalUsers}</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-3 md:p-4 flex items-center gap-3 min-w-0">
          <CheckCircle className="text-green-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-sm truncate">Active</p>
            <h3 className="text-lg md:text-xl font-bold">{activeUsers}</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-3 md:p-4 flex items-center gap-3 min-w-0">
          <ShieldOff className="text-red-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-sm truncate">Banned</p>
            <h3 className="text-lg md:text-xl font-bold">{bannedUsers}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, student ID, or barangay"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            />
          </div>
          <div className="w-full md:w-64 relative">
            <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={barangayFilter}
              onChange={(e) => setBarangayFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-sm md:text-base"
            >
              <option value="all">All Cities/Municipalities</option>
              {barangayOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barangay</th>
                <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-2 md:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 md:px-4 py-6 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.uid} className="hover:bg-gray-50">
                    <td className="px-2 md:px-4 py-3">
                      <div className="font-medium text-gray-800 text-sm md:text-base">{u.fullName || "Unknown"}</div>
                      <div className="text-xs text-gray-500">{u.address?.city || ""}{u.address?.city && u.address?.province ? ", " : ""}{u.address?.province || ""}</div>
                    </td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-700">{u.email}</td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-700">{u.studentId}</td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-700">{u.address?.barangay || ""}</td>
                    <td className="px-2 md:px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${u.banned ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                        {u.banned ? "Banned" : "Active"}
                      </span>
                    </td>
                    <td className="px-2 md:px-4 py-3">
                      <div className="flex justify-end gap-1 md:gap-2">
                        <button
                          onClick={() => openProfile(u)}
                          className="px-1 md:px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 rounded flex items-center gap-1"
                        >
                          <Eye size={12} className="md:hidden" />
                          <Eye size={14} className="hidden md:block" />
                          <span className="hidden sm:inline">Profile</span>
                        </button>
                        <button
                          onClick={() => requestBanToggle(u)}
                          className={`px-1 md:px-2 py-1 text-xs rounded flex items-center gap-1 ${u.banned ? "bg-green-100 hover:bg-green-200 text-green-800" : "bg-red-100 hover:bg-red-200 text-red-800"}`}
                        >
                          {u.banned ? <CheckCircle size={12} className="md:hidden" /> : <ShieldOff size={12} className="md:hidden" />}
                          {u.banned ? <CheckCircle size={14} className="hidden md:block" /> : <ShieldOff size={14} className="hidden md:block" />}
                          <span className="hidden sm:inline">{u.banned ? "Unban" : "Ban"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-3" onClick={() => setSelectedUser(null)}>
          <div className="relative bg-white rounded-xl shadow-lg max-w-xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedUser(null)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-4">User Profile</h3>

            <div className="space-y-1 mb-4">
              <p className="text-sm text-gray-800"><span className="font-medium">Name:</span> {selectedUser.fullName || "Unknown"}</p>
              <p className="text-sm text-gray-800"><span className="font-medium">Email:</span> {selectedUser.email}</p>
              <p className="text-sm text-gray-800"><span className="font-medium">Student ID:</span> {selectedUser.studentId}</p>
              <p className="text-sm text-gray-800"><span className="font-medium">Barangay:</span> {selectedUser.address?.barangay || ""}</p>
              <p className="text-sm text-gray-800"><span className="font-medium">City/Province:</span> {`${selectedUser.address?.city || ""}${selectedUser.address?.city && selectedUser.address?.province ? ", " : ""}${selectedUser.address?.province || ""}`}</p>
              <p className="text-sm text-gray-800"><span className="font-medium">Status:</span> {selectedUser.banned ? "Banned" : "Active"}</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Report Statistics</h4>
              {profileLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="animate-spin text-[#0B1F8C]" size={28} />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatPill label="Total" value={profileStats?.total || 0} color="text-gray-800" />
                  <StatPill label="Pending" value={profileStats?.pending || 0} color="text-yellow-600" />
                  <StatPill label="Verified" value={profileStats?.verified || 0} color="text-green-600" />
                  <StatPill label="Resolved" value={profileStats?.resolved || 0} color="text-blue-600" />
                  <StatPill label="Disputed" value={profileStats?.disputed || 0} color="text-red-600" />
                  <StatPill label="Rejected" value={profileStats?.rejected || 0} color="text-red-700" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-3" onClick={() => (banActionLoading ? null : setConfirmUser(null))}>
          <div className="relative bg-white rounded-xl shadow-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setConfirmUser(null)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" disabled={banActionLoading}>
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{confirmUser.banned ? "Unban user" : "Ban user"}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmUser.banned
                ? `Allow ${confirmUser.fullName || confirmUser.email} to access the app again?`
                : `Prevent ${confirmUser.fullName || confirmUser.email} from accessing the app?`}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmUser(null)} className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={banActionLoading}>Cancel</button>
              <button onClick={performBanToggle} className={`px-3 py-2 rounded-lg text-white ${confirmUser.banned ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`} disabled={banActionLoading}>
                {banActionLoading ? <Loader2 className="animate-spin" size={16} /> : (confirmUser.banned ? "Unban" : "Ban")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
