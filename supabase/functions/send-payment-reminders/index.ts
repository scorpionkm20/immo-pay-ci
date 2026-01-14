import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeaseWithDetails {
  id: string;
  locataire_id: string;
  gestionnaire_id: string;
  montant_mensuel: number;
  first_regular_payment_date: string | null;
  advance_months_count: number;
  advance_months_consumed: number;
  payment_status: string;
  caution_payee: boolean;
  property: {
    titre: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Fetch active leases with verified payment
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        id,
        locataire_id,
        gestionnaire_id,
        montant_mensuel,
        first_regular_payment_date,
        advance_months_count,
        advance_months_consumed,
        payment_status,
        caution_payee,
        property:properties(titre)
      `)
      .eq('statut', 'actif')
      .eq('caution_payee', true);

    if (leasesError) throw leasesError;

    const notifications: any[] = [];
    const reminders: any[] = [];

    for (const lease of (leases as any[]) || []) {
      const propertyTitle = lease.property?.titre || 'Propriété';

      // Check if advance months are running out (J-1 before end of advance)
      if (lease.first_regular_payment_date) {
        const firstPaymentDate = new Date(lease.first_regular_payment_date);
        const daysUntilFirstPayment = Math.ceil((firstPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // J-1: Reminder that advance is ending
        if (daysUntilFirstPayment === 1) {
          notifications.push({
            user_id: lease.locataire_id,
            lease_id: lease.id,
            type: 'advance_ending',
            titre: 'Fin de période d\'avance demain',
            message: `Votre période d'avance pour ${propertyTitle} se termine demain. Le loyer régulier de ${lease.montant_mensuel.toLocaleString()} FCFA sera dû.`
          });

          reminders.push({
            lease_id: lease.id,
            reminder_type: 'advance_ending',
            reminder_date: today.toISOString().split('T')[0],
            sent_at: new Date().toISOString()
          });
        }
      }

      // Monthly reminders for active leases after advance period
      if (lease.first_regular_payment_date) {
        const firstPaymentDate = new Date(lease.first_regular_payment_date);
        
        if (today >= firstPaymentDate) {
          // Le 5 du mois: Courtesy reminder
          if (currentDay === 5) {
            // Check if payment exists for current month
            const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
            const { data: payments } = await supabase
              .from('payments')
              .select('id, statut')
              .eq('lease_id', lease.id)
              .eq('mois_paiement', currentMonthStr)
              .eq('statut', 'paye');

            if (!payments || payments.length === 0) {
              notifications.push({
                user_id: lease.locataire_id,
                lease_id: lease.id,
                type: 'courtesy_reminder',
                titre: 'Rappel de loyer',
                message: `Rappel amical: Le loyer de ${lease.montant_mensuel.toLocaleString()} FCFA pour ${propertyTitle} est en attente de paiement.`
              });

              reminders.push({
                lease_id: lease.id,
                reminder_type: 'courtesy',
                reminder_date: today.toISOString().split('T')[0],
                sent_at: new Date().toISOString()
              });
            }
          }

          // Le 10 du mois: Deadline reminder
          if (currentDay === 10) {
            const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
            const { data: payments } = await supabase
              .from('payments')
              .select('id, statut')
              .eq('lease_id', lease.id)
              .eq('mois_paiement', currentMonthStr)
              .eq('statut', 'paye');

            if (!payments || payments.length === 0) {
              notifications.push({
                user_id: lease.locataire_id,
                lease_id: lease.id,
                type: 'payment_deadline',
                titre: '⚠️ Date limite de paiement',
                message: `Aujourd'hui est la date limite pour le paiement du loyer de ${propertyTitle}. Montant: ${lease.montant_mensuel.toLocaleString()} FCFA.`
              });

              reminders.push({
                lease_id: lease.id,
                reminder_type: 'deadline',
                reminder_date: today.toISOString().split('T')[0],
                sent_at: new Date().toISOString()
              });
            }
          }

          // Le 11 du mois: Overdue notification
          if (currentDay === 11) {
            const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
            const { data: payments } = await supabase
              .from('payments')
              .select('id, statut')
              .eq('lease_id', lease.id)
              .eq('mois_paiement', currentMonthStr)
              .in('statut', ['paye', 'en_cours']);

            if (!payments || payments.length === 0) {
              // Notify tenant
              notifications.push({
                user_id: lease.locataire_id,
                lease_id: lease.id,
                type: 'payment_overdue',
                titre: '🚨 Retard de paiement',
                message: `Votre loyer pour ${propertyTitle} est en retard. Veuillez régulariser votre situation au plus vite.`
              });

              // Notify manager
              notifications.push({
                user_id: lease.gestionnaire_id,
                lease_id: lease.id,
                type: 'payment_overdue_manager',
                titre: '🚨 Abus/Retard de paiement',
                message: `Le loyer pour ${propertyTitle} n'a pas été payé à la date limite. Aucune validation de paiement n'a été enregistrée.`
              });

              // Update lease payment status
              await supabase
                .from('leases')
                .update({ payment_status: 'overdue' })
                .eq('id', lease.id);

              reminders.push({
                lease_id: lease.id,
                reminder_type: 'overdue',
                reminder_date: today.toISOString().split('T')[0],
                sent_at: new Date().toISOString()
              });
            }
          }
        }
      }
    }

    // Insert notifications (avoid duplicates)
    if (notifications.length > 0) {
      for (const notif of notifications) {
        // Check if already sent today
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', notif.user_id)
          .eq('lease_id', notif.lease_id)
          .eq('type', notif.type)
          .gte('created_at', today.toISOString().split('T')[0]);

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert(notif);
        }
      }
    }

    // Insert reminders (with upsert to avoid duplicates)
    if (reminders.length > 0) {
      for (const reminder of reminders) {
        await supabase
          .from('lease_payment_reminders')
          .upsert(reminder, { onConflict: 'lease_id,reminder_type,reminder_date' });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: notifications.length,
        reminders_created: reminders.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-payment-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
