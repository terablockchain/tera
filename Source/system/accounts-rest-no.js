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

//Rest account states


class AccountRest extends require("./accounts-scroll")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
    }
    
    ClearRest()
    {
    }
    
    CloseRest()
    {
    }
    
    TruncateRest(Num)
    {
    }
    
    DBStateWriteInner(Data, BlockNum)
    {
        this.ControlStorageDeposit(Data, BlockNum);
        this.DBState.Write(Data);
        
        this.SetAMIDTab(Data, BlockNum);
    }
    
    GetPrevAccountValue(Num, BlockNum)
    {
        
        var Data = this.ReadState(Num);
        if(!Data)
            return 0;
        if(Data.Currency !== 0)
            return 0;
        
        var Value = Data.Value;
        var MinBlockNum = BlockNum - 10;
        
        var Account = this.DBStateHistory.Read(Num);
        if(!Account)
            return undefined;
        
        var Count = 50;
        var Position = Account.NextPos;
        while(Count > 0 && Position)
        {
            Count--
            
            var Item = this.ReadHistory(Position);
            if(!Item)
                break;
            Position = Item.NextPos
            
            if(Item.BlockNum <= MinBlockNum)
            {
                break;
            }
            if(Item.Direct === "+")
            {
                if(!SUB(Value, Item))
                {
                    Value = {SumCOIN:0, SumCENT:0}
                }
            }
            else
            {
                ADD(Value, Item)
            }
        }
        
        return Value;
    }
};

module.exports = AccountRest;
