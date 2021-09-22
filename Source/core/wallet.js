/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

"use strict";

const fs = require('fs');
const crypto = require('crypto');

require("./library");
require("./crypto-library");


const ZeroStr64 = "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

class CWalletApp
{
    Start()
    {
        CheckCreateDir(GetDataPath(this.GetWalletPath()))

        this.Init();

        if(global.LOCAL_RUN)
        {
            let SELF = this;
            setTimeout(function ()
            {
                SELF.FindMyAccounts(1)
            }, 5000)
        }
    }

    Init()
    {
        this.Password = ""
        this.WalletOpen = undefined

        var FName = this.GetConfigFileName();
        var Params = LoadParams(FName, undefined);
        if(!Params)
        {
            Params = {}

            if(global.global.LOCAL_RUN)
            {
                Params.Key = global.ARR_PUB_KEY[0]
            }
            else
            {
                Params.Key = GetHexFromArr(crypto.randomBytes(32))
            }
            Params.AccountMap = {}
            Params.MiningAccount = 0
        }

        if(Params.MiningAccount && !global.MINING_ACCOUNT)//support old mode
            global.GENERATE_BLOCK_ACCOUNT = Params.MiningAccount

        this.AccountMap = Params.AccountMap
        this.KeyPair = crypto.createECDH('secp256k1')

        if(Params.Protect && Params.KeyXOR)
        {
            ToLog("Wallet protect by password")
            this.KeyXOR = GetArrFromHex(Params.KeyXOR)
            this.WalletOpen = false

            this.SetPrivateKey(Params.PubKey)
        }
        else
        {
            this.SetPrivateKey(Params.Key)
        }
    }

    SetPrivateKey(KeyStr, bSetNew)
    {
        var bGo = 1;
        if(this.WalletOpen === false)
        {
            bGo = 0
        }

        if(KeyStr && KeyStr.length === 64 && bGo)
        {
            this.KeyPair.setPrivateKey(GetArr32FromHex(KeyStr))
            this.KeyPair.PubKeyArr = this.KeyPair.getPublicKey('', 'compressed')
            this.KeyPair.PubKeyStr = GetHexFromArr(this.KeyPair.PubKeyArr)
            this.KeyPair.PrivKeyStr = KeyStr.toUpperCase()
            this.KeyPair.addrArr = this.KeyPair.PubKeyArr.slice(1)
            this.KeyPair.addrStr = GetHexAddresFromPublicKey(this.KeyPair.addrArr)
            this.KeyPair.addr = this.KeyPair.addrArr

            this.KeyPair.WasInit = 1
            this.PubKeyArr = this.KeyPair.PubKeyArr
        }
        else
        {
            this.KeyPair.WasInit = 0
            if(KeyStr)
            {
                this.PubKeyArr = GetArrFromHex(KeyStr)
                this.KeyPair.PubKeyStr = GetHexFromArr(this.PubKeyArr)
            }
            else
            {
                this.PubKeyArr = []
                this.KeyPair.PubKeyStr = ""
            }

            this.KeyPair.PrivKeyStr = ""
        }

        if(bSetNew)
        {
            this.AccountMap = {}
        }

        this.FindMyAccounts(0)

        if(bGo)
            this.SaveWallet()
    }

    CloseWallet()
    {
        this.Password = ""
        this.WalletOpen = false
        this.KeyPair = crypto.createECDH('secp256k1')
        this.SetPrivateKey(GetHexFromArr(this.PubKeyArr), false)
        ToLogClient("Wallet close")
        return 1;
    }

    OpenWallet(StrPassword)
    {
        if(this.WalletOpen !== false)
        {
            ToLogClient("Wallet was open")
        }
        if(!this.KeyXOR)
            return 1;

        var Hash = this.HashProtect(StrPassword);
        var TestPrivKey = this.XORHash(this.KeyXOR, Hash, 32);
        if(!IsZeroArr(TestPrivKey))
        {
            this.KeyPair.setPrivateKey(Buffer.from(TestPrivKey))
            var TestPubKey = this.KeyPair.getPublicKey('', 'compressed');
            if(CompareArr(TestPubKey, this.PubKeyArr) !== 0)
            {
                ToLogClient("Wrong password")
                return 0;
            }
            this.Password = StrPassword
            this.WalletOpen = true
            this.SetPrivateKey(GetHexFromArr(TestPrivKey), false)
        }
        else
        {
            this.Password = StrPassword
            this.WalletOpen = true
            this.SetPrivateKey(GetHexFromArr(this.PubKeyArr), false)
        }

        ToLogClient("Wallet open")
        return 1;
    }

    SetPasswordNew(StrPassword)
    {
        if(this.WalletOpen === false)
        {
            ToLogClient("Wallet is close by password")
            return;
        }

        this.Password = StrPassword
        if(StrPassword)
            this.WalletOpen = true
        else
            this.WalletOpen = undefined
        this.SaveWallet()
    }

    HashProtect(Str)
    {
        var arr = shaarr(Str);
        for(var i = 0; i < 10000; i++)
        {
            arr = shaarr(arr)
        }
        return arr;
    }
    XORHash(arr1, arr2, length)
    {
        if(!arr1 || !arr2)
            ToLogTrace("Error arr for xor")
        var arr3 = [];
        for(var i = 0; i < length; i++)
        {
            arr3[i] = arr1[i] ^ arr2[i]
        }
        return arr3;
    }

    SaveWallet()
    {
        if(this.WalletOpen === false)
        {
            return;
        }

        var Params = {};

        if(this.Password)
        {
            Params.Protect = true
            var Hash = this.HashProtect(this.Password);
            if(this.KeyPair.WasInit)
            {
                Params.KeyXOR = GetHexFromArr(this.XORHash(this.KeyPair.getPrivateKey(), Hash, 32))
            }
            else
            {
                var Key2 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                Params.KeyXOR = GetHexFromArr(this.XORHash(Key2, Hash, 32))
            }
            Params.PubKey = GetHexFromArr(this.PubKeyArr)
            this.KeyXOR = GetArrFromHex(Params.KeyXOR)
        }
        else
        {
            if(this.KeyPair.WasInit)
                Params.Key = this.KeyPair.PrivKeyStr
            else
                Params.Key = GetHexFromArr(this.PubKeyArr)
        }

        Params.AccountMap = this.AccountMap

        var FName=this.GetConfigFileName();
        SaveParams(FName, Params)
    }

    OnCreateAccount(Data)
    {
        this.AccountMap[Data.Num] = 0
    }

    FindMyAccounts(bClean)
    {
        if(IsZeroArr(this.PubKeyArr))
            return 0;

        var HiddenMap = LoadParams(this.GetHiddenFileName(), {});

        if(bClean)
            this.AccountMap = {}
        return ACCOUNTS.FindAccounts([this.PubKeyArr], this.AccountMap, HiddenMap, 0);
    }

    GetAccountKey(Num)
    {
        if(this.KeyPair.WasInit && global.TestTestWaletMode)
        {
        }

        return this.KeyPair;
    }
    GetPrivateKey(Num)
    {
        if(!this.KeyPair.WasInit)
            return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        var KeyPair;
        if(Num)
        {
            KeyPair = this.GetAccountKey(Num)
        }
        else
        {
            KeyPair = this.KeyPair
        }
        var PrivKey = KeyPair.getPrivateKey();
        if(PrivKey.length < 32)
        {
            var Delta = 32 - PrivKey.length;
            var Arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for(var i = 0; i < PrivKey.length; i++)
                Arr[i + Delta] = PrivKey[i]
            PrivKey = Arr
        }
        return PrivKey;
    }

    GetSignFromHash(Hash, Num)
    {
        if(!this.KeyPair.WasInit)
            return ZeroStr64;

        var PrivKey = this.GetPrivateKey(Num);
        if(!PrivKey)
            return ZeroStr64;

        var sigObj = secp256k1.sign(Buffer.from(Hash), Buffer.from(PrivKey));
        return GetHexFromArr(sigObj.signature);
    }

    GetSignFromArr(Arr, Num)
    {
        return this.GetSignFromHash(SHA3BUF(Arr), Num);
    }

    GetSignTransaction(TR)
    {
        if(!this.KeyPair.WasInit)
            return ZeroStr64;
        try
        {
            var PrivKey = this.GetPrivateKey(this.AccountMap[TR.FromID]);
            var Arr = ACCOUNTS.GetSignTransferTx(TR, PrivKey);
            return GetHexFromArr(Arr);
        }
        catch(e)
        {
            ToLog(e);
            return ZeroStr64;
        }
    }

    GetWalletPath()
    {
        return "WALLET";
    }

    GetConfigFileName()
    {
        return GetDataPath(this.GetWalletPath() + "/config.lst");
    }

    GetHiddenFileName()
    {
        return GetDataPath(this.GetWalletPath() + "/hidden.lst");
    }
}

global.WALLET = new CWalletApp;

