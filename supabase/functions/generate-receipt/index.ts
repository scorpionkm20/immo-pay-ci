import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { payment_id } = await req.json();

    if (!payment_id) {
      throw new Error('Missing payment_id');
    }

    console.log('Generating receipt for payment:', payment_id);

    // Fetch payment details with related data
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select(`
        *,
        leases (
          *,
          properties (
            titre,
            adresse,
            ville
          )
        )
      `)
      .eq('id', payment_id)
      .single();

    if (paymentError) {
      console.error('Payment fetch error:', paymentError);
      throw new Error(`Erreur de récupération du paiement: ${paymentError.message}`);
    }

    if (!payment) {
      throw new Error('Paiement non trouvé');
    }

    if (!payment.leases) {
      throw new Error('Bail non trouvé pour ce paiement');
    }

    // Get tenant and gestionnaire profiles separately
    let tenantProfile = null;
    let gestionnaireProfile = null;

    try {
      const { data: tenant } = await supabaseClient
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', payment.leases.locataire_id)
        .single();
      tenantProfile = tenant;
    } catch (e) {
      console.log('Could not fetch tenant profile:', e);
    }

    try {
      const { data: gestionnaire } = await supabaseClient
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', payment.leases.gestionnaire_id)
        .single();
      gestionnaireProfile = gestionnaire;
    } catch (e) {
      console.log('Could not fetch gestionnaire profile:', e);
    }

    // Safe property access
    const propertyTitle = payment.leases.properties?.titre || 'Propriété';
    const propertyAddress = payment.leases.properties?.adresse || 'Adresse non spécifiée';
    const propertyCity = payment.leases.properties?.ville || '';
    const methodePaiement = payment.methode_paiement || 'Non spécifiée';

    // Generate PDF receipt
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reçu de Paiement</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px; 
            background: #f9fafb;
          }
          .container {
            max-width: 600px;
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
            border-bottom: 3px solid #16a34a;
          }
          .header h1 { color: #16a34a; margin: 0; font-size: 28px; }
          .header p { color: #6b7280; margin-top: 8px; }
          .section { margin: 25px 0; }
          .section h2 { 
            color: #1e40af; 
            font-size: 16px; 
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 8px; 
            margin-bottom: 15px;
          }
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 10px 0; 
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          .label { font-weight: 600; color: #374151; }
          .value { color: #6b7280; }
          .amount-box { 
            text-align: center; 
            margin: 30px 0; 
            padding: 25px;
            background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
            border-radius: 12px;
            color: white;
          }
          .amount-label { font-size: 14px; opacity: 0.9; }
          .amount { font-size: 32px; font-weight: bold; margin-top: 8px; }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #9ca3af; 
            font-size: 12px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
          }
          .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            background: #d1fae5;
            color: #065f46;
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
            <h1>REÇU DE PAIEMENT</h1>
            <p>N° ${payment.transaction_id || payment.id.slice(0, 8).toUpperCase()}</p>
          </div>

          <div class="section">
            <h2>Informations du locataire</h2>
            <div class="info-row">
              <span class="label">Nom:</span>
              <span class="value">${tenantProfile?.full_name || 'Non spécifié'}</span>
            </div>
            <div class="info-row">
              <span class="label">Téléphone:</span>
              <span class="value">${tenantProfile?.phone || 'Non spécifié'}</span>
            </div>
          </div>

          <div class="section">
            <h2>Détails du bien</h2>
            <div class="info-row">
              <span class="label">Propriété:</span>
              <span class="value">${propertyTitle}</span>
            </div>
            <div class="info-row">
              <span class="label">Adresse:</span>
              <span class="value">${propertyAddress}${propertyCity ? ', ' + propertyCity : ''}</span>
            </div>
          </div>

          <div class="section">
            <h2>Détails du paiement</h2>
            <div class="info-row">
              <span class="label">Mois:</span>
              <span class="value">${new Date(payment.mois_paiement).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}</span>
            </div>
            <div class="info-row">
              <span class="label">Date de paiement:</span>
              <span class="value">${payment.date_paiement ? new Date(payment.date_paiement).toLocaleDateString('fr-FR') : 'Non spécifiée'}</span>
            </div>
            <div class="info-row">
              <span class="label">Méthode:</span>
              <span class="value">${methodePaiement.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span class="label">Statut:</span>
              <span class="badge">${payment.statut === 'reussi' || payment.statut === 'paye' ? 'Payé' : payment.statut}</span>
            </div>
          </div>

          <div class="amount-box">
            <div class="amount-label">Montant payé</div>
            <div class="amount">${Number(payment.montant).toLocaleString('fr-FR')} FCFA</div>
          </div>

          <div class="section">
            <h2>Gestionnaire</h2>
            <div class="info-row">
              <span class="label">Nom:</span>
              <span class="value">${gestionnaireProfile?.full_name || 'Non spécifié'}</span>
            </div>
            <div class="info-row">
              <span class="label">Téléphone:</span>
              <span class="value">${gestionnaireProfile?.phone || 'Non spécifié'}</span>
            </div>
          </div>

          <div class="footer">
            <p>Ce reçu a été généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
            <p>Conservez ce document pour vos archives</p>
            <p style="margin-top: 10px;">© ${new Date().getFullYear()} LoyerFacile</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('Receipt generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        receipt_html: receiptHtml,
        payment_details: {
          montant: payment.montant,
          mois_paiement: payment.mois_paiement,
          transaction_id: payment.transaction_id
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-receipt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
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
