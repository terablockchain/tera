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
        this.FORMAT_ACCOUNT_ROW_REST = "{\
            Arr:[{\
            BlockNum:uint,\
            Value:{SumCOIN:uint,SumCENT:uint32, OperationID:uint,Smart:uint32,Data:arr80,Reserv:arr96},\
            }],\
            Reserv0:arr10,\
            }"
        
        this.SIZE_ACCOUNT_ROW_REST = 1024
        
        this.DBRest = new CDBRow("accounts-rest", this.FORMAT_ACCOUNT_ROW_REST, bReadOnly, "Num", 0, this.SIZE_ACCOUNT_ROW_REST)
        REGISTER_TR_DB(this.DBRest, 18)
    }
    
    ClearRest()
    {
        this.DBRest.Truncate( - 1)
    }
    
    CloseRest()
    {
        this.DBRest.Close()
    }
    
    CheckRestDB()
    {
        if(!global.SERVER)
            return;
        if(this.WasCheckRestDB)
            return;
        this.WasCheckRestDB = 1
        var MaxNumBlock = SERVER.GetMaxNumBlockDB();
        
        if(this.DBState.GetMaxNum() >= 0 && this.DBRest.GetMaxNum() < 0 && MaxNumBlock > 0)
        {
            this.FillRestDB(MaxNumBlock)
        }
    }
    FillRestDB(BlockNum)
    {
        ToLog("******************************START FillRestDB")
        var Max = this.DBState.GetMaxNum();
        for(var Num = 0; Num <= Max; Num++)
        {
            var Data = this.DBState.Read(Num);
            
            var RestData = this.ReadRest(Num);
            
            if(Num % 10000 === 0)
                ToLog("Fill Rest DB : " + Num)
            
            RestData.Arr[0] = {BlockNum:BlockNum, Value:Data.Value}
            
            this.DBRest.Write(RestData)
        }
        ToLog("******************************FINISH FillRestDB")
    }
    
    ReadRest(Num)
    {
        var COUNT_STATE = 5;
        
        var RestData = this.DBRest.Read(Num);
        if(!RestData || RestData.Arr.length !== COUNT_STATE)
        {
            RestData = {Num:Num, Arr:[]}
            for(var i = 0; i < COUNT_STATE; i++)
                RestData.Arr[i] = {BlockNum:0, Value:{}}
        }
        
        if(RestData.Arr.length !== COUNT_STATE)
            throw "Error RestData.Arr.length = (" + RestData.Arr.length + ")";
        return RestData;
    }
    
    DoRest(RestData, Data, BlockNum)
    {
        var Prev = RestData.Arr[0];
        
        var BlockNum0 = Math.floor(BlockNum / REST_BLOCK_SCALE);
        
        if(BlockNum0 !== Math.floor((Prev.BlockNum - 1) / REST_BLOCK_SCALE))
        {
            var arr = this.GetRestArr(BlockNum0);
            var arr2 = [];
            for(var i = arr.length - 2; i >= 0; i--)
            {
                arr2.push(arr[i] * REST_BLOCK_SCALE)
            }
            this.RestPush(RestData, arr2, BlockNum, 1)
        }
        
        RestData.Arr[0] = {BlockNum:BlockNum, Value:Data.Value}
    }
    RestPush(RestData, ArrRest, BlockNum, Index)
    {
        
        var Prev = RestData.Arr[Index - 1];
        var Cur = RestData.Arr[Index];
        
        if(Index > 1)
        {
            var RestNum = ArrRest[Index - 2];
            if(Prev.BlockNum > RestNum)
                return;
        }
        
        if((Cur.BlockNum && Cur.BlockNum >= BlockNum) || Prev.BlockNum >= BlockNum)
        {
            Cur.BlockNum = 0
            Cur.Value = {}
            return;
        }
        
        if(Cur.BlockNum)
        {
            if(Index < RestData.Arr.length - 1)
            {
                this.RestPush(RestData, ArrRest, BlockNum, Index + 1)
            }
        }
        
        RestData.Arr[Index] = Prev
    }
    
    GetRestArr(CurBlockNum)
    {
        var Arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        var ArrLength = Arr.length;
        var StartNum = 0;
        for(var num = StartNum; num <= CurBlockNum; num++)
        {
            var maska = 0;
            var CurNum = num;
            for(var i = ArrLength - 1; i >= 0; i--)
            {
                var PosNum = Arr[i];
                Arr[i] = CurNum
                CurNum = PosNum
                
                maska = (maska << 4) | 15
                
                if((maska & num) === 0)
                    break;
                if((maska & CurNum) !== 0)
                    break;
            }
        }
        return Arr;
    }
};

module.exports = AccountRest;
