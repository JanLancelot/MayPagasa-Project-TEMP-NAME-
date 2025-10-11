import { useState, useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import SpatialHeatmapCard from '@/components/analytics/SpatialHeatmapCard';
import IncidentTypeBreakdown from '@/components/analytics/IncidentTypeBreakdown';
import IncidentsOverTime from '@/components/analytics/IncidentsOverTime';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import ExportMenu from '@/components/analytics/ExportMenu';
import StatCard, { ForecastCard, PeakTimeCard } from '@/components/analytics/StatCard';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface Location {
    lat: number;
    lng: number;
}

interface ReporterInfo {
    fullName?: string;
    address?: {
        houseNumber?: string;
        street?: string;
        province?: string;
        region?: string;
        barangay?: string;
        city?: string;
        psgc?: {
            provinceCode?: string;
            barangayCode?: string;
            cityCode?: string;
            regionCode?: string;
        };
    };
}

interface Incident {
    id: string;
    createdAt: Date;
    incidentType: string;
    status: string;
    resolvedAt: Date | null;
    location: Location;
    description: string;
    reporterId: string;
    reporterInfo: ReporterInfo;
}

interface DateRangeFilter {
    start: string | null;
    end: string | null;
}

interface TimeSeriesData {
    date: string;
    total: number;
    [key: string]: number | string;
}

interface DataWithRollingAvg extends TimeSeriesData {
    rollingAvg: number;
}

interface TypeStats {
    [key: string]: {
        total: number;
        resolved: number;
        pending: number;
    };
}

interface PeakTimeAnalysis {
    hourCounts: number[];
    dayCounts: number[];
    peakHour: number;
    peakDay: string;
    peakDayIndex: number;
    hourlyData: { hour: number; count: number }[];
    dailyData: { day: string; count: number }[];
}

interface ForecastNextPeriod {
    forecast: number;
    trend: 'increasing' | 'decreasing' | 'stable';
}

interface TypeColors {
    [key: string]: string;
}

export const Analytics = () => {
    const [timeRange, setTimeRange] = useState<string>('week');
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedType, setSelectedType] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [hoveredType, setHoveredType] = useState<string | null>(null);
    const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>({ start: null, end: null });
    const [showDateFilter, setShowDateFilter] = useState<boolean>(false);

    useEffect(() => {
        const fetchIncidents = async () => {
            try {
                setLoading(true);
                const snapshot = await getDocs(collection(db, 'reports'));
                const fetched: Incident[] = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const lat = parseFloat(data.location?.latitude || 0);
                    const lng = parseFloat(data.location?.longitude || 0);

                    return {
                        id: doc.id,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        incidentType: data.incidentType || 'unknown',
                        status: data.status || 'pending',
                        resolvedAt: data.resolvedAt?.toDate() || null,
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
            } finally {
                setLoading(false);
            }
        };

        fetchIncidents();
    }, []);

    // Filter incidents by date range
    const dateFilteredIncidents = useMemo(() => {
        if (!dateRangeFilter.start && !dateRangeFilter.end) return incidents;

        return incidents.filter(inc => {
            const incDate = new Date(inc.createdAt);
            if (dateRangeFilter.start && incDate < new Date(dateRangeFilter.start)) return false;
            if (dateRangeFilter.end && incDate > new Date(dateRangeFilter.end)) return false;
            return true;
        });
    }, [incidents, dateRangeFilter]);

    const incidentTypes = useMemo(() => {
        const types = new Set<string>();
        dateFilteredIncidents.forEach(i => types.add(i.incidentType));
        return Array.from(types).sort();
    }, [dateFilteredIncidents]);

    const timeSeriesData = useMemo<TimeSeriesData[]>(() => {
        const grouped: { [key: string]: TimeSeriesData } = {};

        dateFilteredIncidents.forEach(incident => {
            let date: Date;
            try {
                date = new Date(incident.createdAt);
                if (isNaN(date.getTime())) {
                    console.warn('Invalid date:', incident.createdAt);
                    return;
                }
            } catch (e) {
                console.warn('Error parsing date:', incident.createdAt);
                return;
            }

            let key: string;

            if (timeRange === 'day') {
                key = date.toISOString().split('T')[0];
            } else if (timeRange === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().split('T')[0];
            } else if (timeRange === 'month') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else if (timeRange === 'year') {
                key = String(date.getFullYear());
            } else {
                key = date.toISOString().split('T')[0];
            }

            if (!grouped[key]) {
                grouped[key] = { date: key, total: 0 };
            }

            grouped[key].total++;
            grouped[key][incident.incidentType] = ((grouped[key][incident.incidentType] as number) || 0) + 1;
        });

        return Object.values(grouped).sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    }, [dateFilteredIncidents, timeRange]);

    const dataWithRollingAvg = useMemo<DataWithRollingAvg[]>(() => {
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

    const typeStats = useMemo<TypeStats>(() => {
        const stats: TypeStats = {};
        dateFilteredIncidents.forEach(i => {
            if (!stats[i.incidentType]) {
                stats[i.incidentType] = { total: 0, resolved: 0, pending: 0 };
            }
            stats[i.incidentType].total++;
            if (i.status === 'resolved') stats[i.incidentType].resolved++;
            else stats[i.incidentType].pending++;
        });
        return stats;
    }, [dateFilteredIncidents]);

    // Peak time analysis
    const peakTimeAnalysis = useMemo<PeakTimeAnalysis>(() => {
        const hourCounts = Array(24).fill(0);
        const dayCounts = Array(7).fill(0);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        dateFilteredIncidents.forEach(inc => {
            const date = new Date(inc.createdAt);
            hourCounts[date.getHours()]++;
            dayCounts[date.getDay()]++;
        });

        const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
        const peakDay = dayCounts.indexOf(Math.max(...dayCounts));

        return {
            hourCounts,
            dayCounts,
            peakHour,
            peakDay: dayNames[peakDay],
            peakDayIndex: peakDay,
            hourlyData: hourCounts.map((count, hour) => ({ hour, count })),
            dailyData: dayCounts.map((count, day) => ({ day: dayNames[day], count }))
        };
    }, [dateFilteredIncidents]);

    const forecastNextPeriod = useMemo<ForecastNextPeriod | null>(() => {
        if (dataWithRollingAvg.length < 4) return null;

        const recent = dataWithRollingAvg.slice(-4);
        const avgGrowth = recent.slice(1).reduce((sum, item, idx) => {
            return sum + (item.total - recent[idx].total);
        }, 0) / (recent.length - 1);

        const lastValue = recent[recent.length - 1].total;
        const forecast = Math.max(0, Math.round(lastValue + avgGrowth));

        return {
            forecast,
            trend: avgGrowth > 0 ? 'increasing' : avgGrowth < 0 ? 'decreasing' : 'stable'
        };
    }, [dataWithRollingAvg]);

    const typeColors: TypeColors = {
        flood: '#3b82f6',
        fire: '#ef4444',
        accident: '#f59e0b',
        medical: '#10b981',
        crime: '#8b5cf6',
        unknown: '#6b7280'
    };

    const getTypeColor = (type: string): string => {
        if (typeColors[type]) return typeColors[type];
        const colors = ['#ec4899', '#14b8a6', '#f97316', '#a855f7', '#06b6d4'];
        const index = incidentTypes.indexOf(type) % colors.length;
        return colors[index];
    };

    const maxValue = useMemo(() => {
        return Math.max(...dataWithRollingAvg.map(d => d.total), 1);
    }, [dataWithRollingAvg]);

    const filteredIncidents = useMemo(() => {
        return dateFilteredIncidents.filter(incident => {
            const typeMatch = selectedType === 'all' || incident.incidentType === selectedType;
            const statusMatch = selectedStatus === 'all' ||
                (selectedStatus === 'resolved' && incident.status === 'resolved') ||
                (selectedStatus === 'unresolved' && incident.status !== 'resolved');

            const hasValidCoords =
                !isNaN(incident.location.lat) &&
                !isNaN(incident.location.lng) &&
                (incident.location.lat !== 0 || incident.location.lng !== 0);

            return typeMatch && statusMatch && hasValidCoords;
        });
    }, [dateFilteredIncidents, selectedType, selectedStatus]);

    const { heatmapPoints, gradient } = useMemo(() => {
        const points: [number, number, number][] = filteredIncidents.map(inc => [
            inc.location.lat,
            inc.location.lng,
            0.5
        ]);

        let grad: { [key: number]: string };
        if (selectedStatus === 'resolved') {
            grad = { 0.4: '#4ade80', 0.6: '#22c55e', 0.8: '#16a34a', 1: '#15803d' };
        } else if (selectedStatus === 'unresolved') {
            grad = { 0.4: '#fbbf24', 0.6: '#f59e0b', 0.8: '#ef4444', 1: '#dc2626' };
        } else {
            const color = selectedType === 'all' ? '#3b82f6' : getTypeColor(selectedType);
            grad = { 0.4: color + '66', 0.6: color + '99', 0.8: color + 'cc', 1: color };
        }

        return { heatmapPoints: points, gradient: grad };
    }, [filteredIncidents, selectedType, selectedStatus]);

    // Export Functions
    const exportToCSV = () => {
        const headers = ['ID', 'Date', 'Type', 'Status', 'Latitude', 'Longitude', 'Description', 'Response Time (hours)'];
        const rows = dateFilteredIncidents.map(inc => {
            const responseTime = inc.resolvedAt
                ? ((inc.resolvedAt.getTime() - inc.createdAt.getTime()) / (1000 * 60 * 60)).toFixed(1)
                : 'N/A';
            return [
                inc.id,
                inc.createdAt.toISOString(),
                inc.incidentType,
                inc.status,
                inc.location.lat,
                inc.location.lng,
                `"${inc.description.replace(/"/g, '""')}"`,
                responseTime
            ];
        });

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        downloadFile(csv, `incidents-data-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    };

    const exportSummaryReport = () => {
        const report = `INCIDENT ANALYTICS REPORT
Generated: ${new Date().toLocaleString()}
${dateRangeFilter.start || dateRangeFilter.end ? `Date Range: ${dateRangeFilter.start || 'Beginning'} to ${dateRangeFilter.end || 'Present'}` : 'All Time Data'}

SUMMARY STATISTICS
==================
Total Incidents: ${dateFilteredIncidents.length}
Resolved: ${dateFilteredIncidents.filter(i => i.status === 'resolved').length}
Pending: ${dateFilteredIncidents.filter(i => i.status !== 'resolved').length}

PEAK TIME ANALYSIS
==================
Busiest Hour: ${peakTimeAnalysis.peakHour}:00 - ${peakTimeAnalysis.peakHour + 1}:00
Busiest Day: ${peakTimeAnalysis.peakDay}

INCIDENT BREAKDOWN BY TYPE
==========================
${Object.entries(typeStats).map(([type, stats]) =>
            `${type.toUpperCase()}:
    Total: ${stats.total}
    Resolved: ${stats.resolved}
    Pending: ${stats.pending}
    Resolution Rate: ${((stats.resolved / stats.total) * 100).toFixed(1)}%`
        ).join('\n\n')}

TIME SERIES DATA (Last 10 Periods)
==================================
${dataWithRollingAvg.slice(-10).map(d =>
            `${d.date}: ${d.total} incidents (7-day avg: ${d.rollingAvg.toFixed(1)})`
        ).join('\n')}
`;

        downloadFile(report, `analytics-report-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
    };

    const exportToJSON = () => {
        const exportData = {
            generatedAt: new Date().toISOString(),
            dateRange: dateRangeFilter,
            summary: {
                total: dateFilteredIncidents.length,
                resolved: dateFilteredIncidents.filter(i => i.status === 'resolved').length,
                pending: dateFilteredIncidents.filter(i => i.status !== 'resolved').length,
            },
            peakTimes: {
                peakHour: peakTimeAnalysis.peakHour,
                peakDay: peakTimeAnalysis.peakDay,
                hourlyData: peakTimeAnalysis.hourlyData,
                dailyData: peakTimeAnalysis.dailyData
            },
            typeBreakdown: typeStats,
            timeSeries: dataWithRollingAvg,
            incidents: dateFilteredIncidents.map(inc => ({
                id: inc.id,
                createdAt: inc.createdAt.toISOString(),
                type: inc.incidentType,
                status: inc.status,
                location: inc.location,
                description: inc.description,
                responseTime: inc.resolvedAt ? ((inc.resolvedAt.getTime() - inc.createdAt.getTime()) / (1000 * 60 * 60)).toFixed(1) : null
            }))
        };

        downloadFile(JSON.stringify(exportData, null, 2), `analytics-data-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    };

    const exportToExcel = () => {
        if (!dateFilteredIncidents || dateFilteredIncidents.length === 0) return;

        const data = dateFilteredIncidents.map((inc) => {
            const createdAt = new Date(inc.createdAt);
            const resolvedAt = inc.resolvedAt ? new Date(inc.resolvedAt) : null;
            const responseTime = resolvedAt
                ? ((resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)).toFixed(1)
                : "N/A";

            return {
                ID: inc.id,
                Date: createdAt.toISOString(),
                Type: inc.incidentType,
                Status: inc.status,
                Latitude: inc.location.lat,
                Longitude: inc.location.lng,
                Description: inc.description,
                "Response Time (hours)": responseTime
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Incidents");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        saveAs(blob, `incident-report-${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const clearDateFilter = () => {
        setDateRangeFilter({ start: null, end: null });
    };

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
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className='flex flex-col gap-2'>
                        <h1 className="text-3xl font-bold text-gray-900">Incident Analytics</h1>
                        <span className="text-gray-500 text-sm">
                            Gain insights into incident trends, frequency, and patterns across different locations and time periods.
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Date Range Filter */}
                        <DateRangeFilter
                            dateRangeFilter={dateRangeFilter}
                            setDateRangeFilter={setDateRangeFilter}
                            showDateFilter={showDateFilter}
                            setShowDateFilter={setShowDateFilter}
                            clearDateFilter={clearDateFilter}
                        />

                        {/* Export Button */}
                        <ExportMenu
                            onExportCSV={exportToCSV}
                            onExportSummary={exportSummaryReport}
                            onExportJSON={exportToJSON}
                            onExportExcel={exportToExcel}
                        />
                    </div>
                </div>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        label="Total Incidents"
                        value={dateFilteredIncidents.length}
                        icon={AlertCircle}
                        iconColor="text-blue-500"
                    />
                    <StatCard
                        label="Resolved"
                        value={dateFilteredIncidents.filter(i => i.status === 'resolved').length}
                        icon={CheckCircle}
                        iconColor="text-green-500"
                        valueColor="text-green-600"
                    />
                    <StatCard
                        label="Pending"
                        value={dateFilteredIncidents.filter(i => i.status !== 'resolved').length}
                        icon={Clock}
                        iconColor="text-orange-500"
                        valueColor="text-orange-600"
                    />
                </div>
                {forecastNextPeriod && (
                    <ForecastCard
                        forecast={forecastNextPeriod.forecast}
                        trend={forecastNextPeriod.trend}
                    />
                )}

                <PeakTimeCard
                    peakHour={peakTimeAnalysis.peakHour}
                    peakDay={peakTimeAnalysis.peakDay}
                />

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
                    incidents={dateFilteredIncidents}
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