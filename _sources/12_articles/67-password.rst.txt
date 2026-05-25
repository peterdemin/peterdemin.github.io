Password Generator
==================

.. raw:: html

    <div id="passwordDisplay" style="font-size: 24pt; margin: 1em; font-family: monospace"></div>
    <label for="lengthSlider">Password Length: <span id="lengthValue">16</span></label>
    <input type="range" id="lengthSlider" min="8" max="32" value="16" oninput="updatePassword()">
  
    <script>
      function generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      }
  
      function updatePassword() {
        const length = document.getElementById('lengthSlider').value;
        document.getElementById('lengthValue').textContent = length;
        document.getElementById('passwordDisplay').textContent = generateRandomString(length);
      }
  
      // Generate a password on page load
      window.onload = updatePassword;
    </script>


----

Offline command-line version:

.. code-block:: bash

   python -c 'import string, random; print("".join(random.sample(string.ascii_letters + string.digits, 16)))'
