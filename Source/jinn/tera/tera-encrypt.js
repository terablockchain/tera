/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';

module.exports.Init = Init;

function Init(Engine)
{
    
    Engine.ValueToEncrypt = function (Str,Size)
    {
        if(!Size || Size <= 6)
            ToLogTrace("ValueToEncrypt: Error size = " + Size);
        var ArrValue = GetArrFromStr(Str, Size - 6);
        
        var ArrEncrypt = GetEncrypt(ArrValue, Engine.ArrCommonSecret);
        return ArrEncrypt;
    };
    
    Engine.ValueFromEncrypt = function (Child,ArrEncrypt)
    {
        if(IsZeroArr(ArrEncrypt))
            return "";
        
        var Arr = GetDecrypt(ArrEncrypt, Child.ArrCommonSecret);
        var Str = Utf8ArrayToStr(Arr);
        return Str;
    };
    
    function TestEncryptDecrypt()
    {
        Engine.ArrCommonSecret = sha3("SecretPassword");
        var ArrEncrypt = Engine.ValueToEncrypt("Secret message!!!", 40);
        console.log("ArrEncrypt length=" + ArrEncrypt.length);
        console.log("ArrEncrypt=" + ArrEncrypt);
        
        var Str2 = Engine.ValueFromEncrypt({ArrCommonSecret:Engine.ArrCommonSecret}, ArrEncrypt);
        console.log("Message=" + Str2);
        
        process.exit();
    };
}

function XORHash(arr1,arr2,length)
{
    var arr3 = [];
    for(var i = 0; i < length; i++)
    {
        arr3[i] = arr1[i] ^ arr2[i];
    }
    return arr3;
}
