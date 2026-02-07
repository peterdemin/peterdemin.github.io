#!/usr/bin/env python3
import argparse
import os
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path

INFRA_ROOT = Path("/var/lib/infra")
INFRA_DIR = INFRA_ROOT / "infra"
PRIMARY_FILE = INFRA_DIR / "primary_key_fingerprint.txt"
MIRRORS_DIR = INFRA_DIR / "mirrors"
LOCAL_PUB = Path("/home/pages/.ssh/id_ed25519.pub")
AUTHORIZED_KEYS = Path("/home/pages/.ssh/authorized_keys")
MIRRORS_LIST = Path("infra/mirrors.txt")
MIRRORS_OUT = Path("infra/mirrors")
CHALLENGES_DIR = INFRA_DIR / "challenges"
WEBROOT_CHALLENGES = Path("/var/www/pages/.well-known/acme-challenge")
CERTS_DIR = INFRA_DIR / "certs"


def _local_fingerprint() -> str:
    result = subprocess.run(
        ["ssh-keygen", "-lf", str(LOCAL_PUB)],
        check=True,
        capture_output=True,
        text=True,
    )
    parts = result.stdout.split()
    if len(parts) < 2:
        raise RuntimeError(f"Unexpected ssh-keygen output: {result.stdout!r}")
    return parts[1]


def _fingerprint_of_key(text: str) -> str:
    proc = subprocess.run(
        ["ssh-keygen", "-lf", "/dev/stdin"],
        input=text,
        text=True,
        check=True,
        capture_output=True,
    )
    parts = proc.stdout.split()
    if len(parts) < 2:
        raise RuntimeError(f"Unexpected ssh-keygen output: {proc.stdout!r}")
    return parts[1]


def _write_authorized_keys(keys):
    if not keys:
        return
    AUTHORIZED_KEYS.write_text("\n".join(keys) + "\n", encoding="utf-8")
    os.chmod(AUTHORIZED_KEYS, 0o600)
    subprocess.run(["chown", "pages:pages", str(AUTHORIZED_KEYS)], check=True)


def _ensure_root():
    if os.geteuid() != 0:
        raise SystemExit("Must run as root.")


def _safe_ref_name(value: str) -> str:
    cleaned = []
    for ch in value:
        if ch.isalnum():
            cleaned.append(ch)
        else:
            cleaned.append("_")
    return "".join(cleaned).strip("_") or "mirror"


def _run_git(args, cwd=None, capture=False):
    return subprocess.run(
        ["git", *args],
        check=True,
        cwd=cwd,
        capture_output=capture,
        text=capture,
    )


def _sync_challenges():
    if not CHALLENGES_DIR.exists():
        return
    WEBROOT_CHALLENGES.mkdir(parents=True, exist_ok=True)
    for path in WEBROOT_CHALLENGES.glob("*"):
        if path.is_file():
            path.unlink()
    for src in CHALLENGES_DIR.glob("*"):
        if not src.is_file():
            continue
        shutil.copyfile(src, WEBROOT_CHALLENGES / src.name)


def _install_certs_from_tar(tar_path: Path):
    with tempfile.TemporaryDirectory() as tmpdir:
        with tarfile.open(tar_path, "r:gz") as tar:
            tar.extractall(tmpdir)
        tmp = Path(tmpdir)
        domain = tar_path.stem.replace(".tar", "")
        live_dir = Path("/etc/letsencrypt/live") / domain
        live_dir.mkdir(parents=True, exist_ok=True)
        fullchain = tmp / "fullchain.pem"
        privkey = tmp / "privkey.pem"
        if not fullchain.exists() or not privkey.exists():
            raise RuntimeError("Missing cert files in archive.")
        shutil.copyfile(fullchain, live_dir / "fullchain.pem")
        shutil.copyfile(privkey, live_dir / "privkey.pem")
        os.chmod(live_dir / "fullchain.pem", 0o644)
        os.chmod(live_dir / "privkey.pem", 0o600)


def _sync_certs():
    if not CERTS_DIR.exists():
        return
    updated = False
    key_path = Path("/home/pages/.ssh/id_ed25519")
    if not key_path.exists():
        print(f"Missing decryption key: {key_path}")
        return
    for enc in CERTS_DIR.glob("*.tar.age"):
        with tempfile.TemporaryDirectory() as tmpdir:
            out = Path(tmpdir) / enc.name.replace(".age", "")
            try:
                subprocess.run(
                    [
                        "age",
                        "--decrypt",
                        "-i",
                        str(key_path),
                        "-o",
                        str(out),
                        str(enc),
                    ],
                    check=True,
                )
                _install_certs_from_tar(out)
                updated = True
            except subprocess.CalledProcessError:
                print(f"Failed to decrypt cert bundle: {enc}")
            except (OSError, RuntimeError) as exc:
                print(f"Failed to install certs from {enc}: {exc}")
    if updated:
        subprocess.run(["systemctl", "reload", "nginx"], check=True)


class ApplyCommand:
    def add_subparser(self, sub):
        p = sub.add_parser("apply", help="Apply infra config")
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        del args
        _ensure_root()

        if not PRIMARY_FILE.exists():
            print(f"Missing {PRIMARY_FILE}; skipping primary selection.")
            return 0

        if not LOCAL_PUB.exists():
            print(f"Missing {LOCAL_PUB}; cannot evaluate primary.")
            return 1

        primary_fp = PRIMARY_FILE.read_text(encoding="utf-8").strip()
        local_fp = _local_fingerprint()

        if primary_fp == local_fp:
            subprocess.run(
                ["systemctl", "enable", "--now", "certbot.timer"], check=True
            )
        else:
            subprocess.run(
                ["systemctl", "disable", "--now", "certbot.timer"], check=True
            )

        if MIRRORS_DIR.exists():
            keys = []
            for pub in sorted(MIRRORS_DIR.glob("*.pub")):
                key_text = pub.read_text(encoding="utf-8").strip()
                try:
                    if _fingerprint_of_key(key_text) == primary_fp:
                        keys.append(key_text)
                except subprocess.CalledProcessError:
                    continue
            if not keys:
                print(
                    "No matching primary key found in infra/mirrors; "
                    "authorized_keys not updated."
                )
            else:
                _write_authorized_keys(keys)

        _sync_challenges()
        _sync_certs()

        return 0


class FingerprintCommand:
    def add_subparser(self, sub):
        p = sub.add_parser("fingerprint", help="Print local SSH public key fingerprint")
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        del args
        if not LOCAL_PUB.exists():
            print(f"Missing {LOCAL_PUB}")
            return 1
        print(_local_fingerprint())
        return 0


class SetPrimaryCommand:
    def add_subparser(self, sub):
        p = sub.add_parser("set-primary", help="Set primary fingerprint to local key")
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        del args
        _ensure_root()
        if not LOCAL_PUB.exists():
            print(f"Missing {LOCAL_PUB}")
            return 1
        PRIMARY_FILE.parent.mkdir(parents=True, exist_ok=True)
        PRIMARY_FILE.write_text(_local_fingerprint() + "\n", encoding="utf-8")
        return 0


class FetchKeysCommand:
    def add_subparser(self, sub):
        p = sub.add_parser(
            "fetch-keys",
            help="Fetch mirror public keys from infra branch remotes",
        )
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        del args
        if not MIRRORS_LIST.exists():
            print(f"Missing {MIRRORS_LIST}")
            return 1

        MIRRORS_OUT.mkdir(parents=True, exist_ok=True)
        mirrors = []
        for line in MIRRORS_LIST.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            mirrors.append(line)

        if not mirrors:
            print(f"No mirrors listed in {MIRRORS_LIST}")
            return 1

        for mirror in mirrors:
            ref = f"refs/infra-remotes/{_safe_ref_name(mirror)}"
            _run_git(["fetch", mirror, f"master:{ref}"])
            ls = _run_git(
                ["ls-tree", "-r", "--name-only", ref, "--", "local-keys"],
                capture=True,
            )
            for relpath in ls.stdout.splitlines():
                if not relpath.endswith(".pub"):
                    continue
                blob = _run_git(["show", f"{ref}:{relpath}"], capture=True)
                dest = MIRRORS_OUT / Path(relpath).name
                dest.write_text(blob.stdout, encoding="utf-8")

        return 0


class UpdateMirrorsCommand:
    def add_subparser(self, sub):
        p = sub.add_parser(
            "update-mirrors",
            help="Populate infra/mirrors.txt from git remotes and commit",
        )
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        del args
        remotes = _run_git(["remote", "-v"], capture=True).stdout.splitlines()
        urls = []
        for line in remotes:
            parts = line.split()
            if len(parts) < 3:
                continue
            url = parts[1]
            if "pages@" not in url:
                continue
            if "repo.git" not in url:
                continue
            if url not in urls:
                urls.append(url)

        if not urls:
            print("No mirror remotes found.")
            return 1

        MIRRORS_LIST.parent.mkdir(parents=True, exist_ok=True)
        header = [
            "# One mirror per line. Use the git URL for pages.git on the mirror.",
            "# Generated from git remotes on the builder.",
        ]
        MIRRORS_LIST.write_text("\n".join(header + urls) + "\n", encoding="utf-8")

        branch = _run_git(
            ["rev-parse", "--abbrev-ref", "HEAD"], capture=True
        ).stdout.strip()
        if branch != "master":
            print(f"Refusing to commit: current branch is {branch}")
            return 1

        _run_git(["add", str(MIRRORS_LIST)])
        _run_git(["commit", "-m", "Update mirror list"])
        return 0


class MakeCommand:
    def add_subparser(self, sub):
        p = sub.add_parser("make", help="Run build command in current directory")
        p.add_argument("command", nargs=argparse.REMAINDER)
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        if not args.command:
            print("No command provided.")
            return 1
        return subprocess.run(["make"] + args.command, check=True).returncode


class DistributeChallengeCommand:
    def add_subparser(self, sub):
        p = sub.add_parser(
            "distribute-challenge",
            help="Write ACME challenge and push infra branch to mirrors",
        )
        p.add_argument("--token", required=True)
        p.add_argument("--validation", required=True)
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        _ensure_root()

        token = args.token.strip()
        validation = args.validation.strip()
        if not token or not validation:
            print("Token and validation must be non-empty.")
            return 1

        CHALLENGES_DIR.mkdir(parents=True, exist_ok=True)
        WEBROOT_CHALLENGES.mkdir(parents=True, exist_ok=True)

        (CHALLENGES_DIR / token).write_text(validation + "\n", encoding="utf-8")
        (WEBROOT_CHALLENGES / token).write_text(validation + "\n", encoding="utf-8")

        git_dir = "/home/pages/repo.git"
        work_tree = "/var/lib/infra"
        subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "checkout",
                "-f",
                "master",
            ],
            check=True,
        )
        subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "add",
                "infra/challenges",
            ],
            check=True,
        )
        diff = subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "diff",
                "--cached",
                "--quiet",
            ]
        )
        if diff.returncode == 0:
            return 0
        subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "commit",
                "-m",
                f"Add ACME challenge {token}",
            ],
            check=True,
        )

        if MIRRORS_LIST.exists():
            for line in MIRRORS_LIST.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                subprocess.run(
                    [
                        "runuser",
                        "-u",
                        "pages",
                        "--",
                        "git",
                        "--git-dir",
                        git_dir,
                        "push",
                        line,
                        "master",
                    ],
                    check=True,
                )

        return 0


class CleanupChallengeCommand:
    def add_subparser(self, sub):
        p = sub.add_parser(
            "cleanup-challenge",
            help="Remove ACME challenge and push infra branch to mirrors",
        )
        p.add_argument("--token", required=True)
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        _ensure_root()

        token = args.token.strip()
        if not token:
            print("Token must be non-empty.")
            return 1

        challenge = CHALLENGES_DIR / token
        web_challenge = WEBROOT_CHALLENGES / token
        if challenge.exists():
            challenge.unlink()
        if web_challenge.exists():
            web_challenge.unlink()

        git_dir = "/home/pages/repo.git"
        work_tree = "/var/lib/infra"
        subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "checkout",
                "-f",
                "master",
            ],
            check=True,
        )
        subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "add",
                "infra/challenges",
            ],
            check=True,
        )
        diff = subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "diff",
                "--cached",
                "--quiet",
            ]
        )
        if diff.returncode == 0:
            return 0
        subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "commit",
                "-m",
                f"Remove ACME challenge {token}",
            ],
            check=True,
        )

        if MIRRORS_LIST.exists():
            for line in MIRRORS_LIST.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                subprocess.run(
                    [
                        "runuser",
                        "-u",
                        "pages",
                        "--",
                        "git",
                        "--git-dir",
                        git_dir,
                        "push",
                        line,
                        "master",
                    ],
                    check=True,
                )

        return 0


class DistributeCertsCommand:
    def add_subparser(self, sub):
        p = sub.add_parser(
            "distribute-certs",
            help="Encrypt certs to mirrors and push infra branch",
        )
        p.add_argument("--domain", required=True)
        p.add_argument(
            "--fullchain",
            default=None,
            help="Path to fullchain.pem (defaults to /etc/letsencrypt/live/<domain>/fullchain.pem)",
        )
        p.add_argument(
            "--privkey",
            default=None,
            help="Path to privkey.pem (defaults to /etc/letsencrypt/live/<domain>/privkey.pem)",
        )
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        _ensure_root()

        domain = args.domain.strip()
        if not domain:
            print("Domain must be non-empty.")
            return 1

        fullchain = (
            Path(args.fullchain)
            if args.fullchain
            else Path("/etc/letsencrypt/live") / domain / "fullchain.pem"
        )
        privkey = (
            Path(args.privkey)
            if args.privkey
            else Path("/etc/letsencrypt/live") / domain / "privkey.pem"
        )
        if not fullchain.exists() or not privkey.exists():
            print("Missing fullchain or privkey.")
            return 1

        recipients = []
        if MIRRORS_DIR.exists():
            for pub in sorted(MIRRORS_DIR.glob("*.pub")):
                recipients.append(pub.read_text(encoding="utf-8").strip())
        if not recipients:
            print(f"No recipients found in {MIRRORS_DIR}")
            return 1

        CERTS_DIR.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory() as tmpdir:
            tar_path = Path(tmpdir) / f"{domain}.tar.gz"
            with tarfile.open(tar_path, "w:gz") as tar:
                tar.add(fullchain, arcname="fullchain.pem")
                tar.add(privkey, arcname="privkey.pem")
            out_path = CERTS_DIR / f"{domain}.tar.age"
            cmd = ["age", "--encrypt", "-o", str(out_path)]
            for recipient in recipients:
                cmd.extend(["-r", recipient])
            cmd.append(str(tar_path))
            subprocess.run(cmd, check=True)

        git_dir = "/home/pages/repo.git"
        work_tree = "/var/lib/infra"
        subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "checkout",
                "-f",
                "master",
            ],
            check=True,
        )
        subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "add",
                "infra/certs",
            ],
            check=True,
        )
        diff = subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "diff",
                "--cached",
                "--quiet",
            ]
        )
        if diff.returncode == 0:
            return 0
        subprocess.run(
            [
                "git",
                "--git-dir",
                git_dir,
                "--work-tree",
                work_tree,
                "commit",
                "-m",
                f"Update certs for {domain}",
            ],
            check=True,
        )

        if MIRRORS_LIST.exists():
            for line in MIRRORS_LIST.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                subprocess.run(
                    [
                        "runuser",
                        "-u",
                        "pages",
                        "--",
                        "git",
                        "--git-dir",
                        git_dir,
                        "push",
                        line,
                        "master",
                    ],
                    check=True,
                )

        return 0


def main(argv=None):
    parser = argparse.ArgumentParser(prog="infra")
    sub = parser.add_subparsers(dest="cmd", required=True)
    ApplyCommand().add_subparser(sub)
    FingerprintCommand().add_subparser(sub)
    SetPrimaryCommand().add_subparser(sub)
    FetchKeysCommand().add_subparser(sub)
    UpdateMirrorsCommand().add_subparser(sub)
    MakeCommand().add_subparser(sub)
    DistributeChallengeCommand().add_subparser(sub)
    CleanupChallengeCommand().add_subparser(sub)
    DistributeCertsCommand().add_subparser(sub)

    args = parser.parse_args(argv)
    return args.handle(args)


if __name__ == "__main__":
    raise SystemExit(main())
