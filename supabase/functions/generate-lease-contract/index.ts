import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContractData {
  leaseId: string;
  templateId?: string;
}

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

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Non authentifié');
    }

    const { leaseId, templateId }: ContractData = await req.json();

    // Récupérer les données du bail
    const { data: lease, error: leaseError } = await supabaseClient
      .from('leases')
      .select(`
        *,
        property:properties(*),
        locataire:profiles!leases_locataire_id_fkey(*),
        gestionnaire:profiles!leases_gestionnaire_id_fkey(*)
      `)
      .eq('id', leaseId)
      .single();

    if (leaseError) throw leaseError;

    // Récupérer le template (ou utiliser le template par défaut)
    let template;
    if (templateId) {
      const { data: customTemplate } = await supabaseClient
        .from('contract_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      template = customTemplate;
    } else {
      const { data: defaultTemplate } = await supabaseClient
        .from('contract_templates')
        .select('*')
        .eq('space_id', lease.space_id)
        .eq('is_default', true)
        .single();
      template = defaultTemplate;
    }

    if (!template) {
      throw new Error('Aucun template trouvé');
    }

    // Préparer les variables pour remplir le template
    const variables: Record<string, string> = {
      gestionnaire_name: lease.gestionnaire?.full_name || 'N/A',
      gestionnaire_address: 'À compléter',
      locataire_name: lease.locataire?.full_name || 'N/A',
      locataire_address: 'À compléter',
      locataire_phone: lease.locataire?.phone || 'N/A',
      property_title: lease.property?.titre || 'N/A',
      property_address: `${lease.property?.adresse}, ${lease.property?.ville}` || 'N/A',
      property_type: lease.property?.type_propriete || 'N/A',
      property_surface: lease.property?.surface_m2?.toString() || 'N/A',
      property_rooms: lease.property?.nombre_pieces?.toString() || 'N/A',
      lease_start_date: new Date(lease.date_debut).toLocaleDateString('fr-FR'),
      monthly_rent: lease.montant_mensuel?.toLocaleString('fr-FR') || 'N/A',
      payment_day: '5',
      caution_amount: lease.caution_montant?.toLocaleString('fr-FR') || 'N/A',
      city: lease.property?.ville || 'N/A',
      contract_date: new Date().toLocaleDateString('fr-FR'),
    };

    // Générer le contenu HTML du contrat
    const content = JSON.parse(template.content);
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; color: #333; font-size: 24px; margin-bottom: 30px; }
    h2 { color: #555; font-size: 16px; margin-top: 25px; margin-bottom: 10px; }
    p { margin: 10px 0; white-space: pre-line; }
    .section { margin-bottom: 20px; }
  </style>
</head>
<body>
`;

    for (const section of content.sections) {
      if (section.type === 'header') {
        htmlContent += `<h1>${replaceVariables(section.title, variables)}</h1>\n`;
      } else if (section.type === 'section') {
        htmlContent += `<div class="section">\n`;
        htmlContent += `<h2>${replaceVariables(section.title, variables)}</h2>\n`;
        htmlContent += `<p>${replaceVariables(section.content, variables)}</p>\n`;
        htmlContent += `</div>\n`;
      }
    }

    htmlContent += `
</body>
</html>
`;

    // Convertir le HTML en Blob
    const encoder = new TextEncoder();
    const htmlBlob = encoder.encode(htmlContent);

    // Uploader le fichier HTML dans le storage (pour une conversion PDF ultérieure côté client ou service externe)
    const fileName = `contrat-bail-${leaseId}-${Date.now()}.html`;
    const filePath = `${lease.space_id}/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('documents')
      .upload(filePath, htmlBlob, {
        contentType: 'text/html',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabaseClient.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Créer l'entrée dans la table documents
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .insert({
        lease_id: leaseId,
        space_id: lease.space_id,
        titre: `Contrat de Bail - ${lease.property?.titre}`,
        type_document: 'bail',
        file_url: publicUrl,
        file_name: fileName,
        file_size: htmlBlob.length,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (docError) throw docError;

    console.log('Contract generated successfully:', fileName);

    return new Response(
      JSON.stringify({
        success: true,
        document,
        message: 'Contrat généré avec succès',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error generating contract:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Une erreur est survenue' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}
