import { LucideIcon, TrendingUp, Clock } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: number;
    icon: LucideIcon;
    iconColor: string;
    valueColor?: string;
}

export default function StatCard({ label, value, icon: Icon, iconColor, valueColor = 'text-gray-900' }: StatCardProps) {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600">{label}</p>
                    <p className={`text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
                </div>
                <Icon className={iconColor} size={40} />
            </div>
        </div>
    );
}

interface ForecastCardProps {
    forecast: number;
    trend: string;
}

export function ForecastCard({ forecast, trend }: ForecastCardProps) {
    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Next Period Forecast</h3>
                    <p className="text-4xl font-bold text-blue-600 mb-2">{forecast}</p>
                    <p className="text-sm text-gray-600">
                        Predicted incidents - Trend: <span className="font-semibold capitalize">{trend}</span>
                    </p>
                </div>
                <TrendingUp className="text-blue-400" size={32} />
            </div>
        </div>
    );
}

interface PeakTimeCardProps {
    peakHour: number;
    peakDay: string;
}

export function PeakTimeCard({ peakHour, peakDay }: PeakTimeCardProps) {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
                <Clock className="text-gray-600" size={24} />
                <div>
                    <p className="text-sm text-gray-600">Peak Time</p>
                    <div className="mt-1">
                        <span className="text-lg font-bold text-gray-900">{peakHour}:00</span>
                        <span className="text-sm text-gray-600 ml-2">({peakDay})</span>
                    </div>
                </div>
            </div>
        </div>
    );
}