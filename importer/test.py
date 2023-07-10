import json
import io
import contextlib
import os.path
import glob
import re
import shelve
import tempfile
from dataclasses import dataclass
from typing import List
import string

import google.auth
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload

# If modifying these scopes, delete the file token.json.
SCOPES = [
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
]
HERE = os.path.dirname(__file__)
CACHE_FILE_NAME = os.path.expanduser('~/.docs_import_cache')
RE_JOHNNY_DECIMAL = re.compile(r'\[(\d{2}).(\d{2})\][ -]*(.+)')
RE_PUNCT = re.compile('[{} ]+'.format(re.escape(string.punctuation)))


class ShelveCache:
    def __init__(self, cache_file_name: str) -> None:
        self._cache_file_name = cache_file_name

    @contextlib.contextmanager
    def session(self):
        with shelve.open(CACHE_FILE_NAME) as persistent_dictionary:
            yield persistent_dictionary

    def wrap_callable(self, key, source_callback):
        with self.session() as persistent_dictionary:
            if key not in persistent_dictionary:
                persistent_dictionary[key] = source_callback()
            return persistent_dictionary[key]


def shelve_it(func):
    cache = ShelveCache(CACHE_FILE_NAME)
    def new_func(*args, **kwargs):
        return cache.wrap_callable(func.__name__, lambda: func(*args, **kwargs))
    return new_func


@dataclass
class DriveFile:
    drive_id: str
    name: str
    md5: str = ''


@dataclass
class JohnnyDecimal:
    SLUG_DELIMITER = '-'

    category: str
    index: str
    name: str

    @classmethod
    def parse(cls, name: str) -> 'JohnnyDecimal':
        match_obj = RE_JOHNNY_DECIMAL.match(name)
        groups = match_obj.groups()
        return cls(
            category=groups[0],
            index=groups[1],
            name=groups[2],
        )

    @staticmethod
    def is_valid(name: str) -> bool:
        return bool(RE_JOHNNY_DECIMAL.match(name))

    def fit_path(self, base_dir: str) -> str:
        parent_dir_expr = os.path.join(base_dir, f'{self.category}*')
        parent_dir_candidates = glob.glob(parent_dir_expr)
        if len(parent_dir_candidates) == 1:
            parent_dir = parent_dir_candidates[0]
            return os.path.join(parent_dir, f'{self.index}{self.SLUG_DELIMITER}{self.slug}')
        raise ValueError(
            f'Could not find unambiguous fit for {parent_dir_expr}. '
            f'Candidates: {parent_dir_candidates}'
        )

    @property
    def slug(self) -> str:
        return RE_PUNCT.sub(self.SLUG_DELIMITER, self.name).lower()


class GoogleAuth:
    _CREDENTIALS_PATH = os.path.expanduser('~/.gcp/credentials.json')

    def __init__(self, cache: ShelveCache) -> None:
        self._cache = cache

    def get_credentials(self) -> Credentials:
        # The file token.json stores the user's access and refresh tokens, and is
        # created automatically when the authorization flow completes for the first
        # time.
        with self._cache.session() as cache:
            if token := cache.get('token'):
                creds = Credentials.from_authorized_user_info(token, SCOPES)
            else:
                creds = None
            # If there are no (valid) credentials available, let the user log in.
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    flow = InstalledAppFlow.from_client_secrets_file(self._CREDENTIALS_PATH, SCOPES)
                    creds = flow.run_local_server(port=0)
                # Save the credentials for the next run
                cache['token'] = json.loads(creds.to_json())
            return creds


class DriveClient:
    def __init__(self, creds) -> None:
        self._service = build('drive', 'v3', credentials=creds)

    def list_files(self) -> List[DriveFile]:
        """Iterates names and ids of the first 100 files the user has access to."""
        return [
            DriveFile(drive_id=item['id'], name=item['name'])
            for item in self._service.files().list(
                pageSize=100,
                fields="nextPageToken, files(id, name)"
            ).execute().get('files', [])
        ]

    def download_doc(self, drive_file_id: str, mime_type='application/rtf') -> bytes:
        return self._service.files().export(fileId=drive_file_id, mimeType=mime_type).execute()


def iter_johnny_decimal_files(drive_client: DriveClient) -> List[DriveFile]:
    return [
        drive_file
        for drive_file in cache.wrap_callable('files', drive_client.list_files)
        if JohnnyDecimal.is_valid(drive_file.name)
    ]


def sync_johnny_decimal_drive_files():
    cache = ShelveCache(CACHE_FILE_NAME)
    drive_client = DriveClient(GoogleAuth(cache).get_credentials())
    for drive_file in cache.wrap_callable('files', drive_client.list_files):
        if not JohnnyDecimal.is_valid(drive_file.name):
            continue
        jd = JohnnyDecimal.parse(drive_file.name)
        target_path = jd.fit_path('source') + '.rst'
        print(f'Syncing {drive_file.name} to {target_path}')
        rst_content = convert_rtf_to_rst(drive_client.download_doc(drive_file.drive_id))
        with open(target_path, 'wt', encoding='utf-8') as f_target:
            f_target.write(f'{jd.name}\n{"=" * len(jd.name)}\n\n')
            f_target.write(rst_content)


def convert_rtf_to_rst(rtf_bytes: bytes) -> str:
    with tempfile.TemporaryDirectory() as temp_dir:
        source_name = os.path.join(temp_dir, 'source.rtf')
        target_name = os.path.join(temp_dir, 'target.rst')
        with open(source_name, 'wb') as f_in:
            f_in.write(rtf_bytes)
        os.system(f'pandoc -s {source_name} -o {target_name}')
        with open(target_name, 'rt') as f_out:
            return f_out.read()


def test_johnny_decimal_regex():
    positive = RE_JOHNNY_DECIMAL.match('[12.34] - Name')
    assert positive.groups() == ('12', '34', 'Name')
    positive = RE_JOHNNY_DECIMAL.match('[12.34] Name')
    assert positive.groups() == ('12', '34', 'Name')
    negative = RE_JOHNNY_DECIMAL.match('07/20 - Birthday')
    assert negative is None


def test_punctuation_regex():
    result = RE_PUNCT.findall('Hello, {[world]}!')
    assert result == [', {[', ']}!'], result


if __name__ == '__main__':
    test_johnny_decimal_regex()
    test_punctuation_regex()
    sync_johnny_decimal_drive_files()
