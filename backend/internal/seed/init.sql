-- Run this script to initialize the database schema.
-- Run this script only once.

-- == CLEAR ALL EXISTING TABLES ==
-- Drop tables in reverse order to avoid foreign key constraint violations.
DROP TABLE IF EXISTS "AssetChanges" CASCADE;
DROP TABLE IF EXISTS "OpnameSession" CASCADE;
DROP TABLE IF EXISTS "AssetEquipments" CASCADE;
DROP TABLE IF EXISTS "Asset" CASCADE;
DROP TABLE IF EXISTS "ApprovalPath" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "CostCenter" CASCADE;
DROP TABLE IF EXISTS "SubSite" CASCADE;
DROP TABLE IF EXISTS "Department" CASCADE;
DROP TABLE IF EXISTS "Site" CASCADE;
DROP TABLE IF EXISTS "SiteGroup" CASCADE;
DROP TABLE IF EXISTS "Region" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;

-- == LOCATION HIERARCHY TABLES ==
-- Region (Top level)
CREATE TABLE "Region" (
    "id" SERIAL PRIMARY KEY,
    "region_name" VARCHAR(100) UNIQUE NOT NULL
);

-- Site group (Middle level 2)
CREATE TABLE "SiteGroup" (
    "id" SERIAL PRIMARY KEY,
    "site_group_name" VARCHAR(100) UNIQUE NOT NULL,

    -- Foreign key to Region. On delete cascade means if a Region is deleted, all SiteGroups in that Region are also deleted.
    "region_id" INT NOT NULL REFERENCES "Region"("id") ON DELETE CASCADE
);

-- Site (Middle level 1)
CREATE TABLE "Site" (
    "id" SERIAL PRIMARY KEY,
    "site_name" VARCHAR(100) NOT NULL,
    "last_opname_date" TIMESTAMP WITH TIME ZONE DEFAULT '1945-08-17 00:00:00+07',

    -- Foreign key to SiteGroup.
    "site_group_id" INT NOT NULL REFERENCES "SiteGroup"("id") ON DELETE CASCADE,

    -- Foreign key to User (General Affairs staff for the site). Set after the "User" table is created.
    "site_ga_id" INT NOT NULL
);

-- Sub Site / OU (Most granular level, lowest level @ Area)
CREATE TABLE "SubSite" (
    "id" SERIAL PRIMARY KEY,
    "sub_site_name" VARCHAR(100) NOT NULL,

    -- Foreign key to Site.
    "site_id" INT NOT NULL REFERENCES "Site"("id") ON DELETE CASCADE
);

-- Department (Most granular level, lowest level @ Head Office)
CREATE TABLE "Department" (
    "id" SERIAL PRIMARY KEY,
    "dept_name" VARCHAR(100) NOT NULL
);

-- == ENTITY TABLES ==
-- Approval sequence mapping
CREATE TABLE "ApprovalPath" (
    "position" VARCHAR(100) NOT NULL DEFAULT '',
    "sequence" INT NOT NULL,

    -- Foreign key to Site.
    -- Determines which pair of sequence and position belongs to which site.
    "site_id" INT NOT NULL REFERENCES "Site"("id") ON DELETE CASCADE,

    -- A dummy field (not similar to business logic at PT SM) to determine the type of opname conducted on site.
    -- Differentiate between opname done by area's GA and IT Asset from HO.
    "from" VARCHAR(10) NOT NULL,

    -- Primary key will be a combination of all 4 (in case multiple approval paths are available at any given site)
    PRIMARY KEY ("site_id", "position", "sequence", "from"),

    CONSTRAINT ck_positive_seq CHECK ("sequence" > 0)
);

-- Cost Center
CREATE TABLE "CostCenter" (
    "cost_center_id" INT PRIMARY KEY,
    "cost_center_name" VARCHAR(100) UNIQUE NOT NULL
);

-- User/Employee
CREATE TABLE "User" (
    "user_id" INT PRIMARY KEY,
    "username" VARCHAR(255) UNIQUE NOT NULL,
    "email" VARCHAR(255) NOT NULL DEFAULT '', -- For demo purposes, email is not unique.
    "password" VARCHAR(255) NOT NULL, -- For demo purposes, store in plain text for now.
    "first_name" VARCHAR(255) NOT NULL DEFAULT '',
    "last_name" VARCHAR(255) NOT NULL DEFAULT '',
    "position" VARCHAR(100) NOT NULL DEFAULT '',
    "department" VARCHAR(100),
    "division" VARCHAR(100),

    -- Foreign key to Site and Cost Center
    "site_id" INT REFERENCES "Site"("id") ON DELETE CASCADE,
    "cost_center_id" INT REFERENCES "CostCenter"("cost_center_id") ON DELETE CASCADE,

    "ou_code" VARCHAR(5) NOT NULL DEFAULT ''
);

-- Seed vacant user (no site / cost center). Use a reserved ID (e.g., 1) that other seeds avoid.
INSERT INTO "User" (user_id, username, email, password, first_name, last_name, position, department, division, site_id, cost_center_id, ou_code)
VALUES (1, 'VACANT', '', '', 'VACANT', '', '', '', '', NULL, NULL, '')
ON CONFLICT (user_id) DO NOTHING;

-- Asset 
CREATE TABLE "Asset" (
    "asset_tag" VARCHAR(12) PRIMARY KEY,
    "serial_number" VARCHAR(25) UNIQUE NOT NULL,
    "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('Deployed', 'In Inventory', 'In Repair', 'Disposed', 'Down', 'On Loan')),
    "status_reason" VARCHAR(20)
    CHECK (
        ("status" = 'Disposed' AND "status_reason" IN ('Lost', 'Obsolete'))
        OR
        ("status" != 'Disposed' AND "status_reason" = '-1')
    ) DEFAULT '-1',
    "product_category" VARCHAR(50) NOT NULL CHECK ("product_category" IN ('Hardware', 'Software')),
    "product_subcategory" VARCHAR(50) NOT NULL CHECK ("product_subcategory" IN ('Processing Unit', 'Peripheral', 'Power Supply')),
    "product_variety" VARCHAR(50) NOT NULL CHECK ("product_variety" IN ('Laptop', 'Desktop', 'Monitor', 'Uninterrupted Power Supply', 'Personal Digital Assistant', 'Printer/Multifunction')),
    "brand_name" VARCHAR(25) NOT NULL,
    "product_name" VARCHAR(50) NOT NULL,
    "condition" INT NOT NULL DEFAULT 1, -- 0: bad, 1: good, 2: lost (physically lost)
    "condition_notes" TEXT DEFAULT '',
    "loss_notes" TEXT DEFAULT '', -- Notes for lost assets, e.g. "Lost during transport"
    "condition_photo_url" TEXT
    CHECK (
        ("condition" = 1 AND ("condition_photo_url" = '' OR "condition_photo_url" IS NOT NULL))
        OR
        ("condition" = 0 AND "condition_photo_url" != '' AND "condition_photo_url" IS NOT NULL)
    ) DEFAULT '',
    "location" VARCHAR(255),
    "room" VARCHAR(255),
    "equipments" TEXT, -- e.g. "Monitor, Keyboard, Mouse" (can be empty to show no equipments)
    "total_cost" INT,

    -- Put this here for now in case there's any business logic changes in the future to prevent multiple refactoring.
    -- Right now it will be empty; the ones populated at frontend are tied to the owner's department.
    -- Special edge case for handling different owner_dept and user's dept are not yet discussed as of the time of this code commit.
    "owner_dept" VARCHAR(255),

    -- Foreign key to User (owner of the asset).
    "owner_id" INT NOT NULL REFERENCES "User"("user_id"),

    -- Foreign key to SubSite (where the asset is located if it's at area).
    "sub_site_id" INT REFERENCES "SubSite"("id") ON DELETE CASCADE,
    
    -- Foreign key to Department (where the asset is located if it's at HO).
    "dept_id" INT REFERENCES "Department"("id") ON DELETE CASCADE,

    -- Foreign key to Site (where the parent site of the asset's location is).
    "site_id" INT NOT NULL REFERENCES "Site"("id") ON DELETE CASCADE

);

-- Asset Equipment Relationship
CREATE TABLE "AssetEquipments" (
    "product_variety" VARCHAR(50) NOT NULL PRIMARY KEY CHECK ("product_variety" IN ('Laptop', 'Desktop', 'Monitor', 'Uninterrupted Power Supply', 'Personal Digital Assistant', 'Printer/Multifunction')),
    "equipments" TEXT NOT NULL DEFAULT 'Unit'
);

-- == TRANSCATIONAL TABLES ==
-- Transactional means these tables record actions or events that happen to the entities.
-- OpnameSession. Created when a new opname is performed.
CREATE TABLE "OpnameSession" (
    "id" SERIAL PRIMARY KEY,
    "start_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "end_date" TIMESTAMP WITH TIME ZONE,
    "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('Outdated', 'Active', 'Submitted', 'Escalated', 'Verified', 'Rejected')) DEFAULT 'Outdated',

    -- Foreign key to User (the user who created the opname session).
    "user_id" INT NOT NULL REFERENCES "User"("user_id"),

    -- Foreign key to User (the manager who verified/rejected the opname session).
    "manager_reviewer_id" INT REFERENCES "User"("user_id") ON DELETE SET NULL,
    "manager_reviewed_at" TIMESTAMP WITH TIME ZONE,

    -- Foreign key to User (the L1 support who verified/rejected the opname session).
    "l1_reviewer_id" INT REFERENCES "User"("user_id") ON DELETE SET NULL,
    "l1_reviewed_at" TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key to Site (the site where the opname session is performed @Area).
    "site_id" INT REFERENCES "Site"("id") ON DELETE SET NULL,

    -- Foreign key to Department (the department where the opname session is performed @HO).
    "dept_id" INT REFERENCES "Department"("id") ON DELETE SET NULL
);

-- Asset Changes
CREATE TABLE "AssetChanges" (
    "id" SERIAL PRIMARY KEY,
    "changes" JSONB, -- Storing changes as a JSON object
    "change_reason" TEXT NOT NULL, -- Reason for the change. It's required to provide context for the change.

    -- Foreign key to OpnameSession (the opname session in which the changes were made).
    "session_id" INT NOT NULL REFERENCES "OpnameSession"("id") ON DELETE CASCADE,
    
    -- Foreign key to Asset (the asset that was changed).
    "asset_tag" VARCHAR(12) NOT NULL REFERENCES "Asset"("asset_tag") ON DELETE CASCADE,

    "processing_status" VARCHAR(25) NOT NULL CHECK ("processing_status" IN ('pending', 'edited', 'all_good')), -- Status of the change processing

    -- Appears when user wants to generate BAP and is editable then.
    "action_notes" TEXT DEFAULT '',

    CONSTRAINT unique_session_asset UNIQUE (session_id, asset_tag) -- Ensure each asset can only have one change record per session
);

-- ! NOT IMPLEMENTED YET !
CREATE TABLE "Notification" (
    "id" SERIAL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- user_id is a foreign key to User table, meaning each notification is associated with a user.
    "user_id" INT NOT NULL REFERENCES "User"("user_id") ON DELETE CASCADE
);

-- == COMMENTS ==
-- Add some comments to explain some design choices.
COMMENT ON COLUMN "User"."password" IS 'For demo purposes, store in plain text for now.';
COMMENT ON COLUMN "AssetChanges"."changes" IS 'Stores the changes made to the asset in JSON format, e.g. {"status" : "Deployed", "owner_id" : 1234}';