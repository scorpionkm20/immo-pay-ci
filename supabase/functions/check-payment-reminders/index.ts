import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lease {
  id: string;
  locataire_id: string;
  montant_mensuel: number;
  date_debut: string;
}

interface Payment {
  id: string;
  lease_id: string;
  mois_paiement: string;
  statut: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking payment reminders...');

    const today = new Date();
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);

    // Get active leases
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, locataire_id, montant_mensuel, date_debut')
      .eq('statut', 'actif');

    if (leasesError) {
      console.error('Error fetching leases:', leasesError);
      throw leasesError;
    }

    console.log(`Found ${leases?.length || 0} active leases`);

    // Get all payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, lease_id, mois_paiement, statut');

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      throw paymentsError;
    }

    console.log(`Found ${payments?.length || 0} payments`);

    const notificationsToCreate = [];

    // Check each lease
    for (const lease of leases || []) {
      const leaseStartDate = new Date(lease.date_debut);
      
      // Calculate the expected payment month
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const expectedPaymentDate = new Date(currentYear, currentMonth, leaseStartDate.getDate());
      
      // Check if payment exists for current month
      const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const existingPayment = payments?.find(
        p => p.lease_id === lease.id && 
        p.mois_paiement.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`)
      );

      // Check for upcoming payment (5 days before due date)
      const daysUntilDue = Math.ceil((expectedPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue === 5 && (!existingPayment || existingPayment.statut !== 'reussi')) {
        notificationsToCreate.push({
          user_id: lease.locataire_id,
          lease_id: lease.id,
          type: 'rappel_paiement',
          titre: 'Rappel de paiement',
          message: `Votre loyer de ${lease.montant_mensuel} FCFA est dû dans 5 jours (le ${expectedPaymentDate.toLocaleDateString('fr-FR')}).`
        });
      }

      // Check for overdue payment
      if (today > expectedPaymentDate && (!existingPayment || existingPayment.statut !== 'reussi')) {
        const daysOverdue = Math.ceil((today.getTime() - expectedPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
        notificationsToCreate.push({
          user_id: lease.locataire_id,
          lease_id: lease.id,
          type: 'retard_paiement',
          titre: 'Paiement en retard',
          message: `Votre loyer de ${lease.montant_mensuel} FCFA est en retard de ${daysOverdue} jour(s). Veuillez effectuer le paiement dès que possible.`
        });
      }
    }

    console.log(`Creating ${notificationsToCreate.length} notifications`);

    // Create notifications
    if (notificationsToCreate.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        throw notificationError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${notificationsToCreate.length} notifications`,
        notificationsCount: notificationsToCreate.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in check-payment-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
