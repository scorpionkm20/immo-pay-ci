import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, originalImage, currentImage, style, styleDescription, style1, style2, instruction, conversationHistory } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let prompt = '';
    let imageToEdit = '';

    if (action === 'apply_style') {
      // Apply a specific bedroom style
      imageToEdit = originalImage;
      prompt = `Transforme cette chambre dans un style ${style} (${styleDescription}). 
      IMPORTANT: Si l'image ne contient pas de lit visible, ajoute un lit qui correspond au style ${style}.
      Garde la structure générale de la pièce mais applique le style ${style} avec:
      - Couleurs et textures appropriées
      - Mobilier et décoration correspondant au style
      - Éclairage adapté au style
      - Un lit s'il n'y en a pas déjà un
      Crée une chambre magnifique et cohérente dans ce style.`;
      
    } else if (action === 'surprise') {
      // Mix two random styles
      imageToEdit = originalImage;
      prompt = `Crée un design de chambre unique en mélangeant les styles ${style1} et ${style2}.
      IMPORTANT: Si l'image ne contient pas de lit visible, ajoute un lit qui correspond à ce mélange de styles.
      Fusionne intelligemment:
      - Les éléments caractéristiques de ${style1}
      - Les éléments caractéristiques de ${style2}
      - Crée une harmonie visuelle entre les deux styles
      - Un lit s'il n'y en a pas déjà un
      Le résultat doit être créatif et surprenant tout en restant élégant.`;
      
    } else if (action === 'refine') {
      // Refine based on chat instruction
      imageToEdit = currentImage;
      prompt = `Modifie cette chambre selon l'instruction suivante: "${instruction}".
      Applique les changements demandés tout en gardant la cohérence du design global.
      Sois précis et créatif dans l'application des modifications.`;
    }

    console.log('Calling Lovable AI with prompt:', prompt);

    // Call Lovable AI image generation API
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageToEdit
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de taux dépassée. Veuillez réessayer dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Paiement requis. Veuillez ajouter des crédits à votre espace Lovable AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Erreur lors de la communication avec l\'IA');
    }

    const data = await response.json();
    console.log('AI Response received');

    const designedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!designedImageUrl) {
      throw new Error('Aucune image générée par l\'IA');
    }

    return new Response(
      JSON.stringify({ designedImage: designedImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in bedroom-designer function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Une erreur inattendue s\'est produite' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
