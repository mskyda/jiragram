<?php

    $jiraUrl = urldecode($_GET['ju']);
    $jiraLogin= urldecode($_GET['jl']);
    $jiraPassword = urldecode($_GET['jp']);

    error_reporting(E_ALL);

    ini_set('display_errors', 1);

    $ch = curl_init();

    $headers = array('Accept: application/json', 'Content-Type: application/json');

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_USERPWD, $jiraLogin.':'.$jiraPassword);
    curl_setopt($ch, CURLOPT_URL, $jiraUrl);

    $result = curl_exec($ch);
    $ch_error = curl_error($ch);

    if ($ch_error) {
        var_dump($jiraUrl);
        echo "cURL Error: $ch_error";
    } else {
        echo $result;
    }

    curl_close($ch);

?>