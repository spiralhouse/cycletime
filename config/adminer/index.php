<?php
// CycleTime Adminer Auto-Login Configuration
// Redirect to auto-login URL if no session exists
if (!isset($_SESSION['pwds']) && empty($_GET)) {
    $autoLoginUrl = '/?pgsql=postgres&username=cycletime&db=cycletime_dev';
    header("Location: $autoLoginUrl");
    exit;
}

include "/var/www/html/adminer.php";