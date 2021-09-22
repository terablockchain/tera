function SaveProjectsToDB(Value)
{
    OpenIndexDB(Value);
}

async function DoSaveProjectsToDB(DB,Value)
{
    //console.log("DoSaveProjectsToDB");
    if(!Value || String(Value).length<10)
        return;

    let transaction = DB.transaction("backup", "readwrite");

    // получить хранилище объектов для работы с ним
    let Table = transaction.objectStore("backup");
    var Row =
        {
            version: Date.now(),
            created: new Date(),
            Value: Value
        };
    //новая запись
    let request = Table.add(Row);

    request.onsuccess = function()
    {
        let FirstQ=IDBKeyRange.lowerBound(0,true);
        //удаление излишков
        Table.count(FirstQ).onsuccess=function(event)
        {
            var Count=event.target.result;
            if(Count>10)
            {
                Table.get(FirstQ).onsuccess=function(event)
                {
                    var Row=event.target.result;
                    Table.delete(Row.version);
                }
            }
        };
    };
    request.onerror = function()
    {
        console.log("Ошибка", request.error);
    };


}

function OpenIndexDB(Value)
{
    let openRequest = indexedDB.open("db", 1);

    // создаём хранилище объектов, если ешё не существует
    openRequest.onupgradeneeded = function()
    {

        let db = openRequest.result;
        if (!db.objectStoreNames.contains('backup'))
        { // если хранилище "books" не существует
            db.createObjectStore('backup', {keyPath: 'version'}); // создаем хранилище
        }

        switch(db.version)// существующая (старая) версия базы данных
        {
            case 0:
            // версия 0 означает, что на клиенте нет базы данных
            // выполнить инициализацию
            case 1:
                //
        }
    };

    openRequest.onerror = function() {
        console.error("Error open IndexDB", openRequest.error);
    };

    openRequest.onsuccess = function()
    {
        // продолжить работу с базой данных, используя объект db
        let db = openRequest.result;
        DoSaveProjectsToDB(db,Value)
    };

    //db.deleteObjectStore('backup')
    //let transaction = db.transaction("backup", "readwrite ");

    //return openRequest;
}