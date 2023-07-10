from __future__ import print_function

import io
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
CACHE_FILE_NAME = 'drive.cache'
RE_JOHNNY_DECIMAL = re.compile(r'\[(\d{2}).(\d{2})\][ -]*(.+)')
RE_PUNCT = re.compile('[{} ]+'.format(re.escape(string.punctuation)))


def shelve_it(func):
    key = func.__name__
    def new_func(*args, **kwargs):
        with shelve.open(CACHE_FILE_NAME) as persistent_dictionary:
            if key not in persistent_dictionary:
                persistent_dictionary[key] = func(*args, **kwargs)
            return persistent_dictionary[key]

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


def authenticate():
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    else:
        creds = None
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return creds


class DriveClient:
    def __init__(self, creds) -> None:
        self._service = build('drive', 'v3', credentials=creds)

    @shelve_it
    def iter_files(self) -> List[DriveFile]:
        """Iterates names and ids of the first 100 files the user has access to."""
        results = self._service.files().list(
            pageSize=100,
            fields="nextPageToken, files(id, name)"
        ).execute()
        items = results.get('files', [])
        return [
            DriveFile(drive_id=item['id'], name=item['name'])  # , md5=item['md5Checksum'])
            for item in items
        ]

    def download_doc(self, drive_file_id: str, mime_type='application/rtf') -> bytes:
        return self._service.files().export(fileId=drive_file_id, mimeType=mime_type).execute()


def iter_johnny_decimal_files(drive_client: DriveClient) -> List[DriveFile]:
    return [
        drive_file
        for drive_file in drive_client.iter_files()
        if JohnnyDecimal.is_valid(drive_file.name)
    ]


def sync_johnny_decimal_drive_files():
    drive_client = DriveClient(authenticate())
    for drive_file in iter_johnny_decimal_files(drive_client):
        jd = JohnnyDecimal.parse(drive_file.name)
        target_path = jd.fit_path('../source') + '.rst'
        print(f'{drive_file.drive_id} {drive_file.name} {target_path}')  #  ({drive_file.md5})')
        rst_content = convert_rtf_to_rst(drive_client.download_doc(drive_file.drive_id))
        with open(target_path, 'wt') as f_target:
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


def download_file(real_file_id):
    """Downloads a file
    Args:
        real_file_id: ID of the file to download
    Returns : IO object with location.

    Load pre-authorized user credentials from the environment.
    TODO(developer) - See https://developers.google.com/identity
    for guides on implementing OAuth2 for the application.
    """
    creds, _ = google.auth.default()

    try:
        # create drive api client
        service = build('drive', 'v3', credentials=creds)

        file_id = real_file_id

        # pylint: disable=maybe-no-member
        request = service.files().get_media(fileId=file_id)
        file = io.BytesIO()
        downloader = MediaIoBaseDownload(file, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            print(F'Download {int(status.progress() * 100)}.')

    except HttpError as error:
        print(F'An error occurred: {error}')
        file = None

    return file.getvalue()


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
    # download_file(real_file_id='1KuPmvGq8yoYgbfW74OENMCB5H0n_2Jm9')
