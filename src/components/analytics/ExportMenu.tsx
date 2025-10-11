import { useState } from 'react';
import { Download, Table, FileText } from 'lucide-react';

interface ExportMenuProps {
  onExportCSV: () => void;
  onExportSummary: () => void;
  onExportJSON: () => void;
  onExportExcel: () => void; // 👈 add this
}

export default function ExportMenu({ onExportCSV, onExportSummary, onExportJSON, onExportExcel }: ExportMenuProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = (exportFn: () => void) => {
    exportFn();
    setShowExportMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowExportMenu(!showExportMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Download size={20} />
        Export
      </button>

      {showExportMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <button
            onClick={() => handleExport(onExportCSV)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
          >
            <Table size={18} className="text-green-600" />
            <div>
              <div className="font-medium text-gray-900">CSV Export</div>
              <div className="text-xs text-gray-500">Raw incident data</div>
            </div>
          </button>

          <button
            onClick={() => handleExport(onExportSummary)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100"
          >
            <FileText size={18} className="text-blue-600" />
            <div>
              <div className="font-medium text-gray-900">Summary Report</div>
              <div className="text-xs text-gray-500">Complete analysis</div>
            </div>
          </button>

          <button
            onClick={() => handleExport(onExportJSON)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100"
          >
            <FileText size={18} className="text-purple-600" />
            <div>
              <div className="font-medium text-gray-900">JSON Export</div>
              <div className="text-xs text-gray-500">Full analytics data</div>
            </div>
          </button>
          <button
            onClick={() => handleExport(onExportExcel)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100"
          >
            <FileText size={18} className="text-yellow-600" />
            <div>
              <div className="font-medium text-gray-900">Excel Export</div>
              <div className="text-xs text-gray-500">Formatted spreadsheet</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}