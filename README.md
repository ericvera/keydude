# keydude

[![github license](https://img.shields.io/github/license/ericvera/keydude.svg?style=flat-square)](https://github.com/ericvera/keydude/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/keydude.svg?style=flat-square)](https://npmjs.org/package/keydude)
[![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg?style=flat-square)](https://github.com/facebook/jest)

Simplified and opinionated crypto library (wraps the Web Crypto API)

## Why keydude?

This cryptography thing is a pain to figure out and easy to get wrong. The library was built to implement symmetric end-to-end encryption in a web app.

- `SHA-256` for password hashing
- `AES-GCM` for wrapping and encryption
- `Base64` as the output

## The basics

DISCLAIMER: This is a high level explanation to get you started and not meant to be a replacement for security training.

In a simplistic way, symmetric encryption is when you use the same key for both encryption and decryption. As opposed to asymmetric encryption where you have a public key that anybody can see to encrypt the data and a private key that you have to keep secret to decrypt the data. Symmetric encryption is better for when you will be both encrypting and decrypting your own data and asymmetric is better when you are sending/receiving the data between different people.

### Key management

For symmetric encryption you need a key. You can generate this key using `keydude.generateEncryptionDecryptionKey()`. You want to keep this key secret. You also want to make it so that if somebody gets access to it they can't just use it to decode your data. For this you 'wrap' the key. This is the equivalent of putting a physical key inside a safe box with password. For this you use `keydude.wrapKey()`.

Wrapping a key requires two things, a passphrase and an initialization vector (IV). The passphrase is easy to understand, you can generate one for each user (you are still able to decode the data if you really wanted to) or you can let the user provide it in the client and not store it anywhere if you want the user data to be completely inaccessible to you. The initialization vector sounds fancy, but it is just an array of cryptographicaly random bytes used to make the encryption more secure.

OK that may require a bit more of explaining. The AES-GCM algorithm is a block-cypher which is fancy speak for 'it encrypts blocks of data a predetermined size at a time'. So if you had repeating blocks encrypted with the same key they would look the same. The initialization vector provided with each encrypting is used by the algorithm to prevent these blocks from being the same.

You can generate the IV using `keydude.generateIV()` which returns a base64 encoded IV. You will have to generate one and store it as you will have to provide it every time you wrap and unwrap your encryption/decryption key.

In summary you, generate a new key for a user with `keydude.generateEncryptionDecryptionKey()`, generate an IV using `keydude.generateIV()`, then wrap that key with `keydude.wrapKey('somepassword', <generated IV>, <generated key>)`. You can store the generated IV and the wrapped key in the database. When you need to use the key to encrypt/decrypt just use `keydude.unwrapKey('somepassword', <generated IV>, <wrapped key>)`. Finally, for convenience, if you are in a trusted client, once the user provides the passphrase and you download and unwrap the key you can re-wrap it and store it locally using some other passphrase so that the user does not have to keep entering the password. This could be using a PIN or some piece of user data like a user id.

### Encryption and decryption

After key management, this part is going to look very easy. Using the key that you extracted from `keydude.unwrapKey()` you can encrypt your data using `keydude.encrypt(<data object>, <unwrapped key>)`. This will return a single base64 encoded string containing both a new initialization vector (you have to generate a new one for every encryption/decryption for the algorithm to be secure) and the encrypted data. You can safely store this in you database or local storage.

Whenever you want to access this information again just call `keydude.decrypt(<encrypted data generated with keydude.encrypt()>, <unwrapped key>)`.

## Usage

### Install module

`npm install --save keydude`

`yarn add keydude`

### In browser

`<script crossorigin src="https://unpkg.com/keydude@1/dist/keydude.js"></script>`

### Sample

All functions return a Promise. Using async/await here because it is easier to read.

```javascript
import keydude from 'keydude'

// This should come from the user or something else
// like a user id (if storing localy) different for every user
const passphrase = 'my-C0mpl3x-p@ssKe7!$s.'

const newKey = await keydude.generateEncryptionDecryptionKey()

const keyWrappingIV = await keydude.generateIV()
// sample: 'T0IsmW6JljSCU1jC'

const wrappedKey = await keydude.wrapKey(passphrase, passphraseIV, key)
// sample: 'oc7/LI1u7tTPGuOZm3oOC20ztbEOTU0Dgp7I5QJPawXGMv44mNqJLIgZ9VNVVgpVbZBUJGpFr7GLJDu5',

// ...store keyWrappingIV and wrappedKey somewhere
// as you will need to unwrap the key in every
// session

const unwrappedKey = await keydude.unwrapKey(
  passphrase,
  keyWrappingIV,
  wrappedKey
)

const encryptedData = await keydude.encrypt(
  { id: 'someid', other: Date.parse('2025-02-06') },
  unwrappedKey
)
// sample: 'VL3RX4U9b55Y6OyTV2/3ifKeNS7/wgnr9ZXiiajADL8bHVu8dyZj9RjzA/Vi4z1M0L0wQ5nV84NHG+FHzrzB9BqghEhpqmzwbQ=='

const decryptedData = await keydude.decrypt(encryptedData, unwrappedKey)
// sample: { id: 'someid', other: Date.parse('2025-02-06') }
```

## Functions

| Function                                                      | Description                                                                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateEncryptionDecryptionKey()`                           | Generates a new encryption/decryption key. You should use wrapKey before storing the key anywhere and then unwrapKey when you need to use it. |
| `generateIV()`                                                | Generate a secure 96-bit initialization vector and returns it as a base64 encoded string.                                                     |
| `wrapKey(passphrase, base64PassphraseIV, keyToWrap)`          | Wrap (encode) the key using a key generated from the passphrase.                                                                              |
| `unwrapKey(passphrase, base64PassphraseIV, wrappedKeyObject)` | Unwraps a previously wrapped key so that it can be used.                                                                                      |
| `encrypt(dataObject, encryptionDecryptionKey)`                | This will call JSON.stringify, compress, and finally encrypt the provided dataObject.                                                         |
| `decrypt(encryptedDataObject, encryptionDecryptionKey)`       | Call this on the result of an encrypt call in order to decrypt the object.                                                                    |

## Opinionated

### AES-GCM

AES-GCM is used as the algorithm for encryption and decryption as well as wrapping and unwrapping keys.

After hours of research I found that many articles point to AES-GCM as the algorithm that strikes the best balance of security and performance. Here are a couple of quotes from the wikipedia article on

> "Galois/Counter Mode (GCM) is a mode of operation for symmetric key cryptographic block ciphers that has been widely adopted because of its efficiency and performance."

> "GCM mode is used in the IEEE 802.1AE (MACsec) Ethernet security, IEEE 802.11ad (also known as WiGig), ANSI (INCITS) Fibre Channel Security Protocols (FC-SP), IEEE P1619.1 tape storage, IETF IPsec standards,[4][5] SSH[6] and TLS 1.2.[7][8] AES-GCM is included in the NSA Suite B Cryptography. GCM mode is used in the SoftEther VPN server and client,[9] as well as OpenVPN since version 2.4."

> _from [Wikipedia article](https://en.wikipedia.org/wiki/Galois/Counter_Mode)_

### base64 encoding

The output of all data that is meant to be stored (everything except the generated keys) is encoded in base64. While this encoding increases the size of the data, it significantly simplifies moving the data around as it uses web safe characters. This means that it is easy to store the data as string in local storage options as well as NoSQL databases as string.

### SHA-256

The key used to wrap/unwrap the encryption/decryption keys is generated from a passphrase. A SHA-256 hash is generated from the password which is then used to generate a 256-bit key.

### 96-bit initialization vector

I was not able to find a reliable source with recommendations for iv length. What I did find was a lot of recommendations to use 96-bits with no documented source. The closest I could find was the following quote from a [NIST report](https://www.nist.gov/).

> "The default length of the IV is 96 bits,[...]"

> from [Authentication Failures in NIST version of GCM](https://csrc.nist.gov/csrc/media/projects/block-cipher-techniques/documents/bcm/joux_comments.pdf)
