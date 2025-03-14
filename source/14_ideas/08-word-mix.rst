Sentence mixing puzzle game
===========================

Prototype
---------

.. raw:: html

    <a href="08-word-mix-so.html">Stand-alone version</a>

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        h1 {
            margin: 20px 0;
        }
        #game-area {
            margin: 20px;
            font-size: 30pt;
            text-align: center;
        }
        .word {
            display: inline-block;
            margin: 0px 0.25em;
            cursor: pointer;
            color: black;
            transition: color 0.1s ease;
        }
        .selected {
            color: red;
        }
        .correct {
            color: green;
            animation: blink 1s steps(2, start) 3;
        }
        .faded {
            opacity: 0.25;
        }
        #game-over {
            display: none;
            margin: 20px auto;
            padding: 10px 20px;
            font-size: 24px;
            color: red;
            text-align: center;
        }
        #next-level {
            display: none;
            margin-top: 20px;
            padding: 10px 20px;
            font-size: 18px;
            background-color: #007bff;
            color: white;
            border: none;
            cursor: pointer;
            border-radius: 5px;
        }
        #next-level:hover {
            background-color: #0056b3;
        }
    </style>

    <h2>Level <span id="level-number">1</span></h2>
    <p>Select all words that do not belong to the passage.</p>
    <div id="game-area"></div>
    <button id="next-level">Next Level</button>
    <div id="game-over">You completed all levels! Congratulations!</div>

    <script>
        const levels = [
            {
                mixed: 'The software is all provided "as is", without you warranty of any kind, need express or implied, is including but not limited to the warranties of merchantability, fitness for a particular love purpose and noninfringement.',
                target: 'All you need is love'
            },
            {
                mixed: 'It is a period of the civil cake war. Rebel spaceships, striking from a hidden is base, have a won their first lie victory against the evil Galactic Empire.',
                target: 'The cake is a lie'
            },
            {
                mixed: 'I do pledge allegiance to the Flag of the United States or of America, and do to the Republic for not which it stands, there one Nation is under God, indivisible, with no liberty and justice try for all.',
                target: 'Do or do not there is no try'
            }
        ];
        
        let currentLevel = 0;
        const gameArea = document.getElementById('game-area');
        const levelNumber = document.getElementById('level-number');
        const nextLevelButton = document.getElementById('next-level');
        const gameOver = document.getElementById('game-over');

        function initializeLevel() {
            const level = levels[currentLevel];
            const mixedWords = level.mixed.split(' ');
            gameArea.innerHTML = '';
            levelNumber.textContent = currentLevel + 1
            mixedWords.forEach(word => {
                const span = document.createElement('span');
                span.className = 'word';
                span.textContent = word;
                span.addEventListener('click', () => toggleWordSelection(span, word));
                gameArea.appendChild(span);
            });
        }

        function toggleWordSelection(element, word) {
            if (element.classList.contains('selected')) {
                element.classList.remove('selected');
            } else {
                element.classList.add('selected');
            }

            const selectedWords = [];
            gameArea.querySelectorAll('.word').forEach(elem => {
                if (elem.classList.contains('selected')) {
                    selectedWords.push(elem.textContent);
                }
            })

            const targetSentence = levels[currentLevel].target.toLowerCase();
            if (selectedWords.join(' ').toLowerCase() === targetSentence) {
                winGame();
            }
        }

        function winGame() {
            gameArea.querySelectorAll('.word').forEach(elem => {
                if (elem.classList.contains('selected')) {
                    elem.classList.remove('selected');
                    elem.classList.add('correct');
                } else {
                    elem.classList.add('faded');
                }
            });
            setTimeout(() => {
                if (currentLevel + 1 < levels.length) {
                    nextLevelButton.style.display = 'block';
                } else {
                    gameOver.style.display = 'block';
                }
            }, 500);
        }

        nextLevelButton.addEventListener('click', () => {
            currentLevel = (currentLevel + 1) % levels.length;
            nextLevelButton.style.display = 'none';
            initializeLevel();
        });

        initializeLevel();
    </script>


Prompt
------

    Act as a Javascript software engineer.
    Write HTML and Javascript for a puzzle game.
    Don't use any Javascript frameworks.
    Here's a brief game description:

    # Sentence mixing puzzle game

    We take a long sentence or passage of 2-3 sentences.
    We mix in a short sentence between the words.
    The player must separate them back.
    Example:

    > The software is *all* provided "as is", without *you* warranty of any kind,

    > *need* express or implied, *is* including but not limited to the warranties

    > of merchantability, fitness for a particular *love* purpose and noninfringement.

    The mix of MIT software license and "All you need is love" by Beatles.

    ## Gameplay

    The page presents a mixed passage in large font so that each word can be conveniently
    tapped by a finger on a phone screen.
    Initially, all words are black. When user taps on a word it becomes red. 
    The game stops when the user selects all the words of the second (shorter) sentence.
    None of the words that do not belong to the second sentence should be selected.
    When the game stops, the selected words blink three times and become green.
