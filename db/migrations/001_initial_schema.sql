-- MapUI PostGIS Schema
-- Enable required extensions

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Artifacts table with geography column for accurate distance calculations
CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    lat DOUBLE PRECISION GENERATED ALWAYS AS (ST_Y(location::geometry)) STORED,
    lng DOUBLE PRECISION GENERATED ALWAYS AS (ST_X(location::geometry)) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index using GIST for fast geographic queries
CREATE INDEX idx_artifacts_location_gist ON artifacts USING GIST (location);

-- Category index for filtering
CREATE INDEX idx_artifacts_category ON artifacts (category);

-- Text search index on name using trigrams
CREATE INDEX idx_artifacts_name_trgm ON artifacts USING GIN (name gin_trgm_ops);

-- Timestamp index for sorting
CREATE INDEX idx_artifacts_created_at ON artifacts (created_at DESC);

-- Composite index for viewport queries
CREATE INDEX idx_artifacts_category_location ON artifacts USING GIST (location) WHERE category IS NOT NULL;

-- Tile metadata table for tracking generated raster tiles
CREATE TABLE tile_metadata (
    id SERIAL PRIMARY KEY,
    layer VARCHAR(100) NOT NULL DEFAULT 'default',
    zoom_level INTEGER NOT NULL,
    tile_x INTEGER NOT NULL,
    tile_y INTEGER NOT NULL,
    format VARCHAR(10) DEFAULT 'png',
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE(layer, zoom_level, tile_x, tile_y, format)
);

CREATE INDEX idx_tile_metadata_zxy ON tile_metadata (layer, zoom_level, tile_x, tile_y);
CREATE INDEX idx_tile_metadata_expires ON tile_metadata (expires_at) WHERE expires_at IS NOT NULL;

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_artifacts_updated_at
    BEFORE UPDATE ON artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Connecticut bounding box reference view (Eversource service territory)
CREATE VIEW connecticut_bounds AS
SELECT
    42.0505 AS north,
    40.9509 AS south,
    -73.7278 AS west,
    -71.7872 AS east,
    ST_MakeEnvelope(-73.7278, 40.9509, -71.7872, 42.0505, 4326) AS envelope;

-- Utility function to check if point is within Connecticut
CREATE OR REPLACE FUNCTION is_in_connecticut(point_lat DOUBLE PRECISION, point_lng DOUBLE PRECISION)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN point_lat >= 40.9509 AND point_lat <= 42.0505
       AND point_lng >= -73.7278 AND point_lng <= -71.7872;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
