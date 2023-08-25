# Why you should check your secrets into Git

Talk: <https://youtu.be/bwpoo2bJWaQ>

## Notes

- Common setup recommended by 12 factor app does not improve security posture over just storing secrets in Git.
- Using Key Management System (AWS KMS) does though. The secret is decrypted in production, and doesn't enter CI/CD pipeline.
- There's still many attach points. The next improvement is using assymetric cryptography instead of secret tokens.
- The good way to apply it (from security standpoint) is bring your own key (BYOK):
    - API Client generates private key.
    - Uploads public key to API service provider.
    - Client signs requests with JWT using private key.
    - Service verifies the signature using public key.
    - API service can not leak the secret because they don't have it.
    - Secret key never sent over public network.
    - Client has complete control over the whole life cycle of the secret.
- The next improvement is to generate the private key right in the production runtime.
    - Client generates private key and *exports* public key.
    - Client signs JWT requests with the private key.
    - Server *uses* the public key for the client and verifies the signature.
    - One option is to have an engineer enter the public key in Server's UI manually.
    - Another is to have server fetch it through an API exposed by the Client.
- The final improvement is hardware security module (HSM) that generate public keys and sign challenges.

## Conclusion

- Author is using the approach of minimizing the attack vector by eliminating the components that have access to credentials.
- The first thing to eliminate runtime intermediaries: environment variables and associated control plane.
- The next is to use cloud service provided Key Management Service directly from production runtime.
- The significant complexity leap, providing the best security, is BYOK with private key generated right inside of the production runtime.
