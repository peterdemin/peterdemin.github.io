Next bus
========

.. raw:: html

    <div id="bus-arrival-times"></div>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const apiUrl = 'https://api.demin.dev/7160,7210,6237';

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
                busArrivalTimesDiv.innerHTML = ''; // Clear previous data
                busArrivalTimesDiv.innerHTML += "<h2>85th</h2>";
                busArrivalTimesDiv.innerHTML += timeSpans(data.arrivals["7160"])
                busArrivalTimesDiv.innerHTML += "<h2>65th</h2>";
                busArrivalTimesDiv.innerHTML += timeSpans(data.arrivals["7210"])
                busArrivalTimesDiv.innerHTML += "<h2>Harrison</h2>";
                busArrivalTimesDiv.innerHTML += timeSpans(data.arrivals["6237"])
            }

            function timeSpans(times) {
                var html = "";
                times.forEach((item) => {
                    const date = new Date(item * 1000);
                    const timeString = date.toTimeString().split(' ')[0];
                    html += `<span>${timeString}</span> `;
                });
                return html;
            }

            // Fetch bus arrival times on page load
            fetchBusArrivalTimes();
        });
    </script>
