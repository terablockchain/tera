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

//Smart scroll support module


class SmartScroll extends require("./dapp")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
        
        this.InitHole()
    }
    GetRows(start, count, Filter, Category, GetAllData, bTokenGenerate, bAllRow)
    {
        
        if(Filter)
        {
            Filter = Filter.trim()
            Filter = Filter.toUpperCase()
        }
        if(Category)
            Category = ParseNum(Category)
        
        var WasError = 0;
        var arr = [];
        var Data;
        for(var num = start; true; num++)
        {
            if(!bAllRow && this.IsHole(num))
                continue;
            
            if(GetAllData)
                Data = this.ReadSmart(num)
            else
                Data = this.ReadSimple(num)
            
            if(!Data)
                break;
            
            if(bTokenGenerate && !Data.TokenGenerate)
                continue;
            
            if(Category)
            {
                if(Data.Category1 !== Category && Data.Category2 !== Category && Data.Category3 !== Category)
                    continue;
            }
            
            if(Filter)
            {
                var Str = "" + Data.ShortName.toUpperCase() + Data.ISIN.toUpperCase() + Data.Name.toUpperCase() + Data.Description.toUpperCase();
                if(Data.TokenGenerate)
                    Str += "TOKEN GENERATE"
                
                if(Str.indexOf(Filter) < 0)
                    continue;
            }
            
            var CanAdd = 1;
            if(!global.ALL_VIEW_ROWS && !bAllRow)
            {
                if(Data.HTMLBlock === 404)
                    CanAdd = 0;
            }
            var DataState = ACCOUNTS.ReadState(Data.Account);
            if(DataState)
            {
                Data.KeyValueSize = DataState.KeyValueSize;
                Data.BaseState = ACCOUNTS.GetSmartState(DataState, Data.StateFormat);
                if(!global.ALL_VIEW_ROWS && !bAllRow)
                {
                    if(CanAdd && typeof Data.BaseState === "object" && Data.BaseState.HTMLBlock === 404)
                        CanAdd = 0;
                }
            }


            if(CanAdd)
            {
                arr.push(Data);
            }
            
            count--;
            if(count < 1)
                break;
        }
        
        return arr;
    }
    
    GetMaxNum()
    {
        return this.DBSmart.GetMaxNum();
    }
    InitHole()
    {
        if(global.NETWORK_ID === "MAIN-JINN.TERA")
        {
            this.RowHole = {"10":1, "19":1, "22":1, "23":1, "24":1, "26":1, "27":1, "29":1, "30":1, "34":1, "56":1, "57":1}
            for(var Num = 0; Num < 8; Num++)
                this.RowHole[Num] = 1
        }
        else
            this.RowHole = {}
    }
    IsHole(num)
    {
        if(global.ALL_VIEW_ROWS)
            return 0;
        return this.RowHole[num];
    }
};

module.exports = SmartScroll;
