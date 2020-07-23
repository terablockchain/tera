/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


class STreeBuffer
{
    constructor(MaxTime, CompareFunction, KeyType, CheckName)
    {
        this.KeyType = KeyType
        this.MetaTree1 = new RBTree(CompareFunction)
        this.MetaTree2 = new RBTree(CompareFunction)
        this.CheckName = CheckName
        
        setInterval(this.ShiftMapDirect.bind(this), MaxTime)
    }
    
    LoadValue(Hash, bStay)
    {
        if(!Hash)
            return undefined;
        
        if(typeof Hash !== this.KeyType)
            throw "MUST ONLY HASH ARRAY: " + Hash;
        
        var element = this.MetaTree1.find({hash:Hash});
        if(element)
        {
            if(!bStay)
                this.MetaTree1.remove(element)
            return element.value;
        }
        
        element = this.MetaTree2.find({hash:Hash})
        if(element)
        {
            if(!bStay)
                this.MetaTree2.remove(element)
            return element.value;
        }
        return undefined;
    }
    
    SaveValue(Hash, Value)
    {
        if(typeof Hash !== this.KeyType)
        {
            var Str = "MUST ONLY TYPE=" + this.KeyType + " in " + Hash;
            ToLogTrace(Str)
            throw Str;
        }
        
        if(Value !== undefined)
        {
            var element = this.MetaTree1.find({hash:Hash});
            if(element)
                element.value = Value
            else
                this.MetaTree1.insert({hash:Hash, value:Value})
        }
    }
    
    ShiftMapDirect()
    {
        
        if(this.CheckName && this.MetaTree2.size)
        {
            ADD_TO_STAT(this.CheckName, this.MetaTree2.size, 1)
            
            var it = this.MetaTree2.iterator(), Item;
            while((Item = it.next()) !== null)
            {
                var Name = Item.value.Name;
                
                ADD_TO_STAT(this.CheckName + ":" + Name, 1, 1)
            }
        }
        
        this.MetaTree2.clear()
        var empty_tree = this.MetaTree2;
        
        this.MetaTree2 = this.MetaTree1
        this.MetaTree1 = empty_tree
    }
    
    Clear()
    {
        this.MetaTree1.clear()
        this.MetaTree2.clear()
    }
};

global.STreeBuffer = STreeBuffer;
