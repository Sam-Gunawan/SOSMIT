-- Run this script to initialize the database schema.
-- Run this script only once.

-- == CLEAR ALL EXISTING TABLES ==
-- Drop tables in reverse order to avoid foreign key constraint violations.
DROP TABLE IF EXISTS "AssetChanges" CASCADE;
DROP TABLE IF EXISTS "OpnameSession" CASCADE;
DROP TABLE IF EXISTS "Asset" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "CostCenter" CASCADE;
DROP TABLE IF EXISTS "Site" CASCADE;
DROP TABLE IF EXISTS "SiteGroup" CASCADE;
DROP TABLE IF EXISTS "Region" CASCADE;

-- == LOCATION HIERARCHY TABLES ==
-- Region (Top level)
CREATE TABLE "Region" (
    "id" SERIAL PRIMARY KEY,
    "region_name" VARCHAR(100) UNIQUE NOT NULL
)

-- Site group (Middle level)
CREATE TABLE "SiteGroup" (
    "id" SERIAL PRIMARY KEY,
    "site_group_name" VARCHAR(100) UNIQUE NOT NULL,

    -- Foreign key to Region. On delete cascade means if a Region is deleted, all SiteGroups in that Region are also deleted.
    "region_id" INT NOT NULL REFERENCES "Region"("id") ON DELETE CASCADE
)

-- Site / OU (Most granular level, lowest level)
CREATE TABLE "Site" (
    "id" SERIAL PRIMARY KEY,
    "site_name" VARCHAR(100) UNIQUE NOT NULL,
    "last_opname_date" TIMESTAMP, 

    -- Foreign key to SiteGroup.
    "site_group_id" INT NOT NULL REFERENCES "SiteGroup"("id") ON DELETE CASCADE
)

-- == ENTITY TABLES ==
-- Cost Center
CREATE TABLE "CostCenter" (
    "cost_center_id" INT PRIMARY KEY,
    "cost_center_name" VARCHAR(100) UNIQUE NOT NULL
)

-- User/Employee
CREATE TABLE "User" (
    "user_id" INT PRIMARY KEY,
    "username" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(100) NOT NULL,

    -- Foreign key to Site and Cost Center
    "site_id" INT NOT NULL REFERENCES "Site"("id") ON DELETE CASCADE,
    "cost_center_id" INT NOT NULL REFERENCES "CostCenter"("cost_center_id") ON DELETE CASCADE
)

-- Asset 
CREATE TABLE "Asset" (
    "asset_tag" VARCHAR(12) PRIMARY KEY,
    "serial_number" VARCHAR(25) UNIQUE NOT NULL,
    "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('Deployed', 'In Inventory', 'In Repair', 'Disposed', 'Down', 'On Loan')),
    "product_category" VARCHAR(50) NOT NULL CHECK ("product_category" IN ('Hardware', 'Software')),
    "product_subcategory" VARCHAR(50) NOT NULL CHECK ("product_subcategory" IN ('Processing Unit', 'Peripheral', 'Power Supply')),
    "product_variety" VARCHAR(50) NOT NULL CHECK ("product_variety" IN ('Laptop', 'Desktop', 'Monitor', 'Uninterrupted Power Supply', 'Personal Digital Assistant', 'Printer/Multifunction')),
    "brand_name" VARCHAR(25) NOT NULL,
    "product_name" VARCHAR(50) NOT NULL,

    -- Foreign key to User (owner of the asset). On delete set null means if the User is deleted, the owner_id in Asset will be set to NULL.
    "owner_id" INT NOT NULL REFERENCES "User"("user_id") ON DELETE SET NULL,

    -- Foreign key to Site (where the asset is located).
    "site_id" INT NOT NULL REFERENCES "Site"("id") ON DELETE CASCADE
)


-- == TRANSCATIONAL TABLES ==
-- Transactional means these tables record actions or events that happen to the entities.
-- OpnameSession. Created when a new opname is performed.
CREATE TABLE "OpnameSession" (
    "id" SERIAL PRIMARY KEY,
    "start_date" TIMESTAMP NOT NULL DEFAULT NOW(),
    "end_date" TIMESTAMP,
    "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('Active', 'Completed', 'Verified', 'Rejected')),

    -- Foreign key to User (the user who created the opname session).
    "user_id" INT NOT NULL REFERENCES "User"("user_id"),

    -- Foreign key to User (the user who verified the opname session).
    "approver_id" INT REFERENCES "User"("user_id") ON DELETE SET NULL,
    
    -- Foreign key to Site (the site where the opname session is performed).
    "site_id" INT NOT NULL REFERENCES "Site"("id")
)

-- Asset Changes
CREATE TABLE "AssetChanges" (
    "id" SERIAL PRIMARY KEY,
    "changes" JSONB, -- Storing changes as a JSON object
    "session_id" INT NOT NULL REFERENCES "OpnameSession"("id"),
    "asset_tag" VARCHAR(12) NOT NULL REFERENCES "Asset"("asset_tag") ON DELETE CASCADE
)

-- == COMMENTS ==
-- Add some comments to explain some design choices.
COMMENT ON COLUMN "User"."password" IS 'Stores the hashed password using bcrypt, never plain text.';
COMMENT ON COLUMN "AssetChanges"."changes" IS 'Stores the changes made to the asset in JSON format, e.g. {"status" : "Deployed", "owner_id" : 1234}';