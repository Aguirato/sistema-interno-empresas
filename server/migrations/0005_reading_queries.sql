CREATE INDEX IF NOT EXISTS idx_readings_active_period ON cog_readings(occurred_at DESC,id DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_readings_active_plant_period ON cog_readings(plant_id,occurred_at DESC,id DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_readings_active_unit_period ON cog_readings(unit_id,occurred_at DESC,id DESC) WHERE archived_at IS NULL;
