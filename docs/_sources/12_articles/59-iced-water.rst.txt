Cooling Water with Ice
=======================

TL;DR
-----

One ice cube cools two ounces of water to just above freezing temperature.

To cool **12 oz** of water from 20°C to just above freezing, approximately 88.9 grams of ice is needed.
A standard ice cube (approximately 16 grams) can be used as an approximation, requiring about **6 ice cubes**.

Background
----------

I have this nice home water carbonation machine. It dispenses water by 6 oz increments, and 12 oz is my sweet spot.
Effectiveness of water absorbtion of carbon dioxide depends on water temperature. The colder the better.
The machine doesn't cool the water itself, and doesn't have much insulation in the water tank (which I think is a design flaw).
My fridge produces ice cubes, though.
Following is a school way of figuring out how much ice do I need to put into tank for a glass of bubbly water.

Interactive form
----------------

.. raw:: html

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 50px;
        }
        .slider-container {
            margin-bottom: 20px;
        }
        .result {
            font-size: 1.5em;
            font-weight: bold;
        }
    </style>
    <div class="slider-container">
        <label for="waterAmount">Amount of water: <span id="waterAmountLabel">12</span> oz</label>
        <input type="range" id="waterAmount" min="1" max="48" value="12" oninput="calculateIceCubes()">
    </div>
    <div class="slider-container">
        <label for="roomTemperature">Room temperature: <span id="roomTemperatureLabel">72</span> °F</label>
        <input type="range" id="roomTemperature" min="32" max="120" value="72" oninput="calculateIceCubes()">
    </div>
    <div class="slider-container">
        <label for="iceCubeWeight">Ice cube weight: <span id="iceCubeWeightLabel">16</span> g</label>
        <input type="range" id="iceCubeWeight" min="1" max="50" value="16" oninput="calculateIceCubes()">
    </div>
    <div class="result">
        Number of ice cubes needed: <span id="iceCubesNeeded">6</span>
    </div>
    <div class="result">
        Time needed: <span id="minutesNeeded">5</span> minutes
    </div>

    <script>
        function calculateIceCubes() {
            // Get values from sliders
            const waterAmount = document.getElementById('waterAmount').value;
            const roomTemperatureF = document.getElementById('roomTemperature').value;
            const iceCubeWeight = document.getElementById('iceCubeWeight').value;
            // Update labels
            document.getElementById('waterAmountLabel').textContent = waterAmount;
            document.getElementById('roomTemperatureLabel').textContent = roomTemperatureF;
            document.getElementById('iceCubeWeightLabel').textContent = iceCubeWeight;
            // Convert room temperature from Fahrenheit to Celsius
            const roomTemperatureC = (roomTemperatureF - 32) * 5 / 9;
            // Constants
            const specificHeatWater = 4.18; // J/g°C
            const latentHeatIce = 334; // J/g
            const transitionRate = 60 * 100; // J/m
            // Convert water amount from oz to grams (1 oz = 29.5735 mL, and water density is 1 g/mL)
            const waterAmountGrams = waterAmount * 29.5735;
            // Calculate the heat energy required to cool the water to just above freezing
            const heatLost = waterAmountGrams * specificHeatWater * (roomTemperatureC - 0);
            // Calculate the amount of ice needed
            const iceNeededGrams = heatLost / latentHeatIce;
            // Convert ice needed from grams to number of ice cubes
            const iceCubesNeeded = Math.max(1, Math.round(iceNeededGrams / iceCubeWeight));
            const minutesNeeded = Math.max(1, Math.round(heatLost / transitionRate));
            // Update the result
            document.getElementById('iceCubesNeeded').textContent = iceCubesNeeded;
            document.getElementById('minutesNeeded').textContent = minutesNeeded;
        }
        // Initial calculation on page load
        calculateIceCubes();
    </script>


Physics
-------

To calculate the amount of ice needed to cool 12 oz (355 mL) of water from 20°C to 0°C, we'll use the principle of energy conservation.
The heat lost by the water must equal the heat gained by the ice.

Assumptions
-----------

1. Ice melting point is 0°C.
2. The specific heat capacity of water is 4.18 J/g°C.
3. The latent heat of fusion for ice (the energy required to melt ice at 0°C) is 334 J/g.
4. The density of water is 1 g/mL, so 355 mL of water is 355 grams.

Step 1: Calculate the heat energy lost by the water
---------------------------------------------------

.. math::

    Q_{\text{water}} = m_{\text{water}} \times c_{\text{water}} \times \Delta T_{\text{water}}

Where:

- :math:`Q_{\text{water}}` is the heat lost by the water,
- :math:`m_{\text{water}} = 355 \, \text{g}`,
- :math:`c_{\text{water}} = 4.18 \, \text{J/g°C}`,
- :math:`\Delta T_{\text{water}} = 20 \, \text{°C} - 0 \, \text{°C} = 20 \, \text{°C}`.

.. math::

    Q_{\text{water}} = 355 \, \text{g} \times 4.18 \, \text{J/g°C} \times 20 \, \text{°C} = 29,678 \, \text{J}

Step 2: Calculate the amount of ice needed
------------------------------------------

Since the ice will absorb heat and melt, the heat required to melt :math:`m_{\text{ice}}` grams of ice is given by:

.. math::

    Q_{\text{ice}} = m_{\text{ice}} \times L_{\text{fusion}}

Where:

- :math:`Q_{\text{ice}}` is the heat absorbed by the ice,
- :math:`L_{\text{fusion}} = 334 \, \text{J/g}` (latent heat of fusion).

Since the heat lost by the water equals the heat gained by the ice:

.. math::

    Q_{\text{water}} = Q_{\text{ice}}

.. math::

    29,678 \, \text{J} = m_{\text{ice}} \times 334 \, \text{J/g}

.. math::

    m_{\text{ice}} = \frac{29,678 \, \text{J}}{334 \, \text{J/g}} \approx 89 \, \text{g}

My ice cubes weighs 16 grams on average, so I need about 6 ice cubes.

Step 3: Calculate the amount of time needed
-------------------------------------------

For a rough estimate, assuming the heat transfer rate :math:`R` is about 100 W (100 J/s, a typical estimate for moderate convective conditions):

.. math::

    t = \frac{Q_{\text{ice}}}{R}

.. math::

    t = \frac{29,678 \, \text{J}}{100 \, \text{J/g}} \approx 297 \text{seconds} \approx 5 \text{minutes}

Calculation flaws
-----------------

The formula above doesn't take into consideration:

1. Room air warming up water as the ice melts.
2. Volume of water increasing from the melted ice. With 89 grams from molten ice, I need only 9 ounces of water initially to get 12 ounces of ice-cold water.
