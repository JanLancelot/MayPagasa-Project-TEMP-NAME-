import React, {
  useState,
  FC,
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  MapPin,
  X,
  AlertTriangle,
  Check,
  Info,
  Loader2,
} from "lucide-react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { auth, db, storage } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  getDoc,
  doc,
  addDoc,
  collection,
  GeoPoint,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

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

interface Location {
  code: string;
  name: string;
}

interface IncidentReportData {
  incidentType: string;
  description: string;
  location: GeoPoint;
  reporterId: string;
  reporterInfo: { fullName: string; address: object };
  status: "pending" | "verified" | "resolved";
  createdAt: Timestamp;
  imageUrl?: string;
  verifications: string[];
  specificLocation?: {
    region: string;
    province: string;
    city: string;
    barangay: string;
    street?: string;
    psgc: {
      regionCode: string;
      provinceCode: string;
      cityCode: string;
      barangayCode: string;
    };
  };
}

interface LocationMarkerProps {
  markerPosition: [number, number] | null;
  setMarkerPosition: (position: [number, number]) => void;
  isManualMode: boolean;
}

function LocationMarker({
  markerPosition,
  setMarkerPosition,
  isManualMode,
}: LocationMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          setMarkerPosition([lat, lng]);
        }
      },
    }),
    [setMarkerPosition]
  );

  useMapEvents({
    click(e) {
      if (isManualMode) {
        setMarkerPosition([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  return markerPosition === null ? null : (
    <Marker
      position={markerPosition}
      draggable={isManualMode}
      eventHandlers={eventHandlers}
      ref={markerRef}
    >
      <Popup>
        {isManualMode
          ? "You can drag this pin or click anywhere on the map"
          : "This is your detected location"}
      </Popup>
    </Marker>
  );
}

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

export const ReportIncident: FC = () => {
  const navigate = useNavigate();
  const [user, authLoading] = useAuthState(auth);

  const [incidentType, setIncidentType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [mapCenter, setMapCenter] = useState<[number, number]>([
    14.7915, 120.9425,
  ]);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
    null
  );
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string>("");
  const [isLocating, setIsLocating] = useState<boolean>(true);

  const [regionCode, setRegionCode] = useState<string>("");
  const [provinceCode, setProvinceCode] = useState<string>("");
  const [cityCode, setCityCode] = useState<string>("");
  const [barangayCode, setBarangayCode] = useState<string>("");
  const [street, setStreet] = useState<string>("");

  const [regions, setRegions] = useState<Location[]>([]);
  const [provinces, setProvinces] = useState<Location[]>([]);
  const [cities, setCities] = useState<Location[]>([]);
  const [barangays, setBarangays] = useState<Location[]>([]);

  const [addressLoading, setAddressLoading] = useState({
    regions: false,
    provinces: false,
    cities: false,
    barangays: false,
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  useEffect(() => {
    const fetchRegions = async () => {
      setAddressLoading((prev) => ({ ...prev, regions: true }));
      try {
        const response = await fetch("https://psgc.gitlab.io/api/regions/");
        const data = await response.json();
        setRegions(data);
      } catch (e) {
        console.error("Failed to fetch regions", e);
        setError("Could not load address data. Please refresh the page.");
      } finally {
        setAddressLoading((prev) => ({ ...prev, regions: false }));
      }
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    if (regionCode) {
      const fetchProvinces = async () => {
        setAddressLoading((prev) => ({ ...prev, provinces: true }));
        setProvinces([]);
        setCities([]);
        setBarangays([]);
        setProvinceCode("");
        setCityCode("");
        setBarangayCode("");
        try {
          const response = await fetch(
            `https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`
          );
          const data = await response.json();
          setProvinces(data);
        } catch (e) {
          console.error("Failed to fetch provinces", e);
        } finally {
          setAddressLoading((prev) => ({ ...prev, provinces: false }));
        }
      };
      fetchProvinces();
    }
  }, [regionCode]);

  useEffect(() => {
    if (provinceCode) {
      const fetchCities = async () => {
        setAddressLoading((prev) => ({ ...prev, cities: true }));
        setCities([]);
        setBarangays([]);
        setCityCode("");
        setBarangayCode("");
        try {
          const response = await fetch(
            `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`
          );
          const data = await response.json();
          setCities(data);
        } catch (e) {
          console.error("Failed to fetch cities", e);
        } finally {
          setAddressLoading((prev) => ({ ...prev, cities: false }));
        }
      };
      fetchCities();
    }
  }, [provinceCode]);

  useEffect(() => {
    if (cityCode) {
      const fetchBarangays = async () => {
        setAddressLoading((prev) => ({ ...prev, barangays: true }));
        setBarangays([]);
        setBarangayCode("");
        try {
          const response = await fetch(
            `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`
          );
          const data = await response.json();
          setBarangays(data);
        } catch (e) {
          console.error("Failed to fetch barangays", e);
        } finally {
          setAddressLoading((prev) => ({ ...prev, barangays: false }));
        }
      };
      fetchBarangays();
    }
  }, [cityCode]);

  const findMyLocation = () => {
    setIsLocating(true);
    setLocationError("");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPos: [number, number] = [latitude, longitude];
          setMapCenter(newPos);
          setMarkerPosition(newPos);
          setIsLocating(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError(
            "Could not get location. Please enable location access or set manually."
          );
          setIsLocating(false);
          setMarkerPosition([14.7915, 120.9425]);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      setMarkerPosition([14.7915, 120.9425]);
    }
  };

  useEffect(() => {
    findMyLocation();
  }, []);

  const handleManualModeToggle = () => {
    const newMode = !isManualMode;
    setIsManualMode(newMode);
    if (!newMode) {
      findMyLocation();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    if (!markerPosition) {
      setError(locationError || "Please set a location on the map.");
      return;
    }

    if (!incidentType.trim()) {
      setError("Please select an incident type.");
      return;
    }

    if (!description.trim()) {
      setError("Please provide a description.");
      return;
    }

    if (!regionCode || !provinceCode || !cityCode || !barangayCode) {
      setError(
        "Please complete the address information (Region, Province, City/Municipality, and Barangay are required)."
      );
      return;
    }

    setSubmitting(true);

    try {
      const locationToSubmit = new GeoPoint(
        markerPosition[0],
        markerPosition[1]
      );

      let imageUrl = "";
      if (imageFile) {
        const storageRef = ref(
          storage,
          `incidents/${user.uid}-${uuidv4()}-${Date.now()}`
        );
        const uploadResult = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      const userDocRef = doc(db, "students", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        throw new Error(
          "Could not find your student profile. Please ensure your profile is complete."
        );
      }

      const studentData = userDocSnap.data();

      const regionName = regions.find((r) => r.code === regionCode)?.name || "";
      const provinceName =
        provinces.find((p) => p.code === provinceCode)?.name || "";
      const cityName = cities.find((c) => c.code === cityCode)?.name || "";
      const barangayName =
        barangays.find((b) => b.code === barangayCode)?.name || "";

      const reportData: IncidentReportData = {
        incidentType,
        description: description.trim(),
        location: locationToSubmit,
        reporterId: user.uid,
        reporterInfo: {
          fullName: studentData.fullName || "Unknown",
          address: studentData.address || {},
        },
        status: "pending",
        createdAt: Timestamp.now(),
        verifications: [],
        specificLocation: {
          region: regionName,
          province: provinceName,
          city: cityName,
          barangay: barangayName,
          ...(street.trim() && { street: street.trim() }),
          psgc: {
            regionCode,
            provinceCode,
            cityCode,
            barangayCode,
          },
        },
        ...(imageUrl && { imageUrl }),
      };

      await addDoc(collection(db, "reports"), reportData);
      setShowConfirmation(true);

      setIncidentType("");
      setDescription("");
      setRegionCode("");
      setProvinceCode("");
      setCityCode("");
      setBarangayCode("");
      setStreet("");
      removeImage();
    } catch (err: any) {
      console.error("Submit Error:", err);
      setError(err.message || "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image file size must be less than 10MB.");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file.");
        return;
      }

      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
      setError("");
    }
  };

  const removeImage = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }
    setImageFile(null);
    setPreviewImage(null);
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const closeConfirmation = () => {
    setShowConfirmation(false);
    navigate("/student");
  };

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-[#0B1F8C]" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">Please log in to report an incident.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Report Incident</h1>
        <p className="text-gray-500">Submit details about the incident</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
        <Info size={20} className="text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h3 className="font-medium text-blue-800">Community Verification</h3>
          <p className="text-sm text-blue-700 mt-1">
            Your report will be marked as "Pending" until verified by the
            community or authorities.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="incidentType"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Incident Type*
            </label>
            <select
              id="incidentType"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            >
              <option value="" disabled>
                Select incident type
              </option>
              <option value="flood">Flood</option>
              <option value="accident">Traffic Accident</option>
              <option value="fire">Fire</option>
              <option value="medical">Medical Emergency</option>
              <option value="crime">Crime/Security</option>
              <option value="infrastructure">Infrastructure Issue</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Photo (Optional)
            </label>
            {!previewImage ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  <Camera size={40} className="text-gray-400 mb-3" />
                  <p className="text-sm text-gray-500 mb-3 text-center">
                    Upload a photo of the incident (Max 10MB)
                  </p>
                  <label className="bg-[#0B1F8C] text-white py-2 px-6 rounded-lg hover:bg-blue-900 transition duration-200 cursor-pointer">
                    Choose File
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={previewImage}
                  alt="Incident preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={18} className="text-gray-700" />
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Address Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="regionCode"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Region*
                </label>
                <select
                  id="regionCode"
                  value={regionCode}
                  onChange={(e) => setRegionCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                  disabled={addressLoading.regions}
                >
                  <option value="" disabled>
                    {addressLoading.regions ? "Loading..." : "Select Region"}
                  </option>
                  {regions.map((region) => (
                    <option key={region.code} value={region.code}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="provinceCode"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Province*
                </label>
                <select
                  id="provinceCode"
                  value={provinceCode}
                  onChange={(e) => setProvinceCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                  disabled={!regionCode || addressLoading.provinces}
                >
                  <option value="" disabled>
                    {addressLoading.provinces
                      ? "Loading..."
                      : "Select Province"}
                  </option>
                  {provinces.map((province) => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="cityCode"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  City/Municipality*
                </label>
                <select
                  id="cityCode"
                  value={cityCode}
                  onChange={(e) => setCityCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                  disabled={!provinceCode || addressLoading.cities}
                >
                  <option value="" disabled>
                    {addressLoading.cities
                      ? "Loading..."
                      : "Select City/Municipality"}
                  </option>
                  {cities.map((city) => (
                    <option key={city.code} value={city.code}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="barangayCode"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Barangay*
                </label>
                <select
                  id="barangayCode"
                  value={barangayCode}
                  onChange={(e) => setBarangayCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                  disabled={!cityCode || addressLoading.barangays}
                >
                  <option value="" disabled>
                    {addressLoading.barangays
                      ? "Loading..."
                      : "Select Barangay"}
                  </option>
                  {barangays.map((barangay) => (
                    <option key={barangay.code} value={barangay.code}>
                      {barangay.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="street"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Street (Optional)
                </label>
                <input
                  id="street"
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter street name"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Map Location*
              </label>
              <button
                type="button"
                onClick={handleManualModeToggle}
                className="text-sm text-[#0B1F8C] font-medium hover:underline focus:outline-none"
              >
                {isManualMode ? "Use My Location" : "Set Manually on Map"}
              </button>
            </div>

            <div
              className={`rounded-lg p-3 flex items-center text-sm mb-3 ${
                locationError && !isLocating
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-gray-50 text-gray-700 border border-gray-200"
              }`}
            >
              <MapPin size={18} className="mr-2 flex-shrink-0" />
              {isLocating ? (
                <span className="flex items-center">
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Finding your location...
                </span>
              ) : locationError ? (
                <span>{locationError}</span>
              ) : (
                <span>
                  {isManualMode
                    ? "Click anywhere on the map or drag the pin to set the exact location."
                    : "Your current location is pinned. Toggle to manual mode to adjust."}
                </span>
              )}
            </div>

            <div className="h-80 w-full rounded-lg overflow-hidden border border-gray-300 relative">
              {markerPosition ? (
                <MapContainer
                  center={mapCenter}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                  className="z-0"
                >
                  <ChangeView center={mapCenter} zoom={15} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker
                    markerPosition={markerPosition}
                    setMarkerPosition={setMarkerPosition}
                    isManualMode={isManualMode}
                  />
                </MapContainer>
              ) : (
                <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2
                      className="animate-spin text-gray-500 mx-auto mb-2"
                      size={32}
                    />
                    <p className="text-sm text-gray-500">Loading map...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description*
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Please provide a detailed description of the incident..."
              required
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600 flex items-center">
                <AlertTriangle size={16} className="mr-2" />
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#0B1F8C] text-white py-3 px-4 rounded-lg flex items-center justify-center font-medium hover:bg-blue-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            disabled={submitting || !markerPosition || authLoading}
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Submitting Report...
              </>
            ) : (
              "Submit Report"
            )}
          </button>
        </form>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check size={32} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Report Submitted Successfully
              </h3>
              <p className="text-gray-600 mb-4">
                Your incident report has been submitted and is now pending
                verification by the community and authorities.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 w-full">
                <div className="flex items-center">
                  <AlertTriangle
                    size={16}
                    className="text-yellow-600 mr-2 flex-shrink-0"
                  />
                  <p className="text-sm text-yellow-700">
                    Status:{" "}
                    <span className="font-medium">Pending Verification</span>
                  </p>
                </div>
              </div>
              <button
                onClick={closeConfirmation}
                className="w-full bg-[#0B1F8C] text-white py-3 px-6 rounded-lg hover:bg-blue-900 transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};