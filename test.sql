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
WHERE parse_datetime(time, 'yyyy-MM-dd''T''HH:mm:ss.SSSSSS''Z') BETWEEN timestamp '2024-06-06 00:00 Asia/Tokyo'
	AND timestamp '2024-06-06 12:00 Asia/Tokyo'
	AND date BETWEEN '2024/06/03' AND '2024/06/06'
	AND accountid = '268546037544'
GROUP BY date_add(
		'hour',
		9,
		date_parse(substr(time, 1, 13), '%Y-%m-%dT%H')
	),
	elb
ORDER BY log_hour_jst,
	elb;


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




SELECT from_iso8601_timestamp(eventtime) AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo' AS eventtime_jst,
	useridentity,
	sourceipaddress,
	eventsource,
	eventname,
	requestparameters,
	responseelements,
	readonly
FROM data_catalog_cloudtrail.cloudtrail_table
WHERE readonly = 'false'
	AND from_iso8601_timestamp(eventtime) BETWEEN date_add(
		'hour',
		-9,
		from_iso8601_timestamp('2024-06-06T20:00:00Z')
	) AND date_add(
		'hour',
		-9,
		from_iso8601_timestamp('2024-06-06T20:59:59Z')
	)
	AND date BETWEEN '2024/06/01' AND '2024/06/06'
	AND region IN ('ap-northeast-1', 'us-east-1')
	AND accountid = '268546037544'
ORDER BY eventtime DESC;