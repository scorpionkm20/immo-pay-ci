-- Table pour stocker les versions de documents
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  modified_by UUID NOT NULL,
  modification_type TEXT NOT NULL, -- 'created', 'updated', 'signed', 'regenerated'
  changes_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON public.document_versions(created_at DESC);

-- RLS pour document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les membres peuvent lire les versions de documents de leur espace"
  ON public.document_versions
  FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents 
      WHERE is_space_member(auth.uid(), space_id)
    )
  );

CREATE POLICY "System can create document versions"
  ON public.document_versions
  FOR INSERT
  WITH CHECK (true);

-- Table pour les templates de contrat personnalisables
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.management_spaces(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- JSON avec les sections du template
  variables JSONB NOT NULL DEFAULT '[]'::jsonb, -- Liste des variables disponibles
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_contract_templates_space_id ON public.contract_templates(space_id);

-- Trigger pour updated_at
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS pour contract_templates
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Space members can view templates"
  ON public.contract_templates
  FOR SELECT
  USING (is_space_member(auth.uid(), space_id));

CREATE POLICY "Space gestionnaires can manage templates"
  ON public.contract_templates
  FOR ALL
  USING (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role))
  WITH CHECK (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role));

-- Fonction pour créer automatiquement une version lors de la modification d'un document
CREATE OR REPLACE FUNCTION public.create_document_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer une nouvelle version seulement si le fichier a changé ou si le document est signé
  IF (TG_OP = 'UPDATE' AND (OLD.file_url != NEW.file_url OR (OLD.signe = false AND NEW.signe = true))) THEN
    INSERT INTO public.document_versions (
      document_id,
      version_number,
      file_url,
      file_name,
      file_size,
      modified_by,
      modification_type,
      changes_description
    )
    SELECT 
      NEW.id,
      COALESCE(MAX(version_number), 0) + 1,
      NEW.file_url,
      NEW.file_name,
      NEW.file_size,
      NEW.uploaded_by,
      CASE 
        WHEN OLD.signe = false AND NEW.signe = true THEN 'signed'
        ELSE 'updated'
      END,
      CASE 
        WHEN OLD.signe = false AND NEW.signe = true THEN 'Document signé électroniquement'
        ELSE 'Fichier mis à jour'
      END
    FROM public.document_versions
    WHERE document_id = NEW.id;
  END IF;
  
  -- Créer la version initiale lors de la création
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.document_versions (
      document_id,
      version_number,
      file_url,
      file_name,
      file_size,
      modified_by,
      modification_type,
      changes_description
    ) VALUES (
      NEW.id,
      1,
      NEW.file_url,
      NEW.file_name,
      NEW.file_size,
      NEW.uploaded_by,
      'created',
      'Version initiale du document'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour versioning automatique
CREATE TRIGGER trigger_document_version
  AFTER INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.create_document_version();

-- Insérer un template par défaut pour les baux
INSERT INTO public.contract_templates (space_id, nom, description, content, variables, is_default, created_by)
SELECT 
  ms.id,
  'Contrat de Bail Standard',
  'Template standard de contrat de bail résidentiel',
  '{"sections": [
    {"title": "CONTRAT DE BAIL RÉSIDENTIEL", "type": "header"},
    {"title": "Entre les soussignés", "type": "section", "content": "Le Bailleur: {{gestionnaire_name}}\nAdresse: {{gestionnaire_address}}\n\nEt\n\nLe Locataire: {{locataire_name}}\nAdresse: {{locataire_address}}\nTéléphone: {{locataire_phone}}"},
    {"title": "Article 1 - Objet", "type": "section", "content": "Le présent contrat a pour objet la location du bien immobilier suivant:\n\nDésignation: {{property_title}}\nAdresse: {{property_address}}\nType: {{property_type}}\nSurface: {{property_surface}} m²\nNombre de pièces: {{property_rooms}}"},
    {"title": "Article 2 - Durée", "type": "section", "content": "Le bail est consenti pour une durée commençant le {{lease_start_date}} pour une durée indéterminée renouvelable tacitement."},
    {"title": "Article 3 - Loyer", "type": "section", "content": "Le loyer mensuel est fixé à {{monthly_rent}} FCFA, payable le {{payment_day}} de chaque mois.\n\nUn dépôt de garantie de {{caution_amount}} FCFA est versé à la signature du présent contrat."},
    {"title": "Article 4 - Charges", "type": "section", "content": "Les charges suivantes sont à la charge du locataire:\n- Eau\n- Électricité\n- Entretien courant"},
    {"title": "Article 5 - Signatures", "type": "section", "content": "Fait à {{city}}, le {{contract_date}}\n\nLe Bailleur                    Le Locataire\n\n(Signature)                    (Signature)"}
  ]}',
  '["gestionnaire_name", "gestionnaire_address", "locataire_name", "locataire_address", "locataire_phone", "property_title", "property_address", "property_type", "property_surface", "property_rooms", "lease_start_date", "monthly_rent", "payment_day", "caution_amount", "city", "contract_date"]'::jsonb,
  true,
  ms.created_by
FROM public.management_spaces ms
WHERE NOT EXISTS (SELECT 1 FROM public.contract_templates WHERE space_id = ms.id);