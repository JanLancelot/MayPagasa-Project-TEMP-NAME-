import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { TrendingUp, TrendingDown, Minus, Calendar, MapPin, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import HeatmapLayer from '@/components/analytics/HeatmapLayer';
import SpatialHeatmapCard from '@/components/analytics/SpatialHeatmapCard';
import IncidentTypeBreakdown from '@/components/analytics/IncidentTypeBreakdown';
import IncidentsOverTime from '@/components/analytics/IncidentsOverTime';

// Component to handle heatmap layer updates

export const Analytics = () => {
    const [timeRange, setTimeRange] = useState('week');
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [hoveredType, setHoveredType] = useState(null);

    useEffect(() => {
        const fetchIncidents = async () => {
            try {
                setLoading(true);
                const snapshot = await getDocs(collection(db, 'reports'));
                const fetched = snapshot.docs.map(doc => {
                    const data = doc.data();

                    // Parse location data more carefully
                    const lat = parseFloat(data.location?.latitude || 0);
                    const lng = parseFloat(data.location?.longitude || 0);

                    return {
                        id: doc.id,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        incidentType: data.incidentType || 'unknown',
                        status: data.status || 'pending',
                        location: {
                            lat: !isNaN(lat) ? lat : 0,
                            lng: !isNaN(lng) ? lng : 0,
                        },
                        description: data.description || '',
                        reporterId: data.reporterId || '',
                        reporterInfo: data.reporterInfo || {},
                    };
                });
                setIncidents(fetched);
            } catch (err) {
                console.error('Error fetching incidents:', err);
            }
            finally {
                setLoading(false);
            }
        };

        fetchIncidents();
    }, []);

    // Process time series data
    const timeSeriesData = useMemo(() => {
        const grouped = {};

        incidents.forEach(incident => {
            let key;
            const date = new Date(incident.createdAt);

            if (timeRange === 'day') {
                key = date.toISOString().split('T')[0];
            } else if (timeRange === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().split('T')[0];
            } else if (timeRange === 'month') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else {
                key = String(date.getFullYear());
            }

            if (!grouped[key]) {
                grouped[key] = { date: key, total: 0 };
            }

            grouped[key].total++;
            grouped[key][incident.incidentType] = (grouped[key][incident.incidentType] || 0) + 1;
        });

        return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date))
    }, [incidents, timeRange]);

    // Calculate rolling average
    const dataWithRollingAvg = useMemo(() => {
        const windowSize = 7;
        return timeSeriesData.map((item, idx) => {
            const start = Math.max(0, idx - windowSize + 1);
            const window = timeSeriesData.slice(start, idx + 1);
            const avg = window.length > 0
                ? window.reduce((sum, d) => sum + d.total, 0) / window.length
                : 0;

            return { ...item, rollingAvg: avg };
        });
    }, [timeSeriesData]);

    // Calculate percentage change
    const percentChange = useMemo(() => {
        if (dataWithRollingAvg.length < 8) return { value: 0, direction: 'neutral' };

        const current = dataWithRollingAvg.slice(-7).reduce((sum, d) => sum + d.total, 0);
        const previous = dataWithRollingAvg.slice(-14, -7).reduce((sum, d) => sum + d.total, 0);

        if (previous === 0) return { value: 0, direction: 'neutral' };

        const change = ((current - previous) / previous) * 100;
        const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

        return { value: Math.abs(change).toFixed(1), direction };
    }, [dataWithRollingAvg]);

    // Get unique incident types
    const incidentTypes = useMemo(() => {
        const types = new Set();
        incidents.forEach(i => types.add(i.incidentType));
        return Array.from(types).sort();
    }, [incidents]);

    // Get incident type statistics
    const typeStats = useMemo(() => {
        const stats = {};
        incidents.forEach(i => {
            if (!stats[i.incidentType]) {
                stats[i.incidentType] = { total: 0, resolved: 0, pending: 0 };
            }
            stats[i.incidentType].total++;
            if (i.status === 'resolved') stats[i.incidentType].resolved++;
            else stats[i.incidentType].pending++;
        });
        return stats;
    }, [incidents]);

    const typeColors = {
        flood: '#3b82f6',
        fire: '#ef4444',
        accident: '#f59e0b',
        medical: '#10b981',
        crime: '#8b5cf6',
        unknown: '#6b7280'
    };

    // Assign colors dynamically for types not in predefined list
    const getTypeColor = (type) => {
        if (typeColors[type]) return typeColors[type];
        const colors = ['#ec4899', '#14b8a6', '#f97316', '#a855f7', '#06b6d4'];
        const index = incidentTypes.indexOf(type) % colors.length;
        return colors[index];
    };

    // Get max value for scaling
    const maxValue = useMemo(() => {
        return Math.max(...dataWithRollingAvg.map(d => d.total), 1);
    }, [dataWithRollingAvg]);

    // Filter incidents for heatmap - now validates coordinates
    const filteredIncidents = useMemo(() => {
        return incidents.filter(incident => {
            const typeMatch = selectedType === 'all' || incident.incidentType === selectedType;
            const statusMatch = selectedStatus === 'all' ||
                (selectedStatus === 'resolved' && incident.status === 'resolved') ||
                (selectedStatus === 'unresolved' && incident.status !== 'resolved');

            // Validate coordinates are valid numbers and not 0,0 (likely invalid)
            const hasValidCoords =
                !isNaN(incident.location.lat) &&
                !isNaN(incident.location.lng) &&
                (incident.location.lat !== 0 || incident.location.lng !== 0);

            return typeMatch && statusMatch && hasValidCoords;
        });
    }, [incidents, selectedType, selectedStatus]);

    // Prepare heatmap points and gradient
    const { heatmapPoints, gradient } = useMemo(() => {
        const points = filteredIncidents.map(inc => [
            inc.location.lat,
            inc.location.lng,
            0.5
        ]);

        let grad;
        if (selectedStatus === 'resolved') {
            grad = { 0.4: '#4ade80', 0.6: '#22c55e', 0.8: '#16a34a', 1: '#15803d' };
        } else if (selectedStatus === 'unresolved') {
            grad = { 0.4: '#fbbf24', 0.6: '#f59e0b', 0.8: '#ef4444', 1: '#dc2626' };
        } else {
            const color = selectedType === 'all' ? '#3b82f6' : getTypeColor(selectedType);
            grad = { 0.4: color + '66', 0.6: color + '99', 0.8: color + 'cc', 1: color };
        }

        return { heatmapPoints: points, gradient: grad };
    }, [filteredIncidents, selectedType, selectedStatus, getTypeColor]);


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading incidents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-gray-900">Incident Analytics</h1>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Incidents</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{incidents.length}</p>
                            </div>
                            <AlertCircle className="text-blue-500" size={40} />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Resolved</p>
                                <p className="text-3xl font-bold text-green-600 mt-1">
                                    {incidents.filter(i => i.status === 'resolved').length}
                                </p>
                            </div>
                            <CheckCircle className="text-green-500" size={40} />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pending</p>
                                <p className="text-3xl font-bold text-orange-600 mt-1">
                                    {incidents.filter(i => i.status !== 'resolved').length}
                                </p>
                            </div>
                            <Clock className="text-orange-500" size={40} />
                        </div>
                    </div>
                </div>

                {/* Change Indicator */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3">
                        <Calendar className="text-gray-600" size={24} />
                        <div>
                            <p className="text-sm text-gray-600">Change vs Previous Period</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl font-bold text-gray-900">{percentChange.value}%</span>
                                {percentChange.direction === 'up' && <TrendingUp className="text-red-500" size={24} />}
                                {percentChange.direction === 'down' && <TrendingDown className="text-green-500" size={24} />}
                                {percentChange.direction === 'neutral' && <Minus className="text-gray-500" size={24} />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time Series Chart */}
                <IncidentsOverTime
                    dataWithRollingAvg={dataWithRollingAvg}
                    incidentTypes={incidentTypes}
                    maxValue={maxValue}
                    getTypeColor={getTypeColor}
                    hoveredType={hoveredType}
                    setHoveredType={setHoveredType}
                    typeStats={typeStats}
                    timeRange={timeRange}
                    setTimeRange={setTimeRange}
                />

                {/* Incident Type Breakdown */}
                <IncidentTypeBreakdown
                    typeStats={typeStats}
                    incidents={incidents}
                    getTypeColor={getTypeColor}
                />

                {/* Heatmap */}
                <SpatialHeatmapCard
                    incidentTypes={incidentTypes}
                    typeStats={typeStats}
                    selectedType={selectedType}
                    setSelectedType={setSelectedType}
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                    filteredIncidents={filteredIncidents}
                    heatmapPoints={heatmapPoints}
                    gradient={gradient}
                    loading={loading}
                />
            </div>
        </div>
    );
};