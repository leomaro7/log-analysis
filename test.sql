SELECT date_format(
		date_add(
			'hour',
			9,
			date_parse(substr(time, 1, 10), '%Y-%m-%d')
		),
		'%Y-%m-%d'
	) AS log_date_jst,
	elb,
	COUNT(*) AS request_count,
	SUM(received_bytes) AS total_received_bytes,
	SUM(sent_bytes) AS total_sent_bytes
FROM data_catalog_alb.alb_table
WHERE date BETWEEN '2024/06/03' AND '2024/06/06'
	AND accountid = '268546037544'
GROUP BY date_format(
		date_add(
			'hour',
			9,
			date_parse(substr(time, 1, 10), '%Y-%m-%d')
		),
		'%Y-%m-%d'
	),
	elb
ORDER BY log_date_jst,
	elb;



SELECT date_format(
		date_add(
			'hour',
			9,
			date_parse(substr(time, 1, 13), '%Y-%m-%dT%H')
		),
		'%Y-%m-%d %H:00:00'
	) AS log_hour_jst,
	elb,
	COUNT(*) AS request_count,
	SUM(received_bytes) AS total_received_bytes,
	SUM(sent_bytes) AS total_sent_bytes
FROM data_catalog_alb.alb_table
WHERE date BETWEEN '2024/06/03' AND '2024/06/06'
	AND accountid = '268546037544'
GROUP BY date_add(
		'hour',
		9,
		date_parse(substr(time, 1, 13), '%Y-%m-%dT%H')
	),
	elb
ORDER BY log_hour_jst,
	elb;

