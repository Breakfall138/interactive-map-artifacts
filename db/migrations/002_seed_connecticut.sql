-- Seed Connecticut utility infrastructure data for Eversource service territory
-- Generates approximately 10,000 artifacts across Connecticut

-- Connecticut major cities for clustering
-- Hartford (capital): 41.7658, -72.6734
-- New Haven: 41.3083, -72.9279
-- Bridgeport: 41.1792, -73.1894
-- Stamford: 41.0534, -73.5387
-- Waterbury: 41.5582, -73.0515
-- Norwalk: 41.1176, -73.4079
-- Danbury: 41.3948, -73.4540
-- New Britain: 41.6612, -72.7795

-- Helper function to generate random CT artifacts
CREATE OR REPLACE FUNCTION generate_ct_utility_artifacts(artifact_count INTEGER)
RETURNS void AS $$
DECLARE
    categories TEXT[] := ARRAY[
        'substation',
        'transformer',
        'pole',
        'meter',
        'transmission_line',
        'distribution_line',
        'switch',
        'capacitor_bank'
    ];

    voltages_high TEXT[] := ARRAY['69kV', '115kV', '345kV'];
    voltages_dist TEXT[] := ARRAY['4kV', '13.8kV', '23kV', '27.6kV'];
    statuses TEXT[] := ARRAY['active', 'active', 'active', 'active', 'maintenance', 'planned'];

    i INTEGER;
    rand_cat TEXT;
    rand_lat DOUBLE PRECISION;
    rand_lng DOUBLE PRECISION;
    rand_voltage TEXT;
    rand_status TEXT;
    base_name TEXT;
BEGIN
    FOR i IN 1..artifact_count LOOP
        -- Random category with weighted distribution
        -- More poles and meters than substations
        rand_cat := CASE
            WHEN random() < 0.35 THEN 'pole'
            WHEN random() < 0.55 THEN 'meter'
            WHEN random() < 0.70 THEN 'transformer'
            WHEN random() < 0.80 THEN 'distribution_line'
            WHEN random() < 0.88 THEN 'switch'
            WHEN random() < 0.94 THEN 'transmission_line'
            WHEN random() < 0.97 THEN 'capacitor_bank'
            ELSE 'substation'
        END;

        -- Generate location within Connecticut bounds with some clustering
        -- Add variation to create natural distribution
        rand_lat := 41.0 + (random() * 1.0); -- 41.0 to 42.0
        rand_lng := -73.6 + (random() * 1.8); -- -73.6 to -71.8

        -- Determine voltage based on category
        IF rand_cat IN ('substation', 'transmission_line') THEN
            rand_voltage := voltages_high[1 + floor(random() * array_length(voltages_high, 1))::int];
        ELSIF rand_cat IN ('transformer', 'distribution_line', 'capacitor_bank') THEN
            rand_voltage := voltages_dist[1 + floor(random() * array_length(voltages_dist, 1))::int];
        ELSE
            rand_voltage := NULL;
        END IF;

        rand_status := statuses[1 + floor(random() * array_length(statuses, 1))::int];

        -- Generate descriptive name
        base_name := CASE rand_cat
            WHEN 'substation' THEN 'Substation'
            WHEN 'transformer' THEN 'Transformer'
            WHEN 'pole' THEN 'Utility Pole'
            WHEN 'meter' THEN 'Smart Meter'
            WHEN 'transmission_line' THEN 'Transmission Line'
            WHEN 'distribution_line' THEN 'Distribution Line'
            WHEN 'switch' THEN 'Switch'
            WHEN 'capacitor_bank' THEN 'Capacitor Bank'
        END;

        INSERT INTO artifacts (name, category, description, metadata, location)
        VALUES (
            base_name || ' CT-' || lpad(i::text, 6, '0'),
            rand_cat,
            'Eversource ' || initcap(replace(rand_cat, '_', ' ')) || ' in Connecticut service territory.',
            jsonb_build_object(
                'voltage', rand_voltage,
                'status', rand_status,
                'install_year', 1980 + floor(random() * 45)::int,
                'last_inspection', (NOW() - (random() * interval '730 days'))::date,
                'asset_id', 'ES-CT-' || upper(substr(rand_cat, 1, 3)) || '-' || lpad(i::text, 6, '0'),
                'region', 'connecticut',
                'utility', 'eversource'
            ),
            ST_SetSRID(ST_MakePoint(rand_lng, rand_lat), 4326)::geography
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate base artifacts spread across Connecticut (8000)
SELECT generate_ct_utility_artifacts(8000);

-- Add clustered artifacts around major cities

-- Hartford area (state capital, major grid hub) - 600 artifacts
INSERT INTO artifacts (name, category, description, metadata, location)
SELECT
    'Hartford ' ||
    (ARRAY['Substation', 'Transformer', 'Pole', 'Meter', 'Switch'])[1 + floor(random() * 5)::int] ||
    ' #' || generate_series,
    (ARRAY['substation', 'transformer', 'pole', 'meter', 'switch'])[1 + floor(random() * 5)::int],
    'Critical infrastructure in Hartford metropolitan area - Eversource primary service hub.',
    jsonb_build_object(
        'priority', 'high',
        'region', 'hartford',
        'status', 'active',
        'utility', 'eversource'
    ),
    ST_SetSRID(ST_MakePoint(
        -72.6734 + (random() - 0.5) * 0.12,
        41.7658 + (random() - 0.5) * 0.08
    ), 4326)::geography
FROM generate_series(1, 600);

-- New Haven area - 450 artifacts
INSERT INTO artifacts (name, category, description, metadata, location)
SELECT
    'New Haven ' ||
    (ARRAY['Substation', 'Transformer', 'Pole', 'Meter', 'Switch'])[1 + floor(random() * 5)::int] ||
    ' #' || generate_series,
    (ARRAY['substation', 'transformer', 'pole', 'meter', 'switch'])[1 + floor(random() * 5)::int],
    'Infrastructure serving New Haven and Yale University area.',
    jsonb_build_object(
        'priority', 'high',
        'region', 'new_haven',
        'status', 'active',
        'utility', 'eversource'
    ),
    ST_SetSRID(ST_MakePoint(
        -72.9279 + (random() - 0.5) * 0.10,
        41.3083 + (random() - 0.5) * 0.07
    ), 4326)::geography
FROM generate_series(1, 450);

-- Bridgeport area (largest city) - 400 artifacts
INSERT INTO artifacts (name, category, description, metadata, location)
SELECT
    'Bridgeport ' ||
    (ARRAY['Substation', 'Transformer', 'Pole', 'Meter', 'Switch'])[1 + floor(random() * 5)::int] ||
    ' #' || generate_series,
    (ARRAY['substation', 'transformer', 'pole', 'meter', 'switch'])[1 + floor(random() * 5)::int],
    'Infrastructure serving Bridgeport industrial corridor.',
    jsonb_build_object(
        'priority', 'medium',
        'region', 'bridgeport',
        'status', 'active',
        'utility', 'eversource'
    ),
    ST_SetSRID(ST_MakePoint(
        -73.1894 + (random() - 0.5) * 0.09,
        41.1792 + (random() - 0.5) * 0.06
    ), 4326)::geography
FROM generate_series(1, 400);

-- Stamford area (financial hub) - 350 artifacts
INSERT INTO artifacts (name, category, description, metadata, location)
SELECT
    'Stamford ' ||
    (ARRAY['Substation', 'Transformer', 'Pole', 'Meter', 'Switch'])[1 + floor(random() * 5)::int] ||
    ' #' || generate_series,
    (ARRAY['substation', 'transformer', 'pole', 'meter', 'switch'])[1 + floor(random() * 5)::int],
    'High-density infrastructure in Stamford financial district.',
    jsonb_build_object(
        'priority', 'critical',
        'region', 'stamford',
        'status', 'active',
        'utility', 'eversource'
    ),
    ST_SetSRID(ST_MakePoint(
        -73.5387 + (random() - 0.5) * 0.07,
        41.0534 + (random() - 0.5) * 0.05
    ), 4326)::geography
FROM generate_series(1, 350);

-- Waterbury area - 200 artifacts
INSERT INTO artifacts (name, category, description, metadata, location)
SELECT
    'Waterbury ' ||
    (ARRAY['Transformer', 'Pole', 'Meter', 'Switch'])[1 + floor(random() * 4)::int] ||
    ' #' || generate_series,
    (ARRAY['transformer', 'pole', 'meter', 'switch'])[1 + floor(random() * 4)::int],
    'Infrastructure in Waterbury area.',
    jsonb_build_object(
        'priority', 'medium',
        'region', 'waterbury',
        'status', 'active',
        'utility', 'eversource'
    ),
    ST_SetSRID(ST_MakePoint(
        -73.0515 + (random() - 0.5) * 0.08,
        41.5582 + (random() - 0.5) * 0.06
    ), 4326)::geography
FROM generate_series(1, 200);

-- Clean up helper function
DROP FUNCTION IF EXISTS generate_ct_utility_artifacts(INTEGER);

-- Verify data
DO $$
DECLARE
    artifact_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO artifact_count FROM artifacts;
    RAISE NOTICE 'Seeded % artifacts for Connecticut', artifact_count;
END $$;
