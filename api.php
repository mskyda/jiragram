<?php

    $jiraUrl = urldecode($_GET['ju']);
    $jiraLogin= urldecode($_GET['jl']);
    $jiraPassword = urldecode($_GET['jp']);

    $ch = curl_init();

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_URL, $jiraUrl);

    if($jiraLogin && $jiraPassword) {
        curl_setopt($ch, CURLOPT_USERPWD, $jiraLogin.':'.$jiraPassword);
    }

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