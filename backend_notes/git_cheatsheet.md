# Git Cheatsheet — ft_transcendence

## Daily workflow

### 1. Before starting any work — sync with the team
```bash
git checkout dev		# switch to the dev branch
git pull						# download the latest changes from GitHub
```
Always do this before creating a new branch. You want to start from the latest version.

### 2. Create a branch for your task
```bash
git checkout -b feature/your-feature-name
```
Examples:
```bash
git checkout -b feature/user-auth
git checkout -b feature/file-upload
git checkout -b infra/docker-setup
```
One branch = one feature. Never work directly on `main` or `dev`.

### 3. Check what you've changed
```bash
git status              # shows which files were modified
git diff                # shows exactly what changed line by line
```

### 4. Save your work
```bash
git add .                          # stage all changed files
git add src/specific-file.ts       # or stage one specific file
git commit -m "feat: description of what you did"
```

#### Commit message conventions
| Prefix | When to use |
|--------|-------------|
| `feat:` | adding a new feature |
| `fix:` | fixing a bug |
| `refactor:` | rewriting code without changing behavior |
| `docs:` | updating documentation or README |
| `infra:` | docker, ci, server setup |
| `style:` | formatting, missing semicolons, etc |

Examples:
```
feat: add user login endpoint
fix: correct password hashing bug
infra: add postgresql container to docker-compose
```

### 5. Push your branch to GitHub
```bash
git push origin feature/your-feature-name
```
First time pushing a new branch this sets it up on GitHub. After that just `git push` is enough.

### 6. Open a Pull Request
Go to GitHub → your repository → you'll see a banner suggesting to open a Pull Request from your branch into `dev`. Click it, add a short description of what you did, and assign a teammate to review it.

---

## Staying up to date while working

If teammates merge things into `dev` while you're working on your branch:
```bash
git checkout dev
git pull
git checkout feature/your-feature-name
git merge dev
```
This brings the latest changes from `dev` into your branch so you don't fall too far behind.

If you get a **merge conflict** (two people edited the same line):
```bash
git status              # shows which files have conflicts
```
Open the conflicted file — you'll see markers like this:
```
<<<<<<< HEAD
your version of the code
=======
your teammate's version
>>>>>>> dev
```
Manually pick which version to keep (or combine both), delete the markers, then:
```bash
git add .
git commit -m "fix: resolve merge conflict"
```

---

## Useful commands to know

```bash
git log --oneline       # see recent commit history, compact view
git branch              # list all local branches
git branch -a           # list all branches including remote ones
git checkout dev        # switch to an existing branch
git stash               # temporarily save uncommitted work
git stash pop           # restore your stashed work
git diff main..dev      # compare two branches
```

---

## The branch structure

```
main        → stable, working version. Never push directly here.
dev         → integration branch. All features merge here first.
feature/*   → your work. One branch per feature.
infra/*     → devops and infrastructure work.
```

---

## Quick reference — the loop you'll do every day

```bash
git checkout dev
git pull
git checkout -b feature/what-im-building
# ... do your work ...
git add .
git commit -m "feat: what I did"
git push origin feature/what-im-building
# open Pull Request on GitHubc
```
