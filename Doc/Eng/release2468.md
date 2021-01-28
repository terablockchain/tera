# Update 2468
(available from block 68 500 000)

### methods in smart contracts

#### Storage

* ReadValue(Key,Format) to read the value by string key, unless you specify the format to use JSON serilize 
* WriteValue(Key,Value,Format) - record the value for a string key if you do not specify a format for serilize JSON is used, the maximum size stored value is 65535 bytes
* RemoveValue(Key) - delete the value with the specified key

```
To protect against DDOS in the form of large file sizes, the staking method is used. This means that there must be a certain amount in Terah on the base account of the smart contract. It takes 1 Tera to fuck 100 bytes.
```

#### Cryptography

* sha256() - Standard SHA-256 hash algorithm (FIPS 180-3) - Bitcoin
* sha3() - Standard SHA3-256 hash algorithm (FIPS 202) - Tera
* keccak256() - keccak256 hash algorithm used in Ethereum
* ecrecover(hash, v, r, s) is a standard feature of Ethereum
* checksign(hasharr32, signarr64, pubkeyarr33) - signature verification (the secp256k1 elliptic curve is the same as in Bitcoin)

#### Cross-sharding

* SendMessage(shardpath, Confirms, Method, Params,paramsarr) - send a message to another shard

#### General

in smart contracts, public methods can now have a second parameter to which a byte array of
up to 65535 bytes can be passed from the client side. a byte array is written to a transaction more compactly (unlike json),
which reduces the size of the transaction.
example:
```js
function Method1(Params, ParamsArr)
{
}
```

### New global methods on the client side
#### Cryptography
* sha256() - Standard SHA-256 hash algorithm (FIPS 180-3) - Bitcoin
* sha3() - Standard SHA3-256 hash algorithm (FIPS 202) - Tera
* keccak256 () - keccak256 hash algorithm used in Ethereum
* ecrecover(hash, v, r, s) is a standard feature of Ethereum
* createsign(Hash32, privkey32) - getting the signature (secp256k1 elliptic curve). The result is a 64-byte array.
* checksign(hasharr32, signarr64, pubkeyarr33) - signature verification (the secp256k1 elliptic curve is the same as in Bitcoin)
* ripemd160() - standard RIPEMD160 hash algorithm

* base58, base58check-global objects with decode,encode (base58 encoding/decoding) methods)

#### Additional client-side libraries
* signlib-object for working with electronic signatures (methods: publickeycreate, sign, verify, ecdh)
* bitcore-object for working with bitcoin addresses and transactions, available only when explicitly connected from https://terafoundation.org/bitcore-lib-min.js usage
examples: https://github.com/bitpay/bitcore/blob/master/packages/bitcore-lib/docs/examples.md

#### General
Calling the smart contract method via sending a transaction now looks like (added the paramsarr parameter):
```js
SendCall(ToNum,Name,Params,ParamsArr,FromNum);
```

