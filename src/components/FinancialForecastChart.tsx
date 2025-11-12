import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ForecastChartProps {
  historicalData: any[];
  forecasts: any[];
  metric: 'revenue' | 'charges' | 'profit' | 'cashflow';
}

export const FinancialForecastChart = ({ historicalData, forecasts, metric }: ForecastChartProps) => {
  const getMetricLabel = () => {
    switch (metric) {
      case 'revenue': return 'Revenus';
      case 'charges': return 'Charges';
      case 'profit': return 'Bénéfice';
      case 'cashflow': return 'Cash-flow';
    }
  };

  const getMetricKey = (isProjection: boolean) => {
    if (isProjection) {
      switch (metric) {
        case 'revenue': return 'projectedRevenue';
        case 'charges': return 'projectedCharges';
        case 'profit': return 'projectedProfit';
        case 'cashflow': return 'projectedCashFlow';
      }
    } else {
      switch (metric) {
        case 'revenue': return 'revenue';
        case 'charges': return 'charges';
        case 'profit': return 'netProfit';
        case 'cashflow': return 'cashFlow';
      }
    }
  };

  const getColor = () => {
    switch (metric) {
      case 'revenue': return '#10b981';
      case 'charges': return '#ef4444';
      case 'profit': return '#8b5cf6';
      case 'cashflow': return '#06b6d4';
    }
  };

  // Combiner données historiques et prévisions
  const combinedData = [
    ...historicalData.map(d => ({
      month: format(d.date, 'MMM yy', { locale: fr }),
      date: d.date,
      actual: d[getMetricKey(false)],
      projected: null,
      isHistorical: true,
    })),
    ...forecasts.map(f => ({
      month: format(f.date, 'MMM yy', { locale: fr }),
      date: f.date,
      actual: null,
      projected: f[getMetricKey(true)],
      confidence: f.confidence,
      isHistorical: false,
    })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prévisions: {getMetricLabel()}</CardTitle>
        <CardDescription>
          Historique et projection sur les prochains mois
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: any) => `${Number(value).toLocaleString()} FCFA`}
              labelFormatter={(label) => `Mois: ${label}`}
            />
            <Legend />
            
            {/* Ligne de référence à 0 pour profit/cashflow */}
            {(metric === 'profit' || metric === 'cashflow') && (
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
            )}
            
            {/* Données historiques */}
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke={getColor()}
              strokeWidth={3}
              dot={{ fill: getColor(), r: 4 }}
              name="Réel"
              connectNulls={false}
            />
            
            {/* Prévisions */}
            <Line 
              type="monotone" 
              dataKey="projected" 
              stroke={getColor()}
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={{ fill: getColor(), r: 4, strokeDasharray: '0' }}
              name="Prévision"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
        
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5" style={{ backgroundColor: getColor() }} />
            <span>Données réelles</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed" style={{ borderColor: getColor() }} />
            <span>Prévisions</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
