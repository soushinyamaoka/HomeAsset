-- 分析用ネストJSON: 資産に子テーブル（specs/links/...）と category/location をぶら下げ、全レコードの id を保持する。
-- psql -t -A で実行し、出力を JSON として保存する想定。
SELECT json_build_object(
  'exportedAt', now(),
  'household',  (SELECT row_to_json(h) FROM households h LIMIT 1),
  'categories', (SELECT coalesce(json_agg(c ORDER BY c.sort_order), '[]'::json) FROM categories c),
  'locations',  (SELECT coalesce(json_agg(l ORDER BY l.sort_order), '[]'::json) FROM locations l),
  'home_assets', (
    SELECT coalesce(json_agg(x ORDER BY x.created_at), '[]'::json)
    FROM (
      SELECT h.*,
        (SELECT coalesce(json_agg(s ORDER BY s.sort_order), '[]'::json) FROM asset_specs s        WHERE s.asset_id  = h.id) AS specs,
        (SELECT coalesce(json_agg(ln ORDER BY ln.created_at), '[]'::json) FROM asset_links ln       WHERE ln.asset_id = h.id) AS links,
        (SELECT coalesce(json_agg(co ORDER BY co.created_at), '[]'::json) FROM consumables co        WHERE co.asset_id = h.id) AS consumables,
        (SELECT coalesce(json_agg(ac ORDER BY ac.created_at), '[]'::json) FROM accessories ac        WHERE ac.asset_id = h.id) AS accessories,
        (SELECT coalesce(json_agg(mr ORDER BY mr.created_at), '[]'::json) FROM maintenance_records mr WHERE mr.asset_id = h.id) AS maintenance_records,
        (SELECT coalesce(json_agg(rr ORDER BY rr.created_at), '[]'::json) FROM repair_records rr      WHERE rr.asset_id = h.id) AS repair_records,
        (SELECT row_to_json(ni)  FROM network_infos ni WHERE ni.asset_id  = h.id) AS network_info,
        (SELECT row_to_json(cat) FROM categories cat   WHERE cat.id       = h.category_id) AS category,
        (SELECT row_to_json(loc) FROM locations loc    WHERE loc.id       = h.location_id) AS location
      FROM home_assets h
    ) x
  )
);
