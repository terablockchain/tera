/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


function DoTestBlockDB(Start,CountBlock)
{
    var Str;
    var Count = 0;
    for(var num = Start; num < Start + CountBlock; num++)
    {
        var Block = SERVER.ReadBlockHeaderDB(num);
        if(!Block)
            break;
        
        if(!SERVER.CheckSeqHashDB(Block, "WriteBlockHeaderDB"))
        {
            Str = "Error on block " + num;
            break;
        }
        
        Count++;
    }
    
    if(!Str)
        Str = "Test OK. Start from: " + Start + " Block process count: " + Count;
    
    ToLog(Str);
    return Str;
}

global.DoTestBlockDB = DoTestBlockDB;

global.SpeedSignLib = 0;
global.TestSignLib = TestSignLib;
function TestSignLib(MaxTime)
{
    if(!MaxTime)
        MaxTime = global.DEF_PERIOD_SIGN_LIB;
    
    var hash = Buffer.from("A6B0914953F515F4686B2BA921B8FAC66EE6A6D3E317B43E981EBBA52393BFC6", "hex");
    var PubKey = Buffer.from("026A04AB98D9E4774AD806E302DDDEB63BEA16B5CB5F223EE77478E861BB583EB3", "hex");
    var Sign = Buffer.from("5D5382C65E4C1E8D412D5F30F87B8F72F371E9E4FC170761BCE583A961CF44966F92B38D402BC1CBCB7567335051A321B93F4E32112129AED4AB602E093A1187",
    "hex");
    
    var startTime = process.hrtime();
    var deltaTime = 1;
    for(var Num = 0; Num < 1000; Num++)
    {
        var Result = secp256k1.verify(hash, Sign, PubKey);
        if(!Result)
        {
            ToError("Error test sign");
            process.exit(0);
        }
        
        var Time = process.hrtime(startTime);
        deltaTime = Time[0] * 1000 + Time[1] / 1e6;
        if(deltaTime > MaxTime)
        {
            break;
        }
    }
    if(!deltaTime)
        deltaTime = 1;
    
    global.SpeedSignLib = Math.floor(Num * 500 / deltaTime);
    
    ToLog("TestSignLib: " + global.SpeedSignLib + " per sec");
    
    if(global.SpeedSignLib < 800)
    {
        ToLog("*************** WARNING: VERY SLOW LIBRARY: secp256k1 ***************");
        ToLog("You can only process: " + global.SpeedSignLib + " transactions");
        ToLog("Install all dependent packages, see detail: https://www.npmjs.com/package/secp256k1");
        return 0;
    }
    
    return 1;
}



