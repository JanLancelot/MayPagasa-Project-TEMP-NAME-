import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Settings, Clock, CheckCircle, AlertTriangle, Droplet, Car, Flame, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';



interface StudentAddress {
  region: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  houseNumber: string;
  psgc: {
    regionCode: string;
    provinceCode: string;
    cityCode: string;
    barangayCode: string;
  }
}

interface StudentData {
  fullName: string;
  studentId: string;
  email: string;
  address: StudentAddress;
}

interface ReportData {
  id: string;
  incidentType: string;
  reporterInfo: { address: { city?: string; barangay?: string; } };
  createdAt: Timestamp;
  status: 'pending' | 'verified' | 'resolved' | 'rejected';
}

interface Location {
  code: string;
  name: string;
}

const getIncidentIcon = (type: string) => {
  switch (type) {
    case 'flood':
      return <Droplet size={20} className="text-blue-500" />;
    case 'accident':
      return <Car size={20} className="text-yellow-600" />;
    case 'fire':
      return <Flame size={20} className="text-orange-500" />;
    case 'crime':
      return <AlertTriangle size={20} className="text-red-600" />;
    default:
      return <AlertCircle size={20} className="text-purple-500" />;
  }
};
const getStatusInfo = (status: ReportData['status']) => {
  switch (status) {
    case 'verified':
    case 'resolved':
      return {
        icon: <CheckCircle size={16} className="text-green-500" />,
        textClass: 'text-green-600',
        label: 'Verified'
      };
    case 'pending':
      return {
        icon: <Clock size={16} className="text-yellow-500" />,
        textClass: 'text-yellow-600',
        label: 'Pending'
      };
    case 'rejected':
      return {
        icon: <XCircle size={16} className="text-red-500" />,
        textClass: 'text-red-600',
        label: 'Rejected'
      };
    default:
      return {
        icon: <Clock size={16} className="text-gray-500" />,
        textClass: 'text-gray-600',
        label: 'Unknown'
      };
  }
};
const formatTimeAgo = (timestamp: Timestamp): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)} years ago`;
  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} months ago`;
  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} days ago`;
  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} hours ago`;
  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} minutes ago`;
  return `${Math.floor(seconds)} seconds ago`;
};


export function UserProfile() {
  const [user, authLoading] = useAuthState(auth);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, reliability: 0 });
  const [isFetchingData, setIsFetchingData] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');
  const [editFormData, setEditFormData] = useState<Partial<StudentData>>({});

  const [regions, setRegions] = useState<Location[]>([]);
  const [provinces, setProvinces] = useState<Location[]>([]);
  const [cities, setCities] = useState<Location[]>([]);
  const [barangays, setBarangays] = useState<Location[]>([]);
  const [addressLoading, setAddressLoading] = useState({
    regions: false, provinces: false, cities: false, barangays: false
  });
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user) { setIsFetchingData(false); return; }
      setIsFetchingData(true);
      try {
        const userDocRef = doc(db, 'students', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as StudentData;
          setStudentData(data);
          setEditFormData(JSON.parse(JSON.stringify(data)));
        }
        const reportsQuery = query(collection(db, 'reports'), where('reporterId', '==', user.uid), orderBy('createdAt', 'desc'));
        const reportsSnapshot = await getDocs(reportsQuery);
        const userReports = reportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportData));
        setReports(userReports);
        const total = userReports.length;
        const verified = userReports.filter(r => r.status === 'verified' || r.status === 'resolved').length;
        const reliability = total > 0 ? Math.round((verified / total) * 100) : 0;
        setStats({ total, verified, reliability });
      } catch (error) { console.error("Error fetching user data:", error); } 
      finally { setIsFetchingData(false); }
    };
    if (!authLoading) fetchData();
  }, [user, authLoading]);

  useEffect(() => {
    if (!isEditing) return;
    const fetchRegions = async () => {
      setAddressLoading(prev => ({ ...prev, regions: true }));
      try {
        const response = await fetch('https://psgc.gitlab.io/api/regions/');
        setRegions(await response.json());
      } catch (e) { console.error("Failed to fetch regions", e); } 
      finally { setAddressLoading(prev => ({ ...prev, regions: false })); }
    };
    fetchRegions();
  }, [isEditing]);

  useEffect(() => {
    const regionCode = editFormData.address?.psgc?.regionCode;
    if (isEditing && regionCode) {
      const fetchProvinces = async () => {
        setAddressLoading(prev => ({ ...prev, provinces: true }));
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`);
          setProvinces(await response.json());
        } catch (e) { console.error("Failed to fetch provinces", e); } 
        finally { setAddressLoading(prev => ({ ...prev, provinces: false })); }
      };
      fetchProvinces();
    } else {
      setProvinces([]);
    }
  }, [isEditing, editFormData.address?.psgc?.regionCode]);

  useEffect(() => {
    const provinceCode = editFormData.address?.psgc?.provinceCode;
    if (isEditing && provinceCode) {
      const fetchCities = async () => {
        setAddressLoading(prev => ({ ...prev, cities: true }));
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
          setCities(await response.json());
        } catch (e) { console.error("Failed to fetch cities", e); } 
        finally { setAddressLoading(prev => ({ ...prev, cities: false })); }
      };
      fetchCities();
    } else {
      setCities([]);
    }
  }, [isEditing, editFormData.address?.psgc?.provinceCode]);

  useEffect(() => {
    const cityCode = editFormData.address?.psgc?.cityCode;
    if (isEditing && cityCode) {
      const fetchBarangays = async () => {
        setAddressLoading(prev => ({ ...prev, barangays: true }));
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
          setBarangays(await response.json());
        } catch (e) { console.error("Failed to fetch barangays", e); } 
        finally { setAddressLoading(prev => ({ ...prev, barangays: false })); }
      };
      fetchBarangays();
    } else {
      setBarangays([]);
    }
  }, [isEditing, editFormData.address?.psgc?.cityCode]);

  const handleEditChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    
    if (id.startsWith('address.')) {
        const keys = id.split('.');
        setEditFormData(prev => {
            let updated = { ...prev };
            let current: any = updated;

            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;

            if (id === 'address.psgc.regionCode') {
              updated.address!.psgc.provinceCode = '';
              updated.address!.psgc.cityCode = '';
              updated.address!.psgc.barangayCode = '';
              setProvinces([]); setCities([]); setBarangays([]);
            } else if (id === 'address.psgc.provinceCode') {
              updated.address!.psgc.cityCode = '';
              updated.address!.psgc.barangayCode = '';
              setCities([]); setBarangays([]);
            } else if (id === 'address.psgc.cityCode') {
              updated.address!.psgc.barangayCode = '';
              setBarangays([]);
            }

            return updated;
        });
    } else {
        setEditFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleUpdateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !editFormData.address) return;
    setEditError('');
    setIsUpdating(true);

    try {
      const { psgc, street, houseNumber } = editFormData.address;
      const regionName = regions.find(r => r.code === psgc.regionCode)?.name || '';
      const provinceName = provinces.find(p => p.code === psgc.provinceCode)?.name || '';
      const cityName = cities.find(c => c.code === psgc.cityCode)?.name || '';
      const barangayName = barangays.find(b => b.code === psgc.barangayCode)?.name || '';

      const updatedData = {
        fullName: editFormData.fullName,
        address: {
          region: regionName,
          province: provinceName,
          city: cityName,
          barangay: barangayName,
          street: street,
          houseNumber: houseNumber,
          psgc: { ...psgc }
        }
      };

      const userDocRef = doc(db, 'students', user.uid);
      await updateDoc(userDocRef, updatedData);

      setStudentData(prev => ({ ...prev!, ...updatedData }));
      
      setIsEditing(false);

    } catch (err) {
      console.error("Error updating profile: ", err);
      setEditError("Failed to update profile. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = () => {
    setEditFormData(JSON.parse(JSON.stringify(studentData)));
    setEditError('');
    setIsEditing(true);
  }

  if (authLoading || isFetchingData) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="animate-spin text-[#0B1F8C]" size={48} />
      </div>
    );
  }
   if (!user) {
    return (
       <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
            <p className="text-gray-500">View and manage your account</p>
        </div>
        <div className="bg-white rounded-xl shadow mb-6">
            <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-[#0B1F8C] text-white flex items-center justify-center text-4xl font-bold">
                {studentData?.fullName?.charAt(0).toUpperCase() || '?'}
                </div>
            </div>
            <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800">{studentData?.fullName || 'Student'}</h2>
                <p className="text-gray-500">Student ID: {studentData?.studentId || 'N/A'}</p>
                <p className="text-gray-500">Email: {studentData?.email || 'N/A'}</p>
                <div className="mt-4 flex flex-wrap gap-4">
                <button onClick={openEditModal} className="bg-[#0B1F8C] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-900 transition-colors">
                    <Settings size={16} />
                    Edit Profile
                </button>
                </div>
            </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center">
              <div className="text-4xl font-bold text-[#0B1F8C]">{stats.total}</div>
              <p className="text-gray-500 mt-1">Total Reports</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center">
              <div className="text-4xl font-bold text-green-500">{stats.verified}</div>
              <p className="text-gray-500 mt-1">Verified Reports</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center">
              <div className="text-4xl font-bold text-[#F5C542]">{stats.reliability}%</div>
              <p className="text-gray-500 mt-1">Reliability Score</p>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Activity Timeline</h2>
              <p className="text-sm text-gray-500">Your recent report submissions</p>
            </div>
            <div className="divide-y divide-gray-100">
              {reports.length > 0 ? (
                reports.map(report => {
                  const statusInfo = getStatusInfo(report.status);
                  const address = report.reporterInfo?.address;
                  const locationString = address ? `${address.barangay}, ${address.city}` : 'Location not specified';
                  return (
                    <div key={report.id} className="p-4 flex items-center gap-3">
                      <div className="p-2 rounded-full bg-gray-100">{getIncidentIcon(report.incidentType)}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-gray-800 capitalize">{report.incidentType} Report</h3>
                          <div className="flex items-center gap-1">
                            {statusInfo.icon}
                            <span className={`text-xs font-medium ${statusInfo.textClass}`}>{statusInfo.label}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{locationString}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(report.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-gray-500"><p>You haven't submitted any reports yet.</p></div>
              )}
            </div>
        </div>
      </div>
      
      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdateProfile}>
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
                <p className="text-sm text-gray-500">Update your personal and address information.</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input id="fullName" type="text" value={editFormData.fullName || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-400 mb-1">Student ID (Cannot be changed)</label>
                  <input id="studentId" type="text" value={editFormData.studentId || ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 cursor-not-allowed" disabled />
                </div>
                <div className="pt-2 border-t">
                  <h3 className="font-medium text-gray-700 mb-2">Address Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="address.psgc.regionCode" className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                      <select id="address.psgc.regionCode" value={editFormData.address?.psgc?.regionCode || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" required disabled={addressLoading.regions}>
                        <option value="" disabled>{addressLoading.regions ? 'Loading...' : 'Select Region'}</option>
                        {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="address.psgc.provinceCode" className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                      <select id="address.psgc.provinceCode" value={editFormData.address?.psgc?.provinceCode || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" required disabled={!editFormData.address?.psgc?.regionCode || addressLoading.provinces}>
                        <option value="" disabled>{addressLoading.provinces ? 'Loading...' : 'Select Province'}</option>
                        {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="address.psgc.cityCode" className="block text-sm font-medium text-gray-700 mb-1">City/Municipality</label>
                      <select id="address.psgc.cityCode" value={editFormData.address?.psgc?.cityCode || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" required disabled={!editFormData.address?.psgc?.provinceCode || addressLoading.cities}>
                        <option value="" disabled>{addressLoading.cities ? 'Loading...' : 'Select City'}</option>
                        {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="address.psgc.barangayCode" className="block text-sm font-medium text-gray-700 mb-1">Barangay</label>
                      <select id="address.psgc.barangayCode" value={editFormData.address?.psgc?.barangayCode || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" required disabled={!editFormData.address?.psgc?.cityCode || addressLoading.barangays}>
                        <option value="" disabled>{addressLoading.barangays ? 'Loading...' : 'Select Barangay'}</option>
                        {barangays.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                      </select>
                    </div>
                     <div>
                        <label htmlFor="address.street" className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                        <input id="address.street" type="text" value={editFormData.address?.street || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                    </div>
                     <div>
                        <label htmlFor="address.houseNumber" className="block text-sm font-medium text-gray-700 mb-1">House Number</label>
                        <input id="address.houseNumber" type="text" value={editFormData.address?.houseNumber || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                    </div>
                  </div>
                </div>
                 {editError && <p className="text-sm text-red-600 text-center">{editError}</p>}
              </div>
              <div className="p-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#0B1F8C] text-white rounded-lg hover:bg-blue-900 disabled:bg-gray-400 flex items-center gap-2" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="animate-spin" size={16} />}
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}