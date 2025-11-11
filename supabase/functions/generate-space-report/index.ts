import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpaceData {
  space: any;
  properties: any[];
  leases: any[];
  payments: any[];
  tickets: any[];
  members: any[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { spaceId } = await req.json();

    if (!spaceId) {
      throw new Error('Missing spaceId');
    }

    console.log('Generating report for space:', spaceId);

    // Fetch space data
    const { data: space, error: spaceError } = await supabase
      .from('management_spaces')
      .select('*')
      .eq('id', spaceId)
      .single();

    if (spaceError) throw spaceError;

    // Fetch properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .eq('space_id', spaceId);

    if (propertiesError) throw propertiesError;

    // Fetch leases
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('*')
      .eq('space_id', spaceId);

    if (leasesError) throw leasesError;

    // Fetch payments (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('space_id', spaceId)
      .gte('mois_paiement', sixMonthsAgo.toISOString());

    if (paymentsError) throw paymentsError;

    // Fetch maintenance tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('maintenance_tickets')
      .select('*')
      .eq('space_id', spaceId);

    if (ticketsError) throw ticketsError;

    // Fetch members
    const { data: members, error: membersError } = await supabase
      .from('space_members')
      .select('*, profiles:user_id(full_name)')
      .eq('space_id', spaceId);

    if (membersError) throw membersError;

    const reportData: SpaceData = {
      space,
      properties: properties || [],
      leases: leases || [],
      payments: payments || [],
      tickets: tickets || [],
      members: members || [],
    };

    // Generate HTML report
    const html = generateHTMLReport(reportData);

    console.log('Report generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        html,
        message: 'Rapport généré avec succès' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function generateHTMLReport(data: SpaceData): string {
  const totalProperties = data.properties.length;
  const occupiedProperties = data.properties.filter(p => p.statut === 'loue').length;
  const occupancyRate = totalProperties > 0 ? ((occupiedProperties / totalProperties) * 100).toFixed(1) : '0';
  
  const totalRevenue = data.payments
    .filter(p => p.statut === 'paye')
    .reduce((sum, p) => sum + Number(p.montant), 0);
  
  const activeTickets = data.tickets.filter(t => t.statut !== 'resolu').length;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport - ${data.space.nom}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      background: #f9fafb;
    }
    .container { 
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4f46e5;
    }
    h1 { 
      color: #4f46e5;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .stat-card {
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #4f46e5;
    }
    .stat-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #111827;
    }
    .section {
      margin: 40px 0;
    }
    .section-title {
      font-size: 20px;
      color: #111827;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.space.nom}</h1>
      <p class="subtitle">Rapport généré le ${new Date().toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Propriétés</div>
        <div class="stat-value">${totalProperties}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Taux d'occupation</div>
        <div class="stat-value">${occupancyRate}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Revenus (6 mois)</div>
        <div class="stat-value">${totalRevenue.toLocaleString('fr-FR')} FCFA</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tickets actifs</div>
        <div class="stat-value">${activeTickets}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Propriétés</h2>
      <table>
        <thead>
          <tr>
            <th>Titre</th>
            <th>Ville</th>
            <th>Type</th>
            <th>Prix</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          ${data.properties.map(p => `
            <tr>
              <td>${p.titre}</td>
              <td>${p.ville}</td>
              <td>${p.type_propriete}</td>
              <td>${Number(p.prix_mensuel).toLocaleString('fr-FR')} FCFA</td>
              <td><span class="badge ${p.statut === 'loue' ? 'badge-success' : 'badge-info'}">${p.statut}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">Baux actifs</h2>
      <table>
        <thead>
          <tr>
            <th>Date début</th>
            <th>Date fin</th>
            <th>Montant mensuel</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          ${data.leases.filter(l => l.statut === 'actif').map(l => `
            <tr>
              <td>${new Date(l.date_debut).toLocaleDateString('fr-FR')}</td>
              <td>${l.date_fin ? new Date(l.date_fin).toLocaleDateString('fr-FR') : 'Indéterminé'}</td>
              <td>${Number(l.montant_mensuel).toLocaleString('fr-FR')} FCFA</td>
              <td><span class="badge badge-success">${l.statut}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">Membres de l'espace</h2>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Rôle</th>
            <th>Date d'ajout</th>
          </tr>
        </thead>
        <tbody>
          ${data.members.map(m => `
            <tr>
              <td>${m.profiles?.full_name || 'Sans nom'}</td>
              <td><span class="badge badge-info">${m.role}</span></td>
              <td>${new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} LoyerFacile - Rapport confidentiel</p>
    </div>
  </div>
</body>
</html>
  `;
}
