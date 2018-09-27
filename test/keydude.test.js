const fs = require('fs')

describe('Keydude', () => {
  beforeAll(async () => {
    // NOTE: Required ot navigate to a file. `window.crypto.subtle` is not available in 'new tab' context.
    await page.goto('file:///dev/null')

    // Load scripts into browser context
    await page.addScriptTag({
      content: `${fs.readFileSync('./dist/keydude.js')}`
    })
    await page.addScriptTag({
      content: `${fs.readFileSync('./test/testdata.js')}`
    })
    await page.on('console', msg => {
      for (let i = 0; i < msg.args().length; ++i)
        console.log(`${i}: ${msg.args()[i]}`)
    })
  })

  it('should generate an initiation vector', async () => {
    const iv = await page.evaluate(async () => {
      return keydude.generateIV()
    })

    expect(iv).toHaveLength(16)
  })

  it('should generate a new key', async () => {
    const key = await page.evaluate(async () => {
      return keydude.generateEncryptionDecryptionKey()
    })

    expect(typeof key).toEqual('object')
  })

  it('should be able to wrap a key', async () => {
    const wrappedKey = await page.evaluate(async () => {
      const key = await keydude.generateEncryptionDecryptionKey()
      const iv = await keydude.generateIV()
      return keydude.wrapKey(TestData.passphrase, iv, key)
    })

    expect(typeof wrappedKey).toEqual('object')
    // base64 strings have length that is a multiple of 4
    expect(wrappedKey.k.length % 4).toBe(0)
    expect(wrappedKey.iv).toHaveLength(16)
  })

  it('should be able to unwrap a key', async () => {
    const unwrappedKey = await page.evaluate(async () => {
      return keydude.unwrapKey(
        TestData.passphrase,
        TestData.passphraseIV,
        TestData.wrappedKey
      )
    })

    expect(typeof unwrappedKey).toEqual('object')
  })

  it('should be able to encrypt an object', async () => {
    const encryptedData = await page.evaluate(async () => {
      const unwrappedKey = await keydude.unwrapKey(
        TestData.passphrase,
        TestData.passphraseIV,
        TestData.wrappedKey
      )

      return keydude.encrypt(TestData.objectToEncrypt, unwrappedKey)
    })

    expect(typeof encryptedData).toEqual('string')
    // base64 strings have length that is a multiple of 4
    expect(encryptedData.length % 4).toBe(0)
  })

  it('should be able to decrypt an encrypted object', async () => {
    const expectedObject = await page.evaluate(async () => {
      return TestData.objectToEncrypt
    })

    const decryptedData = await page.evaluate(async () => {
      const unwrappedKey = await keydude.unwrapKey(
        TestData.passphrase,
        TestData.passphraseIV,
        TestData.wrappedKey
      )

      return keydude.decrypt(TestData.encryptedData, unwrappedKey)
    })

    expect(typeof decryptedData).toEqual('object')
    expect(decryptedData).toEqual(expectedObject)
  })
})
