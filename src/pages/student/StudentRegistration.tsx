import React, { useState, FC, ChangeEvent, FormEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';


interface IFormData {
  fullName: string;
  studentId: string;
  email: string;
  regionCode: string;
  provinceCode: string;
  cityCode: string;
  barangayCode: string;
  street: string;
  houseNumber: string;
  password: string;
  confirmPassword: string;
}

interface Location {
  code: string;
  name: string;
}

export const StudentRegistration: FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [formData, setFormData] = useState<IFormData>({
    fullName: '',
    studentId: '',
    email: '',
    regionCode: '',
    provinceCode: '',
    cityCode: '',
    barangayCode: '',
    street: '',
    houseNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [regions, setRegions] = useState<Location[]>([]);
  const [provinces, setProvinces] = useState<Location[]>([]);
  const [cities, setCities] = useState<Location[]>([]);
  const [barangays, setBarangays] = useState<Location[]>([]);
  
  const [addressLoading, setAddressLoading] = useState({
    regions: true, provinces: false, cities: false, barangays: false
  });


  useEffect(() => {
    const fetchRegions = async () => {
      setAddressLoading(prev => ({ ...prev, regions: true }));
      try {
        const response = await fetch('https://psgc.gitlab.io/api/regions/');
        const data = await response.json();
        setRegions(data);
      } catch (e) {
        console.error("Failed to fetch regions", e);
        setError("Could not load address data. Please refresh the page.");
      } finally {
        setAddressLoading(prev => ({ ...prev, regions: false }));
      }
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    if (formData.regionCode) {
      const fetchProvinces = async () => {
        setAddressLoading(prev => ({ ...prev, provinces: true }));
        setProvinces([]); setCities([]); setBarangays([]);
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/regions/${formData.regionCode}/provinces/`);
          setProvinces(await response.json());
        } catch (e) { console.error("Failed to fetch provinces", e); } 
        finally { setAddressLoading(prev => ({ ...prev, provinces: false })); }
      };
      fetchProvinces();
    }
  }, [formData.regionCode]);

  useEffect(() => {
    if (formData.provinceCode) {
      const fetchCities = async () => {
        setAddressLoading(prev => ({ ...prev, cities: true }));
        setCities([]); setBarangays([]);
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/provinces/${formData.provinceCode}/cities-municipalities/`);
          setCities(await response.json());
        } catch (e) { console.error("Failed to fetch cities", e); } 
        finally { setAddressLoading(prev => ({ ...prev, cities: false })); }
      };
      fetchCities();
    }
  }, [formData.provinceCode]);

  useEffect(() => {
    if (formData.cityCode) {
      const fetchBarangays = async () => {
        setAddressLoading(prev => ({ ...prev, barangays: true }));
        setBarangays([]);
        try {
          const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${formData.cityCode}/barangays/`);
          setBarangays(await response.json());
        } catch (e) { console.error("Failed to fetch barangays", e); }
        finally { setAddressLoading(prev => ({ ...prev, barangays: false })); }
      };
      fetchBarangays();
    }
  }, [formData.cityCode]);


  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    
    let newFormData = { ...formData, [id]: value };
  
    if (id === 'regionCode') {
      newFormData = { ...newFormData, provinceCode: '', cityCode: '', barangayCode: '' };
    } else if (id === 'provinceCode') {
      newFormData = { ...newFormData, cityCode: '', barangayCode: '' };
    } else if (id === 'cityCode') {
      newFormData = { ...newFormData, barangayCode: '' };
    }
    
    setFormData(newFormData);
  };
  

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (formData.password.length < 6) {
      return setError("Password should be at least 6 characters long.");
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const regionName = regions.find(r => r.code === formData.regionCode)?.name || '';
      const provinceName = provinces.find(p => p.code === formData.provinceCode)?.name || '';
      const cityName = cities.find(c => c.code === formData.cityCode)?.name || '';
      const barangayName = barangays.find(b => b.code === formData.barangayCode)?.name || '';

      await setDoc(doc(db, "students", user.uid), {
        uid: user.uid,
        fullName: formData.fullName,
        studentId: formData.studentId,
        email: formData.email,
        address: {
          region: regionName,
          province: provinceName,
          city: cityName,
          barangay: barangayName,
          street: formData.street,
          houseNumber: formData.houseNumber,
          psgc: {
            regionCode: formData.regionCode,
            provinceCode: formData.provinceCode,
            cityCode: formData.cityCode,
            barangayCode: formData.barangayCode
          }
        },
        createdAt: Timestamp.fromDate(new Date()),
      });
      
      alert('Registration successful! Redirecting to login...');
      navigate('/student/login');

    } catch (err: any) { 
      let friendlyError = "Failed to register. Please try again.";
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = "This email address is already in use.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "Please enter a valid email address.";
      }
      console.error("Firebase registration error:", err);
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="https://dyci.edu.ph/assets/logo/dyci-logo.webp" alt="DYCI Logo" className="h-24 mb-2" />
          <h1 className="text-2xl font-bold text-[#0B1F8C]">Bocaue Tracker</h1>
          <p className="text-gray-500 mt-1">Student Registration</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full">
          <div className="flex items-center mb-6">
            <Link to="/student/login" className="text-gray-500 hover:text-[#0B1F8C]"> <ArrowLeft size={20} /> </Link>
            <h2 className="text-xl font-bold text-gray-800 ml-2">Create an account</h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
              <input id="fullName" type="text" value={formData.fullName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0B1F8C] focus:border-[#0B1F8C] outline-none" placeholder="Enter your full name" required />
            </div>
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">Student ID*</label>
              <input id="studentId" type="text" value={formData.studentId} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0B1F8C] focus:border-[#0B1F8C] outline-none" placeholder="Enter your student ID" required />
            </div>

            <div className="pt-2 border-t border-gray-200">
              <h3 className="font-medium text-gray-700 mb-2">Address Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="regionCode" className="block text-sm font-medium text-gray-700 mb-1">Region*</label>
                  <select id="regionCode" value={formData.regionCode} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" required disabled={addressLoading.regions}>
                    <option value="" disabled>{addressLoading.regions ? 'Loading...' : 'Select Region'}</option>
                    {regions.map(region => <option key={region.code} value={region.code}>{region.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="provinceCode" className="block text-sm font-medium text-gray-700 mb-1">Province*</label>
                  <select id="provinceCode" value={formData.provinceCode} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" required disabled={!formData.regionCode || addressLoading.provinces}>
                    <option value="" disabled>{addressLoading.provinces ? 'Loading...' : 'Select Province'}</option>
                    {provinces.map(province => <option key={province.code} value={province.code}>{province.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="cityCode" className="block text-sm font-medium text-gray-700 mb-1">City/Municipality*</label>
                  <select id="cityCode" value={formData.cityCode} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" required disabled={!formData.provinceCode || addressLoading.cities}>
                    <option value="" disabled>{addressLoading.cities ? 'Loading...' : 'Select City/Municipality'}</option>
                    {cities.map(city => <option key={city.code} value={city.code}>{city.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="barangayCode" className="block text-sm font-medium text-gray-700 mb-1">Barangay*</label>
                  <select id="barangayCode" value={formData.barangayCode} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" required disabled={!formData.cityCode || addressLoading.barangays}>
                    <option value="" disabled>{addressLoading.barangays ? 'Loading...' : 'Select Barangay'}</option>
                    {barangays.map(brgy => <option key={brgy.code} value={brgy.code}>{brgy.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Street*</label>
                  <input id="street" type="text" value={formData.street} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter street name" required />
                </div>
                <div>
                  <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-700 mb-1">House Number*</label>
                  <input id="houseNumber" type="text" value={formData.houseNumber} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter house number" required />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <h3 className="font-medium text-gray-700 mb-2">Account Security</h3>
              <div className="space-y-4">
                 <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address*</label>
                  <input id="email" type="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0B1F8C] focus:border-[#0B1F8C] outline-none" placeholder="Enter your email" required />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password*</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Create a password (min. 6 characters)" required />
                    <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password*</label>
                  <div className="relative">
                    <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Confirm your password" required />
                    <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 text-center py-2">{error}</p>}

            <button type="submit" className="w-full bg-[#0B1F8C] text-white py-2 px-4 rounded-lg hover:bg-blue-900 transition duration-200 disabled:bg-gray-400" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/student/login" className="text-[#0B1F8C] hover:underline font-medium">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};