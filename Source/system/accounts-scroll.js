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

//Account scroll support module


class AccountScroll extends require("./dapp")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
    }
    GetRowsAccounts(start, count, Filter, bGetState, bGetCoin)
    {
        //console.log("GetRowsAccounts:",start,count,bGetState, bGetCoin)
        if(Filter)
        {
            Filter = Filter.trim()
        }
        
        var F;
        if(Filter)
        {
            if(Filter.substring(0, 1) === "=")
            {
                Filter = Filter.substring(1);
                try
                {
                    F = CreateEval(Filter, "Cur,Currency,ID,Operation,Amount,Adviser,Name,PubKey,Smart,BlockNum")
                }
                catch(e)
                {
                    F = undefined
                    ToLog("" + e)
                }
            }
            else
            {
                Filter = Filter.toUpperCase()
            }
        }
        
        var WasError = 0;
        var arr = [];
        for(var num = start; true; num++)
        {
            if(this.IsHole(num))
                continue;
            
            var Data = this.ReadState(num);
            if(!Data)
                break;
            if(!Data.PubKeyStr)
                Data.PubKeyStr = GetHexFromArr(Data.PubKey)
            
            Data.Name = NormalizeName(Data.Name)
            
            if(F)
            {
                var Cur = Data.Currency;
                var Currency = Data.Currency;
                var ID = Data.Num;
                var Operation = Data.Value.OperationID;
                var Amount = FLOAT_FROM_COIN(Data.Value);
                var Adviser = Data.Adviser;
                var Name = Data.Name;
                var PubKey = GetHexFromArr(Data.PubKey);
                var Smart = Data.Value.Smart;
                
                try
                {
                    if(!F(Cur, Currency, ID, Operation, Amount, Adviser, Name, PubKey, Smart, Data.BlockNumCreate))
                        continue;
                }
                catch(e)
                {
                    if(!WasError)
                        ToLog("" + e)
                    WasError = 1
                }
            }
            else
                if(Filter)
                {
                    var Amount = FLOAT_FROM_COIN(Data.Value);
                    var PubKey = GetHexFromArr(Data.PubKey);
                    var Str = "" + Data.Num + " " + Data.Value.OperationID + " " + Data.Name.toUpperCase() + " " + Data.Adviser + " " + Amount + " " + PubKey + " " + Smart + " " + Data.BlockNumCreate;
                    
                    if(Str.indexOf(Filter) < 0)
                        continue;
                }
            
            if(bGetState)
            {
                if(Data.Currency)
                    Data.CurrencyObj = SMARTS.ReadSimple(Data.Currency, 1)
                
                if(Data.Value.Smart)
                {
                    Data.SmartObj = SMARTS.ReadSimple(Data.Value.Smart)
                    if(Data.SmartObj)
                        Data.SmartState = this.GetSmartState(Data, Data.SmartObj.StateFormat)
                    else
                        Data.SmartState = {}
                }
            }
            //ERC
            if(bGetCoin)// && Data.Currency===0)//игнорируем другие валюты
            {
                if(Data.Currency && !Data.CurrencyObj)
                    Data.CurrencyObj = SMARTS.ReadSimple(Data.Currency, 1)

                Data.BalanceArr=this.ReadBalanceArr(Data);
            }

            
            arr.push(Data);
            count--;
            if(count < 1)
                break;
        }
        
        return arr;
    }
    GetSmartState(StateData, StateFormat)
    {
        var SmartState;
        try
        {
            SmartState = BufLib.GetObjectFromBuffer(StateData.Value.Data, StateFormat, {})
            if(typeof SmartState === "object")
                SmartState.Num = StateData.Num
        }
        catch(e)
        {
            SmartState = {}
        }
        return SmartState;
    }
    GetHole()
    {
        if(global.NETWORK_ID === "MAIN-JINN.TERA")
            return [{s:8300, f:186478}];
        
        return [];
    }
    IsHole(num, bForce)
    {
        if(!bForce && global.ALL_VIEW_ROWS)
            return 0;
        
        var ArrHole = this.GetHole();
        for(var i = 0; i < ArrHole.length; i++)
            if(num >= ArrHole[i].s && num <= ArrHole[i].f)
                return 1;
        return 0;
    }
    CalcTotalSum(Currency)
    {
        var SumCoin = {SumCOIN:0, SumCENT:0};
        for(var num = 0; true; num++)
        {
            var Data = this.ReadState(num);
            if(!Data)
                break;
            if(Data.Currency === Currency)
            {
                ADD(SumCoin, Data.Value)
            }
        }
        
        return FLOAT_FROM_COIN(SumCoin);
    }
};

module.exports = AccountScroll;
