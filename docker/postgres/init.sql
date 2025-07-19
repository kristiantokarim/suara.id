-- PostgreSQL initialization script for Suara.id development environment
-- Sets up database with Indonesian-specific configurations and test data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create Indonesian administrative reference tables for development
CREATE TABLE IF NOT EXISTS indonesian_provinces (
    id SERIAL PRIMARY KEY,
    code CHAR(2) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS indonesian_cities (
    id SERIAL PRIMARY KEY,
    province_code CHAR(2) NOT NULL,
    code CHAR(2) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('KABUPATEN', 'KOTA')),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (province_code) REFERENCES indonesian_provinces(code)
);

CREATE TABLE IF NOT EXISTS indonesian_districts (
    id SERIAL PRIMARY KEY,
    city_code CHAR(4) NOT NULL, -- province_code + city_code
    code CHAR(2) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS indonesian_villages (
    id SERIAL PRIMARY KEY,
    district_code CHAR(6) NOT NULL, -- province + city + district
    code CHAR(4) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('KELURAHAN', 'DESA')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample Indonesian administrative data for development
INSERT INTO indonesian_provinces (code, name) VALUES
('11', 'ACEH'),
('12', 'SUMATERA UTARA'),
('13', 'SUMATERA BARAT'),
('14', 'RIAU'),
('15', 'JAMBI'),
('16', 'SUMATERA SELATAN'),
('17', 'BENGKULU'),
('18', 'LAMPUNG'),
('19', 'KEPULAUAN BANGKA BELITUNG'),
('21', 'KEPULAUAN RIAU'),
('31', 'DKI JAKARTA'),
('32', 'JAWA BARAT'),
('33', 'JAWA TENGAH'),
('34', 'DI YOGYAKARTA'),
('35', 'JAWA TIMUR'),
('36', 'BANTEN'),
('51', 'BALI'),
('52', 'NUSA TENGGARA BARAT'),
('53', 'NUSA TENGGARA TIMUR'),
('61', 'KALIMANTAN BARAT'),
('62', 'KALIMANTAN TENGAH'),
('63', 'KALIMANTAN SELATAN'),
('64', 'KALIMANTAN TIMUR'),
('65', 'KALIMANTAN UTARA'),
('71', 'SULAWESI UTARA'),
('72', 'SULAWESI TENGAH'),
('73', 'SULAWESI SELATAN'),
('74', 'SULAWESI TENGGARA'),
('75', 'GORONTALO'),
('76', 'SULAWESI BARAT'),
('81', 'MALUKU'),
('82', 'MALUKU UTARA'),
('91', 'PAPUA BARAT'),
('94', 'PAPUA')
ON CONFLICT (code) DO NOTHING;

-- Jakarta administrative areas (most common for testing)
INSERT INTO indonesian_cities (province_code, code, name, type) VALUES
('31', '01', 'KEPULAUAN SERIBU', 'KABUPATEN'),
('31', '71', 'JAKARTA SELATAN', 'KOTA'),
('31', '72', 'JAKARTA TIMUR', 'KOTA'),
('31', '73', 'JAKARTA PUSAT', 'KOTA'),
('31', '74', 'JAKARTA BARAT', 'KOTA'),
('31', '75', 'JAKARTA UTARA', 'KOTA')
ON CONFLICT DO NOTHING;

-- Jakarta Selatan districts (for detailed testing)
INSERT INTO indonesian_districts (city_code, code, name) VALUES
('3171', '01', 'JAGAKARSA'),
('3171', '02', 'PASAR MINGGU'),
('3171', '03', 'CILANDAK'),
('3171', '04', 'PESANGGRAHAN'),
('3171', '05', 'KEBAYORAN LAMA'),
('3171', '06', 'KEBAYORAN BARU'),
('3171', '07', 'MAMPANG PRAPATAN'),
('3171', '08', 'PANCORAN'),
('3171', '09', 'TEBET'),
('3171', '10', 'SETIA BUDI')
ON CONFLICT DO NOTHING;

-- Kebayoran Baru villages (for complete testing)
INSERT INTO indonesian_villages (district_code, code, name, type) VALUES
('317106', '1001', 'SELONG', 'KELURAHAN'),
('317106', '1002', 'SENAYAN', 'KELURAHAN'),
('317106', '1003', 'KRAMAT PELA', 'KELURAHAN'),
('317106', '1004', 'GUNUNG', 'KELURAHAN'),
('317106', '1005', 'PULO', 'KELURAHAN'),
('317106', '1006', 'MELAWAI', 'KELURAHAN'),
('317106', '1007', 'PETOGOGAN', 'KELURAHAN'),
('317106', '1008', 'GANDARIA UTARA', 'KELURAHAN'),
('317106', '1009', 'CIPETE UTARA', 'KELURAHAN'),
('317106', '1010', 'RAWA BARAT', 'KELURAHAN')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provinces_code ON indonesian_provinces(code);
CREATE INDEX IF NOT EXISTS idx_cities_province_code ON indonesian_cities(province_code);
CREATE INDEX IF NOT EXISTS idx_districts_city_code ON indonesian_districts(city_code);
CREATE INDEX IF NOT EXISTS idx_villages_district_code ON indonesian_villages(district_code);

-- Create full-text search indexes for Indonesian text
CREATE INDEX IF NOT EXISTS idx_provinces_name_fts ON indonesian_provinces USING GIN (to_tsvector('indonesian', name));
CREATE INDEX IF NOT EXISTS idx_cities_name_fts ON indonesian_cities USING GIN (to_tsvector('indonesian', name));
CREATE INDEX IF NOT EXISTS idx_districts_name_fts ON indonesian_districts USING GIN (to_tsvector('indonesian', name));
CREATE INDEX IF NOT EXISTS idx_villages_name_fts ON indonesian_villages USING GIN (to_tsvector('indonesian', name));

-- Create helper functions for Indonesian administrative queries
CREATE OR REPLACE FUNCTION get_full_address(
    p_province_code CHAR(2),
    p_city_code CHAR(2),
    p_district_code CHAR(2),
    p_village_code CHAR(4)
) RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT 
        v.name || ', ' || d.name || ', ' || c.name || ', ' || p.name
    INTO result
    FROM indonesian_villages v
    JOIN indonesian_districts d ON d.district_code = CONCAT(p_province_code, p_city_code, p_district_code)
    JOIN indonesian_cities c ON c.province_code = p_province_code AND c.code = p_city_code
    JOIN indonesian_provinces p ON p.code = p_province_code
    WHERE v.district_code = CONCAT(p_province_code, p_city_code, p_district_code)
    AND v.code = p_village_code;
    
    RETURN COALESCE(result, 'Address not found');
END;
$$ LANGUAGE plpgsql;

-- Create function to validate NIK against administrative codes
CREATE OR REPLACE FUNCTION validate_nik_administrative(
    p_nik CHAR(16)
) RETURNS BOOLEAN AS $$
DECLARE
    province_code CHAR(2);
    city_code CHAR(2);
    district_code CHAR(2);
BEGIN
    -- Extract codes from NIK
    province_code := SUBSTRING(p_nik, 1, 2);
    city_code := SUBSTRING(p_nik, 3, 2);
    district_code := SUBSTRING(p_nik, 5, 2);
    
    -- Check if administrative codes exist
    RETURN EXISTS (
        SELECT 1 
        FROM indonesian_districts d
        JOIN indonesian_cities c ON c.province_code = province_code AND c.code = city_code
        JOIN indonesian_provinces p ON p.code = province_code
        WHERE d.city_code = CONCAT(province_code, city_code)
        AND d.code = district_code
    );
END;
$$ LANGUAGE plpgsql;

-- Create test users for development
-- This will be populated by Prisma migrations, but we prepare the groundwork

-- Set up Indonesian text search configuration
CREATE TEXT SEARCH CONFIGURATION indonesian (COPY = simple);
CREATE TEXT SEARCH DICTIONARY indonesian_stem (
    TEMPLATE = simple,
    STOPWORDS = indonesian
);

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE suara_dev TO suara;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO suara;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO suara;

-- Display initialization success message
DO $$
BEGIN
    RAISE NOTICE 'Suara.id development database initialized successfully!';
    RAISE NOTICE 'Database: suara_dev';
    RAISE NOTICE 'User: suara';
    RAISE NOTICE 'Administrative data loaded for: % provinces, % cities/regencies', 
        (SELECT COUNT(*) FROM indonesian_provinces),
        (SELECT COUNT(*) FROM indonesian_cities);
END $$;