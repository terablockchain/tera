/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

"use strict";

const DEBUG_TREE = 0;

const RootPosition = 0;
const ROOT_FORMAT = {root:"uint", size:"uint", WorkNum:"uint", Reserve:"arr82"};
const ROOT_SIZE = 100;
const RootWorkStruct = {};

class CDBTree
{
    constructor(name, format, bReadOnly, CompareFunc, ItemType, TreeType)
    {
        if(!CompareFunc)
            throw "Error: Not set CompareFunc";
        
        this.ReadOnly = bReadOnly
        this.ItemType = ItemType
        this.FileName = name
        
        var commonformat = {_left:"uint", _right:"uint", _data:format, WorkNum:"uint", };
        if(TreeType !== "Bin")
        {
            commonformat._red = "byte"
        }
        
        if(this.ItemType !== "Fixed")
        {
            commonformat._data = "{_Position:uint}"
        }
        
        this.DataFormat = format
        this.DataWorkStruct = {}
        this.DB = new CDBItemFixed(name, commonformat, bReadOnly, 0)
        this.DB._JournalCheckFileSize = 1
        this.DB._JournalLastSavingPos = RootPosition
        
        let SELF = this;
        this.DB.OnRollbackTR = function (Name)
        {
            SELF.ReloadTree()
        }
        this.DB.OnRestoreJournal = function ()
        {
            SELF.ReloadTree()
        }
        
        this.MaxCount = 0
        
        this.FNode = function (data)
        {
            this._data = data
            this._left = null
            this._right = null
            this._red = true
            
            this.Position = undefined
            
            this.IndexModify = undefined
            
            SELF.SetProperty(this)
            
            if(data)
                SELF.MODIFY(this)
        }
        
        if(TreeType === "Bin")
            this.Tree = new BinTreeExt(CompareFunc, this.FNode)
        else
            this.Tree = new RBTreeExt(CompareFunc, this.FNode)
        
        this.ArrModify = []
        this.IsBuffering = 0
        this.ReloadTree()
        
        if(!bReadOnly)
            this.CheckCreateDB()
    }
    
    SetProperty(node)
    {
        let SELF = this;
        
        Object.defineProperty(node, "data", {set:function (value)
            {
                node._data = value
                SELF.MODIFY(node)
            }, get:function ()
            {
                return node._data;
            }})
        Object.defineProperty(node, "left", {set:function (value)
            {
                {
                    node._left = value
                    SELF.MODIFY(node)
                }
            }, get:function ()
            {
                if(typeof node._left === "number")
                    node._left = SELF.LOAD(node._left)
                
                return node._left;
            }})
        
        Object.defineProperty(node, "right", {set:function (value)
            {
                {
                    node._right = value
                    SELF.MODIFY(node)
                }
            }, get:function ()
            {
                if(typeof node._right === "number")
                    node._right = SELF.LOAD(node._right)
                
                return node._right;
            }})
        
        Object.defineProperty(node, "red", {set:function (value)
            {
                if(node._red !== value)
                {
                    node._red = value
                    SELF.MODIFY(node)
                }
            }, get:function ()
            {
                return !!node._red;
            }})
    }
    
    Clear()
    {
        this.DB.Clear()
        this.Tree.clear()
        this.CheckCreateDB()
        this.ReloadTree()
    }
    
    Close()
    {
        this.DB.Close()
        if(this.ReadOnly)
            this.NeedReload = 1
        else
            this.ReloadTree()
    }
    
    GetCount()
    {
        this.CheckReloadTree()
        
        return this.Tree.size;
    }
    
    Max()
    {
        this.CheckReloadTree()
        return this.Tree.max();
    }
    
    Min()
    {
        this.CheckReloadTree()
        return this.Tree.min();
    }
    
    FindBoundIter(Data)
    {
        this.CheckReloadTree()
        
        return this.Tree.lowerBound(Data);
    }
    
    GetSize()
    {
        this.CheckReloadTree()
        
        return this.DB.GetSize();
    }
    Insert(Data)
    {
        if(this.IsBuffering)
            return this.Tree.insert(Data);
        
        this.ArrModify = []
        var Ret = this.Tree.insert(Data);
        this.FlushBuffer()
        return Ret;
    }
    
    Remove(Data)
    {
        var Ret;
        if(this.IsBuffering)
        {
            Ret = this.Tree.remove(Data)
        }
        else
        {
            this.ArrModify = []
            Ret = this.Tree.remove(Data)
            this.FlushBuffer()
        }
        return Ret;
    }
    
    RewriteData(Data)
    {
        
        this.Remove(Data)
        return this.Insert(Data);
    }
    
    Find(find)
    {
        this.CheckReloadTree()
        
        var data = this.Tree.find(find);
        return data;
    }
    
    Iterator()
    {
        this.CheckReloadTree()
        
        return this.Tree.iterator();
    }
    MODIFY(node)
    {
        if(node.IndexModify === undefined)
        {
            node.IndexModify = this.ArrModify.length
            this.ArrModify.push(node)
        }
    }
    
    SAVE(Node)
    {
        Node.IndexModify = undefined
        
        var NodeWrite = this.GetTreePosition(Node);
        NodeWrite.WorkNum = this.WorkNum
        var Res = this.WriteNode(NodeWrite);
        
        DEBUG_TREE && ToLog("Save " + NodeWrite.Position + " red = " + NodeWrite._red + " left=" + NodeWrite._left + " right=" + NodeWrite._right + " WorkNum=" + NodeWrite.WorkNum + " data=" + JSON.stringify(NodeWrite._data))
        
        Node.Position = NodeWrite.Position
        
        return Res;
    }
    
    LOAD(Position, Iteration)
    {
        var Node;
        if(Position)
            Node = this.ReadNode(Position)
        if(!Node)
            return null;
        
        if(Node.WorkNum > this.WorkNum)
        {
            ToLog("Error Tree WorkNum " + Node.Position + " find=" + Node.WorkNum + " max=" + this.WorkNum + " data=" + JSON.stringify(Node.data),
            3)
        }
        
        this.SetProperty(Node)
        DEBUG_TREE && ToLog("Load " + Node.Position + " red = " + Node.red + " _left=" + Node._left + " _right=" + Node._right + " WorkNum=" + Node.WorkNum + " data=" + JSON.stringify(Node.data))
        return Node;
    }
    
    BeginBuffer()
    {
        this.ArrModify = []
        this.IsBuffering = 1
    }
    
    FlushBuffer()
    {
        function SetParent(Parent,Node)
        {
            if(Node && typeof Node === "object")
            {
                Node.Parent = Parent
            }
        };
        
        function CalcChildCount(Node)
        {
            if(!Node)
                return 0;
            
            if(!Node.ChildCount)
            {
                Node.ChildCount = 1 + CalcChildCount(Node._left) + CalcChildCount(Node._right)
            }
            return Node.ChildCount;
        };
        
        function CalcHeight(Node)
        {
            if(!Node || typeof Node === "number")
                return 0;
            
            if(!Node.Height)
            {
                Node.Height = 1 + Math.max(CalcHeight(Node._left), CalcHeight(Node._right))
            }
            
            return Node.Height;
        };
        
        if(this.ArrModify.length)
        {
            this.WorkNum++
            for(var i = 0; i < this.ArrModify.length; i++)
            {
                var Node = this.ArrModify[i];
                SetParent(Node, Node._left)
                SetParent(Node, Node._right)
                Node.Height = 0
            }
            for(var i = 0; i < this.ArrModify.length; i++)
            {
                var Node = this.ArrModify[i];
                CalcHeight(Node)
            }
            this.ArrModify.sort(function (a,b)
            {
                return a.Height - b.Height;
            })
            
            this.MaxCount = Math.max(this.MaxCount, this.ArrModify[this.ArrModify.length - 1].Height)
            
            for(var i = 0; i < this.ArrModify.length; i++)
            {
                this.SAVE(this.ArrModify[i])
            }
            
            this.WriteRoot()
        }
        
        this.IsBuffering = 0
        this.ArrModify = []
    }
    
    GetTreePosition(node)
    {
        
        var data = {Position:node.Position, _left:0, _right:0, _red:node._red ? 1 : 0, _data:node._data, };
        
        if(node._left && typeof node._left === "object")
        {
            if(!node._left.Position)
                throw "Error algo - not set node._left.Position";
            
            data._left = node._left.Position
        }
        else
            if(typeof node._left === "number")
            {
                data._left = node._left
            }
        
        if(node._right && typeof node._right === "object")
        {
            if(!node._right.Position)
                throw "Error algo - not set node._right.Position";
            
            data._right = node._right.Position
        }
        else
            
            if(typeof node._right === "number")
            {
                data._right = node._right
            }
        
        return data;
    }
    WriteNode(Node)
    {
        var Res;
        if(this.ItemType === "Fixed")
        {
            Res = this.DB.Write(Node)
        }
        else
        {
            if(!this.WriteData(Node._data))
                return 0;
            Res = this.DB.Write(Node)
        }
        return Res;
    }
    
    ReadNode(Position)
    {
        var Node;
        if(this.ItemType === "Fixed")
        {
            Node = this.DB.Read(Position)
        }
        else
        {
            Node = this.DB.Read(Position)
            if(!Node)
                return undefined;
            if(!this.ReadData(Node._data))
            {
                return undefined;
            }
        }
        return Node;
    }
    WriteData(Data)
    {
        if(!Data)
        {
            return 0;
        }
        
        if(global.DEV_MODE)
        {
            if(Data._Position && Data._FileName && Data._FileName !== this.FileName)
                StopAndExit("Error write, item file: " + Data._FileName + " need file: " + this.FileName + " Pos=" + Data._Position)
            
            Data._FileName = this.FileName
        }
        
        var BufWrite = SerializeLib.GetBufferFromObject(Data, this.DataFormat, this.DataWorkStruct, 1, [0, 0, 0, 0]);
        var DataSize = BufWrite.length - 4;
        WriteUint32AtPos(BufWrite, DataSize, 0)
        
        if(Data._Position)
        {
            var DataSizeOld = this.DB.ReadUint32(Data._Position);
            if(DataSizeOld < DataSize)
            {
                ToLogTrace("Error #1 Read DataSize: " + DataSize + "/" + DataSizeOld + " file=" + this.DB.FileName + " Pos=" + Data._Position)
                return 0;
            }
        }
        
        Data._Position = this.DB.WriteInner(BufWrite, Data._Position, 0, BufWrite.length)
        if(Data._Position)
        {
            return 1;
        }
        else
        {
            ToLog("Error write Tree Node Data")
            return 0;
        }
    }
    
    ReadData(Data)
    {
        var Position = Math.trunc(Data._Position);
        var DataSize = this.DB.ReadUint32(Position);
        if(!DataSize)
            return 0;
        
        var BufRead = this.DB.ReadInner(Position, DataSize + 4);
        if(!BufRead)
            return 0;
        
        var Body;
        try
        {
            Body = SerializeLib.GetObjectFromBuffer(BufRead.slice(4), this.DataFormat, this.DataWorkStruct)
        }
        catch(e)
        {
            ToLog("DB-TREE: " + e)
            return 0;
        }
        
        if(global.DEV_MODE)
            Data._FileName = this.FileName
        
        if(Body)
        {
            CopyObjKeys(Data, Body)
            return 1;
        }
        
        ToLog("DB-TREE: Error read data at Pos=" + Position, 3)
        return 0;
    }
    WriteRoot()
    {
        var RootItem = {Position:RootPosition, root:this.Tree._root ? this.Tree._root.Position : 0, size:this.Tree.size, WorkNum:this.WorkNum};
        var BufWrite = SerializeLib.GetBufferFromObject(RootItem, ROOT_FORMAT, RootWorkStruct, 1);
        this.DB.WriteInner(BufWrite, RootItem.Position, 0, BufWrite.length)
        
        DEBUG_TREE && ToLog("Save root: " + JSON.stringify(RootItem) + " WorkNum=" + this.WorkNum)
    }
    ReadRoot()
    {
        var Item;
        var BufRead = this.DB.ReadInner(RootPosition, ROOT_SIZE);
        if(BufRead)
            Item = SerializeLib.GetObjectFromBuffer(BufRead, ROOT_FORMAT, RootWorkStruct)
        
        if(!Item)
        {
            this.Tree._root = null
            this.Tree.size = 0
        }
        else
        {
            this.WorkNum = Math.max(this.WorkNum, Item.WorkNum)
            this.Tree._root = this.LOAD(Item.root)
            this.Tree.size = Item.size
        }
        DEBUG_TREE && ToLog("size=" + this.Tree.size + "  WorkNum=" + this.WorkNum)
    }
    
    ReloadTree()
    {
        this.NeedReload = 0
        
        this.ArrModify = []
        if(!this.WorkNum)
            this.WorkNum = 0
        this.Tree.clear()
        if(!this.DB.GetSize())
            return;
        
        this.ReadRoot()
    }
    
    CheckReloadTree()
    {
        if(this.NeedReload)
            this.ReloadTree()
    }
    CheckCreateDB()
    {
        if(!this.DB.GetSize())
            this.WriteRoot()
    }
};

module.exports = CDBTree;
