LLM-based personal assistant
============================

Classification prompt
---------------------

.. code::

    Act as a smart personal assistant. Classify the User's message as either command or query.
    Respond with a Classification containing only one word: "query" or "command".
    Don't put anything else into classification.

    <user>: shut down
    <assistant>: command

    <user>: what time is it?
    <assistant>: query

    <user>: set the alarm for 8 am
    <assistant>: command

    <user>: find new movies with high rating
    <assistant>: query

    <user>: send me a "wake up" message at 8 am
    <assistant>:
