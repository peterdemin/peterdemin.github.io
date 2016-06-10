Title: List date of last commit on git branches
Date: 2016-03-04 15:38
Category: git

Print all local branch names with date of last commit:

    git branch --list | cut -c3- | while read branch; do git log -1 $branch --format="%ai $branch" -- | cat; done | sort
