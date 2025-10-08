import React from "react";

const IncidentTypeBreakdown = ({ typeStats = {}, incidents = [], getTypeColor }) => {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Incident Type Breakdown
            </h2>

            <div className="space-y-4">
                {Object.entries(typeStats).map(([type, stats]) => {
                    const totalIncidents = incidents.length || 1; // avoid division by zero
                    const percentage = (stats.total / totalIncidents) * 100;
                    const resolvedPercentage = (stats.resolved / stats.total) * 100 || 0;
                    const typeColor = getTypeColor(type);

                    return (
                        <div key={type}>
                            {/* Header row */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: typeColor }}
                                    />
                                    <span className="font-medium capitalize">{type}</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                    {stats.total} incidents ({percentage.toFixed(1)}%)
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="relative w-full h-6 bg-gray-100 rounded-full overflow-hidden">
                                {/* Background (total type percentage) */}
                                <div
                                    className="absolute h-full rounded-full"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: typeColor,
                                        opacity: 0.3,
                                    }}
                                />
                                {/* Foreground (resolved portion) */}
                                <div
                                    className="absolute h-full rounded-full"
                                    style={{
                                        width: `${(percentage * resolvedPercentage) / 100}%`,
                                        backgroundColor: typeColor,
                                    }}
                                />
                            </div>

                            {/* Footer stats */}
                            <div className="flex justify-between mt-1 text-xs text-gray-500">
                                <span>{stats.resolved} resolved</span>
                                <span>{stats.pending} pending</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default IncidentTypeBreakdown;
