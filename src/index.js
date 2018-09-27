const base64js = require('base64-js')

// See README.md for more detauls on where these numbers and selections come from
const ALGORITHM = 'AES-GCM'
const DIGESTALGORITHM = 'SHA-256'
const IVSIZE = 12
const LENGTHOFKEY = 256

/**
 * (Internal) Converts the provided string to an Uint8Array.
 * @param {String} text
 * @returns {Uint8Array}
 */
const toUint8Array = text => {
  // Adapted from: http://qnimate.com/passphrase-based-encryption-using-web-cryptography-api/
  let array = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    array[i] = text.charCodeAt(i)
  }

  return array
}

/**
 * (Internal) Convests the provided Uint8Array to a string.
 * @param {Uint8Array} uint8Array
 * @returns {String}
 */
const toString = uint8Array => {
  // Adapted from: http://qnimate.com/passphrase-based-encryption-using-web-cryptography-api/
  let str = ''
  for (let i = 0; i < uint8Array.byteLength; i++) {
    str += String.fromCharCode(uint8Array[i])
  }

  return str
}

/**
 * (Internal) Generate a wrap/unwrap key using the SHA-256 hash of the provided passphrase.
 * @param {String} passphrase A text passphrase to hash in order to generate the key.
 * @param {String} base64PassphraseIV A base64 initiation vector used to generate the key.
 * @returns {Promise<CryptoKey>}
 */
const generateWrappingKey = async (passphrase, base64PassphraseIV) => {
  const passphraseUint8Array = toUint8Array(passphrase)
  const passphraseIVUint8Array = base64js.toByteArray(base64PassphraseIV)
  const wrapKeyAlgorithm = { name: ALGORITHM, iv: passphraseIVUint8Array }

  const passphraseHash = await crypto.subtle.digest(
    DIGESTALGORITHM,
    passphraseUint8Array
  )

  return crypto.subtle.importKey(
    'raw',
    passphraseHash,
    wrapKeyAlgorithm,
    false,
    ['wrapKey', 'unwrapKey']
  )
}

/**
 * (Internal) Generate a secure 96-bit initialization vector in Uint8Array format.
 * @returns {Promise<Uint8Array>}
 */
const generateIVUint8Array = async () => {
  return Promise.resolve(crypto.getRandomValues(new Uint8Array(IVSIZE)))
}

//
// Public API begins here
//

/**
 * Generate a secure 96-bit initialization vector and returns it as a base64 encoded string.
 * @returns {Promise<String>} Base64 encoded initialization vector (IV).
 */
const generateIV = async () => {
  const ivUint8Array = await generateIVUint8Array()

  return Promise.resolve(base64js.fromByteArray(ivUint8Array))
}

/**
 * Generates a new encryption/decryption key. You should use wrapKey before
 * storing the key anywhere and then unwrapKey when you need to use it.
 * @returns {Promise<CryptoKey>}
 */
const generateEncryptionDecryptionKey = async () => {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: LENGTHOFKEY },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Wrap (encode) the key using a key generated from the passphrase.
 * @param {String} passphrase Passphrase used to generate the key used to wrap the provided key.
 * @param {String} base64PassphraseIV Base64 encoded initialization vector used to generate the wrapping key.
 * @param {CryptoKey} keyToWrap Key to wrap so that it can be stored.
 * @returns {Promise<String>} Base64 encoded String (includes both iv and encrypted key data).
 */
const wrapKey = async (passphrase, base64PassphraseIV, keyToWrap) => {
  const wrappingKey = await generateWrappingKey(passphrase, base64PassphraseIV)

  const newIVUint8Array = await generateIVUint8Array()
  const wrappingAlgorithm = { name: ALGORITHM, iv: newIVUint8Array }
  const wrappedKey = await crypto.subtle.wrapKey(
    'raw',
    keyToWrap,
    wrappingKey,
    wrappingAlgorithm
  )

  // Convert from buffer to Uint8Array
  const wrappedKeyUint8Array = new Uint8Array(wrappedKey)
  // Create a single array that fits both the iv and the data
  const resultUint8Array = new Uint8Array(
    wrappedKeyUint8Array.length + newIVUint8Array.length
  )
  // Set the iv as the first part
  resultUint8Array.set(newIVUint8Array)
  // Set the remaining as the encrypted key
  resultUint8Array.set(wrappedKeyUint8Array, newIVUint8Array.length)

  return base64js.fromByteArray(resultUint8Array)
}

/**
 * Unwraps a previously wrapped key so that it can be used.
 * @param {String} passphrase Passphrase used to generate the key used to unwrap the provided wrapped key.
 * @param {String} base64PassphraseIV Base64 encoded initialization vector used to generate the unwrapping key.
 * @param {String} base64WrappedKey Base64 encoded String (includes both iv and encrypted key data).
 * @returns {Promise<CryptoKey>}
 */
const unwrapKey = async (passphrase, base64PassphraseIV, base64WrappedKey) => {
  const unwrappingKey = await generateWrappingKey(
    passphrase,
    base64PassphraseIV
  )

  // Convert the data from base64 to byte array
  const wrappedKeyUint8Array = base64js.toByteArray(base64WrappedKey)
  // Extract first elements which are the IV
  const wrappedKeyIVUint8Array = new Uint8Array(IVSIZE)
  wrappedKeyIVUint8Array.set(wrappedKeyUint8Array.slice(0, IVSIZE))
  // Extract the remaining elements containing the encrypted data
  const wrappedKeyContentUint8Array = new Uint8Array(
    wrappedKeyUint8Array.length - IVSIZE
  )
  wrappedKeyContentUint8Array.set(wrappedKeyUint8Array.slice(IVSIZE))

  const unwrappingAlgorithm = { name: ALGORITHM, iv: wrappedKeyIVUint8Array }

  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyContentUint8Array,
    unwrappingKey,
    unwrappingAlgorithm,
    {
      name: ALGORITHM,
      length: LENGTHOFKEY
    },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * This will call JSON.stringify, compress, and finally encrypt the provided dataObject.
 * @param {Object} dataObject Object to be encrypted.
 * @param {CryptoKey} encryptionDecryptionKey Key used to encrypt the object.
 * @returns {Promise<String>} Base64 encoded String (includes both iv and encrypted key data).
 */
const encrypt = async (dataObject, encryptionDecryptionKey) => {
  const newIVUint8Array = await generateIVUint8Array()
  const dataToEncryptUint8Array = toUint8Array(JSON.stringify(dataObject))
  const algorithm = { name: ALGORITHM, iv: newIVUint8Array }

  const encryptedDataArrayBuffer = await crypto.subtle.encrypt(
    algorithm,
    encryptionDecryptionKey,
    dataToEncryptUint8Array
  )

  // Convert ArrayBuffer to Uint8Array
  const encryptedDataUint8Array = new Uint8Array(encryptedDataArrayBuffer)
  // Create a single array that will contain both iv and encrypted data
  const resultUint8Array = new Uint8Array(
    encryptedDataUint8Array.length + newIVUint8Array.length
  )
  resultUint8Array.set(newIVUint8Array)
  resultUint8Array.set(encryptedDataUint8Array, newIVUint8Array.length)

  return base64js.fromByteArray(resultUint8Array)
}

/**
 * Call this on the result of an encrypt call in order to decrypt the object.
 * @param {String} base64EncryptedData Base64 encoded String (contains both the iv and the encrypted data).
 * @param {CryptoKey} encryptionDecryptionKey Key used to decrypt the object.
 * @returns {Promise<Object>} Decrypted object (decompressed and JSON.parse called to reverse encrypt process).
 */
const decrypt = async (base64EncryptedData, encryptionDecryptionKey) => {
  // Convert the data from base64 to byte array
  const encryptedDataUint8Array = base64js.toByteArray(base64EncryptedData)
  // Extract iv and encrypted data from the combined array
  const encryptedDataIVUint8Array = new Uint8Array(IVSIZE)
  encryptedDataIVUint8Array.set(encryptedDataUint8Array.slice(0, IVSIZE))
  const encryptedDataContentUint8Array = new Uint8Array(
    encryptedDataUint8Array.length - IVSIZE
  )
  encryptedDataContentUint8Array.set(encryptedDataUint8Array.slice(IVSIZE))

  const algorithm = { name: ALGORITHM, iv: encryptedDataIVUint8Array }

  const decryptedDataArrayBuffer = await crypto.subtle.decrypt(
    algorithm,
    encryptionDecryptionKey,
    encryptedDataContentUint8Array
  )

  const decryptedStringifiedObject = toString(
    new Uint8Array(decryptedDataArrayBuffer)
  )

  return JSON.parse(decryptedStringifiedObject)
}

module.exports = {
  encrypt,
  decrypt,
  generateIV,
  generateEncryptionDecryptionKey,
  wrapKey,
  unwrapKey
}
