DROP FUNCTION IF EXISTS public.get_credentials(VARCHAR);
DROP FUNCTION IF EXISTS public.get_all_users();
DROP FUNCTION IF EXISTS public.get_user_by_id(INT);
DROP FUNCTION IF EXISTS public.get_user_by_username(VARCHAR);
DROP FUNCTION IF EXISTS public.get_user_site_cards(INT);
DROP FUNCTION IF EXISTS public.get_l1_support_emails();
DROP FUNCTION IF EXISTS public.get_asset_by_tag(VARCHAR);
DROP FUNCTION IF EXISTS public.get_asset_by_serial_number(VARCHAR);
DROP FUNCTION IF EXISTS public.get_assets_by_site(INT);
DROP FUNCTION IF EXISTS public.create_new_opname_session(INT, INT);
DROP FUNCTION IF EXISTS public.get_opname_session_by_id(INT);
DROP PROCEDURE IF EXISTS public.finish_opname_session(INT);
DROP PROCEDURE IF EXISTS public.delete_opname_session(INT);
DROP FUNCTION IF EXISTS public.record_asset_change(INT, VARCHAR(12), VARCHAR(20), VARCHAR(20), BOOLEAN, TEXT, TEXT, VARCHAR(255), VARCHAR(255), INT, INT, TEXT);
DROP PROCEDURE IF EXISTS public.delete_asset_change(INT, VARCHAR(12));
DROP FUNCTION IF EXISTS public.get_asset_change_photo(INT, VARCHAR(12));
DROP FUNCTION IF EXISTS public.get_all_photos_by_session_id(INT);
DROP FUNCTION IF EXISTS public.get_all_sites();
DROP FUNCTION IF EXISTS public.get_site_by_id(INT);
DROP FUNCTION IF EXISTS public.load_opname_progress(INT);
DROP FUNCTION IF EXISTS public.get_opname_by_date_and_site(DATE, INT);

-- get_credentials retrieves user credentials by username (for login auth)
-- ! email not implemented yet
CREATE OR REPLACE FUNCTION public.get_credentials(_username VARCHAR(255))
    RETURNS table (
		user_id INT,
        username VARCHAR(255),
        "password" VARCHAR(255),
        "position" VARCHAR(100)
    )
    LANGUAGE plpgsql
AS $$
    BEGIN
        RETURN QUERY
        SELECT u.user_id, u.username, u.password, u.position
        FROM "User" AS u
        WHERE LOWER(u.username) = LOWER(_username);
    END;
$$;

-- get_all_users retrieves all users with their details
CREATE OR REPLACE FUNCTION public.get_all_users()
	RETURNS TABLE (
		user_id INT,
		username VARCHAR(255),
		email VARCHAR(255),
		first_name VARCHAR(255),
		last_name VARCHAR(255),
		"position" VARCHAR(100),
		site_id INT,
		site_name VARCHAR(100),
		site_group_name VARCHAR(100),
		region_name VARCHAR(100),
		cost_center_id INT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN 
		RETURN QUERY
		SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u."position", s.id, s.site_name, sg.site_group_name, r.region_name, u.cost_center_id
		FROM "User" AS u
		INNER JOIN "Site" AS s ON u.site_id = s.id
		INNER JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
		INNER JOIN "Region" AS r ON sg.region_id = r.id;
	END;
$$;

-- get_user_by_id retrieves user details by user ID
CREATE OR REPLACE FUNCTION public.get_user_by_id(_user_id INT)
	RETURNS table (
		user_id INT,
		username VARCHAR(255),
		email VARCHAR(255),
		first_name VARCHAR(255),
		last_name VARCHAR(255),
		"position" VARCHAR(100),
		site_id INT,
		site_name VARCHAR(100),
		site_group_name VARCHAR(100),
		region_name VARCHAR(100),
		cost_center_id INT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN 
		RETURN QUERY
		SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u."position", s.id AS site_id, s.site_name, sg.site_group_name, r.region_name, u.cost_center_id
		FROM "User" AS u
		INNER JOIN "Site" AS s ON u.site_id = s.id
		INNER JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
		INNER JOIN "Region" AS r ON sg.region_id = r.id
		WHERE u.user_id = _user_id; 
	END;
$$;

-- get_user_by_username retrieves user details by username
CREATE OR REPLACE FUNCTION public.get_user_by_username(_username VARCHAR(255))
	RETURNS table (
		user_id INT,
		username VARCHAR(255),
		email VARCHAR(255),
		first_name VARCHAR(255),
		last_name VARCHAR(255),
		"position" VARCHAR(100),
		site_id INT,
		site_name VARCHAR(100),
		site_group_name VARCHAR(100),
		region_name VARCHAR(100),
		cost_center_id INT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN 
		RETURN QUERY
		SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u."position", s.id AS site_id, s.site_name, sg.site_group_name, r.region_name, u.cost_center_id
		FROM "User" AS u
		INNER JOIN "Site" AS s ON u.site_id = s.id
		INNER JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
		INNER JOIN "Region" AS r ON sg.region_id = r.id
		WHERE LOWER(u.username) = LOWER(_username); 
	END;
$$;

-- get_user_site_cards retrieves all the sites a user has access to using their user_id
-- Note: This function assumes that "l1 support" users can see all sites, while others are restricted to their region.
-- It returns site details along with the latest opname session if available.
CREATE OR REPLACE FUNCTION public.get_user_site_cards(_user_id INT)
	RETURNS TABLE (
		site_id INT,
		site_name VARCHAR(100),
		site_group_name VARCHAR(100),
		region_name VARCHAR(100),
		site_ga_id INT,
		opname_session_id INT,
		opname_status VARCHAR(20),
		last_opname_date TIMESTAMP WITH TIME ZONE
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
			SELECT s.id AS site_id, s.site_name, sg.site_group_name, r.region_name, 
				s.site_ga_id,
				COALESCE(os.id, -1) AS opname_session_id,
				COALESCE(os.status, 'Outdated') AS opname_status,
				COALESCE(os.end_date, s.last_opname_date) AS last_opname_date
			FROM "User" AS u
			-- For "l1 support", join all sites; for others, restrict to user's region
			CROSS JOIN "Site" AS s
			INNER JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
			INNER JOIN "Region" AS r ON sg.region_id = r.id
			LEFT JOIN "OpnameSession" AS os ON s.id = os.site_id AND
				os.status IN ('Active', 'Completed', 'Verified', 'Rejected', 'Outdated')
			WHERE u.user_id = _user_id
			  AND (
				LOWER(u.position) = 'l1 support'
				OR (
					LOWER(u.position) = 'admin staff general affairs'
					AND r.id = (
						SELECT user_r.id
						FROM "Site" AS user_site
						INNER JOIN "SiteGroup" AS user_sg ON user_site.site_group_id = user_sg.id
						INNER JOIN "Region" AS user_r ON user_sg.region_id = user_r.id
						WHERE user_site.id = u.site_id
						LIMIT 1
					)
				)
			  )
			ORDER BY s.site_name;
	END;
$$;

-- get_l1_support_emails retrieves all L1 support users' emails
CREATE OR REPLACE FUNCTION public.get_l1_support_emails()
	RETURNS TABLE (
		email VARCHAR(255)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
			SELECT u.email
			FROM "User" AS u
			WHERE LOWER(u.position) = 'l1 support'
			ORDER BY u.email;
	END;
$$;

-- get_asset_by_tag retrieves asset details by asset tag
CREATE OR REPLACE FUNCTION public.get_asset_by_tag(_asset_tag VARCHAR(12))
	RETURNS TABLE (
		asset_tag VARCHAR(12),
		serial_number VARCHAR(25),
		"status" VARCHAR(20),
		status_reason VARCHAR(20),
		product_category VARCHAR(50),
		product_subcategory VARCHAR(50),
		product_variety VARCHAR(50),
		brand_name VARCHAR(25),
		product_name VARCHAR(50),
		condition BOOLEAN,
		condition_notes TEXT,
		condition_photo_url TEXT,
		"location" VARCHAR(255),
		room VARCHAR(255),
		owner_id INT,
		owner_name VARCHAR(510),
		owner_position VARCHAR(100),
		owner_cost_center INT,
		site_id INT,
		site_name VARCHAR(100),
		site_group_name VARCHAR(100),
		region_name VARCHAR(100)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
			SELECT a.asset_tag, a.serial_number, a.status, a.status_reason,
				a.product_category, a.product_subcategory, a.product_variety,
				a.brand_name, a.product_name, 
				a.condition, a.condition_notes, a.condition_photo_url::TEXT,
				a.location, a.room,
				a.owner_id,
				(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))::VARCHAR(510) AS owner_name,
				u.position AS owner_position,
				u.cost_center_id AS owner_cost_center,
				a.site_id,
				s.site_name AS site_name,
				sg.site_group_name AS site_group_name,
				r.region_name AS region_name
			FROM "Asset" AS a
			LEFT JOIN "User" AS u ON a.owner_id = u.user_id
			LEFT JOIN "Site" AS s ON a.site_id = s.id
			LEFT JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
			LEFT JOIN "Region" AS r ON sg.region_id = r.id
			WHERE a.asset_tag = _asset_tag;
	END;
$$;

-- get_assets_by_serial_number retrieves asset details by serial number
CREATE OR REPLACE FUNCTION public.get_asset_by_serial_number(_serial_number VARCHAR(25))
	RETURNS TABLE (
		asset_tag VARCHAR(12),
		serial_number VARCHAR(25),
		"status" VARCHAR(20),
		status_reason VARCHAR(20),
		product_category VARCHAR(50),
		product_subcategory VARCHAR(50),
		product_variety VARCHAR(50),
		brand_name VARCHAR(25),
		product_name VARCHAR(50),
		condition BOOLEAN,
		condition_notes TEXT,
		condition_photo_url TEXT,
		"location" VARCHAR(255),
		room VARCHAR(255),
		owner_id INT,
		owner_name VARCHAR(510),
		owner_position VARCHAR(100),
		owner_cost_center INT,
		site_id INT,
		site_name VARCHAR(100),
		site_group_name VARCHAR(100),
		region_name VARCHAR(100)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
			SELECT a.asset_tag, a.serial_number, a.status, a.status_reason,
				a.product_category, a.product_subcategory, a.product_variety,
				a.brand_name, a.product_name, 
				a.condition, a.condition_notes, a.condition_photo_url::TEXT,
				a.location, a.room,
				a.owner_id,
				(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))::VARCHAR(510) AS owner_name,
				u.position AS owner_position,
				u.cost_center_id AS owner_cost_center,
				a.site_id,
				s.site_name AS site_name,
				sg.site_group_name AS site_group_name,
				r.region_name AS region_name
			FROM "Asset" AS a
			LEFT JOIN "User" AS u ON a.owner_id = u.user_id
			LEFT JOIN "Site" AS s ON a.site_id = s.id
			LEFT JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
			LEFT JOIN "Region" AS r ON sg.region_id = r.id
			WHERE a.serial_number = _serial_number;
	END;
$$;

-- get_assets_by_site retrieves all assets for a given site
CREATE OR REPLACE FUNCTION public.get_assets_by_site(_site_id INT)
	RETURNS TABLE (
		asset_tag VARCHAR(12)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
			SELECT a.asset_tag
			FROM "Asset" AS a
			WHERE a.site_id = _site_id;
	END;
$$;

-- create_new_opname_session creates a new opname session for a site
CREATE OR REPLACE FUNCTION public.create_new_opname_session(
	-- The ID of the user creating the session (from JWT).
	_user_id INT,
	-- The ID of the site for which the session is being created (from request body).
	_site_id INT
) RETURNS INT -- Returns the new session ID, or 0 if it fails.
	LANGUAGE plpgsql
AS $$
	DECLARE
		-- Local variable to count existing ongoing sessions for the site.
		-- Sessions in 'Active' and 'Completed' status are considered ongoing.
		_ongoing_session_count INT;
		_new_session_id INT := 0; -- Initialize to 0, will be set if a new session is created.
	BEGIN
		-- Check if there are any active opname sessions for the site.
		-- Count how many rows in "OpnameSession" have the same site_id and status 'Active' or 'Completed'.
		SELECT COUNT(*)
		INTO _ongoing_session_count
		FROM "OpnameSession"
		WHERE site_id = _site_id AND ("status" = 'Active' OR "status" = 'Completed');

		-- If there are no ongoing sessions, proceed to create a new one.
		IF _ongoing_session_count = 0 THEN
			-- Insert a new opname session into the OpnameSession table.
			INSERT INTO "OpnameSession" (user_id, site_id, "status", start_date)
			VALUES (_user_id, _site_id, 'Active', NOW())
			-- Get the ID of the newly created session.
			-- The 'RETURNING' clause allows us to capture the new session ID.
			RETURNING id INTO _new_session_id;

			RAISE NOTICE 'New opname session created with ID: %', _new_session_id;
		ELSE
			-- If there is already an active session, do nothing. _new_session_id will remain 0.
			RAISE NOTICE 'An ongoing opname session already exists for site ID: %, cannot create a new one.', _site_id;
		END IF;

		RETURN _new_session_id;
	END;
$$;

CREATE OR REPLACE FUNCTION public.get_opname_session_by_id(_session_id INT)
	RETURNS TABLE (
		id INT,
		"start_date" TIMESTAMP WITH TIME ZONE,
		end_date TIMESTAMP WITH TIME ZONE,
		"status" VARCHAR(20),
		user_id INT,
		approver_id INT,
		site_id INT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT os.id, os."start_date", os.end_date, os."status", os.user_id, os.approver_id, os.site_id
		FROM "OpnameSession" AS os
		WHERE os.id = _session_id;
	END;
$$;

-- finish_opname_session marks an opname session as finished
CREATE OR REPLACE PROCEDURE public.finish_opname_session(_session_id INT)
	LANGUAGE plpgsql
AS $$
	BEGIN
		-- Check if the opname session exists and is currently active
		IF NOT EXISTS (
			SELECT 1
			FROM "OpnameSession"
			WHERE id = _session_id AND "status" = 'Active'
		) THEN
			RAISE EXCEPTION 'No active opname session found with ID: %', _session_id;
		END IF;

		-- Check if there any asset changes recorded for this session
		IF NOT EXISTS (
			SELECT 1
			FROM "AssetChanges"
			WHERE session_id = _session_id
		) THEN
			RAISE EXCEPTION 'No asset changes recorded for opname session ID: %', _session_id;
		END IF;

		-- Update the opname session to mark it as finished
		UPDATE "OpnameSession"
		SET "status" = 'Completed', end_date = NOW()
		WHERE id = _session_id;

		-- Update the site's last_opname_date to the end date as well
		UPDATE "Site"
		SET last_opname_date = NOW()
		WHERE id = (SELECT site_id FROM "OpnameSession" WHERE id = _session_id);

		RAISE NOTICE 'Opname session with ID: % has been marked as finished.', _session_id;
	END;
$$;

-- delete_opname_session deletes an opname session by session ID
CREATE OR REPLACE PROCEDURE public.delete_opname_session(_session_id INT)
	LANGUAGE plpgsql
AS $$
	BEGIN
		-- Delete the opname session with the given session ID.
		-- Note: This procedure deletes the session and all associated asset changes thanks to 'ON DELETE CASCADE' clause when defining "AssetChanges" table.
		DELETE FROM "OpnameSession"
		WHERE id = _session_id;
		RAISE NOTICE 'Opname session with ID: % has been deleted.', _session_id;
	END;
$$;

-- record_asset_change records changes made to an asset during an opname session
CREATE OR REPLACE FUNCTION public.record_asset_change(
	_session_id INT,
	_asset_tag VARCHAR(12),
	_new_status VARCHAR(20),
	_new_status_reason VARCHAR(20),
	_new_condition BOOLEAN,
	_new_condition_notes TEXT,
	_new_condition_photo_url TEXT,
	_new_location VARCHAR(255),
	_new_room VARCHAR(255),
	_new_owner_id INT,
	_new_site_id INT,
	_change_reason TEXT
) RETURNS JSONB
	LANGUAGE plpgsql
AS $$
	DECLARE
		_old_data RECORD;
		_changes JSONB := '{}'::JSONB; -- Initialize an empty JSONB object to store changes
	BEGIN
		-- Fetch the current state of the asset before making changes
		SELECT * INTO _old_data
		FROM "Asset"
		WHERE asset_tag = _asset_tag;
		-- If no asset is found, raise an exception
		IF NOT FOUND THEN
			RAISE EXCEPTION 'Asset with tag % not found', _asset_tag;
		END IF;

		-- Compare the old and new values, and build the changes JSONB object
		-- Only include changes that are different from the old data
		IF _new_status IS NOT NULL AND _new_status IS DISTINCT FROM _old_data.status THEN
			_changes := jsonb_set(_changes, '{newStatus}', to_jsonb(_new_status));
		END IF;
		IF _new_status_reason IS NOT NULL AND _new_status_reason IS DISTINCT FROM _old_data.status_reason THEN
			_changes := jsonb_set(_changes, '{newStatusReason}', to_jsonb(_new_status_reason));
		END IF;
		IF _new_condition IS NOT NULL AND _new_condition IS DISTINCT FROM _old_data.condition THEN
			_changes := jsonb_set(_changes, '{newCondition}', to_jsonb(_new_condition));
		END IF;
		IF _new_condition_notes IS NOT NULL AND _new_condition_notes IS DISTINCT FROM _old_data.condition_notes THEN
			_changes := jsonb_set(_changes, '{newConditionNotes}', to_jsonb(_new_condition_notes));
		END IF;
		IF _new_condition_photo_url IS NOT NULL AND _new_condition_photo_url IS DISTINCT FROM _old_data.condition_photo_url THEN
			_changes := jsonb_set(_changes, '{newConditionPhotoURL}', to_jsonb(_new_condition_photo_url));
		END IF;
		IF _new_location IS NOT NULL AND _new_location IS DISTINCT FROM _old_data.location THEN
			_changes := jsonb_set(_changes, '{newLocation}', to_jsonb(_new_location));
		END IF;
		IF _new_room IS NOT NULL AND _new_room IS DISTINCT FROM _old_data.room THEN
			_changes := jsonb_set(_changes, '{newRoom}', to_jsonb(_new_room));
		END IF;
		IF _new_owner_id IS NOT NULL AND _new_owner_id IS DISTINCT FROM _old_data.owner_id THEN
			_changes := jsonb_set(_changes, '{newOwnerID}', to_jsonb(_new_owner_id));
		END IF;
		IF _new_site_id IS NOT NULL AND _new_site_id IS DISTINCT FROM _old_data.site_id THEN
			_changes := jsonb_set(_changes, '{newSiteID}', to_jsonb(_new_site_id));
		END IF;

		-- Regardless of whether changes were made, we will insert a record of the changes.
		INSERT INTO "AssetChanges" (session_id, asset_tag, "changes", change_reason)
		VALUES (_session_id, _asset_tag, _changes, _change_reason)
		ON CONFLICT (session_id, asset_tag) DO UPDATE
		SET
			"changes" = _changes, -- Completely replace the existing changes with the new ones
			change_reason = EXCLUDED.change_reason; -- Update the change reason

		RETURN _changes;
	END;
$$;

-- delete_asset_change deletes an asset change record by session ID and asset tag
CREATE OR REPLACE PROCEDURE public.delete_asset_change(_session_id INT, _asset_tag VARCHAR(12))
	LANGUAGE plpgsql
AS $$
	BEGIN
		-- Check if the asset change record exists before attempting to delete
		IF NOT EXISTS (
			SELECT 1
			FROM "AssetChanges"
			WHERE session_id = _session_id AND asset_tag = _asset_tag
		) THEN
			RAISE EXCEPTION 'No asset change record found for session ID: %, asset tag: %', _session_id, _asset_tag;
		END IF;
		
		-- Delete the asset change record for the given session ID and asset tag.
		DELETE FROM "AssetChanges"
		WHERE session_id = _session_id AND asset_tag = _asset_tag;

		RAISE NOTICE 'Asset change record for session ID: %, asset tag: % has been deleted.', _session_id, _asset_tag;
	END;
$$;

-- get_asset_change retrieves the changes made to an asset during an opname session
CREATE OR REPLACE FUNCTION public.get_asset_change(_session_id INT, _asset_tag VARCHAR(12))
	RETURNS TABLE (
		id INT,
		"changes" JSONB,
		change_reason TEXT,
		asset_tag VARCHAR(12)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT ac.id, ac."changes", ac.change_reason, ac.asset_tag
		FROM "AssetChanges" AS ac
		WHERE ac.session_id = _session_id AND ac.asset_tag = _asset_tag;
	END;
$$;

-- get_asset_change retrieves the condition photo of a specific asset change by session ID and asset tag
CREATE OR REPLACE FUNCTION public.get_asset_change_photo(_session_id INT, _asset_tag VARCHAR(12))
	RETURNS TABLE (
		condition_photo_url TEXT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		-- Get the condition photo URL for the specified asset change JSON key
		SELECT ac.changes ->> 'newConditionPhotoURL' as condition_photo_url
		FROM "AssetChanges" AS ac
		WHERE ac.session_id = _session_id AND ac.asset_tag = _asset_tag;
	END;
$$;

-- get_all_photos_by_session_id retrieves all condition photos for a given opname session
CREATE OR REPLACE FUNCTION public.get_all_photos_by_session_id(_session_id INT)
	RETURNS TABLE (
		condition_photo_url TEXT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT ac.changes ->> 'newConditionPhotoURL' AS condition_photo_url
		FROM "AssetChanges" AS ac
		WHERE ac.session_id = _session_id
		  AND ac.changes ? 'newConditionPhotoURL'; -- Ensure the key exists in the JSONB object
	END;
$$;

-- get_all_sites retrieves all sites with their details
CREATE OR REPLACE FUNCTION public.get_all_sites()
	RETURNS TABLE (
		site_id INT,
		site_name VARCHAR(100),
		site_group_name VARCHAR(100),
		region_name VARCHAR(100),
		site_ga_id INT,
		site_ga_name VARCHAR(255),
		site_ga_email VARCHAR(255)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT s.id, s.site_name, sg.site_group_name, r.region_name, s.site_ga_id,
			(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))::VARCHAR(510) AS site_ga_name,
			u.email AS site_ga_email
		FROM "Site" AS s
		INNER JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
		INNER JOIN "Region" AS r ON sg.region_id = r.id
		INNER JOIN "User" AS u ON s.site_ga_id = u.user_id;
	END;
$$;

-- get_site_by_id retrieves site details by site ID
CREATE OR REPLACE FUNCTION public.get_site_by_id(_site_id INT)
	RETURNS TABLE (
		site_id INT,
		site_name VARCHAR(100),
		site_group_name VARCHAR(100),
		region_name VARCHAR(100),
		site_ga_id INT,
		site_ga_name VARCHAR(255),
		site_ga_email VARCHAR(255)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT s.id, s.site_name, sg.site_group_name, r.region_name, s.site_ga_id,
			(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))::VARCHAR(510) AS site_ga_name,
			u.email AS site_ga_email
		FROM "Site" AS s
		INNER JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
		INNER JOIN "Region" AS r ON sg.region_id = r.id
		INNER JOIN "User" AS u ON s.site_ga_id = u.user_id
		WHERE s.id = _site_id;
	END;
$$;

-- load_opname_progress loads the latest scan progress for a given opname session
CREATE OR REPLACE FUNCTION public.load_opname_progress(_session_id INT)
	RETURNS TABLE (
		id INT,
		"changes" JSONB,
		change_reason TEXT,
		asset_tag VARCHAR(12)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT ac.id, ac."changes", ac.change_reason, ac.asset_tag
		FROM "AssetChanges" as ac
		WHERE session_id = _session_id;
	END;
$$;

-- get_opname_by_date_and_site retrieves opname session ID for a specific date on a specific site
CREATE OR REPLACE FUNCTION public.get_opname_by_date_and_site(_opname_date DATE, _site_id INT)
	RETURNS TABLE (
		session_id INT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT os.id
		FROM "OpnameSession" AS os
		WHERE os.end_date::DATE = _opname_date AND os.site_id = _site_id;
	END;
$$;

-- get_opname_by_site retrieves all opname sessions for a specific site
-- ! This function is only for report page, it will only return sessions that are not 'Active'
CREATE OR REPLACE FUNCTION public.get_opname_by_site(_site_id INT)
	RETURNS TABLE (
		session_id INT,
		completed_date TIMESTAMP WITH TIME ZONE
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT os.id, os.end_date AS completed_date
		FROM "OpnameSession" AS os
		WHERE os.site_id = _site_id AND os.status != 'Active';
	END;
$$;