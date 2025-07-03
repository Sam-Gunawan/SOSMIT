-- DROP FUNCTION IF EXISTS public.get_credentials(VARCHAR);
-- DROP FUNCTION IF EXISTS public.get_user_by_username(VARCHAR);
-- DROP FUNCTION IF EXISTS public.get_user_site_cards(INT);

-- get_credentials retrieves user credentials by username (for login auth)
CREATE OR REPLACE FUNCTION public.get_credentials(_username VARCHAR(255))
    RETURNS table (
        username VARCHAR(255),
        "password" VARCHAR(255),
        "position" VARCHAR(100)
    )
    LANGUAGE plpgsql
AS $$
    BEGIN
        RETURN QUERY
        SELECT u.username, u.password, u.position
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
		last_opname_date TIMESTAMP
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
			SELECT s.id AS site_id, s.site_name, sg.site_group_name, r.region_name, 
				u_ga.username AS site_ga,
				os.id AS opname_session_id,
				COALESCE(os.status, 'Pending') AS opname_status,
				s.last_opname_date
				LEFT JOIN "User" AS u_ga ON u_ga.site_id = s.id
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