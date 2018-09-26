const fs = require('fs')

jest.setTimeout(30000)

describe('Keydude size', () => {
  beforeAll(async () => {
    // NOTE: Required ot navigate to a file. `window.crypto.subtle` is not available in 'new tab' context.
    await page.goto('file:///dev/null')

    await page.on('console', msg => {
      console.log(msg.text())
      /*for (let i = 0; i < msg.args().length; ++i)
        console.log(`${i}: ${msg.text()}`)*/
    })

    // Load scripts into browser context
    await page.addScriptTag({
      content: `${fs.readFileSync('./dist/keydude.js')}`
    })
    await page.addScriptTag({
      content: `${fs.readFileSync('./test/testdata.perf.js')}`
    })
  })

  it('current', async () => {
    const result = await page.evaluate(async () => {
      console.log('starting...')

      const unwrappedKey = await keydude.unwrapKey(
        '123456',
        TestData.passphraseIV,
        TestData.wrappedKey
      )

      const dataIndex = 2

      encryptedData = await keydude.encrypt(
        TestData.objectToEncrypt[dataIndex],
        unwrappedKey
      )
      console.log(`[encrypt] ${encryptedData.ed.length}`)

      encryptedData = await keydude._encryptWithoutCompression(
        TestData.objectToEncrypt[dataIndex],
        unwrappedKey
      )
      console.log(`[_encryptWithoutCompression] ${encryptedData.ed.length}`)

      encryptedData = await keydude._encryptWithCompressionOnBase64(
        TestData.objectToEncrypt[dataIndex],
        unwrappedKey
      )
      console.log(
        `[_encryptWithCompressionOnBase64] ${encryptedData.ed.length}`
      )

      encryptedData = await keydude._encryptSingleStringIO(
        TestData.objectToEncrypt[dataIndex],
        unwrappedKey
      )
      console.log(`[_encryptSingleStringIO] ${encryptedData.length}`)

      encryptedData = await keydude._encryptConcatArrays(
        TestData.objectToEncrypt[dataIndex],
        unwrappedKey
      )
      console.log(`[_encryptConcatArrays] ${encryptedData.length}`)

      return
    })

    //console.log('Results...')

    //console.log('duration:', result.fastest)
  })
})
