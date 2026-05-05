<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$user = require_role('proveedor');
$pdo  = get_pdo();
$providerId = (int)$user['id'];

function stats_int($value) {
    return $value === null ? 0 : (int)$value;
}

function stats_float($value) {
    return $value === null ? 0.0 : round((float)$value, 2);
}

function stats_date_periods() {
    $today = date('Y-m-d');
    return array(
        'day' => array(
            'label' => 'Hoy',
            'start' => $today . ' 00:00:00',
            'end' => date('Y-m-d', strtotime($today . ' +1 day')) . ' 00:00:00',
        ),
        'month' => array(
            'label' => 'Este mes',
            'start' => date('Y-m-01') . ' 00:00:00',
            'end' => date('Y-m-d', strtotime(date('Y-m-01') . ' +1 month')) . ' 00:00:00',
        ),
        'year' => array(
            'label' => 'Este año',
            'start' => date('Y-01-01') . ' 00:00:00',
            'end' => date('Y-m-d', strtotime(date('Y-01-01') . ' +1 year')) . ' 00:00:00',
        ),
    );
}

function stats_availability_minutes(PDO $pdo, $providerId, $start, $end) {
    $rules = $pdo->prepare(
        'SELECT weekday, TIME_TO_SEC(TIMEDIFF(end_time, start_time)) / 60 AS minutes
         FROM availability_rules
         WHERE provider_id = ? AND is_active = 1 AND end_time > start_time'
    );
    $rules->execute(array($providerId));

    $minutesByWeekday = array();
    foreach ($rules->fetchAll() as $rule) {
        $minutesByWeekday[(int)$rule['weekday']] = (float)$rule['minutes'];
    }

    $total = 0.0;
    $cursor = strtotime(substr($start, 0, 10) . ' 00:00:00');
    $limit = strtotime(substr($end, 0, 10) . ' 00:00:00');
    while ($cursor < $limit) {
        $weekday = (int)date('w', $cursor);
        if (isset($minutesByWeekday[$weekday])) {
            $total += $minutesByWeekday[$weekday];
        }
        $cursor = strtotime('+1 day', $cursor);
    }
    return $total;
}

function stats_active_service_duration(PDO $pdo, $providerId) {
    $stmt = $pdo->prepare('SELECT AVG(duration_minutes) FROM services WHERE provider_id = ? AND is_active = 1');
    $stmt->execute(array($providerId));
    $avg = (float)$stmt->fetchColumn();
    return $avg > 0 ? $avg : 60.0;
}

function stats_service_ranking(PDO $pdo, $providerId, $start, $end, $totalAppointments) {
    $stmt = $pdo->prepare(
        'SELECT s.id, s.name, s.duration_minutes, s.price, s.is_active,
                COUNT(a.id) AS total,
                SUM(CASE WHEN a.status = \'pending\' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN a.status = \'confirmed\' THEN 1 ELSE 0 END) AS confirmed,
                SUM(CASE WHEN a.status = \'completed\' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN a.status IN (\'cancelled_by_client\', \'cancelled_by_provider\') THEN 1 ELSE 0 END) AS cancelled,
                SUM(CASE WHEN a.status = \'no_show\' THEN 1 ELSE 0 END) AS no_show,
                SUM(CASE WHEN a.status IN (\'confirmed\', \'completed\') THEN COALESCE(s.price, 0) ELSE 0 END) AS estimated_revenue
         FROM services s
         LEFT JOIN appointments a ON a.service_id = s.id
            AND a.provider_id = s.provider_id
            AND a.starts_at >= ?
            AND a.starts_at < ?
         WHERE s.provider_id = ?
         GROUP BY s.id, s.name, s.duration_minutes, s.price, s.is_active
         ORDER BY total DESC, s.name ASC'
    );
    $stmt->execute(array($start, $end, $providerId));

    $ranking = array();
    foreach ($stmt->fetchAll() as $row) {
        $total = stats_int($row['total']);
        $ranking[] = array(
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'duration_minutes' => (int)$row['duration_minutes'],
            'price' => $row['price'] !== null ? (float)$row['price'] : null,
            'is_active' => (bool)$row['is_active'],
            'total' => $total,
            'pending' => stats_int($row['pending']),
            'confirmed' => stats_int($row['confirmed']),
            'completed' => stats_int($row['completed']),
            'cancelled' => stats_int($row['cancelled']),
            'no_show' => stats_int($row['no_show']),
            'estimated_revenue' => stats_float($row['estimated_revenue']),
            'share' => $totalAppointments > 0 ? round(($total / $totalAppointments) * 100, 1) : 0,
        );
    }
    return $ranking;
}

function stats_simple_rows(PDO $pdo, $sql, $params) {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function stats_scope(PDO $pdo, $providerId, $periodKey, $period) {
    $summary = $pdo->prepare(
        'SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = \'pending\' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = \'confirmed\' THEN 1 ELSE 0 END) AS confirmed,
                SUM(CASE WHEN status = \'completed\' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status IN (\'cancelled_by_client\', \'cancelled_by_provider\') THEN 1 ELSE 0 END) AS cancelled,
                SUM(CASE WHEN status = \'no_show\' THEN 1 ELSE 0 END) AS no_show,
                COUNT(DISTINCT COALESCE(CAST(client_id AS CHAR), guest_email)) AS unique_clients,
                AVG(TIMESTAMPDIFF(MINUTE, starts_at, ends_at)) AS avg_duration_minutes,
                SUM(CASE WHEN status IN (\'confirmed\', \'completed\') THEN TIMESTAMPDIFF(MINUTE, starts_at, ends_at) ELSE 0 END) AS productive_minutes,
                SUM(CASE WHEN status IN (\'confirmed\', \'completed\') THEN COALESCE(s.price, 0) ELSE 0 END) AS estimated_revenue
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         WHERE a.provider_id = ?
           AND a.starts_at >= ?
           AND a.starts_at < ?'
    );
    $summary->execute(array($providerId, $period['start'], $period['end']));
    $row = $summary->fetch();

    $total = stats_int($row['total']);
    $active = stats_int($row['pending']) + stats_int($row['confirmed']) + stats_int($row['completed']);
    $finished = stats_int($row['completed']) + stats_int($row['no_show']);
    $capacityMinutes = stats_availability_minutes($pdo, $providerId, $period['start'], $period['end']);
    $avgServiceDuration = stats_active_service_duration($pdo, $providerId);
    $capacitySlots = $capacityMinutes > 0 ? (int)floor($capacityMinutes / $avgServiceDuration) : 0;
    $cancelled = stats_int($row['cancelled']);
    $noShow = stats_int($row['no_show']);

    $services = stats_service_ranking($pdo, $providerId, $period['start'], $period['end'], $total);

    $mostRequested = null;
    $leastRequested = null;
    foreach ($services as $service) {
        if ($service['total'] > 0 && $mostRequested === null) $mostRequested = $service;
        if ($service['is_active'] && ($leastRequested === null || $service['total'] <= $leastRequested['total'])) {
            $leastRequested = $service;
        }
    }

    $hours = stats_simple_rows(
        $pdo,
        'SELECT HOUR(starts_at) AS hour, COUNT(*) AS total
         FROM appointments
         WHERE provider_id = ? AND starts_at >= ? AND starts_at < ?
         GROUP BY HOUR(starts_at)
         ORDER BY total DESC, hour ASC
         LIMIT 8',
        array($providerId, $period['start'], $period['end'])
    );

    $weekdays = stats_simple_rows(
        $pdo,
        'SELECT DAYOFWEEK(starts_at) - 1 AS weekday, COUNT(*) AS total
         FROM appointments
         WHERE provider_id = ? AND starts_at >= ? AND starts_at < ?
         GROUP BY DAYOFWEEK(starts_at)
         ORDER BY total DESC, weekday ASC',
        array($providerId, $period['start'], $period['end'])
    );

    $trendSql = $periodKey === 'year'
        ? 'SELECT DATE_FORMAT(starts_at, \'%Y-%m\') AS bucket, COUNT(*) AS total FROM appointments WHERE provider_id = ? AND starts_at >= ? AND starts_at < ? GROUP BY DATE_FORMAT(starts_at, \'%Y-%m\') ORDER BY bucket ASC'
        : 'SELECT DATE(starts_at) AS bucket, COUNT(*) AS total FROM appointments WHERE provider_id = ? AND starts_at >= ? AND starts_at < ? GROUP BY DATE(starts_at) ORDER BY bucket ASC';
    $trend = stats_simple_rows($pdo, $trendSql, array($providerId, $period['start'], $period['end']));

    return array(
        'label' => $period['label'],
        'start' => $period['start'],
        'end' => $period['end'],
        'kpis' => array(
            'total_appointments' => $total,
            'active_appointments' => $active,
            'pending' => stats_int($row['pending']),
            'confirmed' => stats_int($row['confirmed']),
            'completed' => stats_int($row['completed']),
            'cancelled' => $cancelled,
            'no_show' => $noShow,
            'unique_clients' => stats_int($row['unique_clients']),
            'estimated_revenue' => stats_float($row['estimated_revenue']),
            'avg_duration_minutes' => stats_float($row['avg_duration_minutes']),
            'productive_hours' => round(stats_float($row['productive_minutes']) / 60, 1),
            'available_hours' => round($capacityMinutes / 60, 1),
            'capacity_slots' => $capacitySlots,
            'utilization_rate' => $capacitySlots > 0 ? round(($active / $capacitySlots) * 100, 1) : 0,
            'cancellation_rate' => $total > 0 ? round(($cancelled / $total) * 100, 1) : 0,
            'no_show_rate' => $finished > 0 ? round(($noShow / $finished) * 100, 1) : 0,
        ),
        'most_requested_service' => $mostRequested,
        'least_requested_service' => $leastRequested,
        'services' => $services,
        'top_hours' => array_map(function ($h) {
            return array('hour' => (int)$h['hour'], 'total' => (int)$h['total']);
        }, $hours),
        'weekdays' => array_map(function ($d) {
            return array('weekday' => (int)$d['weekday'], 'total' => (int)$d['total']);
        }, $weekdays),
        'trend' => array_map(function ($t) {
            return array('bucket' => $t['bucket'], 'total' => (int)$t['total']);
        }, $trend),
    );
}

function stats_suggestions($scopes) {
    $month = $scopes['month'];
    $year = $scopes['year'];
    $suggestions = array();

    if ($month['most_requested_service']) {
        $service = $month['most_requested_service'];
        $suggestions[] = array(
            'title' => 'Impulsa tu servicio más pedido',
            'body' => 'El servicio "' . $service['name'] . '" concentra ' . $service['share'] . '% de las reservas del mes. Considera destacarlo en la página pública, crear una versión premium o abrir más cupos en sus horas fuertes.',
            'impact' => 'Demanda',
        );
    }

    if ($month['least_requested_service'] && $month['least_requested_service']['total'] === 0) {
        $service = $month['least_requested_service'];
        $suggestions[] = array(
            'title' => 'Revisa servicios sin demanda',
            'body' => '"' . $service['name'] . '" no tiene reservas este mes. Mejora su imagen/descripción, ajústale precio o conviértelo en complemento del servicio más pedido.',
            'impact' => 'Catálogo',
        );
    }

    if ($month['top_hours']) {
        $hour = $month['top_hours'][0]['hour'];
        $suggestions[] = array(
            'title' => 'Protege tu hora fuerte',
            'body' => 'La franja de ' . str_pad((string)$hour, 2, '0', STR_PAD_LEFT) . ':00 está entre las más solicitadas. Evita bloquearla y úsala para ubicar servicios de mayor valor.',
            'impact' => 'Horario',
        );
    }

    if ($month['kpis']['utilization_rate'] >= 80) {
        $suggestions[] = array(
            'title' => 'Alta ocupación',
            'body' => 'Tu ocupación estimada del mes supera el 80%. Puedes abrir más disponibilidad, reducir huecos entre citas o subir cupos para el servicio líder.',
            'impact' => 'Capacidad',
        );
    } elseif ($month['kpis']['utilization_rate'] > 0 && $month['kpis']['utilization_rate'] < 35) {
        $suggestions[] = array(
            'title' => 'Hay espacio para crecer',
            'body' => 'La ocupación estimada del mes está bajo 35%. Refuerza el enlace de reservas, comparte el QR y destaca beneficios claros en tus servicios.',
            'impact' => 'Crecimiento',
        );
    }

    if ($month['kpis']['cancellation_rate'] >= 20) {
        $suggestions[] = array(
            'title' => 'Reduce cancelaciones',
            'body' => 'La tasa de cancelación del mes está alta. Agrega instrucciones previas, confirma disponibilidad con anticipación y usa horarios menos propensos a cambios.',
            'impact' => 'Retención',
        );
    }

    if (!$suggestions) {
        $suggestions[] = array(
            'title' => 'Aún falta información',
            'body' => 'Cuando acumules más reservas, esta sección detectará demanda por servicio, horas fuertes, cancelaciones y oportunidades de agenda.',
            'impact' => 'Datos',
        );
    }

    if ($year['most_requested_service'] && (!$month['most_requested_service'] || $year['most_requested_service']['id'] !== $month['most_requested_service']['id'])) {
        $suggestions[] = array(
            'title' => 'Compara tendencia anual',
            'body' => 'En el año domina "' . $year['most_requested_service']['name'] . '". Si no coincide con este mes, puede haber estacionalidad o una oportunidad nueva creciendo.',
            'impact' => 'Tendencia',
        );
    }

    return $suggestions;
}

$periods = stats_date_periods();
$scopes = array();
foreach ($periods as $key => $period) {
    $scopes[$key] = stats_scope($pdo, $providerId, $key, $period);
}

json_response(array(
    'ok' => true,
    'scopes' => $scopes,
    'suggestions' => stats_suggestions($scopes),
));
