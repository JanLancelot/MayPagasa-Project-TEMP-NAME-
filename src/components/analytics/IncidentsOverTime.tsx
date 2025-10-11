import React from 'react';

interface DataPoint {
    date: string;
    rollingAvg: number;
    [key: string]: number | string;
}

interface TypeStats {
    [key: string]: {
        total: number;
        [key: string]: any;
    };
}

interface IncidentsOverTimeProps {
    dataWithRollingAvg: DataPoint[];
    incidentTypes: string[];
    maxValue: number;
    getTypeColor: (type: string) => string;
    hoveredType: string | null;
    setHoveredType: (type: string | null) => void;
    typeStats: TypeStats;
    timeRange: string;
    setTimeRange: (range: string) => void;
}

const IncidentsOverTime: React.FC<IncidentsOverTimeProps> = ({
    dataWithRollingAvg,
    incidentTypes,
    maxValue,
    getTypeColor,
    hoveredType,
    setHoveredType,
    typeStats,
    timeRange,
    setTimeRange
}) => {
    return (
        <>
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Incidents Over Time</h2>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                        <option value="day">Daily</option>
                        <option value="week">Weekly</option>
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                    </select>
                </div>

                {dataWithRollingAvg.length > 0 ? (
                    <>
                        <div className="relative" style={{ height: '400px' }}>
                            <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="none" className="overflow-visible">
                                {/* Y-axis */}
                                {[0, 1, 2, 3, 4].map(i => {
                                    const value = Math.round((maxValue * (4 - i)) / 4);
                                    const y = i * 100;
                                    return (
                                        <g key={i}>
                                            <line
                                                x1="60"
                                                y1={y}
                                                x2="780"
                                                y2={y}
                                                stroke="#e5e7eb"
                                                strokeWidth="1"
                                            />
                                            <text x="5" y={y} dy="4" fontSize="12" fill="#6b7280">
                                                {value}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Incident lines */}
                                {incidentTypes.map(type => {
                                    const points = dataWithRollingAvg
                                        .map((d, i) => {
                                            const x = 60 + ((i / (dataWithRollingAvg.length - 1)) * 720);
                                            const y = 380 - ((Number(d[type]) || 0) / maxValue) * 360;
                                            return `${x},${y}`;
                                        })
                                        .join(' ');

                                    return (
                                        <polyline
                                            key={type}
                                            points={points}
                                            fill="none"
                                            stroke={getTypeColor(type)}
                                            strokeWidth={hoveredType === type ? '3' : '2'}
                                            opacity={hoveredType && hoveredType !== type ? '0.3' : '1'}
                                            className="transition-all duration-200"
                                        />
                                    );
                                })}

                                {/* Rolling average line */}
                                <polyline
                                    points={dataWithRollingAvg
                                        .map((d, i) => {
                                            const x = 60 + ((i / (dataWithRollingAvg.length - 1)) * 720);
                                            const y = 380 - (d.rollingAvg / maxValue) * 360;
                                            return `${x},${y}`;
                                        })
                                        .join(' ')}
                                    fill="none"
                                    stroke="#1f2937"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                />
                            </svg>

                            {/* X-axis */}
                            <div className="flex justify-between mt-2 px-12 text-xs text-gray-600">
                                {[0, Math.floor(dataWithRollingAvg.length / 2), dataWithRollingAvg.length - 1].map(i => (
                                    <span key={i}>{dataWithRollingAvg[i]?.date}</span>
                                ))}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mt-6 justify-center">
                            {incidentTypes.map(type => (
                                <button
                                    key={type}
                                    className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                                    onMouseEnter={() => setHoveredType(type)}
                                    onMouseLeave={() => setHoveredType(null)}
                                >
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: getTypeColor(type) }}
                                    />
                                    <span className="text-sm capitalize">{type}</span>
                                    <span className="text-xs text-gray-500">
                                        ({typeStats[type]?.total || 0})
                                    </span>
                                </button>
                            ))}
                            <div className="flex items-center gap-2 px-3 py-1">
                                <span className="w-6 h-0.5 bg-gray-800" style={{ borderTop: '2px dashed' }} />
                                <span className="text-sm">7-day Avg</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        No data available for the selected time range
                    </div>
                )}
            </div>
        </>
    );
};

export default IncidentsOverTime;