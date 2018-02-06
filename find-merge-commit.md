# How to find merge commit which includes a specific commit

> TL;DR in the end you can find git alias config, that will just do the thing.

Recently I was researching how a complex feature was implemented.
I found in `git log -p` output commit, that did a part of it, but I needed a big picture.
We use BitBucket's pull request for review, and naturally all links and discussions aggregate there,
so I wanted to find a PR, that had a specific change.

If presented in terms of git commits graph we have something like this:

```
       c---e---g    feature
      /         \
-a---b---d---f---h---i---j--- master
```

I know the commit hash for `c` and want to find commit `h` that has PR number in it's message.

Unfortunately git doesn't provide a builtin command for such case.
But it has `git rev-list` - the tool, that lists commit hashes with a bunch of different options.

First option of interest is `--ancestry-path`:

```
 --ancestry-path
     When given a range of commits to display (e.g.  commit1..commit2 or commit2 ^commit1),
     only display commits that exist directly on the ancestry chain between the commit1 and commit2,
     i.e. commits that are both descendants of commit1, and ancestors of commit2.
```

So for command `git rev-list --ancestry-path c..master` it will give the list:

```
j i h g e
```

This list includes all feature commits and all the commits that were done in master after the merge.
It doesn't include all the commits on master that were done prior the `h` merge (`a b d f`).

Now I need to remove the tail, which is `i j`.
I'll do it with the help of `--first-parent`:

```
 --first-parent
     Follow only the first parent commit upon seeing a merge commit.
     This option can give a better overview when viewing the evolution of a particular topic branch,
     because merges into a topic branch tend to be only about adjusting to updated upstream
     from time to time, and this option allows you to ignore the individual commits
     brought in to your history by such a merge. Cannot be combined with --bisect.
```

Command `git rev-list --first-parent c..master` will return list:

```
j i h f d b a
```

That is, history of master branch, that excludes commits on feature branch.
If we look closer on two lists at hand, we'll see, that they start the same and go different paths exactly on the `h` commit.
So now I need to compare two lists and the find first different item. Sounds easy, not so easy to do in bash.

First let's add line numbers to the output of these two commands. Like this:

```
$ (git rev-list --ancestry-path c..master | cat -n); (git rev-list --first-parent c..master | cat -n)
1 j
2 i
3 h
4 g
5 e
1 j
2 i
3 h
4 f
5 d
6 b
7 a
```

Then sort them by commit hash:

```
... | sort -k2 -s
7 a
6 b
5 d
5 e
4 f
4 g
3 h
3 h
2 i
2 i
1 j
1 j
```

Here we can clearly see that duplication starts at `h`. Let's remove all unique commits leaving only duplicates:

```
... | uniq -d -f1
3 h
2 i
1 j
```

Example output is in order, so I can just grab the first line.
But that's true for this simplistic example and not always true in real complex git graphs.
And it is exactly the reason behind adding line numbers.
After numeric sort:

```
... | sort -n
1 j
2 i
3 h
```

Now take the last line:

```
... | tail -1
3 h
```

And strip the line number, leaving the commit hash:

```
... | cut -f2
h
```

Having this hash, I was able to (finely) read the commit message and see the pull request number:

```
git show h

Merge pull request #415 in repo from feature to master
```

## Scripting the solution

Add these lines to your git config file (user specific `~/.gitconfig` or repo specific `.git/config`):

```
[alias]
    find-merge = "!sh -c 'commit=$0 && branch=${1:-HEAD} && (git rev-list $commit..$branch --ancestry-path | cat -n; git rev-list $commit..$branch --first-parent | cat -n) | sort -k2 -s | uniq -f1 -d | sort -n | tail -1 | cut -f2'"
    show-merge = "!sh -c 'merge=$(git find-merge $0 $1) && [ -n \"$merge\" ] && git show $merge'"
```

Credits to [Robin Stocker](https://stackoverflow.com/users/305973/robinst) who came up with the solution in [this StackOverflow question](https://stackoverflow.com/a/30998048/135079)
