# List date of last commit on git branches

Print all local branch names with date of last commit:

    git branch --list | cut -c3- | while read branch; do git log -1 $branch --format="%ai $branch" -- | cat; done | sort
