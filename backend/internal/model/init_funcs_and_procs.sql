DROP FUNCTION IF EXISTS public.get_credentials(VARCHAR);
DROP FUNCTION IF EXISTS public.get_user_by_username(VARCHAR);
DROP FUNCTION IF EXISTS public.get_user_site_cards(INT);
DROP FUNCTION IF EXISTS public.get_asset_by_tag(VARCHAR);
DROP FUNCTION IF EXISTS public.get_assets_by_site(INT);
DROP FUNCTION IF EXISTS public.create_new_opname_session(INT, INT);

-- get_credentials retrieves user credentials by username (for login auth)
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

-- get_user_by_username retrieves user details by username
CREATE OR REPLACE FUNCTION public.get_user_by_username(_username VARCHAR(255))
	RETURNS table (
		user_id INT,
		username VARCHAR(255),
		first_name VARCHAR(255),
		last_name VARCHAR(255),
		"position" VARCHAR(100),
		site_name VARCHAR(100),
		site_group_name VARCHAR(100),
		region_name VARCHAR(100),
		cost_center_id INT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN 
		RETURN QUERY
		SELECT u.user_id, u.username, u.first_name, u.last_name, u."position", s.site_name, sg.site_group_name, r.region_name, u.cost_center_id
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
				s.last_opname_date AS last_opname_date
			FROM "User" AS u
			-- For "l1 support", join all sites; for others, restrict to user's region
			CROSS JOIN "Site" AS s
			INNER JOIN "SiteGroup" AS sg ON s.site_group_id = sg.id
			INNER JOIN "Region" AS r ON sg.region_id = r.id
			LEFT JOIN "OpnameSession" AS os ON s.id = os.site_id AND
				os.status IN ('Active', 'Pending', 'Verified', 'Rejected', 'Outdated')
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
		condition_photo_url TEXT,
		"location" VARCHAR(255),
		room VARCHAR(255),
		owner_id INT,
		owner_name VARCHAR(510),
		owner_position VARCHAR(100),
		owner_cost_center INT,
		site_id INT,
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
					a.condition, a.condition_photo_url::TEXT,
					a.location, a.room,
					a.owner_id,
					(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))::VARCHAR(510) AS owner_name,
					u.position AS owner_position,
					u.cost_center_id AS owner_cost_center,
					a.site_id,
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
	-- Local variable to count existing active sessions for the site.
	_active_session_count INT;
	_new_session_id INT := 0; -- Initialize to 0, will be set if a new session is created.
BEGIN
	-- Check if there are any active opname sessions for the site.
	-- Count how many rows in "OpnameSession" have the same site_id and status 'Active' or 'Pending'.
	SELECT COUNT(*)
	INTO _active_session_count
	FROM "OpnameSession"
	WHERE site_id = _site_id AND "status" IN ('Active', 'Pending');

	-- If there are no active sessions, proceed to create a new one.
	IF _active_session_count = 0 THEN
		-- Insert a new opname session into the OpnameSession table.
		INSERT INTO "OpnameSession" (user_id, site_id, "status", start_date)
		VALUES (_user_id, _site_id, 'Active', NOW())
		-- Get the ID of the newly created session.
		-- The 'RETURNING' clause allows us to capture the new session ID.
		RETURNING id INTO _new_session_id;

		RAISE NOTICE 'New opname session created with ID: %', _new_session_id;
	ELSE
		-- If there is already an active session, do nothing. _new_session_id will remain 0.
		RAISE NOTICE 'An active opname session already exists for site ID: %, cannot create a new one.', _site_id;
	END IF;

	RETURN _new_session_id;
END;
$$;