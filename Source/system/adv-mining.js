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

require("../core/library");

class CAdvMining
{
    constructor()
    {
        this.InitAMIDTab()
    }
    
    InitAMIDTab()
    {
        
        this.TreeByID = new RBTree(function (a,b)
        {
            return a.ID - b.ID;
        })
        
        this.TreeByAMID = new RBTree(function (a,b)
        {
            return a.AMID - b.AMID;
        })
    }
    
    Truncate(ToID)
    {
        while(1)
        {
            var Item = this.TreeByID.max();
            if(!Item || Item.ID <= ToID)
                break;
            
            this.TreeByID.remove(Item)
            this.TreeByAMID.remove(Item)
            
            if(this.TreeByID.size !== this.TreeByAMID.size)
                ToLogOne("***** #1 Error AMID trees size")
        }
    }
    
    SetRow(ID, AMID)
    {
        var Find = this.TreeByAMID.find({AMID:AMID});
        if(!Find)
        {
            
            var Item = {ID:ID, AMID:AMID};
            this.TreeByAMID.insert(Item)
            this.TreeByID.insert(Item)
            
            if(this.TreeByID.size !== this.TreeByAMID.size)
                ToLogOne("***** #2 Error AMID trees size")
        }
        else
        {
        }
    }
    
    GetID(AMID)
    {
        var Find = this.TreeByAMID.find({AMID:AMID});
        if(Find)
        {
            return Find.ID;
        }
        else
        {
            return 0;
        }
    }
};

module.exports = CAdvMining;


function RunTreeUnitTest()
{
    var AdvMining = new CAdvMining();
    
    var a0 = {ID:120, AMID:1888700120};
    var a1 = {ID:121, AMID:1888700121};
    var b0 = {ID:13, AMID:1888700121};
    
    AdvMining.SetRow(a0.ID, a0.AMID);
    AdvMining.SetRow(a1.ID, a1.AMID);
    AdvMining.SetRow(a0.ID, a0.AMID);
    
    var ID0 = AdvMining.GetID(a0.AMID);
    if(ID0 !== a0.ID)
        ToLogTrace("CAdvMining Error UNIT TEST #1");
    if(AdvMining.GetID(a1.AMID) !== a1.ID)
        ToLogTrace("CAdvMining Error UNIT TEST #2");
    
    AdvMining.SetRow(b0.ID, b0.AMID);
    
    AdvMining.Truncate(120);
    AdvMining.SetRow(b0.ID, b0.AMID);
    
    if(AdvMining.GetID(a1.AMID) === a1.ID)
        ToLogTrace("CAdvMining Error UNIT TEST #3");
    
    if(AdvMining.GetID(b0.AMID) !== b0.ID)
        ToLogTrace("CAdvMining Error UNIT TEST #4");
    
    AdvMining.Truncate(13);
    
    if(AdvMining.GetID(b0.AMID) !== b0.ID)
        ToLogTrace("CAdvMining Error UNIT TEST #5");
    
    AdvMining.Truncate(12);
    
    if(AdvMining.GetID(b0.AMID) !== 0)
        ToLogTrace("CAdvMining Error UNIT TEST #6");
    
    AdvMining.Truncate(10);
    
    if(0)
        for(var mode = 1; mode <= 5; mode++)
            for(var ID = 0; ID < 100; ID++)
            {
                var AMID = 1e9 + ID;
                AdvMining.SetRow(ID, AMID);
                
                if(AdvMining.GetID(AMID) !== ID)
                {
                    ToLogTrace("CAdvMining Error UNIT TEST #10");
                    break;
                }
                
                if(ID % 6 === mode)
                {
                    AdvMining.Truncate(ID);
                }
            }
}

