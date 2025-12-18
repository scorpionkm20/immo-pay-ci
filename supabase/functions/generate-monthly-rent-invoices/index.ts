import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting monthly rent invoice generation...');

    // Get current date info
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // First day of current month for the payment period
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthPaymentDate = currentMonthStart.toISOString().split('T')[0];

    // Fetch all active leases where caution is paid
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        id,
        property_id,
        locataire_id,
        gestionnaire_id,
        space_id,
        montant_mensuel,
        caution_payee,
        date_caution_payee,
        statut
      `)
      .eq('statut', 'actif')
      .eq('caution_payee', true)
      .not('date_caution_payee', 'is', null);

    if (leasesError) {
      console.error('Error fetching leases:', leasesError);
      throw leasesError;
    }

    console.log(`Found ${leases?.length || 0} active leases with paid caution`);

    const invoicesGenerated: string[] = [];
    const skippedLeases: string[] = [];

    for (const lease of leases || []) {
      try {
        // Calculate the first rent due date (2 months after caution payment)
        const cautionPaymentDate = new Date(lease.date_caution_payee);
        const firstRentDueDate = new Date(cautionPaymentDate);
        firstRentDueDate.setMonth(firstRentDueDate.getMonth() + 2);

        // Check if we've reached the first rent due date
        if (now < firstRentDueDate) {
          console.log(`Lease ${lease.id}: First rent not yet due (due: ${firstRentDueDate.toISOString()})`);
          skippedLeases.push(lease.id);
          continue;
        }

        // Check if a payment already exists for this month
        const { data: existingPayment, error: paymentCheckError } = await supabase
          .from('payments')
          .select('id')
          .eq('lease_id', lease.id)
          .eq('mois_paiement', currentMonthPaymentDate)
          .maybeSingle();

        if (paymentCheckError) {
          console.error(`Error checking existing payment for lease ${lease.id}:`, paymentCheckError);
          continue;
        }

        if (existingPayment) {
          console.log(`Lease ${lease.id}: Payment already exists for ${currentMonthPaymentDate}`);
          skippedLeases.push(lease.id);
          continue;
        }

        // Create the monthly rent invoice
        const { data: newPayment, error: createError } = await supabase
          .from('payments')
          .insert({
            lease_id: lease.id,
            space_id: lease.space_id,
            montant: lease.montant_mensuel,
            mois_paiement: currentMonthPaymentDate,
            statut: 'en_attente',
          })
          .select()
          .single();

        if (createError) {
          console.error(`Error creating payment for lease ${lease.id}:`, createError);
          continue;
        }

        console.log(`Created rent invoice ${newPayment.id} for lease ${lease.id}`);
        invoicesGenerated.push(newPayment.id);

        // Notify the tenant about the new invoice
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: lease.locataire_id,
            lease_id: lease.id,
            type: 'rappel_paiement',
            titre: 'Nouvelle facture de loyer',
            message: `Votre loyer de ${lease.montant_mensuel.toLocaleString('fr-FR')} FCFA pour le mois de ${new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentMonthStart)} est disponible pour paiement.`
          });

        if (notifError) {
          console.error(`Error creating notification for lease ${lease.id}:`, notifError);
        }

        // Log the action
        await supabase.from('audit_logs').insert({
          user_id: '00000000-0000-0000-0000-000000000000', // System user
          action: 'rent_invoice_generated',
          resource_type: 'payment',
          resource_id: newPayment.id,
          details: {
            lease_id: lease.id,
            montant: lease.montant_mensuel,
            mois_paiement: currentMonthPaymentDate,
            locataire_id: lease.locataire_id
          }
        });

      } catch (leaseError) {
        console.error(`Error processing lease ${lease.id}:`, leaseError);
      }
    }

    const result = {
      success: true,
      generated: invoicesGenerated.length,
      skipped: skippedLeases.length,
      invoices: invoicesGenerated,
      timestamp: now.toISOString()
    };

    console.log('Monthly rent invoice generation completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-monthly-rent-invoices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
