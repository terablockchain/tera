/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/



function TreeBase()
{
}


TreeBase.prototype.clear = function ()
{
    this._root = 0;
    this.size = 0;
}


TreeBase.prototype.find = function (data)
{
    var res = this._root;
    
    while(res !== 0)
    {
        var c = this._comparator(data, res.data);
        if(c === 0)
        {
            return res.data;
        }
        else
        {
            res = this.get_child(res, c > 0);
        }
    }
    
    return null;
}


TreeBase.prototype.findIter = function (data)
{
    var res = this._root;
    var iter = this.iterator();
    
    while(res !== 0)
    {
        var c = this._comparator(data, res.data);
        if(c === 0)
        {
            iter._cursor = res;
            return iter;
        }
        else
        {
            iter._ancestors.push(res);
            res = this.get_child(res, c > 0);
        }
    }
    
    return null;
}


TreeBase.prototype.lowerBound = function (item)
{
    var cur = this._root;
    var iter = this.iterator();
    var cmp = this._comparator;
    
    while(cur !== 0)
    {
        var c = cmp(item, cur.data);
        if(c === 0)
        {
            iter._cursor = cur;
            return iter;
        }
        iter._ancestors.push(cur);
        cur = this.get_child(cur, c > 0);
    }
    
    for(var i = iter._ancestors.length - 1; i >= 0; --i)
    {
        cur = iter._ancestors[i];
        if(cmp(item, cur.data) < 0)
        {
            iter._cursor = cur;
            iter._ancestors.length = i;
            return iter;
        }
    }
    
    iter._ancestors.length = 0;
    return iter;
}


TreeBase.prototype.upperBound = function (item)
{
    var iter = this.lowerBound(item);
    var cmp = this._comparator;
    
    while(iter.data() !== null && cmp(iter.data(), item) === 0)
    {
        iter.next();
    }
    
    return iter;
}


TreeBase.prototype.min = function ()
{
    var res = this._root;
    if(res === 0)
    {
        return null;
    }
    
    while(res.left !== 0)
    {
        res = res.left;
    }
    
    return res.data;
}


TreeBase.prototype.max = function ()
{
    var res = this._root;
    if(res === 0)
    {
        return null;
    }
    
    while(res.right !== 0)
    {
        res = res.right;
    }
    
    return res.data;
}


TreeBase.prototype.iterator = function ()
{
    return new Iterator(this);
}


TreeBase.prototype.each = function (cb)
{
    var it = this.iterator(), data;
    while((data = it.next()) !== null)
    {
        if(cb(data) === false)
        {
            return;
        }
    }
}


TreeBase.prototype.reach = function (cb)
{
    var it = this.iterator(), data;
    while((data = it.prev()) !== null)
    {
        if(cb(data) === false)
        {
            return;
        }
    }
}

function Iterator(tree)
{
    this._tree = tree;
    this._ancestors = [];
    this._cursor = null;
}

Iterator.prototype.data = function ()
{
    return this._cursor !== null ? this._cursor.data : null;
}


Iterator.prototype.next = function ()
{
    if(this._cursor === null)
    {
        var root = this._tree._root;
        if(root !== 0)
        {
            this._minNode(root);
        }
    }
    else
    {
        if(this._cursor.right === 0)
        {
            var save;
            do
            {
                save = this._cursor;
                if(this._ancestors.length)
                {
                    this._cursor = this._ancestors.pop();
                }
                else
                {
                    this._cursor = null;
                    break;
                }
            }
            while(this._cursor.right === save);
        }
        else
        {
            this._ancestors.push(this._cursor);
            this._minNode(this._cursor.right);
        }
    }
    return this._cursor !== null ? this._cursor.data : null;
}


Iterator.prototype.prev = function ()
{
    if(this._cursor === null)
    {
        var root = this._tree._root;
        if(root !== 0)
        {
            this._maxNode(root);
        }
    }
    else
    {
        if(this._cursor.left === 0)
        {
            var save;
            do
            {
                save = this._cursor;
                if(this._ancestors.length)
                {
                    this._cursor = this._ancestors.pop();
                }
                else
                {
                    this._cursor = null;
                    break;
                }
            }
            while(this._cursor.left === save);
        }
        else
        {
            this._ancestors.push(this._cursor);
            this._maxNode(this._cursor.left);
        }
    }
    return this._cursor !== null ? this._cursor.data : null;
}

Iterator.prototype._minNode = function (start)
{
    while(start.left !== 0)
    {
        this._ancestors.push(start);
        start = start.left;
    }
    this._cursor = start;
}

Iterator.prototype._maxNode = function (start)
{
    while(start.right !== 0)
    {
        this._ancestors.push(start);
        start = start.right;
    }
    this._cursor = start;
}




class RBTreeExt extends TreeBase
{
    constructor(comparator)
    {
        super()
        
        this._Node = function (data)
        {
            this.data = data
            this.left = 0
            this.right = 0
            this.red = true
        }
        
        this.Arr = []
        this.GET = function (Index)
        {
            if(!Index)
                throw "Error Index";
            var Ret = this.Arr[Index];
            if(!Ret)
                throw "Error Index=" + Index;
            return Ret;
        }
        this.SET = function (Index,Value)
        {
            if(!Index)
                throw "Error Index";
            this.Arr[Index] = Value
        }
        
        this._root = 0
        this._comparator = comparator
        this.size = 0
    }
    insert(data)
    {
        var ret = false;
        
        if(this._root === 0)
        {
            this._root = new this._Node(data)
            ret = true
            this.size++
        }
        else
        {
            var head = new this._Node(undefined);
            
            var dir = 0;
            var last = 0;
            var gp = 0;
            var ggp = head;
            var p = 0;
            var node = this._root;
            ggp.right = this._root
            while(true)
            {
                if(node === 0)
                {
                    node = new this._Node(data)
                    this.set_child(p, dir, node)
                    ret = true
                    this.size++
                }
                else
                    if(this.is_red(node.left) && this.is_red(node.right))
                    {
                        node.red = true
                        node.left.red = false
                        node.right.red = false
                    }
                if(this.is_red(node) && this.is_red(p))
                {
                    var dir2 = ggp.right === gp;
                    
                    if(node === this.get_child(p, last))
                    {
                        this.set_child(ggp, dir2, this.single_rotate(gp, !last))
                    }
                    else
                    {
                        this.set_child(ggp, dir2, this.double_rotate(gp, !last))
                    }
                }
                
                var cmp = this._comparator(node.data, data);
                if(cmp === 0)
                {
                    break;
                }
                
                last = dir
                dir = cmp < 0
                if(gp !== 0)
                {
                    ggp = gp
                }
                gp = p
                p = node
                node = this.get_child(node, dir)
            }
            this._root = head.right
        }
        this._root.red = false
        
        return ret;
    }
    remove(data)
    {
        if(this._root === 0)
        {
            return false;
        }
        
        var head = new this._Node(undefined);
        var node = head;
        node.right = this._root
        var p = 0;
        var gp = 0;
        var found = 0;
        var dir = 1;
        
        while(this.get_child(node, dir) !== 0)
        {
            var last = dir;
            gp = p
            p = node
            node = this.get_child(node, dir)
            
            var cmp = this._comparator(data, node.data);
            
            dir = cmp > 0
            if(cmp === 0)
            {
                found = node
            }
            if(!this.is_red(node) && !this.is_red(this.get_child(node, dir)))
            {
                if(this.is_red(this.get_child(node, !dir)))
                {
                    var sr = this.single_rotate(node, dir);
                    this.set_child(p, last, sr)
                    p = sr
                }
                else
                    if(!this.is_red(this.get_child(node, !dir)))
                    {
                        var sibling = this.get_child(p, !last);
                        if(sibling !== 0)
                        {
                            if(!this.is_red(this.get_child(sibling, !last)) && !this.is_red(this.get_child(sibling, last)))
                            {
                                p.red = false
                                sibling.red = true
                                node.red = true
                            }
                            else
                            {
                                var dir2 = gp.right === p;
                                
                                if(this.is_red(this.get_child(sibling, last)))
                                {
                                    this.set_child(gp, dir2, this.double_rotate(p, last))
                                }
                                else
                                    if(this.is_red(this.get_child(sibling, !last)))
                                    {
                                        this.set_child(gp, dir2, this.single_rotate(p, last))
                                    }
                                var gpc = this.get_child(gp, dir2);
                                gpc.red = true
                                node.red = true
                                gpc.left.red = false
                                gpc.right.red = false
                            }
                        }
                    }
            }
        }
        if(found !== 0)
        {
            found.data = node.data
            this.set_child(p, p.right === node, this.get_child(node, node.left === 0))
            this.size--
        }
        this._root = head.right
        if(this._root !== 0)
        {
            this._root.red = false
        }
        
        return found !== 0;
    }
    
    is_red(node)
    {
        return node !== 0 && node.red;
    }
    
    single_rotate(root, dir)
    {
        var save = this.get_child(root, !dir);
        
        this.set_child(root, !dir, this.get_child(save, dir))
        this.set_child(save, dir, root)
        
        root.red = true
        save.red = false
        
        return save;
    }
    
    double_rotate(root, dir)
    {
        this.set_child(root, !dir, this.single_rotate(this.get_child(root, !dir), !dir))
        return this.single_rotate(root, dir);
    }
    get_child(node, dir)
    {
        return dir ? node.right : node.left;
    }
    
    set_child(node, dir, val)
    {
        if(dir)
        {
            node.right = val
        }
        else
        {
            node.left = val
        }
    }
}

global.RBTree = RBTreeExt;
