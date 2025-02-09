Next bus
========

.. raw:: html

    <div id="bus-arrival-times"></div>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const apiUrl = 'https://api.demin.dev/bus/7160,7210,6237';

            // Function to fetch and display bus arrival times
            async function fetchBusArrivalTimes() {
                try {
                    const response = await fetch(apiUrl);
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
                    }
                    const data = await response.json();
                    displayBusArrivalTimes(data);
                } catch (error) {
                    console.error('There has been a problem with your fetch operation:', error);
                }
            }

            // Function to display bus arrival times
            function displayBusArrivalTimes(data, stopId) {
                const busArrivalTimesDiv = document.getElementById('bus-arrival-times');
                const routes = data.routes
                const route = "102615"
                busArrivalTimesDiv.innerHTML = ''; // Clear previous data
                busArrivalTimesDiv.innerHTML += "<p><b>85th:</b>" + timeSpans(routes["7160"][route]) + "</p>";
                busArrivalTimesDiv.innerHTML += "<p><b>65th:</b>" + timeSpans(routes["7210"][route]) + "</p>";
                busArrivalTimesDiv.innerHTML += "<p><b>Harrison:</b>" + timeSpans(routes["6237"][route]) + "</p>";
            }

            function timeSpans(times) {
                const uniqueTimes = [];
                const now = formatTime(Math.floor(Date.now() / 1000));
                removeDuplicates(times).forEach((item) => {
                    const t = formatTime(item);
                    if (t >= now) {
                        uniqueTimes.push(t)
                    }
                });
                var html = "";
                uniqueTimes.forEach((t) => {
                    html += ` <span>${t}</span>`;
                });
                return html;
            }

            function removeDuplicates(strings) {
                const uniqueStrings = [];
                const seenStrings = new Set();
                for (const string of strings) {
                    if (!seenStrings.has(string)) {
                        uniqueStrings.push(string);
                        seenStrings.add(string);
                    }
                }
                return uniqueStrings;
            }

            function formatTime(timestampSec) {
                const date = new Date(timestampSec * 1000);
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
            }

            // Fetch bus arrival times on page load
            fetchBusArrivalTimes();
        });
    </script>
