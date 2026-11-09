#!/usr/bin/env python3
"""
Direct Cloudflare R2 S3-Compatible Upload Utility
Zero external dependencies - Uses standard Python library (hashlib, hmac, urllib).
"""

import sys
import os
import hmac
import hashlib
from datetime import datetime, timezone
import urllib.request
import urllib.error

def sign(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

def get_signature_key(key, date_stamp, region_name, service_name):
    k_date = sign(('AWS4' + key).encode('utf-8'), date_stamp)
    k_region = sign(k_date, region_name)
    k_service = sign(k_region, service_name)
    k_signing = sign(k_service, 'aws4_request')
    return k_signing

def upload_file_to_r2(file_path, bucket_name, object_key, content_type='application/json'):
    env_file = r'C:\projects\My-Files\cloudflare-r2.env'
    alt_env = r'C:\projects\My-Files\cloudflare.env'
    
    cfg = {}
    for p in [alt_env, env_file]:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        cfg[k.strip()] = v.strip()

    account_id = cfg.get('CF_ACCOUNT_ID') or cfg.get('CLOUDFLARE_ACCOUNT_ID')
    access_key = cfg.get('CF_R2_ACCESS_KEY_ID') or cfg.get('R2_ACCESS_KEY_ID')
    secret_key = cfg.get('CF_R2_SECRET_ACCESS_KEY') or cfg.get('R2_SECRET_ACCESS_KEY')

    if not access_key or not secret_key:
        print("[ERROR] Missing R2 S3 Credentials (CF_R2_ACCESS_KEY_ID and CF_R2_SECRET_ACCESS_KEY).")
        print("Please create an R2 API Token in Cloudflare: R2 -> Manage R2 API Tokens.")
        return False

    with open(file_path, 'rb') as f:
        payload = f.read()

    host = f'{account_id}.r2.cloudflarestorage.com'
    endpoint = f'https://{host}/{bucket_name}/{object_key}'
    region = 'auto'
    service = 's3'

    t = datetime.now(timezone.utc)
    amz_date = t.strftime('%Y%m%dT%H%M%SZ')
    date_stamp = t.strftime('%Y%m%d')

    payload_hash = hashlib.sha256(payload).hexdigest()

    canonical_uri = f'/{bucket_name}/{object_key}'
    canonical_querystring = ''
    canonical_headers = (
        f'content-type:{content_type}\n'
        f'host:{host}\n'
        f'x-amz-content-sha256:{payload_hash}\n'
        f'x-amz-date:{amz_date}\n'
    )
    signed_headers = 'content-type;host;x-amz-content-sha256;x-amz-date'

    canonical_request = (
        f'PUT\n'
        f'{canonical_uri}\n'
        f'{canonical_querystring}\n'
        f'{canonical_headers}\n'
        f'{signed_headers}\n'
        f'{payload_hash}'
    )

    algorithm = 'AWS4-HMAC-SHA256'
    credential_scope = f'{date_stamp}/{region}/{service}/aws4_request'
    string_to_sign = (
        f'{algorithm}\n'
        f'{amz_date}\n'
        f'{credential_scope}\n'
        f'{hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()}'
    )

    signing_key = get_signature_key(secret_key, date_stamp, region, service)
    signature = hmac.new(signing_key, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()

    auth_header = (
        f'{algorithm} '
        f'Credential={access_key}/{credential_scope}, '
        f'SignedHeaders={signed_headers}, '
        f'Signature={signature}'
    )

    headers = {
        'Host': host,
        'Content-Type': content_type,
        'x-amz-date': amz_date,
        'x-amz-content-sha256': payload_hash,
        'Authorization': auth_header,
        'Content-Length': str(len(payload))
    }

    print(f"Uploading {file_path} to https://{host}/{bucket_name}/{object_key}...")
    req = urllib.request.Request(endpoint, data=payload, headers=headers, method='PUT')
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"[SUCCESS] HTTP {resp.status} - Uploaded {object_key} successfully!")
            return True
    except urllib.error.HTTPError as e:
        print(f"[HTTP ERROR {e.code}] {e.read().decode('utf-8', errors='replace')}")
        return False
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else r'C:\projects\DodaZip\R2Bucket\latest.json'
    key = sys.argv[2] if len(sys.argv) > 2 else 'dodazip/latest.json'
    bucket = sys.argv[3] if len(sys.argv) > 3 else 'dodatech-updates'
    ctype = 'application/json' if src.endswith('.json') else 'application/octet-stream'
    
    upload_file_to_r2(src, bucket, key, ctype)
