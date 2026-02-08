#!/usr/bin/env python3
import argparse
import os
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
INFRA_DIR = Path("/var/lib/infra")
KEYS_DIR = INFRA_DIR / "keys"
PRIMARY_KEY = KEYS_DIR / "primary.pub"
BUILDER_KEY = KEYS_DIR / "builder.pub"
HOME_DIR = Path("/home/pages")
AUTHORIZED_KEYS = HOME_DIR / ".ssh" / "authorized_keys"
MIRRORS_LIST = Path("infra/mirrors.txt")
FORWARD_LIST = Path("infra/forward.txt")
CHALLENGES_DIR = INFRA_DIR / "challenges"
WEBROOT_CHALLENGES = Path("/var/www/pages/.well-known/acme-challenge")
CERTS_DIR = INFRA_DIR / "certs"
GIT_DIR = HOME_DIR / "repo.git"
KNOWN_HOSTS = Path.home() / ".ssh/known_hosts"


def _ensure_root():
    if os.geteuid() != 0:
        raise SystemExit("Must run as root.")


class ApplyCommand:
    _LOCAL_PUB = HOME_DIR / ".ssh" / "id_ed25519.pub"

    def add_subparser(self, sub):
        p = sub.add_parser("apply", help="Apply infra config")
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        del args
        _ensure_root()

        if not PRIMARY_KEY.exists():
            print(f"Missing {PRIMARY_KEY}; skipping primary selection.")
            return 0

        if not self._LOCAL_PUB.exists():
            print(f"Missing {self._LOCAL_PUB}; cannot evaluate primary.")
            return 1

        # primary_fp = self._fingerprint(PRIMARY_KEY)
        # local_fp = self._fingerprint(self._LOCAL_PUB)
        # if primary_fp == local_fp:
        #     subprocess.check_call(
        #         ["systemctl", "enable", "--now", "certbot.timer"]
        #     )
        # else:
        #     subprocess.check_call(
        #         ["systemctl", "disable", "--now", "certbot.timer"]
        #     )

        if KEYS_DIR.exists():
            keys = []
            for path in (BUILDER_KEY, PRIMARY_KEY):
                if path.exists():
                    keys.append(path.read_text(encoding="utf-8").strip())
            if not keys:
                print(
                    "No builder/primary keys found in infra/keys; "
                    "authorized_keys not updated."
                )
            else:
                self._write_authorized_keys(keys)

        self._sync_challenges()
        self._sync_certs()
        return 0

    def _fingerprint(self, path: Path) -> str:
        return subprocess.check_output(
            ["ssh-keygen", "-lf", str(path)],
            text=True,
        ).split()[1]

    def _write_authorized_keys(self, keys):
        AUTHORIZED_KEYS.write_text(
            "".join(f"{key}\n" for key in keys), encoding="utf-8"
        )
        os.chmod(AUTHORIZED_KEYS, 0o600)
        subprocess.check_call(["chown", "pages:pages", str(AUTHORIZED_KEYS)])

    def _sync_challenges(self) -> None:
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

    def _sync_certs(self) -> None:
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
                    self._install_certs_from_tar(out)
                    updated = True
                except subprocess.CalledProcessError:
                    print(f"Failed to decrypt cert bundle: {enc}")
                except (OSError, RuntimeError) as exc:
                    print(f"Failed to install certs from {enc}: {exc}")
        if updated:
            subprocess.run(["systemctl", "reload", "nginx"], check=True)

    def _install_certs_from_tar(self, tar_path: Path) -> None:
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


class Command:
    def __init__(self, *c: str | Path, verbose: bool = False) -> None:
        self._prefix = c
        self._verbose = verbose

    def runuser(self, user: str) -> "Command":
        return self.__class__(
            *(("runuser", "-u", user, "--") + self._prefix), verbose=self._verbose
        )

    def subcommand(self, *c: str | Path) -> "Command":
        return self.__class__(*(self._prefix + c), verbose=self._verbose)

    def call(self, *c: str | Path, **kwargs) -> int:
        self._print(c)
        return subprocess.call(self._prefix + c, **kwargs)

    def __call__(self, *c: str | Path, **kwargs) -> None:
        self._print(c)
        subprocess.check_call(self._prefix + c, **kwargs)

    def check_output(self, *c: str | Path, **kwargs) -> str:
        self._print(c)
        kwargs["text"] = True
        return subprocess.check_output(self._prefix + c, **kwargs)

    def _print(self, c: tuple[str | Path, ...]) -> None:
        if self._verbose:
            print(shlex.join(map(str, self._prefix + c)), file=sys.stderr)


class Mirror:
    def __init__(self, infra: Path = HERE) -> None:
        self._infra = infra

    def all_mirrors(self) -> list[tuple[str, str]]:
        return self._load_remotes(self._infra / "mirrors.txt")

    def primary(self) -> tuple[str, str]:
        primary = self._primary_comment()
        mirrors = self.all_mirrors()
        for remote, branch in mirrors:
            if remote.startswith(primary):
                return remote, branch
        return mirrors[0]

    def non_primary(self) -> list[tuple[str, str]]:
        primary = self._primary_comment()
        mirrors = self.all_mirrors()
        primary_idx = 0
        for i, (remote, _) in enumerate(mirrors):
            if remote.startswith(primary):
                primary_idx = i
                break
        return [m for i, m in enumerate(mirrors) if i != primary_idx]

    def _primary_comment(self) -> str:
        return Path(self._infra / "keys/primary.pub").read_text().strip().split()[-1]

    def forwards(self) -> list[tuple[str, str]]:
        return self._load_remotes(self._infra / "forward.txt")

    def _load_remotes(self, path: Path) -> list[tuple[str, str]]:
        result: list[tuple[str, str]] = []
        for line in path.open(encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#"):
                remote, _, branch = line.partition(" ")
                result.append((remote, branch or "master"))
        return result


class BuilderPublishCommand:
    def __init__(self) -> None:
        bare_git = Command("git", "--git-dir", verbose=True)
        self._pages_git = bare_git.subcommand(Path.home() / "pages.git")
        self._infra_git = bare_git.subcommand(Path.home() / "infra.git")
        self._source_git = bare_git.subcommand(Path.home() / "repo.git")

    def add_subparser(self, sub):
        p = sub.add_parser("builder-publish", help="Push to mirrors")
        p.add_argument("content", help="Directory with content to publish")
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        """
        Publishes content and infra changes to all mirrors.

        Executed from the worktree directory of source repo.
        """
        mirror = Mirror()
        mirrors = mirror.all_mirrors()
        for remote, _ in mirrors:
            self._add_host_key(remote)
        self._push_content(args.content, mirrors)
        infra_mirrors = [
            (r.replace(":pages.git", ":infra.git"), b)
            for r, b in mirrors
            if r.endswith(":pages.git") and b == "master"
        ]
        self._push_infra(infra_mirrors)
        self._push_source(mirror.forwards())
        return 0

    def _push_content(self, content: str, mirrors: list[tuple[str, str]]) -> None:
        git = self._pages_git.subcommand("-C", content, "--work-tree", ".")
        git("add", "-A", ".")
        git.call("commit", "-m", "build pages")
        for remote, branch in mirrors:
            self._pages_git.call("push", remote, f"+master:{branch}")

    def _push_infra(self, mirrors: list[tuple[str, str]]) -> None:
        git = self._infra_git.subcommand("-C", "infra", "--work-tree", ".")
        git("add", "-A", ".")
        git.call("commit", "-m", "infra")
        p_remote, p_branch = self._pick_primary(mirrors)
        git.call("pull", "--rebase", p_remote, p_branch)
        for remote, branch in mirrors:
            self._infra_git.call("push", "-f", remote, branch)

    def _push_source(self, mirrors: list[tuple[str, str]]) -> None:
        for remote, branch in mirrors:
            self._add_host_key(remote)
            self._source_git.call("push", remote, f"+master:{branch}")

    def _pick_primary(self, mirrors: list[tuple[str, str]]) -> tuple[str, str]:
        comment = Path("infra/keys/primary.pub").read_text().strip().split()[-1]
        for remote, branch in mirrors:
            if remote.startswith(comment):
                return remote, branch
        return mirrors[0]

    def _add_host_key(self, remote: str) -> None:
        host = remote.partition("@")[2].partition(":")[0]
        for line in KNOWN_HOSTS.open():
            if line.startswith(host):
                return
        keyscan = Command("ssh-keyscan", "-t", "ed25519")
        with KNOWN_HOSTS.open("at") as fobj:
            fobj.write(keyscan.check_output(host) + "\n")


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
        git = ["git", "--git-dir", GIT_DIR, "--work-tree", INFRA_DIR]

        subprocess.check_call(git + ["checkout", "-f", "master"])
        subprocess.check_call(git + ["add", "infra/challenges"])
        if subprocess.call(git + ["diff", "--cached", "--quiet"]) == 0:
            return 0
        subprocess.check_call(git + ["commit", "-m", "Add challenge"])

        if MIRRORS_LIST.exists():
            for line in MIRRORS_LIST.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                subprocess.check_call(
                    [
                        "runuser",
                        "-u",
                        "pages",
                        "--",
                        "git",
                        "--git-dir",
                        GIT_DIR,
                        "push",
                        line,
                        "master",
                    ],
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

        subprocess.run(
            [
                "git",
                "--git-dir",
                GIT_DIR,
                "--work-tree",
                INFRA_DIR,
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
                GIT_DIR,
                "--work-tree",
                INFRA_DIR,
                "add",
                "infra/challenges",
            ],
            check=True,
        )
        diff = subprocess.run(
            [
                "git",
                "--git-dir",
                GIT_DIR,
                "--work-tree",
                INFRA_DIR,
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
                GIT_DIR,
                "--work-tree",
                INFRA_DIR,
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
                        GIT_DIR,
                        "push",
                        line,
                        "master",
                    ],
                    check=True,
                )

        return 0


class DistributeCertsCommand:
    def __init__(self) -> None:
        self._live = Path("/etc/letsencrypt/live")

    def add_subparser(self, sub):
        p = sub.add_parser(
            "distribute-certs",
            help="Encrypt certs to mirrors and push infra branch",
        )
        p.add_argument("--domain", required=True)
        p.set_defaults(handle=self.handle)

    def handle(self, args):
        _ensure_root()

        domain = args.domain.strip()
        fullchain = self._live / domain / "fullchain.pem"
        privkey = self._live / domain / "privkey.pem"

        if not fullchain.exists():
            print(f"Missing fullchain at {fullchain}.")
            return 1
        if not privkey.exists():
            print(f"Missing privkey at {privkey}.")
            return 1

        recipients = []
        for pub in sorted(KEYS_DIR.glob("*.pub")):
            if pub.name not in ("primary.pub", "builder.pub"):
                recipients.append(pub.read_text(encoding="utf-8").strip())
        if not recipients:
            print(f"No recipients found in {KEYS_DIR}")
            return 1

        CERTS_DIR.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory() as tmpdir:
            tar_path = Path(tmpdir) / f"{domain}.tar.gz"
            with tarfile.open(tar_path, "w:gz") as tar:
                tar.add(fullchain, arcname="fullchain.pem")
                tar.add(privkey, arcname="privkey.pem")
            out_path = CERTS_DIR / f"{domain}.tar.age"
            age = Command("age", "--encrypt", "-o", out_path)
            for recipient in recipients:
                age = age.subcommand("-r", recipient)
            age(tar_path)

        git = Command(
            "git", "--git-dir", Path.home() / "infra.git", "--work-tree", INFRA_DIR
        )
        git("checkout", "-f", "master")
        git("add", "infra/certs")
        if git.call("diff", "--cached", "--quiet") == 0:
            return 0
        git("commit", "-m", "Update certs")
        push_infra = Command(
            "git", "--git-dir", Path.home() / "infra.git", "push"
        ).runuser("pages")
        for remote, _ in Mirror().non_primary():
            push_infra(remote, "master")
        return 0


def main(argv=None):
    parser = argparse.ArgumentParser(prog="infra")
    sub = parser.add_subparsers(dest="cmd", required=True)
    ApplyCommand().add_subparser(sub)
    BuilderPublishCommand().add_subparser(sub)
    DistributeChallengeCommand().add_subparser(sub)
    CleanupChallengeCommand().add_subparser(sub)
    DistributeCertsCommand().add_subparser(sub)

    args = parser.parse_args(argv)
    return args.handle(args)


if __name__ == "__main__":
    raise SystemExit(main())
