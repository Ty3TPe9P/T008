import mysql from 'mysql2';

const DB_ERROR_TYPE_CLIENT = 'DB_ERROR_TYPE_CLIENT';
const DB_ERROR_TYPE_INTERNAL = 'DB_ERROR_TYPE_INTERNAL';

export {
    DB_ERROR_TYPE_CLIENT,
    DB_ERROR_TYPE_INTERNAL
};

export default class DBAdapter {
    #dbHost = '';
    #dbPort = -1;
    #dbName = '';
    #dbUserLogin = '';
    #dbUserPassword = '';
    #dbClient = null;


    constructor({
        dbHost,
        dbPort,
        dbName,
        dbUserLogin,
        dbUserPassword
    }) {
        this.#dbHost = dbHost;
        this.#dbPort = dbPort;
        this.#dbName = dbName;
        this.#dbUserLogin = dbUserLogin;
        this.#dbUserPassword = dbUserPassword;
        this.#dbClient = new mysql.createConnection({
            host: this.#dbHost,
            port: this.#dbPort,
            database: this.#dbName,
            user: this.#dbUserLogin,
            password: this.#dbUserPassword
        });
    }

    async connect() {
        try {
            await this.#dbClient.promise().connect();
            console.log('db connected');
        }
        catch (err) {
            console.error(`not connected ${err}`);
            return Promise.reject(err);
        }
    }

    async disconnect() {
        await this.#dbClient.promide().end();
        console.log('disconnected');
    }

    async getMenus() {
        try {
            const [menuData, fields] = await this.#dbClient.promise().query(
                'SELECT * FROM menus ORDER BY menu_day, menu_num;'
            );
            return menuData;
        }
        catch (err) {
            console.error(`DB error: menus  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async getMenusOnDay({day}) {
        try {
            const [menuData, fields] = await this.#dbClient.promise().query(
                'SELECT * FROM menus WHERE menu_day = ? ORDER BY menu_day, menu_num;',
                [day]
            );
            return menuData;
        }
        catch (err) {
            console.error(`DB error: menus  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async getDishs() {
        try {
            const [dishsData, fields] = await this.#dbClient.promise().query(
                'SELECT * FROM dishs ORDER BY dish_type, dish_name;'
            );
            return dishsData;
        }
        catch (err) {
            console.error(`DB error: dishs  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async getDishs2Menus() {
        try {
            const [dishs2menusData, fields] = await this.#dbClient.promise().query(
                'SELECT menu_id, dish_id FROM dishs2menus JOIN dishs USING (dish_id) ORDER BY dish_type, dish_name;'
            );
            
            return dishs2menusData;
        }
        catch (err) {
            console.error(`DB error: dishs2menus  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async addMenu({id, day = -1, num = -1}) {
        if (!id || day === -1 || num === -1) {
            const errMsg = `DB error wrong parameter for adding menu \"${id}\", ${day}, ${num}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try {
            await this.#dbClient.promise().query(
            `INSERT INTO menus (menu_id, menu_day, menu_num) VALUES (?, ?, ?);`,
            [id, day, num]
            );
        }
        catch (err) {
            console.error(`DB error: add menu  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }

    }

    async addDish({id, name, type = -1}) {
        if (!id || !name || type === -1) {
            const errMsg = `DB error: wrong parameter for adding dish \"${id}\", \"${name}\", \"${type}\"`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try {
            await this.#dbClient.promise().query(
            `INSERT INTO dishs VALUES (?, ?, ?);`,
            [id, name, type]
            );
        }
        catch (err) {
            console.error(`DB error: add dish ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }

    }

    async addDish2Menu({menu_id, dish_id}) {
        if (!menu_id || !dish_id) {
            const errMsg = `DB error wrong parameter for adding dish2menu ${menu_id}, ${dish_id}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try {
            const curD2M = await this.getDishs2Menus();
            if (curD2M.find(element => element.menu_id === menu_id && element.dish_id === dish_id) !== undefined) {
                throw new Error("this dish2menu exists");
            }

            const curD = await this.getDishs();
            if (curD.find(element => element.dish_id === dish_id) === undefined) {
                throw new Error("this dish doesn't exists");
            }

            const curM = await this.getMenus();
            if (curM.find(element => element.menu_id === menu_id) === undefined) {
                throw new Error("this menu doesn't exists");
            }

            await this.#dbClient.promise().query(
                `INSERT INTO dishs2menus (menu_id, dish_id) VALUES (?, ?);`,
                [menu_id, dish_id]
            );
        }
        catch (err) {
            console.error(`DB error: add dish2menu  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }

    }

    async updateMenu({id, day = -1, num = -1}) {
        if (!id || day === -1 || num === -1) {
            const errMsg = `DB error wrong parameter for updating menu \"${id}\", ${day}, ${num}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try {
            await this.#dbClient.promise().query(
                'UPDATE menus SET menu_day=?, menu_num=? WHERE menu_id=?;',
                [day, num, id]
            );
        }
        catch (err) {
            console.error(`DB error: upd menu  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async updateDish({id, name, type = -1}) {
        if (!id || !(name && type !== -1)) {
            const errMsg = `DB error wrong parameter for updating dish \"${id}\", \"${name}\", \"${type}\"`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try {
            let query = '';

            if (name && type !== -1) {
                query = `UPDATE dishs SET dish_name=\"${name}\", dish_type=\"${type}\" WHERE dish_id=\"${id}\";`
            }
            else if (name) {
                query = `UPDATE dishs SET dish_name=\"${name}\" WHERE dish_id=\"${id}\";`
            }
            else {
                query = `UPDATE dishs SET dish_type=\"${type}\" WHERE dish_id=\"${id}\";`
            }

            await this.#dbClient.promise().query(query);
        }
        catch (err) {
            console.error(`DB error: upd dish ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async moveDish2Menu({menu_id_old, dish_id, menu_id_new}) {
        if (!menu_id_old || !dish_id || !menu_id_new) {
            const errMsg = `DB error wrong parameter for updating dish2menu ${menu_id_old}, ${dish_id}, ${menu_id_new}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try {
            await this.#dbClient.promise().query(
                'UPDATE dishs2menus SET menu_id=? WHERE menu_id=? AND dish_id=?;',
                [menu_id_new, menu_id_old, dish_id]
            );
        }
        catch (err) {
            console.error(`DB error: upd menu  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async deleteMenu({id}) {
        if (!id) {
            const errMsg = `DB error wrong parameter for deleting menu \"${id}\"`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try {
            await this.#dbClient.promise().query(
                `DELETE FROM dishs2menus WHERE menu_id = ?`,
                [id]
            );
            await this.#dbClient.promise().query(
                `DELETE FROM menus WHERE menu_id = ?`,
                [id]
            );
        }
        catch (err) {
            console.error(`DB error: delete menu ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async deleteDish2Menu({menu_id, dish_id}) {
        if (!menu_id || !dish_id) {
            const errMsg = `DB error wrong parameter for deleting dish2menu ${menu_id}, ${dish_id}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try {
            await this.#dbClient.promise().query(
                `DELETE FROM dishs2menus WHERE menu_id = ? AND dish_id = ?`,
                [menu_id, dish_id]
            );
        }
        catch (err) {
            console.error(`DB error: delete dish2menu  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

}