/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


require("./RBTree");
TestRBTree();
function TestRBTree()
{
    var Tree = new RBTree(function (a,b)
    {
        return a.value - b.value;
    });
    
    var Value = {value:1, data:123};
    if(!Tree.find(Value))
        Tree.insert(Value);
    
    var Value2 = {value:2, data:123};
    Tree.insert(Value2);
    
    if(!Tree.find(Value))
        Tree.insert(Value);
    
    var it = Tree.iterator(), Item;
    while((Item = it.next()) !== null)
    {
        console.log(JSON.stringify(Item));
    }
    
    console.log(JSON.stringify(Tree.min()));
}
