-- The Brief analytics for JahKnowsPR HQ.
-- Aggregates existing first-party analytics_events. HQ staff only.
-- Does not return visitor ids, session ids, or raw event rows.

CREATE INDEX IF NOT EXISTS analytics_events_the_brief_created_idx
  ON public.analytics_events (created_at DESC)
  WHERE page_path LIKE '/the-brief%' OR page_path LIKE '/insights/the-brief%';

CREATE OR REPLACE FUNCTION public.hq_brief_analytics(
  p_range text DEFAULT '30d',
  p_start date DEFAULT NULL,
  p_end date DEFAULT NULL,
  p_article text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_today_start timestamptz := (date_trunc('day', v_now AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York');
  v_start timestamptz;
  v_end timestamptz;
  v_scan_start timestamptz;
  v_article text := NULLIF(btrim(COALESCE(p_article, '')), '');
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_hq_staff(auth.uid()) THEN
    RAISE EXCEPTION 'HQ access required';
  END IF;

  v_end := CASE
    WHEN p_range = 'custom' AND p_end IS NOT NULL THEN (p_end::timestamp AT TIME ZONE 'America/New_York') + interval '1 day'
    ELSE v_now + interval '1 second'
  END;

  v_start := CASE p_range
    WHEN 'today' THEN v_today_start
    WHEN '7d' THEN v_now - interval '7 days'
    WHEN '90d' THEN v_now - interval '90 days'
    WHEN 'all' THEN TIMESTAMPTZ '2000-01-01'
    WHEN 'custom' THEN COALESCE(p_start::timestamp AT TIME ZONE 'America/New_York', v_now - interval '30 days')
    ELSE v_now - interval '30 days'
  END;

  v_scan_start := LEAST(v_start, v_today_start - interval '90 days');

  WITH scoped AS (
    SELECT
      e.created_at,
      e.event_name,
      e.page_path,
      e.page_title,
      e.referrer,
      e.utm_source,
      e.blog_slug,
      e.content_id,
      e.cta_id,
      e.cta_label,
      e.button_text,
      e.anonymous_visitor_id,
      e.session_id,
      e.device_type,
      e.metadata,
      NULLIF(
        regexp_replace(
          CASE
            WHEN e.page_path ~ '^/(insights/)?the-brief/?$' THEN ''
            WHEN e.page_path ~ '^/(insights/)?the-brief/.+' THEN regexp_replace(
              regexp_replace(e.page_path, '^/(insights/)?the-brief/', ''),
              '/+$',
              ''
            )
            WHEN COALESCE(e.blog_slug, '') <> '' THEN regexp_replace(e.blog_slug, '^/+', '')
            WHEN e.event_name = 'blog_view'
              AND COALESCE(e.page_path, '') <> ''
              AND e.page_path !~ '^/'
              THEN e.page_path
            ELSE ''
          END,
          '^insights/the-brief/',
          ''
        ),
        ''
      ) AS article_key,
      CASE
        WHEN COALESCE(e.utm_source, '') <> '' THEN left(e.utm_source, 120)
        WHEN COALESCE(e.referrer, '') ~ '^https?://' THEN left(split_part(regexp_replace(e.referrer, '^https?://', ''), '/', 1), 120)
        ELSE 'direct'
      END AS source_label,
      COALESCE(NULLIF(e.device_type, ''), 'unknown') AS device_label,
      CASE
        WHEN e.event_name = 'brief_engagement'
          AND jsonb_typeof(e.metadata -> 'engagement_seconds') = 'number'
          THEN LEAST(1800, GREATEST(0, (e.metadata ->> 'engagement_seconds')::numeric))
        ELSE 0
      END AS engagement_seconds,
      (
        e.event_name = 'page_view'
        AND e.page_path ~ '^/(insights/)?the-brief(/|$)'
      ) OR (
        e.event_name = 'blog_view'
        AND NOT EXISTS (
          SELECT 1
          FROM public.analytics_events p
          WHERE p.event_name = 'page_view'
            AND p.session_id = e.session_id
            AND p.created_at BETWEEN e.created_at - interval '5 minutes' AND e.created_at + interval '5 minutes'
            AND (
              p.page_path = '/the-brief/' || COALESCE(NULLIF(e.blog_slug, ''), NULLIF(e.page_path, ''))
              OR p.page_path = '/insights/the-brief/' || COALESCE(NULLIF(e.blog_slug, ''), NULLIF(e.page_path, ''))
            )
        )
      ) AS is_view,
      e.event_name = 'cta_click' AS is_cta
    FROM public.analytics_events e
    WHERE e.created_at >= v_scan_start
      AND e.created_at < GREATEST(v_end, v_now + interval '1 second')
      AND (
        e.page_path ~ '^/(insights/)?the-brief(/|$)'
        OR e.event_name IN ('blog_view', 'brief_engagement')
        OR (
          e.event_name = 'cta_click'
          AND (
            e.content_type IN ('the-brief', 'blog')
            OR COALESCE(e.blog_slug, '') <> ''
            OR e.page_path ~ '^/(insights/)?the-brief(/|$)'
          )
        )
      )
  ),
  in_range AS (
    SELECT * FROM scoped
    WHERE created_at >= v_start AND created_at < v_end
  ),
  posts AS (
    SELECT DISTINCT ON (article_key)
      article_key,
      title,
      published_date
    FROM (
      SELECT NULLIF(
        regexp_replace(regexp_replace(btrim(slug), '^/+', ''), '^insights/the-brief/', ''),
        ''
      ) AS article_key, title, published_date, updated_at
      FROM public.blog_posts
      WHERE slug IS NOT NULL AND btrim(slug) <> ''
      UNION ALL
      SELECT id::text AS article_key, title, published_date, updated_at
      FROM public.blog_posts
    ) catalog
    WHERE article_key IS NOT NULL
    ORDER BY article_key, updated_at DESC NULLS LAST
  ),
  session_engagement AS (
    SELECT article_key, session_id, SUM(engagement_seconds) AS seconds
    FROM in_range
    WHERE article_key IS NOT NULL
    GROUP BY article_key, session_id
  ),
  article_stats AS (
    SELECT
      r.article_key,
      COUNT(*) FILTER (WHERE r.is_view) AS views,
      COUNT(DISTINCT r.anonymous_visitor_id) FILTER (WHERE r.is_view) AS readers,
      COUNT(*) FILTER (WHERE r.is_cta) AS cta_clicks,
      eng.avg_engagement_seconds
    FROM in_range r
    LEFT JOIN (
      SELECT article_key, AVG(seconds) AS avg_engagement_seconds
      FROM session_engagement
      WHERE seconds > 0
      GROUP BY article_key
    ) eng ON eng.article_key = r.article_key
    WHERE r.article_key IS NOT NULL
      AND (v_article IS NULL OR r.article_key = v_article)
    GROUP BY r.article_key, eng.avg_engagement_seconds
  ),
  published_keys AS (
    SELECT COALESCE(
      NULLIF(regexp_replace(regexp_replace(btrim(slug), '^/+', ''), '^insights/the-brief/', ''), ''),
      id::text
    ) AS article_key
    FROM public.blog_posts
    WHERE COALESCE(content_type, 'the-brief') IN ('the-brief', 'spam-report', 'firm-news', 'pr-court')
      AND status = 'published'
  ),
  article_keys AS (
    SELECT article_key FROM article_stats
    UNION
    SELECT article_key FROM published_keys
    WHERE v_article IS NULL OR article_key = v_article
  ),
  source_ranks AS (
    SELECT
      article_key,
      source_label,
      COUNT(*) AS views,
      ROW_NUMBER() OVER (PARTITION BY article_key ORDER BY COUNT(*) DESC, source_label) AS rank
    FROM in_range
    WHERE is_view AND article_key IS NOT NULL
    GROUP BY article_key, source_label
  ),
  overview AS (
    SELECT
      COUNT(*) FILTER (WHERE is_view) AS total_views,
      COUNT(DISTINCT anonymous_visitor_id) FILTER (WHERE is_view) AS unique_readers,
      COUNT(*) FILTER (WHERE is_view AND article_key IS NULL) AS landing_views,
      (
        SELECT AVG(seconds)
        FROM (
          SELECT session_id, article_key, SUM(engagement_seconds) AS seconds
          FROM in_range
          GROUP BY session_id, article_key
          HAVING SUM(engagement_seconds) > 0
        ) engaged
      ) AS avg_engagement_seconds
    FROM in_range
  ),
  windows AS (
    SELECT
      COUNT(*) FILTER (WHERE is_view AND created_at >= v_today_start) AS views_today,
      COUNT(*) FILTER (WHERE is_view AND created_at >= v_now - interval '7 days') AS views_7d,
      COUNT(*) FILTER (WHERE is_view AND created_at >= v_now - interval '30 days') AS views_30d,
      COUNT(*) FILTER (WHERE is_view AND created_at >= v_today_start - interval '90 days') AS views_90d
    FROM scoped
  ),
  articles AS (
    SELECT
      k.article_key,
      COALESCE(p.title, k.article_key) AS title,
      p.published_date,
      COALESCE(s.views, 0) AS views,
      COALESCE(s.readers, 0) AS readers,
      s.avg_engagement_seconds,
      COALESCE(s.cta_clicks, 0) AS cta_clicks,
      src.source_label AS top_source
    FROM article_keys k
    LEFT JOIN posts p ON p.article_key = k.article_key
    LEFT JOIN article_stats s ON s.article_key = k.article_key
    LEFT JOIN source_ranks src ON src.article_key = k.article_key AND src.rank = 1
    WHERE k.article_key IS NOT NULL
  )
  SELECT jsonb_build_object(
    'range', COALESCE(NULLIF(p_range, ''), '30d'),
    'start', v_start,
    'end', v_end,
    'live', jsonb_build_object(
      'active_readers', (
        SELECT COUNT(DISTINCT anonymous_visitor_id)
        FROM scoped
        WHERE created_at >= v_now - interval '2 minutes'
          AND (is_view OR event_name = 'brief_engagement')
      ),
      'pages_now', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'page', page_label,
          'path', page_path,
          'readers', readers,
          'last_seen', last_seen
        ) ORDER BY last_seen DESC)
        FROM (
          SELECT
            COALESCE(
              (SELECT title FROM posts p WHERE p.article_key = s.article_key LIMIT 1),
              NULLIF(MAX(s.page_title), ''),
              CASE WHEN s.article_key IS NULL THEN 'The Brief' ELSE s.article_key END
            ) AS page_label,
            COALESCE(MAX(s.page_path), CASE WHEN s.article_key IS NULL THEN '/insights/the-brief' ELSE '/the-brief/' || s.article_key END) AS page_path,
            COUNT(DISTINCT s.anonymous_visitor_id) AS readers,
            MAX(s.created_at) AS last_seen
          FROM scoped s
          WHERE s.created_at >= v_now - interval '2 minutes'
            AND (s.is_view OR s.event_name = 'brief_engagement')
          GROUP BY s.article_key
        ) current_pages
      ), '[]'::jsonb),
      'recent', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'at', created_at,
          'event_name', event_name,
          'page', page_label,
          'path', page_path,
          'device', device_label,
          'source', source_label
        ) ORDER BY created_at DESC)
        FROM (
          SELECT
            s.created_at,
            s.event_name,
            s.device_label,
            s.source_label,
            COALESCE(s.page_path, '/the-brief') AS page_path,
            COALESCE(
              (SELECT title FROM posts p WHERE p.article_key = s.article_key LIMIT 1),
              NULLIF(s.page_title, ''),
              CASE WHEN s.article_key IS NULL THEN 'The Brief' ELSE s.article_key END
            ) AS page_label
          FROM scoped s
          WHERE s.is_view OR s.is_cta
          ORDER BY s.created_at DESC
          LIMIT 40
        ) recent_events
      ), '[]'::jsonb)
    ),
    'overview', (
      SELECT jsonb_build_object(
        'total_views', COALESCE(o.total_views, 0),
        'unique_readers', COALESCE(o.unique_readers, 0),
        'landing_views', COALESCE(o.landing_views, 0),
        'avg_engagement_seconds', o.avg_engagement_seconds,
        'views_today', COALESCE(w.views_today, 0),
        'views_7d', COALESCE(w.views_7d, 0),
        'views_30d', COALESCE(w.views_30d, 0),
        'views_90d', COALESCE(w.views_90d, 0)
      )
      FROM overview o
      CROSS JOIN windows w
    ),
    'articles', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'key', a.article_key,
          'title', a.title,
          'published_date', a.published_date,
          'views', a.views,
          'readers', a.readers,
          'avg_engagement_seconds', a.avg_engagement_seconds,
          'cta_clicks', a.cta_clicks,
          'top_source', a.top_source
        )
        ORDER BY a.views DESC, a.published_date DESC NULLS LAST
      )
      FROM articles a
    ), '[]'::jsonb),
    'detail', CASE
      WHEN v_article IS NULL THEN NULL
      ELSE (
        SELECT jsonb_build_object(
          'key', v_article,
          'title', COALESCE((SELECT title FROM posts WHERE article_key = v_article LIMIT 1), v_article),
          'published_date', (SELECT published_date FROM posts WHERE article_key = v_article LIMIT 1),
          'views', COUNT(*) FILTER (WHERE r.is_view AND r.article_key = v_article),
          'readers', COUNT(DISTINCT r.anonymous_visitor_id) FILTER (WHERE r.is_view AND r.article_key = v_article),
          'avg_engagement_seconds', (
            SELECT AVG(seconds)
            FROM (
              SELECT SUM(s.engagement_seconds) AS seconds
              FROM in_range s
              WHERE s.article_key = v_article
              GROUP BY s.session_id
              HAVING SUM(s.engagement_seconds) > 0
            ) engaged
          ),
          'cta_clicks', COUNT(*) FILTER (WHERE r.is_cta AND r.article_key = v_article),
          'series', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('date', day, 'views', views) ORDER BY day)
            FROM (
              SELECT (created_at AT TIME ZONE 'America/New_York')::date AS day, COUNT(*) AS views
              FROM in_range
              WHERE is_view AND article_key = v_article
              GROUP BY 1
            ) days
          ), '[]'::jsonb),
          'sources', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('source', source_label, 'views', views) ORDER BY views DESC)
            FROM (
              SELECT source_label, COUNT(*) AS views
              FROM in_range
              WHERE is_view AND article_key = v_article
              GROUP BY source_label
            ) sources
          ), '[]'::jsonb),
          'devices', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('device', device_label, 'views', views) ORDER BY views DESC)
            FROM (
              SELECT device_label, COUNT(*) AS views
              FROM in_range
              WHERE is_view AND article_key = v_article
              GROUP BY device_label
            ) devices
          ), '[]'::jsonb),
          'ctas', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', cta_id, 'label', label, 'clicks', clicks) ORDER BY clicks DESC)
            FROM (
              SELECT
                COALESCE(NULLIF(cta_id, ''), 'cta') AS cta_id,
                COALESCE(NULLIF(cta_label, ''), NULLIF(button_text, ''), NULLIF(cta_id, ''), 'CTA') AS label,
                COUNT(*) AS clicks
              FROM in_range
              WHERE is_cta AND article_key = v_article
              GROUP BY 1, 2
            ) ctas
          ), '[]'::jsonb)
        )
        FROM in_range r
        WHERE r.article_key = v_article
      )
    END
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.hq_brief_analytics(text, date, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_brief_analytics(text, date, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.hq_brief_analytics(text, date, date, text) TO authenticated;
