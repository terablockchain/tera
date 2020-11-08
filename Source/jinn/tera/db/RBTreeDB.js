/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

require("./RBTreeExt");
class CTreeDB
{
    constructor()
    {
    }
    
    Run()
    {
        var Tree = new RBTree(function (a,b)
        {
            return a - b;
        });
        
        Tree.insert(3)
        Tree.insert(1)
        Tree.insert(20)
        
        var it = Tree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            console.log(Item)
        }
    }
}
var Test = new CTreeDB();
Test.Run();
