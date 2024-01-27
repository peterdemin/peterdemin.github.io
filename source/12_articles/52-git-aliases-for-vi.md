# Git aliases for vi

```bash
# git vi opens all files with uncommitted changes in vi editor
git config --global alias.vi '!vi -o $(git status -s | awk '"'"'/^[^?]/ {print $2}'"'"') -c '"'"'au VimEnter * windo norm g;'"'"''

# git vib opens all files changed in the branch (compared to remote master) in vi editor
git config --global alias.vib '!vi -o $(git diff origin/master...HEAD --name-status | awk '"'"'/^[AM]/ {print $2}'"'"')'
```
