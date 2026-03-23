import { useState } from 'react';
import { isCarsTranslation } from '../Config.ts';

interface CarMaintenanceReportButtonProps {
  dataTypeId?: string | null;
}

export function CarMaintenanceReportButton({ dataTypeId }: CarMaintenanceReportButtonProps) {
  const isCarsInstance = isCarsTranslation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isCarsInstance) return null; // <-- only show in Cars Mode

  const downloadReport = async () => {
    if (!dataTypeId) {
      setError('Select a car or data item first.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/izipublish/api/report/car?dataTypeId=${dataTypeId}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to generate report.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `car-maintenance-report-${dataTypeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unknown error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <button
        className="btn btn-primary w-100"
        onClick={downloadReport}
        disabled={loading || !dataTypeId}
      >
        {loading ? 'Generating PDF…' : 'Download Car Maintenance Report'}
      </button>
      {error && <p style={{ color: 'red', marginTop: 4 }}>{error}</p>}
    </div>
  );
}
