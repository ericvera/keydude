const base64js = require('base64-js')

// NOTE: Recomended IV size in 96 bits (find source). In the case of a Uint8Array that is 12 elements.
const IVSIZE = 12
// NOTE: Using AES-GCM as it is recommended for security and perf
// Reference: https://en.wikipedia.org/wiki/Galois/Counter_Mode
// Reference: https://blog.cryptographyengineering.com/2012/05/19/how-to-choose-authenticated-encryption/
const ALGORITHM = 'AES-GCM'
const DIGESTALGORITHM = 'SHA-256'
const LENGTHOFKEY = 256

/**
 * (Internal) Convests the provided string to an Uint8Array
 * @param {String} text Text to convert
 * @returns {Uint8Array}
 */
const toUint8Array = text => {
  // Original from: http://qnimate.com/passphrase-based-encryption-using-web-cryptography-api/
  let array = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    array[i] = text.charCodeAt(i)
  }

  return array
}

/**
 * (Internal) Convests the provided Uint8Array to a string
 * @param {Uint8Array} uint8Array
 * @returns {String}
 */
const toString = uint8Array => {
  var str = ''
  for (var iii = 0; iii < uint8Array.byteLength; iii++) {
    str += String.fromCharCode(uint8Array[iii])
  }

  return str
}

/**
 * (Internal) Generate a wrap/unwrap key using the hash of the provided passphrase
 * @param {String} passphrase A text passphrase to hash in order to generate the key
 * @param {String} base64PassphraseIV A base64 initiation vector used to generate the key
 * @returns {Promise<CryptoKey>}
 */
const generateWrappingKey = async (passphrase, base64PassphraseIV) => {
  const passphraseBuffer = toUint8Array(passphrase)
  const passphraseIVByteArray = base64js.toByteArray(base64PassphraseIV)
  const algorithm = { name: ALGORITHM, iv: passphraseIVByteArray }

  const passphraseHash = await crypto.subtle.digest(
    DIGESTALGORITHM,
    passphraseBuffer
  )

  let wrappingKey

  wrappingKey = await crypto.subtle.importKey(
    'raw',
    passphraseHash,
    algorithm,
    false,
    ['wrapKey', 'unwrapKey']
  )

  return wrappingKey
}

/**
 * (Internal) Generate a secure 96-bit initialization vector in Uint8Array format
 * @returns {Promise<Uint8Array>}
 */
const generateRawIV = async () => {
  return Promise.resolve(crypto.getRandomValues(new Uint8Array(IVSIZE)))
}

//
// Public API begins here
//

/**
 * Generate a secure 96-bit initialization vector and returns it as a base64 encoded string.
 * @returns {Promise<String>} base64 encoded IV
 */
const generateIV = async () => {
  const iv = await generateRawIV()

  return Promise.resolve(base64js.fromByteArray(iv))
}

/**
 * Generates a new encryption/decryption key. You should use wrapKey before
 * storing the key anywhere and then unwrap key when you need to use it.
 * @returns {CryptoKey}
 */
const generateEncryptionDecryptionKey = async () => {
  // Generate a new key for encryption/decryption
  const newKey = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: LENGTHOFKEY },
    true,
    ['encrypt', 'decrypt']
  )

  // Return the generated key
  return newKey
}

/**
 * Wrap (encode) the key using a key generated from the passphrase.
 * @param {String} passphrase passphrase used to generate the key used to wrap the provided key
 * @param {String} base64PassphraseIV base64 encoded initiation vector used to generate the wrapping key
 * @param {CryptoKey} keyToWrap key to wrap so that it can be stored
 * @returns {Promise<String>} Base64 encoded String (first 16 characters are the iv, the remaining the encrypted key)
 */
const wrapKey = async (passphrase, base64PassphraseIV, keyToWrap) => {
  const wrappingKey = await generateWrappingKey(passphrase, base64PassphraseIV)

  // Wrap the key
  const iv = await generateRawIV()
  const wrappingAlgorithm = { name: ALGORITHM, iv }
  const wrappedKey = await crypto.subtle.wrapKey(
    'raw',
    keyToWrap,
    wrappingKey,
    wrappingAlgorithm
  )

  // Convert to base64 for easy storage
  const wrappedKeyArr = new Uint8Array(wrappedKey)
  const concatenatedArr = new Uint8Array(wrappedKeyArr.length + iv.length)
  concatenatedArr.set(iv)
  concatenatedArr.set(wrappedKeyArr, iv.length)

  return base64js.fromByteArray(concatenatedArr)
}

/**
 * Unwraps a previously wrapped key so that it can be used.
 * @param {String} passphrase passphrase used to generate the key used to unwrap the provided wrapped key
 * @param {String} base64PassphraseIV base64 encoded initiation vector used to generate the unwrapping key
 * @param {String} wrappedKey Base64 encoded String (first 16 characters are the iv, the remaining the encrypted key)
 * @returns {CryptoKey}
 */
const unwrapKey = async (passphrase, base64PassphraseIV, wrappedKey) => {
  const unwrappingKey = await generateWrappingKey(
    passphrase,
    base64PassphraseIV
  )

  // Convert the data from base64 to byte array
  const rawData = base64js.toByteArray(wrappedKey)
  const encryptedDataIv = new Uint8Array(IVSIZE)
  encryptedDataIv.set(rawData.slice(0, IVSIZE))
  const wrappedKeyContent = new Uint8Array(rawData.length - IVSIZE)
  wrappedKeyContent.set(rawData.slice(IVSIZE))

  const unwrappingAlgorithm = { name: ALGORITHM, iv: encryptedDataIv }

  const unwrappedKey = await crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyContent,
    unwrappingKey,
    unwrappingAlgorithm,
    {
      name: ALGORITHM,
      length: LENGTHOFKEY
    },
    false,
    ['encrypt', 'decrypt']
  )

  // Return the wrapped key
  return unwrappedKey
}

/**
 * This will JSON.stringify, compress, and finally encrypt the provided object.
 * @param {Object} dataObject Object to be encrypted
 * @param {CryptoKey} encryptionDecryptionKey Key used to encrypt the object
 * @returns {Promise<String>} Base64 encoded String. The first 16 characters are the iv. The remaining the data.
 */
const encrypt = async (dataObject, encryptionDecryptionKey) => {
  // Source : https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt

  // Generate a new IV
  const iv = await generateRawIV()

  // Stringify and compressthe dataObject
  const arrayBufferToEncrypt = toUint8Array(JSON.stringify(dataObject))

  // Define algorithm
  // NOTE: Use AES-GCM based on recommendations at https://en.wikipedia.org/wiki/Galois/Counter_Mode
  const algorithm = { name: ALGORITHM, iv }

  // Encrypt
  const dataBuffer = await crypto.subtle.encrypt(
    algorithm,
    encryptionDecryptionKey,
    arrayBufferToEncrypt
  )

  // Convert to base64 for easy storage
  const dataArr = new Uint8Array(dataBuffer)
  const concatenatedArr = new Uint8Array(dataArr.length + iv.length)
  concatenatedArr.set(iv)
  concatenatedArr.set(dataArr, iv.length)

  return base64js.fromByteArray(concatenatedArr)
}

/**
 * Call this on the result of an encrypt call in order to decrypt the object.
 * @param {String} encryptedData Base64 encoded String (first 16 characters are the iv, the remaining the data)
 * @param {CryptoKey} encryptionDecryptionKey Key used to decrypt the object
 * @returns {Object} Decrypted object (decompressed and JSON.parse called to reverse encrypt process)
 */
const decrypt = async (encryptedData, encryptionDecryptionKey) => {
  // Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/decrypt

  // Convert the data from base64 to byte array
  const rawData = base64js.toByteArray(encryptedData)
  const encryptedDataIv = new Uint8Array(IVSIZE)
  encryptedDataIv.set(rawData.slice(0, IVSIZE))
  const encryptedDataContent = new Uint8Array(rawData.length - IVSIZE)
  encryptedDataContent.set(rawData.slice(IVSIZE))

  // Define algorithm
  // NOTE: User AES-GCM based on recommendations at https://en.wikipedia.org/wiki/Galois/Counter_Mode
  const algorithm = { name: ALGORITHM, iv: encryptedDataIv }

  // Decrypt
  const decryptedData = await crypto.subtle.decrypt(
    algorithm,
    encryptionDecryptionKey,
    encryptedDataContent
  )

  // Convert to string
  const decryptedStringifiedObject = toString(new Uint8Array(decryptedData))

  // Convert from stringified back to JSON object
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
