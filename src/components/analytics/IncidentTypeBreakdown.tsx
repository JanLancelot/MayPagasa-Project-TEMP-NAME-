import React from "react";

interface TypeStats {
  total: number;
  resolved: number;
  pending: number;
}

interface IncidentTypeBreakdownProps {
  typeStats: Record<string, TypeStats>;
  incidents: any[];
  getTypeColor: (type: string) => string;
}

const IncidentTypeBreakdown: React.FC<IncidentTypeBreakdownProps> = ({
  typeStats = {},
  incidents = [],
  getTypeColor,
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Incident Type Breakdown
      </h2>

      <div className="space-y-4">
        {Object.entries(typeStats).map(([type, stats]) => {
          const totalIncidents = incidents.length || 1; // Avoid division by zero
          const percentage = (stats.total / totalIncidents) * 100;
          const resolvedPercentage =
            stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0;
          const typeColor = getTypeColor(type);

          return (
            <div key={type}>
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
              <div className="relative w-full h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute h-full rounded-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: typeColor,
                    opacity: 0.3,
                  }}
                />
                <div
                  className="absolute h-full rounded-full"
                  style={{
                    width: `${(percentage * resolvedPercentage) / 100}%`,
                    backgroundColor: typeColor,
                  }}
                />
              </div>
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
