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

    // Here you would integrate with the actual Mobile Money APIs
    // For now, we'll simulate a successful payment
    // In production, you would call the respective API based on methode_paiement:
    // - Orange Money API
    // - MTN Money API
    // - Moov Money API
    // - Wave API

    // Simulate payment processing
    const transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Update payment with transaction ID and status
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        transaction_id,
        statut: 'reussi' // In production, this would be updated via webhook
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Payment update error:', updateError);
      throw updateError;
    }

    console.log('Payment successful:', { payment_id: payment.id, transaction_id });

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        transaction_id,
        message: 'Paiement initié avec succès'
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
