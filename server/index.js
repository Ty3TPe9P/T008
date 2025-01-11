import dotenv from 'dotenv';
import express from 'express';
import DBAdapter, {DB_ERROR_TYPE_CLIENT} from './adapters/DBAdapter.js';

dotenv.config({
    path: './server/.env'
});

const {
    FF_APP_HOST,
    FF_APP_PORT,
    FF_DB_HOST,
    FF_DB_PORT,
    FF_DB_NAME,
    FF_DB_USER_LOGIN,
    FF_DB_USER_PASSWORD,
} = process.env;

const serverApp = express();
const dbAdapter = new DBAdapter({
    dbHost: FF_DB_HOST,
    dbPort: FF_DB_PORT,
    dbName: FF_DB_NAME,
    dbUserLogin: FF_DB_USER_LOGIN,
    dbUserPassword: FF_DB_USER_PASSWORD
});

serverApp.use("/", express.static("./client"));

// middleware - log req
serverApp.use('*', (req, res, next) => {
    console.log(
        new Date().toISOString(),
        req.method,
        req.originalUrl
    );
    next();
});

//another middlewares
serverApp.use('/api/v1/menus', express.json());
serverApp.use('/api/v1/dishs', express.json());
serverApp.use('/api/v1/dishs2menus', express.json());
serverApp.use('/api/v1/menus/:menuID', express.json());
serverApp.use('/api/v1/dishs/:dishID', express.json());

serverApp.get('/api/v1/menus', async (req, res) => {
    try {
        const [dbMenus, dbDishs2Menus] = await Promise.all([
            dbAdapter.getMenus(),
            dbAdapter.getDishs2Menus()
        ]);
        const menus = dbMenus.map(
            ({menu_id, menu_day, menu_num}) => ({
                menuID: menu_id,
                menuDay: menu_day,
                menuNum: menu_num,
                dishs: dbDishs2Menus.filter(dish2menu => dish2menu.menu_id === menu_id).map(({dish_id}) => `${dish_id}`)
            })
        );
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({menus});
    }
    catch (err) {
        res.statusCode = 500;
        res.statusMessage = 'Int srv err';
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: 500,
            message: `Get menus error ${err.message || err.error}`
        });
    }
});

serverApp.get('/api/v1/dishs', async (req, res) => {
    try {
        const dbDishs = await dbAdapter.getDishs();
        const dishs = dbDishs.map(
            ({dish_id, dish_name, dish_type}) => ({
                dishID: dish_id,
                dishName: dish_name,
                dishType: dish_type,
            })
        );
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({dishs});
    }
    catch (err) {
        res.statusCode = 500;
        res.statusMessage = 'Int srv err';
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: 500,
            message: `Get dishs error ${err.message || err.error}`
        });
    }
});

serverApp.post('/api/v1/menus', async (req, res) => {
    try {
        const {
            menuID,
            menuDay
        } = req.body;

        const dbMenuOnDay = await dbAdapter.getMenusOnDay({
            day: menuDay
        });

        var menuNumNew;
        if (dbMenuOnDay.length === 0) {
            menuNumNew = 0;
        } else {
            menuNumNew = Number(dbMenuOnDay[dbMenuOnDay.length - 1].menu_num) + 1;
        }

        await dbAdapter.addMenu({
            id: menuID,
            day: menuDay,
            num: menuNumNew
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({
            'new_menu': {
                id: menuID,
                day: menuDay,
                num: menuNumNew
            }
        });
    }
    catch (err) {
        switch(err.type) {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Add menu error ${err.message || err.error}`
        });
    }
});

serverApp.post('/api/v1/dishs', async (req, res) => {
    try {
        const {
            dishID, 
            dishName,
            dishType
        } = req.body;
        const dishTypeN = dishType;

        await dbAdapter.addDish({
            id: dishID,
            name: dishName,
            type: dishTypeN
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({
            "new_dish": {
                id: dishID,
                name: dishName,
                type: dishTypeN
            }
        });
    }
    catch (err) {
        switch(err.type) {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Add dish error ${err.message || err.error}`
        });
    }
});

serverApp.post('/api/v1/dishs2menus', async (req, res) => {
    try {
        const {
            menuID,
            dishID
        } = req.body;

        await dbAdapter.addDish2Menu({
            menu_id: menuID,
            dish_id: dishID
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({
            menu_id: menuID,
            dish_id: dishID
        });
    }
    catch (err) {
        switch(err.type) {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Add dish2menu error ${err.message || err.error}`
        });
    }
});

serverApp.patch('/api/v1/menus/:menuID', async (req, res) => {
    try {
        const {
            menuDay,
        } = req.body;
        const {menuID} = req.params;

        const dbMenuOnDay = await dbAdapter.getMenusOnDay({
            day: menuDay
        });

        var menuNumNew;
        if (dbMenuOnDay.length === 0) {
            menuNumNew = 0;
        } else {
            menuNumNew = Number(dbMenuOnDay[dbMenuOnDay.length - 1].menu_num) + 1;
        }

        await dbAdapter.updateMenu({
            id: menuID,
            day: menuDay,
            num: menuNumNew
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send({
            id: menuID,
            day: menuDay,
            num: menuNumNew
        });
    }
    catch (err) {
        switch(err.type) {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Upd menu error ${err.error.message || err.error}`
        });
    }
});

serverApp.patch('/api/v1/dishs/:dishID', async (req, res) => {
    try {
        const {
            dishName,
            dishType
        } = req.body;
        const {dishID} = req.params;

        await dbAdapter.updateDish({
            id: String(dishID),
            name: dishName,
            type: dishType
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send({
            id: String(dishID),
            name: dishName,
            type: dishType
        });
    }
    catch (err) {
        switch(err.type) {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Upd dish error ${err.error.message || err.error}`
        });
    }
});

serverApp.patch('/api/v1/dishs2menus', async (req, res) => {
    try {
        const {
            menusrcID, 
            dishID,
            menudstID
        } = req.body;

        await dbAdapter.moveDish2Menu({
            menu_id_old: menusrcID,
            dish_id: dishID,
            menu_id_new: menudstID
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    }
    catch (err) {
        switch(err.type) {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Move dish error ${err.message || err.error}`
        });
    }
});

serverApp.delete('/api/v1/menus/:menuID', async (req, res) => {

    try {
        const {menuID} = req.params;

        await dbAdapter.deleteMenu({
            id: menuID
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    }
    catch (err) {
        switch(err.type) {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Delete menu error ${err.error.message || err.error}`
        });
    }
});

serverApp.delete('/api/v1/dishs2menus', async (req, res) => {
    try {
        const {
            menuID,
            dishID
        } = req.body;

        await dbAdapter.deleteDish2Menu({
            menu_id: menuID,
            dish_id: dishID
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    }
    catch (err) {
        switch(err.type) {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Delete menu error ${err.error.message || err.error}`
        });
    }
});

serverApp.get('/images/pepp', async (req, res) => {
    const peppNum = Math.floor(Math.random() * 10); 
    res.sendFile(`/images/pepp${peppNum}.gif`, {root: './client'});
});

serverApp.get('/', async (req, res) => {
    res.statusCode = 200;
    res.statusMessage = 'OK';
    res.sendFile('/index.html', {root: './client'});
});

serverApp.listen(Number(FF_APP_PORT), FF_APP_HOST, async () => {
    try {
        await dbAdapter.connect();
    }
    catch (err) {
        console.log('MenuMenu is shutting down!');
        process.exit(100);
    }
    console.log(`FF APP SERVER started (${FF_APP_HOST}:${FF_APP_PORT})`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received');
    serverApp.close(async () => {
        await dbAdapter.disconnect();
        console.log('DB CLOSED');
    });
});