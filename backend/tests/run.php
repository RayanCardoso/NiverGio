<?php

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib.php';

$GLOBALS['tests']['filter'] = isset($argv[1]) ? $argv[1] : '';

foreach (glob(__DIR__ . '/cases/*.php') as $case) {
    echo basename($case, '.php') . "\n";
    require $case;
}

$totals = $GLOBALS['tests'];
echo "\n{$totals['pass']} passaram, {$totals['fail']} falharam\n";
exit($totals['fail'] > 0 ? 1 : 0);
