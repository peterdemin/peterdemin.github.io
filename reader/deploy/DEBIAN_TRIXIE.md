# Debian Trixie deploy (nginx + systemd socket activation)

## 1. Build and install binary

```bash
cd /path/to/reader
go build -o reader .
sudo install -o root -g root -m 0755 reader /usr/local/bin/reader
```

## 2. Install systemd units

```bash
sudo cp deploy/systemd/reader.socket /etc/systemd/system/reader.socket
sudo cp deploy/systemd/reader.service /etc/systemd/system/reader.service
sudo systemctl daemon-reload
sudo systemctl enable --now reader.socket
```

Do not enable `reader.service`; the socket unit starts it on demand.

## 3. Install nginx site

```bash
sudo cp deploy/nginx/reader.conf /etc/nginx/sites-available/reader.conf
sudo ln -s /etc/nginx/sites-available/reader.conf /etc/nginx/sites-enabled/reader.conf
sudo nginx -t
sudo systemctl reload nginx
```

Update `server_name` in `deploy/nginx/reader.conf` before copying.

## 4. Test

```bash
curl "http://reader.example.com/?url=https://example.com"
```

Observe activation lifecycle:

```bash
systemctl status reader.socket
journalctl -u reader.service -n 50 --no-pager
```

Each request should activate `/usr/local/bin/reader`, then the process exits after serving one response.
