import mariadb from 'mariadb';
import dotenv from 'dotenv';
dotenv.config();

const pool = mariadb.createPool({
    host: 'localhost',
    database: process.env.MARIADB,
    user: process.env.MARIADBUSR,
    password: process.env.MARIADBPWD,
    socketPath: '/var/run/mysqld/mysqld.sock',
    connectionLimit: 5
});

const query = (...args) => {
    return new Promise(async (resolve, reject) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const res = await conn.query(...args);
            resolve(res);
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                conn.end();
            }
        }
    });
};

const dataQuery = (data) => {
    let cols = [];
    let vals = [];
    for (let col of Object.keys(data)) {
        cols.push(`\`${col}\` = ?`);
        vals.push(data[col]);
    }
    return [cols, vals];
};

const insert = (table, data) => {
    return new Promise(async (resolve, reject) => {
        let conn, cols, vals;
        [cols, vals] = dataQuery(data);
        let sql = `INSERT INTO \`${table}\` SET ${cols.join(', ')}`;
        try {
            conn = await pool.getConnection();
            const res = await conn.query(sql, vals);
            if (res.affectedRows && res.insertId) {
                resolve(res.insertId);
            } else {
                reject(res);
            }
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                conn.end();
            }
        }
    });
};

const update = (table, data, idName) => {
    return new Promise(async (resolve, reject) => {
        if (!idName || !data[idName]) {
            return reject('data has no id');
        }
        const id = data[idName];
        let conn, cols, vals;
        delete data[idName];
        [cols, vals] = dataQuery(data);
        data[idName] = id;
        let sql = `UPDATE \`${table}\` SET ${cols.join(', ')} WHERE \`${idName}\` = ?`;
        vals.push(id);
        try {
            conn = await pool.getConnection();
            const res = await conn.query(sql, vals);
            if (res.affectedRows) {
                resolve(res.affectedRows);
            } else {
                reject(res);
            }
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                conn.end();
            }
        }
    });
};

const keyScopeApp = (key, scope) => {
    return query(
        'SELECT k.app FROM apiKeyScopes AS ks '
        + 'INNER JOIN apiKeys AS k ON ks.keyId = k.id '
        + 'INNER JOIN apiScopes AS s ON ks.scopeId = s.id '
        + 'WHERE k.key = ? AND s.scope = ? AND k.valid = 1'
        , [key, scope]);
};

export { query, dataQuery, insert, update, keyScopeApp }