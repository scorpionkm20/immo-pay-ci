import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { payment_id } = await req.json();

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
      throw paymentError;
    }

    // Get tenant and gestionnaire profiles
    const { data: tenantProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, phone')
      .eq('user_id', payment.leases.locataire_id)
      .single();

    const { data: gestionnaireProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, phone')
      .eq('user_id', payment.leases.gestionnaire_id)
      .single();

    // Generate PDF receipt (simplified version - in production use a proper PDF library)
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reçu de Paiement</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; }
          .header h1 { color: #2563eb; margin: 0; }
          .section { margin: 20px 0; }
          .section h2 { color: #1e40af; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .label { font-weight: bold; }
          .amount { font-size: 24px; color: #16a34a; font-weight: bold; text-align: center; margin: 30px 0; }
          .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REÇU DE PAIEMENT</h1>
          <p>N° ${payment.transaction_id}</p>
        </div>

        <div class="section">
          <h2>Informations du locataire</h2>
          <div class="info-row">
            <span class="label">Nom:</span>
            <span>${tenantProfile?.full_name || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="label">Téléphone:</span>
            <span>${tenantProfile?.phone || 'N/A'}</span>
          </div>
        </div>

        <div class="section">
          <h2>Détails du bien</h2>
          <div class="info-row">
            <span class="label">Propriété:</span>
            <span>${payment.leases.properties.titre}</span>
          </div>
          <div class="info-row">
            <span class="label">Adresse:</span>
            <span>${payment.leases.properties.adresse}, ${payment.leases.properties.ville}</span>
          </div>
        </div>

        <div class="section">
          <h2>Détails du paiement</h2>
          <div class="info-row">
            <span class="label">Mois:</span>
            <span>${new Date(payment.mois_paiement).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}</span>
          </div>
          <div class="info-row">
            <span class="label">Date de paiement:</span>
            <span>${new Date(payment.date_paiement).toLocaleDateString('fr-FR')}</span>
          </div>
          <div class="info-row">
            <span class="label">Méthode:</span>
            <span>${payment.methode_paiement.replace('_', ' ').toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span class="label">Transaction ID:</span>
            <span>${payment.transaction_id}</span>
          </div>
        </div>

        <div class="amount">
          Montant: ${payment.montant} FCFA
        </div>

        <div class="section">
          <h2>Gestionnaire</h2>
          <div class="info-row">
            <span class="label">Nom:</span>
            <span>${gestionnaireProfile?.full_name || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="label">Téléphone:</span>
            <span>${gestionnaireProfile?.phone || 'N/A'}</span>
          </div>
        </div>

        <div class="footer">
          <p>Ce reçu a été généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
          <p>Conservez ce document pour vos archives</p>
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
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
