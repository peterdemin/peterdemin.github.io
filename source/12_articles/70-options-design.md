# Option-centric CLI code design

What I want to explain here is the way to organize command-line application in a way that's fast to develop, and to reason about.

I switched to this approach during a rewrite for [pip-compile-multi](http://pip-compile-multi.readthedocs.io/en/latest/).

The problem I wanted to solve was that application got many features, that could interract in many ways.
The logic affected by each feature was spread across the codebase and it was sometimes hard to tell, how exactly a command-line argument affects the application.
Another issue was that there was no obvious place to put the docs, and it was easy to forget to update them.

What I wanted is to have all aspects of a command-line option to be encapsulated in one file.
This includes:

1. All the command-line option attributes, including name, type, and help text.
2. The complete public documentation.
3. All the related logic.

With all the features extracted, the core flow of the application became very focused and straightforward.
It's easy to see what features affect each particular step.
Similarly, it's quick to grep all references of a feature.

There's gotta be a catch, right? Of course, all the ugliness sweeped away from core flow and features has to go somewhere.
I called this hell hole a Controller.
Controller is using god-object anti-pattern, it imports all features, initializes them and provides routing for each use-case from the core flow.
It has a natural tendency of turning into a dumpster fire, so that's the part that requires some discipline.
The trick is to limit controller's work to a mere routing to the right feature.

Another anti-pattern, that made this setup work so smoothly is strategically placed global variables.
The feature controller is a stateful singleton (aka global class instance). 
I can feel readers closing the tab in disdain here.
But hey, the best part of knowing the rules is knowing when to break them.
I could have carefully broken up the controller into relevant pieces of functionality.
I could have passed the instances of broken up controllers through a dependency injection.
It would have made the code design cleaner, and more canonical.
It would also make it harder to maintain.
I don't have hundreds of options, I only have a dozen.
My ugly rug, hiding all the sweep is 200 LoC, not 10,000.
I haven't touched the project in a year, but then needed to add a new feature.
Without much recollection of what's what, I just grepped my way through the codebase, found something similar and piggy-backed on it.

Much to my disappointment, I found that most people don't share my mindset, though.
The idea of option encapsulation doesn't click immediately.
And (at least mine) contributors are not famililar with the design pattern (that I made up).
Oh, well, what can I say? I wouldn't have any other way, still.
This design is reason the project is alive after eight years it started.
