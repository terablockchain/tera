/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


var MAX_SUM_TER = 1e9;
var MAX_SUM_CENT = 1e9;

function CHECKSUM(Coin)
{
    if(!Coin.SumCOIN)
        Coin.SumCOIN = 0;
    if(!Coin.SumCENT)
        Coin.SumCENT = 0;
}

function ADD(Coin,Value2)
{
    Coin.SumCOIN += Value2.SumCOIN;
    Coin.SumCENT += Value2.SumCENT;
    
    if(Coin.SumCENT >= MAX_SUM_CENT)
    {
        Coin.SumCENT -= MAX_SUM_CENT;
        Coin.SumCOIN++;
    }
    
    return true;
}

function SUB(Coin,Value2)
{
    Coin.SumCOIN -= Value2.SumCOIN;
    if(Coin.SumCENT >= Value2.SumCENT)
    {
        Coin.SumCENT -= Value2.SumCENT;
    }
    else
    {
        Coin.SumCENT = MAX_SUM_CENT + Coin.SumCENT - Value2.SumCENT;
        Coin.SumCOIN--;
    }
    if(Coin.SumCOIN < 0)
    {
        return false;
    }
    return true;
}

function DIV(Coin,Value)
{
    Coin.SumCOIN = Coin.SumCOIN / Value;
    Coin.SumCENT = Math.floor(Coin.SumCENT / Value);
    
    var SumCOIN = Math.floor(Coin.SumCOIN);
    var SumCENT = Math.floor((Coin.SumCOIN - SumCOIN) * MAX_SUM_CENT);
    
    Coin.SumCOIN = SumCOIN;
    Coin.SumCENT = Coin.SumCENT + SumCENT;
    
    if(Coin.SumCENT >= MAX_SUM_CENT)
    {
        Coin.SumCENT -= MAX_SUM_CENT;
        Coin.SumCOIN++;
    }
    return true;
}

function FLOAT_FROM_COIN(Coin)
{
    var Sum = Coin.SumCOIN + Coin.SumCENT / MAX_SUM_CENT;
    return Sum;
}

function STRING_FROM_COIN(Coin)
{
    var Sum = FLOAT_FROM_COIN(Coin);
    return Sum.toLocaleString(undefined, {useGrouping:true, style:'decimal', maximumFractionDigits:9});
}

function COIN_FROM_FLOAT(Sum)
{
    var SumCOIN = Math.floor(Sum);
    var SumCENT = Math.floor((Sum - SumCOIN) * MAX_SUM_CENT);
    var Coin = {SumCOIN:SumCOIN, SumCENT:SumCENT};
    return Coin;
}

function COIN_FROM_FLOAT2(Sum)
{
    var SumCOIN = Math.floor(Sum);
    var SumCENT = Math.floor(Sum * MAX_SUM_CENT - SumCOIN * MAX_SUM_CENT);
    var Coin = {SumCOIN:SumCOIN, SumCENT:SumCENT};
    return Coin;
}
if(typeof window === "object")
    window.COIN_FROM_FLOAT = COIN_FROM_FLOAT2;

function ISZERO(Coin)
{
    if(Coin.SumCOIN === 0 && Coin.SumCENT === 0)
        return true;
    else
        return false;
}

function COIN_FROM_STRING(Str)
{
    throw "TODO: COIN_FROM_STRING";
}

function GetCurrencyFixed(Currency)
{
    var Fixed = 9;
    var Name = CurrencyName(Currency);
    if(Name === "BTC")
        Fixed = 8;
    return Fixed;
}

if(typeof global === "object")
{
    global.CHECKSUM = CHECKSUM;
    global.ADD = ADD;
    global.SUB = SUB;
    global.DIV = DIV;
    global.ISZERO = ISZERO;
    global.FLOAT_FROM_COIN = FLOAT_FROM_COIN;
    global.COIN_FROM_FLOAT = COIN_FROM_FLOAT;
    global.COIN_FROM_FLOAT2 = COIN_FROM_FLOAT2;
    global.COIN_FROM_STRING = COIN_FROM_STRING;
}
