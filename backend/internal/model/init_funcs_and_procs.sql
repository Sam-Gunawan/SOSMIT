DROP FUNCTION IF EXISTS public.get_credentials(VARCHAR);
DROP FUNCTION IF EXISTS public.get_all_users();
DROP FUNCTION IF EXISTS public.get_user_by_id(INT);
DROP FUNCTION IF EXISTS public.get_user_by_username(VARCHAR);
DROP FUNCTION IF EXISTS public.get_user_site_cards(INT);
DROP FUNCTION IF EXISTS public.get_l1_support_emails();
DROP FUNCTION IF EXISTS public.get_area_manager_info(INT);
DROP FUNCTION IF EXISTS public.get_asset_by_tag(VARCHAR);
DROP FUNCTION IF EXISTS public.get_asset_by_serial_number(VARCHAR);
DROP FUNCTION IF EXISTS public.get_assets_by_site(INT);
DROP FUNCTION IF EXISTS public.create_new_opname_session(INT, INT);
DROP FUNCTION IF EXISTS public.get_opname_session_by_id(INT);
DROP FUNCTION IF EXISTS public.get_user_from_opname_session(INT);
DROP PROCEDURE IF EXISTS public.finish_opname_session(INT);
DROP PROCEDURE IF EXISTS public.delete_opname_session(INT);
DROP PROCEDURE IF EXISTS public.approve_opname_session(INT, INT);
DROP PROCEDURE IF EXISTS public.reject_opname_session(INT, INT);
DROP FUNCTION IF EXISTS public.record_asset_change(INT, VARCHAR(12), VARCHAR(50), VARCHAR(20), VARCHAR(20), BOOLEAN, TEXT, TEXT, VARCHAR(255), VARCHAR(255), TEXT, INT, VARCHAR(255), VARCHAR(100), VARCHAR(100), INT, INT, INT, TEXT, VARCHAR(25));
DROP PROCEDURE IF EXISTS public.delete_asset_change(INT, VARCHAR(12));
DROP FUNCTION IF EXISTS public.get_asset_change_photo(INT, VARCHAR(12));
DROP FUNCTION IF EXISTS public.get_all_photos_by_session_id(INT);
DROP FUNCTION IF EXISTS public.get_all_sites();
DROP FUNCTION IF EXISTS public.get_all_sub_sites();
DROP FUNCTION IF EXISTS public.get_site_by_id(INT);
DROP FUNCTION IF EXISTS public.get_sub_site_by_id(INT);
DROP FUNCTION IF EXISTS public.get_sub_sites_by_site_id(INT);
DROP FUNCTION IF EXISTS public.load_opname_progress(INT);
DROP FUNCTION IF EXISTS public.get_opname_by_site_id(INT);
DROP FUNCTION IF EXISTS public.get_asset_equipments(VARCHAR(50));

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
		department VARCHAR(100),
		division VARCHAR(100),
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
		SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u."position", u.department, u.division, s.id, s.site_name, sg.site_group_name, r.region_name, u.cost_center_id
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
		department VARCHAR(100),
		division VARCHAR(100),
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
		SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u."position", u.department, u.division, s.id AS site_id, s.site_name, sg.site_group_name, r.region_name, u.cost_center_id
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
		department VARCHAR(100),
		division VARCHAR(100),
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
		SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u."position", u.department, u.division, s.id AS site_id, s.site_name, sg.site_group_name, r.region_name, u.cost_center_id
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
	DECLARE
		_user_position VARCHAR;
		_user_region_id INT;
	BEGIN
		-- Fetch the user's position and region ID into variables first.
		SELECT
			LOWER(u.position),
			r.id
		INTO
			_user_position,
			_user_region_id
		FROM "User" AS u
		LEFT JOIN "Site" AS s ON u.site_id = s.id
		LEFT JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
		LEFT JOIN "Region" AS r ON sg.region_id = r.id
		WHERE u.user_id = _user_id;

		-- Fetch the site cards based on the user's position and region.
		-- Show the latest opname session status if available and not outdated.
		RETURN QUERY
			SELECT
				s.id AS site_id,
				s.site_name,
				sg.site_group_name,
				r.region_name,
				s.site_ga_id,
				COALESCE(latest_session.session_id, -1) AS opname_session_id,
				CASE
					WHEN latest_session.session_status = 'Active' THEN 'Active'
					WHEN latest_session.session_status IN ('Submitted', 'Escalated', 'Verified', 'Rejected')
						-- TODO: Make the interval dynamic based on user settings.
						AND COALESCE(latest_session.session_end_date, latest_session.session_start_date) > (NOW() - INTERVAL '30 days')
						THEN latest_session.session_status
					ELSE 'Outdated'
				END AS opname_status,
				COALESCE(latest_session.session_end_date, s.last_opname_date) AS last_opname_date
			FROM "Site" AS s
			INNER JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
			INNER JOIN "Region" AS r ON sg.region_id = r.id
			LEFT JOIN (
				-- Get the latest opname session for each site.
				SELECT DISTINCT ON (os.site_id)
					os.site_id,
					os.id AS session_id,
					os.status AS session_status,
					os.end_date AS session_end_date,
					os.start_date AS session_start_date
				FROM "OpnameSession" AS os
				ORDER BY os.site_id, os.start_date DESC
			) AS latest_session ON s.id = latest_session.site_id
			WHERE
				_user_position = 'l1 support'
				OR
				(_user_position IN ('admin staff general affairs', 'area manager') AND r.id = _user_region_id)
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

-- get_area_manager_email retrieves the email of the area manager for a given site
CREATE OR REPLACE FUNCTION public.get_area_manager_info(_site_id INT)
	RETURNS TABLE (
		user_id INT,
		email VARCHAR(255)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
			SELECT u.user_id, u.email
			FROM "User" AS u
			INNER JOIN "Site" AS s ON u.site_id = s.id
			WHERE LOWER(u.position) = 'area manager'
			AND s.id = _site_id;
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
		equipments TEXT,
		owner_id INT,
		owner_name VARCHAR(510),
		owner_position VARCHAR(100),
		owner_department VARCHAR(100),
		owner_division VARCHAR(100),
		owner_cost_center INT,
		sub_site_id INT,
		sub_site_name VARCHAR(100),
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
				a.location, a.room, a.equipments,
				a.owner_id,
				(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))::VARCHAR(510) AS owner_name,
				u.position AS owner_position,
				u.department AS owner_department,
				u.division AS owner_division,
				u.cost_center_id AS owner_cost_center,
				a.sub_site_id,
				ss.sub_site_name AS sub_site_name,
				s.id AS site_id,
				s.site_name AS site_name,
				sg.site_group_name AS site_group_name,
				r.region_name AS region_name
			FROM "Asset" AS a
			LEFT JOIN "User" AS u ON a.owner_id = u.user_id
			LEFT JOIN "SubSite" AS ss ON a.sub_site_id = ss.id
			LEFT JOIN "Site" AS s ON ss.site_id = s.id
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
		equipments TEXT,
		owner_id INT,
		owner_name VARCHAR(510),
		owner_position VARCHAR(100),
		owner_department VARCHAR(100),
		owner_division VARCHAR(100),
		owner_cost_center INT,
		sub_site_id INT,
		sub_site_name VARCHAR(100),
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
				a.location, a.room, a.equipments,
				a.owner_id,
				(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))::VARCHAR(510) AS owner_name,
				u.position AS owner_position,
				u.department AS owner_department,
				u.division AS owner_division,
				u.cost_center_id AS owner_cost_center,
				a.sub_site_id,
				ss.sub_site_name AS sub_site_name,
				s.id AS site_id,
				s.site_name AS site_name,
				sg.site_group_name AS site_group_name,
				r.region_name AS region_name
			FROM "Asset" AS a
			LEFT JOIN "User" AS u ON a.owner_id = u.user_id
			LEFT JOIN "SubSite" AS ss ON a.sub_site_id = ss.id
			LEFT JOIN "Site" AS s ON ss.site_id = s.id
			LEFT JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
			LEFT JOIN "Region" AS r ON sg.region_id = r.id
			WHERE a.serial_number = _serial_number;
	END;
$$;

-- get_assets_by_site retrieves all assets for a given site (aggregates from all sub-sites)
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
			INNER JOIN "SubSite" AS ss ON a.sub_site_id = ss.id
			WHERE ss.site_id = _site_id;
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
		-- Sessions in 'Active', 'Submitted', and 'Escalated' status are considered ongoing.
		_ongoing_session_count INT;
		_new_session_id INT := 0; -- Initialize to 0, will be set if a new session is created.
	BEGIN
		-- Check if there are any active opname sessions for the site.
		-- Count how many rows in "OpnameSession" have the same site_id and status 'Active', 'Submitted', or 'Escalated'.
		SELECT COUNT(*)
		INTO _ongoing_session_count
		FROM "OpnameSession"
		WHERE site_id = _site_id AND "status" IN ('Active', 'Submitted', 'Escalated');

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
		manager_reviewer_id INT,
		manager_reviewed_at TIMESTAMP WITH TIME ZONE,
		l1_reviewer_id INT,
		l1_reviewed_at TIMESTAMP WITH TIME ZONE,
		site_id INT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT os.id, os."start_date", os.end_date, os."status", os.user_id,
		 	os.manager_reviewer_id, os.manager_reviewed_at, os.l1_reviewer_id, os.l1_reviewed_at,
			os.site_id
		FROM "OpnameSession" AS os
		WHERE os.id = _session_id;
	END;
$$;

-- get_user_from_opname_session retrieves the user details that created the opname session
CREATE OR REPLACE FUNCTION public.get_user_from_opname_session(_session_id INT)
	RETURNS TABLE (
		user_id INT,
		username VARCHAR(255),
		email VARCHAR(255),
		first_name VARCHAR(255),
		last_name VARCHAR(255),
		"position" VARCHAR(100),
		department VARCHAR(100),
		division VARCHAR(100)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u."position", u.department, u.division
		FROM "User" AS u
		INNER JOIN "OpnameSession" AS os ON u.user_id = os.user_id
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

		-- Check if there are any assets that hasn't been processed yet
		IF EXISTS (
			SELECT 1
			FROM "AssetChanges"
			WHERE session_id = _session_id AND "processing_status" = 'pending'
		) THEN
			RAISE EXCEPTION 'There are assets that have not been processed yet for opname session ID: %', _session_id;
		END IF;

		-- Update the opname session to mark it as finished and await manager approval
		UPDATE "OpnameSession"
		SET "status" = 'Submitted', end_date = NOW()
		WHERE id = _session_id;

		-- Update the site's last_opname_date to the end date as well
		UPDATE "Site"
		SET last_opname_date = NOW()
		WHERE id = (SELECT site_id FROM "OpnameSession" WHERE id = _session_id);

		RAISE NOTICE 'Opname session with ID: % has been submitted.', _session_id;
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

-- approve_opname_session verifies an opname session by session ID
CREATE OR REPLACE PROCEDURE public.approve_opname_session(_session_id INT, _reviewer_id INT)
    LANGUAGE plpgsql
AS $$
    DECLARE 
        _user_position VARCHAR;
        _current_status VARCHAR;
    BEGIN
        -- Check if the opname session exists and get its current status
        SELECT "status" INTO _current_status
        FROM "OpnameSession"
        WHERE id = _session_id AND "status" IN ('Submitted', 'Escalated');
        
        IF _current_status IS NULL THEN
            RAISE EXCEPTION 'No submitted or escalated opname session found with ID: %', _session_id;
        END IF;

        -- Get the user's position
        SELECT LOWER(u.position) INTO _user_position
        FROM "User" AS u 
        WHERE u.user_id = _reviewer_id;

        -- Handle based on current session status
        IF _current_status = 'Submitted' THEN
            -- Only area manager can approve/escalate a submitted session
            IF _user_position != 'area manager' THEN
                RAISE EXCEPTION 'Only area manager can approve a submitted opname session. Session ID: %', _session_id;
            END IF;
            
            -- Update session to escalated status
            UPDATE "OpnameSession"
            SET manager_reviewer_id = _reviewer_id,
                "status" = 'Escalated',
                manager_reviewed_at = NOW()
            WHERE id = _session_id;
            
            RAISE NOTICE 'Opname session with ID: % has been escalated by area manager.', _session_id;
            
        ELSIF _current_status = 'Escalated' THEN
            -- Only L1 support can verify an escalated session
            IF _user_position != 'l1 support' THEN
                RAISE EXCEPTION 'Only L1 support can verify an escalated opname session. Session ID: %', _session_id;
            END IF;
            
            -- Update session to verified status
            UPDATE "OpnameSession"
            SET l1_reviewer_id = _reviewer_id,
                "status" = 'Verified',
                l1_reviewed_at = NOW()
            WHERE id = _session_id;
            
            RAISE NOTICE 'Opname session with ID: % has been verified by L1 support.', _session_id;
        END IF;
    END;
$$;

-- reject_opname_session marks an opname session as rejected
CREATE OR REPLACE PROCEDURE public.reject_opname_session(_session_id INT, _reviewer_id INT)
    LANGUAGE plpgsql
AS $$
    DECLARE 
        _user_position VARCHAR;
        _current_status VARCHAR;
    BEGIN
        -- Check if the opname session exists and get its current status
        SELECT "status" INTO _current_status
        FROM "OpnameSession"
        WHERE id = _session_id AND "status" IN ('Submitted', 'Escalated');
        
        IF _current_status IS NULL THEN
            RAISE EXCEPTION 'No submitted or escalated opname session found with ID: %', _session_id;
        END IF;

        -- Get the user's position
        SELECT LOWER(u.position) INTO _user_position
        FROM "User" AS u 
        WHERE u.user_id = _reviewer_id;

        -- Handle based on current session status
        IF _current_status = 'Submitted' THEN
            -- Only area manager can reject a submitted session
            IF _user_position != 'area manager' THEN
                RAISE EXCEPTION 'Only area manager can reject a submitted opname session. Session ID: %', _session_id;
            END IF;
            
            -- Update session to rejected status
            UPDATE "OpnameSession"
            SET manager_reviewer_id = _reviewer_id,
                "status" = 'Rejected',
                manager_reviewed_at = NOW()
            WHERE id = _session_id;
            
            RAISE NOTICE 'Opname session with ID: % has been rejected by area manager.', _session_id;
            
        ELSIF _current_status = 'Escalated' THEN
            -- Only L1 support can reject an escalated session
            IF _user_position != 'l1 support' THEN
                RAISE EXCEPTION 'Only L1 support can reject an escalated opname session. Session ID: %', _session_id;
            END IF;
            
            -- Update session to rejected status
            UPDATE "OpnameSession"
            SET l1_reviewer_id = _reviewer_id,
                "status" = 'Rejected',
                l1_reviewed_at = NOW()
            WHERE id = _session_id;
            
            RAISE NOTICE 'Opname session with ID: % has been rejected by L1 support.', _session_id;
        END IF;
    END;
$$;

-- record_asset_change records changes made to an asset during an opname session
CREATE OR REPLACE FUNCTION public.record_asset_change(
	_session_id INT,
	_asset_tag VARCHAR(12),
	_new_serial_number VARCHAR(50),
	_new_status VARCHAR(20),
	_new_status_reason VARCHAR(20),
	_new_condition BOOLEAN,
	_new_condition_notes TEXT,
	_new_condition_photo_url TEXT,
	_new_location VARCHAR(255),
	_new_room VARCHAR(255),
	_new_equipments TEXT,
	_new_owner_id INT,
	_new_owner_position VARCHAR(255),
	_new_owner_department VARCHAR(100),
	_new_owner_division VARCHAR(100),
	_new_owner_cost_center INT,
	_new_sub_site_id INT,
	_new_owner_site_id INT,
	_change_reason TEXT,
	_processing_status VARCHAR(25)
) RETURNS JSONB
	LANGUAGE plpgsql
AS $$
	DECLARE
		_old_data RECORD;
		_old_owner_data RECORD;
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

		-- Fetch the current owner's site information for comparison
		SELECT u.site_id, u.cost_center_id, u.position, u.department, u.division INTO _old_owner_data
		FROM "User" AS u
		WHERE u.user_id = _old_data.owner_id;

		-- Compare the old and new values, and build the changes JSONB object
		-- Only include changes that are different from the old data
		IF _new_serial_number IS NOT NULL AND _new_serial_number IS DISTINCT FROM _old_data.serial_number THEN
			_changes := jsonb_set(_changes, '{newSerialNumber}', to_jsonb(_new_serial_number));
		END IF;
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
		IF _new_equipments IS NOT NULL AND _new_equipments IS DISTINCT FROM _old_data.equipments THEN
			_changes := jsonb_set(_changes, '{newEquipments}', to_jsonb(_new_equipments));
		END IF;
		IF _new_owner_id IS NOT NULL AND _new_owner_id IS DISTINCT FROM _old_data.owner_id THEN
			_changes := jsonb_set(_changes, '{newOwnerID}', to_jsonb(_new_owner_id));
		END IF;
		IF _new_owner_position IS NOT NULL AND LOWER(_new_owner_position) IS DISTINCT FROM LOWER(_old_owner_data.position) THEN
			_changes := jsonb_set(_changes, '{newOwnerPosition}', to_jsonb(_new_owner_position));
		END IF;
		IF _new_owner_department IS NOT NULL AND LOWER(_new_owner_department) IS DISTINCT FROM LOWER(_old_owner_data.department) THEN
			_changes := jsonb_set(_changes, '{newOwnerDepartment}', to_jsonb(_new_owner_department));
		END IF;
		IF _new_owner_division IS NOT NULL AND LOWER(_new_owner_division) IS DISTINCT FROM LOWER(_old_owner_data.division) THEN
			_changes := jsonb_set(_changes, '{newOwnerDivision}', to_jsonb(_new_owner_division));
		END IF;
		IF _new_owner_cost_center IS NOT NULL AND _new_owner_cost_center IS DISTINCT FROM _old_owner_data.cost_center_id THEN
			_changes := jsonb_set(_changes, '{newOwnerCostCenter}', to_jsonb(_new_owner_cost_center));
		END IF;
		IF _new_sub_site_id IS NOT NULL AND _new_sub_site_id IS DISTINCT FROM _old_data.sub_site_id THEN
			_changes := jsonb_set(_changes, '{newSubSiteID}', to_jsonb(_new_sub_site_id));
		END IF;
		IF _new_owner_site_id IS NOT NULL AND _new_owner_site_id IS DISTINCT FROM _old_owner_data.site_id THEN
			_changes := jsonb_set(_changes, '{newOwnerSiteID}', to_jsonb(_new_owner_site_id));
		END IF;

		-- Regardless of whether changes were made, we will insert a record of the changes.
		INSERT INTO "AssetChanges" (session_id, asset_tag, "changes", change_reason, processing_status)
		VALUES (_session_id, _asset_tag, _changes, _change_reason, _processing_status)
		ON CONFLICT (session_id, asset_tag) DO UPDATE
		SET
			"changes" = _changes, -- Completely replace the existing changes with the new ones
			change_reason = EXCLUDED.change_reason,
			processing_status = EXCLUDED.processing_status; -- Update the processing status
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

-- get_all_sub_sites retrieves all sub-sites with their details
CREATE OR REPLACE FUNCTION public.get_all_sub_sites()
	RETURNS TABLE (
		sub_site_id INT,
		sub_site_name VARCHAR(100),
		site_id INT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT ss.id AS sub_site_id, ss.sub_site_name, s.id AS site_id
		FROM "SubSite" AS ss
		INNER JOIN "Site" AS s ON ss.site_id = s.id;
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

-- get_sub_site_by_id retrieves sub-site details by sub-site ID
CREATE OR REPLACE FUNCTION public.get_sub_site_by_id(_sub_site_id INT)
	RETURNS TABLE (
		sub_site_id INT,
		sub_site_name VARCHAR(100),
		site_id INT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT ss.id AS sub_site_id, ss.sub_site_name, ss.site_id
		FROM "SubSite" AS ss
		WHERE ss.id = _sub_site_id;
	END;
$$;

-- get_sub_sites_by_site_id retrieves all sub-sites for a given site ID
CREATE OR REPLACE FUNCTION public.get_sub_sites_by_site_id(_site_id INT)
	RETURNS TABLE (
		sub_site_id INT,
		sub_site_name VARCHAR(100)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT ss.id, ss.sub_site_name
		FROM "SubSite" AS ss
		WHERE ss.site_id = _site_id;
	END;
$$;

-- load_opname_progress loads the latest scan progress for a given opname session
CREATE OR REPLACE FUNCTION public.load_opname_progress(_session_id INT)
	RETURNS TABLE (
		id INT,
		"changes" JSONB,
		change_reason TEXT,
		asset_tag VARCHAR(12),
		processing_status VARCHAR(25)
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT ac.id, ac."changes", ac.change_reason, ac.asset_tag, ac.processing_status
		FROM "AssetChanges" as ac
		WHERE session_id = _session_id;
	END;
$$;

-- get_opname_by_site_id retrieves all opname sessions for a specific site
-- ! This function is only for report page, it will only return sessions that are not 'Active'
CREATE OR REPLACE FUNCTION public.get_opname_by_site_id(_site_id INT)
	RETURNS TABLE (
		session_id INT,
		completed_date DATE
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT os.id, DATE(os.end_date) AS completed_date
		FROM "OpnameSession" AS os
		WHERE os.site_id = _site_id AND os.status != 'Active';
	END;
$$;

-- get_asset_equipments retrieves all equipments associated with an asset by its type (product_variety)
CREATE OR REPLACE FUNCTION public.get_asset_equipments(_product_variety VARCHAR(50))
	RETURNS TABLE (
		equipments TEXT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT ae.equipments
		FROM "AssetEquipments" AS ae
		WHERE ae.product_variety = _product_variety;
	END;
$$;