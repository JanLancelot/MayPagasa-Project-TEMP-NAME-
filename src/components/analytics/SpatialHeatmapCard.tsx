import React from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Clock } from "lucide-react";
import HeatmapLayer from "./HeatmapLayer";

interface TypeStats {
    [key: string]: {
        total: number;
        [key: string]: any;
    };
}

interface Incident {
    [key: string]: any;
}

interface SpatialHeatmapCardProps {
    incidentTypes?: string[];
    typeStats?: TypeStats;
    selectedType: string;
    selectedStatus: string;
    setSelectedType: (type: string) => void;
    setSelectedStatus: (status: string) => void;
    filteredIncidents?: Incident[];
    heatmapPoints?: [number, number, number?][];
    gradient?: { [key: number]: string };
    loading: boolean;
}

const SpatialHeatmapCard: React.FC<SpatialHeatmapCardProps> = ({
    incidentTypes = [],
    typeStats = {},
    selectedType,
    selectedStatus,
    setSelectedType,
    setSelectedStatus,
    filteredIncidents = [],
    heatmapPoints = [],
    gradient,
    loading,
}) => {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-4">
                    <MapPin className="text-gray-600" size={24} />
                    <h2 className="text-xl font-semibold text-gray-900">
                        Spatial Distribution Heatmap
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Incident Type
                        </label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="all">All Types</option>
                            {incidentTypes.map((type) => (
                                <option key={type} value={type} className="capitalize">
                                    {type} ({typeStats[type]?.total || 0})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Status
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="all">All Statuses</option>
                            <option value="resolved">Resolved Only</option>
                            <option value="unresolved">Unresolved Only</option>
                        </select>
                    </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                    Showing: {filteredIncidents.length} incident
                    {filteredIncidents.length !== 1 ? "s" : ""}
                </div>
            </div>
            <div className="w-full h-96 rounded-lg overflow-hidden border relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                        <Clock className="w-8 h-8 animate-spin mb-2 text-gray-700" />
                        <p>Loading incidents...</p>
                    </div>
                )}
                <MapContainer
                    center={[14.84, 120.95]}
                    zoom={12}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        attribution="&copy; CartoDB"
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    <HeatmapLayer points={heatmapPoints} gradient={gradient} />
                </MapContainer>
            </div>
        </div>
    );
};

export default SpatialHeatmapCard;