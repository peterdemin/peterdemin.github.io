Cooling Water with Ice
=======================

TL;DR
-----

One ice cube cools four ounces of water to just above freezing temperature.

To cool **12 oz** of water from 20°C to just above freezing, approximately 88.9 grams of ice is needed, which is equivalent to about 3.14 ounces. A standard ice cube (approximately 1 ounce) can be used as an approximation, requiring about **3 ice cubes**.

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
        <label for="waterAmount">Amount of water (oz): <span id="waterAmountLabel">12</span></label>
        <input type="range" id="waterAmount" min="1" max="48" value="12" oninput="calculateIceCubes()">
    </div>
    <div class="slider-container">
        <label for="roomTemperature">Room temperature (°F): <span id="roomTemperatureLabel">72</span></label>
        <input type="range" id="roomTemperature" min="32" max="120" value="72" oninput="calculateIceCubes()">
    </div>
    <div class="result">
        Number of ice cubes needed: <span id="iceCubesNeeded">3</span>
    </div>

    <script>
        function calculateIceCubes() {
            // Get values from sliders
            const waterAmount = document.getElementById('waterAmount').value;
            const roomTemperatureF = document.getElementById('roomTemperature').value;
            // Update labels
            document.getElementById('waterAmountLabel').textContent = waterAmount;
            document.getElementById('roomTemperatureLabel').textContent = roomTemperatureF;
            // Convert room temperature from Fahrenheit to Celsius
            const roomTemperatureC = (roomTemperatureF - 32) * 5 / 9;
            // Constants
            const specificHeatWater = 4.18; // J/g°C
            const latentHeatIce = 334; // J/g
            const iceCubeWeight = 28.35; // g (approximate 1 oz ice cube)
            // Convert water amount from oz to grams (1 oz = 29.5735 mL, and water density is 1 g/mL)
            const waterAmountGrams = waterAmount * 29.5735;
            // Calculate the heat energy required to cool the water to just above freezing
            const heatLost = waterAmountGrams * specificHeatWater * (roomTemperatureC - 0);
            // Calculate the amount of ice needed
            const iceNeededGrams = heatLost / latentHeatIce;
            // Convert ice needed from grams to number of ice cubes
            const iceCubesNeeded = Math.max(1, Math.round(iceNeededGrams / iceCubeWeight));
            // Update the result
            document.getElementById('iceCubesNeeded').textContent = iceCubesNeeded;
        }
        // Initial calculation on page load
        calculateIceCubes();
    </script>


Physics
-------

To calculate the amount of ice you need to cool 12 oz (about 355 mL) of water from 20°C to just above freezing (0°C), we'll use the principle of energy conservation. The heat lost by the water must equal the heat gained by the ice.

Assumptions
-----------

1. Ice starts at 0°C (melting point).
2. The specific heat capacity of water is 4.18 J/g°C.
3. The latent heat of fusion for ice (the energy required to melt ice at 0°C) is 334 J/g.
4. The density of water is 1 g/mL, so 355 mL of water is approximately 355 grams.

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

    Q_{\text{water}} = 355 \, \text{g} \times 4.18 \, \text{J/g°C} \times 20 \, \text{°C}

.. math::

    Q_{\text{water}} = 29,678 \, \text{J}

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

    m_{\text{ice}} = \frac{29,678 \, \text{J}}{334 \, \text{J/g}}

.. math::

    m_{\text{ice}} \approx 88.9 \, \text{g}

.. math::

    1 \, \text{ounce} = 28.3495 \, \text{grams}

.. math::

    88.9 \, \text{grams} \times \frac{1 \, \text{ounce}}{28.3495 \, \text{grams}} \approx 3.14 \, \text{ounces}

Conclusion
----------

You would need approximately 3 oz (88.9 grams) of ice to cool 12 oz (355 mL) of water from 20°C to just above freezing.
A standard ice cube weighs approximately 1 ounce, so you need about 3 ice cubes.
