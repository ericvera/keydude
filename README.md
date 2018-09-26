# keydude

[![github license](https://img.shields.io/github/license/ericvera/keydude.svg?style=flat-square)](https://github.com/ericvera/keydude/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/keydude.svg?style=flat-square)](https://npmjs.org/package/keydude)
[![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg?style=flat-square)](https://github.com/facebook/jest)

Simplified and opinionated crypto library (wraps the Web Crypto API)

# Why keydude?

This cryptography thing is hard to figure out and easy to get wrong. Keydude is optimized for ease of use while. Encryption algorithms and pre-selected for you and so is the output encoding. For more details on the selected options see the 'Opinionated' section at the end.

# Usage

## Install module

`npm install --save keydude`

`yarn add keydude`

## Use in browser

`<script crossorigin src="https://unpkg.com/keydude@1/dist/keydude.js"></script>`

## Sample

```javascript
// Needed is you use through yarn/npm
const keydude = require('keydude')

const passphrase = 'my-C0mpl3x-p@ssKe7!$s.'
```

### Generate a key and wrap it so that it can be stored

```javascript
// Note: you will need to store both the wrappedKey
// and the passphraseIV
keydude.generateEncryptionDecryptionKey().then(key => {
  keydude.generateIV().then(passphraseIV => {
    // Store the passphraseIV
    keydude.wrapKey(passphrase, passphraseIV, key).then(wrappedKey => {
      // Store this wrapped key
    })
  })
})
```

### Unwrap the key so that it can be used for encryption/decryption

```javascript
// Note: this key is not to be stored without wrapping
// Both the passphrase and the passphraseIV must be the
// ones use with wrapKey
keydude.unwrapKey(passphrase, passphraseIV, wrappedKey).then(unwrappedkey => {
  // unwrappedKey can now be used to encrypt/decrypt
})
```

### Encrypt some data

```javascript
keydude
  .encrypt({ id: 'someid', other: Date.parse('2018-02-06') }, unwrappedKey)
  .then(encryptedData => {
    // encryptedData is an object contianing two preperties ed
    // (encrypted data) and iv (initialization vector). They
    // are both base64 encrypted.
  })
```

### Decrypt data

```javascript
keydude.decrypt(encryptedData, unwrappedKey).then(decryptedObject => {
  // decryptedObject is the original object that was encrypted.
})
```

# Functions

| Function                                                      | Description                                                                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateEncryptionDecryptionKey()`                           | Generates a new encryption/decryption key. You should use wrapKey before storing the key anywhere and then unwrap key when you need to use it. |
| `generateIV()`                                                | Generate a secure 96-bit initialization vector and returns it as a base64 encoded string.                                                      |
| `wrapKey(passphrase, base64PassphraseIV, keyToWrap)`          | Wrap (encode) the key using a key generated from the passphrase.                                                                               |
| `unwrapKey(passphrase, base64PassphraseIV, wrappedKeyObject)` | Unwraps a previously wrapped key so that it can be used.                                                                                       |
| `encrypt(dataObject, encryptionDecryptionKey)`                | This will JSON.stringify, compress, and finally encrypt the provided object.                                                                   |
| `decrypt(encryptedDataObject, encryptionDecryptionKey)`       | Call this on the result of an encrypt call in order to decrypt the object.                                                                     |

# Opinionated

## AES-GCM

AES-GCM is used as the algorithm for encryption and decryption as well as wrapping and unwrapping keys.

After hours of research I found that many articles point to AES-GCM as the algorithm that strikes the best balance of security and performance. Here are a couple of quotes from the wikipedia article on

> "Galois/Counter Mode (GCM) is a mode of operation for symmetric key cryptographic block ciphers that has been widely adopted because of its efficiency and performance."

> "GCM mode is used in the IEEE 802.1AE (MACsec) Ethernet security, IEEE 802.11ad (also known as WiGig), ANSI (INCITS) Fibre Channel Security Protocols (FC-SP), IEEE P1619.1 tape storage, IETF IPsec standards,[4][5] SSH[6] and TLS 1.2.[7][8] AES-GCM is included in the NSA Suite B Cryptography. GCM mode is used in the SoftEther VPN server and client,[9] as well as OpenVPN since version 2.4."

> _from [Wikipedia article](https://en.wikipedia.org/wiki/Galois/Counter_Mode)_

## base64 encoding

The output of all data that is meant to be stored (everything except the generated keys) is encoded in base64. While this encoding increases the size of the data, it significantly simplifies moving the data around as it uses web safe characters. This means that it is easy to store the data as string in local storage options as well as NoSQL databases as string.

## SHA-256

The key used to wrap/unwrap the encryption/decryption keys is generated from a passphrase. A SHA-256 hash is generated from the password which is then used to generate a 256-bit key.

## 96-bit initialization vector

I was not able to find a reliable source with recommendations for iv length. What I did find was a lot of recommendations to use 96-bits with no documented source. The closest I could find was the following quote from a [NIST report](https://www.nist.gov/).

> "The default length of the IV is 96 bits,[...]"

> from [Authentication Failures in NIST version of GCM](https://csrc.nist.gov/csrc/media/projects/block-cipher-techniques/documents/bcm/joux_comments.pdf)
