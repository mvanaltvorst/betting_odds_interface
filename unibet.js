// ==UserScript==
// @name         Unibet Odds Fetcher
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Fetch odds from Unibet and send to personal server.
// @match        https://www.unibet.nl/betting/sports/event/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    const YOUR_SERVER_URL = 'http://localhost:5001/set_state';
    const UPDATE_INTERVAL = 5000; // 5 seconds

    function getOdds() {
        const regularOddsElements = document.querySelectorAll('.KambiBC-bet-offer-subcategory:nth-child(1) .sc-kAyceB');
        const advancingOddsElements = document.querySelectorAll('.KambiBC-bet-offer-subcategory:nth-child(2) .sc-kAyceB');

        const regularOdds = Array.from(regularOddsElements).map(el => parseFloat(el.textContent));
        const advancingOdds = Array.from(advancingOddsElements).map(el => parseFloat(el.textContent));

        console.log('Debug: Fetched regular odds:', regularOdds);
        console.log('Debug: Fetched advancing odds:', advancingOdds);

        return {
            team_1: regularOdds[0],
            draw: regularOdds[1],
            team_2: regularOdds[2],
            team1_advancing: advancingOdds[0],
            team2_advancing: advancingOdds[1]
        };
    }

    function sendOddsToServer(odds) {
        console.log('Debug: Sending odds to server:', odds);
        GM_xmlhttpRequest({
            method: 'POST',
            url: YOUR_SERVER_URL,
            data: JSON.stringify(odds),
            headers: {
                'Content-Type': 'application/json'
            },
            onload: function(response) {
                console.log('Debug: Odds sent successfully. Server response:', response.responseText);
            },
            onerror: function(error) {
                console.error('Debug: Error sending odds:', error);
            }
        });
    }

    function updateOdds() {
        try {
            console.log('Debug: Updating odds...');
            const odds = getOdds();
            sendOddsToServer(odds);
        } catch (error) {
            console.error('Debug: Error updating odds:', error);
        }
    }

    // Initial update
    console.log('Debug: Performing initial odds update');
    updateOdds();

    // Set up a MutationObserver to detect changes in the odds
    const targetNode = document.querySelector('.KambiBC-bet-offer-subcategory__outcomes-list');
    if (targetNode) {
        console.log('Debug: Setting up MutationObserver');
        const config = { childList: true, subtree: true };
        const callback = function(mutationsList, observer) {
            for(let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    console.log('Debug: Odds change detected, updating...');
                    updateOdds();
                    break;
                }
            }
        };
        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    } else {
        console.error('Debug: Could not find target node for MutationObserver');
    }

    // Failsafe update every 5 seconds
    console.log('Debug: Setting up failsafe update interval');
    setInterval(updateOdds, UPDATE_INTERVAL);

    console.log('Debug: Unibet Odds Fetcher script initialized');
})();