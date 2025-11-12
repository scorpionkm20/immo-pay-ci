import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyData {
  month: string;
  date: Date;
  revenue: number;
  charges: number;
  netProfit: number;
  cashFlow: number;
}

interface Forecast {
  month: string;
  date: Date;
  projectedRevenue: number;
  projectedCharges: number;
  projectedProfit: number;
  projectedCashFlow: number;
  confidence: number; // 0-100%
}

interface Alert {
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  metric: string;
  trend: number; // pourcentage de changement
}

export const useFinancialForecasts = (spaceId?: string, forecastMonths: number = 6) => {
  const [historicalData, setHistoricalData] = useState<MonthlyData[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (spaceId) {
      fetchAndCalculateForecasts();
    }
  }, [spaceId, forecastMonths]);

  const fetchAndCalculateForecasts = async () => {
    if (!spaceId) return;

    setLoading(true);
    try {
      // Récupérer les 12 derniers mois de données
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const [paymentsRes, chargesRes] = await Promise.all([
        supabase
          .from('payments')
          .select('montant, statut, mois_paiement, date_paiement')
          .eq('space_id', spaceId)
          .gte('mois_paiement', twelveMonthsAgo.toISOString()),
        supabase
          .from('property_charges')
          .select('montant, date_charge')
          .eq('space_id', spaceId)
          .gte('date_charge', twelveMonthsAgo.toISOString()),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (chargesRes.error) throw chargesRes.error;

      // Organiser les données par mois
      const monthlyMap = new Map<string, MonthlyData>();
      
      // Traiter les paiements
      paymentsRes.data?.forEach(payment => {
        if (payment.statut !== 'valide') return;
        
        const date = new Date(payment.mois_paiement);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthKey,
            date,
            revenue: 0,
            charges: 0,
            netProfit: 0,
            cashFlow: 0,
          });
        }
        
        const monthData = monthlyMap.get(monthKey)!;
        monthData.revenue += Number(payment.montant);
      });

      // Traiter les charges
      chargesRes.data?.forEach(charge => {
        const date = new Date(charge.date_charge);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthKey,
            date,
            revenue: 0,
            charges: 0,
            netProfit: 0,
            cashFlow: 0,
          });
        }
        
        const monthData = monthlyMap.get(monthKey)!;
        monthData.charges += Number(charge.montant);
      });

      // Calculer les métriques
      const historical = Array.from(monthlyMap.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((data, index, arr) => {
          data.netProfit = data.revenue - data.charges;
          // Cash flow cumulé
          data.cashFlow = index === 0 
            ? data.netProfit 
            : arr[index - 1].cashFlow + data.netProfit;
          return data;
        });

      setHistoricalData(historical);

      // Calculer les prévisions
      const predictions = calculateForecasts(historical, forecastMonths);
      setForecasts(predictions);

      // Détecter les alertes
      const detectedAlerts = detectAlerts(historical, predictions);
      setAlerts(detectedAlerts);

    } catch (error) {
      console.error('Erreur lors du calcul des prévisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateForecasts = (historical: MonthlyData[], months: number): Forecast[] => {
    if (historical.length < 3) {
      // Pas assez de données historiques
      return [];
    }

    // Calculer les moyennes et tendances
    const recentMonths = historical.slice(-6); // Derniers 6 mois
    const avgRevenue = recentMonths.reduce((sum, d) => sum + d.revenue, 0) / recentMonths.length;
    const avgCharges = recentMonths.reduce((sum, d) => sum + d.charges, 0) / recentMonths.length;

    // Calculer la tendance (régression linéaire simple)
    const revenueTrend = calculateTrend(recentMonths.map(d => d.revenue));
    const chargesTrend = calculateTrend(recentMonths.map(d => d.charges));

    // Générer les prévisions
    const predictions: Forecast[] = [];
    const lastDate = historical[historical.length - 1].date;
    let cumulativeCashFlow = historical[historical.length - 1].cashFlow;

    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      // Prévision avec tendance
      const projectedRevenue = Math.max(0, avgRevenue + (revenueTrend * i));
      const projectedCharges = Math.max(0, avgCharges + (chargesTrend * i));
      const projectedProfit = projectedRevenue - projectedCharges;
      cumulativeCashFlow += projectedProfit;

      // Calculer la confiance (diminue avec le temps)
      const confidence = Math.max(50, 95 - (i * 7));

      predictions.push({
        month: `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`,
        date: forecastDate,
        projectedRevenue,
        projectedCharges,
        projectedProfit,
        projectedCashFlow: cumulativeCashFlow,
        confidence,
      });
    }

    return predictions;
  };

  const calculateTrend = (values: number[]): number => {
    if (values.length < 2) return 0;

    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  };

  const detectAlerts = (historical: MonthlyData[], forecasts: Forecast[]): Alert[] => {
    const alerts: Alert[] = [];

    if (historical.length < 3) return alerts;

    const recentMonths = historical.slice(-3);
    const avgRevenue = recentMonths.reduce((sum, d) => sum + d.revenue, 0) / recentMonths.length;
    const avgCharges = recentMonths.reduce((sum, d) => sum + d.charges, 0) / recentMonths.length;
    const avgProfit = recentMonths.reduce((sum, d) => sum + d.netProfit, 0) / recentMonths.length;

    // Comparer avec les 3 mois précédents
    const olderMonths = historical.slice(-6, -3);
    if (olderMonths.length >= 3) {
      const oldAvgRevenue = olderMonths.reduce((sum, d) => sum + d.revenue, 0) / olderMonths.length;
      const oldAvgCharges = olderMonths.reduce((sum, d) => sum + d.charges, 0) / olderMonths.length;
      const oldAvgProfit = olderMonths.reduce((sum, d) => sum + d.netProfit, 0) / olderMonths.length;

      // Alerte: Baisse des revenus
      const revenueTrend = ((avgRevenue - oldAvgRevenue) / oldAvgRevenue) * 100;
      if (revenueTrend < -10) {
        alerts.push({
          type: 'danger',
          title: 'Baisse significative des revenus',
          message: `Les revenus ont diminué de ${Math.abs(revenueTrend).toFixed(1)}% sur les 3 derniers mois`,
          metric: 'revenue',
          trend: revenueTrend,
        });
      } else if (revenueTrend < -5) {
        alerts.push({
          type: 'warning',
          title: 'Légère baisse des revenus',
          message: `Les revenus ont diminué de ${Math.abs(revenueTrend).toFixed(1)}% sur les 3 derniers mois`,
          metric: 'revenue',
          trend: revenueTrend,
        });
      }

      // Alerte: Hausse des charges
      const chargesTrend = ((avgCharges - oldAvgCharges) / oldAvgCharges) * 100;
      if (chargesTrend > 15) {
        alerts.push({
          type: 'danger',
          title: 'Augmentation importante des charges',
          message: `Les charges ont augmenté de ${chargesTrend.toFixed(1)}% sur les 3 derniers mois`,
          metric: 'charges',
          trend: chargesTrend,
        });
      } else if (chargesTrend > 10) {
        alerts.push({
          type: 'warning',
          title: 'Hausse des charges',
          message: `Les charges ont augmenté de ${chargesTrend.toFixed(1)}% sur les 3 derniers mois`,
          metric: 'charges',
          trend: chargesTrend,
        });
      }

      // Alerte: Marge bénéficiaire faible
      const profitMargin = avgRevenue > 0 ? (avgProfit / avgRevenue) * 100 : 0;
      if (profitMargin < 20 && profitMargin > 0) {
        alerts.push({
          type: 'warning',
          title: 'Marge bénéficiaire faible',
          message: `La marge actuelle est de ${profitMargin.toFixed(1)}%, en dessous du seuil recommandé de 20%`,
          metric: 'profit',
          trend: profitMargin,
        });
      } else if (profitMargin <= 0) {
        alerts.push({
          type: 'danger',
          title: 'Déficit financier',
          message: 'Les charges dépassent les revenus. Action immédiate requise.',
          metric: 'profit',
          trend: profitMargin,
        });
      }
    }

    // Alerte: Cash flow négatif prévu
    const negativeCashFlowForecasts = forecasts.filter(f => f.projectedCashFlow < 0);
    if (negativeCashFlowForecasts.length > 0) {
      const firstNegative = negativeCashFlowForecasts[0];
      alerts.push({
        type: 'danger',
        title: 'Cash-flow négatif prévu',
        message: `Le cash-flow devrait devenir négatif en ${firstNegative.month.split('-')[1]}/${firstNegative.month.split('-')[0]}`,
        metric: 'cashflow',
        trend: -100,
      });
    }

    // Info positive: Croissance
    if (olderMonths.length >= 3) {
      const oldAvgRevenue = olderMonths.reduce((sum, d) => sum + d.revenue, 0) / olderMonths.length;
      const revenueTrend = ((avgRevenue - oldAvgRevenue) / oldAvgRevenue) * 100;
      
      if (revenueTrend > 10) {
        alerts.push({
          type: 'info',
          title: 'Croissance positive',
          message: `Les revenus ont progressé de ${revenueTrend.toFixed(1)}% sur les 3 derniers mois`,
          metric: 'revenue',
          trend: revenueTrend,
        });
      }
    }

    return alerts;
  };

  return {
    historicalData,
    forecasts,
    alerts,
    loading,
    refresh: fetchAndCalculateForecasts,
  };
};
