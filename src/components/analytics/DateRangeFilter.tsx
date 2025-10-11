import React from 'react';
import { Filter } from 'lucide-react';

interface DateRange {
    start: string | null;
    end: string | null;
}

interface DateRangeFilterProps {
    dateRangeFilter: DateRange;
    setDateRangeFilter: React.Dispatch<React.SetStateAction<DateRange>>;
    showDateFilter: boolean;
    setShowDateFilter: React.Dispatch<React.SetStateAction<boolean>>;
    clearDateFilter: () => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
    dateRangeFilter,
    setDateRangeFilter,
    showDateFilter,
    setShowDateFilter,
    clearDateFilter,
}) => {
    return (
        <div className="relative inline-block">
            <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${dateRangeFilter.start || dateRangeFilter.end
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
            >
                <Filter size={20} />
                Date Filter
                {(dateRangeFilter.start || dateRangeFilter.end) && (
                    <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                        Active
                    </span>
                )}
            </button>

            {showDateFilter && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10 p-4">
                    <div className="space-y-3">
                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={dateRangeFilter.start || ''}
                                onChange={(e) =>
                                    setDateRangeFilter((prev) => ({
                                        ...prev,
                                        start: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* End Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={dateRangeFilter.end || ''}
                                onChange={(e) =>
                                    setDateRangeFilter((prev) => ({
                                        ...prev,
                                        end: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    clearDateFilter();
                                    setShowDateFilter(false);
                                }}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => setShowDateFilter(false)}
                                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
