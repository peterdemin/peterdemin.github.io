# How to clean up stale git branches

I enjoy git branching and use it for every new feature or bugfix.
Once feature is complete, I merge it back to `master` branch with `--no-ff` flag.
With this approach
```shell
git log --all --graph --decorate --oneline
```
shows clean history of project evolution and `git bisect` finds regression points fast.

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
