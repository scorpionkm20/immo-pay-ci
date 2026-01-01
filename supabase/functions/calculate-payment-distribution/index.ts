import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DistributionResult {
  success: boolean;
  distribution?: {
    id: string;
    type_distribution: string;
    montant_total: number;
    montant_proprietaire: number;
    montant_gestionnaire: number;
    montant_demarcheur: number;
    detail_caution?: {
      avance_2_mois: number;
      garantie_2_mois: number;
      demarcheur_1_mois: number;
    };
  };
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id } = await req.json();

    if (!payment_id) {
      throw new Error('payment_id est requis');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Calculating distribution for payment:', payment_id);

    // 1. Récupérer le paiement avec les infos du bail
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        lease:leases!payments_lease_id_fkey (
          id,
          montant_mensuel,
          caution_montant,
          caution_payee,
          property_id,
          space_id
        )
      `)
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      console.error('Payment error:', paymentError);
      throw new Error('Paiement introuvable');
    }

    console.log('Payment found:', payment);

    // 2. Récupérer la config de distribution de l'espace
    const { data: config, error: configError } = await supabase
      .from('payment_distribution_config')
      .select('*')
      .eq('space_id', payment.space_id)
      .single();

    if (configError || !config) {
      console.log('No distribution config found for space:', payment.space_id);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Configuration de distribution non trouvée. Veuillez configurer les comptes de distribution.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Distribution config found:', config);

    // 3. Déterminer le type de distribution et calculer les montants
    const montantMensuel = Number(payment.lease.montant_mensuel);
    const montantPaiement = Number(payment.montant);
    const isCaution = montantPaiement === Number(payment.lease.caution_montant);

    let distribution: any;

    if (isCaution) {
      // Distribution de la caution (5x loyer mensuel)
      // 2 mois avance → propriétaire (géré comme loyer prépayé)
      // 2 mois garantie → reste en réserve (gestionnaire)
      // 1 mois → démarcheur
      const avance2Mois = montantMensuel * 2;
      const garantie2Mois = montantMensuel * 2;
      const demarcheur1Mois = montantMensuel * 1;

      // Pour l'avance, on applique le pourcentage normal propriétaire/gestionnaire
      const proprietaireAvance = avance2Mois * (config.proprietaire_pourcentage / 100);
      const gestionnaireAvance = avance2Mois * (config.gestionnaire_pourcentage / 100);

      distribution = {
        payment_id,
        space_id: payment.space_id,
        type_distribution: 'caution',
        montant_total: montantPaiement,
        
        // Propriétaire: sa part des 2 mois d'avance
        montant_proprietaire: proprietaireAvance,
        telephone_proprietaire: config.proprietaire_telephone,
        operateur_proprietaire: config.proprietaire_operateur,
        statut_proprietaire: 'en_attente',
        
        // Gestionnaire: sa commission + garantie à conserver
        montant_gestionnaire: gestionnaireAvance + garantie2Mois,
        telephone_gestionnaire: config.gestionnaire_telephone,
        operateur_gestionnaire: config.gestionnaire_operateur,
        statut_gestionnaire: 'en_attente',
        
        // Démarcheur: 1 mois
        montant_demarcheur: demarcheur1Mois,
        telephone_demarcheur: config.demarcheur_telephone,
        operateur_demarcheur: config.demarcheur_operateur,
        statut_demarcheur: config.demarcheur_telephone ? 'en_attente' : 'non_applicable',
        
        detail_caution: {
          avance_2_mois: avance2Mois,
          part_proprietaire_avance: proprietaireAvance,
          part_gestionnaire_avance: gestionnaireAvance,
          garantie_2_mois: garantie2Mois,
          demarcheur_1_mois: demarcheur1Mois
        }
      };

      console.log('Caution distribution calculated:', distribution);

    } else {
      // Distribution du loyer mensuel
      const montantProprietaire = montantPaiement * (config.proprietaire_pourcentage / 100);
      const montantGestionnaire = montantPaiement * (config.gestionnaire_pourcentage / 100);

      distribution = {
        payment_id,
        space_id: payment.space_id,
        type_distribution: 'loyer',
        montant_total: montantPaiement,
        
        montant_proprietaire: montantProprietaire,
        telephone_proprietaire: config.proprietaire_telephone,
        operateur_proprietaire: config.proprietaire_operateur,
        statut_proprietaire: 'en_attente',
        
        montant_gestionnaire: montantGestionnaire,
        telephone_gestionnaire: config.gestionnaire_telephone,
        operateur_gestionnaire: config.gestionnaire_operateur,
        statut_gestionnaire: 'en_attente',
        
        montant_demarcheur: 0,
        statut_demarcheur: 'non_applicable'
      };

      console.log('Rent distribution calculated:', distribution);
    }

    // 4. Enregistrer la distribution
    const { data: savedDistribution, error: saveError } = await supabase
      .from('payment_distributions')
      .insert(distribution)
      .select()
      .single();

    if (saveError) {
      console.error('Error saving distribution:', saveError);
      throw new Error('Erreur lors de l\'enregistrement de la distribution');
    }

    console.log('Distribution saved:', savedDistribution);

    const result: DistributionResult = {
      success: true,
      distribution: {
        id: savedDistribution.id,
        type_distribution: savedDistribution.type_distribution,
        montant_total: savedDistribution.montant_total,
        montant_proprietaire: savedDistribution.montant_proprietaire,
        montant_gestionnaire: savedDistribution.montant_gestionnaire,
        montant_demarcheur: savedDistribution.montant_demarcheur || 0,
        detail_caution: savedDistribution.detail_caution
      }
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-payment-distribution:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
