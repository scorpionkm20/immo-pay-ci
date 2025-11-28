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

    const { lease_id, montant, mois_paiement, methode_paiement, numero_telephone } = await req.json();

    console.log('Initiating payment:', { lease_id, montant, methode_paiement });

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        lease_id,
        montant,
        mois_paiement,
        methode_paiement,
        numero_telephone,
        statut: 'en_cours'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      throw paymentError;
    }

    // Check if payment aggregator keys are configured
    const hasPaymentKeys = Deno.env.get('PAYMENT_API_KEY') && 
                           Deno.env.get('PAYMENT_SITE_ID');

    let transaction_id: string;
    let payment_url: string | null = null;

    if (!hasPaymentKeys) {
      // MODE SIMULATION - Les clés API ne sont pas encore configurées
      console.log('⚠️ Mode simulation activé - Clés API de paiement non configurées');
      transaction_id = `SIM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // En mode simulation, on marque directement le paiement comme réussi après 2 secondes
      setTimeout(async () => {
        await supabaseClient
          .from('payments')
          .update({
            transaction_id,
            statut: 'reussi',
            date_paiement: new Date().toISOString()
          })
          .eq('id', payment.id);

        // Check if this is a caution payment and update lease
        const { data: lease } = await supabaseClient
          .from('leases')
          .select('id, caution_montant')
          .eq('id', lease_id)
          .single();

        if (lease && montant === lease.caution_montant) {
          await supabaseClient
            .from('leases')
            .update({ caution_payee: true })
            .eq('id', lease_id);
          console.log('Caution payment validated (simulation):', lease_id);
        }
      }, 2000);

    } else {
      // MODE PRODUCTION - Intégration avec l'agrégateur de paiement
      const paymentPayload = {
        apikey: Deno.env.get('PAYMENT_API_KEY'),
        site_id: Deno.env.get('PAYMENT_SITE_ID'),
        transaction_id: `PAY-${payment.id}-${Date.now()}`,
        amount: montant,
        currency: 'XOF',
        channels: 'ALL', // Orange, MTN, Moov, Wave automatique
        description: `Paiement loyer - ${mois_paiement}`,
        return_url: `${Deno.env.get('APP_DOMAIN')}/payment/success`,
        notify_url: `${Deno.env.get('APP_DOMAIN')}/api/payments/webhook`,
        customer_phone_number: numero_telephone,
      };

      // Appel API vers l'agrégateur (CinetPay, Hub2, etc.)
      const response = await fetch(Deno.env.get('PAYMENT_BASE_URL') || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload),
      });

      const result = await response.json();
      
      if (result.code !== '201') {
        throw new Error(`Erreur agrégateur: ${result.message}`);
      }

      transaction_id = result.data.payment_token;
      payment_url = result.data.payment_url;
    }

    // Update payment with transaction ID
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        transaction_id,
        statut: hasPaymentKeys ? 'en_cours' : 'reussi'
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Payment update error:', updateError);
      throw updateError;
    }

    console.log('Payment initiated:', { payment_id: payment.id, transaction_id, mode: hasPaymentKeys ? 'production' : 'simulation' });

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        transaction_id,
        payment_url,
        simulation_mode: !hasPaymentKeys,
        message: hasPaymentKeys 
          ? 'Paiement initié avec succès' 
          : 'Mode simulation - Paiement sera validé automatiquement'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in initiate-payment:', error);
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
