import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinancialData {
  properties: any[];
  charges: any[];
  payments: any[];
  leases: any[];
  amortizations: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spaceId, period = '6months', format = 'html' } = await req.json();

    if (!spaceId) {
      throw new Error('Space ID is required');
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Récupérer les données financières
    const [propertiesRes, chargesRes, paymentsRes, leasesRes, amortizationsRes] = await Promise.all([
      supabaseClient.from('properties').select('*').eq('space_id', spaceId),
      supabaseClient.from('property_charges').select('*').eq('space_id', spaceId),
      supabaseClient.from('payments').select('*, leases(*)').eq('space_id', spaceId),
      supabaseClient.from('leases').select('*, properties(titre)').eq('space_id', spaceId),
      supabaseClient.from('property_amortization').select('*').eq('space_id', spaceId),
    ]);

    if (propertiesRes.error) throw propertiesRes.error;
    if (chargesRes.error) throw chargesRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    if (leasesRes.error) throw leasesRes.error;
    if (amortizationsRes.error) throw amortizationsRes.error;

    const data: FinancialData = {
      properties: propertiesRes.data || [],
      charges: chargesRes.data || [],
      payments: paymentsRes.data || [],
      leases: leasesRes.data || [],
      amortizations: amortizationsRes.data || [],
    };

    // Calculer les métriques
    const metrics = calculateMetrics(data);
    
    // Générer le rapport HTML
    const html = generateReportHTML(data, metrics, period);

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    console.error('Error generating financial report:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateMetrics(data: FinancialData) {
  const totalRevenue = data.payments
    .filter(p => p.statut === 'valide')
    .reduce((sum, p) => sum + Number(p.montant), 0);

  const totalCharges = data.charges
    .reduce((sum, c) => sum + Number(c.montant), 0);

  const netProfit = totalRevenue - totalCharges;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const now = new Date();
  const overduePayments = data.payments.filter(p => {
    if (p.statut !== 'en_attente') return false;
    const paymentDate = new Date(p.mois_paiement);
    return paymentDate < now;
  });

  const overdueAmount = overduePayments.reduce((sum, p) => sum + Number(p.montant), 0);

  // Calculer le taux d'occupation
  const occupiedProperties = data.properties.filter(p => p.statut === 'loue').length;
  const occupancyRate = data.properties.length > 0 
    ? (occupiedProperties / data.properties.length) * 100 
    : 0;

  // Charges par type
  const chargesByType = data.charges.reduce((acc: any, charge) => {
    const type = charge.type_charge;
    acc[type] = (acc[type] || 0) + Number(charge.montant);
    return acc;
  }, {});

  // Rentabilité par propriété
  const propertyPerformance = data.properties.map(property => {
    const propertyLeases = data.leases.filter(l => l.property_id === property.id);
    const propertyPayments = data.payments.filter(p => 
      propertyLeases.some(l => l.id === p.lease_id)
    );
    const propertyRevenue = propertyPayments
      .filter(p => p.statut === 'valide')
      .reduce((sum, p) => sum + Number(p.montant), 0);
    
    const propertyCharges = data.charges
      .filter(c => c.property_id === property.id)
      .reduce((sum, c) => sum + Number(c.montant), 0);

    const propertyProfit = propertyRevenue - propertyCharges;
    const rentability = propertyRevenue > 0 
      ? (propertyProfit / propertyRevenue) * 100 
      : 0;

    return {
      property,
      revenue: propertyRevenue,
      charges: propertyCharges,
      profit: propertyProfit,
      rentability,
    };
  });

  return {
    totalRevenue,
    totalCharges,
    netProfit,
    profitMargin,
    overduePayments: overduePayments.length,
    overdueAmount,
    occupancyRate,
    chargesByType,
    propertyPerformance,
    totalProperties: data.properties.length,
    activeLeases: data.leases.filter(l => l.statut === 'actif').length,
  };
}

function generateReportHTML(data: FinancialData, metrics: any, period: string) {
  const date = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      taxe_fonciere: 'Taxe foncière',
      assurance: 'Assurance',
      entretien: 'Entretien',
      travaux: 'Travaux',
      charges_copropriete: 'Charges copro',
      autre: 'Autre',
    };
    return labels[type] || type;
  };

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Financier</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #8b5cf6;
    }
    
    .header h1 {
      color: #8b5cf6;
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .header .date {
      color: #666;
      font-size: 14px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .metric-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .metric-card.success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    
    .metric-card.warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    
    .metric-card.danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    
    .metric-card h3 {
      font-size: 14px;
      font-weight: 500;
      opacity: 0.9;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .metric-card .value {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .metric-card .subvalue {
      font-size: 13px;
      opacity: 0.8;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 24px;
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      background: white;
    }
    
    thead {
      background: #f9fafb;
    }
    
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    th {
      font-weight: 600;
      color: #374151;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    tbody tr:hover {
      background: #f9fafb;
    }
    
    .amount {
      font-weight: 600;
      color: #059669;
    }
    
    .amount.negative {
      color: #dc2626;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .badge.success {
      background: #d1fae5;
      color: #065f46;
    }
    
    .badge.warning {
      background: #fef3c7;
      color: #92400e;
    }
    
    .badge.danger {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .chart-container {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    
    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .bar-item {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .bar-label {
      min-width: 120px;
      font-size: 14px;
      font-weight: 500;
    }
    
    .bar-container {
      flex: 1;
      height: 30px;
      background: #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
    }
    
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #8b5cf6, #6366f1);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      padding: 0 10px;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 13px;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Rapport Financier Détaillé</h1>
      <p class="date">Généré le ${date}</p>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <h3>Revenus Total</h3>
        <div class="value">${metrics.totalRevenue.toLocaleString()} FCFA</div>
        <div class="subvalue">${metrics.activeLeases} baux actifs</div>
      </div>
      
      <div class="metric-card warning">
        <h3>Charges Total</h3>
        <div class="value">${metrics.totalCharges.toLocaleString()} FCFA</div>
        <div class="subvalue">${data.charges.length} charges enregistrées</div>
      </div>
      
      <div class="metric-card ${metrics.netProfit >= 0 ? 'success' : 'danger'}">
        <h3>Bénéfice Net</h3>
        <div class="value">${metrics.netProfit.toLocaleString()} FCFA</div>
        <div class="subvalue">Marge: ${metrics.profitMargin.toFixed(1)}%</div>
      </div>
      
      <div class="metric-card ${metrics.overduePayments > 0 ? 'danger' : 'success'}">
        <h3>Impayés</h3>
        <div class="value">${metrics.overduePayments}</div>
        <div class="subvalue">${metrics.overdueAmount.toLocaleString()} FCFA</div>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">📈 Vue d'ensemble</h2>
      <div class="metrics-grid">
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
          <h3 style="margin-bottom: 10px; color: #6b7280;">Propriétés</h3>
          <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${metrics.totalProperties}</div>
        </div>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
          <h3 style="margin-bottom: 10px; color: #6b7280;">Taux d'occupation</h3>
          <div style="font-size: 28px; font-weight: bold; color: #10b981;">${metrics.occupancyRate.toFixed(1)}%</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">💰 Répartition des Charges</h2>
      <div class="chart-container">
        <div class="bar-chart">
          ${Object.entries(metrics.chargesByType)
            .sort(([, a]: any, [, b]: any) => b - a)
            .map(([type, amount]: any) => {
              const percentage = (amount / metrics.totalCharges) * 100;
              return `
                <div class="bar-item">
                  <div class="bar-label">${getTypeLabel(type)}</div>
                  <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%">
                      ${amount.toLocaleString()} FCFA
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">🏠 Rentabilité par Propriété</h2>
      <table>
        <thead>
          <tr>
            <th>Propriété</th>
            <th>Revenus</th>
            <th>Charges</th>
            <th>Bénéfice</th>
            <th>Rentabilité</th>
          </tr>
        </thead>
        <tbody>
          ${metrics.propertyPerformance
            .sort((a: any, b: any) => b.rentability - a.rentability)
            .map((perf: any) => `
              <tr>
                <td><strong>${perf.property.titre}</strong></td>
                <td class="amount">${perf.revenue.toLocaleString()} FCFA</td>
                <td class="amount negative">${perf.charges.toLocaleString()} FCFA</td>
                <td class="amount ${perf.profit >= 0 ? '' : 'negative'}">
                  ${perf.profit.toLocaleString()} FCFA
                </td>
                <td>
                  <span class="badge ${perf.rentability >= 50 ? 'success' : perf.rentability >= 30 ? 'warning' : 'danger'}">
                    ${perf.rentability.toFixed(1)}%
                  </span>
                </td>
              </tr>
            `)
            .join('')}
        </tbody>
      </table>
    </div>
    
    <div class="section">
      <h2 class="section-title">📋 Détail des Charges</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Description</th>
            <th>Montant</th>
            <th>Récurrence</th>
          </tr>
        </thead>
        <tbody>
          ${data.charges
            .sort((a, b) => new Date(b.date_charge).getTime() - new Date(a.date_charge).getTime())
            .slice(0, 20)
            .map(charge => `
              <tr>
                <td>${new Date(charge.date_charge).toLocaleDateString('fr-FR')}</td>
                <td><span class="badge">${getTypeLabel(charge.type_charge)}</span></td>
                <td>${charge.description || '-'}</td>
                <td class="amount negative">${Number(charge.montant).toLocaleString()} FCFA</td>
                <td>${charge.recurrent ? `<span class="badge success">${charge.frequence}</span>` : 'Unique'}</td>
              </tr>
            `)
            .join('')}
        </tbody>
      </table>
    </div>
    
    ${data.amortizations.length > 0 ? `
    <div class="section">
      <h2 class="section-title">📊 Amortissement des Biens</h2>
      <table>
        <thead>
          <tr>
            <th>Bien</th>
            <th>Valeur Acquisition</th>
            <th>Date Acquisition</th>
            <th>Durée</th>
            <th>Amortissement Annuel</th>
            <th>Valeur Résiduelle</th>
          </tr>
        </thead>
        <tbody>
          ${data.amortizations.map(amort => {
            const annualAmount = (amort.valeur_acquisition - amort.valeur_residuelle) / amort.duree_amortissement;
            return `
              <tr>
                <td><strong>#${amort.property_id.slice(0, 8)}</strong></td>
                <td class="amount">${Number(amort.valeur_acquisition).toLocaleString()} FCFA</td>
                <td>${new Date(amort.date_acquisition).toLocaleDateString('fr-FR')}</td>
                <td>${amort.duree_amortissement} ans</td>
                <td class="amount negative">${annualAmount.toLocaleString()} FCFA</td>
                <td class="amount">${Number(amort.valeur_residuelle).toLocaleString()} FCFA</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <div class="footer">
      <p><strong>LoyerFacile</strong> - Rapport généré automatiquement</p>
      <p>Ce document est confidentiel et destiné uniquement aux gestionnaires autorisés</p>
    </div>
  </div>
</body>
</html>
  `;
}
