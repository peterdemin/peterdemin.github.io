Sentence mixing puzzle game
===========================

Prototype
---------

.. raw:: html

        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sentence Mixing Puzzle</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 20px;
            }

            .word {
                display: inline-block;
                margin: 5px;
                font-size: 30pt;
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

            .subtle {
                opacity: 0.25;
            }

            #puzzle {
                text-align: center;
            }

            @keyframes blink {
                50% {
                    opacity: 0;
                }
            }
        </style>

        <h1>Sentence Mixing Puzzle Game</h1>
        <p id="instruction">Tap the words of the short sentence to solve the puzzle.</p>
        <div id="puzzle"></div>

        <script>
            const puzzleText = `The software is all provided "as is", without you warranty of any kind,
            need express or implied, is including but not limited to the warranties
            of merchantability, fitness for a particular love purpose and noninfringement.`;
            const targetSentence = "All you need is love";

            const puzzleText2 = `It is a period of the civil cake war.
            Rebel spaceships, striking from a hidden is base, have a won
            their first lie victory against the evil Galactic Empire.`;
            const targetSentence2 = "The cake is a lie";

            // Prepare game data
            const words = puzzleText.replace(/[^\w\s*]/g, '').split(/\s+/);
            const targetWords = targetSentence.toLowerCase().split(/\s+/);
            let selectedWords = [];

            // Populate puzzle on page
            const puzzleContainer = document.getElementById("puzzle");
            words.forEach((word, index) => {
                const span = document.createElement("span");
                span.textContent = word;
                span.classList.add("word");
                span.dataset.word = word.toLowerCase();
                span.dataset.index = index;
                span.addEventListener("click", handleWordClick);
                puzzleContainer.appendChild(span);
            });

            // Handle word clicks
            function handleWordClick(event) {
                const wordElement = event.target;
                const word = wordElement.dataset.word;

                if (wordElement.classList.contains("selected")) {
                    wordElement.classList.remove("selected");
                    selectedWords = selectedWords.filter(w => w !== word);
                } else {
                    wordElement.classList.add("selected");
                    selectedWords.push(word);
                }

                checkWinCondition();
            }

            // Check if all correct words are selected and no incorrect words are selected
            function checkWinCondition() {
                const selectedSet = new Set(selectedWords);
                const targetSet = new Set(targetWords);

                if (
                    targetSet.size === selectedSet.size &&
                    [...targetSet].every(word => selectedSet.has(word))
                ) {
                    endGame();
                }
            }

            // End the game
            function endGame() {
                const wordElements = document.querySelectorAll(".word");

                wordElements.forEach(wordElement => {
                    wordElement.removeEventListener("click", handleWordClick);
                    if (wordElement.classList.contains("selected")) {
                        wordElement.classList.add("correct");
                    } else {
                        wordElement.classList.add("subtle");
                    }
                });

                document.getElementById("instruction").textContent =
                    "Well done! You've completed the puzzle.";
            }
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
