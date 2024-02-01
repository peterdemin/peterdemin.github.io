# My favourite aliases for Git (and vi)

```bash
# git co is a shorthand for git checkout
git config --global alias.vi 'checkout'

# git vi opens all files with uncommitted changes in vi editor
git config --global alias.vi '!vi -o $(git status -s | awk '"'"'/^[^?]/ {print $2}'"'"') -c '"'"'au VimEnter * windo norm g;'"'"''

# git vib opens all files changed in the branch (compared to remote master) in vi editor
git config --global alias.vib '!vi -o $(git diff origin/master...HEAD --name-status | awk '"'"'/^[AM]/ {print $2}'"'"')'

# git rbm rebases current branch on top of the fresh origin master and pushes it out
git config --global alias.rbm '!git fetch --all -p && git rebase origin/master && git push -f'

# git rbm rebases current branch on top of the fresh origin master and force-pushes it out
git config --global alias.rbm '!git fetch --all -p && git rebase origin/master && git push -f'

# git amp amends the latest commit with the current changes and force-pushes it out
git config --global alias.amp '!git commit --amend -a --no-edit && git push -f'
```

## Git configuration

```bash
# Record conflict resolution and re-apply it automatically
git config --global rerere.enabled=true

# Use 4 spaces for tabs in git diff
git config --global core.pager="less -x1,5"

# Automatically set up remote upstream when pushing branch
git config --global push.autoSetupRemote=true

# Always use rebase for git pull
git config --global pull.rebase=true
```
