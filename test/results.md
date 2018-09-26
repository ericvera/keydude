## Small data

| Function                         | Perf                                   | Size |
| -------------------------------- | -------------------------------------- | ---- |
| encrypt (LZ compression)         | 7,823 ops/sec ±6.84% (48 runs sampled) | 56   |
| \_encryptWithoutCompression      | 9,410 ops/sec ±9.95% (45 runs sampled) | 52   |
| \_encryptWithCompressionOnBase64 | 3,394 ops/sec ±8.95% (40 runs sampled) | 104  |

## Medium data (2 paragraphs)

| Function                                  | Perf                                    | Size      |
| ----------------------------------------- | --------------------------------------- | --------- |
| encrypt (LZ compression)                  | 1,553 ops/sec ±12.29% (43 runs sampled) | 760  |
| \_encryptWithoutCompression               | 4,858 ops/sec ±5.73% (45 runs sampled)  | 1116 |
| \_encryptWithCompressionOnBase64          | 834 ops/sec ±9.02% (46 runs sampled)    | 1632 |
| \_encryptSingleStringIO                   | 1,764 ops/sec ±7.63% (45 runs sampled)  | 760       |
| \_encryptConcatArrays (no LZ compression) | 5,673 ops/sec ±9.75% (42 runs sampled)  | 1116      |

## Large data (10 paragraphs)

| Function                         | Perf                                   | Size |
| -------------------------------- | -------------------------------------- | ---- |
| encrypt (LZ compression)         | 681 ops/sec ±2.37% (55 runs sampled)   | 2568 |
| \_encryptWithoutCompression      | 2,239 ops/sec ±6.91% (52 runs sampled) | 5588 |
| \_encryptWithCompressionOnBase64 | 211 ops/sec ±8.45% (47 runs sampled)   | 7640 |
