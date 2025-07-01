-- DROP FUNCTION IF EXISTS public.get_credentials(VARCHAR);
-- DROP FUNCTION IF EXISTS public.get_user_by_username(VARCHAR);

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
		"password" VARCHAR(255),
		first_name VARCHAR(255),
		last_name VARCHAR(255),
		"position" VARCHAR(100),
		site_id INT,
		cost_center_id INT
	)
	LANGUAGE plpgsql
AS $$
	BEGIN
		RETURN QUERY
		SELECT u.user_id, u.username, u.password, u.first_name, u.last_name, u.position, u.site_id, u.cost_center_id
		FROM "User" AS u
		WHERE LOWER(u.username) = LOWER(_username); 
	END;
$$;