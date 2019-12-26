# How to clean up stale git branches

I enjoy git branching and use it for every new feature or bugfix.
Once feature is complete, I merge it back to `master` branch with `--no-ff` flag.
Once set of features are ready for production, I merge `master` into `release` with `--no-ff`.
Then I merge `release` into `master` with `--ff-only` to keep history slim.

With this approach I can see clean history of project evolution:

```shell
$ git log --all --graph --decorate --oneline
*   fef063b (HEAD -> master, origin/master, release, origin/release, origin/HEAD) Merge pull request #406 from master to release
|\
| * 698f76f Here I stressed out and committed hot-fix right in master branch
| *   3896eaa Merge pull request #405 from good-job-414 to master
| |\
| | * c9a60d9 Sometimes it's much more than that :/
| | * e6c9a4d I had to make 3 commmits!
| | * 3127229 This one is bigger
| |/
| *   dca775f Merge pull request #404 from clean-old-tasks-413 to master
| |\
| | * 47dd5b4 Added management command to clean up old tasks
| |/
| *   f550392 Merge pull request #401 from nifty-changes-412 to master
| |\
|/ /
| * 298638f Made some small nifty changes
|/
| * bc18cf0 (feature-408) Did some work that is not ready to be merged to master
|/
*   3cb96ef Merge pull request #400 from master to release
```

And `git bisect` finds regression points fast.

The one downside is that old branches remain in the history and the list grows rapidly.
Some tools allow automatically delete branches after they merged to master,
however I prefer manual approach, that leaves more control in my hands.

My solution is to run following commands once I see number of stale branches grown to big:

1. Delete branches merged to master from remote `origin`:

   ```shell
   git branch --merged master | grep -v master | xargs -L1 -I{} git push origin :{}
   ```

2. Delete them locally:

   ```shell
   git branch --merged master | grep -v master | xargs git branch -d
   ```
   
   
# Clean up old unmerged branches

When using rebase-merge strategy, feature branches remain in the repo unmerged to master.
One simple solution for cleaning up is to just force the deletion of old branches.

To put a list of all local branches into vim, run:

```shell
git branch | vim -
```

Inside vim, add the date of the last commit after each branch name. First, record a macro, that reads the date:

```
qq:read ! git log -1 ^A | grep Date: | cut -d\  -f2-^MkJjq
```

then undo and apply the macro to all lines:

```
%g/^/ norm @q
```

Remove the week day:

```
%g/^/ norm WdW
```

Sort lines by date:

```
%sort /^[^ ]* */
```

Remove all the lines for the last month (for example, December):

```
%g/Dec/d
```

Remove the dates:

```
%g/^/ norm ED
```

Join all lines and prepend with `git branch -D`:

```
ggVGJIgit branch -D ^M
```

Execute:

```
w ! bash
```
