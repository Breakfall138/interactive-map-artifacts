-- MapUI Layer Support Migration
-- Adds layer column to artifacts and creates layers registry table

-- Add layer column to artifacts table
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS layer VARCHAR(100) NOT NULL DEFAULT 'default';

-- Create index for layer-based queries
CREATE INDEX IF NOT EXISTS idx_artifacts_layer ON artifacts (layer);

-- Composite index for layer + location (common query pattern)
CREATE INDEX IF NOT EXISTS idx_artifacts_layer_location ON artifacts USING GIST (location);

-- Update existing artifacts to 'utility-poc' layer (the original CT seed data)
UPDATE artifacts SET layer = 'utility-poc' WHERE layer = 'default';

-- Create layers registry table for metadata about available layers
CREATE TABLE IF NOT EXISTS layers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(500),
    source_date DATE,
    artifact_count INTEGER DEFAULT 0,
    visible BOOLEAN DEFAULT true,
    style JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for visible layers
CREATE INDEX IF NOT EXISTS idx_layers_visible ON layers (visible) WHERE visible = true;

-- Function to update layer artifact counts
CREATE OR REPLACE FUNCTION update_layer_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO layers (id, name, artifact_count)
        VALUES (NEW.layer, NEW.layer, 1)
        ON CONFLICT (id) DO UPDATE SET
            artifact_count = layers.artifact_count + 1,
            updated_at = NOW();
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE layers SET
            artifact_count = GREATEST(artifact_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.layer;
    ELSIF TG_OP = 'UPDATE' AND OLD.layer IS DISTINCT FROM NEW.layer THEN
        UPDATE layers SET
            artifact_count = GREATEST(artifact_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.layer;
        INSERT INTO layers (id, name, artifact_count)
        VALUES (NEW.layer, NEW.layer, 1)
        ON CONFLICT (id) DO UPDATE SET
            artifact_count = layers.artifact_count + 1,
            updated_at = NOW();
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_layer_count ON artifacts;

-- Create trigger for layer count updates
CREATE TRIGGER trigger_update_layer_count
    AFTER INSERT OR UPDATE OR DELETE ON artifacts
    FOR EACH ROW EXECUTE FUNCTION update_layer_count();

-- Apply updated_at trigger to layers table
DROP TRIGGER IF EXISTS update_layers_updated_at ON layers;
CREATE TRIGGER update_layers_updated_at
    BEFORE UPDATE ON layers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed initial layers
INSERT INTO layers (id, name, description, source) VALUES
    ('utility-poc', 'CT Utility POC', 'Connecticut utility infrastructure seed data', 'generated'),
    ('eversource-substations', 'Eversource Substations', 'HIFLD transmission substations in Eversource territory (CT/MA/NH)', 'HIFLD/ORNL')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    source = EXCLUDED.source,
    updated_at = NOW();

-- Update layer counts from existing data
UPDATE layers l SET artifact_count = (
    SELECT COUNT(*) FROM artifacts a WHERE a.layer = l.id
);

-- Create view for layer summary with bounding box
CREATE OR REPLACE VIEW layer_summary AS
SELECT
    l.id,
    l.name,
    l.description,
    l.source,
    l.artifact_count,
    l.visible,
    l.style,
    l.created_at,
    l.updated_at,
    MIN(a.lat) as min_lat,
    MAX(a.lat) as max_lat,
    MIN(a.lng) as min_lng,
    MAX(a.lng) as max_lng
FROM layers l
LEFT JOIN artifacts a ON a.layer = l.id
GROUP BY l.id, l.name, l.description, l.source, l.artifact_count, l.visible, l.style, l.created_at, l.updated_at;
